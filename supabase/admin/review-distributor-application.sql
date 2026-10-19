-- Gasway: run as postgres after 20261018215921_business_onboarding.sql.
-- References are declarations, not verified documents. For real operation, inspect
-- current evidence privately and record who reviewed it. Never treat demo approval
-- as a real commercial/SEC clearance. No mobile endpoint can call this function.
select applicant_id,name,rut,contact_name,phone,address,commune_code,brands,
  commercial_evidence,storage_evidence,status,requested_at,reviewed_at,decision_reason,distributor_id
from public.distributor_applications order by requested_at;

-- Copy the EXACT requested_at from the current application (keep microseconds).
-- select private.review_distributor_application(
--   'APPLICANT_UUID'::uuid,'CURRENT_REQUESTED_AT'::timestamptz,
--   'approved','Motivo documentado','Responsable y referencia de revisión',false
-- );
-- select private.review_distributor_application(
--   'APPLICANT_UUID'::uuid,'CURRENT_REQUESTED_AT'::timestamptz,
--   'rejected','Antecedentes por corregir','Responsable y referencia de revisión',false
-- );

select applicant_id,application_requested_at,decision,distributor_id,is_demo,reason,
  operator_reference,database_user,created_at
from private.distributor_application_reviews order by id desc;
