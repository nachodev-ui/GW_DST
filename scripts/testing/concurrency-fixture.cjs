const { uuid, guarded, asActor } = require('./concurrency.cjs');
const fs = require('node:fs');
const path = require('node:path');

function fixture(ref, ids, stock, count, accepted = false) {
  const users = [ids.customer, ids.customer2, ids.driver, ids.driver2];
  return guarded(
    ref,
    `
create table if not exists private.concurrency_test_run(
  singleton boolean primary key default true check(singleton),
  run_id uuid unique not null, released boolean not null default false,
  data jsonb not null, created_at timestamptz not null default clock_timestamp()
);
alter table private.concurrency_test_run enable row level security;
revoke all on private.concurrency_test_run from public,anon,authenticated,service_role;
-- A stale or parallel run fails closed. Never delete somebody else's fixtures.
insert into private.concurrency_test_run(run_id,data) values(${uuid(ids.run)},'${JSON.stringify(ids)}');
insert into auth.users(id) values ${users.map((id) => `(${uuid(id)})`).join(',')};
update public.profiles set role='driver' where id in(${uuid(ids.driver)},${uuid(ids.driver2)});
insert into public.distributors(id,name,is_verified,is_demo) values(${uuid(ids.business)},'DT03 synthetic business',true,true);
insert into public.distributor_brands values(${uuid(ids.business)},'Gasco');
insert into public.distributor_communes values(${uuid(ids.business)},'13101');
insert into public.drivers(id,is_verified,is_available,distributor_id) values
  (${uuid(ids.driver)},true,false,${uuid(ids.business)}),(${uuid(ids.driver2)},true,false,${uuid(ids.business)});
${fs.readFileSync(path.join(__dirname, '../../supabase/tests/helpers/document-fixture.sql'), 'utf8')}
select private.seed_test_document_fixture(${uuid(ids.driver)});
select private.seed_test_document_fixture(${uuid(ids.driver2)});
drop function private.seed_test_document_fixture(uuid,boolean,uuid);
do $fixture$
declare product uuid; payload jsonb; orders jsonb := '[]';
begin
  select id into strict product from public.products where brand='Gasco' and weight_kg=11 and is_active;
  insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed)
    values(${uuid(ids.business)},product,12345,${stock},true);
  ${Array.from(
    { length: count },
    (_, i) => `
    ${asActor(ids.customer, `public.create_distributor_order(${uuid(ids.business)},product,1,true,'unknown','Dirección ficticia DT03','13101',null,12345,${uuid(ids.requests[i])})`)}
    orders := orders || jsonb_build_array(payload->>'id');`,
  ).join('\n')}
  ${accepted ? asActor(ids.driver, `public.accept_order((orders->>0)::uuid)`) : ''}
  update private.concurrency_test_run set data=data || jsonb_build_object('orders',orders,'product',product)
    where run_id=${uuid(ids.run)};
end $fixture$;`,
    `select data from private.concurrency_test_run where run_id=${uuid(ids.run)};`,
  );
}

function createOrder(ids, customer, request) {
  return {
    actor: customer,
    expression: `public.create_distributor_order(${uuid(ids.business)},${uuid(ids.product)},1,true,'unknown','Dirección ficticia DT03','13101',null,12345,${uuid(request)})`,
  };
}

function snapshot(ref, ids) {
  return guarded(
    ref,
    '',
    `select
    (select stock from public.distributor_products where distributor_id=${uuid(ids.business)}) as stock,
    (select revision from public.distributor_products where distributor_id=${uuid(ids.business)}) as stock_revision,
    (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status,'driver',o.driver_id,'request',o.client_request_id,'created_at',o.created_at,'updated_at',o.updated_at) order by o.id),'[]')
      from public.orders o where o.distributor_id=${uuid(ids.business)}) as orders,
    (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'created_at',e.created_at,'order',e.order_id,'actor',e.actor_id,'from',e.from_status,'to',e.to_status) order by e.id),'[]')
      from public.order_events e join public.orders o on o.id=e.order_id where o.distributor_id=${uuid(ids.business)}) as events,
    (select coalesce(jsonb_agg(jsonb_build_object('order',r.order_id,'quantity',r.quantity,'released',r.released_at is not null,'released_at',r.released_at) order by r.order_id),'[]')
      from private.order_stock_reservations r where r.distributor_id=${uuid(ids.business)}) as reservations;`,
  );
}

function cleanup(ref, ids) {
  return guarded(
    ref,
    `
set local lock_timeout = '5s';
do $idle$ begin
  if exists(select 1 from pg_stat_activity where application_name like 'dt03-${ids.run}%' and state='active') then
    raise exception 'Contenders still active; retain fixtures for inspection';
  end if;
end $idle$;
delete from public.order_events where order_id in(select id from public.orders where distributor_id=${uuid(ids.business)});
delete from private.order_stock_reservations where distributor_id=${uuid(ids.business)};
delete from public.orders where distributor_id=${uuid(ids.business)};
-- These are synthetic Storage metadata rows, never uploaded real files.
delete from storage.objects where bucket_id in ('documents','vehicle-photos') and name like '${ids.business}/%';
delete from public.distributor_vehicles where distributor_id=${uuid(ids.business)};
delete from public.driver_applications where driver_id in(${uuid(ids.driver)},${uuid(ids.driver2)});
delete from public.drivers where id in(${uuid(ids.driver)},${uuid(ids.driver2)});
delete from public.distributor_products where distributor_id=${uuid(ids.business)};
delete from public.distributor_communes where distributor_id=${uuid(ids.business)};
delete from public.distributor_brands where distributor_id=${uuid(ids.business)};
delete from public.distributors where id=${uuid(ids.business)};
delete from public.profiles where id in(${[ids.customer, ids.customer2, ids.driver, ids.driver2].map(uuid).join(',')});
delete from auth.users where id in(${[ids.customer, ids.customer2, ids.driver, ids.driver2].map(uuid).join(',')});
delete from private.concurrency_test_run where run_id=${uuid(ids.run)};`,
  );
}

module.exports = { fixture, createOrder, snapshot, cleanup };
