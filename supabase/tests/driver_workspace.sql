-- Full invited-driver journey. Run as postgres; all fixtures are reverted.
do $$
declare
  owner_id uuid:=gen_random_uuid(); driver_id uuid:=gen_random_uuid(); customer_id uuid:=gen_random_uuid();
  business_id uuid:=gen_random_uuid(); other_business uuid:=gen_random_uuid(); invitation_id uuid;
  recipient text:=gen_random_uuid()::text||'@example.com'; payload jsonb; product_id uuid; target public.orders;
  initial_users integer; initial_businesses integer;
begin
  select count(*) into initial_users from auth.users;
  select count(*) into initial_businesses from public.distributors;
  begin
    insert into auth.users(id,email,email_confirmed_at) values(owner_id,owner_id::text||'@example.com',now()),
      (driver_id,recipient,now()),(customer_id,customer_id::text||'@example.com',now());
    insert into public.distributors(id,name,is_verified,is_demo) values(business_id,'Negocio de prueba',true,true),(other_business,'Negocio ajeno',true,true);
    insert into public.distributor_members values(business_id,owner_id,'owner');
    insert into public.distributor_brands values(business_id,'Lipigas'),(other_business,'Gasco');
    if has_function_privilege('anon','public.get_my_driver_workspace()','execute')
      or has_function_privilege('service_role','private.get_my_driver_workspace()','execute') then
      raise exception 'FAIL: workspace grants';end if;
    execute 'set local role authenticated';perform set_config('request.jwt.claims','{}',true);
    begin perform public.get_my_driver_workspace();raise exception 'FAIL: anonymous workspace';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id)::text,true);
    payload:=public.get_my_driver_workspace();
    if (payload->>'can_manage_business')::boolean is distinct from true or (payload->>'can_receive_offers')::boolean then
      raise exception 'FAIL: business membership implies driver access';end if;
    invitation_id:=(public.create_driver_invitations(business_id,jsonb_build_array(jsonb_build_object('name','Conductor demo','email',recipient)),false)->0->>'id')::uuid;
    perform set_config('request.jwt.claims',json_build_object('sub',driver_id)::text,true);
    perform public.accept_driver_invitation(invitation_id);
    if (public.get_my_driver_workspace()->>'can_receive_offers')::boolean then raise exception 'FAIL: invitation enables driver';end if;
    perform public.submit_invited_driver_application(invitation_id,'Conductor demo','12345678-5','912345678',false);
    if public.get_my_driver_workspace()->>'blocking_reason'<>'not_approved' then raise exception 'FAIL: pending access';end if;
    execute 'reset role';
    perform private.review_driver_application(driver_id,'approved',business_id,'Revisión ficticia','test');
    execute 'set local role authenticated';
    payload:=public.get_my_driver_workspace();
    if (payload->>'can_receive_offers')::boolean is distinct from true
      or (payload->>'can_manage_business')::boolean is distinct from false
      or payload->'business'->>'id'<>business_id::text or payload->'business'->'brands'<>'["Lipigas"]'::jsonb
      or payload ? 'rut' or payload ? 'phone' then raise exception 'FAIL: approved workspace, privacy or role separation';end if;
    begin perform public.set_driver_settings(true,array[]::text[]);raise exception 'FAIL: empty coverage available';exception when invalid_parameter_value then null;end;
    perform public.set_driver_settings(false,array['13101']);
    if (public.get_driver_settings()->>'is_available')::boolean then raise exception 'FAIL: saved coverage enables availability';end if;
    perform public.set_driver_settings(true,array['13101']);
    execute 'reset role';
    insert into public.products(brand,weight_kg,variant,unit_price_clp,is_active) values('Lipigas',11,'standard',12345,true)
      on conflict(brand,weight_kg,variant) do update set unit_price_clp=12345,is_active=true returning id into product_id;
    perform set_config('request.jwt.claims',json_build_object('sub',customer_id)::text,true);execute 'set local role authenticated';
    target:=public.create_order(product_id,1,true,'Dirección ficticia privada','13101');
    perform set_config('request.jwt.claims',json_build_object('sub',driver_id)::text,true);
    payload:=public.list_driver_offers();
    if not exists(select 1 from jsonb_array_elements(payload) item where item->>'order_id'=target.id::text)
      or exists(select 1 from jsonb_array_elements(payload) item where item ? 'delivery_address') then raise exception 'FAIL: offer eligibility/privacy';end if;
    perform public.accept_driver_offer(target.id);
    if public.get_driver_order(target.id)->>'delivery_address'<>'Dirección ficticia privada'
      or (public.get_driver_settings()->>'is_available')::boolean then raise exception 'FAIL: assignment/availability';end if;
    -- Buying in customer routes retains the driver's role and never dispatches to self.
    perform public.create_order(product_id,1,true,'Compra propia ficticia','13101');
    execute 'reset role';
    if (select role from public.profiles where id=driver_id)<>'driver' then raise exception 'FAIL: buying changed driver role';end if;
    update public.distributors set is_verified=false where id=business_id;
    execute 'set local role authenticated';
    payload:=public.get_my_driver_workspace();
    if payload->>'blocking_reason'<>'business_disabled' or (payload->>'can_receive_offers')::boolean then raise exception 'FAIL: disabled business availability';end if;
    begin perform public.set_driver_settings(true,array['13101']);raise exception 'FAIL: disabled business new work';exception when insufficient_privilege then null;end;
    perform public.advance_driver_order(target.id,'on_the_way');
    perform public.advance_driver_order(target.id,'delivered');
    if public.get_driver_order(target.id)->>'status'<>'delivered' then raise exception 'FAIL: existing delivery stranded';end if;
    execute 'reset role';
    update public.distributors set is_verified=true where id=business_id;
    delete from public.distributor_brands where distributor_id=business_id;
    execute 'set local role authenticated';
    if public.get_my_driver_workspace()->>'blocking_reason'<>'no_brands' then raise exception 'FAIL: unconfigured brands';end if;
    execute 'reset role';
    update public.drivers set distributor_id=null where id=driver_id;
    execute 'set local role authenticated';
    if public.get_my_driver_workspace()->>'blocking_reason'<>'no_business' then raise exception 'FAIL: legacy unaffiliated driver';end if;
    execute 'reset role';
    update public.drivers set is_verified=false where id=driver_id;
    execute 'set local role authenticated';
    if public.get_my_driver_workspace()->>'blocking_reason'<>'not_approved' then raise exception 'FAIL: suspended driver';end if;
    execute 'reset role';
    raise exception using errcode='P0002',message='rollback workspace fixtures';
  exception when sqlstate 'P0002' then null;
  end;
  if (select count(*) from auth.users)<>initial_users or (select count(*) from public.distributors)<>initial_businesses then raise exception 'FAIL: fixture cleanup';end if;
end;
$$;
select 'PASS invited onboarding, approval, own workspace, coverage, dispatch, delivery, customer capability and revocation; fixtures reverted' as result;
