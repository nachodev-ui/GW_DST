begin;

-- Commercial scope is configured per business; exclusivity is not universal.
create table public.distributor_brands (
  distributor_id uuid not null references public.distributors(id),
  brand public.gas_brand not null,
  primary key(distributor_id,brand)
);
create table public.driver_affiliation_confirmations (
  driver_id uuid not null references public.driver_applications(driver_id),
  application_requested_at timestamptz not null,
  distributor_id uuid not null references public.distributors(id),
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  primary key(driver_id,application_requested_at)
);
create index affiliation_confirmations_distributor_idx on public.driver_affiliation_confirmations(distributor_id);
create index affiliation_confirmations_actor_idx on public.driver_affiliation_confirmations(confirmed_by);
alter table public.distributor_brands enable row level security;
alter table public.driver_affiliation_confirmations enable row level security;
revoke all on public.distributor_brands,public.driver_affiliation_confirmations from public,anon,authenticated,service_role;
grant select on public.distributor_brands,public.driver_affiliation_confirmations to authenticated;
create policy distributor_brands_read_affiliated on public.distributor_brands for select to authenticated
  using(exists(select 1 from public.distributor_members m where m.distributor_id=distributor_brands.distributor_id and m.user_id=(select auth.uid()))
    or exists(select 1 from public.drivers d where d.distributor_id=distributor_brands.distributor_id and d.id=(select auth.uid())));
create policy affiliation_confirmations_read_participant on public.driver_affiliation_confirmations for select to authenticated
  using(driver_id=(select auth.uid()) or exists(select 1 from public.distributor_members m
    where m.distributor_id=driver_affiliation_confirmations.distributor_id and m.user_id=(select auth.uid())));

create function private.list_distributor_driver_applications() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  return(select coalesce(jsonb_agg(jsonb_build_object('driver_id',a.driver_id,'name',a.applicant_name,
    'requested_at',a.requested_at,'distributor_id',a.requested_distributor_id,
    'affiliation_confirmed',exists(select 1 from public.driver_affiliation_confirmations c
      where c.driver_id=a.driver_id and c.application_requested_at=a.requested_at
        and c.distributor_id=a.requested_distributor_id)) order by a.requested_at,a.driver_id),'[]'::jsonb)
    from public.driver_applications a join public.distributor_members m
      on m.distributor_id=a.requested_distributor_id and m.user_id=auth.uid()
    join public.distributors d on d.id=m.distributor_id
    where a.status='pending' and a.applicant_name is not null and d.is_verified);
end;
$$;
create function public.list_distributor_driver_applications() returns jsonb
language sql security invoker set search_path='' as $$ select private.list_distributor_driver_applications(); $$;

