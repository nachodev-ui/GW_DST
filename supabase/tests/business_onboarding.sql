-- Execute the entire DO as postgres. All fixtures and effects are rolled back.
do $$
declare
  owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
  manager uuid:=gen_random_uuid(); candidate uuid:=gen_random_uuid();
  business_a uuid; business_b uuid; product_a uuid; product_b uuid;
  first_request timestamptz; current_request timestamptz; payload jsonb;
begin
  begin
    insert into auth.users(id) values(owner_a),(owner_b),(outsider),(manager),(candidate);
    if has_function_privilege('anon','public.list_my_businesses()','execute')
      or has_function_privilege('authenticated','private.review_distributor_application(uuid,timestamptz,text,text,text,boolean)','execute')
      or has_function_privilege('service_role','private.review_distributor_application(uuid,timestamptz,text,text,text,boolean)','execute') then
      raise exception 'FAIL: review/anonymous privileges';end if;
    perform set_config('request.jwt.claims','{}',true);execute 'set local role authenticated';
    begin perform public.list_my_businesses();raise exception 'FAIL: missing identity';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);
    begin
      perform public.submit_distributor_application('Demo A','12345678-4','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial','Prueba seguridad',false);
      raise exception 'FAIL: invalid RUT';exception when invalid_parameter_value then null;end;
    begin
      perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','99999',array['Lipigas'],'Prueba comercial','Prueba seguridad',false);
      raise exception 'FAIL: invalid CUT';exception when invalid_parameter_value then null;end;
    begin
      perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas','Lipigas'],'Prueba comercial','Prueba seguridad',false);
      raise exception 'FAIL: duplicate brands';exception when invalid_parameter_value then null;end;
    perform public.submit_distributor_application('Demo A','12.345.678-5','Dueño A','9 1234 5678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial','Prueba seguridad',false);
    select requested_at into first_request from public.distributor_applications where applicant_id=owner_a;
    perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial','Prueba seguridad',false);
    if first_request<>(select requested_at from public.distributor_applications where applicant_id=owner_a)
      or jsonb_array_length(public.list_my_businesses())<>0 then raise exception 'FAIL: request retry or premature membership';end if;
    begin update public.distributor_applications set status='approved' where applicant_id=owner_a;
      raise exception 'FAIL: direct application write';exception when insufficient_privilege then null;end;
    begin insert into public.distributor_members values(gen_random_uuid(),owner_a,'owner');
      raise exception 'FAIL: membership self-provision';exception when insufficient_privilege then null;end;
    execute 'reset role';
    begin perform private.review_distributor_application(owner_a,first_request,'approved','','test',true);
      raise exception 'FAIL: empty review reason';exception when invalid_parameter_value then null;end;
    perform private.review_distributor_application(owner_a,first_request,'rejected','Corregir datos','test',true);
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);execute 'set local role authenticated';
    begin
      perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial','Prueba seguridad',false);
      raise exception 'FAIL: rejected request silently reopened';exception when object_not_in_prerequisite_state then null;end;
    perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial corregida','Prueba seguridad',true);
    select requested_at into current_request from public.distributor_applications where applicant_id=owner_a;
    perform public.submit_distributor_application('Demo A','12345678-5','Dueño A','912345678','Recinto de prueba','13101',array['Lipigas'],'Prueba comercial corregida','Prueba seguridad',true);
    if current_request<>(select requested_at from public.distributor_applications where applicant_id=owner_a) then
      raise exception 'FAIL: reapplication retry changed version';end if;
    execute 'reset role';
    begin perform private.review_distributor_application(owner_a,first_request,'approved','Prueba','test',true);
      raise exception 'FAIL: stale admin review';exception when object_not_in_prerequisite_state then null;end;
    business_a:=private.review_distributor_application(owner_a,current_request,'approved','Prueba ficticia','test',true);
    begin perform private.review_distributor_application(owner_a,current_request,'approved','Prueba ficticia','test',true);
      raise exception 'FAIL: repeated resolution';exception when object_not_in_prerequisite_state then null;end;
    if not exists(select 1 from private.distributor_application_reviews where applicant_id=owner_a and decision='approved'
      and is_demo and application_snapshot->>'commercial_evidence'='Prueba comercial corregida')
      or (select count(*) from private.distributor_application_reviews where applicant_id=owner_a)<>2
      or (select role from public.profiles where id=owner_a)<>'customer'
      or exists(select 1 from public.drivers where id=owner_a) then raise exception 'FAIL: audit or role separation';end if;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_b)::text,true);execute 'set local role authenticated';
    perform public.submit_distributor_application('Demo B','12345678-5','Dueño B','912345678','Recinto de prueba','13101',array['Gasco'],'Prueba comercial','Prueba seguridad',false);
    execute 'reset role';
    business_b:=private.review_distributor_application(owner_b,(select requested_at from public.distributor_applications where applicant_id=owner_b),'approved','Prueba','test',true);
    insert into public.distributor_members values(business_a,manager,'manager');
    insert into public.products(brand,weight_kg,variant,unit_price_clp,is_active) values('Lipigas',11,'standard',null,true)
      on conflict(brand,weight_kg,variant) do update set is_active=true returning id into product_a;
    insert into public.products(brand,weight_kg,variant,unit_price_clp,is_active) values('Gasco',11,'standard',null,true)
      on conflict(brand,weight_kg,variant) do update set is_active=true returning id into product_b;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);execute 'set local role authenticated';
    payload:=public.list_my_businesses();
    if jsonb_array_length(payload)<>1 or payload->0->>'id'<>business_a::text or (payload->0->>'is_demo')::boolean<>true
      or exists(select 1 from public.distributor_applications where applicant_id=owner_b)
      or exists(select 1 from public.distributors where id=business_b) then raise exception 'FAIL: business RLS';end if;
    begin update public.distributors set is_verified=true where id=business_a;
      raise exception 'FAIL: direct verification';exception when insufficient_privilege then null;end;
    begin perform public.set_business_recruitment(business_b,true);
      raise exception 'FAIL: other business recruitment';exception when insufficient_privilege then null;end;
    begin perform public.set_business_recruitment(business_a,true);
      raise exception 'FAIL: retired recruitment endpoint';exception when insufficient_privilege then null;end;
    perform public.set_business_product(business_a,product_a,15990,12,true,0);
    perform public.set_business_product(business_a,product_a,15990,12,true,0);
    begin perform public.set_business_product(business_a,product_a,16990,10,true,0);
      raise exception 'FAIL: stale product write';exception when serialization_failure then null;end;
    begin perform public.set_business_product(business_a,product_a,100,-1,true,1);
      raise exception 'FAIL: negative stock';exception when invalid_parameter_value then null;end;
    begin perform public.set_business_product(business_a,product_a,null,1,true,1);
      raise exception 'FAIL: listed without price';exception when invalid_parameter_value then null;end;
    begin perform public.set_business_product(business_a,product_b,15990,12,true,0);
      raise exception 'FAIL: wrong brand';exception when invalid_parameter_value then null;end;
    begin update public.distributor_products set stock=999 where distributor_id=business_a;
      raise exception 'FAIL: direct stock write';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_b)::text,true);
    if exists(select 1 from public.distributor_products where distributor_id=business_a) then raise exception 'FAIL: foreign stock visible';end if;
    begin perform public.list_business_products(business_a);
      raise exception 'FAIL: foreign catalogue RPC';exception when insufficient_privilege then null;end;
    begin perform public.set_business_product(business_a,product_a,0,0,true,1);
      raise exception 'FAIL: foreign catalogue write';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',manager)::text,true);
    perform public.set_business_product(business_a,product_a,16990,10,true,1);
    execute 'reset role';
    if (select count(*) from private.distributor_product_changes where distributor_id=business_a)<>2
      or not exists(select 1 from private.distributor_product_changes where actor_id=manager and snapshot->>'stock'='10') then
      raise exception 'FAIL: product audit/idempotence';end if;
    -- A historical application remains reviewable; new enrolments use invitations.
    insert into public.drivers(id) values(candidate);
    insert into public.driver_applications(driver_id,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
      values(candidate,'Repartidor demo','12345678-5','+56912345678',business_a,'Demo A');
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',json_build_object('sub',manager)::text,true);
    payload:=public.list_distributor_driver_applications();
    if jsonb_array_length(payload)<>1 or payload->0 ? 'phone' or payload->0 ? 'rut' then raise exception 'FAIL: affiliation privacy';end if;
    perform public.confirm_driver_affiliation(candidate,(payload->0->>'requested_at')::timestamptz);
    execute 'reset role';
    if (select is_verified from public.drivers where id=candidate) then raise exception 'FAIL: company enabled driver';end if;
    delete from public.distributor_members where user_id=manager;
    perform set_config('request.jwt.claims',json_build_object('sub',manager)::text,true);execute 'set local role authenticated';
    if jsonb_array_length(public.list_my_businesses())<>0 then raise exception 'FAIL: revoked membership visible';end if;
    begin perform public.set_business_product(business_a,product_a,0,0,true,2);
      raise exception 'FAIL: revoked membership still writes';exception when insufficient_privilege then null;end;
    execute 'reset role';
    update public.distributors set is_verified=false where id=business_a;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);execute 'set local role authenticated';
    begin perform public.set_business_product(business_a,product_a,0,0,true,2);
      raise exception 'FAIL: disabled business writes';exception when insufficient_privilege then null;end;
    execute 'reset role';
    raise exception using errcode='P0002',message='rollback business fixtures';
  exception when sqlstate 'P0002' then null;
  end;
  raise notice 'PASS business onboarding, review, privacy, membership, catalogue, revisions and audit; fixtures reverted';
end;
$$;
select 'PASS business onboarding; transactional fixtures reverted' as result;
