-- Run as postgres after the discovery migration. Every fixture is rolled back.
do $$
declare
  customer uuid:=gen_random_uuid(); other_customer uuid:=gen_random_uuid();
  driver_a uuid:=gen_random_uuid(); driver_b uuid:=gen_random_uuid(); owner_id uuid:=gen_random_uuid();
  business_a uuid:=gen_random_uuid(); business_b uuid:=gen_random_uuid(); product uuid;
  request_id uuid:=gen_random_uuid(); created public.orders; repeated public.orders; no_exchange public.orders; closed_order public.orders;
  choices jsonb; result jsonb;
begin
  begin
    insert into auth.users(id) values(customer),(other_customer),(driver_a),(driver_b),(owner_id);
    update public.profiles set role='driver' where id in(driver_a,driver_b);
    insert into public.distributors(id,name,is_verified,is_demo) values(business_a,'Prueba de compra A',true,true),(business_b,'Prueba de compra B',true,true);
    insert into public.distributor_brands values(business_a,'Gasco'),(business_b,'Gasco');
    insert into public.distributor_members values(business_a,owner_id,'owner');
    insert into public.drivers(id,is_verified,is_available,distributor_id) values(driver_a,true,true,business_a),(driver_b,true,true,business_b);
    insert into public.distributor_communes(distributor_id,commune_code) values(business_a,'13101'),(business_b,'13101');
    insert into public.products(brand,weight_kg,variant,unit_price_clp,is_active) values('Gasco',15,'standard',999,true)
      on conflict(brand,weight_kg,variant) do update set unit_price_clp=999,is_active=true returning id into product;
    insert into public.distributor_products(distributor_id,product_id,unit_price_clp,price_without_exchange_clp,stock,is_listed)
      values(business_a,product,21990,49990,5,true),(business_b,product,19990,null,1,true);
    if has_function_privilege('anon','public.list_delivery_options(uuid,text,integer,boolean)','EXECUTE')
      or has_function_privilege('authenticated','public.create_order(uuid,integer,boolean,text,text,text,double precision,double precision)','EXECUTE')
      or has_table_privilege('authenticated','public.distributor_service_settings','UPDATE')
      or has_table_privilege('authenticated','private.order_stock_reservations','SELECT') then raise exception 'FAIL: excessive grants'; end if;
    if private.valid_service_schedule('[{"day":1,"open":"22:00","close":"02:00"}]'::jsonb) is not true
      or private.valid_service_schedule('[{"day":1,"open":"22:00","close":"22:00"}]'::jsonb)
      or private.valid_service_schedule('[{"day":"1","open":"09:00","close":"18:00"}]'::jsonb)
      or private.valid_service_schedule('[{"day":1,"open":"09:00","close":"18:00"},{"day":1,"open":"09:00","close":"18:00"}]'::jsonb) then
      raise exception 'FAIL: schedule validation'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    choices:=public.list_delivery_options(product,'13101',2,true);
    if not exists(select 1 from jsonb_array_elements(choices) item where item->>'id'=business_a::text and (item->>'total_clp')::integer=43980)
      or exists(select 1 from jsonb_array_elements(choices) item where item->>'id'=business_b::text) then raise exception 'FAIL: coverage, quantity or seller price'; end if;
    choices:=public.list_delivery_options(product,'13102',2,true);
    if not exists(select 1 from jsonb_array_elements(choices) item where item->>'id'=business_a::text
      and (item->>'stock')::integer=5 and (item->>'total_clp')::integer=43980
      and (item->>'has_coverage')::boolean=false and (item->>'has_available_driver')::boolean=false) then
      raise exception 'FAIL: inventory hidden or purchasable outside coverage'; end if;
    begin
      perform public.create_distributor_order(business_a,product,2,true,'unknown','Prueba 123','13102',null,21990,gen_random_uuid());
      raise exception 'FAIL: purchase outside coverage accepted';
    exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    update public.drivers set is_available=false where id=driver_a;
    execute 'set local role authenticated';
    choices:=public.list_delivery_options(product,'13101',2,true);
    if not exists(select 1 from jsonb_array_elements(choices) item where item->>'id'=business_a::text
      and (item->>'has_coverage')::boolean=true and (item->>'has_available_driver')::boolean=false) then
      raise exception 'FAIL: coverage confused with current availability'; end if;
    begin
      perform public.create_distributor_order(business_a,product,2,true,'unknown','Prueba 123','13101',null,21990,gen_random_uuid());
      raise exception 'FAIL: purchase without available driver accepted';
    exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    if (select stock from public.distributor_products where distributor_id=business_a and product_id=product)<>5 then
      raise exception 'FAIL: blocked purchase consumed stock'; end if;
    update public.drivers set is_available=true where id=driver_a;
    execute 'set local role authenticated';
    perform public.register_coverage_interest('13102',product);
    perform public.register_coverage_interest('13102',product);
    begin
      perform public.create_distributor_order(business_a,product,2,true,'Lipigas','Prueba 123','13101',null,999,request_id);
      raise exception 'FAIL: price change accepted';
    exception when serialization_failure then null; end;
    created:=public.create_distributor_order(business_a,product,2,true,'Lipigas','Prueba 123','13101',null,21990,request_id);
    if created.distributor_id<>business_a or created.total_clp<>43980 or created.returned_brand<>'Lipigas' or created.status<>'offered' then
      raise exception 'FAIL: seller selection, cross-brand return or dispatch'; end if;
    repeated:=public.create_distributor_order(business_a,product,2,true,'Lipigas','Prueba 123','13101',null,21990,request_id);
    if repeated.id<>created.id then raise exception 'FAIL: duplicate order on retry'; end if;
    begin
      perform public.create_distributor_order(business_a,product,1,true,'Lipigas','Prueba 123','13101',null,21990,request_id);
      raise exception 'FAIL: reused key changed contents';
    exception when invalid_parameter_value then null; end;
    result:=public.get_order_business(created.id);
    if result->>'name'<>'Prueba de compra A' or result->>'whatsapp' is not null then raise exception 'FAIL: demo contact or seller identity'; end if;
    execute 'reset role';
    if (select stock from public.distributor_products where distributor_id=business_a and product_id=product)<>3
      or (select count(*) from private.coverage_interests where customer_id=customer and commune_code='13102')<>1
      or (select count(*) from private.order_stock_reservations where order_id=created.id)<>1
      or exists(select 1 from private.order_offers where order_id=created.id and driver_id<>driver_a) then raise exception 'FAIL: reservation or cross-business offers'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',other_customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from public.orders where id=created.id) then raise exception 'FAIL: customer RLS'; end if;
    begin perform public.get_order_business(created.id); raise exception 'FAIL: other customer contact'; exception when insufficient_privilege then null; end;
    begin perform public.set_business_service(business_a,'56900000000',null,null,null,0); raise exception 'FAIL: nonmember writes'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    -- Even a forged targeted offer cannot let a different business take the order.
    insert into private.order_offers(order_id,driver_id,expires_at) values(created.id,driver_b,clock_timestamp()+interval '60 seconds');
    perform set_config('request.jwt.claims',json_build_object('sub',driver_b,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from jsonb_array_elements(public.list_driver_offers()) item where item->>'order_id'=created.id::text) then raise exception 'FAIL: foreign business sees offer'; end if;
    begin perform public.accept_driver_offer(created.id); raise exception 'FAIL: foreign business accepted'; exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',driver_a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.accept_driver_offer(created.id);
    result:=public.get_driver_order(created.id);
    if result->>'returned_brand'<>'Lipigas' then raise exception 'FAIL: return brand unavailable to assigned driver'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.cancel_order(created.id);
    begin perform public.cancel_order(created.id); raise exception 'FAIL: repeated cancellation'; exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    update public.drivers set is_available=true where id=driver_a;
    execute 'set local role authenticated';
    no_exchange:=public.create_distributor_order(business_a,product,1,false,null,'Prueba 123','13101',null,49990,gen_random_uuid());
    if no_exchange.total_clp<>49990 or no_exchange.returned_brand is not null then raise exception 'FAIL: price with cylinder'; end if;
    begin perform public.create_distributor_order(business_b,product,1,false,null,'Prueba 123','13101',null,19990,gen_random_uuid());
      raise exception 'FAIL: missing no-exchange price'; exception when object_not_in_prerequisite_state then null; end;
    perform public.cancel_order(no_exchange.id);
    execute 'reset role';
    if (select stock from public.distributor_products where distributor_id=business_a and product_id=product)<>5 then raise exception 'FAIL: cancellation restored stock once'; end if;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.set_business_service(business_a,'56900000000','[]',30,45,0);
    perform public.set_business_service(business_a,'56900000000','[]',30,45,0);
    begin perform public.set_business_service(business_a,null,null,null,null,0); raise exception 'FAIL: stale service revision'; exception when serialization_failure then null; end;
    execute 'reset role';
    update public.drivers set is_available=true where id=driver_a;
    perform set_config('request.jwt.claims',json_build_object('sub',customer,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin
      closed_order:=public.create_distributor_order(business_a,product,1,true,'unknown','Prueba 123','13101',null,21990,gen_random_uuid());
      raise exception 'FAIL: closed business accepted a new purchase';
    exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    raise exception using errcode='ZX018',message='Rollback discovery fixtures';
  exception when sqlstate 'ZX018' then raise notice 'PASS: seller/stock/coverage/prices, idempotency, cancellation, RLS, contact opt-in, closed hours and targeted acceptance (fixtures reverted)';
  end;
end;
$$;
