begin;

alter table public.distributors add column coverage_revision integer not null default 0 check(coverage_revision>=0);
create table public.distributor_communes (
  distributor_id uuid not null references public.distributors(id) on delete cascade,
  commune_code text not null references public.communes(code),
  primary key(distributor_id,commune_code)
);
create index distributor_communes_lookup_idx on public.distributor_communes(commune_code,distributor_id);
alter table public.distributor_communes enable row level security;
revoke all on public.distributor_communes from public,anon,authenticated;
grant select on public.distributor_communes to authenticated;
grant select,insert,update,delete on public.distributor_communes to service_role;
create policy distributor_communes_read_team on public.distributor_communes for select to authenticated
  using(exists(select 1 from public.distributor_members m where m.distributor_id=distributor_communes.distributor_id and m.user_id=(select auth.uid()))
    or exists(select 1 from public.drivers d where d.id=(select auth.uid()) and d.distributor_id=distributor_communes.distributor_id));

-- Preserve every old row, including drivers without an affiliated business. This is
-- an administrative archive, never a runtime coverage source or a client API.
create table private.legacy_driver_coverage as
  select c.driver_id,c.commune_code,d.distributor_id,clock_timestamp() as archived_at
  from public.driver_communes c join public.drivers d on d.id=c.driver_id;
alter table private.legacy_driver_coverage enable row level security;
revoke all on private.legacy_driver_coverage from public,anon,authenticated,service_role;
insert into public.distributor_communes(distributor_id,commune_code)
  select distinct distributor_id,commune_code from private.legacy_driver_coverage where distributor_id is not null;

create function private.set_business_coverage(p_distributor_id uuid,p_commune_codes text[],p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_revision integer; saved_codes text[]; next_codes text[];
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members
    where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  if p_revision is null or p_revision<0 or p_commune_codes is null or cardinality(p_commune_codes)>346
    or exists(select 1 from unnest(p_commune_codes) input(code)
      where code is null or not exists(select 1 from public.communes where communes.code=input.code)) then
    raise exception 'Invalid coverage' using errcode='22023'; end if;
  -- Same business lock used by creation/acceptance: coverage cannot change mid-claim.
  select coverage_revision into current_revision from public.distributors where id=p_distributor_id for update;
  select coalesce(array_agg(code order by code),'{}'::text[]) into next_codes from (select distinct unnest(p_commune_codes) as code) codes;
  select coalesce(array_agg(commune_code order by commune_code),'{}'::text[]) into saved_codes
    from public.distributor_communes where distributor_id=p_distributor_id;
  if current_revision<>p_revision then
    if current_revision=p_revision+1 and saved_codes=next_codes then return private.get_business_coverage(p_distributor_id); end if;
    raise exception 'Coverage changed; refresh' using errcode='40001'; end if;
  if saved_codes=next_codes then return private.get_business_coverage(p_distributor_id); end if;
  delete from public.distributor_communes where distributor_id=p_distributor_id and not(commune_code=any(next_codes));
  insert into public.distributor_communes(distributor_id,commune_code)
    select p_distributor_id,code from unnest(next_codes) codes(code) on conflict do nothing;
  update public.distributors set coverage_revision=coverage_revision+1 where id=p_distributor_id;
  -- Revoke only unassigned offers outside the new area. Assigned deliveries continue.
  update private.order_offers f set expires_at=clock_timestamp()
    from public.orders o,public.drivers d
    where f.order_id=o.id and f.driver_id=d.id and d.distributor_id=p_distributor_id
      and o.driver_id is null and o.status in ('requested','offered') and f.expires_at>clock_timestamp()
      and not(o.commune_code=any(next_codes));
  return private.get_business_coverage(p_distributor_id);
end;
$$;
create function public.set_business_coverage(p_distributor_id uuid,p_commune_codes text[],p_revision integer) returns jsonb
language sql security invoker set search_path='' as $$ select private.set_business_coverage(p_distributor_id,p_commune_codes,p_revision); $$;

create function private.get_driver_settings() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.drivers d join public.profiles p on p.id=d.id
    where d.id=auth.uid() and d.is_verified and p.role='driver') then
    raise exception 'Driver not eligible' using errcode='42501'; end if;
  return(select jsonb_build_object('is_available',d.is_available,'communes',coalesce((
    select jsonb_agg(jsonb_build_object('code',c.code,'name',c.name) order by c.name,c.code)
    from public.distributor_communes area join public.communes c on c.code=area.commune_code
    where area.distributor_id=d.distributor_id),'[]'::jsonb)) from public.drivers d where d.id=auth.uid());
