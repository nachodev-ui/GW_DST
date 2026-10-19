begin;

create table private.driver_invitations (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references public.distributors(id),
  name text not null check(char_length(btrim(name)) between 2 and 100),
  email text not null check(email=lower(btrim(email)) and char_length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp()+interval '7 days',
  status text not null default 'pending' check(status in ('pending','accepted','cancelled','expired')),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  is_current boolean not null default true,
  check((status='accepted' and accepted_by is not null and accepted_at is not null)
     or (status<>'accepted' and accepted_by is null and accepted_at is null))
);
create unique index driver_invitations_current_email_idx on private.driver_invitations(distributor_id,email)
  where is_current and status in ('pending','accepted');
create unique index driver_invitations_current_driver_idx on private.driver_invitations(accepted_by)
  where is_current and status='accepted';
create index driver_invitations_inviter_idx on private.driver_invitations(invited_by);
create index driver_invitations_business_idx on private.driver_invitations(distributor_id,created_at desc,id);
create table private.driver_invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references private.driver_invitations(id),
  actor_id uuid not null references public.profiles(id),
  event text not null check(event in ('created','accepted','cancelled','expired','superseded')),
  created_at timestamptz not null default clock_timestamp()
);
create index driver_invitation_events_invitation_idx on private.driver_invitation_events(invitation_id);
create index driver_invitation_events_actor_idx on private.driver_invitation_events(actor_id);
alter table private.driver_invitations enable row level security;
alter table private.driver_invitation_events enable row level security;
revoke all on private.driver_invitations,private.driver_invitation_events from public,anon,authenticated,service_role;
alter table public.driver_applications add column invitation_id uuid references private.driver_invitations(id);
create index driver_applications_invitation_idx on public.driver_applications(invitation_id);

-- Retain historical applications/reviews, but remove every mobile self-enrolment path.
update public.distributors set accepts_driver_applications=false where accepts_driver_applications;
revoke execute on function public.request_driver_access(),private.request_driver_access(),
  public.reapply_driver_access(),private.reapply_driver_access(),
  public.submit_driver_application(text,text,text,uuid,boolean),private.submit_driver_application(text,text,text,uuid,boolean),
  public.list_application_distributors(),private.list_application_distributors(),
  public.set_business_recruitment(uuid,boolean),private.set_business_recruitment(uuid,boolean)
  from public,anon,authenticated,service_role;

