-- Synthetic prerequisites for pre-existing non-documentary suites. Transaction-local,
-- postgres only; no mobile grants and no real files. Never installed by a migration.
create function private.seed_test_document_fixture(p_driver uuid,p_available boolean default true,p_vehicle uuid default gen_random_uuid()) returns void
language plpgsql security invoker set search_path='' as $$
declare business_id uuid; reviewer uuid; test_plate text; item text; file_path text; owner_type text; owner_id uuid;
begin
  if not exists(select 1 from private.test_environment where project_ref='xnrueexpwzvxotgwmamj') then raise exception 'Test only'; end if;
  select distributor_id into strict business_id from public.drivers where id=p_driver;
  select id into strict reviewer from public.profiles where id<>p_driver order by id limit 1;
  insert into public.driver_applications(driver_id,status,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
    values(p_driver,'approved','Synthetic driver','12345678-5','+56912345678',business_id,'Synthetic business') on conflict(driver_id) do nothing;
  update public.driver_applications set applicant_name='Synthetic driver',applicant_rut='12345678-5',applicant_phone='+56912345678',
    requested_distributor_id=business_id,requested_distributor_name='Synthetic business' where driver_id=p_driver and applicant_rut is null;
  update public.drivers set license_class='A4' where id=p_driver;
  loop
    test_plate:='ZZ'||lpad((floor(random()*10000)::integer)::text,4,'0');
    exit when not exists(select 1 from public.distributor_vehicles where plate=test_plate);
  end loop;
  insert into public.distributor_vehicles(id,distributor_id,plate,label,status,driver_id,revision,make,model,year,type)
    values(p_vehicle,business_id,test_plate,'Synthetic vehicle','inactive',p_driver,1,'Synthetic','Model',2026,'truck')
    on conflict(id) do update set make='Synthetic',model='Model',year=2026,type='truck';
  file_path:=business_id::text||'/vehicle/'||p_vehicle::text||'/'||gen_random_uuid()::text||'.jpg';
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('vehicle-photos',file_path,p_driver::text,'{"mimetype":"image/jpeg","size":100}');
  update public.distributor_vehicles set photo_path=file_path where id=p_vehicle;
  foreach item in array array['vehicle_registration','circulation_permit','technical_inspection','soap','driver_license_front','driver_license_back'] loop
    owner_type:=case when item like 'driver_%' then 'driver' else 'vehicle' end;
    owner_id:=case owner_type when 'driver' then p_driver else p_vehicle end;
    file_path:=business_id::text||'/'||owner_type||'/'||owner_id::text||'/'||gen_random_uuid()::text||'.pdf';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',file_path,p_driver::text,'{"mimetype":"application/pdf","size":100}');
    insert into public.documents(vehicle_id,driver_id,type,status,file_path,mime_type,size_bytes,expires_on,license_class,submitted_by,reviewed_by,reviewed_at)
      values(case when owner_type='vehicle' then p_vehicle end,case when owner_type='driver' then p_driver end,item,'approved',file_path,'application/pdf',100,
        (now() at time zone 'America/Santiago')::date+365,case when item='driver_license_back' then 'A4' end,p_driver,reviewer,now());
  end loop;
  update public.distributor_vehicles set status='available' where id=p_vehicle;
  update public.drivers set is_available=p_available where id=p_driver;
end; $$;
revoke all on function private.seed_test_document_fixture(uuid,boolean,uuid) from public,anon,authenticated,service_role;
