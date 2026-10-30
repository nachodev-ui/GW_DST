begin;

alter table public.distributor_vehicles
  add column make text check (char_length(btrim(make)) between 1 and 60),
  add column model text check (char_length(btrim(model)) between 1 and 80),
  add column year integer check (year between 1900 and 2100),
  add column type text check (type in ('truck','pickup','van')),
  add column photo_path text;
alter table public.drivers add column license_class text
  check (license_class in ('B','A2_legacy','A4','A5'));
-- No duplicate RUT: driver_applications.applicant_rut is the submitted identity.
create table private.document_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade
);
alter table private.document_admins enable row level security;
revoke all on private.document_admins from public,anon,authenticated,service_role;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.distributor_vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete cascade,
  type text not null check (type in ('vehicle_registration','circulation_permit','technical_inspection','homologation_certificate','soap','driver_license_front','driver_license_back')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded')),
  file_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  expires_on date,
  license_class text check (license_class in ('B','A2_legacy','A4','A5')),
  submitted_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text check (char_length(btrim(rejection_reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(vehicle_id,driver_id)=1),
  check ((vehicle_id is not null and type in ('vehicle_registration','circulation_permit','technical_inspection','homologation_certificate','soap'))
    or (driver_id is not null and type in ('driver_license_front','driver_license_back'))),
  check (type not in ('circulation_permit','technical_inspection','homologation_certificate','soap','driver_license_back') or expires_on is not null),
  check ((type='driver_license_back')=(license_class is not null)),
  check ((status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status<>'pending' and reviewed_by is not null and reviewed_at is not null and reviewed_by<>submitted_by)),
  check ((status='rejected')=(rejection_reason is not null))
);
create index documents_vehicle_idx on public.documents(vehicle_id,type,status);
create index documents_driver_idx on public.documents(driver_id,type,status);
create index documents_pending_idx on public.documents(created_at,id) where status='pending';
create unique index distributor_vehicle_plate_unique_idx on public.distributor_vehicles(plate);
create unique index documents_vehicle_approved_idx on public.documents(vehicle_id,type) where status='approved';
create unique index documents_driver_approved_idx on public.documents(driver_id,type) where status='approved';
alter table public.documents enable row level security;
revoke all on public.documents from public,anon,authenticated,service_role;
grant select on public.documents to authenticated;

create function private.is_document_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from private.document_admins where user_id=auth.uid());
$$;
create function public.is_document_admin() returns boolean
language sql stable security invoker set search_path='' as $$ select private.is_document_admin(); $$;

create function private.document_business(p_owner_type text,p_owner_id uuid) returns uuid
language sql stable security definer set search_path='' as $$
  select distributor_id from public.distributor_vehicles where p_owner_type='vehicle' and id=p_owner_id
  union all select distributor_id from public.drivers where p_owner_type='driver' and id=p_owner_id;
$$;
create function private.can_read_documents(p_owner_type text,p_owner_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (private.is_document_admin() or exists(select 1 from public.distributor_members
    where user_id=auth.uid() and distributor_id=private.document_business(p_owner_type,p_owner_id)));
$$;
create policy documents_scoped_read on public.documents for select to authenticated using (
  private.can_read_documents(case when vehicle_id is not null then 'vehicle' else 'driver' end,coalesce(vehicle_id,driver_id))
);

create function private.is_vehicle_eligible(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.distributor_vehicles v where v.id=p_id and v.photo_path is not null
    and v.make is not null and v.model is not null and v.year is not null and v.type is not null
    and exists(select 1 from storage.objects where bucket_id='vehicle-photos' and name=v.photo_path)
    and not exists(select 1 from unnest(array['vehicle_registration','circulation_permit','soap']) required(type)
      where not exists(select 1 from public.documents d where d.vehicle_id=v.id and d.type=required.type and d.status='approved'
        and (d.expires_on is null or d.expires_on>=(now() at time zone 'America/Santiago')::date)))
    and exists(select 1 from public.documents d where d.vehicle_id=v.id and d.type in ('technical_inspection','homologation_certificate')
      and d.status='approved' and d.expires_on>=(now() at time zone 'America/Santiago')::date));
$$;
create function private.is_driver_eligible(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.drivers driver join public.driver_applications a on a.driver_id=driver.id
    where driver.id=p_id and private.is_valid_rut(a.applicant_rut) and driver.license_class is not null
    and exists(select 1 from public.documents d where d.driver_id=driver.id and d.type='driver_license_front' and d.status='approved'
      and (d.expires_on is null or d.expires_on>=(now() at time zone 'America/Santiago')::date))
    and exists(select 1 from public.documents d where d.driver_id=driver.id and d.type='driver_license_back' and d.status='approved'
      and d.license_class=driver.license_class and d.expires_on>=(now() at time zone 'America/Santiago')::date));
$$;
create function public.is_vehicle_eligible(p_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_read_documents('vehicle',p_id) then raise exception 'Document access denied' using errcode='42501'; end if;
  return private.is_vehicle_eligible(p_id);
end; $$;
create function public.is_driver_eligible(p_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_read_documents('driver',p_id) and p_id is distinct from auth.uid() then
    raise exception 'Document access denied' using errcode='42501'; end if;
  return private.is_driver_eligible(p_id);
end; $$;

-- Lock order shared with acceptance/fleet edits: driver -> distributor -> vehicle -> document.
create function private.lock_document_owner(p_owner_type text,p_owner_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare business_id uuid; linked_driver uuid;
begin
  if p_owner_type='vehicle' then
    select driver_id into linked_driver from public.distributor_vehicles where id=p_owner_id;
    perform 1 from public.drivers where id=linked_driver for update;
  elsif p_owner_type='driver' then
    perform 1 from public.drivers where id=p_owner_id for update;
  else raise exception 'Invalid document owner' using errcode='22023'; end if;
  business_id:=private.document_business(p_owner_type,p_owner_id);
  if business_id is null then raise exception 'Document owner unavailable' using errcode='55000'; end if;
  perform 1 from public.distributors where id=business_id for update;
  if p_owner_type='vehicle' then perform 1 from public.distributor_vehicles where id=p_owner_id for update; end if;
  -- Recheck after waiting for a concurrent affiliation/fleet edit.
  if private.document_business(p_owner_type,p_owner_id) is distinct from business_id then
    raise exception 'Document owner changed; refresh' using errcode='40001'; end if;
  return business_id;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('documents','documents',false,5242880,array['image/jpeg','image/png','application/pdf']),
 ('vehicle-photos','vehicle-photos',false,5242880,array['image/jpeg','image/png']);
create function private.document_storage_access(p_bucket text,p_name text,p_write boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/'); business_id uuid; owner_id uuid;
begin
  if auth.uid() is null or p_bucket not in ('documents','vehicle-photos') or cardinality(parts)<>4
    or parts[1] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9a-f-]{36}$'
    or parts[2] not in ('vehicle','driver') or parts[4] !~ '^[0-9a-f-]{36}\.(jpg|png|pdf)$'
    or (p_bucket='vehicle-photos' and (parts[2]<>'vehicle' or parts[4] !~ '\.(jpg|png)$')) then return false; end if;
  begin business_id:=parts[1]::uuid; owner_id:=parts[3]::uuid;
  exception when invalid_text_representation then return false; end;
  if private.document_business(parts[2],owner_id) is distinct from business_id then return false; end if;
  if p_write then
    perform private.lock_document_owner(parts[2],owner_id);
    if private.document_business(parts[2],owner_id) is distinct from business_id then return false; end if;
    return exists(select 1 from public.distributor_members m join public.distributors b on b.id=m.distributor_id
      where m.distributor_id=business_id and m.user_id=auth.uid() and b.is_verified);
  end if;
  return private.can_read_documents(parts[2],owner_id);
end; $$;
create policy documents_storage_read on storage.objects for select to authenticated
  using (private.document_storage_access(bucket_id,name,false));
create policy documents_storage_insert on storage.objects for insert to authenticated
  with check (private.document_storage_access(bucket_id,name,true));
-- No UPDATE, upsert or DELETE policy: every upload has a fresh UUID.

create function private.submit_document(p_owner_type text,p_owner_id uuid,p_type text,p_path text,p_expires_on date) returns uuid
language plpgsql security definer set search_path='' as $$
declare object storage.objects; result uuid; owner_business uuid; selected_class text;
begin
  owner_business:=private.lock_document_owner(p_owner_type,p_owner_id);
  if not private.document_storage_access('documents',p_path,true) or split_part(p_path,'/',2)<>p_owner_type
    or split_part(p_path,'/',3)<>p_owner_id::text then raise exception 'Document upload denied' using errcode='42501'; end if;
  select * into object from storage.objects where bucket_id='documents' and name=p_path for share;
  if not found or object.owner_id is distinct from auth.uid()::text then raise exception 'Own uploaded file required' using errcode='42501'; end if;
  select id into result from public.documents where file_path=p_path and submitted_by=auth.uid()
    and type=p_type and (vehicle_id=p_owner_id or driver_id=p_owner_id);
  if found then return result; end if;
  if p_type='driver_license_back' then select license_class into selected_class from public.drivers where id=p_owner_id; end if;
  insert into public.documents(vehicle_id,driver_id,type,file_path,mime_type,size_bytes,expires_on,license_class,submitted_by)
    values(case when p_owner_type='vehicle' then p_owner_id end,case when p_owner_type='driver' then p_owner_id end,
      p_type,p_path,object.metadata->>'mimetype',(object.metadata->>'size')::integer,p_expires_on,selected_class,auth.uid()) returning id into result;
  return result;
end; $$;
create function public.submit_document(p_owner_type text,p_owner_id uuid,p_type text,p_path text,p_expires_on date) returns uuid
language sql security invoker set search_path='' as $$ select private.submit_document(p_owner_type,p_owner_id,p_type,p_path,p_expires_on); $$;

create function private.review_document(p_document_id uuid,p_decision text,p_rejection_reason text,p_expires_on date) returns void
language plpgsql security definer set search_path='' as $$
declare doc public.documents; owner_business uuid;
begin
  if not private.is_document_admin() then raise exception 'Document admin required' using errcode='42501'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') or
    (p_decision='rejected' and (p_rejection_reason is null or char_length(btrim(p_rejection_reason)) not between 1 and 500)) then
    raise exception 'Invalid document review' using errcode='22023'; end if;
  select * into doc from public.documents where id=p_document_id;
  if not found then raise exception 'Document unavailable' using errcode='55000'; end if;
  owner_business:=private.lock_document_owner(case when doc.vehicle_id is not null then 'vehicle' else 'driver' end,coalesce(doc.vehicle_id,doc.driver_id));
  select * into doc from public.documents where id=p_document_id for update;
  if not found or doc.status<>'pending' then raise exception 'Document is not pending' using errcode='55000'; end if;
  if doc.submitted_by=auth.uid() then raise exception 'Cannot review own document' using errcode='42501'; end if;
  if p_decision='approved' then
    update public.documents set status='superseded' where status='approved' and type=doc.type
      and (vehicle_id=doc.vehicle_id or driver_id=doc.driver_id);
  end if;
  update public.documents set status=p_decision,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),
    rejection_reason=case when p_decision='rejected' then btrim(p_rejection_reason) end,expires_on=p_expires_on where id=doc.id;
end; $$;
create function public.review_document(p_document_id uuid,p_decision text,p_rejection_reason text,p_expires_on date) returns void
language sql security invoker set search_path='' as $$ select private.review_document(p_document_id,p_decision,p_rejection_reason,p_expires_on); $$;

create function private.get_owner_documents(p_owner_type text,p_owner_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare eligible boolean; result jsonb; rejected boolean;
begin
  if not private.can_read_documents(p_owner_type,p_owner_id) then raise exception 'Document access denied' using errcode='42501'; end if;
  eligible:=case p_owner_type when 'vehicle' then private.is_vehicle_eligible(p_owner_id) else private.is_driver_eligible(p_owner_id) end;
  select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id desc),'[]'::jsonb) into result from public.documents d
    where (p_owner_type='vehicle' and d.vehicle_id=p_owner_id) or (p_owner_type='driver' and d.driver_id=p_owner_id);
  -- A rejected replacement does not override an approved, still-current version (including RT/CHI alternatives).
  select exists(select 1 from public.documents d where d.status='rejected'
    and ((p_owner_type='vehicle' and d.vehicle_id=p_owner_id) or (p_owner_type='driver' and d.driver_id=p_owner_id))
    and (d.expires_on is null or d.expires_on>=(now() at time zone 'America/Santiago')::date)
    and (d.type<>'driver_license_back' or d.license_class=(select license_class from public.drivers where id=p_owner_id))
    and not exists(select 1 from public.documents a where a.status='approved'
      and (a.vehicle_id=d.vehicle_id or a.driver_id=d.driver_id)
      and (a.type=d.type or (a.type in ('technical_inspection','homologation_certificate') and d.type in ('technical_inspection','homologation_certificate')))
      and (a.expires_on is null or a.expires_on>=(now() at time zone 'America/Santiago')::date)
      and (a.type<>'driver_license_back' or a.license_class=d.license_class))) into rejected;
  return jsonb_build_object('status',case when eligible then 'approved' when rejected then 'rejected' else 'pending' end,
    'today',(now() at time zone 'America/Santiago')::date,'items',result,
    'identity_locked',exists(select 1 from public.documents d where d.status in ('approved','superseded')
      and ((p_owner_type='vehicle' and d.vehicle_id=p_owner_id) or (p_owner_type='driver' and d.driver_id=p_owner_id))),
    'rut',(select applicant_rut from public.driver_applications where p_owner_type='driver' and driver_id=p_owner_id),
    'license_class',(select license_class from public.drivers where p_owner_type='driver' and id=p_owner_id),
    'photo_path',(select photo_path from public.distributor_vehicles where p_owner_type='vehicle' and id=p_owner_id),
    'vehicle',(select jsonb_build_object('plate',plate,'make',make,'model',model,'year',year,'type',type)
      from public.distributor_vehicles where p_owner_type='vehicle' and id=p_owner_id));
end; $$;
create function public.get_owner_documents(p_owner_type text,p_owner_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.get_owner_documents(p_owner_type,p_owner_id); $$;
create function private.list_pending_documents(p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_document_admin() then raise exception 'Document admin required' using errcode='42501'; end if;
  if (p_before_at is null)<>(p_before_id is null) then raise exception 'Invalid cursor' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(d) order by created_at,id),'[]'::jsonb) from
    (select * from public.documents where status='pending' and (p_before_at is null or (created_at,id)>(p_before_at,p_before_id))
      order by created_at,id limit 30) d);
end; $$;
create function public.list_pending_documents(p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.list_pending_documents(p_before_at,p_before_id); $$;

create function private.set_driver_document_details(p_driver_id uuid,p_rut text,p_license_class text) returns void
language plpgsql security definer set search_path='' as $$
declare business_id uuid; canonical text:=upper(regexp_replace(p_rut,'[.[:space:]]','','g'));
begin
  business_id:=private.lock_document_owner('driver',p_driver_id);
  if not exists(select 1 from public.distributor_members where distributor_id=business_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  if canonical is null or not private.is_valid_rut(canonical) or p_license_class is null or p_license_class not in ('B','A2_legacy','A4','A5') then
    raise exception 'Invalid driver document details' using errcode='22023'; end if;
  update public.driver_applications set applicant_rut=canonical where driver_id=p_driver_id;
  if not found then raise exception 'Driver application required' using errcode='55000'; end if;
  update public.drivers set license_class=p_license_class where id=p_driver_id;
end; $$;
create function public.set_driver_document_details(p_driver_id uuid,p_rut text,p_license_class text) returns void
language sql security invoker set search_path='' as $$ select private.set_driver_document_details(p_driver_id,p_rut,p_license_class); $$;

create function private.save_document_vehicle(p_distributor_id uuid,p_id uuid,p_revision integer,p_vehicle jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare plate text:=upper(regexp_replace(p_vehicle->>'plate','[-[:space:]]','','g')); desired_status text:=p_vehicle->>'status'; photo text:=p_vehicle->>'photo_path';
begin
  if p_vehicle is null or jsonb_typeof(p_vehicle)<>'object' or plate is null
    or plate !~ '^([A-Z]{2}[0-9]{4}|[BCDFGHJKLPRSTVWXYZ]{4}[0-9]{2})$'
    or desired_status is null or desired_status not in ('available','maintenance','inactive')
    or nullif(btrim(p_vehicle->>'make'),'') is null or nullif(btrim(p_vehicle->>'model'),'') is null
    or p_vehicle->>'year' is null or p_vehicle->>'type' is null then raise exception 'Invalid vehicle details' using errcode='22023'; end if;
  -- Existing RPC owns membership, revision, affiliation and active-delivery checks.
  -- Stage metadata before requesting availability so new vehicles start as drafts.
  perform private.set_business_vehicle(p_distributor_id,p_id,p_revision,plate,p_vehicle->>'label','inactive',nullif(p_vehicle->>'driver_id','')::uuid);
  if photo is not null and (not private.document_storage_access('vehicle-photos',photo,false)
    or split_part(photo,'/',1)<>p_distributor_id::text or split_part(photo,'/',3)<>p_id::text
    or not exists(select 1 from storage.objects where bucket_id='vehicle-photos' and name=photo)) then
    raise exception 'Invalid vehicle photo' using errcode='22023'; end if;
  update public.distributor_vehicles set make=btrim(p_vehicle->>'make'),model=btrim(p_vehicle->>'model'),year=(p_vehicle->>'year')::integer,
    type=p_vehicle->>'type',photo_path=photo,status=desired_status where id=p_id;
end; $$;
create function public.save_document_vehicle(p_distributor_id uuid,p_id uuid,p_revision integer,p_vehicle jsonb) returns void
language sql security invoker set search_path='' as $$ select private.save_document_vehicle(p_distributor_id,p_id,p_revision,p_vehicle); $$;

create function private.set_vehicle_photo(p_vehicle_id uuid,p_path text) returns void
language plpgsql security definer set search_path='' as $$
declare business_id uuid;
begin
  business_id:=private.lock_document_owner('vehicle',p_vehicle_id);
  if not exists(select 1 from public.distributor_members where distributor_id=business_id and user_id=auth.uid())
    or not private.document_storage_access('vehicle-photos',p_path,true) or split_part(p_path,'/',3)<>p_vehicle_id::text
    or not exists(select 1 from storage.objects where bucket_id='vehicle-photos' and name=p_path and owner_id=auth.uid()::text) then
    raise exception 'Vehicle photo denied' using errcode='42501'; end if;
  if exists(select 1 from public.orders o join public.distributor_vehicles v on v.driver_id=o.driver_id
    where v.id=p_vehicle_id and o.status in ('accepted','on_the_way')) then raise exception 'Active delivery' using errcode='55000'; end if;
  update public.distributor_vehicles set photo_path=p_path,revision=revision+1 where id=p_vehicle_id;
end; $$;
create function public.set_vehicle_photo(p_vehicle_id uuid,p_path text) returns void
language sql security invoker set search_path='' as $$ select private.set_vehicle_photo(p_vehicle_id,p_path); $$;

create or replace function private.list_business_vehicles(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object(
    'documents_eligible',private.is_vehicle_eligible(v.id),'identity_locked',exists(select 1 from public.documents where vehicle_id=v.id and status in ('approved','superseded')),
    'is_busy',exists(select 1 from public.orders o where o.driver_id=v.driver_id and o.status in ('accepted','on_the_way'))) order by v.label,v.id),'[]'::jsonb)
    from public.distributor_vehicles v where v.distributor_id=p_distributor_id);
end; $$;

create function private.guard_document_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='distributor_vehicles' then
    if new.plate is distinct from old.plate and exists(select 1 from public.documents where vehicle_id=old.id and status in ('approved','superseded')) then
      raise exception 'Reviewed plate is immutable' using errcode='22023'; end if;
  else
    perform 1 from public.drivers where id=old.driver_id for update;
    if new.applicant_rut is distinct from old.applicant_rut and exists(select 1 from public.documents where driver_id=old.driver_id and status in ('approved','superseded')) then
      raise exception 'Reviewed RUT is immutable' using errcode='22023'; end if;
  end if;
  return new;
end; $$;
create trigger guard_reviewed_plate before update of plate on public.distributor_vehicles for each row execute function private.guard_document_identity();
create trigger guard_reviewed_driver_rut before update of applicant_rut on public.driver_applications for each row execute function private.guard_document_identity();

-- New allocations only; ongoing deliveries can progress after expiry.
create function private.assert_dispatch_documents(p_driver_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare vehicle public.distributor_vehicles;
begin
  perform 1 from public.drivers where id=p_driver_id for update;
  if not private.is_driver_eligible(p_driver_id) then raise exception 'Driver documents missing, expired or pending review' using errcode='GD001'; end if;
  select v.* into vehicle from public.distributor_vehicles v join public.drivers d on d.id=v.driver_id and d.distributor_id=v.distributor_id
    where v.driver_id=p_driver_id and v.status='available' for share of v;
  if not found or not private.is_vehicle_eligible(vehicle.id) then raise exception 'Vehicle documents missing, expired or pending review' using errcode='GD002'; end if;
end; $$;
create function private.guard_dispatch_documents() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='drivers' then
    if new.is_available then perform private.assert_dispatch_documents(new.id); end if;
  elsif tg_table_name='distributor_vehicles' then
    if new.status='available' and (tg_op='INSERT' or old.status<>'available' or new.driver_id is distinct from old.driver_id) then
      if not private.is_vehicle_eligible(new.id) then raise exception 'Vehicle documents missing, expired or pending review' using errcode='GD002'; end if;
      if new.driver_id is not null and not private.is_driver_eligible(new.driver_id) then raise exception 'Driver documents missing, expired or pending review' using errcode='GD001'; end if;
    end if;
  elsif tg_table_name='orders' then
    if new.driver_id is not null and (tg_op='INSERT' or new.driver_id is distinct from old.driver_id or (new.status='accepted' and old.status<>'accepted')) then
      perform private.assert_dispatch_documents(new.driver_id);
    end if;
  else
    if not private.is_driver_eligible(new.driver_id) or not exists(select 1 from public.distributor_vehicles v
      join public.drivers d on d.id=v.driver_id and d.distributor_id=v.distributor_id where v.driver_id=new.driver_id and v.status='available' and private.is_vehicle_eligible(v.id)) then
      return null; -- Filter offer emission; no job is required.
    end if;
  end if;
  return new;
end; $$;
create trigger guard_driver_document_availability before insert or update of is_available on public.drivers for each row execute function private.guard_dispatch_documents();
create trigger guard_vehicle_document_availability after insert or update of status,driver_id on public.distributor_vehicles for each row execute function private.guard_dispatch_documents();
create trigger guard_order_document_assignment before insert or update of driver_id,status on public.orders for each row execute function private.guard_dispatch_documents();
create trigger guard_offer_document_emission before insert or update on private.order_offers for each row execute function private.guard_dispatch_documents();

create or replace function private.driver_can_deliver_product(p_driver_id uuid,p_product_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.drivers d join public.profiles p on p.id=d.id
    join public.distributors organization on organization.id=d.distributor_id
    join public.distributor_brands b on b.distributor_id=organization.id join public.products product on product.brand=b.brand
    where d.id=p_driver_id and product.id=p_product_id and d.is_verified and p.role='driver' and organization.is_verified
      and private.is_driver_eligible(d.id) and exists(select 1 from public.distributor_vehicles v where v.driver_id=d.id
        and v.distributor_id=d.distributor_id and v.status='available' and private.is_vehicle_eligible(v.id)));
$$;

-- Existing availability flags are declarations, not documentary evidence. No grandfathering.
update public.drivers set is_available=false where is_available;
update public.distributor_vehicles set status='inactive',revision=revision+1 where status='available';

-- Retention: rejected/superseded versions remain while the owner exists. A broader retention
-- schedule is pending; deliberately no retention jobs. Deletion uses a durable cleanup ticket.
create table private.document_cleanup (
  owner_id uuid primary key, owner_type text not null, distributor_id uuid not null,
  files jsonb not null, completed_at timestamptz
);
alter table private.document_cleanup enable row level security;
revoke all on private.document_cleanup from public,anon,authenticated,service_role;
create function private.delete_document_owner(p_owner_type text,p_owner_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare business_id uuid; paths jsonb; ticket private.document_cleanup;
begin
  select * into ticket from private.document_cleanup where owner_id=p_owner_id for update;
  business_id:=coalesce(ticket.distributor_id,private.document_business(p_owner_type,p_owner_id));
  if auth.uid() is null or (not private.is_document_admin() and not exists(select 1 from public.distributor_members
    where user_id=auth.uid() and distributor_id=business_id)) then raise exception 'Deletion denied' using errcode='42501'; end if;
  if ticket.owner_id is not null then
    if ticket.owner_type<>p_owner_type then raise exception 'Invalid owner' using errcode='22023'; end if;
    return jsonb_build_object('files',ticket.files,'completed',ticket.completed_at is not null);
  end if;
  business_id:=private.lock_document_owner(p_owner_type,p_owner_id);
  if exists(select 1 from public.orders o where o.status in ('accepted','on_the_way') and
    (o.driver_id=p_owner_id or o.driver_id=(select driver_id from public.distributor_vehicles where id=p_owner_id))) then
    raise exception 'Active delivery prevents deletion' using errcode='55000'; end if;
  -- Include unregistered uploads as well as every retained document/photo version.
  select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name)),'[]'::jsonb) into paths
    from storage.objects where bucket_id in ('documents','vehicle-photos')
      and name like business_id::text||'/'||p_owner_type||'/'||p_owner_id::text||'/%';
  insert into private.document_cleanup(owner_id,owner_type,distributor_id,files) values(p_owner_id,p_owner_type,business_id,paths);
  if p_owner_type='vehicle' then delete from public.distributor_vehicles where id=p_owner_id;
  else
    -- Historical review/order FK restrictions remain authoritative; do not erase their audit.
    delete from public.driver_applications where driver_id=p_owner_id;
    update public.distributor_vehicles set driver_id=null,revision=revision+1 where driver_id=p_owner_id;
    delete from public.drivers where id=p_owner_id;
  end if;
  -- Existing FK restrictions (e.g. order history) roll back both deletion and ticket.
  return jsonb_build_object('files',paths,'completed',false);
end; $$;
create function public.delete_document_owner(p_owner_type text,p_owner_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.delete_document_owner(p_owner_type,p_owner_id); $$;
create function private.complete_document_cleanup(p_owner_id uuid) returns void
language sql security definer set search_path='' as $$ update private.document_cleanup set completed_at=clock_timestamp() where owner_id=p_owner_id; $$;
create function public.complete_document_cleanup(p_owner_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.complete_document_cleanup(p_owner_id); $$;

CREATE OR REPLACE FUNCTION private.accept_order(p_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  accepted_id uuid;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Serialize this driver's attempts too, avoiding two simultaneous active orders.
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = caller and p.role = 'driver' and d.is_verified and d.is_available
    for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where driver_id = caller
    and status in ('accepted', 'on_the_way')) then
    raise exception 'Driver already has an active order' using errcode = '55000';
  end if;
  -- Lock commercial eligibility until assignment completes, including brand revocation.
  perform 1 from public.orders o join public.products product on product.id=o.product_id
    join public.drivers d on d.id=caller
    join public.distributors organization on organization.id=d.distributor_id
    join public.distributor_brands b on b.distributor_id=organization.id and b.brand=product.brand
    where o.id=p_order_id and organization.is_verified for share of organization,b;
  if not found then raise exception 'Distributor cannot deliver this brand' using errcode='42501';end if;
  perform private.assert_dispatch_documents(caller);
  -- The predicate is rechecked under the row lock: exactly one competing driver wins.
  update public.orders o set
    driver_id = caller, status = 'accepted', accepted_at = now()
  where o.id = p_order_id and o.status = 'offered' and o.driver_id is null
    and o.customer_id <> caller
    and private.driver_can_deliver_product(caller, o.product_id)
    and exists(select 1 from public.distributor_communes c join public.drivers d on d.distributor_id=c.distributor_id
      where d.id=caller and c.commune_code=o.commune_code)
    and exists (select 1 from private.order_offers f
      where f.order_id = o.id and f.driver_id = caller and f.expires_at > clock_timestamp())
  returning o.id into accepted_id;
  if accepted_id is null then
    raise exception 'Order unavailable or offer expired' using errcode = '55000';
  end if;
  update public.drivers set is_available = false where id = caller;
  return accepted_id;
end;
$function$;
CREATE OR REPLACE FUNCTION private.get_my_driver_workspace()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid:=auth.uid(); profile_role public.profile_role; driver public.drivers;
  organization public.distributors; business jsonb; brand_list jsonb; reason text;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  select role into profile_role from public.profiles where id=caller;
  if not found then raise exception 'Profile required' using errcode='42501';end if;
  select * into driver from public.drivers where id=caller;
  select * into organization from public.distributors where id=driver.distributor_id;
  select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) into brand_list
    from public.distributor_brands where distributor_id=organization.id;
  if organization.id is not null then
    business:=jsonb_build_object('id',organization.id,'name',organization.name,
      'is_verified',organization.is_verified,'is_demo',organization.is_demo,'brands',brand_list);
  end if;
  reason:=case when profile_role<>'driver' or not coalesce(driver.is_verified,false) then 'not_approved'
    when organization.id is null then 'no_business'
    when not organization.is_verified then 'business_disabled'
    when jsonb_array_length(brand_list)=0 then 'no_brands'
    when not exists(select 1 from public.distributor_communes where distributor_id=organization.id) then 'no_coverage'
    when not private.is_driver_eligible(caller) then 'driver_documents'
    when not exists(select 1 from public.distributor_vehicles v where v.driver_id=caller and v.distributor_id=organization.id and v.status='available' and private.is_vehicle_eligible(v.id)) then 'vehicle_documents' else null end;
  return jsonb_build_object('is_verified',coalesce(driver.is_verified,false),
    'application_status',(select status from public.driver_applications where driver_id=caller),
    'business',business,'can_manage_business',exists(select 1 from public.distributor_members where user_id=caller),
    'can_receive_offers',reason is null,'blocking_reason',reason);
end;
$function$;
create or replace function private.get_business_coverage(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members
    where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  return(select jsonb_build_object(
    'business_enabled',business.is_verified and exists(select 1 from public.distributor_brands where distributor_id=business.id),
    'is_open',private.business_accepting_now(business.id),'revision',business.coverage_revision,
    'communes',coalesce((select jsonb_agg(jsonb_build_object('code',c.code,'name',c.name) order by c.name,c.code)
      from public.distributor_communes area join public.communes c on c.code=area.commune_code
      where area.distributor_id=business.id),'[]'::jsonb),
    'drivers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',driver.id,'name',coalesce(nullif(application.applicant_name,''),nullif(profile.display_name,''),'Conductor'),
      'status',case when not driver.is_verified or profile.role<>'driver' then 'not_enabled'
        when exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way')) then 'busy'
        when not private.is_driver_eligible(driver.id) or not exists(select 1 from public.distributor_vehicles v where v.driver_id=driver.id and v.distributor_id=driver.distributor_id and v.status='available' and private.is_vehicle_eligible(v.id)) then 'not_enabled'
        when driver.is_available then 'available' else 'offline' end
    ) order by coalesce(application.applicant_name,profile.display_name,'Conductor'),driver.id)
      from public.drivers driver join public.profiles profile on profile.id=driver.id
      left join public.driver_applications application on application.driver_id=driver.id
      where driver.distributor_id=business.id),'[]'::jsonb)
    ) from public.distributors business where business.id=p_distributor_id);
