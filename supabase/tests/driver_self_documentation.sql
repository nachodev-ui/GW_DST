-- Personal upload/read boundaries and business follow-up; all fixtures roll back.
do $$
declare
  business uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid();
  driver uuid:=gen_random_uuid(); other_driver uuid:=gen_random_uuid();
  front uuid; back uuid; object_path text; front_path text; actor uuid;
  today date:=(now() at time zone 'America/Santiago')::date;
begin
  begin
    insert into auth.users(id) values(member),(reviewer),(driver),(other_driver);
    insert into public.distributors(id,name,is_verified,is_demo) values(business,'Self documentation test',true,true);
    insert into public.distributor_members(distributor_id,user_id,role) values(business,member,'owner');
    insert into private.document_admins(user_id) values(reviewer);
    insert into public.drivers(id,is_verified,is_available,distributor_id) values(driver,false,false,business),(other_driver,false,false,business);
    insert into public.driver_applications(driver_id,status,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
      values(driver,'pending','Self documentation','12345678-5','+56912345678',business,'Self documentation test');
    front_path:=business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf';
    object_path:=business::text||'/driver/'||other_driver::text||'/'||gen_random_uuid()::text||'.pdf';

    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.get_owner_documents('driver',driver);
    perform public.set_driver_document_details(driver,'12.345.678-5','A4');
    if not private.document_storage_access('documents',front_path,true) then raise exception 'FAIL: own upload denied before approval'; end if;
    if private.document_storage_access('documents',object_path,true) then raise exception 'FAIL: another driver upload allowed'; end if;
    begin perform public.get_owner_documents('driver',other_driver); raise exception 'FAIL: colleague documents exposed'; exception when insufficient_privilege then null; end;
    begin perform public.set_driver_document_details(other_driver,'12345678-5','A4'); raise exception 'FAIL: colleague details editable'; exception when insufficient_privilege then null; end;
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',front_path,driver::text,'{"mimetype":"application/pdf","size":100}');
    front:=public.submit_document('driver',driver,'driver_license_front',front_path,null);
    if public.submit_document('driver',driver,'driver_license_front',front_path,null)<>front then raise exception 'FAIL: non-idempotent personal submit'; end if;
    if not exists(select 1 from public.documents where id=front and submitted_by=driver and status='pending') then raise exception 'FAIL: own pending read/audit'; end if;
    begin perform public.review_document(front,'approved',null,null); raise exception 'FAIL: driver approval'; exception when insufficient_privilege then null; end;
    execute 'reset role';

    -- Membership does not confer ownership of a driver's personal data.
    foreach actor in array array[member,other_driver] loop
      perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
      execute 'set local role authenticated';
      if private.document_storage_access('documents',front_path,true) then raise exception 'FAIL: non-owner upload'; end if;
      begin perform public.set_driver_document_details(driver,'12345678-5','B'); raise exception 'FAIL: non-owner identity edit'; exception when insufficient_privilege then null; end;
      begin perform public.submit_document('driver',driver,'driver_license_front',front_path,null); raise exception 'FAIL: non-owner submit'; exception when insufficient_privilege then null; end;
      if actor=member then
        perform public.get_owner_documents('driver',driver);
        if not exists(select 1 from storage.objects where bucket_id='documents' and name=front_path) then raise exception 'FAIL: business read lost'; end if;
      elsif exists(select 1 from public.documents where id=front) then raise exception 'FAIL: colleague RLS read'; end if;
      execute 'reset role';
    end loop;

    -- Even a separately provisioned reviewer cannot approve their own upload.
    insert into private.document_admins(user_id) values(driver);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.review_document(front,'approved',null,null); raise exception 'FAIL: self review'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    delete from private.document_admins where user_id=driver;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.review_document(front,'approved',null,null);
    execute 'reset role';

    object_path:=business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.set_driver_document_details(driver,'11111111-1','A4'); raise exception 'FAIL: reviewed RUT mutable'; exception when invalid_parameter_value then null; end;
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',object_path,driver::text,'{"mimetype":"application/pdf","size":100}');
    back:=public.submit_document('driver',driver,'driver_license_back',object_path,today+30);
    if public.is_driver_eligible(driver) then raise exception 'FAIL: pending back eligible'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.review_document(back,'approved',null,today+30);
    execute 'reset role';
    if not private.is_driver_eligible(driver) then raise exception 'FAIL: reviewed own license not recognized'; end if;
    if exists(select 1 from public.drivers where id=driver and (is_verified or is_available)) then raise exception 'FAIL: documents auto-enabled driver'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.set_driver_document_details(driver,'12345678-5','B');
    if public.is_driver_eligible(driver) then raise exception 'FAIL: old class reused'; end if;
    execute 'reset role';
    raise exception using errcode='ZD002',message='Rollback self-documentation fixtures';
  exception when sqlstate 'ZD002' then raise notice 'PASS: driver ownership, business read-only, separate review, class/identity/eligibility (fixtures reverted)';
  end;
end; $$;
