begin;

-- One scoped read explains operational eligibility; this never grants access.
create function private.get_my_driver_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  caller uuid:=auth.uid(); profile_role public.profile_role; driver public.drivers;
  organization public.distributors; business jsonb; brand_list jsonb; reason text;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
  select role into profile_role from public.profiles where id=caller;
  if not found then raise exception 'Profile required' using errcode='42501';end if;
  select * into driver from public.drivers where id=caller;
  select * into organization from public.distributors where id=driver.distributor_id;
  select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) into brand_list
    from public.distributor_brands where distributor_id=organization.id;
  if organization.id is not null then
    business:=jsonb_build_object('id',organization.id,'name',organization.name,
      'is_verified',organization.is_verified,'is_demo',organization.is_demo,'brands',brand_list);
  end if;
  reason:=case when profile_role<>'driver' or not coalesce(driver.is_verified,false) then 'not_approved'
    when organization.id is null then 'no_business'
    when not organization.is_verified then 'business_disabled'
    when jsonb_array_length(brand_list)=0 then 'no_brands' else null end;
  return jsonb_build_object('is_verified',coalesce(driver.is_verified,false),
    'application_status',(select status from public.driver_applications where driver_id=caller),
    'business',business,'can_manage_business',exists(select 1 from public.distributor_members where user_id=caller),
    'can_receive_offers',reason is null,'blocking_reason',reason);
end;
$$;
create function public.get_my_driver_workspace() returns jsonb
language sql security invoker set search_path='' as $$ select private.get_my_driver_workspace(); $$;
revoke all on function private.get_my_driver_workspace(),public.get_my_driver_workspace()
  from public,anon,authenticated,service_role;
grant execute on function private.get_my_driver_workspace(),public.get_my_driver_workspace() to authenticated;
commit;
