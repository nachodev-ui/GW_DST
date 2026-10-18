-- Solo catálogo: 12 combinaciones, idempotente. Sin usuarios, ubicaciones ni precios.
insert into public.products (brand, weight_kg)
select brand::public.gas_brand, weight_kg
from unnest(array['Lipigas', 'Gasco', 'Abastible']) as brand
cross join unnest(array[5, 11, 15, 45]) as weight_kg
on conflict (brand, weight_kg) do nothing;
