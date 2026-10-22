# Suites SQL y evolución de contratos

Ejecutar como postgres sobre la versión correspondiente; los fixtures de estas
suites se revierten. No ejecutar indiscriminadamente archivos antiguos en cloud.

Para cobertura/compra vigentes desde ADR 0021:

- `distributor_owned_coverage.sql`: propiedad de cobertura, herencia, seguridad,
  revisión concurrente, ofertas, aceptación y continuidad de entregas.
- `distributor_discovery.sql`: precios del vendedor, reserva/cancelación,
  idempotencia, contacto, horario y aislamiento entre negocios.

`driver_offers.sql`, `driver_workspace.sql` y
`distributor_affiliation_and_dispatch.sql` son fixtures históricos anteriores al
traslado de cobertura a la distribuidora y todavía nombran `driver_communes` y/o
`set_driver_settings`. No son suites del contrato actual. Las migraciones antiguas
se conservan como historial; el contrato nuevo se comprueba con las dos suites
indicadas arriba. Lo mismo aplica al contrato histórico `create_order` de las
suites anteriores a ADR 0018: fue retirado de los permisos móviles.

La suite previa `business_coverage.sql` fue reemplazada por
`distributor_owned_coverage.sql`, que cubre los permisos de consulta y la nueva
escritura de cobertura por membresía.
