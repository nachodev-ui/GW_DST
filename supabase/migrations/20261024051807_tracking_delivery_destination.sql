begin;

-- Same authorization/locks as D2; expose the confirmed destination only while active.
create or replace function private.get_order_tracking(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); target public.orders; sample private.driver_locations;
  server_time timestamptz; fresh_until timestamptz; state text; point jsonb:=null;
  destination jsonb:=null;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into target from public.orders
    where id=p_order_id and caller in (customer_id,driver_id) for share;
  if not found then raise exception 'Participant required' using errcode='42501'; end if;
  server_time:=clock_timestamp();
  if target.status not in ('accepted','on_the_way') then
    state:='ended';
  else
    if not private.can_read_order_tracking(target.id) then
      raise exception 'Tracking access revoked' using errcode='42501'; end if;
    if target.delivery_location is not null then
      destination:=jsonb_build_object('latitude',extensions.st_y(target.delivery_location::extensions.geometry),
        'longitude',extensions.st_x(target.delivery_location::extensions.geometry));
    end if;
    select * into sample from private.driver_locations
      where order_id=target.id and driver_id=target.driver_id;
    if not found then state:='waiting';
    else
      fresh_until:=least(sample.received_at,sample.captured_at)+interval '30 seconds';
      state:=case when server_time<fresh_until then 'fresh' else 'stale' end;
      if state='fresh' then
        point:=jsonb_build_object('latitude',extensions.st_y(sample.location::extensions.geometry),
          'longitude',extensions.st_x(sample.location::extensions.geometry),'accuracy_m',sample.accuracy_m,
          'captured_at',sample.captured_at,'received_at',sample.received_at);
      end if;
    end if;
  end if;
  return jsonb_build_object('order_id',target.id,'state',state,'server_now',server_time,
    'received_at',sample.received_at,'fresh_until',fresh_until,'sample',point,'destination',destination);
end;
$$;
-- CREATE OR REPLACE preserves the D2 EXECUTE grants and public INVOKER wrapper.
notify pgrst,'reload schema';
commit;
