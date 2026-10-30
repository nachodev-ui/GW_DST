# Regresiones automatizadas (DT-02)

Fecha: 2026-10-22. Decisión: [ADR 0022](decisions/0022-regression-automation.md).

## Offline y cobertura

Requisitos: Node 24 (`.nvmrc`), npm y PowerShell 7 (`pwsh`). Después de `npm ci`:

```powershell
npm test
npm run test:coverage
```

El runner descubre `scripts/test-*.cjs`, excepto su propio archivo, y ejecuta cada
suite en un proceso de `node --test`. Después ejecuta la regresión administrativa
PowerShell con HTTP/credenciales simulados. Son **26 archivos Node y una suite PowerShell**,
no un conteo de assertions. Falta de pwsh, timeout o salida no cero falla el comando.

El loader común ejecuta fuentes TypeScript/TSX con mapas de origen y mocks explícitos
de Supabase, hooks y APIs nativas. No renderiza la app ni carga `.env`. El preload
Node rechaza fetch y conexiones TCP accidentales; no es un sandbox para ejecutar
código arbitrario no confiable. La suite PowerShell intercepta las solicitudes HTTP.

Las assertions cubren roles/zod, almacenamiento seguro y escrituras interrumpidas,
credenciales, RUT módulo 11, CUT/cantidades, CLP/canje, horarios de Santiago en
verano/invierno/trasnoche, selección de vendedor, CSV/invitaciones, cobertura
heredada/disponibilidad y aceptación/progreso con fronteras remotas simuladas.

C8 12.0.0 mide **siete módulos** definidos en `.c8rc.json`: RUT, contratos de pedidos,
opciones de entrega, almacenamiento seguro, formulario de pedido, contratos de
cobertura e importación de equipo. `all: true` incluye archivos de la lista no
ejecutados. Los umbrales agregados son **85 % líneas/statements/funciones y 75 %
ramas**; incumplirlos falla CI. No son umbrales por archivo ni cobertura de toda la
app, SQL, PowerShell o dispositivos reales.

Medición de DT-02: **99,54 % líneas/statements, 100 % funciones y 90,60 % ramas**.
La integración del 2026-10-23 midió **98,41 % líneas/statements, 92,59 % funciones
y 87,56 % ramas** sobre los mismos siete módulos; conserva todos los umbrales.
Los reportes `coverage/lcov.info` y `coverage/coverage-summary.json` son generados,
ignorados por Git. Ampliar la lista exige pruebas útiles, no exclusiones para bajar
el umbral. Las suites de hooks/componentes usan mocks, sin montar pantallas.
El loader registra los mapas mediante compilación de módulos de Node; se descartaron
las mediciones preliminares del loader VM porque no registraba mapas para V8.

## CI

La integración del 2026-10-30 aprobó 67 pruebas Node, la suite PowerShell y los
umbrales de cobertura: 98,42 % líneas/statements, 92,59 % funciones y 87,56 % ramas.
Se corrigieron los conteos obsoletos del runner y el mock de RefreshButton; el
reintento comprueba la invalidación de postulación y acceso. Las comprobaciones
sintéticas adicionales de backup y SMTP también pasaron.

Las 14 suites SQL se comprobaron en Gasway Test incorporando temporalmente
`20261030053253_eligibility_invoker_wrappers.sql` en cada transacción y revirtiendo
la corrección junto a los fixtures. Sin esa migración, pilot_security detecta las
dos RPC públicas SECURITY DEFINER de la migración documental anterior. Antes de
ejecutar el runner normal otra vez, desplegar la corrección mediante el procedimiento
autorizado del entorno. Esta integración no la aplicó de forma persistente.
Detalle en [integración](integration-2026-10-30.md).

DT-07 añade `scripts/test-confirmation.cjs`: frontera de URL nativa, códigos
duplicados/malformados, PKCE, errores de confirmación y operaciones criptográficas
para Hermes. No renderiza la app. Los scripts de redirecciones y correo reales
se invocan aparte: [confirmación nativa](auth-confirmation.md).

