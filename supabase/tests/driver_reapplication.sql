-- Historical open-enrolment suite for its original migration. Since 20261019004638,
-- those RPC grants are retired; use business_driver_invitations.sql on the current schema.
-- Run the complete DO as postgres after 20261018205226. Fixtures roll back.
do $$
declare
  applicant uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  organization uuid := gen_random_uuid();
  original_review jsonb;
  reapplied_at timestamptz;
begin
  begin
    insert into auth.users (id) values (applicant), (outsider);
    insert into public.distributors (id, name, is_verified)
      values (organization, 'Distribuidor de prueba de postulación', true);

    if has_function_privilege('anon', 'public.reapply_driver_access()', 'EXECUTE')
      or has_function_privilege('service_role', 'private.reapply_driver_access()', 'EXECUTE')
      or has_table_privilege('authenticated', 'public.driver_applications', 'UPDATE') then
      raise exception 'FAIL: excessive reapplication privileges';
    end if;
    perform set_config('request.jwt.claims', '{}', true);
    execute 'set local role authenticated';
    begin
      perform public.reapply_driver_access();
      raise exception 'FAIL: missing identity accepted';
    exception when insufficient_privilege then null; end;
    perform set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
    begin
      perform public.reapply_driver_access();
      raise exception 'FAIL: missing application accepted';
    exception when sqlstate '55000' then null; end;

    perform set_config('request.jwt.claims', json_build_object('sub', applicant)::text, true);
    perform public.request_driver_access();
    execute 'reset role';
    perform private.review_driver_application(applicant, 'rejected', null,
      'Antecedentes incompletos', 'test-operator');
    select to_jsonb(r) into original_review from private.driver_application_reviews r
      where driver_id = applicant;
    execute 'set local role authenticated';
    -- Normal request retries must not reopen a rejection.
    perform public.request_driver_access();
    if (select status from public.driver_applications where driver_id = applicant) <> 'rejected' then
      raise exception 'FAIL: normal request reset rejection';
    end if;
    perform public.reapply_driver_access();
    select requested_at into reapplied_at from public.driver_applications where driver_id = applicant;
    if not exists (select 1 from public.driver_applications where driver_id = applicant
      and status = 'pending' and decision_reason is null and reviewed_at is null)
      or not exists (select 1 from public.drivers d join public.profiles p on p.id = d.id
        where d.id = applicant and not d.is_verified and not d.is_available
          and d.distributor_id is null and p.role = 'customer') then
      raise exception 'FAIL: reapplication state or unauthorized access change';
    end if;
    perform public.reapply_driver_access();
    if (select requested_at from public.driver_applications where driver_id = applicant) <> reapplied_at then
      raise exception 'FAIL: retry changed pending request time';
    end if;
    begin
      update public.driver_applications set status = 'approved' where driver_id = applicant;
      raise exception 'FAIL: applicant self-approved';
    exception when insufficient_privilege then null; end;
    begin
      perform 1 from private.driver_application_reviews;
      raise exception 'FAIL: applicant reads private audit';
    exception when insufficient_privilege then null; end;

    perform set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
    if exists (select 1 from public.driver_applications) then
      raise exception 'FAIL: outsider reads application';
    end if;
    begin
      perform public.reapply_driver_access();
      raise exception 'FAIL: outsider changed another application';
    exception when sqlstate '55000' then null; end;
    execute 'reset role';
    if (select to_jsonb(r) from private.driver_application_reviews r where driver_id = applicant)
      is distinct from original_review then
      raise exception 'FAIL: prior review changed';
    end if;
    -- A new review appends a decision; it does not overwrite the earlier review.
    perform private.review_driver_application(applicant, 'rejected', null,
      'Segunda revisión', 'second-test-operator');
    if (select count(*) from private.driver_application_reviews where driver_id = applicant) <> 2 then
      raise exception 'FAIL: subsequent review lost history';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', applicant)::text, true);
    execute 'set local role authenticated';
    perform public.reapply_driver_access();
    execute 'reset role';
    update public.driver_applications set applicant_name='Postulante de prueba',applicant_rut='12345678-5',
      applicant_phone='+56912345678',requested_distributor_id=organization,
      requested_distributor_name='Distribuidor de prueba de postulación' where driver_id=applicant;
    insert into public.driver_affiliation_confirmations(driver_id,application_requested_at,distributor_id,confirmed_by)
      select applicant,requested_at,organization,applicant from public.driver_applications where driver_id=applicant;
    perform private.review_driver_application(applicant, 'approved', organization,
      'Antecedentes revisados', 'third-test-operator');
    execute 'set local role authenticated';
    begin
      perform public.reapply_driver_access();
      raise exception 'FAIL: approved driver reopened application';
    exception when sqlstate '55000' then null; end;
    if not exists (select 1 from public.driver_applications where driver_id = applicant and status = 'approved')
      or not (select is_verified from public.drivers where id = applicant) then
      raise exception 'FAIL: failed retry changed approval';
    end if;
    execute 'reset role';
    if not exists (select 1 from private.driver_application_reviews r
      where driver_id = applicant and to_jsonb(r) = original_review)
      or (select count(*) from private.driver_application_reviews where driver_id = applicant) <> 3 then
      raise exception 'FAIL: final audit history';
    end if;
    raise exception 'driver_reapplication_rollback' using errcode = 'P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm <> 'driver_reapplication_rollback' then raise; end if;
  end;
  raise notice 'PASS: explicit retry, identity, grants, RLS, idempotence and immutable review history; fixtures rolled back';
end;
$$;