create function private.create_driver_invitations(p_distributor_id uuid,p_entries jsonb,p_preview boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); entry jsonb; recipient text; person text;
  invitation private.driver_invitations; result jsonb:='[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  if p_preview is null or p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries) not between 1 and 100 then
    raise exception 'Use 1 to 100 invitations' using errcode='22023';end if;
  -- Validate the entire batch before writes. A repeated batch never resets pending invitations.
  for entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'name') is distinct from 'string'
      or jsonb_typeof(entry->'email') is distinct from 'string' or entry - array['name','email'] <> '{}'::jsonb
      or char_length(btrim(entry->>'name')) not between 2 and 100
      or char_length(btrim(entry->>'email'))>254 or btrim(entry->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Invalid invitation entry' using errcode='22023';end if;
  end loop;
  if (select count(distinct lower(btrim(value->>'email'))) from jsonb_array_elements(p_entries))<>jsonb_array_length(p_entries) then
    raise exception 'Duplicate emails in batch' using errcode='22023';end if;
  if p_preview then
    perform 1 from public.distributors where id=p_distributor_id and is_verified for share;
  else
    perform 1 from public.distributors where id=p_distributor_id and is_verified for update;
  end if;
  if not found then raise exception 'Verified business required' using errcode='42501';end if;
  perform 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=caller for share;
  if not found then raise exception 'Business membership required' using errcode='42501';end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
    recipient:=lower(btrim(entry->>'email'));person:=btrim(entry->>'name');
    select * into invitation from private.driver_invitations where distributor_id=p_distributor_id
      and email=recipient and is_current and status in ('pending','accepted') for update;
    if p_preview then
      result:=result||jsonb_build_array(jsonb_build_object('id',invitation.id,'email',recipient,'result',
        case when invitation.id is not null and ((invitation.status='pending' and invitation.expires_at>clock_timestamp())
          or (invitation.status='accepted' and not exists(select 1 from public.driver_applications where driver_id=invitation.accepted_by and status='rejected')))
          then 'existing' else 'new' end));
      continue;
    end if;
    if found then
      if invitation.status='pending' and invitation.expires_at<=clock_timestamp() then
        update private.driver_invitations set status='expired',is_current=false where id=invitation.id;
        insert into private.driver_invitation_events(invitation_id,actor_id,event) values(invitation.id,caller,'expired');
      elsif invitation.status='accepted' and exists(select 1 from public.driver_applications where driver_id=invitation.accepted_by and status='rejected') then
        update private.driver_invitations set is_current=false where id=invitation.id;
        insert into private.driver_invitation_events(invitation_id,actor_id,event) values(invitation.id,caller,'superseded');
      else
        result:=result||jsonb_build_array(jsonb_build_object('id',invitation.id,'email',recipient,'result','existing'));
        continue;
      end if;
    end if;
    insert into private.driver_invitations(distributor_id,name,email,invited_by)
      values(p_distributor_id,person,recipient,caller) returning * into invitation;
    insert into private.driver_invitation_events(invitation_id,actor_id,event) values(invitation.id,caller,'created');
    result:=result||jsonb_build_array(jsonb_build_object('id',invitation.id,'email',recipient,'result','created'));
  end loop;
  return result;
end;
$$;
create function public.create_driver_invitations(p_distributor_id uuid,p_entries jsonb,p_preview boolean default false) returns jsonb
language sql security invoker set search_path='' as $$ select private.create_driver_invitations(p_distributor_id,p_entries,p_preview); $$;

create function private.cancel_driver_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare invitation private.driver_invitations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  select * into invitation from private.driver_invitations where id=p_invitation_id;
  perform 1 from public.distributors where id=invitation.distributor_id for share;
  perform 1 from public.distributor_members where distributor_id=invitation.distributor_id and user_id=auth.uid() for share;
  if not found then raise exception 'Business membership required' using errcode='42501';end if;
  select * into invitation from private.driver_invitations where id=p_invitation_id for update;
  if invitation.status='cancelled' then return;end if;
  if invitation.status<>'pending' or not invitation.is_current then raise exception 'Pending invitation required' using errcode='55000';end if;
  update private.driver_invitations set status='cancelled',is_current=false where id=invitation.id;
  insert into private.driver_invitation_events(invitation_id,actor_id,event) values(invitation.id,auth.uid(),'cancelled');
end;
$$;
create function public.cancel_driver_invitation(p_invitation_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.cancel_driver_invitation(p_invitation_id); $$;

create function private.invitation_for_account(p_invitation_id uuid) returns private.driver_invitations
language plpgsql security definer set search_path='' as $$
declare recipient text; invitation private.driver_invitations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  select lower(btrim(email)) into recipient from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if recipient is null or p_invitation_id is null then
    raise exception 'Invitation unavailable for this verified account' using errcode='GW005';end if;
  select * into invitation from private.driver_invitations
    where id=p_invitation_id and email=recipient and is_current;
  if not found or invitation.status not in ('pending','accepted')
    or (invitation.status='pending' and invitation.expires_at<=clock_timestamp())
    or (invitation.status='accepted' and invitation.accepted_by<>auth.uid()) then
    raise exception 'Invitation unavailable for this verified account' using errcode='GW005';end if;
  return invitation;
end;
$$;
revoke all on function private.invitation_for_account(uuid) from public,anon,authenticated,service_role;

create function private.accept_driver_invitation(p_invitation_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); invitation private.driver_invitations; old_invitation private.driver_invitations;
  application public.driver_applications;
begin
  invitation:=private.invitation_for_account(p_invitation_id);
  insert into public.drivers(id) values(caller) on conflict(id) do nothing;
  perform 1 from public.drivers where id=caller for update;
  select * into application from public.driver_applications where driver_id=caller for update;
  perform 1 from public.distributors where id=invitation.distributor_id and is_verified for share;
  if not found then raise exception 'Verified business required' using errcode='55000';end if;
  -- Business before invitation matches issuance/cancellation and avoids inverted locks.
  perform 1 from private.driver_invitations where id=invitation.id for update;
  invitation:=private.invitation_for_account(p_invitation_id);
  if invitation.status='accepted' and invitation.accepted_by=caller then return invitation.id;end if;
  if exists(select 1 from public.drivers where id=caller and is_verified)
    or not exists(select 1 from public.profiles where id=caller and role='customer')
    or exists(select 1 from public.orders where driver_id=caller and status in ('accepted','on_the_way')) then
    raise exception 'Operational driver cannot be reassigned' using errcode='55000';end if;
  if application.status='pending' and application.applicant_name is not null
    and application.requested_distributor_id is distinct from invitation.distributor_id then
    raise exception 'Another application is under review' using errcode='55000';end if;
  for old_invitation in select * from private.driver_invitations where accepted_by=caller and status='accepted' and is_current for update loop
    if application.status is distinct from 'rejected' then raise exception 'Existing accepted invitation' using errcode='55000';end if;
    update private.driver_invitations set is_current=false where id=old_invitation.id;
    insert into private.driver_invitation_events(invitation_id,actor_id,event) values(old_invitation.id,caller,'superseded');
  end loop;
  update private.driver_invitations set status='accepted',accepted_by=caller,accepted_at=clock_timestamp() where id=invitation.id;
  insert into private.driver_invitation_events(invitation_id,actor_id,event) values(invitation.id,caller,'accepted');
  return invitation.id;
end;
$$;
create function public.accept_driver_invitation(p_invitation_id uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.accept_driver_invitation(p_invitation_id); $$;

create function private.get_my_driver_invitation() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  return(select jsonb_build_object('id',i.id,'distributor_id',d.id,'distributor_name',d.name,'name',i.name,
    'accepted_at',i.accepted_at,'business_enabled',d.is_verified)
    from private.driver_invitations i join public.distributors d on d.id=i.distributor_id
    where i.accepted_by=auth.uid() and i.status='accepted' and i.is_current);
end;
$$;
create function public.get_my_driver_invitation() returns jsonb
language sql security invoker set search_path='' as $$ select private.get_my_driver_invitation(); $$;

create function private.list_my_driver_invitations() returns jsonb
language plpgsql security definer set search_path='' as $$
declare recipient text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  select lower(btrim(email)) into recipient from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if recipient is null then raise exception 'Confirmed email required' using errcode='GW005';end if;
  return(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'distributor_id',d.id,'distributor_name',d.name,
    'name',i.name,'expires_at',i.expires_at) order by i.created_at desc,i.id),'[]'::jsonb)
    from private.driver_invitations i join public.distributors d on d.id=i.distributor_id
    where i.email=recipient and i.is_current and i.status='pending' and i.expires_at>clock_timestamp() and d.is_verified);
