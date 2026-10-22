-- Run as postgres after distributor_owned_coverage. Every fixture is reverted.
do $$
declare
  owner_id uuid:=gen_random_uuid(); manager_id uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
  driver_a uuid:=gen_random_uuid(); driver_b uuid:=gen_random_uuid(); foreign_driver uuid:=gen_random_uuid();
  business_a uuid:=gen_random_uuid(); business_b uuid:=gen_random_uuid(); product uuid;
  coverage jsonb; choices jsonb; created public.orders; second_order public.orders;
begin
  begin
    if to_regclass('public.driver_communes') is not null
      or to_regprocedure('public.set_driver_settings(boolean,text[])') is not null
      or to_regprocedure('private.set_driver_settings(boolean,text[])') is not null
      or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('private','public') and p.prosrc ilike '%public.driver_communes%') then
      raise exception 'FAIL: obsolete coverage remains'; end if;
    if has_function_privilege('anon','public.set_business_coverage(uuid,text[],integer)','EXECUTE')
      or has_function_privilege('anon','public.get_driver_settings()','EXECUTE')
      or has_table_privilege('authenticated','public.distributor_communes','UPDATE')
      or has_table_privilege('authenticated','private.legacy_driver_coverage','SELECT') then raise exception 'FAIL: excessive privileges'; end if;
    insert into auth.users(id) values(owner_id),(manager_id),(stranger),(driver_a),(driver_b),(foreign_driver);
    update public.profiles set role='driver' where id in(driver_a,driver_b,foreign_driver);
    insert into public.distributors(id,name,is_verified,is_demo) values(business_a,'Cobertura negocio A',true,true),(business_b,'Cobertura negocio B',true,true);
    insert into public.distributor_brands values(business_a,'Gasco'),(business_b,'Gasco');
    insert into public.distributor_members values(business_a,owner_id,'owner'),(business_a,manager_id,'manager');
    insert into public.products(brand,weight_kg,variant,is_active) values('Gasco',15,'standard',true)
      on conflict(brand,weight_kg,variant) do update set is_active=true returning id into product;
    insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed) values(business_a,product,20000,5,true);
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    coverage:=public.set_business_coverage(business_a,array['13101','13123'],0);
    if jsonb_array_length(coverage->'communes')<>2 or jsonb_array_length(coverage->'drivers')<>0
      or (coverage->>'revision')::integer<>1 then raise exception 'FAIL: coverage without drivers'; end if;
    choices:=public.list_delivery_options(product,'13101',1,true);
    if not exists(select 1 from jsonb_array_elements(choices) c where c->>'id'=business_a::text
      and (c->>'has_coverage')::boolean and not(c->>'has_available_driver')::boolean) then
      raise exception 'FAIL: coverage incorrectly depends on drivers'; end if;
    begin perform public.create_distributor_order(business_a,product,1,true,'unknown','Prueba 123','13101',null,20000,gen_random_uuid());
      raise exception 'FAIL: unstaffed business accepted purchase'; exception when object_not_in_prerequisite_state then null; end;
    coverage:=public.set_business_coverage(business_a,array['13123','13101'],0);
    if (coverage->>'revision')::integer<>1 then raise exception 'FAIL: idempotent save'; end if;
    begin perform public.set_business_coverage(business_a,array['99999'],1); raise exception 'FAIL: unofficial CUT'; exception when invalid_parameter_value then null; end;
    begin perform public.set_business_coverage(business_a,array['13102'],0); raise exception 'FAIL: stale revision'; exception when serialization_failure then null; end;
    execute 'reset role';
    insert into public.drivers(id,is_verified,is_available,distributor_id) values(driver_a,true,true,business_a),(driver_b,true,true,business_a),(foreign_driver,true,true,business_b);
    insert into public.distributor_communes values(business_b,'13110');
    perform set_config('request.jwt.claims',json_build_object('sub',stranger,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from public.distributor_communes) then raise exception 'FAIL: customer direct coverage'; end if;
    begin perform public.set_business_coverage(business_a,array['13102'],1); raise exception 'FAIL: nonmember write'; exception when insufficient_privilege then null; end;
    begin perform public.get_business_coverage(business_a); raise exception 'FAIL: nonmember team read'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',driver_a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    coverage:=public.get_driver_settings();
    if jsonb_array_length(coverage->'communes')<>2 or not exists(select 1 from jsonb_array_elements(coverage->'communes') c where c->>'code'='13123') then
      raise exception 'FAIL: inherited coverage'; end if;
    if (select count(*) from public.distributor_communes)<>2 then raise exception 'FAIL: driver sees other business'; end if;
    begin perform public.set_business_coverage(business_a,array['13102'],1); raise exception 'FAIL: driver changed territory'; exception when insufficient_privilege then null; end;
    coverage:=public.set_driver_availability(false);
    if (coverage->>'is_available')::boolean then raise exception 'FAIL: availability off'; end if;
    perform public.set_driver_availability(true);
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    choices:=public.list_delivery_options(product,'13123',1,true);
    if not exists(select 1 from jsonb_array_elements(choices) c where c->>'id'=business_a::text and (c->>'has_coverage')::boolean and (c->>'has_available_driver')::boolean) then
      raise exception 'FAIL: customer business coverage'; end if;
    begin perform public.create_distributor_order(business_a,product,1,true,'unknown','Prueba 123','13102',null,20000,gen_random_uuid());
      raise exception 'FAIL: order outside business area'; exception when object_not_in_prerequisite_state then null; end;
    created:=public.create_distributor_order(business_a,product,1,true,'unknown','Prueba 123','13101',null,20000,gen_random_uuid());
    execute 'reset role';
    if (select count(*) from private.order_offers where order_id=created.id)<>2 then raise exception 'FAIL: inherited dispatch or foreign offers'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',manager_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.set_business_coverage(business_a,array['13123'],1);
    execute 'reset role';
    if exists(select 1 from private.order_offers where order_id=created.id and expires_at>clock_timestamp()) then raise exception 'FAIL: removed area still has offers'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',driver_a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.accept_driver_offer(created.id); raise exception 'FAIL: removed area accepted'; exception when sqlstate 'GW002' then null; end;
    begin perform public.accept_order(created.id); raise exception 'FAIL: direct acceptance bypass'; exception when object_not_in_prerequisite_state then null; end;
    if jsonb_array_length(public.get_driver_settings()->'communes')<>1 then raise exception 'FAIL: driver stale inheritance'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.cancel_order(created.id);
    second_order:=public.create_distributor_order(business_a,product,1,true,'unknown','Prueba 123','13123',null,20000,gen_random_uuid());
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',driver_a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.accept_driver_offer(second_order.id);
    begin perform public.set_driver_availability(true); raise exception 'FAIL: active driver reactivated'; exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    coverage:=public.set_business_coverage(business_a,array[]::text[],2);
    if jsonb_array_length(coverage->'communes')<>0 then raise exception 'FAIL: clear area'; end if;
    choices:=public.list_delivery_options(product,'13123',1,true);
    if exists(select 1 from jsonb_array_elements(choices) c where c->>'id'=business_a::text and (c->>'has_coverage')::boolean) then raise exception 'FAIL: cleared coverage visible'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',driver_a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.advance_driver_order(second_order.id,'on_the_way');
    perform public.advance_driver_order(second_order.id,'delivered');
    begin perform public.set_driver_availability(true); raise exception 'FAIL: empty business area available'; exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    delete from public.distributor_members where distributor_id=business_a and user_id=owner_id;
    execute 'set local role authenticated';
    begin perform public.set_business_coverage(business_a,array['13101'],3); raise exception 'FAIL: revoked membership'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    raise exception using errcode='ZX021',message='Rollback owned coverage fixtures';
  exception when sqlstate 'ZX021' then raise notice 'PASS: business-owned CUT coverage, no-driver setup, inheritance, revisions, privileges/RLS, dispatch, removed offers, atomic acceptance and assigned delivery continuity (fixtures reverted)';
  end;
end;
$$;
