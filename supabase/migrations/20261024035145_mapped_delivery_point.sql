begin;

-- Extend purchase atomically without replacing stock, dispatch or legacy callers.
-- No new table/grant on orders: the existing participant RLS remains authoritative.
create function private.create_mapped_distributor_order(
  p_distributor_id uuid,p_product_id uuid,p_quantity integer,p_exchange_empty boolean,
  p_returned_brand text,p_delivery_address text,p_commune_code text,p_notes text,
  p_expected_unit_price integer,p_request_id uuid,p_latitude double precision,p_longitude double precision
) returns public.orders
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); previous public.orders; result public.orders;
  point extensions.geography;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_latitude is null or p_longitude is null
    or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180) then
    raise exception 'Invalid delivery point' using errcode='22023';
  end if;
  point:=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography;
  -- Same lock as the existing purchase: serialize all request-id/stock retries.
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile required' using errcode='42501'; end if;
  select * into previous from public.orders where customer_id=caller and client_request_id=p_request_id;
  if found and (previous.delivery_location is null
    or not extensions.st_equals(previous.delivery_location::extensions.geometry,point::extensions.geometry)) then
    raise exception 'Request already used with another delivery point' using errcode='22023';
  end if;
  result:=private.create_distributor_order(p_distributor_id,p_product_id,p_quantity,p_exchange_empty,
    p_returned_brand,p_delivery_address,p_commune_code,p_notes,p_expected_unit_price,p_request_id);
  if previous.id is null then
    update public.orders set delivery_location=point where id=result.id returning * into result;
  end if;
  return result;
end;
$$;

create function public.create_mapped_distributor_order(
  p_distributor_id uuid,p_product_id uuid,p_quantity integer,p_exchange_empty boolean,
  p_returned_brand text,p_delivery_address text,p_commune_code text,p_notes text,
  p_expected_unit_price integer,p_request_id uuid,p_latitude double precision,p_longitude double precision
) returns public.orders
language sql security invoker set search_path='' as $$
  select private.create_mapped_distributor_order(p_distributor_id,p_product_id,p_quantity,p_exchange_empty,
    p_returned_brand,p_delivery_address,p_commune_code,p_notes,p_expected_unit_price,p_request_id,p_latitude,p_longitude);
$$;

revoke all on function
  private.create_mapped_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid,double precision,double precision),
  public.create_mapped_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid,double precision,double precision)
from public,anon,authenticated,service_role;
grant execute on function
  private.create_mapped_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid,double precision,double precision),
  public.create_mapped_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid,double precision,double precision)
to authenticated;

notify pgrst,'reload schema';
commit;