end;
$$;
create function public.list_my_driver_invitations() returns jsonb
language sql security invoker set search_path='' as $$ select private.list_my_driver_invitations(); $$;

create function private.submit_invited_driver_application(p_invitation_id uuid,p_name text,p_rut text,p_phone text,p_reapply boolean) returns void
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); invitation private.driver_invitations; application public.driver_applications;
  organization_name text; next_request timestamptz;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  p_name:=btrim(p_name);p_rut:=upper(regexp_replace(p_rut,'[.[:space:]]','','g'));
  p_phone:=regexp_replace(p_phone,'[-()[:space:]]','','g');
  if p_phone ~ '^[2-9][0-9]{8}$' then p_phone:='+56'||p_phone;end if;
  if p_name is null or char_length(p_name) not between 2 and 100 or p_rut is null or not private.is_valid_rut(p_rut)
    or p_phone is null or p_phone !~ '^\+56[2-9][0-9]{8}$' or p_reapply is null then
    raise exception 'Invalid driver details' using errcode='22023';end if;
  perform 1 from public.drivers where id=caller for update;
  if not found or exists(select 1 from public.drivers where id=caller and is_verified)
    or not exists(select 1 from public.profiles where id=caller and role='customer')
    or exists(select 1 from public.orders where driver_id=caller and status in ('accepted','on_the_way')) then
    raise exception 'Driver cannot apply' using errcode='55000';end if;
  select * into application from public.driver_applications where driver_id=caller for update;
  select * into invitation from private.driver_invitations where id=p_invitation_id and accepted_by=caller and status='accepted' and is_current;
  if not found then raise exception 'Accepted personal invitation required' using errcode='42501';end if;
  select name into organization_name from public.distributors where id=invitation.distributor_id and is_verified for share;
  if not found then raise exception 'Verified business required' using errcode='55000';end if;
  select * into invitation from private.driver_invitations where id=p_invitation_id and accepted_by=caller and status='accepted' and is_current for share;
  if not found then raise exception 'Invitation changed' using errcode='42501';end if;
  if application.status='pending' and application.invitation_id=p_invitation_id
    and row(application.applicant_name,application.applicant_rut,application.applicant_phone) is not distinct from row(p_name,p_rut,p_phone) then return;end if;
  if application.status='approved' or (application.status='rejected' and (not p_reapply or application.invitation_id=p_invitation_id))
    or (application.driver_id is null and p_reapply)
    or (application.status='pending' and application.applicant_name is not null and
      (application.invitation_id is not null or application.requested_distributor_id is distinct from invitation.distributor_id)) then
    raise exception 'Application state changed or new invitation required' using errcode='55000';end if;
  next_request:=greatest(clock_timestamp(),application.requested_at+interval '1 microsecond');
  insert into public.driver_applications(driver_id,applicant_name,applicant_rut,applicant_phone,requested_distributor_id,requested_distributor_name,invitation_id,requested_at)
    values(caller,p_name,p_rut,p_phone,invitation.distributor_id,organization_name,invitation.id,next_request)
    on conflict(driver_id) do update set applicant_name=excluded.applicant_name,applicant_rut=excluded.applicant_rut,
      applicant_phone=excluded.applicant_phone,requested_distributor_id=excluded.requested_distributor_id,
      requested_distributor_name=excluded.requested_distributor_name,invitation_id=excluded.invitation_id,
      requested_at=excluded.requested_at,status='pending',decision_reason=null,reviewed_at=null;
  insert into public.driver_affiliation_confirmations(driver_id,application_requested_at,distributor_id,confirmed_by,confirmed_at)
    values(caller,next_request,invitation.distributor_id,invitation.invited_by,invitation.created_at);
  update public.drivers set is_available=false where id=caller;