create function private.confirm_driver_affiliation(p_driver_id uuid) returns void
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
create function public.confirm_driver_affiliation(p_driver_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.confirm_driver_affiliation(p_driver_id); $$;
revoke all on function private.list_distributor_driver_applications(),public.list_distributor_driver_applications(),
  private.confirm_driver_affiliation(uuid),public.confirm_driver_affiliation(uuid) from public,anon,authenticated,service_role;
grant execute on function private.list_distributor_driver_applications(),public.list_distributor_driver_applications(),
  private.confirm_driver_affiliation(uuid),public.confirm_driver_affiliation(uuid) to authenticated;

create or replace function private.guard_application_approval_details() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    if new.applicant_name is null or new.requested_distributor_id is null
      or not exists(select 1 from public.drivers where id=new.driver_id
        and distributor_id=new.requested_distributor_id and is_verified)
      or not exists(select 1 from public.driver_affiliation_confirmations c
        where c.driver_id=new.driver_id and c.application_requested_at=new.requested_at
          and c.distributor_id=new.requested_distributor_id) then
      raise exception 'Complete application and distributor confirmation required' using errcode='55000';
    end if;
  end if;
  return new;
end;
$$;

-- A new application has a new requested_at; a prior confirmation cannot authorize it.
create function private.capture_affiliation_in_review() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.application_snapshot:=coalesce(new.application_snapshot,'{}'::jsonb)||jsonb_build_object(
    'affiliation_confirmation',(select to_jsonb(c) from public.driver_affiliation_confirmations c
      join public.driver_applications a on a.driver_id=c.driver_id
      where a.driver_id=new.driver_id and c.application_requested_at=a.requested_at
        and c.distributor_id=a.requested_distributor_id));
  return new;
end;
$$;
-- PostgreSQL runs same-event triggers alphabetically: capture details first.
create trigger capture_review_affiliation before insert on private.driver_application_reviews
  for each row execute function private.capture_affiliation_in_review();
revoke all on function private.capture_affiliation_in_review() from public,anon,authenticated,service_role;

create function private.driver_can_deliver_product(p_driver_id uuid,p_product_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.drivers d join public.profiles p on p.id=d.id
    join public.distributors organization on organization.id=d.distributor_id
    join public.distributor_brands b on b.distributor_id=organization.id
    join public.products product on product.brand=b.brand
    where d.id=p_driver_id and product.id=p_product_id and d.is_verified
      and p.role='driver' and organization.is_verified);
$$;
revoke all on function private.driver_can_deliver_product(uuid,uuid) from public,anon,authenticated,service_role;

alter table public.orders add column distributor_id uuid references public.distributors(id);
create index orders_distributor_idx on public.orders(distributor_id);
create function private.guard_order_distributor() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.distributor_id is not null then raise exception 'Distributor set on acceptance only' using errcode='23514';end if;
  elsif old.distributor_id is distinct from new.distributor_id then
    raise exception 'Order distributor is immutable' using errcode='23514';
  end if;
  if tg_op='UPDATE' and old.driver_id is null and new.driver_id is not null then
    select distributor_id into new.distributor_id from public.drivers where id=new.driver_id;
    if new.distributor_id is null then raise exception 'Driver distributor required' using errcode='55000';end if;
  end if;
  return new;
end;
$$;
create trigger guard_order_distributor before insert or update on public.orders
  for each row execute function private.guard_order_distributor();
revoke all on function private.guard_order_distributor() from public,anon,authenticated,service_role;
create or replace function private.set_driver_settings(p_is_available boolean, p_commune_codes text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = caller and d.is_verified and p.role = 'driver' for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  if p_is_available is null or p_commune_codes is null
    or cardinality(p_commune_codes) > 346
    or (p_is_available and cardinality(p_commune_codes) = 0)
    or exists (select 1 from unnest(p_commune_codes) c(code)
      where c.code is null or not exists (select 1 from public.communes where code = c.code)) then
    raise exception 'Invalid coverage' using errcode = '22023';
  end if;
  if p_is_available and not exists(select 1 from public.drivers d
    join public.distributors organization on organization.id=d.distributor_id
    join public.distributor_brands b on b.distributor_id=organization.id
    where d.id=caller and organization.is_verified) then
    raise exception 'Verified distributor and configured brands required' using errcode='42501';
  end if;
  if p_is_available and exists (select 1 from public.orders where driver_id = caller
    and status in ('accepted', 'on_the_way')) then
    raise exception 'Driver already has an active order' using errcode = '55000';
  end if;
  delete from public.driver_communes where driver_id = caller;
  insert into public.driver_communes (driver_id, commune_code)
    select caller, code from unnest(p_commune_codes) c(code) group by code;
  update public.drivers set is_available = p_is_available where id = caller;
  -- Invalidate removed coverage without deleting/reissuing rejected offers.
  update private.order_offers f set expires_at = clock_timestamp()
    where f.driver_id = caller and f.expires_at > clock_timestamp()
      and (not p_is_available or not exists (select 1 from public.orders o
        where o.id = f.order_id and o.commune_code = any(p_commune_codes)));
  return public.get_driver_settings();
end;
$$;

create or replace function private.dispatch_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target public.orders;
begin
  select * into target from public.orders where id = p_order_id for update;
  if not found or target.status not in ('requested', 'offered') or target.driver_id is not null then
    return;
  end if;
  insert into private.order_offers (order_id, driver_id, expires_at)
    select target.id, d.id, clock_timestamp() + interval '60 seconds'
    from public.drivers d join public.profiles p on p.id = d.id
      join public.driver_communes c on c.driver_id = d.id and c.commune_code = target.commune_code
    where private.driver_can_deliver_product(d.id, target.product_id) and d.is_verified and d.is_available and p.role = 'driver' and d.id <> target.customer_id
      and not exists (select 1 from public.orders active where active.driver_id = d.id
        and active.status in ('accepted', 'on_the_way'))
    on conflict (order_id, driver_id) do nothing;
  if target.status = 'requested' and exists (select 1 from private.order_offers
    where order_id = target.id and expires_at > clock_timestamp()) then
    update public.orders set status = 'offered' where id = target.id;
  end if;
end;
$$;

create or replace function private.list_driver_offers() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg, 'variant', p.variant,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty,
    'commune_code', o.commune_code, 'commune_name', c.name,
    'total_clp', o.total_clp, 'expires_at', f.expires_at
  ) order by f.expires_at, o.id), '[]'::jsonb)
  from private.order_offers f join public.orders o on o.id = f.order_id
    join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = f.driver_id
    join public.profiles profile on profile.id = d.id
  where private.driver_can_deliver_product(d.id, o.product_id) and f.driver_id = auth.uid() and d.is_verified and d.is_available and profile.role = 'driver'
    and f.expires_at > clock_timestamp() and o.status = 'offered' and o.driver_id is null
    and exists (select 1 from public.driver_communes coverage
      where coverage.driver_id = d.id and coverage.commune_code = o.commune_code);
$$;

create or replace function private.accept_order(p_order_id uuid) returns uuid
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
  -- Lock commercial eligibility until assignment completes, including brand revocation.
  perform 1 from public.orders o join public.products product on product.id=o.product_id
    join public.drivers d on d.id=caller
    join public.distributors organization on organization.id=d.distributor_id
    join public.distributor_brands b on b.distributor_id=organization.id and b.brand=product.brand
    where o.id=p_order_id and organization.is_verified for share of organization,b;
  if not found then raise exception 'Distributor cannot deliver this brand' using errcode='42501';end if;
  -- The predicate is rechecked under the row lock: exactly one competing driver wins.
  update public.orders o set
    driver_id = caller, status = 'accepted', accepted_at = now()
  where o.id = p_order_id and o.status = 'offered' and o.driver_id is null
    and o.customer_id <> caller
    and private.driver_can_deliver_product(caller, o.product_id)
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

commit;
