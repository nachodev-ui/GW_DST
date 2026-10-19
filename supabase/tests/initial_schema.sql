-- Ejecutar TODO como postgres en SQL Editor después de todas las migraciones.
-- Un único DO: sin tablas auxiliares, funciones de prueba ni sesión previa.
-- El bloque revierte sus fixtures incluso si el editor usa autocommit.
-- La aceptación se prueba en secuencia; una carrera real requiere dos conexiones.
do $gasway_tests$
declare
  v_customer_a uuid := gen_random_uuid();
  v_customer_b uuid := gen_random_uuid();
  v_driver_a uuid := gen_random_uuid();
  v_driver_b uuid := gen_random_uuid();
  v_driver_c uuid := gen_random_uuid();
  v_own uuid := gen_random_uuid();
  v_foreign uuid := gen_random_uuid();
  v_shared uuid := gen_random_uuid();
  v_offered_c uuid := gen_random_uuid();
  v_assigned_a uuid := gen_random_uuid();
  v_assigned_c uuid := gen_random_uuid();
  v_product uuid;
  v_organization uuid := gen_random_uuid();
  v_rejected boolean;
begin
  -- Este subbloque es una subtransacción: GW001 al final revierte todos los datos.
  begin
    perform set_config('request.jwt.claims', '{}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    -- Auth crea perfiles customer por trigger; el alta de drivers es privilegiada.
    insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
    select id, 'authenticated', 'authenticated', id::text || '@gasway-test.invalid',
      '{}'::jsonb, '{}'::jsonb
    from unnest(array[v_customer_a, v_customer_b, v_driver_a, v_driver_b, v_driver_c]) as u(id);
    update public.profiles set role = 'driver'
    where id in (v_driver_a, v_driver_b, v_driver_c);
    insert into public.drivers (id, is_verified, is_available)
    values (v_driver_a, true, true), (v_driver_b, true, true), (v_driver_c, true, true);
    insert into public.distributors(id,name,is_verified) values(v_organization,'Negocio de prueba inicial',true);
    insert into public.distributor_brands values(v_organization,'Lipigas');
    update public.drivers set distributor_id=v_organization where id in(v_driver_a,v_driver_b,v_driver_c);

    insert into public.products (brand, weight_kg) values ('Lipigas', 5)
    on conflict (brand, weight_kg, variant) do nothing;
    select id into strict v_product from public.products where brand = 'Lipigas' and weight_kg = 5;
    insert into public.orders (
      id, customer_id, product_id, exchange_empty, total_clp,
      delivery_address, commune_code, delivery_location
    )
    select o.id, o.customer_id, v_product, true, 0, 'Dirección sintética de prueba', '13101',
      extensions.st_setsrid(extensions.st_makepoint(-70.65, -33.45), 4326)::extensions.geography
    from (values
      (v_own, v_customer_a), (v_foreign, v_customer_b), (v_shared, v_customer_a),
      (v_offered_c, v_customer_b), (v_assigned_a, v_customer_b), (v_assigned_c, v_customer_b)
    ) as o(id, customer_id);
    update public.orders set status = 'offered'
    where id in (v_shared, v_offered_c, v_assigned_a, v_assigned_c);
    insert into private.order_offers (order_id, driver_id, expires_at)
    values
      (v_shared, v_driver_a, clock_timestamp() + interval '1 hour'),
      (v_shared, v_driver_b, clock_timestamp() + interval '1 hour'),
      (v_offered_c, v_driver_c, clock_timestamp() + interval '1 hour');

    -- A tiene historial; C una entrega activa. A y B quedan elegibles para competir.
    update public.orders set status = 'accepted', accepted_at = now(), driver_id = v_driver_a
    where id = v_assigned_a;
    update public.orders set status = 'on_the_way' where id = v_assigned_a;
    update public.orders set status = 'delivered', delivered_at = now() where id = v_assigned_a;
    update public.orders set status = 'accepted', accepted_at = now(), driver_id = v_driver_c
    where id = v_assigned_c;

    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_customer_a, 'role', 'authenticated')::text, true);
    if auth.uid() is distinct from v_customer_a
      or (select count(*) from public.orders) <> 2
      or exists (select 1 from public.orders where customer_id <> v_customer_a) then
      raise exception 'FAIL cliente A: debe ver sus dos pedidos y ningún pedido ajeno';
    end if;
    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_customer_b, 'role', 'authenticated')::text, true);
    if auth.uid() is distinct from v_customer_b
      or (select count(*) from public.orders) <> 4
      or exists (select 1 from public.orders where customer_id <> v_customer_b) then
      raise exception 'FAIL cliente B: debe ver sus cuatro pedidos y ningún pedido ajeno';
    end if;
    raise notice 'OK 1/4: cada cliente solo ve sus propios pedidos';

    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_driver_a, 'role', 'authenticated')::text, true);
    -- RLS inicial oculta las ofertas sin asignar, incluso al destinatario.
    if auth.uid() is distinct from v_driver_a
      or (select count(*) from public.orders) <> 1
      or not exists (select 1 from public.orders where id = v_assigned_a) then
      raise exception 'FAIL driver A: solo debe ver su asignación histórica; ofertas y pedidos ajenos son privados';
    end if;
    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_driver_b, 'role', 'authenticated')::text, true);
    if auth.uid() is distinct from v_driver_b or exists (select 1 from public.orders) then
      raise exception 'FAIL driver B: sin asignaciones no debe ver pedidos, aunque tenga oferta';
    end if;
    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_driver_c, 'role', 'authenticated')::text, true);
    if auth.uid() is distinct from v_driver_c
      or (select count(*) from public.orders) <> 1
      or not exists (select 1 from public.orders where id = v_assigned_c) then
      raise exception 'FAIL driver C: solo debe ver su asignación, sin ofertas previas ni pedidos ajenos';
    end if;
    raise notice 'OK 2/4: repartidores solo ven asignaciones propias; ofertas sin asignar siguen privadas';

    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_driver_a, 'role', 'authenticated')::text, true);
    if public.accept_order(v_shared) is distinct from v_shared then
      raise exception 'FAIL aceptación: el primer repartidor no recibió el UUID del pedido';
    end if;
    if (select count(*) from public.orders) <> 2
      or exists (select 1 from public.orders where driver_id is distinct from v_driver_a)
      or not exists (select 1 from public.orders where id = v_shared
        and driver_id = v_driver_a and status = 'accepted' and accepted_at is not null) then
      raise exception 'FAIL aceptación: el ganador debe ver el pedido ganado y su asignación anterior';
    end if;
    set local role authenticated;
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_driver_b, 'role', 'authenticated')::text, true);
    v_rejected := false;
    begin
      perform public.accept_order(v_shared);
    exception when sqlstate '55000' then
      if sqlerrm <> 'Order unavailable or offer expired' then
        raise exception 'FAIL segundo repartidor: motivo inesperado: %', sqlerrm;
      end if;
      v_rejected := true;
    end;
    if not v_rejected then
      raise exception 'FAIL aceptación: el segundo repartidor logró aceptar el pedido ya ganado';
    end if;
    if exists (select 1 from public.orders) then
      raise exception 'FAIL segundo repartidor: no debe leer pedidos ajenos ni el pedido perdido';
    end if;

    reset role;
    perform set_config('request.jwt.claims', '{}', true);
    if not exists (select 1 from public.orders where id = v_shared
        and driver_id = v_driver_a and status = 'accepted')
      or (select count(*) from public.order_events where order_id = v_shared
        and to_status = 'accepted') <> 1
      or not exists (select 1 from public.order_events where order_id = v_shared
        and to_status = 'accepted' and actor_id = v_driver_a)
      or (select is_available from public.drivers where id = v_driver_a)
      or not (select is_available from public.drivers where id = v_driver_b) then
      raise exception 'FAIL atomicidad: debe conservarse un único ganador/evento y solo él perder disponibilidad';
    end if;
    raise notice 'OK 3/4: primer repartidor gana; segundo rechazado sin alterar ganador, evento ni disponibilidad';

    -- Como postgres: probar el trigger, sin confundir falta de UPDATE con rechazo del grafo.
    v_rejected := false;
    begin
      update public.orders set status = 'delivered', delivered_at = now() where id = v_shared;
    exception when check_violation then
      if sqlerrm <> 'Invalid order transition' then
        raise exception 'FAIL transición: restricción inesperada: %', sqlerrm;
      end if;
      v_rejected := true;
    end;
    if not v_rejected then
      raise exception 'FAIL transición: accepted → delivered debe rechazarse sin pasar por on_the_way';
    end if;
    if not exists (select 1 from public.orders where id = v_shared
        and status = 'accepted' and delivered_at is null)
      or exists (select 1 from public.order_events where order_id = v_shared and to_status = 'delivered') then
      raise exception 'FAIL transición: el intento inválido alteró pedido o eventos';
    end if;
    raise notice 'OK 4/4: transición inválida rechazada sin alterar pedido ni eventos';

    raise exception using errcode = 'GW001', message = 'Revertir fixtures de prueba';
  exception when sqlstate 'GW001' then
    raise notice 'OK: cuatro verificaciones completadas; todos los datos de prueba revertidos';
  end;
end;
$gasway_tests$;
