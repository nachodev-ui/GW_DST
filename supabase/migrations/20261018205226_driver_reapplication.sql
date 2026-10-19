begin;

-- Explicit retry only: normal request_driver_access() still preserves rejections.
create function private.reapply_driver_access() returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  application_status text;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Match review/dispatch lock order. Never grant role, verification or affiliation.
  perform 1 from public.drivers where id = caller for update;
  if not found then raise exception 'Driver application required' using errcode = '55000'; end if;
  if exists (select 1 from public.drivers where id = caller and is_verified)
    or not exists (select 1 from public.profiles where id = caller and role = 'customer')
    or exists (select 1 from public.orders where driver_id = caller
      and status in ('accepted', 'on_the_way')) then
    raise exception 'Driver cannot reapply' using errcode = '55000';
  end if;
  select status into application_status from public.driver_applications
    where driver_id = caller for update;
  if application_status = 'pending' then return; end if;
  if application_status is distinct from 'rejected' then
    raise exception 'Rejected application required' using errcode = '55000';
  end if;
  -- Earlier decisions remain immutable in private.driver_application_reviews.
  update public.driver_applications set status = 'pending', decision_reason = null,
    reviewed_at = null, requested_at = clock_timestamp() where driver_id = caller;
  update public.drivers set is_available = false where id = caller;
end;
$$;

create function public.reapply_driver_access() returns void
language sql security invoker set search_path = '' as $$
  select private.reapply_driver_access();
$$;
revoke all on function private.reapply_driver_access(), public.reapply_driver_access()
  from public, anon, authenticated, service_role;
grant execute on function private.reapply_driver_access(), public.reapply_driver_access()
  to authenticated;

commit;
