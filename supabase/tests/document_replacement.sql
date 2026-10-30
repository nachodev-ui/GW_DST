do $$
declare
  business uuid:=gen_random_uuid(); driver uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid();
  vehicle uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); test_plate text;
  fronts uuid[]:=array[]::uuid[]; backs uuid[]:=array[]::uuid[];
  path text; original_path text; doc uuid; attempt integer; decision text; payload jsonb;
  today date:=(now() at time zone 'America/Santiago')::date;
begin
  begin
    insert into auth.users(id) values(driver),(reviewer),(member);
    insert into public.distributors(id,name,is_verified,is_demo) values(business,'Replacement regression',true,true);
    insert into public.distributor_members(distributor_id,user_id,role) values(business,member,'owner');
    insert into private.document_admins(user_id) values(reviewer);
    insert into public.drivers(id,is_verified,is_available,distributor_id,license_class) values(driver,true,false,business,'A4');
    insert into public.driver_applications(driver_id,status,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
      values(driver,'approved','Replacement regression','12345678-5','+56912345678',business,'Replacement regression');
    for attempt in 1..5 loop
      path:=business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf';
      if attempt=1 then original_path:=path; end if;
      perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
      execute 'set local role authenticated';
      insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',path,driver::text,'{"mimetype":"application/pdf","size":100}');
      doc:=public.submit_document('driver',driver,case when attempt in (1,3,5) then 'driver_license_front' else 'driver_license_back' end,path,case when attempt in (2,4) then today+30 end);
      if attempt in (1,3,5) then fronts:=array_append(fronts,doc); else backs:=array_append(backs,doc); end if;
      execute 'reset role';
    end loop;
    if (select count(*) from public.documents where driver_id=driver and status='pending')<>2
      or (select count(*) from public.documents where driver_id=driver and status='replaced')<>3
      or exists(select 1 from public.documents where driver_id=driver and status='replaced' and (reviewed_by is not null or reviewed_at is not null)) then
      raise exception 'FAIL: five attempts did not retain two pending plus three unreviewed historical versions'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if public.submit_document('driver',driver,'driver_license_front',original_path,null)<>fronts[1] then raise exception 'FAIL: original retry identity changed'; end if;
    execute 'reset role';
    if (select status from public.documents where id=fronts[1])<>'replaced' then raise exception 'FAIL: retry resurrected replaced upload'; end if;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    payload:=public.list_pending_documents(null,null);
    if not exists(select 1 from jsonb_array_elements(payload->'businesses') entry where entry->>'id'=business::text and (entry->>'pending')::int=2) then raise exception 'FAIL: admin pending summary'; end if;
    foreach decision in array array['approved','rejected'] loop
      begin
        perform public.review_document(fronts[1],decision,case when decision='rejected' then 'Old attempt' end,null);
        raise exception 'FAIL: stale selected version review succeeded';
      exception when object_not_in_prerequisite_state then null; end;
    end loop;
    perform public.review_document(fronts[3],'approved',null,null);
    perform public.review_document(backs[2],'approved',null,today+30);
    execute 'reset role';
    if not private.is_driver_eligible(driver) then raise exception 'FAIL: current approvals not eligible'; end if;

    -- An unsuccessful replacement and a rejected newer version preserve valid approval.
    path:=business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',path,driver::text,'{"mimetype":"application/pdf","size":100}');
    doc:=public.submit_document('driver',driver,'driver_license_back',path,today+40);
    path:=business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',path,driver::text,'{"mimetype":"application/pdf","size":100}');
    begin perform public.submit_document('driver',driver,'driver_license_back',path,null); raise exception 'FAIL: invalid expiry accepted'; exception when check_violation then null; end;
    execute 'reset role';
    if (select status from public.documents where id=doc)<>'pending' then raise exception 'FAIL: failed replacement discarded current pending'; end if;
    if not private.is_driver_eligible(driver) then raise exception 'FAIL: pending replacement removed approval'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.review_document(doc,'rejected','Illegible',today+40);
    execute 'reset role';
    if not private.is_driver_eligible(driver) then raise exception 'FAIL: rejected replacement removed approval'; end if;

    -- The same rule applies independently to vehicle document types.
    select 'ZX'||lpad(n::text,4,'0') into test_plate from generate_series(1,9999) n
      where not exists(select 1 from public.distributor_vehicles where plate='ZX'||lpad(n::text,4,'0')) limit 1;
    insert into public.distributor_vehicles(id,distributor_id,plate,label,status,revision,make,model,year,type)
      values(vehicle,business,test_plate,'Replacement regression','inactive',1,'Demo','Demo',2026,'truck');
    for attempt in 1..2 loop
      path:=business::text||'/vehicle/'||vehicle::text||'/'||gen_random_uuid()::text||'.pdf';
      perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
      execute 'set local role authenticated';
      insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',path,member::text,'{"mimetype":"application/pdf","size":100}');
      perform public.submit_document('vehicle',vehicle,'vehicle_registration',path,null);
      execute 'reset role';
    end loop;
    if (select count(*) from public.documents where vehicle_id=vehicle and status='pending')<>1
      or (select count(*) from public.documents where vehicle_id=vehicle and status='replaced')<>1 then raise exception 'FAIL: vehicle replacements not scoped'; end if;
    raise exception using errcode='ZD003',message='Rollback replacement fixtures';
  exception when sqlstate 'ZD003' then raise notice 'PASS: replacement isolation, current queue, retry, stale review, failed upload and approved-version preservation (fixtures reverted)';
  end;
end; $$;
