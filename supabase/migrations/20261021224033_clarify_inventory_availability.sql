-- Inventory remains visible when operational delivery coverage is missing.
-- No changes to purchase authorization, driver approval, stock or prices.
begin;

create or replace function private.list_delivery_options(p_product_id uuid,p_commune_code text,p_quantity integer,p_exchange_empty boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid search' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'is_demo',d.is_demo,'request_id',gen_random_uuid(),
    'brands',(select jsonb_agg(b.brand order by b.brand) from public.distributor_brands b where b.distributor_id=d.id),
    'unit_price_clp',s.unit_price_clp,'price_without_exchange_clp',s.price_without_exchange_clp,
    'total_clp',case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity,
    'updated_at',s.updated_at,'stock',s.stock,
    'has_coverage',exists(select 1 from public.drivers driver join public.driver_communes c on c.driver_id=driver.id
      join public.profiles profile on profile.id=driver.id
      where driver.distributor_id=d.id and driver.is_verified and profile.role='driver' and c.commune_code=p_commune_code),
    'has_available_driver',exists(select 1 from public.drivers driver join public.driver_communes c on c.driver_id=driver.id
      join public.profiles profile on profile.id=driver.id
      where driver.distributor_id=d.id and driver.is_verified and driver.is_available and profile.role='driver'
        and c.commune_code=p_commune_code and driver.id<>auth.uid()
        and not exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way'))),
    'service',jsonb_build_object('whatsapp',case when d.is_demo then null else settings.whatsapp end,
      'schedule',settings.schedule,'eta_min',settings.eta_min,'eta_max',settings.eta_max,'revision',coalesce(settings.revision,0))
  ) order by d.name,d.id),'[]'::jsonb)
    from public.distributor_products s join public.distributors d on d.id=s.distributor_id
    join public.products p on p.id=s.product_id and p.is_active
    join public.distributor_brands brand on brand.distributor_id=d.id and brand.brand=p.brand
    left join public.distributor_service_settings settings on settings.distributor_id=d.id
    where s.product_id=p_product_id and d.is_verified and s.is_listed and s.stock>=p_quantity
      and (case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end is null
        or case when p_exchange_empty then s.unit_price_clp else s.price_without_exchange_clp end::bigint*p_quantity<=2147483647)
      );
end;
$$;

notify pgrst, 'reload schema';
commit;
