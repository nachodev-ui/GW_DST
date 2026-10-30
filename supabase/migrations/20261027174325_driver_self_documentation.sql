begin;
-- Drivers own their personal uploads; business members retain read-only follow-up.
create or replace function private.can_read_documents(p_owner_type text,p_owner_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    private.is_document_admin()
    or (p_owner_type='driver' and p_owner_id=auth.uid()
      and exists(select 1 from public.drivers where id=auth.uid()))
    or exists(select 1 from public.distributor_members
      where user_id=auth.uid() and distributor_id=private.document_business(p_owner_type,p_owner_id))
  );
$$;

create or replace function private.document_storage_access(p_bucket text,p_name text,p_write boolean) returns boolean
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
    -- Authorize before acquiring locks; a member who is also a driver still writes only their own license.
    if parts[2]='driver' then
      if owner_id is distinct from auth.uid() then return false; end if;
    elsif not exists(select 1 from public.distributor_members
      where distributor_id=business_id and user_id=auth.uid()) then return false; end if;
    perform private.lock_document_owner(parts[2],owner_id);
    if private.document_business(parts[2],owner_id) is distinct from business_id then return false; end if;
    return exists(select 1 from public.distributors where id=business_id and is_verified);
  end if;
  return private.can_read_documents(parts[2],owner_id);
end; $$;

create or replace function private.set_driver_document_details(p_driver_id uuid,p_rut text,p_license_class text) returns void
language plpgsql security definer set search_path='' as $$
declare business_id uuid; canonical text:=upper(regexp_replace(p_rut,'[.[:space:]]','','g'));
begin
  if auth.uid() is null or p_driver_id is distinct from auth.uid() then
    raise exception 'Only the driver can edit their license details' using errcode='42501'; end if;
  business_id:=private.lock_document_owner('driver',p_driver_id);
  if not exists(select 1 from public.distributors where id=business_id and is_verified) then
    raise exception 'Business is not enabled' using errcode='42501'; end if;
  if canonical is null or not private.is_valid_rut(canonical) or p_license_class is null or p_license_class not in ('B','A2_legacy','A4','A5') then
    raise exception 'Invalid driver document details' using errcode='22023'; end if;
  update public.driver_applications set applicant_rut=canonical where driver_id=p_driver_id;
  if not found then raise exception 'Driver application required' using errcode='55000'; end if;
  update public.drivers set license_class=p_license_class where id=p_driver_id;
end; $$;

-- Replacements preserve existing wrappers/grants. Reassert the internal ACL explicitly.
revoke all on function private.can_read_documents(text,uuid) from public,anon;
revoke all on function private.document_storage_access(text,text,boolean) from public,anon;
revoke all on function private.set_driver_document_details(uuid,text,text) from public,anon;
grant execute on function private.can_read_documents(text,uuid) to authenticated;
grant execute on function private.document_storage_access(text,text,boolean) to authenticated;
grant execute on function private.set_driver_document_details(uuid,text,text) to authenticated;
commit;
