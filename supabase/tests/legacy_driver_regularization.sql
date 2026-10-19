-- Compose with scripts/build-legacy-regularization-test.cjs, then execute as postgres.
-- The composer supplies the actual admin block and wraps everything in rollback.
do $$
declare
  owner_id uuid:=gen_random_uuid(); target_id uuid:=gen_random_uuid(); business_id uuid:=gen_random_uuid();
  recipient text:=target_id::text||'@example.com'; invitation_id uuid; repair_sql text; before_request timestamptz;
begin
  repair_sql:=replace(current_setting('gasway.test_regularization_sql'),
    'a162a099-70dc-4e89-a4b8-8f9f872aa835',target_id::text);
  insert into auth.users(id,email,email_confirmed_at) values(owner_id,owner_id::text||'@example.com',now()),(target_id,recipient,now());
  insert into public.drivers(id,is_verified) values(target_id,true);
  update public.profiles set role='driver' where id=target_id;
  insert into public.driver_applications(driver_id,status) values(target_id,'approved') returning requested_at into before_request;
  insert into public.distributors(id,name,is_verified,is_demo) values(business_id,'Regularización ficticia',true,true);
  insert into public.distributor_members values(business_id,owner_id,'owner');
  insert into public.distributor_brands values(business_id,'Lipigas');
  begin execute repair_sql;raise exception 'FAIL: invitation required';exception when sqlstate '55000' then null;end;
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id)::text,true);
  execute 'set local role authenticated';
  invitation_id:=(public.create_driver_invitations(business_id,jsonb_build_array(jsonb_build_object('name','Conductor ficticio','email',recipient)),false)->0->>'id')::uuid;
  begin execute repair_sql;raise exception 'FAIL: client can repair';exception when insufficient_privilege then null;end;
  execute 'reset role';
  foreach recipient in array array['anon','authenticated','service_role'] loop
    if has_table_privilege(recipient,'private.legacy_driver_regularizations','select,insert,update,delete') then raise exception 'FAIL: audit exposed';end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid='private.legacy_driver_regularizations'::regclass) then raise exception 'FAIL: audit RLS';end if;
  update public.drivers set distributor_id=business_id where id=target_id;
  begin execute repair_sql;raise exception 'FAIL: existing affiliation';exception when sqlstate '55000' then null;end;
  update public.drivers set distributor_id=null where id=target_id;
  execute repair_sql;
  execute repair_sql;
  if (select count(*) from private.legacy_driver_regularizations where driver_id=target_id)<>1
    or (select previous_application->>'status' from private.legacy_driver_regularizations where driver_id=target_id)<>'approved'
    or not (select previous_verified from private.legacy_driver_regularizations where driver_id=target_id)
    or (select role from public.profiles where id=target_id)<>'customer'
    or (select is_verified or is_available from public.drivers where id=target_id)
    or (select status from public.driver_applications where driver_id=target_id)<>'pending'
    or (select requested_at from public.driver_applications where driver_id=target_id)<=before_request
    or (select status from private.driver_invitations where id=invitation_id)<>'pending'
    or not exists(select 1 from auth.users where id=target_id) then raise exception 'FAIL: repair, consent, identity or audit';end if;
  -- Preparation alone cannot approve: no details, acceptance or affiliation confirmation.
  begin perform private.review_driver_application(target_id,'approved',business_id,'Ficticio','test');raise exception 'FAIL: premature approval';exception when sqlstate '55000' then null;end;
  perform set_config('request.jwt.claims',json_build_object('sub',target_id)::text,true);
  execute 'set local role authenticated';
  perform public.accept_driver_invitation(invitation_id);
  perform public.accept_driver_invitation(invitation_id);
  perform public.submit_invited_driver_application(invitation_id,'Conductor ficticio','12345678-5','912345678',false);
  execute 'reset role';
  execute repair_sql;
  if (select a.invitation_id from public.driver_applications a where driver_id=target_id) is distinct from invitation_id then raise exception 'FAIL: retry erased consent';end if;
  -- A rejected review and subsequent approval both leave the repair snapshot intact.
  begin
    perform private.review_driver_application(target_id,'rejected',null,'Antecedentes ficticios insuficientes','test');
    if (select status from public.driver_applications where driver_id=target_id)<>'rejected' then raise exception 'FAIL: rejection';end if;
    raise exception using errcode='P0002',message='undo rejection scenario';
  exception when sqlstate 'P0002' then null;end;
  perform private.review_driver_application(target_id,'approved',business_id,'Revisión ficticia','test');
  execute repair_sql;
  if (select distributor_id from public.drivers where id=target_id) is distinct from business_id
    or not (select is_verified from public.drivers where id=target_id)
    or (select status from public.driver_applications where driver_id=target_id)<>'approved'
    or (select count(*) from private.driver_application_reviews where driver_id=target_id)<>1 then raise exception 'FAIL: final approval and replay';end if;
end;
$$;
