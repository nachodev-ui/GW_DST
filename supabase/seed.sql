-- Solo catálogo: 14 productos, idempotente. Sin usuarios, ubicaciones ni precios.
insert into public.products (brand, weight_kg)
select brand::public.gas_brand, weight_kg
from unnest(array['Lipigas', 'Gasco', 'Abastible']) as brand
cross join unnest(array[5, 11, 15, 45]) as weight_kg
on conflict (brand, weight_kg, variant) do nothing;

insert into public.products (brand, weight_kg, variant)
values ('Abastible', 15, 'vma'), ('Abastible', 15, 'vm')
on conflict (brand, weight_kg, variant) do nothing;
