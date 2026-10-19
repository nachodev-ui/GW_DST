-- Preserve existing IDs, prices and orders; distinguish Abastible valve variants.
begin;
alter table public.products
  add column variant text not null default 'standard',
  drop constraint products_brand_weight_kg_key,
  add constraint products_variant_check check (
    variant = 'standard' or (brand = 'Abastible' and weight_kg = 15 and variant in ('vma', 'vm'))
  ),
  add constraint products_brand_weight_variant_key unique (brand, weight_kg, variant);

insert into public.products (brand, weight_kg, variant)
values ('Abastible', 15, 'vma'), ('Abastible', 15, 'vm')
on conflict (brand, weight_kg, variant) do nothing;

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
  where f.driver_id = auth.uid() and d.is_verified and d.is_available and profile.role = 'driver'
    and f.expires_at > clock_timestamp() and o.status = 'offered' and o.driver_id is null
    and exists (select 1 from public.driver_communes coverage
      where coverage.driver_id = d.id and coverage.commune_code = o.commune_code);
$$;

create or replace function private.get_driver_order(p_order_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg, 'variant', p.variant,
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

commit;
