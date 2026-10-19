-- Historical open-enrolment suite for its original migration. Since 20261019004638,
-- those RPC grants are retired; use business_driver_invitations.sql on the current schema.
-- Run the entire DO as postgres after 20261018211559. All fixtures roll back.
do $$
declare
  applicant uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  organization uuid := gen_random_uuid(); hidden uuid := gen_random_uuid();
  original_time timestamptz; original_review jsonb;
begin
  begin
    insert into auth.users(id) values(applicant),(outsider);
    insert into public.distributors(id,name,is_verified,accepts_driver_applications)
      values(organization,'Negocio de prueba',true,true),(hidden,'Negocio privado',true,false);
    if not private.is_valid_rut('12345678-5') or not private.is_valid_rut('6000000-K')
      or not private.is_valid_rut('10000004-0') or private.is_valid_rut('12345678-9')
      or private.is_valid_rut('00000000-0') then raise exception 'FAIL: SQL RUT checksum'; end if;
    if has_function_privilege('anon','public.list_application_distributors()','EXECUTE')
      or has_function_privilege('anon','public.submit_driver_application(text,text,text,uuid,boolean)','EXECUTE')
      or has_table_privilege('authenticated','public.driver_applications','UPDATE') then
      raise exception 'FAIL: excessive grants';
    end if;
    perform set_config('request.jwt.claims','{}',true);
    execute 'set local role authenticated';
    begin
      perform public.list_application_distributors();raise exception 'FAIL: anonymous directory';
    exception when insufficient_privilege then null;end;
    begin
      perform public.submit_driver_application('Postulante','12345678-5','912345678',organization,false);
      raise exception 'FAIL: anonymous submission';
    exception when insufficient_privilege then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    if not exists(select 1 from jsonb_array_elements(public.list_application_distributors()) item where item->>'id'=organization::text)
      or exists(select 1 from jsonb_array_elements(public.list_application_distributors()) item
        where item->>'id'=hidden::text or item ? 'is_verified') then
      raise exception 'FAIL: opt-in directory or projection';
    end if;
    if exists(select 1 from public.distributors) then raise exception 'FAIL: full organization leaked';end if;
    begin
      perform public.submit_driver_application('Postulante','12345678-5','912345678',organization,true);
      raise exception 'FAIL: missing application reopened';
    exception when sqlstate '55000' then null;end;
    if exists(select 1 from public.drivers where id=applicant) then raise exception 'FAIL: failed submission persisted driver';end if;
    begin
      perform public.submit_driver_application('Postulante','12345678-9','912345678',organization,false);
      raise exception 'FAIL: invalid RUT';
    exception when invalid_parameter_value then null;end;
    begin
      perform public.submit_driver_application('Postulante','12345678-5','123',organization,false);
      raise exception 'FAIL: invalid phone';
    exception when invalid_parameter_value then null;end;
    begin
      perform public.submit_driver_application('Postulante','12345678-5','912345678',hidden,false);
      raise exception 'FAIL: non-opt-in distributor';
    exception when sqlstate 'GW003' then null;end;
    perform public.request_driver_access(); -- Legacy pending can complete its form.
    perform public.submit_driver_application(' Postulante ','12.345.678-5','9 1234 5678',organization,false);
    if not exists(select 1 from public.driver_applications where driver_id=applicant and status='pending'
      and applicant_name='Postulante' and applicant_rut='12345678-5' and applicant_phone='+56912345678'
      and requested_distributor_id=organization and requested_distributor_name='Negocio de prueba')
      or (select is_verified or is_available from public.drivers where id=applicant)
      or (select role from public.profiles where id=applicant)<>'customer' then
      raise exception 'FAIL: normalized details or self-approval';
    end if;
    select requested_at into original_time from public.driver_applications where driver_id=applicant;
    perform public.submit_driver_application('Postulante','12345678-5','+56912345678',organization,false);
    if (select requested_at from public.driver_applications where driver_id=applicant)<>original_time then
      raise exception 'FAIL: retry changed request time';end if;
    begin
      perform public.submit_driver_application('Otro nombre','12345678-5','912345678',organization,false);
      raise exception 'FAIL: pending application mutated';
    exception when sqlstate '55000' then null;end;
    perform set_config('request.jwt.claims',json_build_object('sub',outsider)::text,true);
    if exists(select 1 from public.driver_applications) then raise exception 'FAIL: applicant PII leaked';end if;
    perform public.request_driver_access();
    execute 'reset role';
    begin
      perform private.review_driver_application(outsider,'approved',organization,'Prueba','test');
      raise exception 'FAIL: incomplete legacy application approved';
    exception when sqlstate '55000' then null;end;
    begin
      perform private.review_driver_application(applicant,'approved',hidden,'Prueba','test');
      raise exception 'FAIL: approved another distributor';
    exception when sqlstate '55000' then null;end;
    if (select is_verified from public.drivers where id=applicant) then raise exception 'FAIL: failed review changed driver';end if;
    perform private.review_driver_application(applicant,'rejected',null,'Revisar contacto','test');
    select application_snapshot into original_review from private.driver_application_reviews where driver_id=applicant;
    if original_review->>'rut' is distinct from '12345678-5'
      or original_review->>'distributor_id' is distinct from organization::text then
      raise exception 'FAIL: review snapshot';end if;
    perform set_config('request.jwt.claims',json_build_object('sub',applicant)::text,true);
    execute 'set local role authenticated';
    begin
      perform public.submit_driver_application('Postulante','12345678-5','912345678',organization,false);
      raise exception 'FAIL: rejection reopened without explicit retry';
    exception when sqlstate '55000' then null;end;
    perform public.submit_driver_application('Postulante','6000000-k','923456789',organization,true);
    execute 'reset role';
    if (select application_snapshot from private.driver_application_reviews where driver_id=applicant) is distinct from original_review then
      raise exception 'FAIL: old personal details overwritten';end if;
    insert into public.driver_affiliation_confirmations(driver_id,application_requested_at,distributor_id,confirmed_by)
      select applicant,requested_at,organization,outsider from public.driver_applications where driver_id=applicant;
    perform private.review_driver_application(applicant,'approved',organization,'Antecedentes revisados','test');
    if (select count(*) from private.driver_application_reviews where driver_id=applicant)<>2
      or not exists(select 1 from public.drivers where id=applicant and is_verified and distributor_id=organization) then
      raise exception 'FAIL: final approval/audit';end if;
    raise exception 'application_details_rollback' using errcode='P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm<>'application_details_rollback' then raise;end if;
  end;
  raise notice 'PASS: details, RUT, phone, directory, RLS, review match, retry and snapshots; fixtures rolled back';
end;
$$;
