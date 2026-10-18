begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create type public.profile_role as enum ('customer', 'driver');
create type public.gas_brand as enum ('Lipigas', 'Gasco', 'Abastible');
create type public.order_status as enum (
  'requested', 'offered', 'accepted', 'on_the_way', 'delivered', 'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'customer',
  display_name text check (char_length(display_name) between 1 and 100),
  rut text unique check (rut ~ '^[0-9]{7,8}-[0-9K]$'),
  commune_code text check (commune_code ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now()
);
comment on column public.profiles.rut is 'Normalized RUT; validate modulo-11 with zod at trusted input boundary.';
comment on column public.profiles.commune_code is 'Official CUT commune code, not free text; catalogue validation pending.';

create table public.drivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  is_verified boolean not null default false,
  is_available boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand public.gas_brand not null,
  weight_kg smallint not null check (weight_kg in (5, 11, 15, 45)),
  is_active boolean not null default true,
  unique (brand, weight_kg)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(id),
  product_id uuid not null references public.products(id),
  exchange_empty boolean not null,
  status public.order_status not null default 'requested',
  total_clp integer not null check (total_clp >= 0),
  currency text not null default 'CLP' check (currency = 'CLP'),
  payment_method text not null default 'cash_on_delivery'
    check (payment_method = 'cash_on_delivery'),
  delivery_address text not null check (char_length(delivery_address) between 1 and 300),
  commune_code text not null check (commune_code ~ '^[0-9]{5}$'),
  delivery_location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  check (driver_id is null or driver_id <> customer_id),
  check (status not in ('requested', 'offered') or driver_id is null),
  check (status not in ('accepted', 'on_the_way', 'delivered') or driver_id is not null),
  check ((driver_id is null) = (accepted_at is null)),
  check ((status = 'delivered') = (delivered_at is not null))
);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_driver_idx on public.orders (driver_id) where driver_id is not null;
create index orders_status_idx on public.orders (status);
create index orders_delivery_location_idx on public.orders using gist (delivery_location);
create unique index orders_one_active_per_driver_idx on public.orders (driver_id)
  where status in ('accepted', 'on_the_way');

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id),
  actor_id uuid references public.profiles(id),
  from_status public.order_status,
  to_status public.order_status not null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at, id);

create table public.driver_locations (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  recorded_at timestamptz not null default now()
);
create index driver_locations_geo_idx on public.driver_locations using gist (location);

-- Internal dispatch data. Only the trusted backend creates/renews offers.
-- A single order can be offered to multiple drivers; no PII is broadcast publicly.
create table private.order_offers (
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (order_id, driver_id)
);
create index order_offers_driver_idx on private.order_offers (driver_id, expires_at);

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.driver_locations enable row level security;
alter table private.order_offers enable row level security;

revoke all on public.profiles, public.drivers, public.products, public.orders,
  public.order_events, public.driver_locations from anon, authenticated;
revoke all on private.order_offers from public, anon, authenticated;
grant select on public.profiles, public.drivers, public.products, public.orders,
  public.order_events, public.driver_locations to authenticated;
grant update (display_name, rut, commune_code) on public.profiles to authenticated;
grant insert, update on public.driver_locations to authenticated;
grant all on public.profiles, public.drivers, public.products, public.orders,
  public.order_events, public.driver_locations, private.order_offers to service_role;
grant usage, select on sequence public.order_events_id_seq to service_role;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy drivers_read_self on public.drivers for select to authenticated
  using (id = (select auth.uid()));
create policy products_read_active on public.products for select to authenticated
  using (is_active);
create policy orders_read_participant on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or driver_id = (select auth.uid()));
create policy events_read_participant on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
    and (o.customer_id = (select auth.uid()) or o.driver_id = (select auth.uid()))));
create policy locations_read_participant on public.driver_locations for select to authenticated
  using (driver_id = (select auth.uid()) or exists (
    select 1 from public.orders o where o.driver_id = driver_locations.driver_id
      and o.customer_id = (select auth.uid()) and o.status in ('accepted', 'on_the_way')
  ));