end;
$$;
create or replace function public.get_driver_settings() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.get_driver_settings(); $$;

create function private.set_driver_availability(p_is_available boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.drivers d join public.profiles p on p.id=d.id
    where d.id=auth.uid() and d.is_verified and p.role='driver' for update of d;
  if not found then raise exception 'Driver not eligible' using errcode='42501'; end if;
  if p_is_available is null then raise exception 'Availability required' using errcode='22023'; end if;
  if p_is_available then
    perform 1 from public.drivers d join public.distributors business on business.id=d.distributor_id
      where d.id=auth.uid() and business.is_verified
        and exists(select 1 from public.distributor_brands b where b.distributor_id=business.id)
        and exists(select 1 from public.distributor_communes c where c.distributor_id=business.id)
      for share of business;
    if not found then raise exception 'Business and coverage required' using errcode='55000'; end if;
    if exists(select 1 from public.orders where driver_id=auth.uid() and status in ('accepted','on_the_way')) then
      raise exception 'Driver already has an active order' using errcode='55000'; end if;
  end if;
  update public.drivers set is_available=p_is_available where id=auth.uid();
  if not p_is_available then
    update private.order_offers set expires_at=clock_timestamp() where driver_id=auth.uid() and expires_at>clock_timestamp();
  end if;
  return private.get_driver_settings();
end;
$$;
create function public.set_driver_availability(p_is_available boolean) returns jsonb
language sql security invoker set search_path='' as $$ select private.set_driver_availability(p_is_available); $$;

create or replace function private.get_business_coverage(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members
    where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  return(select jsonb_build_object(
    'business_enabled',business.is_verified and exists(select 1 from public.distributor_brands where distributor_id=business.id),
    'is_open',private.business_accepting_now(business.id),'revision',business.coverage_revision,
    'communes',coalesce((select jsonb_agg(jsonb_build_object('code',c.code,'name',c.name) order by c.name,c.code)
      from public.distributor_communes area join public.communes c on c.code=area.commune_code
      where area.distributor_id=business.id),'[]'::jsonb),
    'drivers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',driver.id,'name',coalesce(nullif(application.applicant_name,''),nullif(profile.display_name,''),'Conductor'),
      'status',case when not driver.is_verified or profile.role<>'driver' then 'not_enabled'
        when exists(select 1 from public.orders active where active.driver_id=driver.id and active.status in ('accepted','on_the_way')) then 'busy'
        when driver.is_available then 'available' else 'offline' end
    ) order by coalesce(application.applicant_name,profile.display_name,'Conductor'),driver.id)
      from public.drivers driver join public.profiles profile on profile.id=driver.id
      left join public.driver_applications application on application.driver_id=driver.id
      where driver.distributor_id=business.id),'[]'::jsonb)
    ) from public.distributors business where business.id=p_distributor_id);
end;
$$;

