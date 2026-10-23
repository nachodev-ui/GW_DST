begin;

-- Nullable for existing profiles and direct technical signups. No uniqueness:
-- a contact number may belong to more than one household member.
alter table public.profiles add column phone text
  constraint profiles_phone_e164 check (phone ~ '^\+[1-9][0-9]{1,14}$');
comment on column public.profiles.phone is
  'Private, unverified E.164 contact number; not an Auth identity or authorization claim.';

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  contact_phone text;
begin
  if new.raw_user_meta_data ? 'phone' then
    if jsonb_typeof(new.raw_user_meta_data->'phone') is distinct from 'string' then
      raise exception 'Invalid contact phone' using errcode = '23514';
    end if;
    contact_phone := new.raw_user_meta_data->>'phone';
    if contact_phone !~ '^\+[1-9][0-9]{1,14}$' then
      raise exception 'Invalid contact phone' using errcode = '23514';
    end if;
  end if;
  -- Contact metadata is input only; role and driver approval remain server-owned.
  insert into public.profiles (id, role, phone) values (new.id, 'customer', contact_phone);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- Existing self-read/self-update RLS and column grants remain in force.
-- Only the added phone column receives a new write grant.
revoke update (phone) on public.profiles from public, anon;
grant update (phone) on public.profiles to authenticated;

commit;
