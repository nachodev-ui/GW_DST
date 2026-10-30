begin;

-- Replaced submissions are neither pending work nor reviewed decisions.
alter table public.documents drop constraint documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('pending','approved','rejected','superseded','replaced'));
do $provenance$
declare constraint_name text;
begin
  select conname into strict constraint_name from pg_constraint
    where conrelid='public.documents'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%reviewed_by%'
      and pg_get_constraintdef(oid) like '%pending%';
  execute format('alter table public.documents drop constraint %I',constraint_name);
end;
$provenance$;
alter table public.documents add constraint documents_review_provenance_check check (
  (status in ('pending','replaced') and reviewed_by is null and reviewed_at is null and rejection_reason is null)
  or (status in ('approved','rejected','superseded') and reviewed_by is not null and reviewed_at is not null and reviewed_by<>submitted_by)
);

-- Repair existing duplicate queues without deleting files or manufacturing reviews.
with ranked as (
  select id,row_number() over(partition by vehicle_id,driver_id,type order by created_at desc,id desc) as position
  from public.documents where status='pending'
)
update public.documents d set status='replaced' from ranked r where d.id=r.id and r.position>1;

create unique index documents_vehicle_pending_unique_idx on public.documents(vehicle_id,type)
  where status='pending' and vehicle_id is not null;
create unique index documents_driver_pending_unique_idx on public.documents(driver_id,type)
  where status='pending' and driver_id is not null;

create or replace function private.submit_document(p_owner_type text,p_owner_id uuid,p_type text,p_path text,p_expires_on date) returns uuid
language plpgsql security definer set search_path='' as $$
declare object storage.objects; result uuid; owner_business uuid; selected_class text;
begin
  owner_business:=private.lock_document_owner(p_owner_type,p_owner_id);
  if not private.document_storage_access('documents',p_path,true) or split_part(p_path,'/',2)<>p_owner_type
    or split_part(p_path,'/',3)<>p_owner_id::text then raise exception 'Document upload denied' using errcode='42501'; end if;
  select * into object from storage.objects where bucket_id='documents' and name=p_path for share;
  if not found or object.owner_id is distinct from auth.uid()::text then raise exception 'Own uploaded file required' using errcode='42501'; end if;
  select id into result from public.documents where file_path=p_path and submitted_by=auth.uid()
    and type=p_type and (vehicle_id=p_owner_id or driver_id=p_owner_id);
  if found then return result; end if;
  -- The owner lock serializes uploads and reviews; retries above never resurrect an older version.
  update public.documents set status='replaced' where status='pending' and type=p_type
    and ((p_owner_type='vehicle' and vehicle_id=p_owner_id) or (p_owner_type='driver' and driver_id=p_owner_id));
  if p_type='driver_license_back' then select license_class into selected_class from public.drivers where id=p_owner_id; end if;
  insert into public.documents(vehicle_id,driver_id,type,file_path,mime_type,size_bytes,expires_on,license_class,submitted_by,created_at)
    values(case when p_owner_type='vehicle' then p_owner_id end,case when p_owner_type='driver' then p_owner_id end,
      p_type,p_path,object.metadata->>'mimetype',(object.metadata->>'size')::integer,p_expires_on,selected_class,auth.uid(),clock_timestamp()) returning id into result;
  return result;
end; $$;

-- Summaries count the current file per type, not historical attempts.
create or replace function private.list_pending_documents(
  p_before_at timestamptz default null, p_before_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare today date := (now() at time zone 'America/Santiago')::date;
begin
  if not private.is_document_admin() then
    raise exception 'Document admin required' using errcode='42501';
  end if;
  if p_before_at is not null or p_before_id is not null then
    raise exception 'Workspace v2 does not accept document cursors' using errcode='22023';
  end if;
  return (
    with current_documents as (
      select distinct on (d.vehicle_id,d.driver_id,d.type) d.id, d.status, d.expires_on, d.created_at,
        coalesce(v.distributor_id, r.distributor_id) as business_id,
        coalesce(d.vehicle_id, d.driver_id) as owner_id,
        case when d.vehicle_id is not null then 'vehicle' else 'driver' end as owner_type
      from public.documents d
      left join public.distributor_vehicles v on v.id=d.vehicle_id
      left join public.drivers r on r.id=d.driver_id
      where d.status not in ('superseded','replaced')
      order by d.vehicle_id,d.driver_id,d.type,(d.status='pending') desc,d.created_at desc,d.id desc
    ), owners as (
      select business_id, owner_id as id, owner_type as type,
        count(*) filter (where status='pending') as pending,
        count(*) filter (where status='approved') as approved,
        count(*) filter (where status='rejected') as rejected,
        count(*) filter (where status in ('pending','approved') and expires_on between today and today+30) as expiring,
        count(*) filter (where status in ('pending','approved') and expires_on<today) as expired,
        min(created_at) filter (where status='pending') as oldest_pending_at
      from current_documents group by business_id, owner_id, owner_type
    ), businesses as (
      select b.id, b.name,
        coalesce(sum(o.pending),0)::bigint as pending,
        coalesce(sum(o.approved),0)::bigint as approved,
        coalesce(sum(o.rejected),0)::bigint as rejected,
        coalesce(sum(o.expiring),0)::bigint as expiring,
        coalesce(sum(o.expired),0)::bigint as expired,
        min(o.oldest_pending_at) as oldest_pending_at,
        coalesce(jsonb_agg(jsonb_build_object('id',o.id,'type',o.type,
          'pending',o.pending,'approved',o.approved,'rejected',o.rejected,
          'expiring',o.expiring,'expired',o.expired,'oldest_pending_at',o.oldest_pending_at)
          order by o.oldest_pending_at nulls last,o.type,o.id)
          filter (where o.id is not null),'[]'::jsonb) as owners
      from public.distributors b left join owners o on o.business_id=b.id
      group by b.id,b.name
    )
    select jsonb_build_object(
      'version',2,'today',today,
      'metrics',jsonb_build_object(
        'pending_businesses',count(*) filter (where pending>0),
        'pending_documents',coalesce(sum(pending),0),
        'expiring_documents',coalesce(sum(expiring),0),
        'expired_documents',coalesce(sum(expired),0),
        'total_businesses',count(*)),
      'next_business_ids',(select coalesce(jsonb_agg(q.id order by q.oldest_pending_at,q.id),'[]'::jsonb)
        from (select id,oldest_pending_at from businesses where pending>0
          order by oldest_pending_at,id limit 5) q),
      'businesses',coalesce(jsonb_agg(to_jsonb(b) order by b.oldest_pending_at nulls last,b.name,b.id),'[]'::jsonb)
    ) from businesses b
  );
end;
$$;


-- review_document keeps its owner lock and rejects every non-pending version.
commit;
