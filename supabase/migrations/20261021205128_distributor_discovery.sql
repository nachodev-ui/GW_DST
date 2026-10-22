begin;

-- Public-facing commercial contact is opt-in, separate from private onboarding.
create table public.distributor_service_settings (
  distributor_id uuid primary key references public.distributors(id),
  whatsapp text check (whatsapp ~ '^569[0-9]{8}$'),
  schedule jsonb,
  eta_min integer check (eta_min between 1 and 1440),
  eta_max integer check (eta_max between 1 and 1440),
  revision integer not null default 1 check (revision > 0),
  check ((eta_min is null and eta_max is null) or (eta_min is not null and eta_max is not null and eta_max >= eta_min))
);
alter table public.distributor_service_settings enable row level security;
revoke all on public.distributor_service_settings from public,anon,authenticated,service_role;
grant select on public.distributor_service_settings to authenticated;
create policy service_settings_read_members on public.distributor_service_settings for select to authenticated
  using (exists(select 1 from public.distributor_members m where m.distributor_id=distributor_service_settings.distributor_id and m.user_id=(select auth.uid())));

create function private.valid_service_schedule(schedule jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare entry jsonb; seen integer[] := '{}'; day_number integer;
begin
  if schedule is null then return true; end if;
  if jsonb_typeof(schedule)<>'array' or jsonb_array_length(schedule)>7 then return false; end if;
  for entry in select value from jsonb_array_elements(schedule) loop
    if jsonb_typeof(entry)<>'object' or not (entry ?& array['day','open','close'])
      or jsonb_typeof(entry->'day')<>'number' or jsonb_typeof(entry->'open')<>'string' or jsonb_typeof(entry->'close')<>'string'
      or entry->>'day' !~ '^[0-6]$' or entry->>'open' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or entry->>'close' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or entry->>'open'=entry->>'close' then return false; end if;
    if entry->>'day' is null or entry->>'open' is null or entry->>'close' is null then return false; end if;
    day_number := (entry->>'day')::integer;
    if day_number=any(seen) then return false; end if;
    seen := array_append(seen,day_number);
  end loop;
  return true;
end;
$$;
alter table public.distributor_service_settings add constraint service_schedule_valid check(private.valid_service_schedule(schedule));
revoke all on function private.valid_service_schedule(jsonb) from public,anon,authenticated,service_role;

create function private.set_business_service(p_distributor_id uuid,p_whatsapp text,p_schedule jsonb,p_eta_min integer,p_eta_max integer,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_settings public.distributor_service_settings;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found then raise exception 'Verified membership required' using errcode='42501'; end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Verified membership required' using errcode='42501'; end if;
  if p_revision is null or p_revision<0 or not private.valid_service_schedule(p_schedule) then
    raise exception 'Invalid service settings' using errcode='22023'; end if;
  select * into current_settings from public.distributor_service_settings where distributor_id=p_distributor_id for update;
  if coalesce(current_settings.revision,0)<>p_revision then
    if current_settings.revision=p_revision+1 and row(current_settings.whatsapp,current_settings.schedule,current_settings.eta_min,current_settings.eta_max)
      is not distinct from row(p_whatsapp,p_schedule,p_eta_min,p_eta_max) then return; end if;
    raise exception 'Service revision changed' using errcode='40001'; end if;
  insert into public.distributor_service_settings(distributor_id,whatsapp,schedule,eta_min,eta_max,revision)
    values(p_distributor_id,p_whatsapp,p_schedule,p_eta_min,p_eta_max,p_revision+1)
    on conflict(distributor_id) do update set whatsapp=excluded.whatsapp,schedule=excluded.schedule,eta_min=excluded.eta_min,eta_max=excluded.eta_max,revision=excluded.revision;
end;
$$;
create function public.set_business_service(p_distributor_id uuid,p_whatsapp text,p_schedule jsonb,p_eta_min integer,p_eta_max integer,p_revision integer) returns void
language sql security invoker set search_path='' as $$ select private.set_business_service(p_distributor_id,p_whatsapp,p_schedule,p_eta_min,p_eta_max,p_revision); $$;

alter table public.distributor_products add column price_without_exchange_clp integer check(price_without_exchange_clp>=0);
alter table public.orders add column client_request_id uuid,
  add column returned_brand text check(returned_brand in ('Lipigas','Gasco','Abastible','unknown'));
create unique index orders_customer_request_idx on public.orders(customer_id,client_request_id) where client_request_id is not null;
create table private.order_stock_reservations (
  order_id uuid primary key references public.orders(id),
  distributor_id uuid not null,
  product_id uuid not null,
  quantity integer not null check(quantity between 1 and 99),
  released_at timestamptz,
  foreign key(distributor_id,product_id) references public.distributor_products(distributor_id,product_id)
);
create index order_reservations_product_idx on private.order_stock_reservations(distributor_id,product_id) where released_at is null;
alter table private.order_stock_reservations enable row level security;
revoke all on private.order_stock_reservations from public,anon,authenticated,service_role;

-- Preserve room for outstanding reservations even when a manager replenishes stock.
create function private.guard_stock_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.stock::bigint+coalesce((select sum(r.quantity) from private.order_stock_reservations r
    where r.distributor_id=new.distributor_id and r.product_id=new.product_id and r.released_at is null),0)>1000000 then
    raise exception 'Stock plus reservations exceeds capacity' using errcode='22023'; end if;
  return new;
end;
$$;
create trigger guard_stock_capacity before update of stock on public.distributor_products for each row execute function private.guard_stock_capacity();

create function private.release_order_stock() returns trigger
language plpgsql security definer set search_path='' as $$
declare reservation private.order_stock_reservations;
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    update private.order_stock_reservations set released_at=clock_timestamp()
      where order_id=new.id and released_at is null returning * into reservation;
    if found then
      update public.distributor_products set stock=stock+reservation.quantity,revision=revision+1,updated_at=clock_timestamp()
        where distributor_id=reservation.distributor_id and product_id=reservation.product_id;
    end if;
  elsif new.status='delivered' and old.status<>'delivered' then
    update private.order_stock_reservations set released_at=clock_timestamp() where order_id=new.id and released_at is null;
  end if;
  return new;
end;
$$;
create trigger release_order_stock after update of status on public.orders for each row execute function private.release_order_stock();
revoke all on function private.guard_stock_capacity(),private.release_order_stock() from public,anon,authenticated,service_role;

create function private.set_business_offer(p_distributor_id uuid,p_product_id uuid,p_unit_price_clp integer,p_price_without_exchange_clp integer,p_stock integer,p_is_listed boolean,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_product public.distributor_products;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_stock is null or p_stock not between 0 and 1000000 or p_unit_price_clp<0 or p_price_without_exchange_clp<0
    or p_is_listed is null or (p_is_listed and p_unit_price_clp is null) or p_revision is null or p_revision<0 then
    raise exception 'Invalid commercial data' using errcode='22023'; end if;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found then raise exception 'Verified business required' using errcode='42501'; end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Membership required' using errcode='42501'; end if;
  perform 1 from public.products p join public.distributor_brands b on b.brand=p.brand and b.distributor_id=p_distributor_id
    where p.id=p_product_id and p.is_active for share of p,b;
  if not found then raise exception 'Configured active product required' using errcode='22023'; end if;
  select * into current_product from public.distributor_products where distributor_id=p_distributor_id and product_id=p_product_id for update;
  if coalesce(current_product.revision,0)<>p_revision then
    if current_product.revision=p_revision+1 and row(current_product.unit_price_clp,current_product.price_without_exchange_clp,current_product.stock,current_product.is_listed)
      is not distinct from row(p_unit_price_clp,p_price_without_exchange_clp,p_stock,p_is_listed) then return; end if;
    raise exception 'Product revision changed' using errcode='40001'; end if;
  insert into public.distributor_products(distributor_id,product_id,unit_price_clp,price_without_exchange_clp,stock,is_listed,revision)
    values(p_distributor_id,p_product_id,p_unit_price_clp,p_price_without_exchange_clp,p_stock,p_is_listed,p_revision+1)
    on conflict(distributor_id,product_id) do update set unit_price_clp=excluded.unit_price_clp,price_without_exchange_clp=excluded.price_without_exchange_clp,
      stock=excluded.stock,is_listed=excluded.is_listed,revision=excluded.revision,updated_at=clock_timestamp()
    returning * into current_product;
  insert into private.distributor_product_changes(distributor_id,product_id,actor_id,snapshot)
    values(p_distributor_id,p_product_id,auth.uid(),to_jsonb(current_product));
end;
$$;
create function public.set_business_offer(p_distributor_id uuid,p_product_id uuid,p_unit_price_clp integer,p_price_without_exchange_clp integer,p_stock integer,p_is_listed boolean,p_revision integer) returns void
language sql security invoker set search_path='' as $$ select private.set_business_offer(p_distributor_id,p_product_id,p_unit_price_clp,p_price_without_exchange_clp,p_stock,p_is_listed,p_revision); $$;

create function private.list_delivery_options(p_product_id uuid,p_commune_code text,p_quantity integer,p_exchange_empty boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid search' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'is_demo',d.is_demo,'request_id',gen_random_uuid(),
    'brands',(select jsonb_agg(b.brand order by b.brand) from public.distributor_brands b where b.distributor_id=d.id),
    'unit_price_clp',s.unit_price_clp,'price_without_exchange_clp',s.price_without_exchange_clp,
    'total_clp',case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity,
    'updated_at',s.updated_at,
    'has_available_driver',exists(select 1 from public.drivers driver join public.driver_communes c on c.driver_id=driver.id
      join public.profiles profile on profile.id=driver.id
      where driver.distributor_id=d.id and driver.is_verified and driver.is_available and profile.role='driver'
        and c.commune_code=p_commune_code and driver.id<>auth.uid()
        and not exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way'))),
    'service',jsonb_build_object('whatsapp',case when d.is_demo then null else settings.whatsapp end,
      'schedule',settings.schedule,'eta_min',settings.eta_min,'eta_max',settings.eta_max,'revision',coalesce(settings.revision,0))
  ) order by d.name,d.id),'[]'::jsonb)
    from public.distributor_products s join public.distributors d on d.id=s.distributor_id
    join public.products p on p.id=s.product_id and p.is_active
    join public.distributor_brands brand on brand.distributor_id=d.id and brand.brand=p.brand
    left join public.distributor_service_settings settings on settings.distributor_id=d.id
    where s.product_id=p_product_id and d.is_verified and s.is_listed and s.stock>=p_quantity
      and (case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end is null
        or case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity<=2147483647)
      and exists(select 1 from public.drivers driver join public.driver_communes c on c.driver_id=driver.id
        join public.profiles profile on profile.id=driver.id
        where driver.distributor_id=d.id and driver.is_verified and profile.role='driver' and c.commune_code=p_commune_code));
end;
$$;
create function public.list_delivery_options(p_product_id uuid,p_commune_code text,p_quantity integer,p_exchange_empty boolean) returns jsonb
language sql security invoker set search_path='' as $$ select private.list_delivery_options(p_product_id,p_commune_code,p_quantity,p_exchange_empty); $$;

create or replace function private.guard_order_distributor() returns trigger
language plpgsql security invoker set search_path='' as $$
declare driver_business uuid;
begin
  if tg_op='UPDATE' and old.distributor_id is distinct from new.distributor_id then
    raise exception 'Order distributor is immutable' using errcode='23514'; end if;
  if tg_op='UPDATE' and (old.client_request_id is distinct from new.client_request_id or old.returned_brand is distinct from new.returned_brand) then
    raise exception 'Order request is immutable' using errcode='23514'; end if;
  if tg_op='UPDATE' and old.driver_id is null and new.driver_id is not null then
    select distributor_id into driver_business from public.drivers where id=new.driver_id;
    if driver_business is null or (new.distributor_id is not null and new.distributor_id<>driver_business) then
      raise exception 'Selected distributor required' using errcode='55000'; end if;
    new.distributor_id:=driver_business;
  end if;
  return new;
end;
$$;

create function private.create_distributor_order(p_distributor_id uuid,p_product_id uuid,p_quantity integer,p_exchange_empty boolean,
  p_returned_brand text,p_delivery_address text,p_commune_code text,p_notes text,p_expected_unit_price integer,p_request_id uuid) returns public.orders
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); existing public.orders; result public.orders; offer public.distributor_products; price integer;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Serialize retries before any inventory lock; a lost response cannot duplicate a purchase.
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile required' using errcode='42501'; end if;
  if p_request_id is null or p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or p_delivery_address is null or char_length(btrim(p_delivery_address)) not between 1 and 300
    or char_length(p_notes)>1000 or (p_exchange_empty and (p_returned_brand is null or p_returned_brand not in ('Lipigas','Gasco','Abastible','unknown')))
    or (not p_exchange_empty and p_returned_brand is not null) or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid order input' using errcode='22023'; end if;
  select * into existing from public.orders where customer_id=caller and client_request_id=p_request_id;
  if found then
    if row(existing.distributor_id,existing.product_id,existing.quantity,existing.exchange_empty,existing.returned_brand,existing.delivery_address,existing.commune_code,existing.notes)
      is distinct from row(p_distributor_id,p_product_id,p_quantity,p_exchange_empty,p_returned_brand,btrim(p_delivery_address),p_commune_code,nullif(btrim(p_notes),'')) then
      raise exception 'Request already used' using errcode='22023'; end if;
    return existing;
  end if;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for share;
  if not found then raise exception 'Business unavailable' using errcode='55000'; end if;
  perform 1 from public.products p join public.distributor_brands b on b.distributor_id=p_distributor_id and b.brand=p.brand
    where p.id=p_product_id and p.is_active for share of p,b;
  if not found then raise exception 'Product unavailable' using errcode='55000'; end if;
  if not exists(select 1 from public.drivers d join public.driver_communes c on c.driver_id=d.id join public.profiles p on p.id=d.id
    where d.distributor_id=p_distributor_id and d.is_verified and p.role='driver' and c.commune_code=p_commune_code) then
    raise exception 'Outside business coverage' using errcode='55000'; end if;
  select * into offer from public.distributor_products where distributor_id=p_distributor_id and product_id=p_product_id for update;
  price:=case when p_exchange_empty then offer.unit_price_clp else offer.price_without_exchange_clp end;
  if not coalesce(offer.is_listed,false) or price is null or offer.stock<p_quantity then
    raise exception 'Offer unavailable' using errcode='55000'; end if;
  if p_expected_unit_price is distinct from price then raise exception 'Price changed; review again' using errcode='40001'; end if;
  if price::bigint*p_quantity>2147483647 then raise exception 'Total exceeds limit' using errcode='22023'; end if;
  update public.distributor_products set stock=stock-p_quantity,revision=revision+1,updated_at=clock_timestamp()
    where distributor_id=p_distributor_id and product_id=p_product_id;
  insert into public.orders(customer_id,distributor_id,product_id,quantity,exchange_empty,returned_brand,total_clp,delivery_address,commune_code,notes,client_request_id)
    values(caller,p_distributor_id,p_product_id,p_quantity,p_exchange_empty,p_returned_brand,price*p_quantity,btrim(p_delivery_address),p_commune_code,nullif(btrim(p_notes),''),p_request_id)
    returning * into result;
  insert into private.order_stock_reservations(order_id,distributor_id,product_id,quantity) values(result.id,p_distributor_id,p_product_id,p_quantity);
  perform private.dispatch_order(result.id);
  select * into result from public.orders where id=result.id;
  if result.status<>'offered' then
    raise exception 'No delivery available now' using errcode='55000'; end if;
  return result;