`scripts/test-account-cleanup.cjs` comprueba offline la herramienta administrativa
de limpieza manual: confirmación explícita, destino fijo, rechazo de dependencias,
rol e identidad distintos, seguridad del delimitador SQL y revocación antes de
borrar/verificar. Sus fronteras SQL/Auth son simuladas y no ejecuta el borrado real.

`.github/workflows/ci.yml` corre en PR/push sobre Linux y Windows: instalación desde
lockfile, typecheck, lint, formato y cobertura. Acciones oficiales fijadas por commit,
permiso `contents: read`, credenciales Git no persistidas y sin secretos cloud.
Los runners hospedados incluyen PowerShell 7. LCOV/resumen se conservan siete días.

DT-02 normaliza el baseline de formato existente para habilitar la puerta de todo
el repositorio `npm run format:check`. Esos cambios no modifican reglas de negocio.
`.gitattributes` fija LF para texto en todos los sistemas, incluido el checkout de Windows.
Lint conserva sus advertencias actuales, sin desactivar reglas.

## Cloud separado

Se creó **Gasway Test**, ref **xnrueexpwzvxotgwmamj**, en la organización Gasway
**qzzneybdutqgdlqwjgqk**, región us-east-2. El usuario confirmó plan Free; no se
cambió el plan ni se activaron servicios pagados. Free tiene límites y pausa por
inactividad: comprobar su estado al retomar pruebas.

Se aplicaron las **20 migraciones versionadas**, sin copiar usuarios/direcciones
ni datos de la app. Se carga seed.sql, revisado: solo 14 productos globales, sin
usuarios, ubicaciones ni precios. No se usa un dump de producción. No se cambian
la conexión del móvil ni el vínculo CLI original.

Con la sesión del CLI en la organización correcta (`supabase login`), desde la raíz:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:prepare
npm run db:test:list
npm run db:test:cloud
```

Para repetir solo una suite vigente: `npm run db:test:cloud -- --suite=driver_workspace.sql`.
La selección sigue rechazando archivos históricos o rutas ajenas a la allowlist.

Se comprobaron las siete suites en Gasway Test. La base nueva hizo visible la
dependencia del catálogo seed; workspace también necesitó el SQLSTATE 55000 vigente
al activar disponibilidad con negocio no operativo. Ambos fixtures se corrigieron
y las pruebas correspondientes pasaron, sin cambiar funciones del negocio.
La lectura posterior confirmó cero usuarios, pedidos y negocios de fixtures,
14 productos globales, 20 migraciones y RLS en el marcador privado.

`db:test:prepare` aplica migraciones pendientes y el catálogo idempotente solo a la
ref permitida y coloca un marcador privado. No resetea ni borra la base. Para otro proyecto hay que revisar
y cambiar la configuración versionada. CLI 2.121.0 exige `--linked --project-ref`
para seleccionar cloud explícitamente; ese selector no vuelve a vincular el checkout.
Las consultas se ejecutan en serie para no invalidar el login temporal del CLI.

`db:test:cloud` valida el destino antes de conectar, rechaza la ref de la app
**gleltbrvpfvfgggcatpt**, verifica el marcador en cada transacción y ejecuta solo
los **14 SQL current** de `supabase/tests/suites.json`, con timeout y rollback
externo además del rollback interno de fixtures. Las secuencias pueden avanzar.
SQL nuevo sin clasificación, archivo faltante o clasificación duplicada falla también
en la regresión offline del tooling. Las nueve suites históricas están excluidas.

D1 incorpora `mapped_delivery_point.sql`: punto WGS84, reintento idempotente sin
doble reserva, rechazo de coordenadas ausentes/no finitas/fuera de rango y lectura
de usuario ajeno bloqueada por RLS. Pasó de forma dirigida en Gasway Test el
2026-10-24 con rollback de fixtures. No equivale a una nueva ejecución de todas
las suites ni a comprobar el mapa en dispositivo.

D2 incorpora `order_tracking.sql`: autorización por pedido, rangos/tiempos GPS,
recepción de servidor, orden/frecuencia, frescura, revocación, borrado terminal y
segunda entrega sin heredar posición. Pasó con rollback en Test el 2026-10-24,
junto a `pilot_security.sql` y `driver_order_progress.sql`. Contratos zod y tooling
pasaron de forma dirigida; typecheck final aprobado. No acredita GPS físico ni
WebSocket o concurrencia entre conexiones. [Contrato y límites](gps-contract.md).

D3 amplía `test-tracking.cjs` y añade `test-tracking-lifecycle.cjs`: envío exclusivo,
descarte de fixes, pausa, respuestas tardías, caducidad monotónica, suscripción/
reconexión, fallo/denegación sin coordenadas, evento terminal, cambio de sesión y
abort/timeout. Pasaron junto a `test-driver-order-progress.cjs`; typecheck y lint
dirigidos aprobados. `order_tracking.sql` añade destino confirmado, null legado y
null terminal, aprobado en Test junto a `pilot_security.sql`, con rollback.
No se renderizó la app ni se probó sensor, WebSocket o dos teléfonos. Estado y
procedimiento de aceptación física en [D3](live-tracking.md).

Con `SUPABASE_ACCESS_TOKEN` se ejecuta cada batch completo mediante HTTPS en
`POST https://api.supabase.com/v1/projects/<ref>/database/query`, con `read_only: false`.
No resuelve el CLI ni lee su caché de conexión. CI exige ese token y no hace fallback
a una conexión directa. En desarrollo local sin esa variable se conserva la sesión
del CLI ya preparada. La inicialización `db:test:prepare` sigue usando el CLI.

