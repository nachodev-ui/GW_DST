-- Only the three requested SQL/RLS groups. Synthetic Storage metadata, no real files.
do $$
<<document_checks>>
declare
  owner_id uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
  driver_id uuid:=gen_random_uuid(); customer_id uuid:=gen_random_uuid();
  business_id uuid:=gen_random_uuid(); other_business uuid:=gen_random_uuid(); vehicle_id uuid:=gen_random_uuid();
  doc_id uuid; replacement uuid; result jsonb; item text; file_name text; product_id uuid; order_id uuid:=gen_random_uuid();
  test_plate text;
  today date:=(now() at time zone 'America/Santiago')::date;
begin
  begin
    insert into auth.users(id) values(owner_id),(other_owner),(admin_id),(driver_id),(customer_id);
    update public.profiles set role='driver' where id=driver_id;
    insert into public.distributors(id,name,is_verified,is_demo) values(business_id,'Document Test A',true,true),(other_business,'Document Test B',true,true);
    insert into public.distributor_members(distributor_id,user_id,role) values(business_id,owner_id,'owner'),(other_business,other_owner,'owner');
    insert into private.document_admins(user_id) values(admin_id);
    insert into public.drivers(id,is_verified,is_available,distributor_id,license_class) values(driver_id,true,false,business_id,'A4');
    insert into public.driver_applications(driver_id,status,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name)
      values(driver_id,'approved','Conductor de prueba','12345678-5','+56912345678',business_id,'Document Test A');
    insert into public.distributor_brands(distributor_id,brand) values(business_id,'Gasco');
    insert into public.distributor_communes(distributor_id,commune_code) values(business_id,'13101');
    select 'ZY'||lpad(n::text,4,'0') into test_plate from generate_series(1,9999) n
      where not exists(select 1 from public.distributor_vehicles where plate='ZY'||lpad(n::text,4,'0')) limit 1;
    if test_plate is null then raise exception 'No free documentary fixture plate'; end if;
    insert into public.distributor_vehicles(id,distributor_id,plate,label,status,driver_id,revision,make,model,year,type)
      values(vehicle_id,business_id,test_plate,'Document test','inactive',driver_id,1,'Marca','Modelo',2026,'truck');
    file_name:=business_id::text||'/vehicle/'||vehicle_id::text||'/'||gen_random_uuid()::text||'.jpg';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('vehicle-photos',file_name,owner_id::text,'{"mimetype":"image/jpeg","size":100}');
    update public.distributor_vehicles set photo_path=file_name where id=vehicle_id;
    file_name:=business_id::text||'/vehicle/'||vehicle_id::text||'/'||gen_random_uuid()::text||'.pdf';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',file_name,owner_id::text,'{"mimetype":"application/pdf","size":100}');

    -- (1) Tenant isolation: no foreign file reads or forged uploads.
    perform set_config('request.jwt.claims',jsonb_build_object('sub',other_owner,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from storage.objects where name=file_name) then raise exception 'FAIL: foreign Storage read'; end if;
    begin
      insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',business_id::text||'/vehicle/'||vehicle_id::text||'/'||gen_random_uuid()::text||'.pdf',other_owner::text,'{"mimetype":"application/pdf","size":100}');
      raise exception 'FAIL: foreign upload';
    exception when insufficient_privilege then null; end;
    begin perform public.get_owner_documents('vehicle',vehicle_id); raise exception 'FAIL: foreign document read'; exception when insufficient_privilege then null; end;
    begin perform public.is_vehicle_eligible(vehicle_id); raise exception 'FAIL: foreign vehicle eligibility'; exception when insufficient_privilege then null; end;
    begin perform public.is_driver_eligible(driver_id); raise exception 'FAIL: foreign driver eligibility'; exception when insufficient_privilege then null; end;
    begin perform private.get_vehicle_eligibility(vehicle_id); raise exception 'FAIL: private wrapper bypass'; exception when insufficient_privilege then null; end;
    begin perform private.is_driver_eligible(driver_id); raise exception 'FAIL: raw eligibility helper callable'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not exists(select 1 from storage.objects where name=file_name) then raise exception 'FAIL: owner cannot read'; end if;
    if public.is_vehicle_eligible(vehicle_id) or public.is_driver_eligible(driver_id) then raise exception 'FAIL: incomplete documents eligible'; end if;
    doc_id:=public.submit_document('vehicle',vehicle_id,'circulation_permit',file_name,today+20);
    if public.submit_document('vehicle',vehicle_id,'circulation_permit',file_name,today+20)<>doc_id then raise exception 'FAIL: upload retry'; end if;

    -- (2) Only a separately provisioned admin can review, never the uploader.
    begin perform public.review_document(doc_id,'approved',null,today+20); raise exception 'FAIL: non-admin approval'; exception when insufficient_privilege then null; end;
    begin update public.documents set status='approved' where id=doc_id; raise exception 'FAIL: direct review'; exception when insufficient_privilege then null; end;
    begin delete from public.documents where id=doc_id; raise exception 'FAIL: direct document deletion'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    insert into private.document_admins(user_id) values(owner_id);
    execute 'set local role authenticated';
    begin perform public.review_document(doc_id,'approved',null,today+20); raise exception 'FAIL: admin self-review'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    delete from private.document_admins where user_id=owner_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.review_document(doc_id,'approved',null,today+20);
    if not exists(select 1 from public.documents where id=doc_id and reviewed_by=admin_id and reviewed_at is not null) then raise exception 'FAIL: review audit'; end if;
    execute 'reset role';

    -- (3) Availability, offers and atomic assignment require current approved evidence.
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.set_driver_availability(true); raise exception 'FAIL: missing license availability'; exception when sqlstate 'GD001' then null; end;
    begin perform public.accept_order(order_id); raise exception 'FAIL: unapproved acceptance'; exception when insufficient_privilege or sqlstate 'GD001' then null; end;
    execute 'reset role';
    begin update public.distributor_vehicles set status='available' where id=vehicle_id; raise exception 'FAIL: incomplete vehicle availability'; exception when sqlstate 'GD002' then null; end;
    -- Pending records are not enough; then approve each exact version via the real RPC.
    foreach item in array array['vehicle_registration','soap','homologation_certificate','driver_license_front','driver_license_back'] loop
      file_name:=business_id::text||'/'||case when item like 'driver_%' then 'driver/'||driver_id::text else 'vehicle/'||vehicle_id::text end||'/'||gen_random_uuid()::text||'.pdf';
      insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',file_name,
        (case when item like 'driver_%' then driver_id else owner_id end)::text,'{"mimetype":"application/pdf","size":100}');
      perform set_config('request.jwt.claims',jsonb_build_object('sub',case when item like 'driver_%' then driver_id else owner_id end,'role','authenticated')::text,true);
      execute 'set local role authenticated';
      doc_id:=public.submit_document(case when item like 'driver_%' then 'driver' else 'vehicle' end,
        case when item like 'driver_%' then driver_id else vehicle_id end,item,file_name,
        case when item in ('vehicle_registration','driver_license_front') then null else today end);
      execute 'reset role';
      if item='driver_license_back' and private.is_driver_eligible(driver_id) then raise exception 'FAIL: pending license eligible'; end if;
      perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
      execute 'set local role authenticated';
      perform public.review_document(doc_id,'approved',null,case when item in ('vehicle_registration','driver_license_front') then null else today end);
      execute 'reset role';
    end loop;
    if not private.is_vehicle_eligible(vehicle_id) or not private.is_driver_eligible(driver_id) then raise exception 'FAIL: CHI alternative or end-of-day expiry'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not public.is_vehicle_eligible(vehicle_id) or not public.is_driver_eligible(driver_id) then raise exception 'FAIL: member eligibility read'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not public.is_driver_eligible(driver_id) then raise exception 'FAIL: own eligibility read'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not public.is_vehicle_eligible(vehicle_id) or not public.is_driver_eligible(driver_id) then raise exception 'FAIL: admin eligibility read'; end if;
    execute 'reset role';
    execute 'set local role anon';
    begin perform public.is_driver_eligible(driver_id); raise exception 'FAIL: anonymous eligibility'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    update public.distributor_vehicles set status='available' where id=vehicle_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated'; perform public.set_driver_availability(true); execute 'reset role';
    select id into product_id from public.products where brand='Gasco' and is_active limit 1;
    insert into public.orders(id,customer_id,product_id,distributor_id,total_clp,quantity,exchange_empty,delivery_address,commune_code)
      values(order_id,customer_id,product_id,business_id,20000,1,true,'Dirección sintética 123','13101');
    update public.orders set status='offered' where id=order_id;
    insert into private.order_offers(order_id,driver_id,expires_at) values(order_id,driver_id,clock_timestamp()+interval '60 seconds');
    -- Expiry blocks even if the availability declaration is still true.
    update public.documents set expires_on=today-1 where type='driver_license_back' and documents.driver_id=document_checks.driver_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.set_driver_availability(true); raise exception 'FAIL: expired availability'; exception when sqlstate 'GD001' then null; end;
    begin perform public.accept_order(order_id); raise exception 'FAIL: expired atomic acceptance'; exception when sqlstate 'GD001' then null; end;
    execute 'reset role';
    begin update public.orders set status='accepted',driver_id=document_checks.driver_id,accepted_at=now() where id=order_id; raise exception 'FAIL: expired assignment'; exception when sqlstate 'GD001' then null; end;
    update public.documents set expires_on=today where type='driver_license_back' and documents.driver_id=document_checks.driver_id;
    update public.documents set expires_on=today-1 where type='homologation_certificate' and documents.vehicle_id=document_checks.vehicle_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.accept_order(order_id); raise exception 'FAIL: expired vehicle acceptance'; exception when sqlstate 'GD002' then null; end;
    execute 'reset role';
    delete from private.order_offers where order_offers.order_id=document_checks.order_id;
    perform private.dispatch_order(order_id);
    if exists(select 1 from private.order_offers where order_offers.order_id=document_checks.order_id) then raise exception 'FAIL: expired offer emission'; end if;
    update public.documents set expires_on=today where type='homologation_certificate' and documents.vehicle_id=document_checks.vehicle_id;
    insert into private.order_offers(order_id,driver_id,expires_at) values(order_id,driver_id,clock_timestamp()+interval '60 seconds');
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    execute 'set local role authenticated'; perform public.accept_order(order_id); execute 'reset role';
    update public.documents set expires_on=today-1 where type='homologation_certificate' and documents.vehicle_id=document_checks.vehicle_id;
    update public.orders set status='on_the_way' where id=order_id;
    update public.orders set status='delivered',delivered_at=now() where id=order_id;
    -- Replacement remains pending/rejected without invalidating the current approved version.
    file_name:=business_id::text||'/vehicle/'||vehicle_id::text||'/'||gen_random_uuid()::text||'.pdf';
    insert into storage.objects(bucket_id,name,owner_id,metadata) values('documents',file_name,owner_id::text,'{"mimetype":"application/pdf","size":100}');
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated'; replacement:=public.submit_document('vehicle',vehicle_id,'circulation_permit',file_name,today+40); execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
    execute 'set local role authenticated'; perform public.review_document(replacement,'rejected','Archivo ilegible',today+40); execute 'reset role';
    if not exists(select 1 from public.documents where documents.vehicle_id=document_checks.vehicle_id and type='circulation_permit' and status='approved') then raise exception 'FAIL: rejected replacement removed approval'; end if;
    raise exception using errcode='ZD001',message='Rollback documentary fixtures';
  exception when sqlstate 'ZD001' then raise notice 'PASS: document isolation, admin authorization and dispatch eligibility (fixtures reverted)';
  end;
end; $$;
