begin;

-- Retire the historical, driver-wide Data API and its raw-coordinate stream.
alter publication supabase_realtime drop table public.driver_locations;
revoke all on public.driver_locations from public,anon,authenticated,service_role;
drop policy locations_read_participant on public.driver_locations;
drop policy locations_insert_self on public.driver_locations;
drop policy locations_update_self on public.driver_locations;
alter table public.driver_locations set schema private;
-- Legacy samples have no trustworthy order/capture/receipt association. Never backfill.
delete from private.driver_locations;
alter table private.driver_locations rename column recorded_at to received_at;
alter table private.driver_locations
  add column order_id uuid not null unique references public.orders(id) on delete cascade,
  add column captured_at timestamptz not null,
  add column accuracy_m double precision not null check (accuracy_m between 0 and 1000);
comment on table private.driver_locations is
  'Latest sample only, order-bound; RPC access only; cleared atomically at terminal state.';

-- Realtime is an invalidation hint, never a carrier for private coordinates.
create table public.order_tracking_signals (
  order_id uuid primary key references public.orders(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0)
);
alter table public.order_tracking_signals enable row level security;
revoke all on public.order_tracking_signals from public,anon,authenticated,service_role;
grant select on public.order_tracking_signals to authenticated;

create function private.can_read_order_tracking(p_order_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.orders o join public.drivers d on d.id=o.driver_id
    join public.profiles p on p.id=d.id
    where o.id=p_order_id and o.status in ('accepted','on_the_way')
      and d.is_verified and p.role='driver'
      and auth.uid() in (o.customer_id,o.driver_id)
  );
$$;
revoke all on function private.can_read_order_tracking(uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_read_order_tracking(uuid) to authenticated;
create policy tracking_signal_participant on public.order_tracking_signals
  for select to authenticated using ((select private.can_read_order_tracking(order_id)));
alter publication supabase_realtime add table public.order_tracking_signals;

create function private.publish_order_location(
  p_order_id uuid,p_latitude double precision,p_longitude double precision,
  p_captured_at timestamptz,p_accuracy_m double precision
) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); target public.orders; previous private.driver_locations;
  receipt timestamptz;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Same lock order as advance_driver_order: driver, then order, then sample.
  perform 1 from public.drivers d join public.profiles p on p.id=d.id
    where d.id=caller and d.is_verified and p.role='driver' for update of d;
  if not found then raise exception 'Verified driver required' using errcode='42501'; end if;
  select * into target from public.orders where id=p_order_id and driver_id=caller for update;
  if not found then raise exception 'Assigned order required' using errcode='42501'; end if;
  if target.status not in ('accepted','on_the_way') then
    raise exception 'Tracking is closed' using errcode='55000'; end if;
  receipt:=clock_timestamp();
  if p_latitude is null or not (p_latitude between -90 and 90)
    or p_longitude is null or not (p_longitude between -180 and 180)
    or p_accuracy_m is null or not (p_accuracy_m between 0 and 1000)
    or p_captured_at is null or not isfinite(p_captured_at)
    or p_captured_at < receipt-interval '30 seconds'
    or p_captured_at > receipt+interval '5 seconds'
    or p_captured_at < target.accepted_at then
    raise exception 'Invalid location sample' using errcode='22023'; end if;
  select * into previous from private.driver_locations where driver_id=caller;
  if found and previous.order_id=target.id then
    if p_captured_at<=previous.captured_at then
      return jsonb_build_object('accepted',false,'reason','out_of_order','received_at',previous.received_at);
    end if;
    if receipt<previous.received_at+interval '5 seconds' then
      return jsonb_build_object('accepted',false,'reason','rate_limited','received_at',previous.received_at);
    end if;
  end if;
  insert into private.driver_locations(driver_id,order_id,location,captured_at,received_at,accuracy_m)
    values(caller,target.id,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,
      p_captured_at,receipt,p_accuracy_m)
    on conflict(driver_id) do update set order_id=excluded.order_id,location=excluded.location,
      captured_at=excluded.captured_at,received_at=excluded.received_at,accuracy_m=excluded.accuracy_m;
  insert into public.order_tracking_signals(order_id) values(target.id)
    on conflict(order_id) do update set revision=public.order_tracking_signals.revision+1;
  return jsonb_build_object('accepted',true,'reason','accepted','received_at',receipt);
end;
$$;

create function public.publish_order_location(
  p_order_id uuid,p_latitude double precision,p_longitude double precision,
  p_captured_at timestamptz,p_accuracy_m double precision
) returns jsonb language sql security invoker set search_path='' as $$
  select private.publish_order_location(p_order_id,p_latitude,p_longitude,p_captured_at,p_accuracy_m);
$$;

create function private.get_order_tracking(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); target public.orders; sample private.driver_locations;
  server_time timestamptz; fresh_until timestamptz; state text; point jsonb:=null;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Serialize reads against a terminal transition. Already delivered data cannot be recalled.
  select * into target from public.orders
    where id=p_order_id and caller in (customer_id,driver_id) for share;
  if not found then raise exception 'Participant required' using errcode='42501'; end if;
  server_time:=clock_timestamp();
  if target.status not in ('accepted','on_the_way') then
    state:='ended';
  else
    if not private.can_read_order_tracking(target.id) then
      raise exception 'Tracking access revoked' using errcode='42501'; end if;
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
    'received_at',sample.received_at,'fresh_until',fresh_until,'sample',point);
end;
$$;
create function public.get_order_tracking(p_order_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select private.get_order_tracking(p_order_id);
$$;

revoke all on function private.publish_order_location(uuid,double precision,double precision,timestamptz,double precision),
  public.publish_order_location(uuid,double precision,double precision,timestamptz,double precision),
  private.get_order_tracking(uuid),public.get_order_tracking(uuid) from public,anon,authenticated,service_role;
grant execute on function private.publish_order_location(uuid,double precision,double precision,timestamptz,double precision),
  public.publish_order_location(uuid,double precision,double precision,timestamptz,double precision),
  private.get_order_tracking(uuid),public.get_order_tracking(uuid) to authenticated;

create function private.clear_terminal_order_location() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status in ('delivered','cancelled') then
    delete from private.driver_locations where order_id=new.id;
    -- Signal rows contain only order ID/revision; keep them out of unfilterable DELETE events.
  end if;
  return new;
end;
$$;
revoke all on function private.clear_terminal_order_location() from public,anon,authenticated,service_role;
create trigger clear_terminal_order_location after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function private.clear_terminal_order_location();

notify pgrst,'reload schema';
commit;
