# DT-07, condición 3 — Accesos, claves y respuesta a incidentes

Revisión: **2026-10-23**. Estado: **condición 3 aprobada y cerrada**.
Las condiciones 1 y 2 conservan su aprobación. Esta revisión no habilita el piloto.

Actualización del operador del **2026-10-23**: trabaja solo, confirma haber
activado MFA en Supabase y tener MFA de GitHub mediante Passwords de iPhone;
Maps sigue fuera del piloto. Incidentes y operación quedan a cargo de Nacho;
la automatización se implementará más adelante. En su confirmación final,
identifica expresamente **`gasway-github-tests` como el token guardado en
`SUPABASE_TEST_ACCESS_TOKEN`**. Esto resuelve la duda anterior y cierra la
condición en el alcance actual, sin sustituir el token ni cambiar el secret.

## Evidencia y alcance

Consultas de solo lectura mediante la CLI Supabase 2.121.0 autenticada, GitHub
CLI y los paneles web con sesión del operador. El conector Supabase sigue
perteneciendo a otra cuenta: no se usó para consultar ni modificar Gasway.
Se preservó el enlace CLI de la app. El agente no modificó configuraciones cloud,
permisos, tokens ni secretos; no se crearon usuarios ni se ejecutaron suites SQL.
No se abrió la app, se tomaron capturas ni se inspeccionaron valores de claves.
Las publishable de las sondas se obtuvieron por stdout capturado y permanecieron
en memoria. El estado de builds ya instalados no fue comprobado.

## Data API: inventario verificado en ambos proyectos

| Entorno              | Ref                    | Esquemas expuestos         | Esquema excluido | Extra search path      |
| -------------------- | ---------------------- | -------------------------- | ---------------- | ---------------------- |
| Gasway Project (app) | `gleltbrvpfvfgggcatpt` | `public`, `graphql_public` | `private`        | `public`, `extensions` |
| Gasway Test          | `xnrueexpwzvxotgwmamj` | `public`, `graphql_public` | `private`        | `public`, `extensions` |