end;
$$;
create function public.submit_invited_driver_application(p_invitation_id uuid,p_name text,p_rut text,p_phone text,p_reapply boolean) returns void
language sql security invoker set search_path='' as $$ select private.submit_invited_driver_application(p_invitation_id,p_name,p_rut,p_phone,p_reapply); $$;

create function private.list_driver_team(p_distributor_id uuid,p_offset integer default 0,p_search text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.distributor_members where distributor_id=p_distributor_id and user_id=auth.uid()) then
    raise exception 'Business membership required' using errcode='42501';end if;
  if p_offset is null or p_offset not between 0 and 100000 or p_search is null or char_length(p_search)>100 then
    raise exception 'Invalid page' using errcode='22023';end if;
  with team as (
    select i.id as invitation_id,i.accepted_by as driver_id,i.name,i.email,i.created_at,
      case when i.status='pending' and i.expires_at<=clock_timestamp() then 'expired' else i.status end as invitation_status,
      i.is_current,i.expires_at,
      case when i.status<>'accepted' then null
        when a.invitation_id is distinct from i.id then 'incomplete'
        when a.status='rejected' then 'rejected'
        when a.status='approved' and d.is_verified and p.role='driver' then 'enabled'
        when a.status='approved' then 'suspended' else 'in_review' end as activation_status,
      null::timestamptz as legacy_requested_at,null::boolean as affiliation_confirmed
    from private.driver_invitations i left join public.driver_applications a on a.driver_id=i.accepted_by
      left join public.drivers d on d.id=i.accepted_by left join public.profiles p on p.id=i.accepted_by
    where i.distributor_id=p_distributor_id
    union all
    select null,d.id,coalesce(a.applicant_name,p.display_name,'Conductor'),null,d.created_at,'legacy',true,null,
      case when a.status='approved' and d.is_verified and p.role='driver' then 'enabled'
        when a.status='approved' then 'suspended' when a.status='rejected' then 'rejected'
        when a.applicant_name is null then 'incomplete' else 'in_review' end,
      case when a.status='pending' and a.applicant_name is not null then a.requested_at end,
      exists(select 1 from public.driver_affiliation_confirmations c where c.driver_id=d.id and c.application_requested_at=a.requested_at and c.distributor_id=p_distributor_id)
    from public.drivers d join public.profiles p on p.id=d.id left join public.driver_applications a on a.driver_id=d.id
    where (d.distributor_id=p_distributor_id or a.requested_distributor_id=p_distributor_id) and a.invitation_id is null
      and not exists(select 1 from private.driver_invitations i where i.accepted_by=d.id and i.distributor_id=p_distributor_id and i.is_current)
  ), page as (
    select * from team where position(lower(btrim(p_search)) in lower(name||' '||coalesce(email,'')))>0
    order by created_at desc,coalesce(invitation_id,driver_id) offset p_offset limit 21
  ) select coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,coalesce(invitation_id,driver_id)),'[]'::jsonb) into payload from page;
  return jsonb_build_object('items',(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(payload) with ordinality where ordinality<=20),
    'has_more',jsonb_array_length(payload)>20);
