begin;

-- A demo review is explicit; it is never evidence of regulatory compliance.
alter table public.distributors add column is_demo boolean not null default false;

create table public.distributor_applications (
  applicant_id uuid primary key references public.profiles(id),
  name text not null check(char_length(btrim(name)) between 2 and 120),
  rut text not null check(private.is_valid_rut(rut)),
  contact_name text not null check(char_length(btrim(contact_name)) between 2 and 100),
  phone text not null check(phone ~ '^\+56[2-9][0-9]{8}$'),
  address text not null check(char_length(btrim(address)) between 5 and 240),
  commune_code text not null references public.communes(code),
  brands text[] not null check(cardinality(brands) between 1 and 3 and brands <@ array['Lipigas','Gasco','Abastible']::text[] and array_position(brands,null) is null),
  commercial_evidence text not null check(char_length(btrim(commercial_evidence)) between 5 and 1000),
  storage_evidence text not null check(char_length(btrim(storage_evidence)) between 5 and 1000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  requested_at timestamptz not null default clock_timestamp(),
  reviewed_at timestamptz,
  decision_reason text check(char_length(btrim(decision_reason)) between 1 and 500),
  distributor_id uuid unique references public.distributors(id),
  check((status='pending' and reviewed_at is null and decision_reason is null and distributor_id is null)
     or (status='rejected' and reviewed_at is not null and decision_reason is not null and distributor_id is null)
     or (status='approved' and reviewed_at is not null and decision_reason is not null and distributor_id is not null))
);
create table private.distributor_application_reviews (
  id bigint generated always as identity primary key,
  applicant_id uuid not null references public.profiles(id),
  application_requested_at timestamptz not null,
  decision text not null check(decision in ('approved','rejected')),
  distributor_id uuid references public.distributors(id),
  is_demo boolean not null,
  reason text not null,
  operator_reference text not null,
  application_snapshot jsonb not null,
  database_user text not null default session_user,
  created_at timestamptz not null default clock_timestamp()
);
create index distributor_reviews_applicant_idx on private.distributor_application_reviews(applicant_id);
create index distributor_reviews_business_idx on private.distributor_application_reviews(distributor_id);

-- Prepared commercial data; order pricing/reservation integration is a separate change.
create table public.distributor_products (
  distributor_id uuid not null references public.distributors(id),
  product_id uuid not null references public.products(id),
  unit_price_clp integer check(unit_price_clp>=0),
  stock integer not null default 0 check(stock between 0 and 1000000),
  is_listed boolean not null default false,
  revision integer not null default 1 check(revision>0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(distributor_id,product_id),
  check(not is_listed or unit_price_clp is not null)
);
create index distributor_products_product_idx on public.distributor_products(product_id);
create table private.distributor_product_changes (
  id bigint generated always as identity primary key,
  distributor_id uuid not null references public.distributors(id),
  product_id uuid not null references public.products(id),
  actor_id uuid not null references public.profiles(id),
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create index distributor_product_changes_business_idx on private.distributor_product_changes(distributor_id);
create index distributor_product_changes_product_idx on private.distributor_product_changes(product_id);
create index distributor_product_changes_actor_idx on private.distributor_product_changes(actor_id);

alter table public.distributor_applications enable row level security;
alter table public.distributor_products enable row level security;
alter table private.distributor_application_reviews enable row level security;
alter table private.distributor_product_changes enable row level security;
revoke all on public.distributor_applications,public.distributor_products,
  private.distributor_application_reviews,private.distributor_product_changes from public,anon,authenticated,service_role;
revoke all on sequence private.distributor_application_reviews_id_seq,private.distributor_product_changes_id_seq
  from public,anon,authenticated,service_role;
grant select on public.distributor_applications,public.distributor_products to authenticated;
create policy distributor_applications_read_self on public.distributor_applications for select to authenticated
  using(applicant_id=(select auth.uid()));
create policy distributor_products_read_members on public.distributor_products for select to authenticated
  using(exists(select 1 from public.distributor_members m where m.distributor_id=distributor_products.distributor_id and m.user_id=(select auth.uid())));

create function private.submit_distributor_application(
  p_name text,p_rut text,p_contact_name text,p_phone text,p_address text,p_commune_code text,
  p_brands text[],p_commercial_evidence text,p_storage_evidence text,p_reapply boolean
) returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); application public.distributor_applications; next_request timestamptz;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  p_name:=btrim(p_name);p_contact_name:=btrim(p_contact_name);p_address:=btrim(p_address);
  p_commercial_evidence:=btrim(p_commercial_evidence);p_storage_evidence:=btrim(p_storage_evidence);
  p_rut:=upper(regexp_replace(p_rut,'[.[:space:]]','','g'));
  p_phone:=regexp_replace(p_phone,'[[:space:]()-]','','g');
  if p_phone ~ '^[2-9][0-9]{8}$' then p_phone:='+56'||p_phone;end if;
  if p_name is null or char_length(p_name) not between 2 and 120
    or p_contact_name is null or char_length(p_contact_name) not between 2 and 100
    or p_rut is null or not private.is_valid_rut(p_rut)
    or p_phone is null or p_phone !~ '^\+56[2-9][0-9]{8}$'
    or p_address is null or char_length(p_address) not between 5 and 240
    or p_commune_code is null or not exists(select 1 from public.communes where code=p_commune_code)
    or p_brands is null or cardinality(p_brands) not between 1 and 3
    or not p_brands <@ array['Lipigas','Gasco','Abastible']::text[] or array_position(p_brands,null) is not null
    or cardinality(p_brands)<>(select count(distinct b) from unnest(p_brands) b)
    or p_commercial_evidence is null or char_length(p_commercial_evidence) not between 5 and 1000
    or p_storage_evidence is null or char_length(p_storage_evidence) not between 5 and 1000 or p_reapply is null then
    raise exception 'Invalid business details' using errcode='22023';end if;
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile required' using errcode='42501';end if;
  if exists(select 1 from public.distributor_members where user_id=caller) then
    raise exception 'Existing business member' using errcode='55000';end if;
  select * into application from public.distributor_applications where applicant_id=caller for update;
  if found then
    if application.status='pending' and not p_reapply and
      row(application.name,application.rut,application.contact_name,application.phone,application.address,
        application.commune_code,application.brands,application.commercial_evidence,application.storage_evidence)
      is not distinct from row(p_name,p_rut,p_contact_name,p_phone,p_address,p_commune_code,p_brands,p_commercial_evidence,p_storage_evidence) then return;end if;
    if application.status<>'rejected' or not p_reapply then
      raise exception 'Application state changed' using errcode='55000';end if;
  elsif p_reapply then raise exception 'No rejected application' using errcode='55000';end if;
  next_request:=greatest(clock_timestamp(),application.requested_at+interval '1 microsecond');
  insert into public.distributor_applications(applicant_id,name,rut,contact_name,phone,address,commune_code,brands,commercial_evidence,storage_evidence,requested_at)
    values(caller,p_name,p_rut,p_contact_name,p_phone,p_address,p_commune_code,p_brands,p_commercial_evidence,p_storage_evidence,next_request)
    on conflict(applicant_id) do update set name=excluded.name,rut=excluded.rut,contact_name=excluded.contact_name,
      phone=excluded.phone,address=excluded.address,commune_code=excluded.commune_code,brands=excluded.brands,
      commercial_evidence=excluded.commercial_evidence,storage_evidence=excluded.storage_evidence,
      status='pending',requested_at=excluded.requested_at,reviewed_at=null,decision_reason=null;
end;
$$;
create function public.submit_distributor_application(
  p_name text,p_rut text,p_contact_name text,p_phone text,p_address text,p_commune_code text,
  p_brands text[],p_commercial_evidence text,p_storage_evidence text,p_reapply boolean
) returns void language sql security invoker set search_path='' as $$
  select private.submit_distributor_application(p_name,p_rut,p_contact_name,p_phone,p_address,p_commune_code,p_brands,p_commercial_evidence,p_storage_evidence,p_reapply);
$$;

-- SQL Editor as postgres only. Version prevents resolving a stale application.
create function private.review_distributor_application(
  p_applicant_id uuid,p_requested_at timestamptz,p_decision text,p_reason text,p_operator_reference text,p_is_demo boolean default false
) returns uuid language plpgsql security invoker set search_path='' as $$
declare application public.distributor_applications; business_id uuid;
begin
  if p_decision is null or p_decision not in ('approved','rejected') or p_requested_at is null
    or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500
    or p_operator_reference is null or char_length(btrim(p_operator_reference)) not between 1 and 120 or p_is_demo is null then
    raise exception 'Invalid review input' using errcode='22023';end if;
  perform 1 from public.profiles where id=p_applicant_id for update;
  select * into application from public.distributor_applications where applicant_id=p_applicant_id for update;
  if not found or application.status<>'pending' or application.requested_at<>p_requested_at then
    raise exception 'Pending current application required' using errcode='55000';end if;
  if p_decision='approved' then
    if exists(select 1 from public.distributor_members where user_id=p_applicant_id) then
      raise exception 'Business membership already exists' using errcode='55000';end if;
    insert into public.distributors(name,is_verified,is_demo)
      values(application.name,true,p_is_demo) returning id into business_id;
    insert into public.distributor_members values(business_id,p_applicant_id,'owner');
    insert into public.distributor_brands(distributor_id,brand)
      select business_id,b::public.gas_brand from unnest(application.brands) b;
  end if;
  update public.distributor_applications set status=p_decision,reviewed_at=clock_timestamp(),
    decision_reason=btrim(p_reason),distributor_id=business_id where applicant_id=p_applicant_id;
  insert into private.distributor_application_reviews(applicant_id,application_requested_at,decision,distributor_id,is_demo,reason,operator_reference,application_snapshot)
    values(p_applicant_id,p_requested_at,p_decision,business_id,p_is_demo,btrim(p_reason),btrim(p_operator_reference),to_jsonb(application));
  return business_id;
end;
$$;

create function private.list_my_businesses() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  return(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'is_verified',d.is_verified,
    'is_demo',d.is_demo,'accepts_driver_applications',d.accepts_driver_applications,'member_role',m.role,
    'brands',(select coalesce(jsonb_agg(b.brand order by b.brand),'[]'::jsonb) from public.distributor_brands b where b.distributor_id=d.id)) order by d.name,d.id),'[]'::jsonb)
    from public.distributors d join public.distributor_members m on m.distributor_id=d.id where m.user_id=auth.uid());
