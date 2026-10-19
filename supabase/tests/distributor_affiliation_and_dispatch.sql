-- Run the whole DO as postgres after 20261018213030. Fixtures roll back.
do $$
declare
  customer uuid:=gen_random_uuid(); applicant uuid:=gen_random_uuid();
  owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid();
  other_driver uuid:=gen_random_uuid(); legacy_driver uuid:=gen_random_uuid();
  business_a uuid:=gen_random_uuid(); business_b uuid:=gen_random_uuid();
  product_a uuid; product_b uuid; order_a public.orders; order_b public.orders;
  payload jsonb;
  first_request_at timestamptz;
begin
  begin
    insert into auth.users(id) values(customer),(applicant),(owner_a),(owner_b),(other_driver),(legacy_driver);
    insert into public.distributors(id,name,is_verified,accepts_driver_applications)
      values(business_a,'Negocio A',true,true),(business_b,'Negocio B',true,true);
    insert into public.distributor_members values(business_a,owner_a,'owner'),(business_b,owner_b,'manager');
    insert into public.distributor_brands values(business_a,'Lipigas'),(business_b,'Gasco');
    if has_table_privilege('authenticated','public.distributor_brands','INSERT')
      or has_table_privilege('authenticated','public.driver_affiliation_confirmations','INSERT')
      or has_function_privilege('anon','public.confirm_driver_affiliation(uuid,timestamptz)','EXECUTE') then
      raise exception 'FAIL: excessive grants';end if;
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    -- Historical fixture: the open mobile endpoint was retired by driver invitations.
    insert into public.drivers(id) values(applicant);
    insert into public.driver_applications(driver_id,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
      values(applicant,'Postulante','12345678-5','+56912345678',business_a,'Negocio A');
    execute 'set local role authenticated';
    begin
      perform public.confirm_driver_affiliation(applicant,(public.list_distributor_driver_applications()->0->>'requested_at')::timestamptz);raise exception 'FAIL: self-confirmation';
    exception when insufficient_privilege then null;end;
    execute 'reset role';
    begin
      perform private.review_driver_application(applicant,'approved',business_a,'Prueba','test');
      raise exception 'FAIL: approval without business confirmation';
    exception when sqlstate '55000' then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_b)::text,true);
    execute 'set local role authenticated';
    if public.list_distributor_driver_applications()<>'[]'::jsonb then raise exception 'FAIL: another business sees applicants';end if;
    begin
      perform public.confirm_driver_affiliation(applicant,(public.list_distributor_driver_applications()->0->>'requested_at')::timestamptz);raise exception 'FAIL: other business confirmed';
    exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);
    payload:=public.list_distributor_driver_applications();
    first_request_at:=(payload->0->>'requested_at')::timestamptz;
    if jsonb_array_length(payload)<>1 or (payload->0->>'name') is distinct from 'Postulante'
      or (payload->0) ? 'rut' or (payload->0) ? 'phone'
      or exists(select 1 from public.driver_applications where driver_id=applicant) then
      raise exception 'FAIL: business listing or personal-data isolation';end if;
    perform public.confirm_driver_affiliation(applicant,(public.list_distributor_driver_applications()->0->>'requested_at')::timestamptz);
    perform public.confirm_driver_affiliation(applicant,(public.list_distributor_driver_applications()->0->>'requested_at')::timestamptz);
    if (select count(*) from public.driver_affiliation_confirmations where driver_id=applicant)<>1 then
      raise exception 'FAIL: duplicate confirmation';end if;
    execute 'reset role';
    if (select is_verified from public.drivers where id=applicant) then raise exception 'FAIL: business self-approved driver';end if;
    perform private.review_driver_application(applicant,'rejected',null,'Corregir antecedentes','test');
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    -- Simulate another legacy request version as trusted fixture setup only.
    update public.driver_applications set status='pending',reviewed_at=null,decision_reason=null,
      requested_at=clock_timestamp() where driver_id=applicant;
    begin
      perform private.review_driver_application(applicant,'approved',business_a,'Prueba','test');
      raise exception 'FAIL: old confirmation authorized new application';
    exception when sqlstate '55000' then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);
    execute 'set local role authenticated';
    begin
      perform public.confirm_driver_affiliation(applicant,first_request_at);
      raise exception 'FAIL: stale business screen confirmed new application';
    exception when sqlstate '55000' then null;end;
    perform public.confirm_driver_affiliation(applicant,(public.list_distributor_driver_applications()->0->>'requested_at')::timestamptz);execute 'reset role';
    perform private.review_driver_application(applicant,'approved',business_a,'Revisión administrativa','test');
    if not exists(select 1 from private.driver_application_reviews where driver_id=applicant
      and decision='approved' and application_snapshot->'affiliation_confirmation'->>'confirmed_by'=owner_a::text) then
      raise exception 'FAIL: confirmation missing from audit';end if;

    update public.profiles set role='driver' where id in(other_driver,legacy_driver);
    insert into public.drivers(id,is_verified,is_available,distributor_id)
      values(other_driver,true,true,business_b),(legacy_driver,true,true,null);
    insert into public.driver_communes values(other_driver,'13101'),(legacy_driver,'13101');
    insert into public.products(brand,weight_kg,unit_price_clp,is_active) values('Lipigas',11,12345,true)
      on conflict(brand,weight_kg,variant) do update set unit_price_clp=12345,is_active=true returning id into product_a;
    insert into public.products(brand,weight_kg,unit_price_clp,is_active) values('Gasco',11,12345,true)
      on conflict(brand,weight_kg,variant) do update set unit_price_clp=12345,is_active=true returning id into product_b;
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    execute 'set local role authenticated';perform public.set_driver_settings(true,array['13101']);execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',legacy_driver)::text,true);
    execute 'set local role authenticated';
    begin perform public.set_driver_settings(true,array['13101']);raise exception 'FAIL: unaffiliated driver available';
    exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',customer)::text,true);
    order_a:=public.create_order(product_a,1,true,'Dirección sintética','13101');
    order_b:=public.create_order(product_b,1,true,'Dirección sintética','13101');
    execute 'reset role';
    if not exists(select 1 from private.order_offers where order_id=order_a.id and driver_id=applicant)
      or exists(select 1 from private.order_offers where order_id=order_a.id and driver_id in(other_driver,legacy_driver))
      or exists(select 1 from private.order_offers where order_id=order_b.id and driver_id in(applicant,legacy_driver)) then
      raise exception 'FAIL: brand/business dispatch';end if;
    -- A stale/internal offer must not bypass the acceptance check.
    insert into private.order_offers values(order_b.id,applicant,clock_timestamp()+interval '1 hour');
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    execute 'set local role authenticated';
    if jsonb_array_length(public.list_driver_offers())<>1 then raise exception 'FAIL: wrong-brand offer listed';end if;
    begin perform public.accept_order(order_b.id);raise exception 'FAIL: wrong brand accepted';
    exception when insufficient_privilege then null;end;
    perform public.accept_order(order_a.id);
    execute 'reset role';
    if (select distributor_id from public.orders where id=order_a.id) is distinct from business_a then
      raise exception 'FAIL: missing seller snapshot';end if;
    begin update public.orders set distributor_id=business_b where id=order_a.id;raise exception 'FAIL: mutable seller';
    exception when check_violation then null;end;
    -- Stop new assignments without stranding an already-assigned delivery.
    update public.distributors set is_verified=false where id=business_a;
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    execute 'set local role authenticated';
    perform public.advance_driver_order(order_a.id,'on_the_way');
    perform public.advance_driver_order(order_a.id,'delivered');
    begin perform public.set_driver_settings(true,array['13101']);raise exception 'FAIL: unverified business available';
    exception when insufficient_privilege then null;end;
    execute 'reset role';
    raise exception 'affiliation_dispatch_rollback' using errcode='P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm<>'affiliation_dispatch_rollback' then raise;end if;
  end;
  raise notice 'PASS: business consent, privacy, stale consent, brands, atomic acceptance, seller and active delivery; fixtures rolled back';
end;
$$;
