-- Run complete as postgres after 20261019004638. Every fixture is reverted.
do $$
declare
  owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); person uuid:=gen_random_uuid();
  outsider uuid:=gen_random_uuid(); unconfirmed uuid:=gen_random_uuid(); manager uuid:=gen_random_uuid();
  business_a uuid:=gen_random_uuid(); business_b uuid:=gen_random_uuid();
  invitation uuid; replacement uuid; invitation_b uuid; cancelled uuid; expired uuid;
  recipient text:=gen_random_uuid()::text||'@example.com'; payload jsonb; entries jsonb;
  first_request timestamptz; count_before integer; auth_before integer; rows_before integer;
begin
  select count(*) into count_before from public.distributors;
  select count(*) into auth_before from auth.users;
  begin
    insert into auth.users(id,email,email_confirmed_at) values
      (owner_a,owner_a::text||'@example.com',now()),(owner_b,owner_b::text||'@example.com',now()),
      (person,recipient,now()),(outsider,outsider::text||'@example.com',now()),
      (unconfirmed,unconfirmed::text||'@example.com',null),(manager,manager::text||'@example.com',now());
    insert into public.distributors(id,name,is_verified,is_demo) values(business_a,'Demo A',true,true),(business_b,'Demo B',true,true);
    insert into public.distributor_members values(business_a,owner_a,'owner'),(business_a,manager,'manager'),(business_b,owner_b,'owner');
    insert into public.distributor_brands values(business_a,'Lipigas'),(business_b,'Gasco');
    if has_function_privilege('anon','public.create_driver_invitations(uuid,jsonb,boolean)','execute')
      or has_function_privilege('authenticated','public.request_driver_access()','execute')
      or has_function_privilege('authenticated','private.request_driver_access()','execute')
      or has_function_privilege('authenticated','public.reapply_driver_access()','execute')
      or has_function_privilege('authenticated','public.submit_driver_application(text,text,text,uuid,boolean)','execute')
      or has_function_privilege('authenticated','public.list_application_distributors()','execute')
      or has_function_privilege('authenticated','public.set_business_recruitment(uuid,boolean)','execute')
      or has_function_privilege('authenticated','private.review_driver_application(uuid,text,uuid,text,text)','execute') then
      raise exception 'FAIL: retired path, admin privilege or anonymous access';end if;
    perform set_config('request.jwt.claims','{}',true);execute 'set local role authenticated';
    begin perform public.list_my_driver_invitations();raise exception 'FAIL: missing identity';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);
    entries:=jsonb_build_array(jsonb_build_object('name','Conductor A','email',upper(recipient)));
    payload:=public.create_driver_invitations(business_a,entries,true);
    if payload->0->>'result'<>'new' then raise exception 'FAIL: preview';end if;
    execute 'reset role';
    if exists(select 1 from private.driver_invitations where distributor_id=business_a) then raise exception 'FAIL: preview persisted';end if;
    execute 'set local role authenticated';
    payload:=public.create_driver_invitations(business_a,entries,false);
    invitation:=(payload->0->>'id')::uuid;
    payload:=public.create_driver_invitations(business_a,entries,false);
    if payload->0->>'id'<>invitation::text or payload->0->>'result'<>'existing' then raise exception 'FAIL: duplicate request';end if;
    begin
      perform public.create_driver_invitations(business_a,entries||entries,false);
      raise exception 'FAIL: duplicate batch emails';exception when invalid_parameter_value then null;end;
    begin
      perform public.create_driver_invitations(business_a,jsonb_build_array(jsonb_build_object('name','Persona válida','email','valid@example.com'),jsonb_build_object('name','Inválido','email','bad')),false);
      raise exception 'FAIL: invalid batch';exception when invalid_parameter_value then null;end;
    begin
      perform public.create_driver_invitations(business_a,jsonb_build_array(jsonb_build_object('name','Otro','email','valid@example.com','role','driver')),false);
      raise exception 'FAIL: untrusted role';exception when invalid_parameter_value then null;end;
    begin perform public.create_driver_invitations(business_b,entries,false);
      raise exception 'FAIL: foreign invitation creation';exception when insufficient_privilege then null;end;
    begin perform public.list_driver_team(business_b,0,'');
      raise exception 'FAIL: foreign team list';exception when insufficient_privilege then null;end;
    begin perform 1 from private.driver_invitations;
      raise exception 'FAIL: raw private invitations';exception when insufficient_privilege then null;end;
    execute 'reset role';
    if (select count(*) from private.driver_invitations where distributor_id=business_a)<>1 then raise exception 'FAIL: bad batch partially persisted';end if;

    perform set_config('request.jwt.claims',json_build_object('sub',owner_b)::text,true);execute 'set local role authenticated';
    invitation_b:=(public.create_driver_invitations(business_b,entries,false)->0->>'id')::uuid;
    begin perform public.cancel_driver_invitation(invitation);raise exception 'FAIL: foreign cancellation';exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',outsider,'email',recipient,'user_metadata',jsonb_build_object('email',recipient))::text,true);
    if jsonb_array_length(public.list_my_driver_invitations())<>0 then raise exception 'FAIL: trusted user-controlled email claim';end if;
    begin perform public.accept_driver_invitation(invitation);raise exception 'FAIL: different email accepted';exception when sqlstate 'GW005' then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',unconfirmed,'email',recipient,'email_verified',true)::text,true);
    begin perform public.list_my_driver_invitations();raise exception 'FAIL: unconfirmed email accepted';exception when sqlstate 'GW005' then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',person)::text,true);
    if jsonb_array_length(public.list_my_driver_invitations())<>2 then raise exception 'FAIL: personal inbox';end if;
    perform public.accept_driver_invitation(invitation);perform public.accept_driver_invitation(invitation);
    if public.get_my_driver_invitation()->>'id'<>invitation::text then raise exception 'FAIL: accepted invitation recovery';end if;
    begin perform public.accept_driver_invitation(invitation_b);raise exception 'FAIL: concurrent business affiliation';exception when object_not_in_prerequisite_state then null;end;
    begin perform public.submit_invited_driver_application(invitation_b,'Conductor A','12345678-5','912345678',false);
      raise exception 'FAIL: unaccepted business application';exception when insufficient_privilege then null;end;
    begin perform public.submit_invited_driver_application(invitation,'Conductor A','12345678-4','912345678',false);
      raise exception 'FAIL: invalid RUT';exception when invalid_parameter_value then null;end;
    perform public.submit_invited_driver_application(invitation,'Conductor A','12.345.678-5','9 1234 5678',false);
    select requested_at into first_request from public.driver_applications where driver_id=person;
    perform public.submit_invited_driver_application(invitation,'Conductor A','12345678-5','912345678',false);
    if (select requested_at from public.driver_applications where driver_id=person)<>first_request then raise exception 'FAIL: submit retry changed version';end if;
    begin update public.drivers set is_verified=true where id=person;raise exception 'FAIL: self-approval';exception when insufficient_privilege then null;end;
    execute 'reset role';
    if (select role from public.profiles where id=person)<>'customer' or (select is_verified from public.drivers where id=person)
      or not exists(select 1 from public.driver_affiliation_confirmations where driver_id=person and application_requested_at=first_request and confirmed_by=owner_a)
      or (select count(*) from private.driver_invitation_events where invitation_id=invitation and event='accepted')<>1 then
      raise exception 'FAIL: consent, audit or premature driver approval';end if;
    perform private.review_driver_application(person,'rejected',null,'Corregir antecedentes','test');
    perform set_config('request.jwt.claims',json_build_object('sub',person)::text,true);execute 'set local role authenticated';
    begin perform public.submit_invited_driver_application(invitation,'Conductor A','12345678-5','912345678',true);
      raise exception 'FAIL: rejected driver reused old invitation';exception when object_not_in_prerequisite_state then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',manager)::text,true);
    replacement:=(public.create_driver_invitations(business_a,entries,false)->0->>'id')::uuid;
    if replacement=invitation then raise exception 'FAIL: replacement invitation';end if;
    perform set_config('request.jwt.claims',json_build_object('sub',person)::text,true);
    perform public.accept_driver_invitation(replacement);
    perform public.submit_invited_driver_application(replacement,'Conductor A','12345678-5','912345678',true);
    perform public.submit_invited_driver_application(replacement,'Conductor A','12345678-5','912345678',true);
    execute 'reset role';
    perform private.review_driver_application(person,'approved',business_a,'Revisión de prueba','test');
    if not exists(select 1 from private.driver_application_reviews where driver_id=person and decision='approved'
      and application_snapshot->'business_invitation'->>'id'=replacement::text
      and application_snapshot->'business_invitation'->>'invited_by'=manager::text) then
      raise exception 'FAIL: missing invitation in approval audit';end if;

    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);execute 'set local role authenticated';
    payload:=public.list_driver_team(business_a,0,'');
    if not exists(select 1 from jsonb_array_elements(payload->'items') item where item->>'invitation_id'=replacement::text and item->>'activation_status'='enabled')
      or exists(select 1 from jsonb_array_elements(payload->'items') item where item ? 'rut' or item ? 'phone' or item ? 'applicant_rut' or item ? 'token_hash') then
      raise exception 'FAIL: team state/privacy';end if;
    cancelled:=(public.create_driver_invitations(business_a,'[{"name":"Cancelado","email":"cancelled@example.com"}]',false)->0->>'id')::uuid;
    perform public.cancel_driver_invitation(cancelled);perform public.cancel_driver_invitation(cancelled);
    expired:=(public.create_driver_invitations(business_a,jsonb_build_array(jsonb_build_object('name','Invitación vencida','email',recipient||'.expired')),false)->0->>'id')::uuid;
    execute 'reset role';
    update private.driver_invitations set expires_at=clock_timestamp()-interval '1 second' where id=expired;
    update auth.users set email=recipient||'.expired' where id=outsider;
    perform set_config('request.jwt.claims',json_build_object('sub',outsider)::text,true);execute 'set local role authenticated';
    begin perform public.accept_driver_invitation(expired);raise exception 'FAIL: expired accepted';exception when sqlstate 'GW005' then null;end;
    execute 'reset role';
    update auth.users set email='cancelled@example.com' where id=outsider;
    execute 'set local role authenticated';
    begin perform public.accept_driver_invitation(cancelled);raise exception 'FAIL: cancelled accepted';exception when sqlstate 'GW005' then null;end;
    execute 'reset role';
    update public.drivers set is_verified=false where id=person;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);execute 'set local role authenticated';
    if not exists(select 1 from jsonb_array_elements(public.list_driver_team(business_a,0,'')->'items') item where item->>'invitation_id'=replacement::text and item->>'activation_status'='suspended') then
      raise exception 'FAIL: suspension state';end if;
    select jsonb_agg(jsonb_build_object('name','Conductor '||n,'email','bulk-'||n||'@example.com')) into entries from generate_series(1,50) n;
    payload:=public.create_driver_invitations(business_a,entries,false);
    if jsonb_array_length(payload)<>50 or (public.list_driver_team(business_a,0,'bulk-')->>'has_more')::boolean is distinct from true
      or jsonb_array_length(public.list_driver_team(business_a,40,'bulk-')->'items')<>10 then
      raise exception 'FAIL: bulk/pagination/search';end if;
    execute 'reset role';
    delete from public.distributor_members where user_id=manager;
    perform set_config('request.jwt.claims',json_build_object('sub',manager)::text,true);execute 'set local role authenticated';
    begin perform public.create_driver_invitations(business_a,entries,false);raise exception 'FAIL: revoked member invites';exception when insufficient_privilege then null;end;
    execute 'reset role';
    update public.distributors set is_verified=false where id=business_a;
    execute 'set local role authenticated';perform set_config('request.jwt.claims',json_build_object('sub',owner_a)::text,true);
    begin perform public.create_driver_invitations(business_a,entries,false);raise exception 'FAIL: disabled business invites';exception when insufficient_privilege then null;end;
    execute 'reset role';
    if (select count(*) from auth.users)<>auth_before+6 then raise exception 'FAIL: invitation created an Auth account';end if;
    raise exception using errcode='P0002',message='rollback invitation fixtures';
  exception when sqlstate 'P0002' then null;
  end;
  if (select count(*) from public.distributors)<>count_before or (select count(*) from auth.users)<>auth_before then
    raise exception 'FAIL: fixtures were not reverted';end if;
end;
$$;
select 'PASS invitation ownership, verified identity, expiry, cancellation, bulk, idempotence, privacy, reviews and audit; fixtures reverted' as result;
