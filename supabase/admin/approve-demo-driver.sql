-- D0: explicitly authorized private demo, Gasway Project gleltbrvpfvfgggcatpt only.
-- Run as postgres. No real driver/vehicle/SEC clearance is claimed.
-- Does not change availability, stock, coverage or other accounts.
begin;
do $$
declare
  demo_driver uuid := 'a162a099-70dc-4e89-a4b8-8f9f872aa835';
  demo_business uuid := '10b7ae4e-06c2-4ca5-a55e-235be95bde9d';
  workspace jsonb;
  options jsonb;
  demo_product uuid;
begin
  if not exists (
    select 1 from auth.users u
    join public.driver_applications a on a.driver_id=u.id
    join private.driver_invitations i on i.id=a.invitation_id
    join public.distributors d on d.id=a.requested_distributor_id
    join public.distributor_members m on m.distributor_id=d.id and m.role='owner'
    join auth.users owner_account on owner_account.id=m.user_id
    where u.id=demo_driver and lower(u.email)='ig.cisternas@duocuc.cl'
      and u.email_confirmed_at is not null
      and a.status='pending'
      and a.requested_at='2026-10-19T02:28:55.624578+00:00'::timestamptz
      and d.id=demo_business and d.is_demo and d.is_verified
      and lower(owner_account.email)='ig.cisternas.dev@gmail.com'
      and i.status='accepted' and i.is_current
      and i.accepted_by=u.id and lower(i.email)=lower(u.email)
      and i.distributor_id=d.id
  ) then
    raise exception 'Demo identity, application or accepted invitation changed; inspect again';
  end if;
  perform private.review_driver_application(
    demo_driver, 'approved', demo_business,
    'Aprobado exclusivamente para demo privada con pedidos ficticios. Sin validacion documental para reparto real ni certificacion SEC.',
    'Nacho via Codex, D0 autorizado 2026-10-23'
  );
  -- Read the real RPCs under each restricted database role, without passwords
  -- or new Auth sessions. This verifies DB permissions, not a device login.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',demo_driver,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  workspace := public.get_my_driver_workspace();
  if workspace->>'application_status' is distinct from 'approved'
    or workspace->>'is_verified' is distinct from 'true'
    or workspace->>'can_receive_offers' is distinct from 'true'
    or workspace->>'can_manage_business' is distinct from 'false' then
    raise exception 'Demo driver RPC readiness failed';
  end if;
  execute 'reset role';
  select id into strict demo_product from public.products
    where brand='Lipigas' and weight_kg=11 and variant='standard' and is_active;
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub','ea3a74fb-0c3e-4f05-94b3-be32e2af3881','role','authenticated')::text,true);
  execute 'set local role authenticated';
  options := public.list_delivery_options(demo_product,'13110',1,true);
  if not exists(select 1 from jsonb_array_elements(options) item
    where item->>'id'=demo_business::text and item->>'is_demo'='true') then
    raise exception 'Demo business is not visible through the customer RPC';
  end if;
  execute 'reset role';
end;
$$;
commit;

select p.role,d.is_verified,d.is_available,d.distributor_id,a.status,
  a.reviewed_at,b.is_demo
from public.drivers d join public.profiles p on p.id=d.id
join public.driver_applications a on a.driver_id=d.id
join public.distributors b on b.id=d.distributor_id
where d.id='a162a099-70dc-4e89-a4b8-8f9f872aa835';
