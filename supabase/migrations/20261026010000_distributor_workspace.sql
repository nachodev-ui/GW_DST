begin;

-- Commercial presentation is entered explicitly; private application evidence is never copied.
create table public.distributor_profiles (
  distributor_id uuid primary key references public.distributors(id),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  description text check (char_length(description) <= 500),
  address text check (char_length(btrim(address)) between 5 and 240),
  commune_code text references public.communes(code),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  logo_path text, cover_path text,
  revision integer not null check (revision > 0),
  check ((address is null) = (commune_code is null)),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or address is not null),
  check (logo_path is null or logo_path ~ ('^' || distributor_id::text || '/logo/[0-9a-f-]{36}\.(png|jpg|webp)$')),
  check (cover_path is null or cover_path ~ ('^' || distributor_id::text || '/cover/[0-9a-f-]{36}\.(png|jpg|webp)$'))
);
create table public.distributor_vehicles (
  id uuid primary key,
  distributor_id uuid not null references public.distributors(id),
  plate text not null check (plate ~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2})$'),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  status text not null check (status in ('available','maintenance','inactive')),
  driver_id uuid references public.drivers(id),
  revision integer not null check (revision > 0),
  unique (distributor_id, plate)
);
create unique index distributor_vehicle_driver_idx on public.distributor_vehicles(driver_id) where driver_id is not null;
create index distributor_vehicles_business_idx on public.distributor_vehicles(distributor_id);
create table public.distributor_sale_costs (
  order_id uuid primary key references public.orders(id),
  distributor_id uuid not null references public.distributors(id),
  cost_clp integer not null check (cost_clp >= 0),
  revision integer not null check (revision > 0)
);
create table private.business_workspace_events (
  id bigint generated always as identity primary key,
  distributor_id uuid not null references public.distributors(id),
  actor_id uuid not null references public.profiles(id),
  kind text not null, entity_id uuid not null, snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.distributor_profiles enable row level security;
alter table public.distributor_vehicles enable row level security;
alter table public.distributor_sale_costs enable row level security;
alter table private.business_workspace_events enable row level security;
revoke all on public.distributor_profiles, public.distributor_vehicles, public.distributor_sale_costs,
  private.business_workspace_events from public, anon, authenticated, service_role;
revoke all on sequence private.business_workspace_events_id_seq from public, anon, authenticated, service_role;
-- No direct writes. Reads are also scoped at the RPC boundary, including sales aggregates.
grant select on public.distributor_profiles, public.distributor_vehicles, public.distributor_sale_costs to authenticated;
create policy business_profiles_member_read on public.distributor_profiles for select to authenticated
  using (exists (select 1 from public.distributor_members m where m.distributor_id=distributor_profiles.distributor_id and m.user_id=(select auth.uid())));
create policy business_vehicles_member_read on public.distributor_vehicles for select to authenticated
  using (exists (select 1 from public.distributor_members m where m.distributor_id=distributor_vehicles.distributor_id and m.user_id=(select auth.uid())));
create policy business_costs_member_read on public.distributor_sale_costs for select to authenticated
  using (exists (select 1 from public.distributor_members m where m.distributor_id=distributor_sale_costs.distributor_id and m.user_id=(select auth.uid())));
create index orders_business_delivered_idx on public.orders(distributor_id, delivered_at desc, id desc) where status='delivered';

create function private.business_period_start(p_period text) returns timestamptz
language plpgsql stable set search_path='' as $$
begin
  if p_period not in ('today','week','month') or p_period is null then
    raise exception 'Invalid period' using errcode='22023'; end if;
  return (case p_period
    when 'today' then date_trunc('day', now() at time zone 'America/Santiago')
    when 'week' then date_trunc('day', now() at time zone 'America/Santiago') - interval '6 days'
    else date_trunc('month', now() at time zone 'America/Santiago') end) at time zone 'America/Santiago';
end; $$;

create function private.get_business_dashboard(p_distributor_id uuid, p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare starts timestamptz;
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  starts := private.business_period_start(p_period);
  return (
    with sales as (
      select o.id,o.total_clp,o.quantity,o.delivered_at,c.cost_clp
      from public.orders o left join public.distributor_sale_costs c on c.order_id=o.id and c.distributor_id=o.distributor_id
      where o.distributor_id=p_distributor_id and o.status='delivered' and o.delivered_at>=starts and o.delivered_at<=now()
    ), daily as (
      select (delivered_at at time zone 'America/Santiago')::date as business_day, sum(total_clp) as revenue, count(*) as sale_count from sales group by 1
    )
    select jsonb_build_object(
      'server_now',now(),'period_start',starts,
      'revenue_clp',coalesce(sum(total_clp),0),'cost_clp',coalesce(sum(cost_clp),0),
      'margin_clp',coalesce(sum(total_clp::bigint-cost_clp) filter(where cost_clp is not null),0),
      'delivered_count',count(*),'costed_count',count(cost_clp),'cylinder_count',coalesce(sum(quantity),0),
      'active_count',(select count(*) from public.orders where distributor_id=p_distributor_id and status in ('accepted','on_the_way')),
      'waiting_count',(select count(*) from public.orders where distributor_id=p_distributor_id and status in ('requested','offered')),
      'days',(select jsonb_agg(jsonb_build_object('day',d.business_day::date,'revenue_clp',coalesce(s.revenue,0),'delivered_count',coalesce(s.sale_count,0)) order by d.business_day)
        from generate_series((starts at time zone 'America/Santiago')::date::timestamp,(now() at time zone 'America/Santiago')::date::timestamp,interval '1 day') d(business_day)
        left join daily s on s.business_day=d.business_day::date)
    ) from sales
  );
end; $$;
create function public.get_business_dashboard(p_distributor_id uuid,p_period text) returns jsonb
language sql security invoker set search_path='' as $$ select private.get_business_dashboard(p_distributor_id,p_period); $$;

create function private.list_business_sales(p_distributor_id uuid,p_period text,p_before_at timestamptz,p_before_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare starts timestamptz; result jsonb; more boolean;
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'Invalid cursor' using errcode='22023'; end if;
  starts:=private.business_period_start(p_period);
  with page as (
    select o.id,o.delivered_at,o.total_clp,o.quantity,p.brand,p.weight_kg,c.cost_clp,coalesce(c.revision,0) cost_revision
    from public.orders o join public.products p on p.id=o.product_id
    left join public.distributor_sale_costs c on c.order_id=o.id and c.distributor_id=o.distributor_id
    where o.distributor_id=p_distributor_id and o.status='delivered' and o.delivered_at>=starts and o.delivered_at<=now()
      and (p_before_at is null or (o.delivered_at,o.id)<(p_before_at,p_before_id))
    order by o.delivered_at desc,o.id desc limit 21
  ) select coalesce((select jsonb_agg(to_jsonb(shown) order by delivered_at desc,id desc) from (select * from page order by delivered_at desc,id desc limit 20) shown),'[]'::jsonb),
    (select count(*)>20 from page) into result,more;
  return jsonb_build_object('items',result,'has_more',more);
end; $$;
create function public.list_business_sales(p_distributor_id uuid,p_period text,p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.list_business_sales(p_distributor_id,p_period,p_before_at,p_before_id); $$;

create function private.set_business_sale_cost(p_distributor_id uuid,p_order_id uuid,p_cost_clp integer,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_revision integer;
begin
  perform 1 from public.distributors where id=p_distributor_id for update;
  if auth.uid() is null then raise exception 'Business membership required' using errcode='42501'; end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501'; end if;
  if p_cost_clp is null or p_cost_clp<0 or p_revision is null or p_revision<0 then raise exception 'Invalid cost' using errcode='22023'; end if;
  perform 1 from public.orders where id=p_order_id and distributor_id=p_distributor_id and status='delivered' for share;
  if not found then raise exception 'Delivered business sale required' using errcode='42501'; end if;
  select revision into current_revision from public.distributor_sale_costs where order_id=p_order_id for update;
  if coalesce(current_revision,0)<>p_revision then raise exception 'Cost revision changed' using errcode='40001'; end if;
  insert into public.distributor_sale_costs(order_id,distributor_id,cost_clp,revision) values(p_order_id,p_distributor_id,p_cost_clp,p_revision+1)
    on conflict(order_id) do update set cost_clp=excluded.cost_clp,revision=excluded.revision;
  insert into private.business_workspace_events(distributor_id,actor_id,kind,entity_id,snapshot)
    values(p_distributor_id,auth.uid(),'sale_cost',p_order_id,jsonb_build_object('cost_clp',p_cost_clp,'revision',p_revision+1));
end; $$;
create function public.set_business_sale_cost(p_distributor_id uuid,p_order_id uuid,p_cost_clp integer,p_revision integer) returns void
language sql security invoker set search_path='' as $$ select private.set_business_sale_cost(p_distributor_id,p_order_id,p_cost_clp,p_revision); $$;

create function private.get_business_profile(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  return (select jsonb_build_object('display_name',coalesce(p.display_name,d.name),'description',p.description,'address',p.address,
    'commune_code',p.commune_code,'latitude',p.latitude,'longitude',p.longitude,'logo_path',p.logo_path,'cover_path',p.cover_path,'revision',coalesce(p.revision,0))
    from public.distributors d left join public.distributor_profiles p on p.distributor_id=d.id where d.id=p_distributor_id);
end; $$;
create function public.get_business_profile(p_distributor_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.get_business_profile(p_distributor_id); $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('business-media','business-media',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy business_media_member_read on storage.objects for select to authenticated
  using(bucket_id='business-media' and exists(select 1 from public.distributor_members m where m.distributor_id::text=split_part(name,'/',1) and m.user_id=(select auth.uid())));
create policy business_media_member_insert on storage.objects for insert to authenticated
  with check(bucket_id='business-media' and name ~ '^[0-9a-f-]{36}/(logo|cover)/[0-9a-f-]{36}\.(png|jpg|webp)$'
    and exists(select 1 from public.distributor_members m join public.distributors d on d.id=m.distributor_id
      where m.distributor_id::text=split_part(name,'/',1) and m.user_id=(select auth.uid()) and d.is_verified));
-- Immutable paths, no UPDATE/upsert or client deletion of a currently referenced image.
create function private.set_business_profile(p_distributor_id uuid,p_revision integer,p_profile jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare current_revision integer; image_path text; kind text;
begin
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found or auth.uid() is null then raise exception 'Verified membership required' using errcode='42501'; end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501'; end if;
  if p_revision is null or p_revision<0 or p_profile is null or jsonb_typeof(p_profile)<>'object'
    or not (p_profile ?& array['display_name','description','address','commune_code','latitude','longitude','logo_path','cover_path'])
    or jsonb_typeof(p_profile->'display_name')<>'string'
    or exists(select 1 from jsonb_each(p_profile) e where e.key in ('description','address','commune_code','logo_path','cover_path') and jsonb_typeof(e.value) not in ('string','null'))
    or exists(select 1 from jsonb_each(p_profile) e where e.key in ('latitude','longitude') and jsonb_typeof(e.value) not in ('number','null')) then
    raise exception 'Invalid profile' using errcode='22023'; end if;
  foreach kind in array array['logo','cover'] loop
    image_path:=p_profile->>(kind||'_path');
    if image_path is not null and (image_path !~ ('^'||p_distributor_id::text||'/'||kind||'/[0-9a-f-]{36}\.(png|jpg|webp)$')
      or not exists(select 1 from storage.objects where bucket_id='business-media' and name=image_path)) then
      raise exception 'Invalid business media' using errcode='22023'; end if;
  end loop;
  select revision into current_revision from public.distributor_profiles where distributor_id=p_distributor_id for update;
  if coalesce(current_revision,0)<>p_revision then raise exception 'Profile revision changed' using errcode='40001'; end if;
  insert into public.distributor_profiles(distributor_id,display_name,description,address,commune_code,latitude,longitude,logo_path,cover_path,revision)
    values(p_distributor_id,btrim(p_profile->>'display_name'),nullif(btrim(p_profile->>'description'),''),nullif(btrim(p_profile->>'address'),''),
      p_profile->>'commune_code',(p_profile->>'latitude')::double precision,(p_profile->>'longitude')::double precision,p_profile->>'logo_path',p_profile->>'cover_path',p_revision+1)
    on conflict(distributor_id) do update set display_name=excluded.display_name,description=excluded.description,address=excluded.address,
      commune_code=excluded.commune_code,latitude=excluded.latitude,longitude=excluded.longitude,logo_path=excluded.logo_path,cover_path=excluded.cover_path,revision=excluded.revision;
  insert into private.business_workspace_events(distributor_id,actor_id,kind,entity_id,snapshot)
    values(p_distributor_id,auth.uid(),'profile',p_distributor_id,p_profile||jsonb_build_object('revision',p_revision+1));
end; $$;
create function public.set_business_profile(p_distributor_id uuid,p_revision integer,p_profile jsonb) returns void
language sql security invoker set search_path='' as $$ select private.set_business_profile(p_distributor_id,p_revision,p_profile); $$;

create function private.list_business_vehicles(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'plate',v.plate,'label',v.label,'status',v.status,'driver_id',v.driver_id,'revision',v.revision,
    'is_busy',exists(select 1 from public.orders o where o.driver_id=v.driver_id and o.status in ('accepted','on_the_way'))) order by v.label,v.id),'[]'::jsonb)
    from public.distributor_vehicles v where v.distributor_id=p_distributor_id);
end; $$;
create function public.list_business_vehicles(p_distributor_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.list_business_vehicles(p_distributor_id); $$;

create function private.set_business_vehicle(p_distributor_id uuid,p_id uuid,p_revision integer,p_plate text,p_label text,p_status text,p_driver_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare current_vehicle public.distributor_vehicles; previous_driver uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501'; end if;
  select driver_id into previous_driver from public.distributor_vehicles where id=p_id and distributor_id=p_distributor_id;
  -- Acceptance locks drivers before the business. Serialize fleet edits in that same order.
  perform 1 from public.drivers where distributor_id=p_distributor_id and id in (previous_driver,p_driver_id) order by id for update;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found or auth.uid() is null then raise exception 'Verified membership required' using errcode='42501'; end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501'; end if;
  if p_id is null or p_revision is null or p_revision<0 or p_plate is null or p_label is null or p_status is null
    or p_plate !~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2})$' or char_length(btrim(p_label)) not between 2 and 80
    or p_status not in ('available','maintenance','inactive') then raise exception 'Invalid vehicle' using errcode='22023'; end if;
  if p_driver_id is not null then
    perform 1 from public.drivers where id=p_driver_id and distributor_id=p_distributor_id for share;
    if not found then raise exception 'Affiliated driver required' using errcode='22023'; end if;
  end if;
  select * into current_vehicle from public.distributor_vehicles where id=p_id for update;
  if found and current_vehicle.distributor_id<>p_distributor_id then raise exception 'Vehicle access denied' using errcode='42501'; end if;
  if coalesce(current_vehicle.revision,0)<>p_revision then raise exception 'Vehicle revision changed' using errcode='40001'; end if;
  if exists(select 1 from public.orders where driver_id in (current_vehicle.driver_id,p_driver_id) and status in ('accepted','on_the_way')) then
    raise exception 'Vehicle driver has active delivery' using errcode='55000'; end if;
  insert into public.distributor_vehicles(id,distributor_id,plate,label,status,driver_id,revision)
    values(p_id,p_distributor_id,p_plate,btrim(p_label),p_status,p_driver_id,p_revision+1)
    on conflict(id) do update set plate=excluded.plate,label=excluded.label,status=excluded.status,driver_id=excluded.driver_id,revision=excluded.revision;
  insert into private.business_workspace_events(distributor_id,actor_id,kind,entity_id,snapshot)
    values(p_distributor_id,auth.uid(),'vehicle',p_id,jsonb_build_object('plate',p_plate,'label',p_label,'status',p_status,'driver_id',p_driver_id,'revision',p_revision+1));
end; $$;
create function public.set_business_vehicle(p_distributor_id uuid,p_id uuid,p_revision integer,p_plate text,p_label text,p_status text,p_driver_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.set_business_vehicle(p_distributor_id,p_id,p_revision,p_plate,p_label,p_status,p_driver_id); $$;

revoke all on function private.business_period_start(text) from public,anon,authenticated,service_role;
revoke all on function private.get_business_dashboard(uuid,text),public.get_business_dashboard(uuid,text),
  private.list_business_sales(uuid,text,timestamptz,uuid),public.list_business_sales(uuid,text,timestamptz,uuid),
  private.set_business_sale_cost(uuid,uuid,integer,integer),public.set_business_sale_cost(uuid,uuid,integer,integer),
  private.get_business_profile(uuid),public.get_business_profile(uuid),
  private.set_business_profile(uuid,integer,jsonb),public.set_business_profile(uuid,integer,jsonb),
  private.list_business_vehicles(uuid),public.list_business_vehicles(uuid),
  private.set_business_vehicle(uuid,uuid,integer,text,text,text,uuid),public.set_business_vehicle(uuid,uuid,integer,text,text,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.get_business_dashboard(uuid,text),public.get_business_dashboard(uuid,text),
  private.list_business_sales(uuid,text,timestamptz,uuid),public.list_business_sales(uuid,text,timestamptz,uuid),
  private.set_business_sale_cost(uuid,uuid,integer,integer),public.set_business_sale_cost(uuid,uuid,integer,integer),
  private.get_business_profile(uuid),public.get_business_profile(uuid),
  private.set_business_profile(uuid,integer,jsonb),public.set_business_profile(uuid,integer,jsonb),
  private.list_business_vehicles(uuid),public.list_business_vehicles(uuid),
  private.set_business_vehicle(uuid,uuid,integer,text,text,text,uuid),public.set_business_vehicle(uuid,uuid,integer,text,text,text,uuid)
  to authenticated;

commit;
