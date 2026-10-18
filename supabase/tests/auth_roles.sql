-- Run the entire DO in SQL Editor as postgres, after both migrations.
-- Test rows are rolled back internally even in autocommit mode.
do $$
declare
  customer uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id, raw_user_meta_data) values
      (customer, '{"role":"driver","is_verified":true}'::jsonb),
      (other_user, '{}'::jsonb);
    if (select role from public.profiles where id = customer) <> 'customer' then
      raise exception 'FAIL: metadata escalated registration role';
    end if;
    if has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      or has_table_privilege('authenticated', 'public.drivers', 'INSERT')
      or has_column_privilege('authenticated', 'public.drivers', 'is_verified', 'UPDATE')
      or has_function_privilege('anon', 'public.request_driver_access()', 'EXECUTE') then
      raise exception 'FAIL: excessive grants';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.request_driver_access();
    perform public.request_driver_access();
    if (select count(*) from public.drivers) <> 1 then
      raise exception 'FAIL: request not idempotent or RLS leaks drivers';
    end if;
    if (select is_verified or is_available from public.drivers where id = customer) then
      raise exception 'FAIL: request granted approval or availability';
    end if;
    if (select role from public.profiles where id = customer) <> 'customer' then
      raise exception 'FAIL: request changed role';
    end if;
    begin
      update public.profiles set role = 'driver' where id = customer;
      raise exception 'FAIL: client wrote role';
    exception when insufficient_privilege then null;
    end;
    begin
      update public.drivers set is_verified = true where id = customer;
      raise exception 'FAIL: client self-approved';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', other_user, 'role', 'authenticated')::text, true);
    if exists (select 1 from public.drivers) or exists (select 1 from public.profiles where id = customer) then
      raise exception 'FAIL: RLS exposes another identity';
    end if;
    perform set_config('request.jwt.claims', '{}', true);
    begin
      perform public.request_driver_access();
      raise exception 'FAIL: missing identity accepted';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';
    -- A repeated request cannot reset a server approval.
    update public.profiles set role = 'driver' where id = customer;
    update public.drivers set is_verified = true where id = customer;
    perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.request_driver_access();
    if not (select is_verified from public.drivers where id = customer) then
      raise exception 'FAIL: request reset server approval';
    end if;
    execute 'reset role';
    raise exception 'auth_roles_rollback' using errcode = 'P0002';
  exception when sqlstate 'P0002' then
    if sqlerrm <> 'auth_roles_rollback' then raise; end if;
  end;
  raise notice 'PASS: registration, idempotence, grants, RLS, identity and server approval; fixtures rolled back';
end;
$$;