end;
$$;
create function public.list_my_businesses() returns jsonb
language sql security invoker set search_path='' as $$ select private.list_my_businesses(); $$;

create function private.set_business_recruitment(p_distributor_id uuid,p_accepts boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found then raise exception 'Verified business required' using errcode='42501';end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501';end if;
  if p_accepts is null then raise exception 'Invalid recruitment setting' using errcode='22023';end if;
  update public.distributors set accepts_driver_applications=p_accepts where id=p_distributor_id;
end;
$$;
create function public.set_business_recruitment(p_distributor_id uuid,p_accepts boolean) returns void
language sql security invoker set search_path='' as $$ select private.set_business_recruitment(p_distributor_id,p_accepts); $$;

create function private.list_business_products(p_distributor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501';end if;
  return(select coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'brand',p.brand,'weight_kg',p.weight_kg,'variant',p.variant,
    'unit_price_clp',s.unit_price_clp,'stock',coalesce(s.stock,0),'is_listed',coalesce(s.is_listed,false),'revision',coalesce(s.revision,0))
    order by p.brand,p.weight_kg,p.variant),'[]'::jsonb)
    from public.products p join public.distributor_brands b on b.brand=p.brand and b.distributor_id=p_distributor_id
    left join public.distributor_products s on s.product_id=p.id and s.distributor_id=p_distributor_id where p.is_active);
