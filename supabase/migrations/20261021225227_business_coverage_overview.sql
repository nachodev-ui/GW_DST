begin;

-- Only business members may inspect their own team's operational coverage.
-- Keep driver RLS and the driver-owned settings write boundary unchanged.
create function private.get_business_coverage(p_distributor_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(
    select 1 from public.distributor_members
    where distributor_id=p_distributor_id and user_id=auth.uid()
  ) then
    raise exception 'Business membership required' using errcode='42501';
  end if;
  return (select jsonb_build_object(
    'business_enabled',business.is_verified and exists(
      select 1 from public.distributor_brands where distributor_id=business.id),
    'is_open',private.business_accepting_now(business.id),
    'drivers',coalesce((select jsonb_agg(jsonb_build_object(
      'id',driver.id,
      'name',coalesce(nullif(application.applicant_name,''),nullif(profile.display_name,''),'Conductor'),
      'status',case
        when not driver.is_verified or profile.role<>'driver' then 'not_enabled'
        when exists(select 1 from public.orders active where active.driver_id=driver.id
          and active.status in ('accepted','on_the_way')) then 'busy'
        when driver.is_available then 'available'
        else 'offline' end,
      'communes',coalesce((select jsonb_agg(jsonb_build_object('code',commune.code,'name',commune.name)
        order by commune.name,commune.code)
        from public.driver_communes coverage join public.communes commune on commune.code=coverage.commune_code
        where coverage.driver_id=driver.id),'[]'::jsonb)
    ) order by coalesce(application.applicant_name,profile.display_name,'Conductor'),driver.id)
      from public.drivers driver join public.profiles profile on profile.id=driver.id
      left join public.driver_applications application on application.driver_id=driver.id
      where driver.distributor_id=business.id),'[]'::jsonb)
  ) from public.distributors business where business.id=p_distributor_id);
end;
$$;

create function public.get_business_coverage(p_distributor_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.get_business_coverage(p_distributor_id);
$$;

revoke all on function private.get_business_coverage(uuid),public.get_business_coverage(uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.get_business_coverage(uuid),public.get_business_coverage(uuid)
  to authenticated;

notify pgrst, 'reload schema';
commit;
