-- Portable Test -> Project migration. Deploy targets are selected by the operator.
-- No table grants, RLS changes or new executable APIs.
begin;

-- Fail closed if applied without the documentary security contract. In particular,
-- never CREATE a missing function with the default PUBLIC execution privilege.
do $prerequisites$
begin
  if to_regprocedure('private.list_pending_documents(timestamptz,uuid)') is null
    or to_regprocedure('public.list_pending_documents(timestamptz,uuid)') is null
    or to_regprocedure('private.is_document_admin()') is null
    or to_regprocedure('public.review_document(uuid,text,text,date)') is null
    or to_regclass('private.document_admins') is null then
    raise exception 'Documentary security migration must be applied first';
  end if;
end;
$prerequisites$;

-- Keep the existing signature and ACL. The former flat queue now returns a v2
-- workspace envelope; the mobile boundary rejects the old response explicitly.
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
      select d.id, d.status, d.expires_on, d.created_at,
        coalesce(v.distributor_id, r.distributor_id) as business_id,
        coalesce(d.vehicle_id, d.driver_id) as owner_id,
        case when d.vehicle_id is not null then 'vehicle' else 'driver' end as owner_type
      from public.documents d
      left join public.distributor_vehicles v on v.id=d.vehicle_id
      left join public.drivers r on r.id=d.driver_id
      where d.status<>'superseded'
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

-- public.list_pending_documents remains the existing SECURITY INVOKER wrapper.
-- review_document, is_document_admin, storage policies and all ACLs stay intact.
commit;
