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
PowerShell con HTTP/credenciales simulados. Son **13 suites Node y una PowerShell**,
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

Medición final: **99,54 % líneas/statements, 100 % funciones y 90,60 % ramas**.
Los reportes `coverage/lcov.info` y `coverage/coverage-summary.json` son generados,
ignorados por Git. Ampliar la lista exige pruebas útiles, no exclusiones para bajar
el umbral. Las suites de hooks/componentes usan mocks, sin montar pantallas.
El loader registra los mapas mediante compilación de módulos de Node; se descartaron
las mediciones preliminares del loader VM porque no registraba mapas para V8.

## CI

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
los **siete SQL current** de `supabase/tests/suites.json`, con timeout y rollback
externo además del rollback interno de fixtures. Las secuencias pueden avanzar.
SQL nuevo sin clasificación, archivo faltante o clasificación duplicada falla también
en la regresión offline del tooling. Las nueve suites históricas están excluidas.

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
Las pruebas son secuenciales; las carreras con conexiones independientes son DT-03.

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
