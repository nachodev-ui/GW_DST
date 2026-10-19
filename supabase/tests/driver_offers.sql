-- SQL Editor ONLY, as postgres, after all migrations. Execute this entire DO.
-- Fixtures roll back internally even in autocommit; sequence values may advance.
do $$
declare
  customer uuid := gen_random_uuid();
  first_driver uuid := gen_random_uuid();
  second_driver uuid := gen_random_uuid();
  pending_driver uuid := gen_random_uuid();
  outside_driver uuid := gen_random_uuid();
  offline_driver uuid := gen_random_uuid();
  product uuid;
  organization uuid := gen_random_uuid();
  offered public.orders;
  expired public.orders;
  foreign_order public.orders;
  rejected public.orders;
  payload jsonb;
  result jsonb;
  previous_expiry timestamptz;
begin
  begin
    insert into auth.users (id) values (customer), (first_driver), (second_driver),
      (pending_driver), (outside_driver), (offline_driver);
    update public.profiles set role = 'driver' where id in
      (first_driver, second_driver, pending_driver, outside_driver, offline_driver);
    insert into public.drivers (id, is_verified, is_available) values
      (first_driver, true, true), (second_driver, true, true), (pending_driver, false, true),
      (outside_driver, true, true), (offline_driver, true, false);
    insert into public.distributors(id,name,is_verified) values(organization,'Negocio de prueba de ofertas',true);
    insert into public.distributor_brands values(organization,'Gasco');
    update public.drivers set distributor_id=organization where id in(first_driver,second_driver,pending_driver,outside_driver,offline_driver);
    insert into public.driver_communes (driver_id, commune_code) values
      (first_driver, '13101'), (second_driver, '13101'), (pending_driver, '13101'),
      (offline_driver, '13101'), (outside_driver, '13102');
    insert into public.products (brand, weight_kg, unit_price_clp, is_active)
      values ('Gasco', 11, 12345, true)
      on conflict (brand, weight_kg, variant) do update set unit_price_clp = 12345, is_active = true
      returning id into product;
    if has_table_privilege('authenticated', 'private.order_offers', 'SELECT')
      or has_table_privilege('authenticated', 'public.driver_communes', 'INSERT')
      or has_column_privilege('authenticated', 'public.drivers', 'is_verified', 'UPDATE')
      or has_column_privilege('authenticated', 'public.drivers', 'is_available', 'UPDATE')
      or has_function_privilege('authenticated', 'private.dispatch_order(uuid)', 'EXECUTE')
      or has_function_privilege('anon', 'public.list_driver_offers()', 'EXECUTE')
      or has_function_privilege('anon', 'public.accept_driver_offer(uuid)', 'EXECUTE') then
      raise exception 'FAIL: excessive grants';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    offered := public.create_order(product, 2, true, 'Dirección privada 123', '13101', 'Nota privada');
    expired := public.create_order(product, 1, false, 'Dirección vencida', '13101');
    foreign_order := public.create_order(product, 1, false, 'Otra comuna', '13102');
    rejected := public.create_order(product, 1, false, 'Dirección rechazada', '13101');
    execute 'reset role';
    if offered.status <> 'offered' or (select count(*) from public.order_events
      where order_id = offered.id and to_status = 'offered') <> 1 then
      raise exception 'FAIL: dispatch/state/event not atomic';
    end if;
    if exists (select 1 from private.order_offers where order_id = offered.id
      and driver_id in (pending_driver, outside_driver, offline_driver)) then
      raise exception 'FAIL: unapproved/offline/outside driver received offer';
    end if;
    if (select count(*) from private.order_offers where order_id = offered.id
      and driver_id in (first_driver, second_driver)) <> 2 then
      raise exception 'FAIL: approved available drivers did not receive offers';
    end if;
    select expires_at into previous_expiry from private.order_offers
      where order_id = offered.id and driver_id = first_driver;
    perform private.dispatch_order(offered.id);
    if (select expires_at from private.order_offers where order_id = offered.id
      and driver_id = first_driver) <> previous_expiry then
      raise exception 'FAIL: repeated dispatch renewed offer';
    end if;
    update private.order_offers set expires_at = clock_timestamp() - interval '1 second'
      where order_id = expired.id;
    raise notice 'PASS: dispatch by commune, approval, availability, no duplicates/renewal';

    perform set_config('request.jwt.claims', json_build_object('sub', first_driver, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    payload := public.list_driver_offers();
    if jsonb_array_length(payload) <> 2 or not exists (select 1 from jsonb_array_elements(payload) f
      where f->>'order_id' = offered.id::text and (f->>'total_clp')::int = 24690)
      or exists (select 1 from jsonb_array_elements(payload) f where f->>'order_id' in (expired.id::text, foreign_order.id::text)) then
      raise exception 'FAIL: list must contain only own live offers';
    end if;
    if exists (select 1 from jsonb_array_elements(payload) f,
      lateral jsonb_object_keys(f) key where key not in
      ('order_id','brand','weight_kg','variant','quantity','exchange_empty','commune_code','commune_name','total_clp','expires_at'))
      or exists (select 1 from public.orders where id = offered.id)
      or public.get_driver_order(offered.id) is not null then
      raise exception 'FAIL: PII visible before acceptance';
    end if;
    begin
      perform 1 from private.order_offers;
      raise exception 'FAIL: direct offers access';
    exception when insufficient_privilege then null;
    end;
    if exists (select 1 from public.driver_communes where driver_id <> first_driver) then
      raise exception 'FAIL: foreign coverage visible';
    end if;
    begin
      perform public.accept_driver_offer(expired.id);
      raise exception 'FAIL: expired offer accepted';
    exception when sqlstate 'GW002' then null;
    end;
    begin
      perform public.accept_driver_offer(foreign_order.id);
      raise exception 'FAIL: foreign offer accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.accept_order(expired.id);
      raise exception 'FAIL: legacy RPC bypassed expiry';
    exception when sqlstate '55000' then null;
    end;
    if not public.reject_driver_offer(rejected.id) then
      raise exception 'FAIL: rejection failed';
    end if;
    begin
      perform public.accept_driver_offer(rejected.id);
      raise exception 'FAIL: rejected offer accepted';
    exception when sqlstate 'GW002' then null;
    end;
    begin
      perform public.set_driver_settings(true, array['99999']);
      raise exception 'FAIL: non-catalogue coverage';
    exception when invalid_parameter_value then null;
    end;
    result := public.accept_driver_offer(offered.id);
    if result->>'delivery_address' <> 'Dirección privada 123' or result->>'notes' <> 'Nota privada'
      or result->>'status' <> 'accepted' or public.get_driver_order(null)->>'order_id' <> offered.id::text
      or (public.get_driver_settings()->>'is_available')::boolean then
      raise exception 'FAIL: winner details/recovery/availability';
    end if;
    begin
      perform public.set_driver_settings(true, array['13101']);
      raise exception 'FAIL: available while assigned';
    exception when sqlstate '55000' then null;
    end;
    raise notice 'PASS: private live list, no PII before accept, expiry/ownership/rejection, winner address';

    perform set_config('request.jwt.claims', json_build_object('sub', second_driver, 'role', 'authenticated')::text, true);
    begin
      perform public.accept_driver_offer(offered.id);
      raise exception 'FAIL: second driver accepted';
    exception when sqlstate 'GW001' then null;
    end;
    if public.get_driver_order(offered.id) is not null
      or exists (select 1 from public.orders where id = offered.id)
      or exists (select 1 from jsonb_array_elements(public.list_driver_offers()) f where f->>'order_id' = offered.id::text) then
      raise exception 'FAIL: loser sees assigned order';
    end if;
    result := public.set_driver_settings(false, array['13101', '13101']);
    if (result->>'is_available')::boolean or jsonb_array_length(result->'commune_codes') <> 1 then
      raise exception 'FAIL: settings not saved/deduplicated';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', pending_driver, 'role', 'authenticated')::text, true);
    begin
      perform public.set_driver_settings(true, array['13101']);
      raise exception 'FAIL: pending driver enabled availability';
    exception when insufficient_privilege then null;
    end;
    if public.list_driver_offers() <> '[]'::jsonb then
      raise exception 'FAIL: pending driver sees offers';
    end if;
    execute 'reset role';
    if (select count(*) from public.order_events where order_id = offered.id and to_status = 'accepted') <> 1 then
      raise exception 'FAIL: accepted event count';
    end if;
    raise notice 'PASS: second acceptance rejected, loser isolation, settings and pending driver';
    raise exception using errcode = 'PT001', message = 'Rollback successful fixtures';
  exception when sqlstate 'PT001' then
    raise notice 'PASS: driver offers suite complete; all fixtures rolled back';
  end;
end;
$$;