end;
$$;
create function public.create_distributor_order(p_distributor_id uuid,p_product_id uuid,p_quantity integer,p_exchange_empty boolean,
  p_returned_brand text,p_delivery_address text,p_commune_code text,p_notes text,p_expected_unit_price integer,p_request_id uuid) returns public.orders
language sql security invoker set search_path='' as $$ select private.create_distributor_order(p_distributor_id,p_product_id,p_quantity,p_exchange_empty,p_returned_brand,p_delivery_address,p_commune_code,p_notes,p_expected_unit_price,p_request_id); $$;

revoke all on function private.set_business_service(uuid,text,jsonb,integer,integer,integer),public.set_business_service(uuid,text,jsonb,integer,integer,integer),
  private.set_business_offer(uuid,uuid,integer,integer,integer,boolean,integer),public.set_business_offer(uuid,uuid,integer,integer,integer,boolean,integer),
  private.list_delivery_options(uuid,text,integer,boolean),public.list_delivery_options(uuid,text,integer,boolean),
  private.create_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid),public.create_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.set_business_service(uuid,text,jsonb,integer,integer,integer),public.set_business_service(uuid,text,jsonb,integer,integer,integer),
  private.set_business_offer(uuid,uuid,integer,integer,integer,boolean,integer),public.set_business_offer(uuid,uuid,integer,integer,integer,boolean,integer),
  private.list_delivery_options(uuid,text,integer,boolean),public.list_delivery_options(uuid,text,integer,boolean),
  private.create_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid),public.create_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid)
  to authenticated;

