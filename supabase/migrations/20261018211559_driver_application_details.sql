begin;

create function private.is_valid_rut(p_rut text) returns boolean
language plpgsql immutable strict set search_path = '' as $$
declare body text; total integer := 0; factor integer := 2; remainder integer;
begin
  if p_rut !~ '^[0-9]{7,8}-[0-9K]$' then return false; end if;
  body := split_part(p_rut, '-', 1);
  if body::bigint = 0 then return false; end if;
  for digit_index in reverse char_length(body)..1 loop
    total := total + substr(body, digit_index, 1)::integer * factor;
    factor := case when factor = 7 then 2 else factor + 1 end;
  end loop;
  remainder := 11 - total % 11;
  return split_part(p_rut, '-', 2) = case remainder when 11 then '0' when 10 then 'K' else remainder::text end;
end;
$$;
revoke all on function private.is_valid_rut(text) from public, anon, authenticated, service_role;

alter table public.distributors add column accepts_driver_applications boolean not null default false;
alter table public.driver_applications
  add column applicant_name text check (char_length(btrim(applicant_name)) between 2 and 100),
  add column applicant_rut text check (private.is_valid_rut(applicant_rut)),
  add column applicant_phone text check (applicant_phone ~ '^\+56[2-9][0-9]{8}$'),
  add column requested_distributor_id uuid references public.distributors(id),
  add column requested_distributor_name text,
  add constraint application_details_complete check (
    (applicant_name is null and applicant_rut is null and applicant_phone is null
      and requested_distributor_id is null and requested_distributor_name is null)
    or (applicant_name is not null and applicant_rut is not null and applicant_phone is not null
      and requested_distributor_id is not null and requested_distributor_name is not null)
  );
create index driver_applications_distributor_idx on public.driver_applications(requested_distributor_id);
alter table private.driver_application_reviews add column application_snapshot jsonb;

-- Minimal opt-in directory. Full organization rows and members remain private.
create function private.list_application_distributors() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id), '[]'::jsonb)
    from public.distributors where is_verified and accepts_driver_applications);
end;
$$;
create function public.list_application_distributors() returns jsonb
language sql security invoker set search_path = '' as $$ select private.list_application_distributors(); $$;

create function private.submit_driver_application(
  p_name text, p_rut text, p_phone text, p_distributor_id uuid, p_reapply boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  application public.driver_applications;
  organization_name text;
  canonical_rut text := upper(regexp_replace(p_rut, '[.[:space:]]', '', 'g'));
  canonical_phone text := regexp_replace(p_phone, '[-()[:space:]]', '', 'g');
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if canonical_phone ~ '^[2-9][0-9]{8}$' then canonical_phone := '+56' || canonical_phone; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or canonical_rut is null or not private.is_valid_rut(canonical_rut)
    or canonical_phone is null or canonical_phone !~ '^\+56[2-9][0-9]{8}$'
    or p_distributor_id is null or p_reapply is null then
    raise exception 'Invalid application details' using errcode = '22023';
  end if;
  insert into public.drivers(id) values(caller) on conflict(id) do nothing;
  perform 1 from public.drivers where id=caller for update;
  if exists(select 1 from public.drivers where id=caller and is_verified)
    or not exists(select 1 from public.profiles where id=caller and role='customer')
    or exists(select 1 from public.orders where driver_id=caller and status in ('accepted','on_the_way')) then
    raise exception 'Driver cannot apply' using errcode = '55000';
  end if;
  select * into application from public.driver_applications where driver_id=caller for update;
  if application.status='pending' and application.applicant_name is not null then
    if application.applicant_name=btrim(p_name) and application.applicant_rut=canonical_rut
      and application.applicant_phone=canonical_phone and application.requested_distributor_id=p_distributor_id then
      return; -- Idempotent retry; do not change requested_at or an in-review application.
    end if;
    raise exception 'Application already in review' using errcode = '55000';
  end if;
  if application.status='approved' or (application.status='rejected' and not p_reapply)
    or (application.driver_id is null and p_reapply) then
    raise exception 'Application state changed' using errcode = '55000';
  end if;
  select name into organization_name from public.distributors
    where id=p_distributor_id and is_verified and accepts_driver_applications for share;
  if not found then raise exception 'Distributor is not accepting applications' using errcode = 'GW003'; end if;
  insert into public.driver_applications(driver_id, applicant_name, applicant_rut, applicant_phone,
    requested_distributor_id, requested_distributor_name)
    values(caller,btrim(p_name),canonical_rut,canonical_phone,p_distributor_id,organization_name)
    on conflict(driver_id) do update set applicant_name=excluded.applicant_name,
      applicant_rut=excluded.applicant_rut,applicant_phone=excluded.applicant_phone,
      requested_distributor_id=excluded.requested_distributor_id,
      requested_distributor_name=excluded.requested_distributor_name,
      status='pending',decision_reason=null,reviewed_at=null,requested_at=clock_timestamp();
  update public.drivers set is_available=false where id=caller;
end;
$$;
create function public.submit_driver_application(
  p_name text, p_rut text, p_phone text, p_distributor_id uuid, p_reapply boolean
) returns void language sql security invoker set search_path = '' as $$
  select private.submit_driver_application(p_name,p_rut,p_phone,p_distributor_id,p_reapply);
$$;
revoke all on function private.list_application_distributors(),public.list_application_distributors(),
  private.submit_driver_application(text,text,text,uuid,boolean),public.submit_driver_application(text,text,text,uuid,boolean)
  from public,anon,authenticated,service_role;
grant execute on function private.list_application_distributors(),public.list_application_distributors(),
  private.submit_driver_application(text,text,text,uuid,boolean),public.submit_driver_application(text,text,text,uuid,boolean)
  to authenticated;

-- Existing SQL-only review cannot assign a different business than the applicant chose.
create function private.guard_application_approval_details() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    if new.applicant_name is null or new.requested_distributor_id is null
      or not exists(select 1 from public.drivers where id=new.driver_id
        and distributor_id=new.requested_distributor_id and is_verified) then
      raise exception 'Complete application and matching distributor required' using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_application_approval_details before update on public.driver_applications
  for each row execute function private.guard_application_approval_details();

create function private.capture_application_review_details() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  select jsonb_build_object('name',applicant_name,'rut',applicant_rut,'phone',applicant_phone,
    'distributor_id',requested_distributor_id,'distributor_name',requested_distributor_name,'requested_at',requested_at)
    into new.application_snapshot from public.driver_applications where driver_id=new.driver_id;
  return new;
end;
$$;
create trigger capture_application_review_details before insert on private.driver_application_reviews
  for each row execute function private.capture_application_review_details();
revoke all on function private.guard_application_approval_details(),private.capture_application_review_details()
  from public,anon,authenticated,service_role;

commit;
