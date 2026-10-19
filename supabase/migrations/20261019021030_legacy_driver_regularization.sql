begin;

-- Evidence for a one-off administrative repair, never a mobile onboarding API.
create table private.legacy_driver_regularizations (
  driver_id uuid primary key references public.drivers(id),
  previous_application jsonb not null,
  previous_role public.profile_role not null,
  previous_verified boolean not null,
  previous_available boolean not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  operator_reference text not null check (char_length(btrim(operator_reference)) between 1 and 120),
  database_user text not null default session_user,
  created_at timestamptz not null default clock_timestamp()
);
alter table private.legacy_driver_regularizations enable row level security;
revoke all on private.legacy_driver_regularizations from public,anon,authenticated,service_role;

commit;
