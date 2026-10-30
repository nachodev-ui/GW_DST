begin;

-- Preserve the public RPC contract; privileged reads and authorization live in private.
create function private.get_vehicle_eligibility(p_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_read_documents('vehicle',p_id) then
    raise exception 'Document access denied' using errcode='42501';
  end if;
  return private.is_vehicle_eligible(p_id);
end; $$;

create function private.get_driver_eligibility(p_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or (not private.can_read_documents('driver',p_id)
    and p_id is distinct from auth.uid()) then
    raise exception 'Document access denied' using errcode='42501';
  end if;
  return private.is_driver_eligible(p_id);
end; $$;

create or replace function public.is_vehicle_eligible(p_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.get_vehicle_eligibility(p_id);
$$;
create or replace function public.is_driver_eligible(p_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.get_driver_eligibility(p_id);
$$;

revoke all on function private.get_vehicle_eligibility(uuid),private.get_driver_eligibility(uuid),
  public.is_vehicle_eligible(uuid),public.is_driver_eligible(uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.get_vehicle_eligibility(uuid),private.get_driver_eligibility(uuid),
  public.is_vehicle_eligible(uuid),public.is_driver_eligible(uuid) to authenticated;
-- Internal dispatch predicates remain inaccessible to mobile roles.
revoke all on function private.is_vehicle_eligible(uuid),private.is_driver_eligible(uuid)
  from public,anon,authenticated,service_role;

commit;
