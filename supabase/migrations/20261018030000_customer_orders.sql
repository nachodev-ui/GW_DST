begin;

-- No invented prices: an operator must configure these before enabling purchase.
alter table public.products add column unit_price_clp integer
  check (unit_price_clp >= 0);
alter table public.orders
  add column quantity integer not null default 1 check (quantity between 1 and 99),
  add column notes text check (char_length(notes) <= 1000),
  alter column delivery_location drop not null;

create table public.communes (
  code text primary key check (code ~ '^[0-9]{5}$'),
  name text not null
);
alter table public.communes enable row level security;
revoke all on public.communes from public, anon, authenticated;
grant select on public.communes to authenticated;
grant all on public.communes to service_role;
create policy communes_read on public.communes for select to authenticated using (true);

-- SUBDERE CUT_2018_v04; CSV mirror provenance documented in ADR 0006.
insert into public.communes (code, name) values
  ('01101', 'Iquique'),
  ('01107', 'Alto Hospicio'),
  ('01401', 'Pozo Almonte'),
  ('01402', 'Camiña'),
  ('01403', 'Colchane'),
  ('01404', 'Huara'),
  ('01405', 'Pica'),
  ('02101', 'Antofagasta'),
  ('02102', 'Mejillones'),
  ('02103', 'Sierra Gorda'),
  ('02104', 'Taltal'),
  ('02201', 'Calama'),
  ('02202', 'Ollagüe'),
  ('02203', 'San Pedro de Atacama'),
  ('02301', 'Tocopilla'),
  ('02302', 'María Elena'),
  ('03101', 'Copiapó'),
  ('03102', 'Caldera'),
  ('03103', 'Tierra Amarilla'),
  ('03201', 'Chañaral'),
  ('03202', 'Diego de Almagro'),
  ('03301', 'Vallenar'),
  ('03302', 'Alto del Carmen'),
  ('03303', 'Freirina'),
  ('03304', 'Huasco'),
  ('04101', 'La Serena'),
  ('04102', 'Coquimbo'),
  ('04103', 'Andacollo'),
  ('04104', 'La Higuera'),
  ('04105', 'Paiguano'),
  ('04106', 'Vicuña'),
  ('04201', 'Illapel'),
  ('04202', 'Canela'),
  ('04203', 'Los Vilos'),
  ('04204', 'Salamanca'),
  ('04301', 'Ovalle'),
  ('04302', 'Combarbalá'),
  ('04303', 'Monte Patria'),
  ('04304', 'Punitaqui'),
  ('04305', 'Río Hurtado'),
  ('05101', 'Valparaíso'),
  ('05102', 'Casablanca'),
  ('05103', 'Concón'),
  ('05104', 'Juan Fernández'),
  ('05105', 'Puchuncaví'),
  ('05107', 'Quintero'),
  ('05109', 'Viña del Mar'),
  ('05201', 'Isla de Pascua'),
  ('05301', 'Los Andes'),
  ('05302', 'Calle Larga'),
  ('05303', 'Rinconada'),
  ('05304', 'San Esteban'),
  ('05401', 'La Ligua'),
  ('05402', 'Cabildo'),
  ('05403', 'Papudo'),
  ('05404', 'Petorca'),
  ('05405', 'Zapallar'),
  ('05501', 'Quillota'),
  ('05502', 'Calera'),
  ('05503', 'Hijuelas'),
  ('05504', 'La Cruz'),
  ('05506', 'Nogales'),
  ('05601', 'San Antonio'),
  ('05602', 'Algarrobo'),
  ('05603', 'Cartagena'),
  ('05604', 'El Quisco'),
  ('05605', 'El Tabo'),
  ('05606', 'Santo Domingo'),
  ('05701', 'San Felipe'),
  ('05702', 'Catemu'),
  ('05703', 'Llaillay'),
  ('05704', 'Panquehue'),
  ('05705', 'Putaendo'),
  ('05706', 'Santa María'),
  ('05801', 'Quilpué'),
  ('05802', 'Limache'),
  ('05803', 'Olmué'),
  ('05804', 'Villa Alemana'),
  ('06101', 'Rancagua'),
  ('06102', 'Codegua'),
  ('06103', 'Coinco'),
  ('06104', 'Coltauco'),
  ('06105', 'Doñihue'),
  ('06106', 'Graneros'),
  ('06107', 'Las Cabras'),
  ('06108', 'Machalí'),
  ('06109', 'Malloa'),
  ('06110', 'Mostazal'),
  ('06111', 'Olivar'),
  ('06112', 'Peumo'),
  ('06113', 'Pichidegua'),
  ('06114', 'Quinta de Tilcoco'),
  ('06115', 'Rengo'),
  ('06116', 'Requínoa'),
  ('06117', 'San Vicente'),
  ('06201', 'Pichilemu'),
  ('06202', 'La Estrella'),
  ('06203', 'Litueche'),
  ('06204', 'Marchihue'),
  ('06205', 'Navidad'),
  ('06206', 'Paredones'),
  ('06301', 'San Fernando'),
  ('06302', 'Chépica'),
  ('06303', 'Chimbarongo'),
  ('06304', 'Lolol'),
  ('06305', 'Nancagua'),
  ('06306', 'Palmilla'),
  ('06307', 'Peralillo'),
  ('06308', 'Placilla'),
  ('06309', 'Pumanque'),
  ('06310', 'Santa Cruz'),
  ('07101', 'Talca'),
  ('07102', 'Constitución'),
  ('07103', 'Curepto'),
  ('07104', 'Empedrado'),
  ('07105', 'Maule'),
  ('07106', 'Pelarco'),
  ('07107', 'Pencahue'),
  ('07108', 'Río Claro'),
  ('07109', 'San Clemente'),
  ('07110', 'San Rafael'),
  ('07201', 'Cauquenes'),
  ('07202', 'Chanco'),
  ('07203', 'Pelluhue'),
  ('07301', 'Curicó'),
  ('07302', 'Hualañé'),
  ('07303', 'Licantén'),
  ('07304', 'Molina'),
  ('07305', 'Rauco'),
  ('07306', 'Romeral'),
  ('07307', 'Sagrada Familia'),
  ('07308', 'Teno'),
  ('07309', 'Vichuquén'),
  ('07401', 'Linares'),
  ('07402', 'Colbún'),
  ('07403', 'Longaví'),
  ('07404', 'Parral'),
  ('07405', 'Retiro'),
  ('07406', 'San Javier'),
  ('07407', 'Villa Alegre'),
  ('07408', 'Yerbas Buenas'),
  ('08101', 'Concepción'),
  ('08102', 'Coronel'),
  ('08103', 'Chiguayante'),
  ('08104', 'Florida'),
  ('08105', 'Hualqui'),
  ('08106', 'Lota'),
  ('08107', 'Penco'),
  ('08108', 'San Pedro de la Paz'),
  ('08109', 'Santa Juana'),
  ('08110', 'Talcahuano'),
  ('08111', 'Tomé'),
  ('08112', 'Hualpén'),
  ('08201', 'Lebu'),
  ('08202', 'Arauco'),
  ('08203', 'Cañete'),
  ('08204', 'Contulmo'),
  ('08205', 'Curanilahue'),
  ('08206', 'Los Álamos'),
  ('08207', 'Tirúa'),
  ('08301', 'Los Ángeles'),
  ('08302', 'Antuco'),
  ('08303', 'Cabrero'),
  ('08304', 'Laja'),
  ('08305', 'Mulchén'),
  ('08306', 'Nacimiento'),
  ('08307', 'Negrete'),
  ('08308', 'Quilaco'),
  ('08309', 'Quilleco'),
  ('08310', 'San Rosendo'),
  ('08311', 'Santa Bárbara'),
  ('08312', 'Tucapel'),
  ('08313', 'Yumbel'),
  ('08314', 'Alto Biobío'),
  ('09101', 'Temuco'),
  ('09102', 'Carahue'),
  ('09103', 'Cunco'),
  ('09104', 'Curarrehue'),
  ('09105', 'Freire'),
  ('09106', 'Galvarino'),
  ('09107', 'Gorbea'),
  ('09108', 'Lautaro'),
  ('09109', 'Loncoche'),
  ('09110', 'Melipeuco'),
  ('09111', 'Nueva Imperial'),
  ('09112', 'Padre Las Casas'),
  ('09113', 'Perquenco'),
  ('09114', 'Pitrufquén'),
  ('09115', 'Pucón'),
  ('09116', 'Saavedra'),
  ('09117', 'Teodoro Schmidt'),
  ('09118', 'Toltén'),
  ('09119', 'Vilcún'),
  ('09120', 'Villarrica'),
  ('09121', 'Cholchol'),
  ('09201', 'Angol'),
  ('09202', 'Collipulli'),
  ('09203', 'Curacautín'),
  ('09204', 'Ercilla'),
  ('09205', 'Lonquimay'),
  ('09206', 'Los Sauces'),
  ('09207', 'Lumaco'),
  ('09208', 'Purén'),
  ('09209', 'Renaico'),
  ('09210', 'Traiguén'),
  ('09211', 'Victoria'),
  ('10101', 'Puerto Montt'),
  ('10102', 'Calbuco'),
  ('10103', 'Cochamó'),
  ('10104', 'Fresia'),
  ('10105', 'Frutillar'),
  ('10106', 'Los Muermos'),
  ('10107', 'Llanquihue'),
  ('10108', 'Maullín'),
  ('10109', 'Puerto Varas'),
  ('10201', 'Castro'),
  ('10202', 'Ancud'),
  ('10203', 'Chonchi'),
  ('10204', 'Curaco de Vélez'),
  ('10205', 'Dalcahue'),
  ('10206', 'Puqueldón'),
  ('10207', 'Queilén'),
  ('10208', 'Quellón'),
  ('10209', 'Quemchi'),
  ('10210', 'Quinchao'),
  ('10301', 'Osorno'),
  ('10302', 'Puerto Octay'),
  ('10303', 'Purranque'),
  ('10304', 'Puyehue'),
  ('10305', 'Río Negro'),
  ('10306', 'San Juan de la Costa'),
  ('10307', 'San Pablo'),
  ('10401', 'Chaitén'),
  ('10402', 'Futaleufú'),
  ('10403', 'Hualaihué'),
  ('10404', 'Palena'),
  ('11101', 'Coyhaique'),
  ('11102', 'Lago Verde'),
  ('11201', 'Aysén'),
  ('11202', 'Cisnes'),
  ('11203', 'Guaitecas'),
  ('11301', 'Cochrane'),
  ('11302', 'O''Higgins'),
  ('11303', 'Tortel'),
  ('11401', 'Chile Chico'),
  ('11402', 'Río Ibáñez'),
  ('12101', 'Punta Arenas'),
  ('12102', 'Laguna Blanca'),
  ('12103', 'Río Verde'),
  ('12104', 'San Gregorio'),
  ('12201', 'Cabo de Hornos'),
  ('12202', 'Antártica'),
  ('12301', 'Porvenir'),
  ('12302', 'Primavera'),
  ('12303', 'Timaukel'),
  ('12401', 'Natales'),
  ('12402', 'Torres del Paine'),
  ('13101', 'Santiago'),
  ('13102', 'Cerrillos'),
  ('13103', 'Cerro Navia'),
  ('13104', 'Conchalí'),
  ('13105', 'El Bosque'),
  ('13106', 'Estación Central'),
  ('13107', 'Huechuraba'),
  ('13108', 'Independencia'),
  ('13109', 'La Cisterna'),
  ('13110', 'La Florida'),
  ('13111', 'La Granja'),
  ('13112', 'La Pintana'),
  ('13113', 'La Reina'),
  ('13114', 'Las Condes'),
  ('13115', 'Lo Barnechea'),
  ('13116', 'Lo Espejo'),
  ('13117', 'Lo Prado'),
  ('13118', 'Macul'),
  ('13119', 'Maipú'),
  ('13120', 'Ñuñoa'),
  ('13121', 'Pedro Aguirre Cerda'),
  ('13122', 'Peñalolén'),
  ('13123', 'Providencia'),
  ('13124', 'Pudahuel'),
  ('13125', 'Quilicura'),
  ('13126', 'Quinta Normal'),
  ('13127', 'Recoleta'),
  ('13128', 'Renca'),
  ('13129', 'San Joaquín'),
  ('13130', 'San Miguel'),
  ('13131', 'San Ramón'),
  ('13132', 'Vitacura'),
  ('13201', 'Puente Alto'),
  ('13202', 'Pirque'),
  ('13203', 'San José de Maipo'),
  ('13301', 'Colina'),
  ('13302', 'Lampa'),
  ('13303', 'Tiltil'),
  ('13401', 'San Bernardo'),
  ('13402', 'Buin'),
  ('13403', 'Calera de Tango'),
  ('13404', 'Paine'),
  ('13501', 'Melipilla'),
  ('13502', 'Alhué'),
  ('13503', 'Curacaví'),
  ('13504', 'María Pinto'),
  ('13505', 'San Pedro'),
  ('13601', 'Talagante'),
  ('13602', 'El Monte'),
  ('13603', 'Isla de Maipo'),
  ('13604', 'Padre Hurtado'),
  ('13605', 'Peñaflor'),
  ('14101', 'Valdivia'),
  ('14102', 'Corral'),
  ('14103', 'Lanco'),
  ('14104', 'Los Lagos'),
  ('14105', 'Máfil'),
  ('14106', 'Mariquina'),
  ('14107', 'Paillaco'),
  ('14108', 'Panguipulli'),
  ('14201', 'La Unión'),
  ('14202', 'Futrono'),
  ('14203', 'Lago Ranco'),
  ('14204', 'Río Bueno'),
  ('15101', 'Arica'),
  ('15102', 'Camarones'),
  ('15201', 'Putre'),
  ('15202', 'General Lagos'),
  ('16101', 'Chillán'),
  ('16102', 'Bulnes'),
  ('16103', 'Chillán Viejo'),
  ('16104', 'El Carmen'),
  ('16105', 'Pemuco'),
  ('16106', 'Pinto'),
  ('16107', 'Quillón'),
  ('16108', 'San Ignacio'),
  ('16109', 'Yungay'),
  ('16201', 'Quirihue'),
  ('16202', 'Cobquecura'),
  ('16203', 'Coelemu'),
  ('16204', 'Ninhue'),
  ('16205', 'Portezuelo'),
  ('16206', 'Ranquil'),
  ('16207', 'Trehuaco'),
  ('16301', 'San Carlos'),
  ('16302', 'Coihueco'),
  ('16303', 'Ñiquén'),
  ('16304', 'San Fabián'),
  ('16305', 'San Nicolás');