Fuente directa: **Integrations → Data API → Settings → Select schemas** en
[app](https://supabase.com/dashboard/project/gleltbrvpfvfgggcatpt/integrations/data_api/settings)
y [Test](https://supabase.com/dashboard/project/xnrueexpwzvxotgwmamj/integrations/data_api/settings).
Ambos selectores muestran dos de tres esquemas expuestos, con marcas en
`public` y `graphql_public`; `private` no tiene marca. El elemento activo del
selector no equivale a la selección guardada. Extra search path tampoco es la
lista de esquemas expuestos.

Sonda runtime independiente con `@supabase/supabase-js`, publishable y
`.schema('private').from('profiles').select('id').limit(0)`:
**HTTP 406 / `PGRST106` / `Invalid schema: private` en ambos**. No devuelve
filas ni utiliza sesiones de usuarios. La petición inicial al endpoint raíz sin
el cliente devolvió 401; no se usó como evidencia de exposición de esquemas.

Ambos mantienen **Automatically expose new tables activado** y máximo de
1000 filas. Sigue vigente el hallazgo de privilegios futuros de la auditoría
inicial: revisar grants/revokes por migración. No se pulsó Harden Data API ni
se cambió el esquema de los wrappers. Este inventario no repite ni reemplaza
la auditoría de RLS, grants y funciones, pendiente de actualización en condición 6.

## PAT de CI y protección de GitHub

En [Access Tokens](https://supabase.com/dashboard/account/tokens), el token
**`gasway-github-tests`** muestra:

| Metadato    | Resultado observado                                                   |
| ----------- | --------------------------------------------------------------------- |
| Recursos    | Solo **Gasway Test**; un proyecto, sin alcance a Gasway Project       |
| Capacidades | **Database: Read-write**, **Project Settings: Read**                  |
| Caducidad   | **2026-11-21**, fecha mostrada por el panel; no se obtuvo hora exacta |
| Último uso  | El panel indica «a day ago»; dato relativo, no nueva ejecución de CI  |
| Tipo        | Token con alcance; no lleva la etiqueta Legacy                        |

Los runners llaman a `POST /v1/projects/REF/database/query` con
`read_only:false`: Database Read-write permite las escrituras de fixtures y su
limpieza/rollback. Project Settings Read es acceso adicional que los runners
actuales no necesitan. No hay permisos de Auth, claves, facturación ni
administración de organizaciones en las capacidades observadas. El panel lo
clasifica High risk por su capacidad de escribir en la base de Test; el alcance
limitado no convierte esa capacidad en solo lectura.

La sesión CLI local tiene **otro token Legacy sin caducidad**. No se debe
confundir con el PAT de CI ni copiarlo al secret de Actions. Su sustitución no
se ejecutó durante esta auditoría.

Metadatos consultados en GitHub para `nachodev-ui/GW_DST`:

- Environment **gasway-test**: política efectiva de ramas, solo `main`.
- Revisor requerido: **nachodev-ui**; `prevent_self_review:false` permite
  autoaprobación. No hay segundo revisor independiente configurado.
- Un secret del environment: **SUPABASE_TEST_ACCESS_TOKEN**, creado y actualizado
  el **2026-10-22T05:15:09Z**. Esa fecha no certifica la caducidad del PAT.
- Un colaborador administrador devuelto por la API: **nachodev-ui**.
- Ambos workflows SQL son `workflow_dispatch`, exigen main y la ref exacta de
  Test. El secret solo se inyecta en los pasos cloud, después de `npm ci`.

**Correspondencia confirmada por el operador el 2026-10-23:**
`gasway-github-tests` es el PAT guardado en `SUPABASE_TEST_ACCESS_TOKEN`.
La confirmación final reemplaza su respuesta anterior de que no lo recordaba.
El alcance y la caducidad proceden de la lectura directa de Supabase;
la correspondencia con el secret procede de la declaración del propietario.
GitHub no permite recuperar el valor de un secret. No se extrajo mediante
logs, artifacts ni workflows nuevos, ni se compararon los valores en claro.

**No se requiere reemplazo ahora.** No se ha cambiado el secret ni se ha
generado/revocado ningún token. Se conserva la [guía de rotación](ci-token-rotation.md)
como referencia para una renovación futura, no como tarea pendiente de cierre.

Nacho es responsable de renovar el PAT **antes del 2026-11-21**, manteniendo
el alcance a Test y solo los permisos necesarios, y de comprobar su uso al
realizar esa renovación. No se creó un recordatorio. No se ejecutaron nuevas
suites de Actions para esta confirmación; las regresiones actualizadas de
DT-07 siguen en la condición 6.

## Google: destino vigente Gasway Maps (2026-10-24)

Por indicación posterior del operador, se inspeccionó y reutilizó **MapAPP**,
ID `mapapp-389403`, número `745895471128`. Reportó facturación habilitada y
Maps SDK Android ya activo. Se cambió solo el nombre visible a **Gasway Maps**;
no se vinculó ni reabrió facturación, ni se añadieron medios de pago.

Se creó una clave Android exclusiva en ese proyecto con la misma restricción de
paquete/SHA-1/SDK descrita abajo y se cambió el `.env` local. Las salidas de creación
y lectura se capturaron sin imprimir el valor. La clave web antigua y APIs
preexistentes se conservaron; no se auditaron sus recursos/consumos ni se presume
que cualquier servicio del proyecto sea gratuito. La clave nueva solo permite el
SDK Android del alcance D1. Ver [evidencia vigente y binario](maps-setup.md).

Las referencias siguientes a `gw-dst` corresponden a la preparación previa y a
la revisión del 2026-10-23. No son el destino del nuevo APK de Maps.

## Google: primera integración en gw-dst para demo (2026-10-24)

D1 verificó con gcloud el proyecto `gw-dst` / `494420889765` y habilitó solo
Maps SDK for Android. La clave `gasway-android-demo` tiene restricción de
`cl.gasway.mobile` y SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`,
correspondiente al keystore local de la demo, además de restricción a
`maps-android-backend.googleapis.com`. Se guardó en `.env` ignorado por Git y se
comprobó su incorporación al manifiesto generado sin imprimir el valor.
La creación por CLI sí incluyó el valor en su salida pese al formato solicitado;
la clave está restringida y las lecturas posteriores capturaron su valor localmente.

No se vincularon cuentas de facturación ni se crearon claves para otras plataformas.
La primera inspección encontró facturación deshabilitada y una cuenta cerrada;
el operador indicó que la revisaría. La configuración no certifica el mapa en
dispositivo ni habilita el piloto; no sustituye la futura firma de distribución.
Detalles en [D1](maps-setup.md). El apartado siguiente conserva el diagnóstico
anterior a esta integración; la ausencia de claves/MapView ya no es el estado actual.

## Google: diagnóstico previo del 2026-10-23; Maps fuera del piloto

El operador identificó el **2026-10-23** el proyecto actual de Google Cloud:
**ID `gw-dst`, número `494420889765`**. Este es el único destino de Google
que corresponde revisar para la app actual. Su IAM y sus credenciales todavía
no fueron auditados; no se trasladan resultados de otros proyectos a este.

En el checkout, `app.config.ts` declara package/bundle **cl.gasway.mobile** y
variables distintas para Android/iOS. Las variables `GOOGLE_MAPS_ANDROID_API_KEY`
y `GOOGLE_MAPS_IOS_API_KEY` no están definidas en el entorno del proceso ni en
`apps/mobile/.env`; no se imprimieron valores. No se encontraron usos de MapView
ni del proveedor Google en `apps/mobile/src`. Esto no prueba qué contienen
otros entornos de build ni APK previamente instalados.

**Alcance confirmado por el operador (2026-10-23): Maps sigue fuera del piloto**,
aunque se prevé integrarlo próximamente. La restricción de claves Maps queda
fuera del alcance actual y deberá verificarse **antes de su integración**, con
el proyecto y build reales. No se habilitaron APIs, facturación, tracking ni
un servicio pago para resolver esta revisión. Cuando se integre, la evidencia
requerida será:

| Clave                               | Restricción de aplicación                                                | Restricción de API   |
| ----------------------------------- | ------------------------------------------------------------------------ | -------------------- |
| Android independiente               | `cl.gasway.mobile` + SHA-1 del certificado que firma el build del piloto | Maps SDK for Android |
| iOS independiente, si se distribuye | Bundle `cl.gasway.mobile`                                                | Maps SDK for iOS     |

No sustituir el certificado real por uno debug ni reutilizar la clave Firebase.
La exclusión se apoya en la confirmación del operador y en la ausencia de uso
en el código revisado; no es una inspección de los APK ya instalados. Integrar
Maps obliga a revisar este control antes de distribuir el nuevo build.

## Administradores y MFA

| Plataforma                    | Inventario observado                                    | MFA                                                                                        | Límite / acción pendiente                                                                                                                      |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase, organización Gasway | Un miembro, cuenta del operador, rol Owner              | **Activado, confirmado por el operador el 2026-10-23**                                     | La lectura inicial mostraba ausencia de factores; tras su activación, el navegador requiere iniciar sesión. Sin verificación directa posterior |
| GitHub, GW_DST                | `nachodev-ui`, administrador                            | **Activado, confirmado por el operador el 2026-10-23**, gestionado con Passwords de iPhone | Declaración del operador; la API no devolvía el dato y el navegador no tenía sesión                                                            |
| Google, cuenta del operador   | Ignacio/Nacho; proyecto actual `gw-dst` indicado por él | **Activado**: Verificación en 2 pasos desde 2021-12-14                                     | MFA de la cuenta verificado; IAM y credenciales de `gw-dst` sin auditar                                                                        |

[Supabase Security](https://supabase.com/dashboard/account/security),
[equipo Gasway](https://supabase.com/dashboard/org/qzzneybdutqgdlqwjgqk/team),
[GitHub](https://github.com/settings/security),
[Google](https://myaccount.google.com/security).

El operador confirma una operación unipersonal. El inventario de permisos
Google deberá limitarse al [IAM de gw-dst](https://console.cloud.google.com/iam-admin/iam?project=gw-dst)
cuando corresponda revisar esa integración. Se excluyen por completo los
proyectos antiguos por instrucción expresa del operador.

El MFA de esta sección protege cuentas de administración de proveedores; no es
el MFA de usuarios Auth de la app. En Free, el MFA individual de Supabase está
disponible; su obligatoriedad organizacional requiere un plan superior y no se
activó. Los PAT no reciben un segundo factor en cada llamada: necesitan alcance
y caducidad propios. No almacenar QR, secretos TOTP ni códigos de recuperación
en este repositorio o en el chat.

## Respuesta a incidentes: operación unipersonal confirmada

El operador confirmó el 2026-10-23 que trabaja solo y es quien tiene acceso a
las cuentas de la operación actual. Se registra a **Nacho** como responsable
actual; la automatización futura no constituye detección ni respuesta ya activa.

| Función                                            | Responsable actual  | Alcance                                                                          |
| -------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| Titular y coordinación                             | Nacho               | Operación manual mientras se implementa automatización                           |
| Respaldo por pérdida de acceso o ausencia          | Sin suplente humano | Operación unipersonal declarada; continuidad depende del titular                 |
| Rotación PAT/secret CI                             | Nacho               | Token actual identificado; renovación antes de caducidad                         |
| Contención de los proveedores usados por el piloto | Nacho               | Revisión y ejecución manual; no hay guardia ni alertas automatizadas acreditadas |

Procedimiento inicial propuesto: registrar hora, entorno y síntoma sin copiar
datos personales; contener el acceso afectado; revocar/rotar la credencial
comprometida en su proveedor y actualizar sus consumidores; revisar auditoría
del período; verificar la recuperación y registrar decisión de reapertura.
Una filtración real requiere revocación, aunque luego se borre del historial.
Las copias y la restauración se resuelven en condiciones 4 y 5.

## Cierre de la condición 3 — 2026-10-23

| Control                            | Evidencia de cierre                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Esquemas Data API                  | Paneles de ambos proyectos y rechazo runtime de `private`                               |
| PAT: alcance y caducidad           | Lectura directa: solo Test, Database RW/Project Settings R, vence 2026-11-21            |
| PAT: correspondencia con secret CI | Confirmación expresa del operador: `gasway-github-tests` → `SUPABASE_TEST_ACCESS_TOKEN` |
| MFA                                | Google del operador verificado directamente; Supabase/GitHub confirmados por él         |
| Incidentes                         | Nacho, operación unipersonal confirmada; automatización futura                          |
| Google Maps                        | Fuera del piloto por confirmación del operador; proyecto actual `gw-dst`                |

**Condición 3 aprobada y cerrada en este alcance.** El IAM y las restricciones
Maps de **gw-dst** se revisarán antes de integrar mapas; no se certifica su
estado actual. DT-07 completo sigue abierto por condiciones 4–6 y compromisos
de abuso previos a apertura. No se habilita el piloto ni se atribuyen nuevas
pruebas cloud/Actions a esta actualización documental.

## Fuentes consultadas

- [Supabase: seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api).
- [PAT con alcance, disponible desde 2026-10-06](https://supabase.com/changelog/scoped-personal-access-tokens-ga)
  y [mapa de capacidades](https://supabase.com/docs/guides/platform/personal-access-tokens).
- [MFA individual de Supabase](https://supabase.com/docs/guides/platform/multi-factor-authentication)
  y [obligatoriedad organizacional y PAT](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement).
- [Google Maps: restricciones por aplicación y API](https://developers.google.com/maps/api-security-best-practices).
