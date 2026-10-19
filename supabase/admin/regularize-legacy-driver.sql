-- One-time repair for the sole confirmed legacy test account. Run as postgres
-- after 20261019021030. Never accepts an invitation or approves an affiliation.
begin;
do $$
declare
  target_id constant uuid := 'a162a099-70dc-4e89-a4b8-8f9f872aa835';
  driver public.drivers;
  application public.driver_applications;
  profile_role public.profile_role;
begin
  if current_user <> 'postgres' then raise exception 'Run as postgres' using errcode='42501';end if;
  select * into driver from public.drivers where id=target_id for update;
  if not found then raise exception 'Legacy account required' using errcode='55000';end if;
  -- A retry must never reopen the application after acceptance or review.
  if exists(select 1 from private.legacy_driver_regularizations where driver_id=target_id) then return;end if;
  select role into profile_role from public.profiles where id=target_id for update;
  select * into application from public.driver_applications where driver_id=target_id for update;
  if profile_role is distinct from 'driver' or not driver.is_verified or driver.distributor_id is not null
    or application.status is distinct from 'approved' or application.invitation_id is not null
    or application.applicant_name is not null or application.requested_distributor_id is not null
    or application.reviewed_at is not null
    or exists(select 1 from private.driver_application_reviews where driver_id=target_id)
    or exists(select 1 from public.orders where driver_id=target_id and status in ('accepted','on_the_way')) then
    raise exception 'Only the unreviewed, unaffiliated legacy account can be regularized' using errcode='55000';
  end if;
  if not exists(select 1 from auth.users u join private.driver_invitations i on i.email=lower(u.email)
    join public.distributors d on d.id=i.distributor_id
    where u.id=target_id and u.email_confirmed_at is not null and d.is_verified
      and i.is_current and i.status='pending' and i.expires_at>clock_timestamp()) then
    raise exception 'Current business invitation and confirmed account required' using errcode='55000';
  end if;
  insert into private.legacy_driver_regularizations
    (driver_id,previous_application,previous_role,previous_verified,previous_available,reason,operator_reference)
    values(target_id,to_jsonb(application),profile_role,driver.is_verified,driver.is_available,
      'Regularización única de habilitación antigua sin afiliación. Requiere aceptar invitación y revisión administrativa.',
      'Codex: regularización solicitada por el propietario del proyecto');
  update public.drivers set is_verified=false,is_available=false where id=target_id;
  update public.profiles set role='customer' where id=target_id;
  update public.driver_applications set status='pending',decision_reason=null,reviewed_at=null,
    requested_at=greatest(clock_timestamp(),application.requested_at+interval '1 microsecond') where driver_id=target_id;
end;
$$;
commit;
