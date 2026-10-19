-- SQL Editor as postgres, after 20261019004638_business_driver_invitations.sql.
-- First inspect the pending queue. The phone/email and identity checks are manual.
select a.driver_id, p.display_name, a.applicant_name, a.applicant_rut, a.applicant_phone,
  a.requested_distributor_id, a.requested_distributor_name, a.requested_at,a.invitation_id,
  i.invited_by,i.created_at as invitation_created_at,i.accepted_at,
  exists(select 1 from public.driver_affiliation_confirmations c where c.driver_id=a.driver_id
    and c.application_requested_at=a.requested_at and c.distributor_id=a.requested_distributor_id) as affiliation_confirmed
from public.driver_applications a join public.profiles p on p.id = a.driver_id
left join private.driver_invitations i on i.id=a.invitation_id
where a.status = 'pending' order by a.requested_at;

-- Replace every placeholder. Use rejected + NULL distributor to reject.
-- The reason is applicant-visible; never put internal notes or third-party data here.
-- operator_reference identifies the human using SQL Editor; it grants no permission.
-- Approve only complete applications, using exactly requested_distributor_id.
-- New incorporations require an invitation issued by the business and accepted by
-- the intended confirmed-email account. Its consent is attached to this application.
-- Earlier applications retain their manual, versioned business confirmation.
-- Real deliveries also require review of current driver/vehicle/training/business evidence;
-- neither this function nor Gasway's is_verified flag certifies SEC authorization.
begin;
do $$
declare
  applicant_id uuid := '00000000-0000-0000-0000-000000000000';
  organization_id uuid := '00000000-0000-0000-0000-000000000000';
  decision text := 'approved';
  reason text := 'REEMPLAZAR';
  operator_reference text := 'REEMPLAZAR';
begin
  if applicant_id = '00000000-0000-0000-0000-000000000000'
    or organization_id = '00000000-0000-0000-0000-000000000000'
    or reason = 'REEMPLAZAR' or operator_reference = 'REEMPLAZAR' then
    raise exception 'Completa la identidad, distribuidor, decisión, motivo y operador';
  end if;
  perform private.review_driver_application(applicant_id, decision, organization_id, reason, operator_reference);
end;
$$;
commit;
