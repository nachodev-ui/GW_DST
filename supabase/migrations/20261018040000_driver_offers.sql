begin;

-- is_available already exists; approval and profile role remain server-managed.
create table public.driver_communes (
  driver_id uuid not null references public.drivers(id) on delete cascade,
  commune_code text not null references public.communes(code),
  primary key (driver_id, commune_code)
);
create index driver_communes_dispatch_idx on public.driver_communes (commune_code, driver_id);
alter table public.driver_communes enable row level security;
revoke all on public.driver_communes from public, anon, authenticated;
grant select on public.driver_communes to authenticated;
grant all on public.driver_communes to service_role;
create policy driver_communes_read_self on public.driver_communes for select to authenticated
  using (driver_id = (select auth.uid()));

create function public.get_driver_settings() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('is_available', d.is_available, 'commune_codes',
    coalesce((select jsonb_agg(c.commune_code order by c.commune_code)
      from public.driver_communes c where c.driver_id = d.id), '[]'::jsonb))
  from public.drivers d where d.id = auth.uid();
$$;

create function private.set_driver_settings(p_is_available boolean, p_commune_codes text[]) returns jsonb
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
create function public.set_driver_settings(p_is_available boolean, p_commune_codes text[]) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.set_driver_settings(p_is_available, p_commune_codes);
$$;

-- Only create_order/the trusted operator can dispatch. No mobile EXECUTE grant.
create function private.dispatch_order(p_order_id uuid) returns void
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
    where d.is_verified and d.is_available and p.role = 'driver' and d.id <> target.customer_id
      and not exists (select 1 from public.orders active where active.driver_id = d.id
        and active.status in ('accepted', 'on_the_way'))
    on conflict (order_id, driver_id) do nothing;
  if target.status = 'requested' and exists (select 1 from private.order_offers
    where order_id = target.id and expires_at > clock_timestamp()) then
    update public.orders set status = 'offered' where id = target.id;
  end if;
end;
$$;

create function private.list_driver_offers() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty,
    'commune_code', o.commune_code, 'commune_name', c.name,
    'total_clp', o.total_clp, 'expires_at', f.expires_at
  ) order by f.expires_at, o.id), '[]'::jsonb)
  from private.order_offers f join public.orders o on o.id = f.order_id
    join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = f.driver_id
    join public.profiles profile on profile.id = d.id
  where f.driver_id = auth.uid() and d.is_verified and d.is_available and profile.role = 'driver'
    and f.expires_at > clock_timestamp() and o.status = 'offered' and o.driver_id is null
    and exists (select 1 from public.driver_communes coverage
      where coverage.driver_id = d.id and coverage.commune_code = o.commune_code);
$$;
create function public.list_driver_offers() returns jsonb
language sql security invoker set search_path = '' as $$
  select private.list_driver_offers();
$$;

create function private.get_driver_order(p_order_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty, 'commune_code', o.commune_code,
    'commune_name', c.name, 'total_clp', o.total_clp, 'status', o.status,
    'delivery_address', o.delivery_address, 'notes', o.notes)
  from public.orders o join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = o.driver_id join public.profiles profile on profile.id = d.id
  where o.driver_id = auth.uid() and d.is_verified and profile.role = 'driver'
    and ((p_order_id is not null and o.id = p_order_id)
      or (p_order_id is null and o.status in ('accepted', 'on_the_way')))
  order by o.accepted_at desc limit 1;