CREATE OR REPLACE FUNCTION private.list_delivery_options(p_product_id uuid, p_commune_code text, p_quantity integer, p_exchange_empty boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'has_coverage',exists(select 1 from public.distributor_communes c where c.distributor_id=d.id and c.commune_code=p_commune_code),
    'has_available_driver',exists(select 1 from public.drivers driver join public.distributor_communes c on c.distributor_id=driver.distributor_id
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
$function$;
CREATE OR REPLACE FUNCTION private.create_distributor_order(p_distributor_id uuid, p_product_id uuid, p_quantity integer, p_exchange_empty boolean, p_returned_brand text, p_delivery_address text, p_commune_code text, p_notes text, p_expected_unit_price integer, p_request_id uuid)
 RETURNS public.orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare caller uuid:=auth.uid(); existing public.orders; result public.orders; offer public.distributor_products; price integer;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Serialize retries before any inventory lock; a lost response cannot duplicate a purchase.
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile required' using errcode='42501'; end if;
  if p_request_id is null or p_quantity is null or p_quantity not between 1 and 99 or p_exchange_empty is null
    or p_delivery_address is null or char_length(btrim(p_delivery_address)) not between 1 and 300
    or char_length(p_notes)>1000 or (p_exchange_empty and (p_returned_brand is null or p_returned_brand not in ('Lipigas','Gasco','Abastible','unknown')))
    or (not p_exchange_empty and p_returned_brand is not null) or not exists(select 1 from public.communes where code=p_commune_code) then
    raise exception 'Invalid order input' using errcode='22023'; end if;
  select * into existing from public.orders where customer_id=caller and client_request_id=p_request_id;
  if found then
    if row(existing.distributor_id,existing.product_id,existing.quantity,existing.exchange_empty,existing.returned_brand,existing.delivery_address,existing.commune_code,existing.notes)
      is distinct from row(p_distributor_id,p_product_id,p_quantity,p_exchange_empty,p_returned_brand,btrim(p_delivery_address),p_commune_code,nullif(btrim(p_notes),'')) then
      raise exception 'Request already used' using errcode='22023'; end if;
    return existing;
  end if;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for share;
  if not found then raise exception 'Business unavailable' using errcode='55000'; end if;
  perform 1 from public.products p join public.distributor_brands b on b.distributor_id=p_distributor_id and b.brand=p.brand
    where p.id=p_product_id and p.is_active for share of p,b;
  if not found then raise exception 'Product unavailable' using errcode='55000'; end if;
  if not exists(select 1 from public.distributor_communes c where c.distributor_id=p_distributor_id and c.commune_code=p_commune_code) then
    raise exception 'Outside business coverage' using errcode='55000'; end if;
  select * into offer from public.distributor_products where distributor_id=p_distributor_id and product_id=p_product_id for update;
  price:=case when p_exchange_empty then offer.unit_price_clp else offer.price_without_exchange_clp end;
  if not coalesce(offer.is_listed,false) or price is null or offer.stock<p_quantity then
    raise exception 'Offer unavailable' using errcode='55000'; end if;
  if p_expected_unit_price is distinct from price then raise exception 'Price changed; review again' using errcode='40001'; end if;
  if price::bigint*p_quantity>2147483647 then raise exception 'Total exceeds limit' using errcode='22023'; end if;
  update public.distributor_products set stock=stock-p_quantity,revision=revision+1,updated_at=clock_timestamp()
    where distributor_id=p_distributor_id and product_id=p_product_id;
  insert into public.orders(customer_id,distributor_id,product_id,quantity,exchange_empty,returned_brand,total_clp,delivery_address,commune_code,notes,client_request_id)
    values(caller,p_distributor_id,p_product_id,p_quantity,p_exchange_empty,p_returned_brand,price*p_quantity,btrim(p_delivery_address),p_commune_code,nullif(btrim(p_notes),''),p_request_id)
    returning * into result;
  insert into private.order_stock_reservations(order_id,distributor_id,product_id,quantity) values(result.id,p_distributor_id,p_product_id,p_quantity);
  perform private.dispatch_order(result.id);
  select * into result from public.orders where id=result.id;
  if result.status<>'offered' then
    raise exception 'No delivery available now' using errcode='55000'; end if;
  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION private.dispatch_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      join public.distributor_communes c on c.distributor_id = d.distributor_id and c.commune_code = target.commune_code
    where (target.distributor_id is null or (d.distributor_id=target.distributor_id and private.business_accepting_now(target.distributor_id))) and private.driver_can_deliver_product(d.id, target.product_id) and d.is_verified and d.is_available and p.role = 'driver' and d.id <> target.customer_id
      and not exists (select 1 from public.orders active where active.driver_id = d.id
        and active.status in ('accepted', 'on_the_way'))
    on conflict (order_id, driver_id) do nothing;
  if target.status = 'requested' and exists (select 1 from private.order_offers
    where order_id = target.id and expires_at > clock_timestamp()) then
    update public.orders set status = 'offered' where id = target.id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.list_driver_offers()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id, 'brand', p.brand, 'weight_kg', p.weight_kg, 'variant', p.variant,
    'quantity', o.quantity, 'exchange_empty', o.exchange_empty,'returned_brand',o.returned_brand,
    'commune_code', o.commune_code, 'commune_name', c.name,
    'total_clp', o.total_clp, 'expires_at', f.expires_at
  ) order by f.expires_at, o.id), '[]'::jsonb)
  from private.order_offers f join public.orders o on o.id = f.order_id
    join public.products p on p.id = o.product_id
    join public.communes c on c.code = o.commune_code
    join public.drivers d on d.id = f.driver_id
    join public.profiles profile on profile.id = d.id
  where (o.distributor_id is null or o.distributor_id=d.distributor_id) and private.driver_can_deliver_product(d.id, o.product_id) and f.driver_id = auth.uid() and d.is_verified and d.is_available and profile.role = 'driver'
    and f.expires_at > clock_timestamp() and o.status = 'offered' and o.driver_id is null
    and exists (select 1 from public.distributor_communes coverage
      where coverage.distributor_id = d.distributor_id and coverage.commune_code = o.commune_code);
