begin;

-- Keep registration independent of user-editable metadata and repair missing profiles.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role) values (new.id, 'customer');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

insert into public.profiles (id, role)
select id, 'customer'::public.profile_role from auth.users
on conflict (id) do nothing;

-- Existing false/true verification is the pending/approved source of truth.
comment on column public.drivers.is_verified is
  'false = pending approval; true = approved. Server-managed only.';
revoke insert, update, delete on public.drivers from public, anon, authenticated;
revoke insert, delete on public.profiles from public, anon, authenticated;
revoke update on public.profiles from public, anon, authenticated;
grant update (display_name, rut, commune_code) on public.profiles to authenticated;

create function private.request_driver_access() returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- The caller cannot supply an identity, role, approval or availability.
  insert into public.drivers (id, is_verified, is_available)
  values (caller, false, false)
  on conflict (id) do nothing;
end;
$$;
revoke all on function private.request_driver_access() from public, anon, authenticated;
grant execute on function private.request_driver_access() to authenticated;

create function public.request_driver_access() returns void
language sql security invoker set search_path = '' as $$
  select private.request_driver_access();
$$;
revoke all on function public.request_driver_access() from public, anon, authenticated;
grant execute on function public.request_driver_access() to authenticated;

-- Existing self-read RLS remains in force; there is no client approval endpoint.
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;

commit;
