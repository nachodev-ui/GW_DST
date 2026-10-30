begin;
alter table private.order_routes add column provider text not null default 'google' check(provider in('google','osrm'));
alter table private.order_routes drop constraint order_routes_pkey;
alter table private.order_routes add primary key(order_id,provider);
create table private.routing_provider_budget(provider text primary key,next_request_at timestamptz not null);
alter table private.routing_provider_budget enable row level security;
revoke all on private.routing_provider_budget from public,anon,authenticated,service_role;
insert into private.routing_provider_budget values('osrm','-infinity');
create function private.begin_route_for_provider(p_order_id uuid,p_provider text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; cached private.order_routes; route_now timestamptz:=clock_timestamp();
  token uuid; origin jsonb; destination jsonb;
begin
  if p_provider not in('google','osrm') or p_provider is null then raise exception 'Invalid provider' using errcode='22023'; end if;
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.orders where id=p_order_id and auth.uid() in(customer_id,driver_id) for update;
  if not found then raise exception 'Participant required' using errcode='42501'; end if;
  snapshot:=private.get_order_tracking(p_order_id);
  if snapshot->>'state'='ended' then return jsonb_build_object('state','ended'); end if;
  if snapshot->>'state'<>'fresh' or snapshot->'destination'='null'::jsonb
    or (snapshot->'sample'->>'accuracy_m')::float8>50 then return jsonb_build_object('state','waiting'); end if;
  origin:=snapshot->'sample'; destination:=snapshot->'destination';
  if not private.route_point_supported(origin) or not private.route_point_supported(destination) then
    return jsonb_build_object('state','unavailable'); end if;
  insert into private.order_routes(order_id,provider) values(p_order_id,p_provider) on conflict do nothing;
  select * into cached from private.order_routes where order_id=p_order_id and provider=p_provider for update;
  if cached.valid_until<route_now then
    update private.order_routes set points=null,path=null where order_id=p_order_id and provider=p_provider;
    -- Expired routes fall back to GPS; do not silently buy another route for an abandoned trip.
    return jsonb_build_object('state','unavailable');
  end if;
  if cached.points is not null and not(cached.deviation_hits>=3
    and cached.deviation_since<=route_now-interval '10 seconds'
    and cached.last_attempt<=route_now-interval '60 seconds') then
    return jsonb_build_object('state','ready','points',cached.points);
  end if;
  if cached.lease_until>route_now then return jsonb_build_object('state','pending'); end if;
  if cached.attempts>=6 or cached.retry_after>route_now then return jsonb_build_object('state','unavailable'); end if;
  if p_provider='osrm' then
    update private.routing_provider_budget set next_request_at=route_now+interval '1100 milliseconds'
      where provider='osrm' and next_request_at<=route_now;
    if not found then return jsonb_build_object('state','pending'); end if;
  end if;
  token:=gen_random_uuid();
  update private.order_routes set lease=token,lease_until=route_now+interval '25 seconds',
    last_attempt=route_now,retry_after=route_now+interval '60 seconds',attempts=attempts+1 where order_id=p_order_id and provider=p_provider;
  return jsonb_build_object('state','compute','lease',token,'origin',
    jsonb_build_object('latitude',origin->'latitude','longitude',origin->'longitude'),'destination',destination);
end;
$$;
create function private.finish_route_for_provider(p_order_id uuid,p_lease uuid,p_points jsonb,p_provider text) returns boolean
language plpgsql security definer set search_path='' as $$
declare cached private.order_routes; target public.orders; point jsonb; shape extensions.geography;
begin
  if p_provider not in('google','osrm') or p_provider is null or p_lease is null then return false; end if;
  select * into target from public.orders where id=p_order_id for update;
  if not found or target.status not in('accepted','on_the_way') then return false; end if;
  if not exists(select 1 from public.drivers d join public.profiles p on p.id=d.id
    where d.id=target.driver_id and d.is_verified and p.role='driver') then return false; end if;
  select * into cached from private.order_routes where order_id=p_order_id and provider=p_provider for update;
  if not found or cached.lease is distinct from p_lease or cached.lease_until<clock_timestamp() then return false; end if;
  if p_points is null then
    update private.order_routes set lease=null,lease_until=null,
      retry_after=clock_timestamp()+make_interval(secs=>least(900,60*power(2,attempts-1)::integer)) where order_id=p_order_id and provider=p_provider;
    return true;
  end if;
  if jsonb_typeof(p_points)<>'array' or jsonb_array_length(p_points) not between 2 and 10000 then
    raise exception 'Invalid route' using errcode='22023'; end if;
  for point in select value from jsonb_array_elements(p_points) loop
    if jsonb_typeof(point->'latitude') is distinct from 'number'
      or jsonb_typeof(point->'longitude') is distinct from 'number'
      or not private.route_point_supported(point) then raise exception 'Unsupported route point' using errcode='22023'; end if;
  end loop;
  select extensions.st_setsrid(extensions.st_makeline(array_agg(
    extensions.st_makepoint((value->>'longitude')::float8,(value->>'latitude')::float8) order by ord)),4326)::extensions.geography
    into shape from jsonb_array_elements(p_points) with ordinality as vertices(value,ord);
  update private.order_routes set points=p_points,path=shape,valid_until=clock_timestamp()+interval '2 hours',
    lease=null,lease_until=null,deviation_hits=0,deviation_since=null where order_id=p_order_id and provider=p_provider;
  return true;
end;
$$;

revoke all on function private.begin_route_for_provider(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.begin_route_for_provider(uuid,text) to authenticated;
revoke all on function private.finish_route_for_provider(uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function private.finish_route_for_provider(uuid,uuid,jsonb,text) to service_role;
create or replace function private.begin_order_route(p_order_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.begin_route_for_provider(p_order_id,'google'); $$;
create or replace function private.finish_order_route(p_order_id uuid,p_lease uuid,p_points jsonb) returns boolean language sql security invoker set search_path='' as $$ select private.finish_route_for_provider(p_order_id,p_lease,p_points,'google'); $$;
create function public.begin_osrm_order_route(p_order_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.begin_route_for_provider(p_order_id,'osrm'); $$;
revoke all on function public.begin_osrm_order_route(uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_osrm_order_route(uuid) to authenticated;
create function public.finish_osrm_order_route(p_order_id uuid,p_lease uuid,p_points jsonb) returns boolean language sql security invoker set search_path='' as $$ select private.finish_route_for_provider(p_order_id,p_lease,p_points,'osrm'); $$;
revoke all on function public.finish_osrm_order_route(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_osrm_order_route(uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
