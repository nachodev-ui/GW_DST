-- Dedicated Gasway Test only, after 20261026010000. Fixtures always roll back.
do $$
<<distributor_workspace>>
declare
  owner_id uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); driver_id uuid:=gen_random_uuid();
  business_id uuid:=gen_random_uuid(); other_business uuid:=gen_random_uuid(); vehicle_id uuid:=gen_random_uuid();
  product_id uuid; sale_id uuid:=gen_random_uuid(); cancelled_id uuid:=gen_random_uuid(); result jsonb;
  draft jsonb:=jsonb_build_object('display_name','Distribuidora de prueba','description',null,'address','Recinto de prueba 123',
    'commune_code','13101','latitude',-33.45,'longitude',-70.66,'logo_path',null,'cover_path',null);
begin
  begin
    insert into auth.users(id) values(owner_id),(stranger),(driver_id);
    update public.profiles set role='driver' where id=driver_id;
    insert into public.distributors(id,name,is_verified,is_demo) values(business_id,'Workspace A',true,true),(other_business,'Workspace B',true,true);
    insert into public.distributor_members values(business_id,owner_id,'owner'),(other_business,stranger,'owner');
    insert into public.drivers(id,is_verified,is_available,distributor_id) values(driver_id,true,false,business_id);
    insert into public.products(brand,weight_kg,variant,is_active) values('Gasco',15,'standard',true)
      on conflict(brand,weight_kg,variant) do update set is_active=true returning id into product_id;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    result:=public.get_business_dashboard(business_id,'today');
    if (result->>'delivered_count')::integer<>0 or (result->>'revenue_clp')::bigint<>0 then raise exception 'FAIL: empty sales'; end if;
    if (result->>'period_start')::timestamptz is distinct from (date_trunc('day',now() at time zone 'America/Santiago') at time zone 'America/Santiago') then raise exception 'FAIL: Chile period boundary'; end if;
    if (public.get_business_profile(business_id)->>'revision')::integer<>0 then raise exception 'FAIL: unconfigured profile'; end if;
    perform public.set_business_profile(business_id,0,draft);
    begin perform public.set_business_profile(business_id,0,draft); raise exception 'FAIL: stale profile'; exception when serialization_failure then null; end;
    begin perform public.set_business_profile(business_id,1,jsonb_set(draft,'{commune_code}','"99999"')); raise exception 'FAIL: invalid CUT'; exception when foreign_key_violation then null; end;
    begin perform public.set_business_profile(business_id,1,jsonb_set(draft,'{logo_path}',to_jsonb(other_business::text||'/logo/'||gen_random_uuid()::text||'.png'))); raise exception 'FAIL: foreign image'; exception when invalid_parameter_value then null; end;
    perform public.set_business_vehicle(business_id,vehicle_id,0,'ABCD12','Camión de prueba','inactive',driver_id);
    execute 'reset role';
    perform private.seed_test_document_fixture(driver_id,true,vehicle_id);
    execute 'set local role authenticated';
    if jsonb_array_length(public.list_business_vehicles(business_id))<>1 then raise exception 'FAIL: vehicle save'; end if;
    begin perform public.set_business_vehicle(business_id,vehicle_id,0,'ABCD12','Anterior','available',driver_id); raise exception 'FAIL: stale vehicle'; exception when serialization_failure then null; end;
    begin perform public.set_business_vehicle(business_id,gen_random_uuid(),0,'BCDF12','Segundo','available',driver_id); raise exception 'FAIL: double driver'; exception when unique_violation then null; end;
    execute 'reset role';
    -- Fixtures follow the state graph and leave the immutable commercial terms intact.
    insert into public.orders(id,customer_id,product_id,distributor_id,total_clp,quantity,exchange_empty,delivery_address,commune_code)
      values(sale_id,owner_id,product_id,business_id,20000,2,true,'Prueba workspace 123','13101'),
        (cancelled_id,owner_id,product_id,business_id,90000,1,true,'Prueba cancelada 123','13101');
    update public.orders set status='cancelled' where id=cancelled_id;
    update public.orders set status='offered' where id=sale_id;
    update public.orders set status='accepted',driver_id=distributor_workspace.driver_id,accepted_at=now() where id=sale_id;
    execute 'set local role authenticated';
    if not (public.list_business_vehicles(business_id)->0->>'is_busy')::boolean then raise exception 'FAIL: busy vehicle'; end if;
    begin perform public.set_business_vehicle(business_id,vehicle_id,1,'ABCD12','Camión de prueba','maintenance',null); raise exception 'FAIL: active vehicle edit'; exception when object_not_in_prerequisite_state then null; end;
    execute 'reset role';
    update public.orders set status='on_the_way' where id=sale_id;
    update public.orders set status='delivered',delivered_at=now() where id=sale_id;
    execute 'set local role authenticated';
    result:=public.get_business_dashboard(business_id,'today');
    if (result->>'revenue_clp')::bigint<>20000 or (result->>'delivered_count')::integer<>1 or (result->>'cylinder_count')::integer<>2
      or (result->>'costed_count')::integer<>0 then raise exception 'FAIL: sales scope, cylinders or missing costs'; end if;
    perform public.set_business_sale_cost(business_id,sale_id,25000,0);
    result:=public.get_business_dashboard(business_id,'today');
    if (result->>'margin_clp')::bigint<>-5000 or (result->>'costed_count')::integer<>1 then raise exception 'FAIL: negative margin'; end if;
    begin perform public.set_business_sale_cost(business_id,sale_id,0,0); raise exception 'FAIL: stale cost'; exception when serialization_failure then null; end;
    perform public.set_business_sale_cost(business_id,sale_id,0,1);
    if (public.get_business_dashboard(business_id,'today')->>'margin_clp')::bigint<>20000 then raise exception 'FAIL: explicit zero cost'; end if;
    begin perform public.set_business_sale_cost(business_id,cancelled_id,0,0); raise exception 'FAIL: cancelled cost'; exception when insufficient_privilege then null; end;
    result:=public.list_business_sales(business_id,'today');
    if jsonb_array_length(result->'items')<>1 or (result->'items'->0) ?| array['customer_id','delivery_address','delivery_location','rut'] then raise exception 'FAIL: sales list/privacy'; end if;
    if jsonb_array_length(public.list_business_sales(business_id,'today',now(),sale_id)->'items')<>0 then raise exception 'FAIL: stable cursor'; end if;
    begin perform public.get_business_dashboard(business_id,'all'); raise exception 'FAIL: unbounded period'; exception when invalid_parameter_value then null; end;
    begin update public.distributor_sale_costs set cost_clp=1 where order_id=sale_id; raise exception 'FAIL: direct write'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claims',json_build_object('sub',stranger,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if exists(select 1 from public.distributor_profiles) or exists(select 1 from public.distributor_vehicles) or exists(select 1 from public.distributor_sale_costs) then raise exception 'FAIL: RLS business isolation'; end if;
    begin perform public.get_business_dashboard(business_id,'today'); raise exception 'FAIL: foreign sales'; exception when insufficient_privilege then null; end;
    begin perform public.get_business_profile(business_id); raise exception 'FAIL: foreign profile'; exception when insufficient_privilege then null; end;
    begin perform public.list_business_vehicles(business_id); raise exception 'FAIL: foreign fleet'; exception when insufficient_privilege then null; end;
    begin perform public.set_business_sale_cost(business_id,sale_id,0,2); raise exception 'FAIL: foreign cost'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    if (select public from storage.buckets where id='business-media') or has_function_privilege('anon','public.get_business_dashboard(uuid,text)','EXECUTE') then raise exception 'FAIL: public media or anonymous metrics'; end if;
    delete from public.distributor_members where distributor_id=business_id;
    perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.get_business_profile(business_id); raise exception 'FAIL: revoked member'; exception when insufficient_privilege then null; end;
    execute 'reset role';
    raise exception using errcode='ZX037',message='Rollback distributor workspace fixtures';
  exception when sqlstate 'ZX037' then raise notice 'PASS: distributor workspace assertions (fixtures reverted)';
  end;
end;
$$;
