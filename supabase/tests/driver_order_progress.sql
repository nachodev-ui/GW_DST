-- SQL Editor as postgres, after all migrations. Execute the entire single DO.
-- Success rolls fixtures back even in autocommit; identity sequences may advance.
do $$
declare
  customer uuid := gen_random_uuid();
  assigned_driver uuid := gen_random_uuid();
  other_driver uuid := gen_random_uuid();
  product uuid;
  organization uuid := gen_random_uuid();
  target uuid;
  actor uuid;
  next_status public.order_status;
  payload jsonb;
  original_accepted_at timestamptz;
begin
  begin
    insert into auth.users (id) values (customer), (assigned_driver), (other_driver);
    update public.profiles set role = 'driver' where id in (assigned_driver, other_driver);
    insert into public.drivers (id, is_verified, is_available)
      values (assigned_driver, true, true), (other_driver, true, true);
    insert into public.distributors(id,name,is_verified) values(organization,'Negocio de prueba de entregas',true);
    insert into public.distributor_brands values(organization,'Gasco');
    update public.drivers set distributor_id=organization where id in(assigned_driver,other_driver);
    insert into public.distributor_communes values(organization,'13101');
    insert into public.products (brand, weight_kg, unit_price_clp, is_active)
      values ('Gasco', 11, 12345, true)
      on conflict (brand, weight_kg, variant) do update set unit_price_clp = 12345, is_active = true
      returning id into product;
    insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed)
      values(organization,product,12345,1,true);
    perform set_config('request.jwt.claims',json_build_object('sub',customer)::text,true);
    execute 'set local role authenticated';
    target := (public.create_distributor_order(organization,product,1,true,'unknown',
      'Dirección de prueba 123','13101',null,12345,gen_random_uuid())).id;
    execute 'reset role';

    if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      raise exception 'FAIL: orders missing from supabase_realtime';
    end if;
    if not (select relrowsecurity from pg_class where oid = 'public.orders'::regclass)
      or not (select relrowsecurity from pg_class where oid = 'public.order_events'::regclass)
      or has_column_privilege('authenticated', 'public.orders', 'status', 'UPDATE')
      or has_table_privilege('authenticated', 'public.order_events', 'INSERT')
      or has_function_privilege('anon', 'public.advance_driver_order(uuid,public.order_status)', 'EXECUTE')
      or has_function_privilege('anon', 'private.advance_driver_order(uuid,public.order_status)', 'EXECUTE') then
      raise exception 'FAIL: RLS or minimum grants';
    end if;
    raise notice 'PASS: publication, RLS and minimum grants';

    perform set_config('request.jwt.claims', json_build_object('sub', assigned_driver, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.accept_order(target);
    select accepted_at into original_accepted_at from public.orders where id = target;
    begin
      perform public.advance_driver_order(target, 'delivered');
      raise exception 'FAIL: accepted -> delivered allowed';
    exception when sqlstate '55000' then null;
    end;
    -- Each unauthorized identity attempts both advances on the assigned order.
    foreach actor in array array[customer, other_driver] loop
      perform set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated')::text, true);
      foreach next_status in array array['on_the_way', 'delivered']::public.order_status[] loop
        begin
          perform public.advance_driver_order(target, next_status);
          raise exception 'FAIL: unassigned identity advanced order';
        exception when insufficient_privilege then null;
        end;
      end loop;
      if actor = other_driver and exists (select 1 from public.orders where id = target) then
        raise exception 'FAIL: unrelated driver can read order';
      end if;
      if actor = customer and not exists (select 1 from public.orders where id = target) then
        raise exception 'FAIL: customer cannot read own order';
      end if;
    end loop;
    raise notice 'PASS: customer/other driver denied; accepted -> delivered denied; read isolation';

    perform set_config('request.jwt.claims', json_build_object('sub', assigned_driver, 'role', 'authenticated')::text, true);
    payload := public.advance_driver_order(target, 'on_the_way');
    if payload->>'status' is distinct from 'on_the_way'
      or payload->>'order_id' is distinct from target::text
      or (select count(*) from public.order_events where order_id = target
        and actor_id = assigned_driver and from_status = 'accepted' and to_status = 'on_the_way') <> 1
      or (select delivered_at from public.orders where id = target) is not null then
      raise exception 'FAIL: on_the_way response/event/timestamp';
    end if;
    foreach next_status in array array['accepted', 'on_the_way', 'cancelled', null]::public.order_status[] loop
      begin
        perform public.advance_driver_order(target, next_status);
        raise exception 'FAIL: reverse, duplicate, cancellation or null allowed';
      exception when sqlstate '55000' then null;
      end;
    end loop;
    payload := public.advance_driver_order(target, 'delivered');
    if payload->>'status' is distinct from 'delivered'
      or (select delivered_at from public.orders where id = target) is null
      or (select updated_at < accepted_at or updated_at < delivered_at
          or accepted_at is distinct from original_accepted_at from public.orders where id = target)
      or (select count(*) from public.order_events where order_id = target
        and actor_id = assigned_driver and from_status = 'on_the_way' and to_status = 'delivered') <> 1
      or public.get_driver_order(null) is not null then
      raise exception 'FAIL: delivered response/event/timestamps/active list';
    end if;
    foreach next_status in array array['on_the_way', 'delivered', 'accepted']::public.order_status[] loop
      begin
        perform public.advance_driver_order(target, next_status);
        raise exception 'FAIL: terminal order reopened or repeated';
      exception when sqlstate '55000' then null;
      end;
    end loop;
    if (select count(*) from public.order_events where order_id = target) <> 5 then
      raise exception 'FAIL: missing or extra events after failed transitions';
    end if;
    raise notice 'PASS: assigned driver advances, one event per step, timestamps, no active delivered order';
    raise notice 'PASS: no jumps, reversals, duplicates, driver cancellation or terminal reopening';

    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    if not exists (select 1 from public.orders where id = target and status = 'delivered')
      or (select count(*) from public.order_events where order_id = target) <> 5 then
      raise exception 'FAIL: customer cannot read delivered state/events';
    end if;
    execute 'reset role';
    raise exception using errcode = 'PT001', message = 'Rollback successful fixtures';
  exception when sqlstate 'PT001' then
    raise notice 'PASS: driver progress suite complete; fixtures rolled back';
  end;
end;
$$;
