-- Run as postgres after all migrations; fixtures always roll back.
begin;
do $$
declare
  candidate record;
begin
  if (select count(*) from public.products where brand = 'Abastible' and weight_kg = 15
      and variant in ('standard', 'vma', 'vm')) <> 3 then
    raise exception 'FAIL: missing distinct Abastible 15 kg products';
  end if;
  for candidate in select * from (values
    ('Gasco', 15, 'vma'), ('Lipigas', 15, 'vm'), ('Abastible', 11, 'vm'),
    ('Abastible', 15, 'unknown')
  ) as invalid(brand, weight, variant) loop
    begin
      insert into public.products (brand, weight_kg, variant)
      values (candidate.brand::public.gas_brand, candidate.weight, candidate.variant);
      raise exception 'FAIL: invalid product allowed';
    exception when check_violation then null;
    end;
  end loop;
  begin
    insert into public.products (brand, weight_kg, variant) values ('Abastible', 15, 'vm');
    raise exception 'FAIL: duplicate variant allowed';
  exception when unique_violation then null;
  end;
  if not (select relrowsecurity from pg_class where oid = 'public.products'::regclass)
    or has_table_privilege('authenticated', 'public.products', 'INSERT')
    or has_table_privilege('authenticated', 'public.products', 'UPDATE') then
    raise exception 'FAIL: catalogue security changed';
  end if;
  if private.list_driver_offers() <> '[]'::jsonb or private.get_driver_order(null) is not null then
    raise exception 'FAIL: unauthenticated driver summaries exposed';
  end if;
  raise notice 'PASS: Abastible variants, constraints and catalogue permissions';
end;
$$;
rollback;
