# Suites SQL vigentes después de ADR 0021

ADR 0043 incorpora document_replacement.sql: cinco envíos de licencia deben
producir dos pendientes y tres históricos. Cubre reintento idempotente, rechazo
de decisión obsoleta, conservación tras envío inválido y aprobaciones vigentes.
El runner apply-document-replacements-test.cjs también ensaya la regularización
de duplicados anteriores y revierte esos fixtures antes de aplicar la migración.

Desde ADR 0042, `driver_self_documentation.sql` comprueba carga/edición de licencia
por su dueño, lectura del negocio, aislamiento entre conductores y revisión por
otro admin. Pasó junto con `document_eligibility.sql` en Test el 2026-10-27, con
fixtures revertidos. La suite anterior ahora usa al conductor como cargador de su
licencia y elige una patente libre para no colisionar con la demo persistente.

Desde ADR 0039, `document_eligibility.sql` cubre los tres grupos documentales
autorizados y pasó en Gasway Test el 2026-10-26. Para repetir solo esa suite usa
`npm run db:test:cloud -- --suite=document_eligibility.sql`. Los fixtures de las
suites anteriores ahora requieren `helpers/document-fixture.sql`, que el runner
crea dentro de su transacción y revierte al terminar. Es postgres-only, no se
instala por migración ni concede aprobaciones móviles. Las suites previas y sus
fixtures adaptados **no se ejecutaron** en esta tarea. DT-03 prepara y retira el
mismo helper en sus fixtures persistentes exclusivos de Test; no se ejecutó DT-03.

La lista ejecutable y clasificación de los archivos está en [suites.json](suites.json).
Cada SQL debe figurar exactamente una vez como current o historical. El runner no
ejecuta SQL por glob; solo acepta la ref de Gasway Test y exige un marcador privado.

```powershell
npm run db:test:list
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:cloud
```

Las suites current son abastible_cylinder_variants, business_onboarding,
business_driver_invitations, distributor_discovery, distributor_owned_coverage,
driver_order_progress, driver_workspace, pilot_security, mapped_delivery_point,
order_tracking y distributor_workspace. Esta última requiere la migración
20261026010000 (aplicada en Test/app) y cubre membresías, perfil/CUT/medios, flota,
revisiones CAS, ventas, costos y aislamiento. distributor_workspace y pilot_security
pasaron en Gasway Test el 2026-10-25 con rollback; no se ejecutaron fixtures en app.
DT-07 añade pilot_security para permisos efectivos, RLS, RPC y
aislamiento de perfiles; D1/D2 cubren destino y GPS por pedido. driver_locations
ya es privada, sin escrituras directas ni coordenadas en Realtime (ADR 0032).
Las suites de catálogo/progreso/
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
