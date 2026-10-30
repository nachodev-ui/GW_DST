-- Persistent, fictitious device demo. This is NOT a rollback-only regression fixture.
-- Run only through scripts/security/prepare-device-demo.cjs after operator authorization.
begin;
set local statement_timeout='45s';
do $$
<<device_demo_seed>>
declare
  owner_id uuid; driver_id uuid; reviewer_id uuid; business_id uuid; product_id uuid;
  vehicle_id uuid; invitation_id uuid; application_at timestamptz; coverage_revision integer; needs_license_class boolean;
begin
  if not exists(select 1 from private.test_environment where project_ref='xnrueexpwzvxotgwmamj') then raise exception 'Dedicated Test marker required'; end if;
  select id into strict owner_id from auth.users where lower(email)='nacho.rtk@gmail.com' and email_confirmed_at is not null;
  select id into strict driver_id from auth.users where lower(email)='ig.cisternas@duocuc.cl' and email_confirmed_at is not null;
  select a.user_id into strict reviewer_id from private.document_admins a join auth.users u on u.id=a.user_id where lower(u.email)='ig.cisternas.dev@gmail.com';
  if owner_id=driver_id or owner_id=reviewer_id or driver_id=reviewer_id
    or exists(select 1 from private.document_admins where user_id in(owner_id,driver_id)) then raise exception 'Demo actors must remain separate'; end if;
  if (select role from public.profiles where id=owner_id)<>'customer' then raise exception 'Demo owner must keep customer role'; end if;

  select d.id into business_id from public.distributors d join public.distributor_members m on m.distributor_id=d.id
    where m.user_id=owner_id and m.role='owner' and d.name='Gasway Demo Test' and d.is_demo;
  if business_id is null then
    if exists(select 1 from public.distributor_members where user_id=owner_id) then raise exception 'Existing business needs manual inspection'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.submit_distributor_application('Gasway Demo Test','12345678-5','Responsable DEMO','+56912345678',
      'Direccion ficticia de pruebas 123','13110',array['Lipigas'],
      'DEMO FICTICIA: sin acreditacion comercial real','DEMO FICTICIA: sin recinto operativo real',false);
    execute 'reset role';
    select requested_at into strict application_at from public.distributor_applications where applicant_id=owner_id;
    business_id:=private.review_distributor_application(owner_id,application_at,'approved',
      'Solo demo ficticia en Gasway Test; no acredita habilitacion legal', 'Operador via Codex, demo Test 2026-10-26',true);
  end if;
  if not exists(select 1 from public.distributors where id=business_id and is_demo and is_verified) then raise exception 'Expected verified fictitious Test business'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not exists(select 1 from public.distributor_communes where distributor_id=business_id) then
    select d.coverage_revision into strict coverage_revision from public.distributors d where d.id=business_id;
    perform public.set_business_coverage(business_id,array['13110','13201','13202'],coverage_revision);
  end if;
  select p.id into strict product_id from public.products p where p.brand='Lipigas' and p.weight_kg=11 and p.variant='standard' and p.is_active;
  if not exists(select 1 from public.distributor_products where distributor_id=business_id and distributor_products.product_id=device_demo_seed.product_id) then
    perform public.set_business_offer(business_id,product_id,15990,25990,20,true,0);
  end if;
  execute 'reset role';

  if not exists(select 1 from public.drivers where id=driver_id and is_verified and distributor_id=business_id) then
    if exists(select 1 from public.drivers where id=driver_id and is_verified) then raise exception 'Driver already belongs to another operation'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    invitation_id:=(public.create_driver_invitations(business_id,jsonb_build_array(jsonb_build_object('name','Conductor DEMO Test','email','ig.cisternas@duocuc.cl')),false)->0->>'id')::uuid;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',driver_id,'role','authenticated')::text,true);
    perform public.accept_driver_invitation(invitation_id);
    perform public.submit_invited_driver_application(invitation_id,'Conductor DEMO Test','12345678-5','912345678',false);
    execute 'reset role';
    perform private.review_driver_application(driver_id,'approved',business_id,
      'Acceso solo para demo ficticia en Test; documentos operativos pendientes', 'Operador via Codex, demo Test 2026-10-26');
  end if;

  select license_class is null into strict needs_license_class from public.drivers where id=driver_id;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if needs_license_class then
    perform public.set_driver_document_details(driver_id,'12345678-5','A4');
  end if;
  select id into vehicle_id from public.distributor_vehicles where distributor_id=business_id and plate='ZZ9999';
  if vehicle_id is null then
    if exists(select 1 from public.distributor_vehicles v where v.driver_id=device_demo_seed.driver_id) then raise exception 'Inspect existing demo fleet'; end if;
    perform public.save_document_vehicle(business_id,gen_random_uuid(),0,jsonb_build_object('plate','ZZ9999','label','Vehiculo DEMO Test',
      'make','DEMO','model','Prueba ficticia','year',2026,'type','truck','status','inactive','driver_id',driver_id,'photo_path',null));
  end if;
  execute 'reset role';
  -- Do not add documents, Storage objects, orders, documentary approvals or availability.
  -- They are entered through the app during the device exercise. Reruns preserve progress.
end; $$;
commit;
select jsonb_build_object('name',d.name,'business_id',d.id,'is_demo',d.is_demo,
  'coverage',(select jsonb_agg(commune_code order by commune_code) from public.distributor_communes where distributor_id=d.id),
  'catalogue',(select jsonb_agg(jsonb_build_object('brand',p.brand,'weight_kg',p.weight_kg,'unit_price_clp',s.unit_price_clp,'stock',s.stock,'listed',s.is_listed))
    from public.distributor_products s join public.products p on p.id=s.product_id where s.distributor_id=d.id),
  'driver',(select jsonb_build_object('id',r.id,'access_approved',r.is_verified,'available',r.is_available,'license_class',r.license_class,'documents_eligible',private.is_driver_eligible(r.id))
    from public.drivers r where r.distributor_id=d.id and r.id=(select id from auth.users where lower(email)='ig.cisternas@duocuc.cl')),
  'vehicle',(select jsonb_build_object('id',v.id,'plate',v.plate,'status',v.status,'documents_eligible',private.is_vehicle_eligible(v.id)) from public.distributor_vehicles v where v.distributor_id=d.id and v.plate='ZZ9999'),
  'document_count',(select count(*) from public.documents doc where doc.vehicle_id in(select id from public.distributor_vehicles where distributor_id=d.id)
    or doc.driver_id in(select id from public.drivers where distributor_id=d.id))) as device_demo
from public.distributors d join public.distributor_members m on m.distributor_id=d.id
where d.name='Gasway Demo Test' and d.is_demo and m.user_id=(select id from auth.users where lower(email)='nacho.rtk@gmail.com');
