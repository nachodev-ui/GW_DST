-- Run this WHOLE block as postgres in SQL Editor after all migrations.
-- No seed/pgTAP/session state required. All fixtures roll back, even in autocommit.
do $$
declare
  customer uuid := gen_random_uuid();
  other_customer uuid := gen_random_uuid();
  driver uuid := gen_random_uuid();
  product uuid;
  created public.orders;
  repriced public.orders;
  cancelled public.orders;
begin
  begin
    insert into auth.users (id) values (customer), (other_customer), (driver);
    update public.profiles set role = 'driver' where id = driver;
    insert into public.drivers (id, is_verified, is_available) values (driver, true, true);
    insert into public.products (brand, weight_kg, unit_price_clp, is_active)
      values ('Gasco', 11, 12345, true)
      on conflict (brand, weight_kg) do update set unit_price_clp = 12345, is_active = true
      returning id into product;
    if has_table_privilege('authenticated', 'public.orders', 'INSERT')
      or has_table_privilege('authenticated', 'public.orders', 'UPDATE')
      or has_table_privilege('authenticated', 'public.order_events', 'INSERT')
      or has_column_privilege('authenticated', 'public.products', 'unit_price_clp', 'UPDATE')
      or has_function_privilege('anon', 'public.create_order(uuid,integer,boolean,text,text,text,double precision,double precision)', 'EXECUTE')
      or has_function_privilege('anon', 'public.cancel_order(uuid)', 'EXECUTE') then
      raise exception 'FAIL: excessive grants';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    created := public.create_order(product, 3, false, '  Calle Prueba 123  ', '13101', 'Tocar timbre');
    if created.customer_id <> customer or created.status not in ('requested', 'offered')
      or created.quantity <> 3 or created.total_clp <> 37035
      or created.delivery_location is not null or created.exchange_empty
      or created.delivery_address <> 'Calle Prueba 123' or created.notes <> 'Tocar timbre'
      or created.payment_method <> 'cash_on_delivery' then
      raise exception 'FAIL: server price, identity, defaults or optional coordinates';
    end if;
    if (select count(*) from public.order_events where order_id = created.id
      and to_status = 'requested' and from_status is null and actor_id = customer) <> 1 then
      raise exception 'FAIL: missing/duplicated requested event';
    end if;
    -- The RPC has no identity or price parameters; Postgres must reject extra arguments.
    begin
      execute 'select public.create_order(p_product_id => $1, p_quantity => 1,
        p_exchange_empty => true, p_delivery_address => ''Prueba 1'', p_commune_code => ''13101'', p_customer_id => $2)'
        using product, other_customer;
      raise exception 'FAIL: RPC accepted another customer';
    exception when undefined_function then null;
    end;
    begin
      execute 'select public.create_order(p_product_id => $1, p_quantity => 1,
        p_exchange_empty => true, p_delivery_address => ''Prueba 1'', p_commune_code => ''13101'', p_total_clp => 1)'
        using product;
      raise exception 'FAIL: RPC accepted client price';
    exception when undefined_function then null;
    end;
    begin
      insert into public.orders (customer_id, product_id, quantity, exchange_empty, total_clp, delivery_address, commune_code)
        values (other_customer, product, 1, true, 1, 'Prueba 1', '13101');
      raise exception 'FAIL: direct creation as another customer';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.create_order(product, 0, true, 'Prueba 1', '13101');
      raise exception 'FAIL: zero quantity accepted';
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.create_order(product, 1, true, '   ', '13101');
      raise exception 'FAIL: blank address accepted';
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.create_order(product, 1, true, 'Prueba 1', '99999');
      raise exception 'FAIL: non-catalogue commune accepted';
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.create_order(product, 1, true, 'Prueba 1', '13101', null, -33.4, null);
      raise exception 'FAIL: incomplete coordinates accepted';
    exception when invalid_parameter_value then null;
    end;
    begin
      perform public.create_order(product, 1, true, 'Prueba 1', '13101', null, 'NaN'::double precision, -70.6);
      raise exception 'FAIL: nonfinite coordinates accepted';
    exception when invalid_parameter_value then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', other_customer, 'role', 'authenticated')::text, true);
    if exists (select 1 from public.orders where id = created.id)
      or exists (select 1 from public.order_events where order_id = created.id) then
      raise exception 'FAIL: RLS exposes another customer order/events';
    end if;
    begin
      perform public.cancel_order(created.id);
      raise exception 'FAIL: cancelled another customer order';
    exception when sqlstate '55000' then null;
    end;
    perform set_config('request.jwt.claims', '{}', true);
    begin
      perform public.create_order(product, 1, true, 'Prueba 1', '13101');
      raise exception 'FAIL: missing identity accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.cancel_order(created.id);
      raise exception 'FAIL: cancellation without identity accepted';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';
    update public.products set unit_price_clp = 23456 where id = product;
    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    repriced := public.create_order(product, 2, true, 'Prueba 2', '13101', null, -33.4, -70.6);
    if repriced.total_clp <> 46912 or repriced.delivery_location is null
      or (select total_clp from public.orders where id = created.id) <> 37035 then
      raise exception 'FAIL: current server price or immutable original total';
    end if;
    cancelled := public.cancel_order(created.id);
    if cancelled.status <> 'cancelled' or not exists (select 1 from public.order_events
      where order_id = created.id and from_status = 'requested' and to_status = 'cancelled' and actor_id = customer) then
      raise exception 'FAIL: cancellation/event not atomic';
    end if;
    begin
      perform public.cancel_order(created.id);
      raise exception 'FAIL: cancelled terminal order';
    exception when sqlstate '55000' then null;
    end;
    execute 'reset role';
    -- Trusted fixture setup only: no driver offer/accept implementation in this task.
    update public.orders set status = 'offered' where id = repriced.id;
    update public.orders set status = 'accepted', driver_id = driver, accepted_at = now() where id = repriced.id;
    update public.orders set status = 'on_the_way' where id = repriced.id;
    execute 'set local role authenticated';
    begin
      perform public.cancel_order(repriced.id);
      raise exception 'FAIL: cancelled order already on the way';
    exception when sqlstate '55000' then null;
    end;
    if (select status from public.orders where id = repriced.id) <> 'on_the_way'
      or exists (select 1 from public.order_events where order_id = repriced.id and to_status = 'cancelled') then
      raise exception 'FAIL: rejected cancellation changed order/events';
    end if;
    execute 'reset role';
    update public.orders set status = 'delivered', delivered_at = now() where id = repriced.id;
    execute 'set local role authenticated';
    begin
      perform public.cancel_order(repriced.id);
      raise exception 'FAIL: cancelled delivered order';
    exception when sqlstate '55000' then null;
    end;
    repriced := public.create_order(product, 1, true, 'Prueba 3', '13101');
    execute 'reset role';
    update public.orders set status = 'offered' where id = repriced.id;
    execute 'set local role authenticated';
    cancelled := public.cancel_order(repriced.id);
    if cancelled.status <> 'cancelled' then
      raise exception 'FAIL: offered cancellation rejected';
    end if;
    repriced := public.create_order(product, 1, true, 'Prueba 4', '13101');
    execute 'reset role';
    update public.orders set status = 'offered' where id = repriced.id;
    update public.orders set status = 'accepted', driver_id = driver, accepted_at = now() where id = repriced.id;
    execute 'set local role authenticated';
    cancelled := public.cancel_order(repriced.id);
    if cancelled.status <> 'cancelled' then
      raise exception 'FAIL: accepted cancellation rejected';
    end if;
    execute 'reset role';
    update public.products set unit_price_clp = null where id = product;
    execute 'set local role authenticated';
    begin
      perform public.create_order(product, 1, true, 'Prueba 1', '13101');
      raise exception 'FAIL: unpriced product accepted';
    exception when sqlstate '55000' then null;
    end;
    execute 'reset role';
    raise exception 'customer_orders_rollback' using errcode = 'P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm <> 'customer_orders_rollback' then raise; end if;
  end;
  raise notice 'PASS: server price, ownership, RLS, cancellation, events and validation; fixtures rolled back';
end;
$$;
