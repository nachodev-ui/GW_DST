-- Dedicated Test only; the runner supplies marker, transaction and rollback.
do $$
declare
  person uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  compatible uuid := gen_random_uuid();
  invalid_person uuid;
  invalid_phone jsonb;
  affected integer;
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private') and c.relkind in ('r','p')
      and not c.relrowsecurity
      and not exists(select 1 from pg_depend d where d.objid=c.oid
        and d.classid='pg_class'::regclass and d.deptype='e')
  ) then raise exception 'FAIL: application table without RLS'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private')
      and not exists(select 1 from pg_depend d where d.objid=p.oid
        and d.classid='pg_proc'::regclass and d.deptype='e')
      and (has_function_privilege('anon',p.oid,'EXECUTE')
        or (n.nspname='public' and p.prosecdef)
        or (p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)))
  ) then raise exception 'FAIL: anonymous RPC, public definer or unsafe search_path'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join unnest(array['anon','authenticated']) actor
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
    where n.nspname in ('public','private') and c.relkind in ('r','p','v','m')
      and not exists(select 1 from pg_depend d where d.objid=c.oid
        and d.classid='pg_class'::regclass and d.deptype='e')
      and has_table_privilege(actor,c.oid,privilege)
      and not (actor='authenticated' and n.nspname='public'
        and (privilege='SELECT' or (c.relname='driver_locations' and privilege in ('INSERT','UPDATE'))))
  ) then raise exception 'FAIL: excessive effective table grants'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    cross join unnest(array['anon','authenticated']) actor
    cross join unnest(array['INSERT','UPDATE']) privilege
    where n.nspname in ('public','private') and c.relkind in ('r','p')
      and not exists(select 1 from pg_depend d where d.objid=c.oid
        and d.classid='pg_class'::regclass and d.deptype='e')
      and has_column_privilege(actor,c.oid,a.attnum,privilege)
      and not (actor='authenticated' and n.nspname='public' and
        ((c.relname='profiles' and privilege='UPDATE' and a.attname in ('display_name','rut','commune_code','phone'))
        or c.relname='driver_locations'))
  ) then raise exception 'FAIL: excessive effective column writes'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname in ('review_driver_application','review_distributor_application')
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) then raise exception 'FAIL: mobile administrative approval'; end if;

  insert into auth.users(id,raw_user_meta_data) values
    (person,'{"role":"driver","is_verified":true,"is_admin":true,"phone":"+56912345678"}'::jsonb),
    (stranger,'{"phone":"+56912345678"}'::jsonb),
    (compatible,'{}'::jsonb);
  if (select role from public.profiles where id=person)<>'customer' then
    raise exception 'FAIL: editable metadata escalated role'; end if;
  if (select phone from public.profiles where id=person) is distinct from '+56912345678'
    or (select phone from public.profiles where id=stranger) is distinct from '+56912345678'
    or (select phone from public.profiles where id=compatible) is not null then
    raise exception 'FAIL: phone copy, non-uniqueness or missing-phone compatibility'; end if;
  for invalid_phone in select value from jsonb_array_elements(
    '[null,123,true,{},[],"","912345678","+012345678","+1234567890123456","+56 9 1234 5678"]'::jsonb
  ) loop
    invalid_person:=gen_random_uuid();
    begin
      insert into auth.users(id,raw_user_meta_data)
        values(invalid_person,jsonb_build_object('phone',invalid_phone));
      raise exception 'FAIL: invalid signup phone accepted';
    exception when check_violation then null; end;
    if exists(select 1 from auth.users where id=invalid_person)
      or exists(select 1 from public.profiles where id=invalid_person) then
      raise exception 'FAIL: rejected phone left a partial account'; end if;
  end loop;

  perform set_config('request.jwt.claims',json_build_object('sub',person,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if (select count(*) from public.profiles)<>1 or exists(select 1 from public.profiles where id=stranger) then
    raise exception 'FAIL: foreign profile exposed'; end if;
  update public.profiles set display_name='Prueba de seguridad',phone='+56223456789' where id=person;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'FAIL: own profile not writable'; end if;
  if (select phone from public.profiles where id=person) is distinct from '+56223456789' then
    raise exception 'FAIL: own phone not updated'; end if;
  begin update public.profiles set phone='912345678' where id=person;
    raise exception 'FAIL: invalid edited phone accepted'; exception when check_violation then null; end;
  update public.profiles set phone=null where id=person;
  update public.profiles set display_name='Acceso indebido',phone='+12025550123' where id=stranger;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: foreign profile writable'; end if;
  begin update public.profiles set role='driver' where id=person;
    raise exception 'FAIL: client role escalation'; exception when insufficient_privilege then null; end;
  begin insert into public.drivers(id,is_verified) values(person,true);
    raise exception 'FAIL: self-approved driver'; exception when insufficient_privilege then null; end;
  begin perform 1 from private.order_offers;
    raise exception 'FAIL: raw offers exposed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.get_my_driver_workspace();
    raise exception 'FAIL: missing identity accepted'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  execute 'set local role anon';
  begin perform 1 from public.profiles;
    raise exception 'FAIL: anonymous profile read'; exception when insufficient_privilege then null; end;
  begin perform public.get_my_driver_workspace();
    raise exception 'FAIL: anonymous RPC call'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  raise notice 'PASS: pilot RLS, grants, RPC isolation, metadata isolation, signup phone and own-phone validation';
end;
$$;