end;
$$;
create function public.list_driver_team(p_distributor_id uuid,p_offset integer default 0,p_search text default '') returns jsonb
language sql security invoker set search_path='' as $$ select private.list_driver_team(p_distributor_id,p_offset,p_search); $$;

create function private.guard_invited_application_approval() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' and new.invitation_id is not null
    and not exists(select 1 from private.driver_invitations i where i.id=new.invitation_id
      and i.accepted_by=new.driver_id and i.status='accepted' and i.is_current and i.distributor_id=new.requested_distributor_id) then
    raise exception 'Accepted business invitation required' using errcode='55000';end if;
  return new;
end;
$$;
create trigger guard_invited_application_approval before update on public.driver_applications
  for each row execute function private.guard_invited_application_approval();
create function private.capture_invitation_in_review() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.application_snapshot:=coalesce(new.application_snapshot,'{}'::jsonb)||jsonb_build_object('business_invitation',
    (select jsonb_build_object('id',i.id,'invited_by',i.invited_by,'created_at',i.created_at,'accepted_by',i.accepted_by,'accepted_at',i.accepted_at)
      from private.driver_invitations i join public.driver_applications a on a.invitation_id=i.id where a.driver_id=new.driver_id));
  return new;
end;
$$;
create trigger capture_review_invitation before insert on private.driver_application_reviews
  for each row execute function private.capture_invitation_in_review();
revoke all on function private.guard_invited_application_approval(),private.capture_invitation_in_review()
  from public,anon,authenticated,service_role;

revoke all on function
  private.create_driver_invitations(uuid,jsonb,boolean),public.create_driver_invitations(uuid,jsonb,boolean),
  private.cancel_driver_invitation(uuid),public.cancel_driver_invitation(uuid),
  private.accept_driver_invitation(uuid),public.accept_driver_invitation(uuid),
  private.get_my_driver_invitation(),public.get_my_driver_invitation(),
  private.list_my_driver_invitations(),public.list_my_driver_invitations(),
  private.submit_invited_driver_application(uuid,text,text,text,boolean),public.submit_invited_driver_application(uuid,text,text,text,boolean),
  private.list_driver_team(uuid,integer,text),public.list_driver_team(uuid,integer,text)
  from public,anon,authenticated,service_role;
grant execute on function
  private.create_driver_invitations(uuid,jsonb,boolean),public.create_driver_invitations(uuid,jsonb,boolean),
  private.cancel_driver_invitation(uuid),public.cancel_driver_invitation(uuid),
  private.accept_driver_invitation(uuid),public.accept_driver_invitation(uuid),
  private.get_my_driver_invitation(),public.get_my_driver_invitation(),
  private.list_my_driver_invitations(),public.list_my_driver_invitations(),
  private.submit_invited_driver_application(uuid,text,text,text,boolean),public.submit_invited_driver_application(uuid,text,text,text,boolean),
  private.list_driver_team(uuid,integer,text),public.list_driver_team(uuid,integer,text)
  to authenticated;
commit;
