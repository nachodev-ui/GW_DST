# Suites SQL vigentes después de ADR 0021

La lista ejecutable y clasificación de los 17 archivos está en [suites.json](suites.json).
Cada SQL debe figurar exactamente una vez como current o historical. El runner no
ejecuta SQL por glob; solo acepta la ref de Gasway Test y exige un marcador privado.

```powershell
npm run db:test:list
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:cloud
```

Las ocho suites current son abastible_cylinder_variants, business_onboarding,
business_driver_invitations, distributor_discovery, distributor_owned_coverage,
driver_order_progress, driver_workspace y pilot_security. DT-07 añade la última
para permisos efectivos, RLS, RPC y aislamiento de perfiles. Las suites de catálogo/progreso/
workspace se adaptaron en DT-02 para rollback uniforme, compra comercial y cobertura
heredada. Se ejecutan en serie, con timeout y rollback externo más subtransacciones
internas. Los errores se propagan; las secuencias pueden avanzar.

Las nueve historical se excluyen: initial_schema, auth_roles, customer_orders,
driver_offers, distributors_driver_review, driver_reapplication,
driver_application_details, distributor_affiliation_and_dispatch y
legacy_driver_regularization. Los motivos concretos están en el registro JSON.
La regularización es una operación administrativa puntual con compositor manual.

Preparación, credenciales y CI en [guía de pruebas](../../docs/testing.md).
No ejecutar estas suites contra la base de la app. Son secuenciales y no demuestran
carreras entre conexiones (DT-03). db:test local es pgTAP, no este runner de assertions.

## Antecedentes

Ejecutar como postgres sobre la versión correspondiente; los fixtures de estas
suites se revierten. No ejecutar indiscriminadamente archivos antiguos en cloud.

Para cobertura/compra vigentes desde ADR 0021:

- `distributor_owned_coverage.sql`: propiedad de cobertura, herencia, seguridad,
  revisión concurrente, ofertas, aceptación y continuidad de entregas.
- `distributor_discovery.sql`: precios del vendedor, reserva/cancelación,
  idempotencia, contacto, horario y aislamiento entre negocios.

`driver_offers.sql` y
`distributor_affiliation_and_dispatch.sql` son fixtures históricos anteriores al
traslado de cobertura a la distribuidora y todavía nombran `driver_communes` y/o
`set_driver_settings`. No son suites del contrato actual. Las migraciones antiguas
se conservan como historial; el contrato nuevo se comprueba con las dos suites
indicadas arriba. Lo mismo aplica al contrato histórico `create_order` de las
suites anteriores a ADR 0018: fue retirado de los permisos móviles.

La suite previa `business_coverage.sql` fue reemplazada por
`distributor_owned_coverage.sql`, que cubre los permisos de consulta y la nueva
escritura de cobertura por membresía.