end;
$$;
create function public.list_business_products(p_distributor_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.list_business_products(p_distributor_id); $$;

create function private.set_business_product(p_distributor_id uuid,p_product_id uuid,p_unit_price_clp integer,p_stock integer,p_is_listed boolean,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_product public.distributor_products;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  if p_stock is null or p_stock not between 0 and 1000000 or p_unit_price_clp<0 or p_is_listed is null
    or (p_is_listed and p_unit_price_clp is null) or p_revision is null or p_revision<0 then
    raise exception 'Invalid commercial data' using errcode='22023';end if;
  -- Serialize first creation and updates per business, then lock trusted membership/brand.
  perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  if not found then raise exception 'Verified business required' using errcode='42501';end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501';end if;
  perform 1 from public.products p join public.distributor_brands b on b.brand=p.brand and b.distributor_id=p_distributor_id
    where p.id=p_product_id and p.is_active for share of p,b;
  if not found then raise exception 'Configured active product required' using errcode='22023';end if;
  select * into current_product from public.distributor_products where distributor_id=p_distributor_id and product_id=p_product_id for update;
  if coalesce(current_product.revision,0)<>p_revision then
    -- A retry after a lost response is harmless only if its exact change is already current.
    if current_product.revision=p_revision+1 and row(current_product.unit_price_clp,current_product.stock,current_product.is_listed)
      is not distinct from row(p_unit_price_clp,p_stock,p_is_listed) then return;end if;
    raise exception 'Product revision changed' using errcode='40001';end if;
  insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed,revision)
    values(p_distributor_id,p_product_id,p_unit_price_clp,p_stock,p_is_listed,p_revision+1)
    on conflict(distributor_id,product_id) do update set unit_price_clp=excluded.unit_price_clp,stock=excluded.stock,
      is_listed=excluded.is_listed,revision=excluded.revision,updated_at=clock_timestamp()
    returning * into current_product;
  insert into private.distributor_product_changes(distributor_id,product_id,actor_id,snapshot)
    values(p_distributor_id,p_product_id,auth.uid(),to_jsonb(current_product));
end;
$$;
create function public.set_business_product(p_distributor_id uuid,p_product_id uuid,p_unit_price_clp integer,p_stock integer,p_is_listed boolean,p_revision integer) returns void
language sql security invoker set search_path='' as $$ select private.set_business_product(p_distributor_id,p_product_id,p_unit_price_clp,p_stock,p_is_listed,p_revision); $$;

revoke all on function private.review_distributor_application(uuid,timestamptz,text,text,text,boolean)
  from public,anon,authenticated,service_role;
revoke all on function
  private.submit_distributor_application(text,text,text,text,text,text,text[],text,text,boolean),
  public.submit_distributor_application(text,text,text,text,text,text,text[],text,text,boolean),
  private.list_my_businesses(),public.list_my_businesses(),
  private.set_business_recruitment(uuid,boolean),public.set_business_recruitment(uuid,boolean),
  private.list_business_products(uuid),public.list_business_products(uuid),
  private.set_business_product(uuid,uuid,integer,integer,boolean,integer),public.set_business_product(uuid,uuid,integer,integer,boolean,integer)
  from public,anon,authenticated,service_role;
grant execute on function
  private.submit_distributor_application(text,text,text,text,text,text,text[],text,text,boolean),
  public.submit_distributor_application(text,text,text,text,text,text,text[],text,text,boolean),
  private.list_my_businesses(),public.list_my_businesses(),
  private.set_business_recruitment(uuid,boolean),public.set_business_recruitment(uuid,boolean),
  private.list_business_products(uuid),public.list_business_products(uuid),
  private.set_business_product(uuid,uuid,integer,integer,boolean,integer),public.set_business_product(uuid,uuid,integer,integer,boolean,integer)
  to authenticated;
commit;
