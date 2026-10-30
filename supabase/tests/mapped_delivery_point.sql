-- Dedicated Test runner only. Every fixture is rolled back even on success.
do $$
declare customer uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
  driver uuid:=gen_random_uuid(); business uuid:=gen_random_uuid(); product uuid;
  request_id uuid:=gen_random_uuid(); created public.orders; repeated public.orders;
begin
  begin
    insert into auth.users(id) values(customer),(stranger),(driver);
    update public.profiles set role='driver' where id=driver;
    insert into public.distributors(id,name,is_verified,is_demo) values(business,'Mapped delivery test',true,true);
    insert into public.distributor_brands values(business,'Gasco');
    insert into public.distributor_communes(distributor_id,commune_code) values(business,'13101');
    insert into public.drivers(id,is_verified,is_available,distributor_id) values(driver,true,false,business);
    perform private.seed_test_document_fixture(driver);
    select id into strict product from public.products where brand='Gasco' and weight_kg=15 and variant='standard' and is_active;
    insert into public.distributor_products(distributor_id,product_id,unit_price_clp,stock,is_listed) values(business,product,21990,5,true);
    if has_function_privilege('anon',
      'public.create_mapped_distributor_order(uuid,uuid,integer,boolean,text,text,text,text,integer,uuid,double precision,double precision)','EXECUTE') then
      raise exception 'FAIL: anonymous mapped purchase';
    end if;
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    created:=public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,request_id,-33.45,-70.66);
    repeated:=public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,request_id,-33.45,-70.66);
    if repeated.id<>created.id or created.status<>'offered' or created.delivery_location is null
      or extensions.st_x(created.delivery_location::extensions.geometry)<>-70.66
      or extensions.st_y(created.delivery_location::extensions.geometry)<>-33.45 then
      raise exception 'FAIL: geometry, assignment flow or retry';
    end if;
    begin
      perform public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,request_id,-33.46,-70.66);
      raise exception 'FAIL: changed point accepted for same request';
    exception when invalid_parameter_value then null; end;
    begin
      perform public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,gen_random_uuid(),'NaN'::float8,-70.66);
      raise exception 'FAIL: nonfinite latitude';
    exception when invalid_parameter_value then null; end;
    begin
      perform public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,gen_random_uuid(),null,-70.66);
      raise exception 'FAIL: missing latitude';
    exception when invalid_parameter_value then null; end;
    begin
      perform public.create_mapped_distributor_order(business,product,1,true,'unknown','Prueba 123','13101',null,21990,gen_random_uuid(),-33.45,181);
      raise exception 'FAIL: longitude outside range';
    exception when invalid_parameter_value then null; end;
    execute 'reset role';
    if (select stock from public.distributor_products where distributor_id=business and product_id=product)<>4
      or (select count(*) from public.orders where customer_id=customer)<>1 then
      raise exception 'FAIL: retry or invalid point changed stock/orders';
    end if;
    perform set_config('request.jwt.claims',json_build_object('sub',stranger,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from public.orders where id=created.id) then raise exception 'FAIL: stranger can read delivery point'; end if;
    execute 'reset role';
    raise exception using errcode='ZX031',message='Rollback map fixtures';
  exception when sqlstate 'ZX031' then
    raise notice 'PASS: mapped point coordinates, atomic stock, retry identity, invalid inputs and participant privacy; fixtures reverted';
  end;
end;
$$;
