begin;
-- Replace the new, not-yet-integrated one-argument endpoint with an explicit version.
drop function public.confirm_driver_affiliation(uuid);
drop function private.confirm_driver_affiliation(uuid);
create function private.confirm_driver_affiliation(p_driver_id uuid,p_requested_at timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); application public.driver_applications;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  perform 1 from public.drivers where id=p_driver_id for update;
  select * into application from public.driver_applications where driver_id=p_driver_id for update;
  if not exists(select 1 from public.distributor_members where user_id=caller
    and distributor_id=application.requested_distributor_id) then
    raise exception 'Distributor membership required' using errcode='42501';
  end if;
  if p_requested_at is null or application.requested_at is distinct from p_requested_at then
    raise exception 'Application version changed' using errcode='55000';end if;
  if application.status is distinct from 'pending' or application.applicant_name is null then
    raise exception 'Complete pending application required' using errcode='55000';end if;
  perform 1 from public.distributors where id=application.requested_distributor_id and is_verified for share;
  if not found then raise exception 'Verified distributor required' using errcode='55000';end if;
  perform 1 from public.distributor_members where user_id=caller
    and distributor_id=application.requested_distributor_id for share;
  if not found then raise exception 'Distributor membership changed' using errcode='42501';end if;
  insert into public.driver_affiliation_confirmations(driver_id,application_requested_at,distributor_id,confirmed_by)
    values(p_driver_id,application.requested_at,application.requested_distributor_id,caller)
    on conflict(driver_id,application_requested_at) do nothing;
end;
$$;
create function public.confirm_driver_affiliation(p_driver_id uuid,p_requested_at timestamptz) returns void
language sql security invoker set search_path='' as $$
  select private.confirm_driver_affiliation(p_driver_id,p_requested_at);
$$;
revoke all on function private.confirm_driver_affiliation(uuid,timestamptz),public.confirm_driver_affiliation(uuid,timestamptz)
  from public,anon,authenticated,service_role;
grant execute on function private.confirm_driver_affiliation(uuid,timestamptz),public.confirm_driver_affiliation(uuid,timestamptz)
  to authenticated;
commit;
