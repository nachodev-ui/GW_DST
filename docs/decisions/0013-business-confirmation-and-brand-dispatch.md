# ADR 0013 — Confirmación del negocio y despacho por marca

Fecha: 2026-10-18. Estado: aplicado en cloud y suites aprobadas.

## Problema

El postulante elegía un negocio, pero administración podía aprobar sin que ese
negocio confirmara la vinculación. Además, el despacho solo filtraba conductor,
disponibilidad y comuna: podía ofrecer otra marca y no fijaba el vendedor del pedido.

## Decisión

El modelo distingue negocio vendedor, conductor, responsable del negocio y
administración Gasway. El dueño puede conducir si obtiene también esa habilitación.
No se modelan salario, relación laboral, cesión de vehículo o combustible como reglas
universales. El contexto y sus fuentes se conservan en market-context-chile.md.

`distributor_brands` registra una o varias marcas configuradas por administración
según antecedentes comerciales. Tiene RLS y lectura afiliada, sin escritura móvil.
No se infieren ni una marca única obligatoria ni la venta automática de todas.

`list_distributor_driver_applications()` entrega a responsables autenticados de un
negocio verificado exclusivamente nombre, identidad técnica de la solicitud, fecha,
negocio elegido y estado de confirmación. No entrega RUT, teléfono ni dirección;
RLS de driver_applications continúa siendo lectura propia.

`confirm_driver_affiliation(driver_id, requested_at)` toma al responsable de auth.uid, comprueba su
membresía confiable y el negocio elegido, y bloquea conductor, solicitud, negocio y
membresía. Registra actor/fecha, sin otorgar rol ni verificación. Un dueño que también
postula puede confirmar por su negocio si ya tiene membresía confiable; administración
conserva siempre la aprobación final.

La confirmación se liga a driver_id + requested_at, conserva el primer actor ante
reintentos y no sirve para una nueva postulación tras rechazo. No hay escritura
directa móvil ni credenciales administrativas en la app. Un trigger exige esta
confirmación al aprobar; otro la incorpora a la copia privada de la revisión.
La RPC exige la fecha exacta devuelta por el listado, enviada como texto sin truncar
microsegundos; rechaza la versión vieja si la postulación cambió desde que se leyó.

Disponibilidad nueva exige afiliación a un negocio verificado con marcas configuradas.
Despacho, listado de ofertas y aceptación atómica verifican la marca del producto.
La aceptación bloquea negocio/marca y conserva los bloqueos de conductor y el único
pedido activo. Incluso una oferta interna antigua no permite aceptar otra marca.

`orders.distributor_id` se fija desde el conductor asignado en la transición de
aceptación y queda inmutable. No se inventa vendedor para históricos ni se altera
su importe. Una entrega ya asignada puede terminar aunque luego el negocio pierda
verificación; esa pérdida impide nuevas asignaciones. Es una protección operativa,
no el flujo completo de suspensión, que sigue pendiente.

## Operación y límites

Actualización: ADR 0014 incorpora la interfaz del negocio y un demo persistente
solicitado explícitamente por el usuario. El apartado siguiente conserva el alcance
de esta decisión anterior; la excepción de datos ficticios está documentada allí.

La confirmación existe como backend autenticado; falta la interfaz del negocio para
invocarla con su sesión. No se simulan identidades de responsables ni se crean negocios
o marcas de demostración persistentes para habilitar cuentas reales.

La configuración comercial es SQL privilegiado por ahora, con marcas respaldadas:

```sql
insert into public.distributor_brands(distributor_id, brand)
values ('UUID_DEL_NEGOCIO_VERIFICADO', 'Gasco')
on conflict(distributor_id, brand) do nothing;
```

El conductor aprobado anterior sin afiliación conserva sus datos y acceso, pero
no recibe ofertas nuevas ni puede declararse disponible hasta regularizar negocio
y marcas. El vínculo y el flag is_verified no sustituyen licencia vigente, vehículo
habilitado ni capacitación. La revisión de esos antecedentes debe preceder al piloto.

Todavía falta cotizar precio/stock por negocio y mostrar vendedor antes de confirmar
la compra. El importe sigue siendo global por producto en el prototipo; fijar vendedor
al aceptar mejora trazabilidad, sin resolver esa decisión comercial pendiente.

## Verificación

Aplicadas `20261018213030_distributor_affiliation_and_dispatch.sql` y
`20261018214148_affiliation_confirmation_version.sql` en Gasway Project
tras dry run de esa única migración. Pasaron nueve suites SQL: la nueva de afiliación
y despacho; datos de postulación; revisión; nueva postulación; ofertas; progreso;
pedidos cliente; esquema inicial; y variantes de cilindros. Los fixtures se revierten.
La suite nueva cubre permisos, privacidad, actor del negocio, falta/antigüedad de
confirmación, marca incorrecta, vendedor inmutable y continuidad de entrega asignada.
Se volvió a ejecutar esa suite tras exigir la versión exacta, incluyendo el rechazo
de una confirmación enviada desde un listado desactualizado.
Los conteos de usuarios, conductores, pedidos, negocios, solicitudes, revisiones,
confirmaciones y marcas coincidieron antes/después. Pasaron typecheck y lint de los
dos archivos móviles con cambios de texto. Advisors sin problemas nuevos; permanece
el aviso conocido de Auth por protección contra contraseñas filtradas desactivada.

No se hicieron renders, capturas ni pruebas en dispositivo. Las carreras con dos
conexiones, documentación vigente y flujo completo del negocio siguen pendientes.