create function private.business_accepting_now(p_distributor_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  with setting as (select schedule from public.distributor_service_settings where distributor_id=p_distributor_id),
  moment as (select now() at time zone 'America/Santiago' as local_time)
  select not exists(select 1 from setting where schedule is not null)
    or exists(select 1 from setting cross join lateral jsonb_array_elements(schedule) entry cross join moment
      where ((entry->>'day')::integer=extract(dow from local_time)::integer
        and local_time::time >= (entry->>'open')::time
        and ((entry->>'close')::time<(entry->>'open')::time or local_time::time<(entry->>'close')::time))
      or ((entry->>'day')::integer=(extract(dow from local_time)::integer+6)%7
        and (entry->>'close')::time<(entry->>'open')::time and local_time::time<(entry->>'close')::time));
$$;
revoke all on function private.business_accepting_now(uuid) from public,anon,authenticated,service_role;

create or replace function private.dispatch_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target public.orders;
begin
  select * into target from public.orders where id = p_order_id for update;
  if not found or target.status not in ('requested', 'offered') or target.driver_id is not null then
    return;
  end if;
  insert into private.order_offers (order_id, driver_id, expires_at)
    select target.id, d.id, clock_timestamp() + interval '60 seconds'
    from public.drivers d join public.profiles p on p.id = d.id
      join public.driver_communes c on c.driver_id = d.id and c.commune_code = target.commune_code
    where (target.distributor_id is null or (d.distributor_id=target.distributor_id and private.business_accepting_now(target.distributor_id))) and private.driver_can_deliver_product(d.id, target.product_id) and d.is_verified and d.is_available and p.role = 'driver' and d.id <> target.customer_id
      and not exists (select 1 from public.orders active where active.driver_id = d.id
        and active.status in ('accepted', 'on_the_way'))
    on conflict (order_id, driver_id) do nothing;
  if target.status = 'requested' and exists (select 1 from private.order_offers
    where order_id = target.id and expires_at > clock_timestamp()) then
    update public.orders set status = 'offered' where id = target.id;
  end if;
end;
$$;

create or replace function private.list_driver_offers() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg, 'variant', p.variant,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty,'returned_brand',o.returned_brand,
    'commune_code', o.commune_code, 'commune_name', c.name,
    'total_clp', o.total_clp, 'expires_at', f.expires_at
  ) order by f.expires_at, o.id), '[]'::jsonb)
  from private.order_offers f join public.orders o on o.id = f.order_id
    join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = f.driver_id
    join public.profiles profile on profile.id = d.id
  where (o.distributor_id is null or o.distributor_id=d.distributor_id) and private.driver_can_deliver_product(d.id, o.product_id) and f.driver_id = auth.uid() and d.is_verified and d.is_available and profile.role = 'driver'
    and f.expires_at > clock_timestamp() and o.status = 'offered' and o.driver_id is null
    and exists (select 1 from public.driver_communes coverage
      where coverage.driver_id = d.id and coverage.commune_code = o.commune_code);
