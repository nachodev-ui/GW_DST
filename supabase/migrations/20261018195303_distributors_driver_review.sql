begin;

-- Organizations are independent of the customer's/driver's mobile role.
create table public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.distributor_members (
  distributor_id uuid not null references public.distributors(id),
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('owner', 'manager')),
  primary key (distributor_id, user_id)
);
create index distributor_members_user_idx on public.distributor_members (user_id);
alter table public.drivers add column distributor_id uuid references public.distributors(id);
create index drivers_distributor_idx on public.drivers (distributor_id);

-- An application records an onboarding decision, not ongoing operational access.
create table public.driver_applications (
  driver_id uuid primary key references public.drivers(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_reason text check (char_length(btrim(decision_reason)) between 1 and 500),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status <> 'pending' or (decision_reason is null and reviewed_at is null))
);
-- Preserve existing access without inventing an organization or historical reviewer.
insert into public.driver_applications (driver_id, status, requested_at)
select id, case when is_verified then 'approved' else 'pending' end, created_at
from public.drivers;

create table private.driver_application_reviews (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.driver_applications(driver_id),
  decision text not null check (decision in ('approved', 'rejected')),
  distributor_id uuid references public.distributors(id),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  operator_reference text not null check (char_length(btrim(operator_reference)) between 1 and 120),
  database_user text not null default session_user,
  created_at timestamptz not null default now(),
  check ((decision = 'approved') = (distributor_id is not null))
);

alter table public.distributors enable row level security;
alter table public.distributor_members enable row level security;
alter table public.driver_applications enable row level security;
alter table private.driver_application_reviews enable row level security;
revoke all on public.distributors, public.distributor_members, public.driver_applications,
  private.driver_application_reviews from public, anon, authenticated, service_role;
revoke all on sequence private.driver_application_reviews_id_seq from public, anon, authenticated, service_role;
grant select on public.distributors, public.distributor_members, public.driver_applications to authenticated;

create policy distributor_members_read_self on public.distributor_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy distributors_read_affiliated on public.distributors for select to authenticated
  using (exists (select 1 from public.distributor_members m
    where m.distributor_id = distributors.id and m.user_id = (select auth.uid()))
    or exists (select 1 from public.drivers d
      where d.distributor_id = distributors.id and d.id = (select auth.uid())));
create policy driver_applications_read_self on public.driver_applications for select to authenticated
  using (driver_id = (select auth.uid()));

create or replace function private.request_driver_access() returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.drivers (id, is_verified, is_available)
    values (caller, false, false) on conflict (id) do nothing;
  -- Same lock order as review, so a retry cannot overwrite a decision.
  perform 1 from public.drivers where id = caller for update;
  insert into public.driver_applications (driver_id, status)
    select id, case when is_verified then 'approved' else 'pending' end
    from public.drivers where id = caller
    on conflict (driver_id) do nothing;
end;
$$;
revoke all on function private.request_driver_access() from public, anon, authenticated;
grant execute on function private.request_driver_access() to authenticated;

-- SQL Editor only. The operator reference is audit context, never authorization.
-- INVOKER: this function cannot elevate a mobile or service-role caller.
create function private.review_driver_application(
  p_driver_id uuid, p_decision text, p_distributor_id uuid,
  p_reason text, p_operator_reference text
) returns void
language plpgsql security invoker set search_path = '' as $$
declare application_status text;
begin
  if p_decision is null or p_decision not in ('approved', 'rejected')
    or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500
    or p_operator_reference is null or char_length(btrim(p_operator_reference)) not between 1 and 120
    or (p_decision = 'approved') <> (p_distributor_id is not null) then
    raise exception 'Invalid review input' using errcode = '22023';
  end if;
  perform 1 from public.drivers where id = p_driver_id for update;
  if not found then raise exception 'Driver application required' using errcode = '55000'; end if;
  select status into application_status from public.driver_applications
    where driver_id = p_driver_id for update;
  if application_status is distinct from 'pending' then
    raise exception 'Application is not pending' using errcode = '55000';
  end if;
  if exists (select 1 from public.drivers where id = p_driver_id and is_verified)
    or exists (select 1 from public.orders where driver_id = p_driver_id
      and status in ('accepted', 'on_the_way')) then
    raise exception 'Review cannot revoke an operational driver' using errcode = '55000';
  end if;
  if p_decision = 'approved' then
    perform 1 from public.distributors where id = p_distributor_id and is_verified for update;
    if not found then raise exception 'Verified distributor required' using errcode = '55000'; end if;
  end if;
  update public.drivers set is_verified = (p_decision = 'approved'),
    is_available = false, distributor_id = p_distributor_id where id = p_driver_id;
  update public.profiles set role = case when p_decision = 'approved'
    then 'driver'::public.profile_role else 'customer'::public.profile_role end where id = p_driver_id;
  update public.driver_applications set status = p_decision, decision_reason = btrim(p_reason),
    reviewed_at = now() where driver_id = p_driver_id;
  insert into private.driver_application_reviews
    (driver_id, decision, distributor_id, reason, operator_reference)
    values (p_driver_id, p_decision, p_distributor_id, btrim(p_reason), btrim(p_operator_reference));
end;
$$;
revoke all on function private.review_driver_application(uuid, text, uuid, text, text)
  from public, anon, authenticated, service_role;

comment on column public.drivers.is_verified is
  'Current operational approval. false alone does not distinguish pending/rejected applications.';
comment on column public.drivers.distributor_id is
  'Single affiliation. NULL preserved for legacy drivers; new administrative approvals require a verified distributor.';

commit;