## Fallo IPv6 en un runner limpio

La primera ejecución SQL de Actions falló antes del SQL: el CLI intentó conectar
a Postgres mediante IPv6 y el runner no tenía el pooler configurado. La verificación
local anterior tenía caché y no reprodujo un checkout limpio. La corrección usa
HTTPS en CI con el mismo secret, sin supabase link, contraseña de base ni add-on IPv4.

La regresión offline ejecuta el runner completo en un proceso que prohíbe resolver
el CLI y leer project-ref/pooler-url/linked-project.json. Simula siete respuestas
correctas y un fallo SQL; este último detiene la suite y produce salida no cero.
También comprueba permisos HTTP rechazados, timeout, JSON inválido, destino y
ocultación del token. Son simulaciones de transporte, no una nueva validación remota
con el PAT de GitHub. La ejecución real fue confirmada posteriormente por el usuario,
según la evidencia registrada abajo.

Validación de la corrección: 13 suites Node y una PowerShell pasan; typecheck y
formato correctos, con cobertura crítica sin cambios. El endpoint HTTPS respondió
401 a una petición de prueba sin credenciales forzada a IPv4, confirmando acceso
de red. Una consulta local a Gasway Test confirmó el marcador y cero usuarios/pedidos.
El PAT almacenado en GitHub no se leyó ni se copió al equipo.

El endpoint de consultas está documentado como beta/experimental. La dependencia
queda aislada en scripts/testing/cloud-query.cjs; ante fallo no se reintenta SQL
ni se amplían permisos. Se mantiene el batch transaccional completo por petición.

`npm run db:test` sigue reservado al runner local/pgTAP de Supabase: estas suites
son assertions DO de Postgres, no pgTAP. No usar Docker, db:start o db:reset aquí.
Las suites anteriores son secuenciales; las carreras de DT-03 usan el runner
separado descrito a continuación.

DT-07 incorpora `pilot_security.sql` como octava suite y `npm run db:test:auth`
para comprobar Auth/Data API con cuentas temporales fuera del runner SQL. La prueba
Auth requiere CLI local administrativa, rechaza CI y solo admite Gasway Test; crea
y elimina dos cuentas sin enviar correo. El workflow separado `secret-scan.yml`
escanea historial con Gitleaks, sin credenciales cloud. Evidencia y pendientes en
[seguridad del piloto](pilot-security.md). La evidencia histórica 7/7 de DT-02
corresponde a su versión original; la octava suite pasó localmente, todavía no en Actions.

## Habilitar SQL en GitHub