$$;

create or replace function private.list_business_products(p_distributor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501';end if;
  return(select coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'brand',p.brand,'weight_kg',p.weight_kg,'variant',p.variant,
    'unit_price_clp',s.unit_price_clp,'price_without_exchange_clp',s.price_without_exchange_clp,'stock',coalesce(s.stock,0),'is_listed',coalesce(s.is_listed,false),'revision',coalesce(s.revision,0))
    order by p.brand,p.weight_kg,p.variant),'[]'::jsonb)
    from public.products p join public.distributor_brands b on b.brand=p.brand and b.distributor_id=p_distributor_id
    left join public.distributor_products s on s.product_id=p.id and s.distributor_id=p_distributor_id where p.is_active);
end;
$$;

create or replace function private.get_driver_order(p_order_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg, 'variant', p.variant,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty, 'returned_brand',o.returned_brand, 'commune_code', o.commune_code,
    'commune_name', c.name, 'total_clp', o.total_clp, 'status', o.status,
    'delivery_address', o.delivery_address, 'notes', o.notes)
  from public.orders o join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = o.driver_id join public.profiles profile on profile.id = d.id
  where o.driver_id = auth.uid() and d.is_verified and profile.role = 'driver'
    and ((p_order_id is not null and o.id = p_order_id)
      or (p_order_id is null and o.status in ('accepted', 'on_the_way')))
  order by o.accepted_at desc limit 1;