-- NOT VALID preserves historical rows while enforcing the catalogue for new writes.
alter table public.orders add constraint orders_commune_catalogue
  foreign key (commune_code) references public.communes(code) not valid;
alter table public.orders add constraint orders_address_nonblank
  check (char_length(btrim(delivery_address)) between 1 and 300) not valid;

create function private.create_order(
  p_product_id uuid, p_quantity integer, p_exchange_empty boolean,
  p_delivery_address text, p_commune_code text, p_notes text default null,
  p_latitude double precision default null, p_longitude double precision default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  price integer;
  result public.orders;
begin
  if caller is null or not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity not between 1 and 99
    or p_exchange_empty is null or p_delivery_address is null
    or char_length(btrim(p_delivery_address)) not between 1 and 300
    or p_commune_code is null
    or not exists (select 1 from public.communes where code = p_commune_code)
    or char_length(p_notes) > 1000
    or (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and not (p_latitude between -90 and 90))
    or (p_longitude is not null and not (p_longitude between -180 and 180)) then
    raise exception 'Invalid order input' using errcode = '22023';
  end if;
  select unit_price_clp into price from public.products
    where id = p_product_id and is_active for share;
  if price is null then
    raise exception 'Product unavailable or unpriced' using errcode = '55000';
  end if;
  if price::bigint * p_quantity > 2147483647 then
    raise exception 'Order total exceeds CLP limit' using errcode = '22023';
  end if;
  insert into public.orders (
    customer_id, product_id, quantity, exchange_empty, total_clp,
    delivery_address, commune_code, notes, delivery_location
  ) values (
    caller, p_product_id, p_quantity, p_exchange_empty, price * p_quantity,
    btrim(p_delivery_address), p_commune_code, nullif(btrim(p_notes), ''),
    case when p_latitude is null then null else
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography end
  ) returning * into result;
  -- Existing record_order_event trigger writes requested in the same transaction.
  return result;
end;
$$;

create function public.create_order(
  p_product_id uuid, p_quantity integer, p_exchange_empty boolean,
  p_delivery_address text, p_commune_code text, p_notes text default null,
  p_latitude double precision default null, p_longitude double precision default null
) returns public.orders
language sql security invoker set search_path = '' as $$
  select private.create_order(p_product_id, p_quantity, p_exchange_empty,
    p_delivery_address, p_commune_code, p_notes, p_latitude, p_longitude);
$$;

create function private.cancel_order(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result public.orders;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Ownership and status are rechecked atomically after a concurrent update.
  update public.orders set status = 'cancelled'
    where id = p_order_id and customer_id = caller
      and status in ('requested', 'offered', 'accepted')
    returning * into result;
  if not found then
    raise exception 'Order cannot be cancelled' using errcode = '55000';
  end if;
  return result;
end;
$$;

create function public.cancel_order(p_order_id uuid) returns public.orders
language sql security invoker set search_path = '' as $$
  select private.cancel_order(p_order_id);
$$;

revoke all on function private.create_order(uuid, integer, boolean, text, text, text, double precision, double precision),
  public.create_order(uuid, integer, boolean, text, text, text, double precision, double precision),
  private.cancel_order(uuid), public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function private.create_order(uuid, integer, boolean, text, text, text, double precision, double precision),
  public.create_order(uuid, integer, boolean, text, text, text, double precision, double precision),
  private.cancel_order(uuid), public.cancel_order(uuid) to authenticated;
-- Existing grants/policies remain read-only for orders and events.
revoke insert, update, delete on public.orders, public.order_events from public, anon, authenticated;

-- Freeze quantity/notes/address too, without replacing existing state/assignment rules.
create function private.guard_order_details() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.quantity is distinct from old.quantity
    or new.notes is distinct from old.notes
    or new.delivery_address is distinct from old.delivery_address
    or new.commune_code is distinct from old.commune_code then
    raise exception 'Order details are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_order_details() from public, anon, authenticated;
create trigger guard_order_details before update on public.orders
  for each row execute function private.guard_order_details();

commit;