`sql-test-cloud.yml` es manual y solo ejecuta main. Tras integrar la rama, configurar
el environment **gasway-test**, restringido a main y con aprobación del mantenedor:

- Variable `GASWAY_TEST_PROJECT_REF`: `xnrueexpwzvxotgwmamj`.
- Secret `SUPABASE_TEST_ACCESS_TOKEN`: token de una identidad con acceso al entorno
  de pruebas, privilegios mínimos disponibles y rotación propia.

No copiar automáticamente el token local ni dar secretos a PRs. El token solo está
en los pasos de consulta cloud, después de instalar dependencias. El workflow no
crea proyectos ni migra/despliega automáticamente; falta de configuración falla.
El usuario ya configuró el environment/secret, integró la corrección y confirmó
el workflow exitoso. Para futuras correcciones, iniciar **Run workflow** después
de integrar el cambio: **Re-run jobs** reutiliza el commit de la ejecución original.

Fuentes: [C8](https://github.com/bcoe/c8), [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html),
[Supabase Free](https://supabase.com/pricing), [clasificación SQL](../supabase/tests/README.md).
Transporte: [Management API Run SQL query](https://supabase.com/docs/reference/api/v1-run-a-query).

## Evidencia de cierre de DT-02

El 2026-10-22 el usuario compartió en este chat el log exitoso de GitHub Actions:
`SQL transport: Supabase Management API over HTTPS`, seguido de PASS para las siete
suites current: catálogo Abastible, onboarding de negocio, invitaciones, discovery,
cobertura del negocio, progreso y workspace del conductor. Esto confirma la ejecución
real con el secret del environment y resuelve el fallo IPv6 del primer intento.
La evidencia aportada no incluye URL/ID de la ejecución; no se inventa una referencia.
DT-02 queda completado; las carreras entre conexiones siguen en DT-03.

## DT-03: sesiones concurrentes y respuestas perdidas

```powershell
$env:GASWAY_TEST_PROJECT_REF = "xnrueexpwzvxotgwmamj"
npm run db:test:concurrency -- --list
npm run db:test:concurrency
# O solo un escenario:
npm run db:test:concurrency -- --case=last-stock
```

El runner mantiene los guards de proyecto/marcador. Con PAT usa HTTPS; en CI exige
`SUPABASE_ACCESS_TOKEN`. No cargar variables de producción desde archivos .env.
Localmente sin PAT usa el CLI autenticado y separa cinco segundos el arranque del
contendiente y su observador para reducir la colisión al rotar el rol temporal del
CLI. Ese margen no acredita la carrera: los PID y el bloqueo siguen siendo
obligatorios; si la conexión tarda demasiado, falla y debe revisarse el transporte.
Los fixtures ficticios se confirman para que otras sesiones puedan verlos y se
eliminan al finalizar; esta suite **no usa rollback global**. No ejecutar en otro
entorno ni simultáneamente con tareas manuales de mantenimiento de Gasway Test.

| Caso                      | Resultado exigido                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| two-drivers-one-order     | Solo el primer conductor recibe el pedido; un evento de aceptación.                                       |
| two-orders-one-driver     | El conductor solo acepta el primero; el segundo sigue ofrecido.                                           |
| last-stock                | Una compra gana, otra falla; stock cero y una reserva.                                                    |
| cancel-before-accept      | La cancelación gana y repone una vez; no hay aceptación.                                                  |
| accept-before-cancel      | Ambas operaciones son válidas en ese orden; termina cancelado y repone una vez.                           |
| cancel-before-progress    | El progreso falla tras la cancelación y la reserva se libera.                                             |
| progress-before-cancel    | El progreso gana; cancelar en camino falla y conserva la reserva.                                         |
| same-request-concurrently | Las compras simultáneas devuelven el mismo UUID, sin duplicar eventos ni reserva.                         |
| retry-after-commit        | Tras descartar la respuesta de una compra confirmada, el retry conserva pedido, eventos, stock y reserva. |

En las ocho carreras se exige evidencia de dos PID distintos y bloqueo real del
segundo por el primero, antes de liberar la barrera. Cada RPC usa `authenticated`
con identidades ficticias; un deadlock, timeout o SQLSTATE inesperado falla.
El último caso simula pérdida de la respuesta en el cliente después de COMMIT;
no simula una interrupción TCP ni un fallo dentro del commit. Ver ADR 0023.

El workflow **Concurrencia SQL en Gasway Test** es manual y solo main. Reutiliza
`gasway-test`, la variable y el secret de DT-02; no requiere otro token. Comparte
`gasway-test-database` para no cruzarse con el workflow secuencial. Ya está integrado
y su ejecución real en Actions se verificó según la evidencia de cierre registrada abajo.

### Recuperar una ejecución interrumpida

El registro único en `private.concurrency_test_run` bloquea ejecuciones solapadas.
El runner limpia solamente sus UUID y conserva los fixtures si detecta un
contendiente activo. Si el proceso muere, revisar en SQL Editor de **Gasway Test**:

```sql
select run_id, created_at, data from private.concurrency_test_run;
select pid, application_name, state, wait_event_type, wait_event
from pg_stat_activity where application_name like 'dt03-%';
```

Esperar a que terminen sus transacciones; los comandos tienen timeout. No borrar el
registro para desbloquear otro run mientras existan contendientes activos. Después,
usar `npm run db:test:concurrency -- --cleanup-run=<UUID-del-run>` con el mismo destino
y credenciales: vuelve a comprobar marcador y sesiones activas antes de limpiar.
No hay limpieza automática por fecha ni borrado de fixtures de otro run.

### Evidencia local de DT-03 (2026-10-22)

Los nueve escenarios pasaron contra **Gasway Test** con el CLI autenticado local.
En las ocho carreras se registraron `READY`, `BLOCKED`, `PASS` y `CLEAN`; por
ejemplo, el segundo conductor (PID 26943) esperó al primero (PID 26341), y la
segunda compra por último stock (PID 27034) esperó a la primera (PID 27027).
Se comprobaron los SQLSTATE esperados, actores/transiciones, asignación, stock y
reservas. El reintento tras commit conservó también los UUID/fechas de eventos y
la revisión del stock. No se creó otro token ni se usó la base de la app.

Validación offline: **14 suites Node + una PowerShell**, typecheck y formato
correctos. Cobertura crítica: 99,54 % líneas/statements, 100 % funciones y 90,60 %
ramas. La suite nueva verifica el coordinador, fallo al no observar contención,
liberación ante error del contendiente, guards y assertions de eventos.

Esta evidencia corresponde a la ejecución local contra cloud. La validación posterior
con el PAT del environment de Actions se registra a continuación.
La comprobación final dejó cero runs, usuarios, pedidos, negocios y contendientes
activos de prueba; el marcador siguió presente y el enlace CLI de la app se conservó.

### Cierre de DT-03 en GitHub Actions (2026-10-22)

Se verificaron el estado y los logs de la ejecución
[39807681871](https://github.com/nachodev-ui/GW_DST/actions/runs/39807681871),
job [119925184551](https://github.com/nachodev-ui/GW_DST/actions/runs/39807681871/job/119925184551),
del workflow **Concurrencia SQL en Gasway Test**. Terminó con `success`, mediante
`workflow_dispatch` sobre `main`, commit `5d69dc8d659ed45fc2ae507a9368e5ebabb55fc1`
(merge del PR #9), el 2026-10-22.

El log confirmó `Concurrency transport: HTTPS; target xnrueexpwzvxotgwmamj`,
**9 PASS, 9 CLEAN y 8 BLOCKED**. Pasaron los nueve casos enumerados arriba,
incluido el reintento tras commit; las ocho carreras acreditaron PID distintos y
espera real entre sesiones. Cada caso terminó con la limpieza de sus fixtures.
Esto verifica el workflow integrado con las credenciales de `gasway-test`, además
de la ejecución local previa, y permite dar por **cerrado DT-03**.

Se mantienen los límites del ADR 0023: son escenarios de contención controlada,
no una prueba de carga exhaustiva; la respuesta perdida se simula descartando el
resultado confirmado en el cliente, sin cortar TCP ni interrumpir el commit.
