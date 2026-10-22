# ADR 0021 — La distribuidora administra la cobertura

Fecha: 2026-10-21. Estado: aceptada. Sustituye la propiedad de cobertura de ADR 0020.

## Contexto

El usuario precisó que el negocio decide dónde entrega y sus conductores trabajan
dentro de esa cobertura. El modelo por conductor impedía preparar las comunas sin
equipo y confundía cobertura comercial con disponibilidad de reparto.

## Decisión

`distributor_communes(distributor_id, commune_code)` es la única fuente operativa.
La FK usa el catálogo CUT existente. Los responsables owner/manager editan desde
Mi negocio → Cobertura mediante `set_business_coverage`, incluso sin conductores.
`coverage_revision` protege contra sobrescrituras; un reintento idéntico no duplica
cambios. La RPC valida identidad/membresía y las comunas en el servidor. RLS limita
la lectura directa a miembros y al conductor del propio negocio; no se conceden
escrituras de tabla a clientes.

Todos los conductores afiliados heredan las mismas comunas, sin copias por persona.
Reparto → Cobertura pasa a ser consulta. El conductor solo escribe disponibilidad
mediante `set_driver_availability(boolean)`. `get_driver_settings` devuelve comunas
heredadas con nombres oficiales. `no_coverage` distingue un negocio sin área definida.

Búsqueda comercial, compra, despacho, listado de ofertas y aceptación atómica usan
la cobertura del negocio. Stock/precio, habilitación, horario y disponibilidad
siguen siendo requisitos distintos. Un negocio sin conductores puede declarar
cobertura; no puede confirmar compras si no puede emitir una oferta de reparto.

## Migración y concurrencia

Antes de retirar `driver_communes`, todas sus filas se guardan en
`private.legacy_driver_coverage`, sin acceso móvil. Solo las filas con distribuidora
afiliada se trasladan mediante unión de comunas al negocio correspondiente. Una
comuna sin negocio conocido no se asigna por la dirección del negocio ni por inferencia.
No se modifica stock, precios, roles o habilitaciones. Se retiran las dos funciones
`set_driver_settings(boolean,text[])` y la tabla antigua sin CASCADE.

La edición bloquea la misma fila de distribuidora que compra/aceptación bloquean
para lectura. Retirar una comuna vence las ofertas sin asignar fuera de la nueva
área, sin renovar las rechazadas o expiradas. La aceptación revalida cobertura
bajo ese bloqueo. No se cancelan ni bloquean entregas ya asignadas: pueden terminar.
La edición preserva la preferencia de disponibilidad; sin cobertura no se habilita
nuevo reparto. Los históricos de pedidos y migraciones se conservan.

## Verificación

La suite `supabase/tests/distributor_owned_coverage.sql` cubre configuración sin
conductores, herencia, CUT, revisión/idempotencia, membresías y revocación, RLS,
compra sin cobertura/equipo, despacho al mismo negocio, retiro de ofertas, aceptación
directa y continuación de una entrega asignada tras retirar la comuna. Se ejecutó
junto con `distributor_discovery.sql` y un fixture adicional de traslado/archivo
del modelo anterior en una transacción con rollback, antes de aplicar la migración.
Las suites Node de cobertura, ofertas y espacio del conductor y el typecheck final
pasaron. La lectura posterior confirmó retirada de tabla/RPC antiguas, ausencia de
funciones con referencias a la tabla retirada, RLS y las tres filas sin negocio
en el archivo privado. El negocio demo mantiene cero comunas hasta que su responsable
las elija. El advisor conserva solo el aviso de Auth previo sobre contraseñas filtradas.
No se abrió
la app ni se realizaron renders, capturas o emuladores.
