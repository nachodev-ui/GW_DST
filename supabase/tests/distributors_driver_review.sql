-- Historical open-enrolment suite for its original migration. Since 20261019004638,
-- those RPC grants are retired; use business_driver_invitations.sql on the current schema.
-- Run the entire DO as postgres after 20261018195303. Fixtures roll back.
do $$
declare
  applicant uuid := gen_random_uuid();
  rejected_user uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  organization uuid := gen_random_uuid();
  unverified uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id) values (applicant), (rejected_user), (outsider);
    insert into public.distributors (id, name, is_verified) values
      (organization, 'Distribuidor de prueba', true), (unverified, 'Sin verificar', false);
    insert into public.distributor_members values (organization, applicant, 'owner');

    if has_function_privilege('authenticated',
      'private.review_driver_application(uuid,text,uuid,text,text)', 'EXECUTE')
      or has_function_privilege('service_role',
        'private.review_driver_application(uuid,text,uuid,text,text)', 'EXECUTE')
      or has_table_privilege('authenticated', 'public.distributors', 'INSERT')
      or has_table_privilege('authenticated', 'public.distributor_members', 'UPDATE')
      or has_table_privilege('authenticated', 'private.driver_application_reviews', 'SELECT') then
      raise exception 'FAIL: excessive administrative privileges';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', applicant)::text, true);
    execute 'set local role authenticated';
    perform public.request_driver_access();
    perform public.request_driver_access();
    if (select count(*) from public.driver_applications) <> 1
      or (select status from public.driver_applications) <> 'pending'
      or (select count(*) from public.distributors) <> 1 then
      raise exception 'FAIL: request idempotence or affiliated organization RLS';
    end if;
    begin
      update public.driver_applications set status = 'approved' where driver_id = applicant;
      raise exception 'FAIL: applicant changed application';
    exception when insufficient_privilege then null; end;
    begin
      insert into public.distributor_members values (unverified, applicant, 'owner');
      raise exception 'FAIL: applicant granted organization membership';
    exception when insufficient_privilege then null; end;
    begin
      perform private.review_driver_application(applicant, 'approved', organization, 'Prueba', 'test');
      raise exception 'FAIL: applicant reviewed application';
    exception when insufficient_privilege then null; end;
    perform set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
    if exists (select 1 from public.driver_applications)
      or exists (select 1 from public.distributor_members)
      or exists (select 1 from public.distributors) then
      raise exception 'FAIL: outsider reads organization or application';
    end if;
    execute 'reset role';
    -- Latest onboarding requires complete self-reported details for approvals.
    update public.driver_applications set applicant_name='Postulante de prueba',applicant_rut='12345678-5',
      applicant_phone='+56912345678',requested_distributor_id=organization,
      requested_distributor_name='Distribuidor de prueba' where driver_id=applicant;
    begin
      perform private.review_driver_application(applicant, 'approved', null, 'Prueba', 'test');
      raise exception 'FAIL: approval without distributor';
    exception when invalid_parameter_value then null; end;
    begin
      perform private.review_driver_application(applicant, 'approved', unverified, 'Prueba', 'test');
      raise exception 'FAIL: approval with unverified distributor';
    exception when sqlstate '55000' then null; end;
    begin
      perform private.review_driver_application(applicant, 'rejected', null, ' ', 'test');
      raise exception 'FAIL: empty reason';
    exception when invalid_parameter_value then null; end;
    if (select is_verified from public.drivers where id = applicant)
      or exists (select 1 from private.driver_application_reviews where driver_id = applicant) then
      raise exception 'FAIL: failed review changed access/audit';
    end if;

    insert into public.driver_affiliation_confirmations(driver_id,application_requested_at,distributor_id,confirmed_by)
      select applicant,requested_at,organization,applicant from public.driver_applications where driver_id=applicant;
    perform private.review_driver_application(applicant, 'approved', organization, 'Verificación de prueba', 'test-operator');
    if not exists (select 1 from public.drivers d join public.profiles p on p.id = d.id
      where d.id = applicant and d.is_verified and not d.is_available
        and d.distributor_id = organization and p.role = 'driver') then
      raise exception 'FAIL: approval did not atomically provision access';
    end if;
    delete from public.distributor_members where user_id = applicant;
    perform set_config('request.jwt.claims', json_build_object('sub', applicant)::text, true);
    execute 'set local role authenticated';
    perform public.request_driver_access();
    if (select count(*) from public.distributors) <> 1
      or (select status from public.driver_applications) <> 'approved' then
      raise exception 'FAIL: driver affiliation RLS or retry reset approval';
    end if;
    execute 'reset role';
    begin
      perform private.review_driver_application(applicant, 'rejected', null, 'Segundo intento', 'test');
      raise exception 'FAIL: repeated review changed approved application';
    exception when sqlstate '55000' then null; end;

    perform set_config('request.jwt.claims', json_build_object('sub', rejected_user)::text, true);
    execute 'set local role authenticated';
    perform public.request_driver_access();
    execute 'reset role';
    perform private.review_driver_application(rejected_user, 'rejected', null, 'Antecedentes incompletos', 'test-operator');
    execute 'set local role authenticated';
    perform public.request_driver_access();
    if (select status from public.driver_applications) <> 'rejected'
      or (select decision_reason from public.driver_applications) <> 'Antecedentes incompletos'
      or (select is_verified or is_available from public.drivers where id = rejected_user) then
      raise exception 'FAIL: retry reset rejection or granted access';
    end if;
    execute 'reset role';
    if (select count(*) from private.driver_application_reviews
        where driver_id in (applicant, rejected_user)) <> 2
      or exists (select 1 from public.driver_applications
        where driver_id in (applicant, rejected_user) and reviewed_at is null)
      or (select role from public.profiles where id = rejected_user) <> 'customer' then
      raise exception 'FAIL: missing audit/review time or rejection changed role';
    end if;

    -- Generic privilege checks cover all writes, for both client roles.
    if exists (
      select 1 from (values ('anon'), ('authenticated')) roles(name)
      cross join (values ('public.distributors'), ('public.distributor_members'),
        ('public.driver_applications')) tables(name)
      cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) actions(name)
      where has_table_privilege(roles.name, tables.name, actions.name)
    ) or has_table_privilege('anon', 'public.driver_applications', 'SELECT') then
      raise exception 'FAIL: client write or anonymous read grant';
    end if;
    raise exception 'distributor_review_rollback' using errcode = 'P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm <> 'distributor_review_rollback' then raise; end if;
  end;
  raise notice 'PASS: organizations, request/review, affiliation, RLS, grants and audit; fixtures rolled back';
end;
$$;