end;
$$;

CREATE OR REPLACE FUNCTION private.list_delivery_options(p_product_id uuid, p_commune_code text, p_quantity integer, p_exchange_empty boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid search' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'is_demo',d.is_demo,'request_id',gen_random_uuid(),
    'brands',(select jsonb_agg(b.brand order by b.brand) from public.distributor_brands b where b.distributor_id=d.id),
    'unit_price_clp',s.unit_price_clp,'price_without_exchange_clp',s.price_without_exchange_clp,
    'total_clp',case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity,
    'updated_at',s.updated_at,'stock',s.stock,
    'has_coverage',exists(select 1 from public.distributor_communes c where c.distributor_id=d.id and c.commune_code=p_commune_code),
    'has_available_driver',exists(select 1 from public.drivers driver join public.distributor_communes c on c.distributor_id=driver.distributor_id
      join public.profiles profile on profile.id=driver.id
      where driver.distributor_id=d.id and driver.is_verified and driver.is_available and profile.role='driver'
        and c.commune_code=p_commune_code and driver.id<>auth.uid()
        and not exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way'))),
    'service',jsonb_build_object('whatsapp',case when d.is_demo then null else settings.whatsapp end,
      'schedule',settings.schedule,'eta_min',settings.eta_min,'eta_max',settings.eta_max,'revision',coalesce(settings.revision,0))
  ) order by d.name,d.id),'[]'::jsonb)
    from public.distributor_products s join public.distributors d on d.id=s.distributor_id
    join public.products p on p.id=s.product_id and p.is_active
    join public.distributor_brands brand on brand.distributor_id=d.id and brand.brand=p.brand
    left join public.distributor_service_settings settings on settings.distributor_id=d.id
    where s.product_id=p_product_id and d.is_verified and s.is_listed and s.stock>=p_quantity
      and (case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end is null
        or case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity<=2147483647)
      );