$$;
create function public.get_driver_order(p_order_id uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.get_driver_order(p_order_id);
$$;

create function private.accept_driver_offer(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize with rejection/settings and the existing acceptance lock order.
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = auth.uid() and d.is_verified and p.role = 'driver' for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  if not exists (select 1 from private.order_offers where order_id = p_order_id and driver_id = auth.uid()) then
    raise exception 'Offer not owned' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where id = p_order_id and driver_id <> auth.uid()) then
    raise exception 'Order already taken' using errcode = 'GW001';
  end if;
  if not exists (select 1 from private.order_offers where order_id = p_order_id
    and driver_id = auth.uid() and expires_at > clock_timestamp()) then
    raise exception 'Offer expired or rejected' using errcode = 'GW002';
  end if;
  begin
    perform private.accept_order(p_order_id);
  exception when sqlstate '55000' then
    if exists (select 1 from public.orders where id = p_order_id and driver_id <> auth.uid()) then
      raise exception 'Order already taken' using errcode = 'GW001';
    end if;
    if exists (select 1 from private.order_offers where order_id = p_order_id
      and driver_id = auth.uid() and expires_at <= clock_timestamp()) then
      raise exception 'Offer expired or rejected' using errcode = 'GW002';
    end if;
    raise;
  end;
  return private.get_driver_order(p_order_id);
end;
$$;
create function public.accept_driver_offer(p_order_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.accept_driver_offer(p_order_id);
$$;

create function private.reject_driver_offer(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.drivers d join public.profiles p on p.id = d.id
    where d.id = auth.uid() and d.is_verified and p.role = 'driver' for update of d;
  if not found then
    raise exception 'Driver not eligible' using errcode = '42501';
  end if;
  update private.order_offers f set expires_at = clock_timestamp()
    where f.order_id = p_order_id and f.driver_id = auth.uid() and f.expires_at > clock_timestamp()
      and exists (select 1 from public.orders o where o.id = f.order_id and o.status = 'offered');
  if not found then
    raise exception 'Offer unavailable' using errcode = 'GW002';
  end if;
  return true;
end;
$$;
create function public.reject_driver_offer(p_order_id uuid) returns boolean
language sql security invoker set search_path = '' as $$
  select private.reject_driver_offer(p_order_id);
$$;

revoke all on function private.dispatch_order(uuid) from public, anon, authenticated;
revoke all on function public.get_driver_settings(), private.set_driver_settings(boolean, text[]),
  public.set_driver_settings(boolean, text[]), private.list_driver_offers(), public.list_driver_offers(),
  private.get_driver_order(uuid), public.get_driver_order(uuid), private.accept_driver_offer(uuid),
  public.accept_driver_offer(uuid), private.reject_driver_offer(uuid), public.reject_driver_offer(uuid)
  from public, anon, authenticated;
grant execute on function public.get_driver_settings(), private.set_driver_settings(boolean, text[]),
  public.set_driver_settings(boolean, text[]), private.list_driver_offers(), public.list_driver_offers(),
  private.get_driver_order(uuid), public.get_driver_order(uuid), private.accept_driver_offer(uuid),
  public.accept_driver_offer(uuid), private.reject_driver_offer(uuid), public.reject_driver_offer(uuid)
  to authenticated;

create or replace function private.create_order(
  p_product_id uuid, p_quantity integer, p_exchange_empty boolean,
  p_delivery_address text, p_commune_code text, p_notes text default null,
  p_latitude double precision default null, p_longitude double precision default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  price integer;
  result public.orders;
begin
  if caller is null or not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity not between 1 and 99
    or p_exchange_empty is null or p_delivery_address is null
    or char_length(btrim(p_delivery_address)) not between 1 and 300
    or p_commune_code is null
    or not exists (select 1 from public.communes where code = p_commune_code)
    or char_length(p_notes) > 1000
    or (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and not (p_latitude between -90 and 90))
    or (p_longitude is not null and not (p_longitude between -180 and 180)) then
    raise exception 'Invalid order input' using errcode = '22023';
  end if;
  select unit_price_clp into price from public.products
    where id = p_product_id and is_active for share;
  if price is null then
    raise exception 'Product unavailable or unpriced' using errcode = '55000';
  end if;
  if price::bigint * p_quantity > 2147483647 then
    raise exception 'Order total exceeds CLP limit' using errcode = '22023';
  end if;
  insert into public.orders (
    customer_id, product_id, quantity, exchange_empty, total_clp,
    delivery_address, commune_code, notes, delivery_location
  ) values (
    caller, p_product_id, p_quantity, p_exchange_empty, price * p_quantity,
    btrim(p_delivery_address), p_commune_code, nullif(btrim(p_notes), ''),
    case when p_latitude is null then null else
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography end
  ) returning * into result;
  -- Existing record_order_event trigger writes requested in the same transaction.
  perform private.dispatch_order(result.id);
  select * into result from public.orders where id = result.id;
  return result;
end;
$$;


commit;