$$;

-- The authenticated app must select a seller; legacy global pricing cannot bypass reservations.
revoke execute on function public.create_order(uuid,integer,boolean,text,text,text,double precision,double precision),
  private.create_order(uuid,integer,boolean,text,text,text,double precision,double precision) from authenticated;

create function private.get_order_business(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.orders where id=p_order_id and (customer_id=auth.uid() or driver_id=auth.uid())) then
    raise exception 'Order participant required' using errcode='42501'; end if;
  return(select jsonb_build_object('name',d.name,'is_demo',d.is_demo,'whatsapp',case when d.is_verified and not d.is_demo then s.whatsapp end)
    from public.orders o join public.distributors d on d.id=o.distributor_id
    left join public.distributor_service_settings s on s.distributor_id=d.id where o.id=p_order_id);
end;
$$;
create function public.get_order_business(p_order_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.get_order_business(p_order_id); $$;
revoke all on function private.get_order_business(uuid),public.get_order_business(uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_order_business(uuid),public.get_order_business(uuid) to authenticated;

create table private.coverage_interests (
  customer_id uuid not null references public.profiles(id),
  commune_code text not null references public.communes(code),
  product_id uuid not null references public.products(id),
  created_at timestamptz not null default now(),
  primary key(customer_id,commune_code,product_id)
);
alter table private.coverage_interests enable row level security;
revoke all on private.coverage_interests from public,anon,authenticated,service_role;
create function private.register_coverage_interest(p_commune_code text,p_product_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.communes where code=p_commune_code)
    or not exists(select 1 from public.products where id=p_product_id and is_active) then
    raise exception 'Invalid coverage interest' using errcode='22023'; end if;
  insert into private.coverage_interests(customer_id,commune_code,product_id) values(auth.uid(),p_commune_code,p_product_id) on conflict do nothing;
end;
$$;
create function public.register_coverage_interest(p_commune_code text,p_product_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.register_coverage_interest(p_commune_code,p_product_id); $$;
revoke all on function private.register_coverage_interest(text,uuid),public.register_coverage_interest(text,uuid) from public,anon,authenticated,service_role;
grant execute on function private.register_coverage_interest(text,uuid),public.register_coverage_interest(text,uuid) to authenticated;

commit;