end;
$function$;
CREATE OR REPLACE FUNCTION private.list_delivery_options(p_product_id uuid, p_commune_code text, p_quantity integer, p_exchange_empty boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid search' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'is_demo',d.is_demo,'request_id',gen_random_uuid(),
    'brands',(select jsonb_agg(b.brand order by b.brand) from public.distributor_brands b where b.distributor_id=d.id),
    'unit_price_clp',s.unit_price_clp,'price_without_exchange_clp',s.price_without_exchange_clp,
    'total_clp',case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity,
    'updated_at',s.updated_at,'stock',s.stock,
    'has_coverage',exists(select 1 from public.distributor_communes c where c.distributor_id=d.id and c.commune_code=p_commune_code),
    'has_available_driver',exists(select 1 from public.drivers driver join public.distributor_communes c on c.distributor_id=driver.distributor_id
      join public.profiles profile on profile.id=driver.id
      where driver.distributor_id=d.id and driver.is_verified and driver.is_available and profile.role='driver' and private.driver_can_deliver_product(driver.id,p_product_id)
        and c.commune_code=p_commune_code and driver.id<>auth.uid()
        and not exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way'))),
    'service',jsonb_build_object('whatsapp',case when d.is_demo then null else settings.whatsapp end,
      'schedule',settings.schedule,'eta_min',settings.eta_min,'eta_max',settings.eta_max,'revision',coalesce(settings.revision,0))
  ) order by d.name,d.id),'[]'::jsonb)
    from public.distributor_products s join public.distributors d on d.id=s.distributor_id
    join public.products p on p.id=s.product_id and p.is_active
    join public.distributor_brands brand on brand.distributor_id=d.id and brand.brand=p.brand
    left join public.distributor_service_settings settings on settings.distributor_id=d.id
    where s.product_id=p_product_id and d.is_verified and s.is_listed and s.stock>=p_quantity
      and (case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end is null
        or case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity<=2147483647)
      );
end;
$function$;

-- Explicit API allowlist. Private implementation helpers are not mobile APIs.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature,p.proname,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('private','public') and p.proname=any(array['is_document_admin','document_business','can_read_documents','is_vehicle_eligible','is_driver_eligible',
      'lock_document_owner','document_storage_access','submit_document','review_document','get_owner_documents','list_pending_documents',
      'set_driver_document_details','save_document_vehicle','set_vehicle_photo','guard_document_identity','assert_dispatch_documents','guard_dispatch_documents','delete_document_owner','complete_document_cleanup']) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
    if f.proname=any(array['is_document_admin','can_read_documents','document_storage_access','submit_document','review_document','get_owner_documents','list_pending_documents','set_driver_document_details','save_document_vehicle','set_vehicle_photo','delete_document_owner'])
      or (f.nspname='public' and f.proname in ('is_vehicle_eligible','is_driver_eligible')) then
      execute format('grant execute on function %s to authenticated',f.signature);
    end if;
    if f.proname='complete_document_cleanup' then execute format('grant execute on function %s to service_role',f.signature); end if;
  end loop;
end; $$;
commit;