create policy locations_insert_self on public.driver_locations for insert to authenticated
  with check (driver_id = (select auth.uid()) and exists (
    select 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = (select auth.uid()) and d.is_verified and p.role = 'driver'
  ));
create policy locations_update_self on public.driver_locations for update to authenticated
  using (driver_id = (select auth.uid()))
  with check (driver_id = (select auth.uid()) and exists (
    select 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = (select auth.uid()) and d.is_verified and p.role = 'driver'
  ));

-- Always start as customer; user-editable signup metadata cannot grant driver access.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.guard_order_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'requested' then
      raise exception 'Orders must start as requested' using errcode = '23514';
    end if;
  elsif new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('offered', 'cancelled')) or
      (old.status = 'offered' and new.status in ('accepted', 'cancelled')) or
      (old.status = 'accepted' and new.status in ('on_the_way', 'cancelled')) or
      (old.status = 'on_the_way' and new.status in ('delivered', 'cancelled'))
    ) then
      raise exception 'Invalid order transition' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.customer_id is distinct from old.customer_id
      or new.product_id is distinct from old.product_id
      or new.total_clp is distinct from old.total_clp
      or new.exchange_empty is distinct from old.exchange_empty then
      raise exception 'Order commercial terms are immutable' using errcode = '23514';
    end if;
    if new.driver_id is distinct from old.driver_id
      and not (old.status = 'offered' and new.status = 'accepted' and old.driver_id is null) then
      raise exception 'Driver assignment requires acceptance' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_order_transition() from public, anon, authenticated;
create trigger guard_order_transition before insert or update on public.orders
  for each row execute function private.guard_order_transition();

create function private.record_order_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, actor_id, to_status)
      values (new.id, auth.uid(), new.status);
  elsif old.status is distinct from new.status then
    insert into public.order_events (order_id, actor_id, from_status, to_status)
      values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$;
revoke all on function private.record_order_event() from public, anon, authenticated;
create trigger record_order_event after insert or update on public.orders
  for each row execute function private.record_order_event();

-- Privileged implementation kept outside API schemas. Auth identity is never an argument.
create function private.accept_order(p_order_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  accepted_id uuid;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Serialize this driver's attempts too, avoiding two simultaneous active orders.
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = caller and p.role = 'driver' and d.is_verified and d.is_available
    for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where driver_id = caller
    and status in ('accepted', 'on_the_way')) then
    raise exception 'Driver already has an active order' using errcode = '55000';
  end if;
  -- The predicate is rechecked under the row lock: exactly one competing driver wins.
  update public.orders o set
    driver_id = caller, status = 'accepted', accepted_at = now()
  where o.id = p_order_id and o.status = 'offered' and o.driver_id is null
    and o.customer_id <> caller
    and exists (select 1 from private.order_offers f
      where f.order_id = o.id and f.driver_id = caller and f.expires_at > clock_timestamp())
  returning o.id into accepted_id;
  if accepted_id is null then
    raise exception 'Order unavailable or offer expired' using errcode = '55000';
  end if;
  update public.drivers set is_available = false where id = caller;
  return accepted_id;
end;
$$;
revoke all on function private.accept_order(uuid) from public, anon, authenticated;
grant execute on function private.accept_order(uuid) to authenticated;

-- API wrapper does not gain privileges itself. Same checks apply through either entry.
create function public.accept_order(p_order_id uuid) returns uuid
language sql security invoker set search_path = '' as $$
  select private.accept_order(p_order_id);
$$;
revoke all on function public.accept_order(uuid) from public, anon, authenticated;
grant execute on function public.accept_order(uuid) to authenticated;

-- Publication uses SELECT RLS. Do not publish private offers, profiles or location history.
alter publication supabase_realtime add table public.orders, public.order_events,
  public.driver_locations;

commit;
