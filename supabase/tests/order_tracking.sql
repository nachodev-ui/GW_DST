-- Dedicated Test only; outer runner checks environment and rolls back.
do $$
declare customer uuid:=gen_random_uuid(); driver uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
  other_driver uuid:=gen_random_uuid(); business uuid:=gen_random_uuid(); product uuid;
  target public.orders; second_order public.orders; actor uuid; result jsonb; bad jsonb;
  captured timestamptz; before_receipt timestamptz; receipt timestamptz; old_capture timestamptz;
  route_lease uuid; route_points jsonb; osrm_points jsonb;
begin
  begin
    insert into auth.users(id) values(customer),(driver),(stranger),(other_driver);
    update public.profiles set role='driver' where id in(driver,other_driver);
    insert into public.distributors(id,name,is_verified,is_demo) values(business,'GPS contract test',true,true);
    -- Ownership of the distributor must not grant access to driver GPS.
    insert into public.distributor_members(distributor_id,user_id,role) values(business,stranger,'owner');
    insert into public.distributor_brands values(business,'Gasco');
    insert into public.distributor_communes values(business,'13101');
    insert into public.drivers(id,is_verified,is_available,distributor_id)
      values(driver,true,false,business),(other_driver,true,false,business);
    perform private.seed_test_document_fixture(driver);
    perform private.seed_test_document_fixture(other_driver,false);
    select id into strict product from public.products
      where brand='Gasco' and weight_kg=15 and variant='standard' and is_active;
    insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed)
      values(business,product,21990,4,true);
    if to_regclass('public.driver_locations') is not null
      or has_table_privilege('authenticated','private.driver_locations','SELECT')
      or has_table_privilege('authenticated','private.driver_locations','INSERT')
      or has_table_privilege('authenticated','private.driver_locations','UPDATE')
      or exists(select 1 from pg_publication_tables where tablename='driver_locations')
      or not exists(select 1 from pg_publication_tables where tablename='order_tracking_signals')
      or has_function_privilege('anon','public.get_order_tracking(uuid)','EXECUTE')
      or has_function_privilege('anon',
        'public.publish_order_location(uuid,double precision,double precision,timestamptz,double precision)','EXECUTE') then
      raise exception 'FAIL: raw GPS exposure or missing invalidation stream'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    target:=public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba GPS 123','13101',null,21990,gen_random_uuid(),-33.44,-70.65);
    perform set_config('request.jwt.claims',json_build_object('sub',driver,'role','authenticated')::text,true);
    begin
      perform public.publish_order_location(target.id,-33.45,-70.66,clock_timestamp(),8);
      raise exception 'FAIL: unaccepted order published';
    exception when insufficient_privilege then null; end;
    perform public.accept_order(target.id);
    result:=public.get_order_tracking(target.id);
    if result->>'state'<>'waiting'
      or result->'destination' is distinct from jsonb_build_object('latitude',-33.44,'longitude',-70.65) then
      raise exception 'FAIL: new order reused position'; end if;
    for bad in select value from jsonb_array_elements('[
      {"latitude":91},{"latitude":"NaN"},{"latitude":"Infinity"},{"latitude":null},
      {"longitude":181},{"longitude":"-Infinity"},{"longitude":null},
      {"accuracy":-1},{"accuracy":1001},{"accuracy":"NaN"},{"accuracy":null},
      {"captured":"infinity"},{"captured":"-infinity"},{"captured":null}
    ]'::jsonb) loop
      begin
        perform public.publish_order_location(target.id,
          case when bad?'latitude' then (bad->>'latitude')::float8 else -33.45 end,
          case when bad?'longitude' then (bad->>'longitude')::float8 else -70.66 end,
          case when bad?'captured' then (bad->>'captured')::timestamptz else clock_timestamp() end,
          case when bad?'accuracy' then (bad->>'accuracy')::float8 else 8 end);
        raise exception 'FAIL: malformed sample accepted: %',bad;
      exception when invalid_parameter_value then null; end;
    end loop;
    foreach captured in array array[clock_timestamp()-interval '31 seconds',clock_timestamp()+interval '6 seconds'] loop
      begin
        perform public.publish_order_location(target.id,-33.45,-70.66,captured,8);
        raise exception 'FAIL: stale/future sample accepted';
      exception when invalid_parameter_value then null; end;
    end loop;
    captured:=clock_timestamp(); before_receipt:=clock_timestamp();
    result:=public.publish_order_location(target.id,-33.45,-70.66,captured,8);
    receipt:=(result->>'received_at')::timestamptz;
    if result->>'accepted'<>'true' or receipt<before_receipt or receipt>clock_timestamp() then
      raise exception 'FAIL: receipt not server-authoritative'; end if;
    if public.publish_order_location(target.id,-33.46,-70.67,captured,8)->>'reason'<>'out_of_order'
      or public.publish_order_location(target.id,-33.46,-70.67,captured+interval '1 millisecond',8)->>'reason'<>'rate_limited' then
      raise exception 'FAIL: replay/order/rate protection'; end if;
    begin
      insert into public.order_tracking_signals(order_id) values(target.id);
      raise exception 'FAIL: direct signal write';
    exception when insufficient_privilege then null; end;
    begin
      perform 1 from private.driver_locations;
      raise exception 'FAIL: direct raw GPS read';
    exception when insufficient_privilege then null; end;
    begin
      insert into private.driver_locations(driver_id,order_id,location,captured_at,received_at,accuracy_m)
        values(driver,target.id,extensions.st_point(-70.66,-33.45,4326)::extensions.geography,captured,captured,8);
      raise exception 'FAIL: direct GPS write';
    exception when insufficient_privilege then null; end;
    foreach actor in array array[customer,driver] loop
      perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
      result:=public.get_order_tracking(target.id);
      if result->>'state'<>'fresh' or (result->'sample'->>'latitude')::float8<>-33.45
        or (result->'sample'->>'longitude')::float8<>-70.66
        or (result->>'received_at')::timestamptz<>receipt
        or (select revision from public.order_tracking_signals where order_id=target.id)<>1 then
        raise exception 'FAIL: participant read/sample overwritten by rejected input'; end if;
    end loop;
    -- Route cache uses the same order authorization, with backend-only completion.
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    result:=public.begin_order_route(target.id);
    if result->>'state'<>'compute' then raise exception 'FAIL: initial route claim'; end if;
    route_lease:=(result->>'lease')::uuid;
    if public.begin_order_route(target.id)->>'state'<>'pending' then raise exception 'FAIL: duplicate route lease'; end if;
    begin
      perform public.finish_order_route(target.id,route_lease,'[]'::jsonb);
      raise exception 'FAIL: customer can fabricate route';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    if has_table_privilege('authenticated','private.order_routes','SELECT')
      or has_table_privilege('service_role','private.order_routes','UPDATE')
      or has_function_privilege('anon','public.begin_order_route(uuid)','EXECUTE')
      or exists(select 1 from pg_publication_tables where tablename='order_routes') then
      raise exception 'FAIL: route privacy grants'; end if;
    route_points:='[{"latitude":-33.45,"longitude":-70.66},{"latitude":-33.44,"longitude":-70.65}]'::jsonb;
    execute 'set local role service_role';
    if public.finish_order_route(target.id,gen_random_uuid(),route_points) then raise exception 'FAIL: wrong route lease'; end if;
    begin
      perform public.finish_order_route(target.id,route_lease,'[{"latitude":0,"longitude":0},{"latitude":1,"longitude":1}]'::jsonb);
      raise exception 'FAIL: unsupported route area';
    exception when invalid_parameter_value then null; end;
    if not public.finish_order_route(target.id,route_lease,route_points) then raise exception 'FAIL: route commit'; end if;
    execute 'reset role';
    execute 'set local role authenticated';
    result:=public.begin_order_route(target.id);
    if result->>'state'<>'ready' or result->'points'<>route_points then raise exception 'FAIL: cached route'; end if;
    execute 'reset role';
    -- Only the trusted fixture simulates successive fixes and elapsed server time.
    for actor in select gen_random_uuid() from generate_series(1,2) loop
      update private.driver_locations set location=extensions.st_point(-70.68,-33.47,4326)::extensions.geography
        where order_id=target.id;
    end loop;
    execute 'set local role authenticated';
    if public.begin_order_route(target.id)->>'state'<>'ready' then raise exception 'FAIL: two deviations recomputed'; end if;
    execute 'reset role';
    update private.driver_locations set location=extensions.st_point(-70.68,-33.47,4326)::extensions.geography
      where order_id=target.id;
    update private.order_routes set deviation_since=clock_timestamp()-interval '11 seconds',
      last_attempt=clock_timestamp()-interval '61 seconds',retry_after=clock_timestamp()-interval '1 second'
      where order_id=target.id;
    execute 'set local role authenticated';
    result:=public.begin_order_route(target.id);
    if result->>'state'<>'compute' then raise exception 'FAIL: sustained deviation did not recompute'; end if;
    route_lease:=(result->>'lease')::uuid;
    execute 'reset role';
    execute 'set local role service_role';
    if not public.finish_order_route(target.id,route_lease,null) then raise exception 'FAIL: route failure release'; end if;
    execute 'reset role';
    if exists(select 1 from private.order_routes where order_id=target.id
      and (attempts<>2 or lease is not null or retry_after<=clock_timestamp())) then
      raise exception 'FAIL: route retry budget/backoff'; end if;
    update private.driver_locations set location=extensions.st_point(-70.66,-33.45,4326)::extensions.geography
      where order_id=target.id;
    -- Separate provenance: Apple may never receive Google's cached geometry.
    execute 'set local role authenticated';
    result:=public.begin_osrm_order_route(target.id);
    if result->>'state'<>'compute' then raise exception 'FAIL: OSRM initial claim'; end if;
    route_lease:=(result->>'lease')::uuid;
    osrm_points:='[{"latitude":-33.45,"longitude":-70.66},{"latitude":-33.445,"longitude":-70.655},{"latitude":-33.44,"longitude":-70.65}]'::jsonb;
    execute 'reset role';
    execute 'set local role service_role';
    if public.finish_order_route(target.id,route_lease,osrm_points) then raise exception 'FAIL: provider lease crossed'; end if;
    if not public.finish_osrm_order_route(target.id,route_lease,osrm_points) then raise exception 'FAIL: OSRM commit'; end if;
    execute 'reset role';
    execute 'set local role authenticated';
    if public.begin_order_route(target.id)->'points'<>route_points
      or public.begin_osrm_order_route(target.id)->'points'<>osrm_points then raise exception 'FAIL: mixed route providers'; end if;
    execute 'reset role';
    update private.routing_provider_budget set next_request_at=clock_timestamp()+interval '2 seconds' where provider='osrm';
    update private.order_routes set deviation_hits=3,deviation_since=clock_timestamp()-interval '11 seconds',
      last_attempt=clock_timestamp()-interval '61 seconds',retry_after=clock_timestamp()-interval '1 second'
      where order_id=target.id and provider='osrm';
    execute 'set local role authenticated';
    if public.begin_osrm_order_route(target.id)->>'state'<>'pending' then raise exception 'FAIL: OSRM global limit'; end if;
    execute 'reset role';
    -- Expiry must remain a tombstone; repeated reads must not purchase a fresh route.
    update private.order_routes set valid_until=clock_timestamp()-interval '1 second' where order_id=target.id;
    execute 'set local role authenticated';
    if public.begin_order_route(target.id)->>'state'<>'unavailable'
      or public.begin_order_route(target.id)->>'state'<>'unavailable' then raise exception 'FAIL: expired route retried'; end if;
    execute 'reset role';
    if exists(select 1 from private.order_routes where order_id=target.id and provider='google' and (points is not null or path is not null)) then
      raise exception 'FAIL: expired route geometry retained'; end if;
    execute 'set local role authenticated';
    foreach actor in array array[customer,stranger,other_driver] loop
      perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
      begin
        perform public.publish_order_location(target.id,-33.45,-70.66,clock_timestamp(),8);
        raise exception 'FAIL: unauthorized publisher';
      exception when insufficient_privilege then null; end;
      if actor<>customer then
        begin
          perform public.begin_order_route(target.id);
          raise exception 'FAIL: foreign route read';
        exception when insufficient_privilege then null; end;
        begin
          perform public.get_order_tracking(target.id);
          raise exception 'FAIL: unrelated participant read GPS';
        exception when insufficient_privilege then null; end;
        if exists(select 1 from public.order_tracking_signals where order_id=target.id) then
          raise exception 'FAIL: foreign signal visible'; end if;
      end if;
    end loop;
    begin
      perform public.get_order_tracking(gen_random_uuid());
      raise exception 'FAIL: nonexistent order read';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    -- Simulate the clock/window without sleeping; only the postgres fixture can do this.
    update private.driver_locations set captured_at=clock_timestamp()-interval '31 seconds',
      received_at=clock_timestamp()-interval '31 seconds' where order_id=target.id;
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    result:=public.get_order_tracking(target.id);
    if result->>'state'<>'stale' or result->'sample'<>'null'::jsonb then
      raise exception 'FAIL: stale coordinates exposed'; end if;
    execute 'reset role';
    update public.drivers set is_verified=false where id=driver;
    execute 'set local role authenticated';
    begin
      perform public.get_order_tracking(target.id);
      raise exception 'FAIL: GPS still accessible after approval revoked';
    exception when insufficient_privilege then null; end;
    perform set_config('request.jwt.claims',json_build_object('sub',driver,'role','authenticated')::text,true);
    begin
      perform public.publish_order_location(target.id,-33.45,-70.66,clock_timestamp(),8);
      raise exception 'FAIL: unverified driver published';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    update public.drivers set is_verified=true where id=driver;
    execute 'set local role authenticated';
    result:=public.publish_order_location(target.id,-33.46,-70.67,clock_timestamp(),9);
    if result->>'accepted'<>'true'
      or (select revision from public.order_tracking_signals where order_id=target.id)<>2 then
      raise exception 'FAIL: next valid sample/update revision'; end if;
    -- Synthetic movement: the customer receives the new fix, with the same destination.
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    result:=public.get_order_tracking(target.id);
    if result->>'state' is distinct from 'fresh'
      or result->'sample'->'latitude' is distinct from '-33.46'::jsonb
      or result->'sample'->'longitude' is distinct from '-70.67'::jsonb
      or result->'destination' is distinct from jsonb_build_object('latitude',-33.44,'longitude',-70.65) then
      raise exception 'FAIL: customer movement readback or fixed destination'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',driver,'role','authenticated')::text,true);
    perform public.advance_driver_order(target.id,'on_the_way');
    perform public.advance_driver_order(target.id,'delivered');
    result:=public.get_order_tracking(target.id);
    if result->>'state'<>'ended' or result->'sample'<>'null'::jsonb
      or result->'received_at'<>'null'::jsonb or result->'destination'<>'null'::jsonb
      or exists(select 1 from public.order_tracking_signals where order_id=target.id) then
      raise exception 'FAIL: terminal tracking or signal still accessible'; end if;
    begin
      perform public.publish_order_location(target.id,-33.45,-70.66,clock_timestamp(),8);
      raise exception 'FAIL: terminal publish';
    exception when sqlstate '55000' then null; end;
    execute 'reset role';
    if exists(select 1 from private.driver_locations where order_id=target.id)
      or exists(select 1 from private.order_routes where order_id=target.id) then
      raise exception 'FAIL: terminal coordinates retained'; end if;
    -- A later assignment must wait for its own post-acceptance sample.
    update public.drivers set is_available=true where id=driver;
    old_capture:=clock_timestamp();
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    second_order:=public.create_distributor_order(business,product,1,true,'unknown','Prueba GPS 456','13101',null,21990,gen_random_uuid());
    perform set_config('request.jwt.claims',json_build_object('sub',driver,'role','authenticated')::text,true);
    perform public.accept_order(second_order.id);
    result:=public.get_order_tracking(second_order.id);
    if result->>'state'<>'waiting' or result->'destination'<>'null'::jsonb then
      raise exception 'FAIL: previous delivery position reused'; end if;
    -- accepted_at uses transaction time; make an explicit older pre-acceptance capture.
    execute 'reset role';
    select accepted_at-interval '1 microsecond' into old_capture from public.orders where id=second_order.id;
    execute 'set local role authenticated';
    begin
      perform public.publish_order_location(second_order.id,-33.45,-70.66,old_capture,8);
      raise exception 'FAIL: pre-acceptance sample accepted';
    exception when invalid_parameter_value then null; end;
    perform public.publish_order_location(second_order.id,-33.45,-70.66,clock_timestamp(),8);
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    perform public.cancel_order(second_order.id);
    result:=public.get_order_tracking(second_order.id);
    if result->>'state'<>'ended' or result->'sample'<>'null'::jsonb then
      raise exception 'FAIL: cancellation retained access'; end if;
    execute 'reset role';
    if exists(select 1 from private.driver_locations where order_id=second_order.id) then
      raise exception 'FAIL: cancelled coordinates retained'; end if;
    perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
    execute 'set local role authenticated';
    begin
      perform public.get_order_tracking(target.id);
      raise exception 'FAIL: missing identity read';
    exception when insufficient_privilege then null; end;
    begin
      perform public.publish_order_location(second_order.id,-33.45,-70.66,clock_timestamp(),8);
      raise exception 'FAIL: missing identity published';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    execute 'set local role anon';
    begin
      perform public.get_order_tracking(target.id);
      raise exception 'FAIL: anonymous tracking';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
    raise exception using errcode='ZX032',message='Rollback GPS fixtures';
  exception when sqlstate 'ZX032' then
    raise notice 'PASS: GPS authorization, validation, receipt, freshness, replay, throttle, terminal purge and delivery isolation; fixtures reverted';
  end;
end;
$$;