$function$;

CREATE OR REPLACE FUNCTION private.accept_order(p_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and exists(select 1 from public.distributor_communes c join public.drivers d on d.distributor_id=c.distributor_id
      where d.id=caller and c.commune_code=o.commune_code)
    and exists (select 1 from private.order_offers f
      where f.order_id = o.id and f.driver_id = caller and f.expires_at > clock_timestamp())
  returning o.id into accepted_id;
  if accepted_id is null then
    raise exception 'Order unavailable or offer expired' using errcode = '55000';
  end if;
  update public.drivers set is_available = false where id = caller;
  return accepted_id;
end;
$function$;

CREATE OR REPLACE FUNCTION private.get_my_driver_workspace()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid:=auth.uid(); profile_role public.profile_role; driver public.drivers;
  organization public.distributors; business jsonb; brand_list jsonb; reason text;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  select role into profile_role from public.profiles where id=caller;
  if not found then raise exception 'Profile required' using errcode='42501';end if;
  select * into driver from public.drivers where id=caller;
  select * into organization from public.distributors where id=driver.distributor_id;
  select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) into brand_list
    from public.distributor_brands where distributor_id=organization.id;
  if organization.id is not null then
    business:=jsonb_build_object('id',organization.id,'name',organization.name,
      'is_verified',organization.is_verified,'is_demo',organization.is_demo,'brands',brand_list);
  end if;
  reason:=case when profile_role<>'driver' or not coalesce(driver.is_verified,false) then 'not_approved'
    when organization.id is null then 'no_business'
    when not organization.is_verified then 'business_disabled'
    when jsonb_array_length(brand_list)=0 then 'no_brands'
    when not exists(select 1 from public.distributor_communes where distributor_id=organization.id) then 'no_coverage' else null end;
  return jsonb_build_object('is_verified',coalesce(driver.is_verified,false),
    'application_status',(select status from public.driver_applications where driver_id=caller),
    'business',business,'can_manage_business',exists(select 1 from public.distributor_members where user_id=caller),
    'can_receive_offers',reason is null,'blocking_reason',reason);
end;
$function$;


revoke all on function private.get_driver_settings(),public.get_driver_settings(),
  private.set_driver_availability(boolean),public.set_driver_availability(boolean),
  private.set_business_coverage(uuid,text[],integer),public.set_business_coverage(uuid,text[],integer)
  from public,anon,authenticated,service_role;
grant execute on function private.get_driver_settings(),public.get_driver_settings(),
  private.set_driver_availability(boolean),public.set_driver_availability(boolean),
  private.set_business_coverage(uuid,text[],integer),public.set_business_coverage(uuid,text[],integer) to authenticated;

drop function public.set_driver_settings(boolean,text[]);
drop function private.set_driver_settings(boolean,text[]);
drop table public.driver_communes;

notify pgrst, 'reload schema';
commit;
