begin;
-- An identical pending payload is also a safe retry of a resubmission after rejection.
create or replace function private.submit_distributor_application(
  p_name text,p_rut text,p_contact_name text,p_phone text,p_address text,p_commune_code text,
  p_brands text[],p_commercial_evidence text,p_storage_evidence text,p_reapply boolean
) returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); application public.distributor_applications; next_request timestamptz;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  p_name:=btrim(p_name);p_contact_name:=btrim(p_contact_name);p_address:=btrim(p_address);
  p_commercial_evidence:=btrim(p_commercial_evidence);p_storage_evidence:=btrim(p_storage_evidence);
  p_rut:=upper(regexp_replace(p_rut,'[.[:space:]]','','g'));
  p_phone:=regexp_replace(p_phone,'[[:space:]()-]','','g');
  if p_phone ~ '^[2-9][0-9]{8}$' then p_phone:='+56'||p_phone;end if;
  if p_name is null or char_length(p_name) not between 2 and 120
    or p_contact_name is null or char_length(p_contact_name) not between 2 and 100
    or p_rut is null or not private.is_valid_rut(p_rut)
    or p_phone is null or p_phone !~ '^\+56[2-9][0-9]{8}$'
    or p_address is null or char_length(p_address) not between 5 and 240
    or p_commune_code is null or not exists(select 1 from public.communes where code=p_commune_code)
    or p_brands is null or cardinality(p_brands) not between 1 and 3
    or not p_brands <@ array['Lipigas','Gasco','Abastible']::text[] or array_position(p_brands,null) is not null
    or cardinality(p_brands)<>(select count(distinct b) from unnest(p_brands) b)
    or p_commercial_evidence is null or char_length(p_commercial_evidence) not between 5 and 1000
    or p_storage_evidence is null or char_length(p_storage_evidence) not between 5 and 1000 or p_reapply is null then
    raise exception 'Invalid business details' using errcode='22023';end if;
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile required' using errcode='42501';end if;
  if exists(select 1 from public.distributor_members where user_id=caller) then
    raise exception 'Existing business member' using errcode='55000';end if;
  select * into application from public.distributor_applications where applicant_id=caller for update;
  if found then
    if application.status='pending' and
      row(application.name,application.rut,application.contact_name,application.phone,application.address,
        application.commune_code,application.brands,application.commercial_evidence,application.storage_evidence)
      is not distinct from row(p_name,p_rut,p_contact_name,p_phone,p_address,p_commune_code,p_brands,p_commercial_evidence,p_storage_evidence) then return;end if;
    if application.status<>'rejected' or not p_reapply then
      raise exception 'Application state changed' using errcode='55000';end if;
  elsif p_reapply then raise exception 'No rejected application' using errcode='55000';end if;
  next_request:=greatest(clock_timestamp(),application.requested_at+interval '1 microsecond');
  insert into public.distributor_applications(applicant_id,name,rut,contact_name,phone,address,commune_code,brands,commercial_evidence,storage_evidence,requested_at)
    values(caller,p_name,p_rut,p_contact_name,p_phone,p_address,p_commune_code,p_brands,p_commercial_evidence,p_storage_evidence,next_request)
    on conflict(applicant_id) do update set name=excluded.name,rut=excluded.rut,contact_name=excluded.contact_name,
      phone=excluded.phone,address=excluded.address,commune_code=excluded.commune_code,brands=excluded.brands,
      commercial_evidence=excluded.commercial_evidence,storage_evidence=excluded.storage_evidence,
      status='pending',requested_at=excluded.requested_at,reviewed_at=null,decision_reason=null;
end;
$$;
commit;
