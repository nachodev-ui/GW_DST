-- Explicitly authorized fictitious data. Gasway project gleltbrvpfvfgggcatpt ONLY.
-- Run as postgres after business_onboarding. No Auth account is created; no driver
-- application, operational clearance or global product price is changed.
-- Repeat-safe: preserves edits made in Mi negocio instead of resetting stock/prices.
do $$
declare
  owner_id uuid:='a30a8236-175c-424d-9bf4-ff753d695649';
  application public.distributor_applications;
  business_id uuid;
  product record;
begin
  if not exists(select 1 from auth.users where id=owner_id)
    or not exists(select 1 from public.profiles where id=owner_id) then
    raise exception 'Expected demo owner does not exist';end if;
  select * into application from public.distributor_applications where applicant_id=owner_id;
  if found then
    business_id:=application.distributor_id;
    if application.status<>'approved' or not exists(select 1 from public.distributors d
      join public.distributor_members m on m.distributor_id=d.id
      where d.id=business_id and d.is_demo and d.name='Gasway Demo Santiago'
        and m.user_id=owner_id and m.role='owner') then
      raise exception 'Existing application is not this approved demo; inspect before changing anything';end if;
  else
    if exists(select 1 from public.distributor_members where user_id=owner_id) then
      raise exception 'User already manages another business';end if;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id)::text,true);
    execute 'set local role authenticated';
    perform public.submit_distributor_application('Gasway Demo Santiago','76000000-0','Responsable Ficticio',
      '+56900000000','Calle de Prueba 123, recinto ficticio','13101',array['Lipigas'],
      'FICTICIO: inicio de actividades, patente y acuerdo comercial simulados, sin documentos válidos.',
      'FICTICIO: recinto y antecedentes de seguridad simulados. Sin autorización real ni revisión SEC.',false);
    execute 'reset role';
    select * into application from public.distributor_applications where applicant_id=owner_id;
    business_id:=private.review_distributor_application(owner_id,application.requested_at,'approved',
      'PRUEBA FICTICIA autorizada por el usuario. No acredita documentación ni operación real.',
      'Usuario vía Codex, 2026-10-18: pasos 1, 2 y 3 con datos ficticios',true);
    -- Incorporation now starts at Equipo; never reopen the retired public directory.
  end if;
  for product in select id,weight_kg from public.products where brand='Lipigas' and variant='standard' and is_active loop
    if not exists(select 1 from public.distributor_products where distributor_id=business_id and product_id=product.id) then
      perform set_config('request.jwt.claims',json_build_object('sub',owner_id)::text,true);
      execute 'set local role authenticated';
      perform public.set_business_product(business_id,product.id,
        case product.weight_kg when 5 then 10990 when 11 then 15990 when 15 then 21990 when 45 then 69990 end,
        12,true,0);
      execute 'reset role';
    end if;
  end loop;
end;
$$;
select d.id,d.name,d.is_demo,d.is_verified,d.accepts_driver_applications,m.user_id,m.role
from public.distributors d join public.distributor_members m on m.distributor_id=d.id
where m.user_id='a30a8236-175c-424d-9bf4-ff753d695649';
