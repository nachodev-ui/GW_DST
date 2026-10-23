# Confirmación nativa de correo (DT-07, condición 1)

El piloto usa la app instalada de Gasway, sin dominio web. El destino acordado es
`gasway://auth/confirm`, que Expo Router resuelve a `/auth/confirm` con el scheme
`gasway` ya declarado en app.config.ts. No requiere comprar dominio ni hosting.

## Configuración acotada

`supabase/auth-pilot/supabase/config.toml` declara exclusivamente Site URL y
additional_redirect_urls con ese valor exacto, sin wildcards, localhost ni previews.
No usar el TOML local completo para configurar el piloto. CLI 2.121.0 aplica solo
propiedades declaradas; las demás deben permanecer iguales, incluida confirmación
obligatoria de correo. Revisar el diff antes de cada cambio:

```powershell
npx --no-install supabase config diff --workdir supabase/auth-pilot --project-ref REF --output-format json
npx --no-install supabase config push --workdir supabase/auth-pilot --project-ref REF
```

Aplicar primero a Test (`xnrueexpwzvxotgwmamj`), probar y después al proyecto de la
app (`gleltbrvpfvfgggcatpt`). Comparar configuración guardada **y enlaces reales**:
un config diff sin diferencias declaradas no prueba que Auth use el nuevo destino.

Supabase admite el origen de Site URL además de la allowlist. Una ruta diferente
en `gasway://auth` puede ser aceptada por el servidor aunque las entradas no
contengan comodines. El manejador móvil valida el destino exacto, no sigue `next`
ni otras redirecciones y no establece sesiones a partir de access_token/refresh_token
incluidos en enlaces. Un scheme nativo no tiene la exclusividad verificable de un
Universal/App Link HTTPS; PKCE protege el intercambio del código interceptado.

## Flujo móvil

El registro nativo envía emailRedirectTo explícito. El cliente usa PKCE y guarda el
verificador en el adaptador SecureStore existente. El correo enlaza al endpoint
HTTPS de verificación de Supabase; tras confirmar, redirige a la ruta nativa con
un código de un solo uso. La ruta intercambia ese código con el verificador del
registro, y AuthProvider conserva la autoridad de sesión/permisos.

Expo Crypto 57.0.4 proporciona CSPRNG y SHA-256 a Auth JS cuando Hermes no dispone
de esas operaciones WebCrypto. Así se evita el fallback Math.random/plain del SDK.
No se cambia un WebCrypto existente completo. Se requiere recompilar el development
build por el módulo nativo nuevo; no se compiló ni abrió la app durante esta tarea.

La pantalla presenta espera, error fijo sin detalles sensibles y continuación.
Los errores vencido/reutilizado no simulan éxito. Si falta el verificador (otro
dispositivo, reinstalación o enlace ya canjeado), indica iniciar sesión con correo
y contraseña: la confirmación del correo puede haberse completado en el servidor.
No se implementa recuperación de contraseña (NF-01) ni reenvío automático en esta tarea.
En desarrollo web se conserva el origen del navegador; el piloto no lo autoriza.

## Verificación reproducible

```powershell
node scripts/test-confirmation.cjs
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:redirects
```

El test offline comprueba la frontera URL y el intercambio PKCE con mocks, sin
renderizar. El test cloud genera enlaces sin correo, comprueba el destino exacto,
rechazo/fallback de dominios y schemes ajenos, localhost, excepción del origen de
Site URL, confirmación real y enlace reutilizado. Crea y borra cuentas sintéticas
solo en Test; revoca las sesiones obtenidas al verificar.

La prueba con correo real requiere invocación explícita y un buzón nuevo en Test:

```powershell
$env:GASWAY_CONFIRMATION_TEST_EMAIL = 'buzon-controlado@example.com'
node scripts/security/check-confirmation-email.cjs
```

No modifica cuentas existentes. Envía un registro real, exige rechazo del ingreso
sin confirmar y conserva contraseña/verificador solo en memoria. Anuncia un puerto
local: el operador de pruebas entrega el enlace recibido a `POST /verify` como JSON
con propiedad url, sin imprimirlo ni guardarlo. El puente no acepta Origin de
navegador ni contenido distinto de application/json; escucha solo en 127.0.0.1.
Comprueba redirección nativa, PKCE, correo confirmado, rechazo de reutilización e
ingreso posterior. Cierra la sesión y elimina la cuenta de prueba. `POST /cleanup`
o SIGINT limpian sin verificar; a los 15 minutos intenta limpiar automáticamente.
Una terminación forzada puede impedir la limpieza; revisar solo la cuenta de prueba
de esta ejecución. No ejecutar con transcripción, logs de red o argumentos con tokens.

## Comprobación en teléfono

Con los cambios JS cargados en el development build (o en un nuevo build de piloto),
registrar una cuenta controlada y abrir el correo en ese mismo teléfono. Verificar
app cerrada y abierta, entrada a la ruta correcta, confirmación y acceso. Abrir un
enlace utilizado debe mostrar su estado, sin volver a crear sesión. Los tokens,
códigos y enlaces completos no se incluyen en capturas, logs ni documentación.
La validación HTTP/Auth no acredita el traspaso correo → sistema operativo → app.

## Evidencia del 2026-10-22

- Test: Site URL y allowlist exacta guardados mediante el overlay. El runtime
  conservó localhost hasta el reinicio explícitamente autorizado; después quedó
  Healthy y pasó las ocho variantes de redirección, confirmación y reutilización.
- Dos correos recibidos en el buzón autorizado. El primero demostró el destino
  antiguo y su cuenta fue eliminada. El segundo completó la verificación del
  enlace real, PKCE, confirmación en servidor, rechazo de reutilización y login
  con contraseña. Se cerró la sesión y se eliminó la cuenta de Test.
- App: Site URL y allowlist guardados desde Dashboard con el mismo valor exacto.
  Se ejecutó el reinicio autorizado por separado y el proyecto volvió a Healthy.
  La comprobación posterior de solo lectura sigue recibiendo
  `http://localhost:3000/`, sin sesión, ante un token inválido y un destino externo.
  Dashboard y CLI confirman `gasway://auth/confirm`; `config push` indica que no
  hay diferencias declaradas ni cambios para aplicar. La misma prueba pasa en Test.
  La causa de esta discrepancia entre configuración guardada y runtime no está
  determinada; requiere revisión de Supabase antes de validar el entorno de la app.
- Regresiones locales de Auth y confirmación correctas; typecheck correcto.
  No se ejecutaron renders, capturas, emuladores ni compilación nativa.
- Pendiente de cierre: runtime del proyecto de la app y prueba en teléfono con
  el development build recompilado (arranque cerrado y enlace con app abierta).

### Diagnóstico para soporte de Supabase

Proyecto afectado: `gleltbrvpfvfgggcatpt`, región `us-east-2`, Auth 2.197.0.
Site URL y único Redirect URL: `gasway://auth/confirm`. Tras guardar y reiniciar
el proyecto, el Dashboard indica Healthy, pero `/auth/v1/verify` con token aleatorio
inválido, `type=signup` y `redirect_to=https://example.invalid/confirm` responde
303 hacia `http://localhost:3000/` con error, sin emitir sesión. Test
`xnrueexpwzvxotgwmamj` responde al destino nativo con la misma comprobación.
No se modificaron cuentas de la app para diagnosticarlo. Este texto no contiene
credenciales ni enlaces válidos y está preparado para una consulta a soporte;
no se envió ninguna consulta automáticamente.

Repetir la comprobación cuando se corrija la configuración efectiva:

```powershell
$env:GASWAY_AUTH_PROJECT_REF = 'gleltbrvpfvfgggcatpt'
node scripts/security/check-auth-redirect-config.cjs
```

## Fuentes consultadas

- [Supabase: redirects y esquemas móviles](https://supabase.com/docs/guides/auth/redirect-urls).
- [Supabase: PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
- [Supabase Auth: validación de destino](https://github.com/supabase/auth/blob/master/internal/utilities/request.go).
- [Expo Linking SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/linking/).

## Sondas de solo lectura sobre el runtime de Auth (app vs Test)

Fecha: **2026-10-22**. Esta tanda posterior complementa la evidencia histórica
anterior sin modificarla. Se ejecutaron únicamente GET: doce verificaciones con
tokens aleatorios inválidos y dos lecturas de health. No hubo cambios de
configuración, reinicios, operaciones sobre cuentas, correos, envíos a soporte,
compilación ni apertura de la app.

### Destinos y procedencia de valores

- `scripts/security/check-auth-redirect-config.cjs` obtiene la ref de
  `GASWAY_AUTH_PROJECT_REF`, la restringe a las dos refs conocidas y construye
  `https://${ref}.supabase.co/auth/v1/verify`. Para la ref de la app el destino es
  exactamente `https://gleltbrvpfvfgggcatpt.supabase.co/auth/v1/verify`; para Test,
  `https://xnrueexpwzvxotgwmamj.supabase.co/auth/v1/verify`. No toma una URL de
  `.env`, de Expo ni de un dominio personalizado. Ese script no se modificó ni se
  ejecutó en esta tanda: su única variante no incluye cache-busting.
- La sonda de esta tanda se ejecutó desde stdin de Node, sin guardar un archivo.
  Usa dos pares ref/base literales, independientes de variables de entorno:
  app `gleltbrvpfvfgggcatpt` / `https://gleltbrvpfvfgggcatpt.supabase.co` y
  Test `xnrueexpwzvxotgwmamj` / `https://xnrueexpwzvxotgwmamj.supabase.co`.
  Construye `/auth/v1/verify` y `/auth/v1/health` con URL y comprueba que el origen
  de cada verificación coincida con la base declarada.
- Tanto el script existente como la sonda usan `cliJson` de
  `scripts/security/supabase-cli.cjs`: CLI local autenticada, lectura
  `projects api-keys --project-ref REF --output json` y selección de la entrada
  `type=publishable`. La clave se captura exclusivamente en memoria y se envía
  como `apikey`; no se imprime ni se guarda. La CLI obtiene sus credenciales de
  su autenticación existente; no se inspeccionan ni se registran sus valores.
- Método GET y `redirect: 'manual'` en todas las peticiones. Cada verificación
  lleva `type=signup`, un token distinto de 32 bytes aleatorios y `cb` de 16 bytes
  aleatorios. `randomBytes` genera ambos en memoria y un conjunto impide repetir
  valores. Health lleva su propio `cb` distinto. No se registra ninguno de esos
  valores ni la URL completa de petición o Location.
- Variantes literales: **a**, `redirect_to=gasway://auth/confirm`; **b**, sin
  `redirect_to`; **c**, `redirect_to=https://example.invalid/confirm`. Tres rondas
  a/b/c para app y una para Test, secuenciales, con el mismo método.

### Versiones de Auth

Se leyó exclusivamente `version` del JSON de `GET /auth/v1/health` de cada
proyecto, con el mismo método para ambos. La versión 2.197.0 citada previamente
se había observado en Settings → General del Dashboard. Las fechas son del reloj
UTC del proceso; se indican inicio y fin de cada petición.

| Proyecto | Inicio UTC (2026-10-22) | Fin UTC (2026-10-22) | HTTP | Auth | Cabeceras permitidas presentes |
| --- | --- | --- | --- | --- | --- |
| App | 17:18:25.696Z | 17:18:26.219Z | 200 | v2.197.0 | `cf-cache-status: DYNAMIC`; `sb-request-id: 01a1649f-0ebe-7d3c-a5be-8ab81cbadbbf` |
| Test | 17:18:31.140Z | 17:18:31.377Z | 200 | v2.197.0 | `cf-cache-status: DYNAMIC`; `sb-request-id: 01a1649f-2316-7295-a865-83f83edb39b9` |

### Matriz de verificaciones

En todas las filas, **Location (origen + ruta)** es `gasway://auth/confirm`, sin
userinfo, query ni fragmento incluidos en ese valor. **Query de Location:** ningún
parámetro. **Fragmento de Location:** solo se registran los nombres `error`,
`error_code`, `error_description`, `sb`; se omiten todos los valores.
**Auth:** `v2.197.0` en ambos proyectos, según health anterior.

| Proyecto | Variante | Intento | Inicio UTC (2026-10-22) | Fin UTC (2026-10-22) | HTTP | Location (origen + ruta) | Query: nombres | `cf-cache-status` | `sb-request-id` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| App | a | 1 | 17:18:26.220Z | 17:18:26.706Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-1029-739b-b5fe-76223746dd33 |
| App | b | 1 | 17:18:26.708Z | 17:18:26.933Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-11bc-70b7-8c70-3ec7bf9a5807 |
| App | c | 1 | 17:18:26.933Z | 17:18:27.162Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-12a4-7064-9228-b425c51f7d4d |
| App | a | 2 | 17:18:27.162Z | 17:18:27.375Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-1373-7b98-95f9-028e2ce68b9f |
| App | b | 2 | 17:18:27.376Z | 17:18:27.634Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-147b-716f-8436-41717d4b864a |
| App | c | 2 | 17:18:27.635Z | 17:18:27.850Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-1558-76f7-83af-f8f2316204a4 |
| App | a | 3 | 17:18:27.850Z | 17:18:28.061Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-1628-7525-a319-df8dd446fc69 |
| App | b | 3 | 17:18:28.062Z | 17:18:28.266Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-16f4-76cc-b88d-db07a9055eff |
| App | c | 3 | 17:18:28.266Z | 17:18:28.505Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-17e2-74bc-9a6e-01a67a5b89ae |
| Test | a | 1 | 17:18:31.377Z | 17:18:31.587Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-23e6-7d2b-9370-f49fba77638a |
| Test | b | 1 | 17:18:31.588Z | 17:18:31.818Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-24cd-7791-9474-38cbb6717917 |
| Test | c | 1 | 17:18:31.818Z | 17:18:32.181Z | 303 | gasway://auth/confirm | ninguno | DYNAMIC | 01a1649f-2603-7057-bdbd-43265d5642e9 |

En las doce verificaciones y las dos lecturas health estuvieron ausentes `age`,
`x-request-id` y todas las cabeceras `x-sb-gateway-*`. Las únicas cabeceras
registradas fueron `cf-cache-status` y `sb-request-id`, con sus valores en tablas.
No se registró ninguna otra cabecera ni el cuerpo de las verificaciones.

### Conclusiones y límites

- **Respaldado:** el runtime responde actualmente con el destino nativo para
  a/b/c en ambos proyectos. La variante b muestra que el fallback efectivo es
  nativo; c muestra el rechazo del destino externo y el fallback nativo; a muestra
  que el destino nativo es aceptado. Esta última no demuestra por sí sola el
  contenido íntegro de la allowlist, porque el origen de Site URL también se admite.
- **Descartado para esta muestra:** app con Site URL y allowlist antiguos
  produciendo localhost en a/b/c; fallo únicamente de Site URL produciendo
  localhost en b/c; diferencia de versión Auth entre los proyectos observados.
- **Sin evidencia en esta muestra:** desincronización entre respuestas de distintas
  instancias o caché. Los nueve intentos de app coinciden y todos muestran DYNAMIC,
  sin age. No hay identificador de instancia/gateway para probar distribución
  entre instancias; una muestra breve no descarta incidencias intermitentes ni
  demuestra que no exista caché en otra capa.
- **Causa histórica no determinada:** las respuestas localhost documentadas antes
  y las respuestas nativas actuales difieren, sin ninguna mutación durante esta
  tanda. Propagación diferida o un problema transitorio siguen siendo hipótesis,
  no causas demostradas. No se puede atribuir el cambio al reinicio anterior ni
  al cache-busting sin una comparación adicional que los aísle.
- La discrepancia de destino **no se reproduce ahora**. Estas sondas no validan
  registro, entrega de correo, intercambio PKCE ni apertura nativa en teléfono.
  La condición 1 sigue abierta para su validación completa; no se propone cambiar
  configuración ni ampliar la allowlist.

### Complemento al diagnóstico para soporte (no enviado)

Al diagnóstico histórico anterior se añaden estas observaciones del 2026-10-22:
app ya devuelve el destino nativo en las nueve peticiones con cache-busting;
Test coincide y ambos health reportan `v2.197.0`. Como correlación representativa
de app, conservar los `sb-request-id` de la primera ronda: a,
`01a1649f-1029-739b-b5fe-76223746dd33`; b,
`01a1649f-11bc-70b7-8c70-3ec7bf9a5807`; c,
`01a1649f-12a4-7064-9228-b425c51f7d4d`. Los horarios y los demás IDs están en las
tablas. Estos IDs corresponden a respuestas nativas actuales, no a fallos
localhost previos. No se envió información a soporte.

## Repeticiones de sondas (intermitencia)

Fecha: **2026-10-22**. El script oficial se ejecutó sin modificarlo, desde la raíz:

```powershell
$env:GASWAY_AUTH_PROJECT_REF = 'gleltbrvpfvfgggcatpt'
node scripts/security/check-auth-redirect-config.cjs
```

Terminó con código **0** y esta salida completa, sin claves ni tokens:

```text
{"project":"gleltbrvpfvfgggcatpt","destination":"gasway://auth/confirm","hasSession":false}
PASS: runtime fallback is native; external redirect rejected; no account modified
```

Comprueba HTTP 303, fallback nativo ante destino externo con token inválido y
que el fragmento no contenga access_token. No crea, confirma ni modifica cuentas.

### Repetición manual

Desde la raíz, con Node y la CLI Supabase local ya instalada y autenticada:

```powershell
node scripts/security/probe-auth-redirects.cjs
```

El script usa bases HTTPS literales para App y Test, claves publishable obtenidas
mediante la CLI exclusivamente en memoria, GET con redirect manual, token
inválido único y cache-busting aleatorio distinto en cada llamada. Hace tres
intentos por variante en App y uno en Test, además de health para ambos. Imprime
las tablas Markdown de esta sección, sin guardar archivos ni programar nuevas
comprobaciones. No lee URLs de .env ni usa dominios personalizados. Los errores
se resumen sin imprimir objetos Error, claves, tokens ni URLs completas.

Código de salida 0 exige doce verificaciones con HTTP 303 y destino exacto
`gasway://auth/confirm`, sin userinfo ni parámetros de sesión/código, además de
las lecturas health correctas. Cualquier destino distinto, fallo HTTP/de red/CLI
o versión no disponible devuelve código 1. Volver a ejecutar manualmente más
tarde o mañana y añadir una tabla nueva con sus UTC; no sustituir las anteriores.
No se dejó la sonda programada ni corriendo.

a = redirect_to nativo; b = sin redirect_to; c = destino externo no autorizado.
Tanda iniciada **2026-10-22T17:26:29.349Z**, finalizada
**2026-10-22T17:26:38.760Z**. Resultado **PASS, 12/12, código 0**.

| Proyecto | Inicio UTC | HTTP | Auth | cf-cache-status | sb-request-id |
| --- | --- | --- | --- | --- | --- |
| App | 2026-10-22T17:26:32.110Z | 200 | v2.197.0 | DYNAMIC | 01a164a6-7afd-77a6-93b9-476f1623d005 |
| Test | 2026-10-22T17:26:37.469Z | 200 | v2.197.0 | DYNAMIC | 01a164a6-8fc5-7bfc-9d46-3b3a9f471db7 |

| Proyecto | Variante | Intento | Inicio UTC | HTTP | Location: origen + ruta | Query: nombres | Fragmento: nombres | cf-cache-status | sb-request-id | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| App | a | 1 | 2026-10-22T17:26:32.662Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-7c04-7f14-9a62-f70cbdbd8e7a | PASS |
| App | b | 1 | 2026-10-22T17:26:32.923Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-7d07-7301-964b-5254700a03ff | PASS |
| App | c | 1 | 2026-10-22T17:26:33.137Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-7ddf-7337-b0e0-d24512778667 | PASS |
| App | a | 2 | 2026-10-22T17:26:33.355Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-7eb3-7817-9649-c79f5f332af0 | PASS |
| App | b | 2 | 2026-10-22T17:26:33.569Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-7f8f-7116-9118-b12890f7d951 | PASS |
| App | c | 2 | 2026-10-22T17:26:33.784Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-8063-70a9-afd4-9751ff914b84 | PASS |
| App | a | 3 | 2026-10-22T17:26:34.001Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-8132-73fc-b6d6-ecdf3855ce89 | PASS |
| App | b | 3 | 2026-10-22T17:26:34.207Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-81fa-7879-b09d-753c81d27bbe | PASS |
| App | c | 3 | 2026-10-22T17:26:34.405Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-82c4-7bc1-82f9-93d5452f7c7d | PASS |
| Test | a | 1 | 2026-10-22T17:26:38.001Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-90ea-7a61-b27d-e4fd20b15690 | PASS |
| Test | b | 1 | 2026-10-22T17:26:38.292Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-9206-7a81-9ea7-5248e20e551e | PASS |
| Test | c | 1 | 2026-10-22T17:26:38.535Z | 303 | gasway://auth/confirm | ninguno | error, error_code, error_description, sb | DYNAMIC | 01a164a6-92f9-794d-8e53-c5faed3878a0 | PASS |

Las dos tandas observadas coinciden en destino nativo, versión Auth y respuestas
DYNAMIC. El script oficial también pasa sin cache-busting. La discrepancia no se
reproduce en estas observaciones; la causa histórica sigue indeterminada. Estas
muestras no demuestran estabilidad indefinida, propagación diferida ni un reinicio
interno de Supabase. No se propone cambiar configuración ni ampliar la allowlist.
La condición 1 permanece abierta hasta documentar la validación en teléfono.

## Lista de prueba en teléfono

Fecha de preparación: **2026-10-22**. Solo inspección del repositorio: no se
compiló, no se abrió la app ni un emulador, no se crearon cuentas ni se enviaron
correos. Los pasos de registro/correo siguientes son para ejecución manual futura.

### Build que necesita este checkout

- `apps/mobile/package.json`: expo SDK 57, `expo-dev-client ~57.0.20`; instalación
  y lockfile resuelven **57.0.20**. También figura como plugin en app.config.ts.
  `start` ejecuta `expo start --dev-client`; android/ios ejecutan `expo run:*`.
  El proyecto está preparado para un development build propio de Gasway.
- `apps/mobile/app.config.ts`: nombre Gasway, scheme **gasway**, package Android
  y bundleIdentifier iOS **cl.gasway.mobile**. La ruta de archivos
  `apps/mobile/app/auth/confirm.tsx` define **/auth/confirm** y exporta
  ConfirmationScreen de la feature Auth. El destino que acepta el manejador es
  exactamente `gasway://auth/confirm`; la apertura real por el sistema operativo
  sigue pendiente de los casos de teléfono.
- `expo-crypto ~57.0.4` está en dependencias, instalado y bloqueado en **57.0.4**.
  No figura en plugins y no necesita plugin: aporta un módulo nativo enlazado
  automáticamente. Su paquete no tiene app.plugin.js. Recompilar el development
  build incorpora el módulo; recargar JavaScript no lo añade a un binario viejo.
- No existen eas.json en raíz ni apps/mobile, ni extra.eas.projectId declarado en
  app.config.ts. Tampoco hay carpetas nativas android/ios actualmente. Los scripts
  existentes permiten compilación local y generan los proyectos nativos al faltar.
  No se comprobó la sesión de EAS ni el contenido del teléfono.

### Comandos para que ejecute el desarrollador (no ejecutados aquí)

En este equipo Windows, para un **Android físico**, desde la raíz del repositorio:

```powershell
npm run android --workspace @gasway/mobile -- --device
```

Seleccionar el teléfono físico si se ofrece más de un dispositivo. Requiere Node
24/npm, dependencias instaladas, Android Studio con SDK/platform-tools, JDK y
variables/rutas del SDK configuradas. Conectar por cable USB de datos, habilitar
Opciones de desarrollador/Depuración USB y aceptar la autorización RSA del equipo;
Windows puede necesitar el controlador USB del fabricante. La compilación debug
local no requiere cuenta Expo ni cuenta Google Play, y usa firma debug local.
No se verificó aquí que el SDK/JDK o un teléfono estén disponibles.

Para un **iPhone físico**, el equivalente local se ejecuta desde un **Mac** con
este checkout, Xcode y sus herramientas, firma configurada para un Apple ID/equipo,
y el teléfono emparejado, de confianza y con Developer Mode habilitado:

```sh
npm run ios --workspace @gasway/mobile -- --device
```

Conectar por cable para la configuración inicial; Xcode debe poder generar el
perfil y firmar cl.gasway.mobile. Una cuenta personal gratuita tiene limitaciones;
ciertas capacidades, como push, pueden requerir membresía Apple Developer.
No se puede compilar iOS localmente en Windows.

Los comandos run compilan, instalan y normalmente arrancan Metro. Para sesiones
posteriores, `npm start` desde la raíz sirve el JavaScript al development build.
Mantener ese terminal en primer plano durante la prueba, con conectividad entre
el teléfono y Metro, y terminarlo con Ctrl+C al acabar. No ejecutar otro Metro si
el comando run ya lo dejó activo. No se inició ninguno en esta revisión.

**Alternativa EAS desde Windows:** todavía requiere preparación. Necesita cuenta
Expo, proyecto EAS enlazado y eas.json en apps/mobile con un perfil development
que incluya developmentClient=true y distribution=internal. Para iPhone físico
requiere cuenta Apple Developer de pago, registro del dispositivo y credenciales
ad hoc/provisioning; para Android se necesita un APK instalable y firma de
compilación, sin cuenta de tienda. Una vez preparada esa configuración, desde
apps/mobile el comando sería `npx eas-cli build --platform android --profile development`
o `npx eas-cli build --platform ios --profile development`. No se creó ese perfil,
no se enlazó EAS y no se ejecutó ninguna compilación.

Referencias de preparación: documentación oficial de Expo para SDK 57 (Crypto),
Introduction to development builds y Create a debug build locally.

### Identificar la app instalada y registrar resultados

- [ ] En Ajustes del teléfono → Aplicaciones (Android) o Almacenamiento del iPhone,
  comprobar si existe **Gasway** o **Expo Go**; pueden coexistir. Abrir el icono de
  Gasway para esta prueba. Expo Go es la app genérica; un development build propio
  se instala con el nombre Gasway y puede mostrar su propio launcher de desarrollo.
  El aspecto del launcher por sí solo no identifica qué binario está instalado.
  Resultado/dispositivo/versión instalada: __________.
- [ ] Instalar el development build actualizado con expo-crypto y conectar su
  sesión a Metro. Confirmar que la configuración pública usada por la app apunta
  al proyecto de prueba que se pretende validar; esta inspección no leyó .env ni
  certifica el backend de un binario ya instalado. Anotar solo la ref, sin claves.
  Proyecto/ref, build o commit y fecha/hora: __________.
- [ ] **Privacidad:** no incluir tokens, códigos ni enlaces completos en capturas,
  logs ni documentación; desactivar cualquier registro que vuelque URLs de Auth.
  Anotar solo resultado, mensaje visible, plataforma, build y hora. Confirmado: ____.
- [ ] **Registro controlado:** registrar desde Gasway una cuenta de prueba nueva
  bajo control del operador. Recibir el correo en ese mismo teléfono. Antes de
  confirmarlo, comprobar rechazo del acceso por correo no confirmado.
  Resultado: __________.
- [ ] **App cerrada:** cerrar Gasway desde recientes sin desinstalar ni borrar
  datos, conservar el registro/verificador y Metro disponible. Abrir en ese mismo
  teléfono el correo y pulsar el enlace nuevo. Debe abrir Gasway en confirmación,
  completar la confirmación y permitir el acceso. Resultado/hora: __________.
- [ ] **App abierta:** con otro registro controlado y un enlace nuevo todavía sin
  consumir, dejar Gasway abierta/en segundo plano y abrir el correo en ese mismo
  teléfono. Debe llegar a confirmación y completar el acceso sin duplicar el
  intercambio. No usar para este caso el enlace consumido en la prueba anterior.
  Resultado/hora: __________.
- [ ] **Enlace ya usado:** cerrar sesión antes del caso para distinguir una sesión
  existente de una nueva. Volver a pulsar un enlace ya consumido. Debe mostrar
  estado vencido/inválido o indicación de iniciar sesión, según la respuesta;
  no debe crear una sesión ni mostrar éxito nuevo. Resultado/hora: __________.
- [ ] **Cierre:** documentar los tres resultados y cualquier fallo sin datos
  sensibles; no marcar la condición 1 como cerrada mientras falte un caso o
  evidencia del teléfono. Terminar Metro con Ctrl+C. Resultado: __________.

## Preparación local del JDK para la prueba en teléfono

Fecha: **2026-10-22**. Se instaló, por petición explícita del operador, Microsoft
OpenJDK 17 mediante winget (`Microsoft.OpenJDK.17`, paquete 17.0.20.101). Winget
verificó el hash del instalador. `java -version` y `javac -version` devolvieron
**17.0.20.1**; JAVA_HOME y el PATH del usuario quedaron configurados conservando
las entradas anteriores. Reiniciar Codex o abrir PowerShell desde Windows para
que la terminal reciba las variables nuevas.

JDK 17 coincide con la recomendación oficial de React Native 0.86 y con el
jvmToolchain(17) del plugin Gradle instalado en este proyecto Expo SDK 57. Se
instaló únicamente el JDK, sin Android Studio ni compilación. Se encontró una
carpeta Android SDK existente, pero esta operación no verificó sus componentes,
licencias ni conectividad con el teléfono. El JDK validado no certifica todavía
que el entorno completo de compilación Android esté listo.

Fuentes: [React Native 0.86: entorno de desarrollo](https://reactnative.dev/docs/0.86/set-up-your-environment),
[Microsoft: instalación de OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/install)
y [Android: herramientas del SDK sin IDE](https://developer.android.com/tools/sdkmanager).

## Corrección de SDK location not found para Android local

Fecha: **2026-10-22**. El intento manual del operador encontró el teléfono
SM_A226BR y llegó a Gradle, pero falló con `SDK location not found`. La inspección
confirmó Android SDK existente en la carpeta local del usuario y ausencia de
ANDROID_HOME y sdk.dir. Se configuró ANDROID_HOME de usuario y se añadieron
platform-tools y cmdline-tools/latest/bin al PATH conservando las entradas previas.
Se creó apps/mobile/android/local.properties con sdk.dir hacia el SDK encontrado;
el archivo está ignorado por Git y no debe versionarse.

El log real del proyecto requiere compileSdk/targetSdk 36, Build Tools 36.0.0 y
NDK 27.1.12297006. Platform 36 y platform-tools ya existían. Se instalaron solo
las versiones faltantes de Build Tools y NDK mediante sdkmanager del SDK existente.
La instalación terminó con código 0; se verificaron aapt2, android.jar, adb y clang,
y los source.properties confirmaron Build Tools 36.0.0 y NDK 27.1.12297006.
No se instaló Android Studio, no se abrió un emulador ni se compiló o inició la app.

El operador puede reiniciar Codex para cargar las variables nuevas y repetir,
con el teléfono físico conectado y desbloqueado, desde la raíz:

```powershell
npm run android --workspace @gasway/mobile -- --device
```

La configuración sdk.dir permite a Gradle encontrar el SDK incluso si una terminal
anterior conserva el entorno viejo. Esta verificación de herramientas no certifica
la compilación completa ni cierra los casos pendientes de confirmación en teléfono.

## Primer resultado de confirmación en Android físico

Fecha: **2026-10-22**. Evidencia comunicada por el operador, sin ejecución remota
ni consulta a cuentas: registro desde el development build instalado, recepción
real del correo en un buzón controlado y pulsación de Confirmar dirección de correo
en ese mismo teléfono. Se abrió una pestaña y, aproximadamente dos segundos después
según el relato, volvió a Gasway en /auth/confirm. La pantalla mostró:
«Tu correo quedó confirmado. Ya puedes continuar en Gasway.» No se conserva la
dirección personal del buzón, el código ni el enlace recibido.

Este resultado acredita el recorrido real correo → navegador → Android → Gasway
hasta el estado confirmed mostrado por el intercambio PKCE. El operador todavía
no indicó si Gasway estaba quitada de recientes o en segundo plano, ni informó
el resultado del botón Continuar, del acceso posterior o del enlace consumido
tras cerrar sesión. No se clasifican esos casos como aprobados por inferencia.
La condición 1 sigue abierta mientras falten los resultados de la lista de teléfono.

Se mejoró únicamente la presentación del estado confirmed: título «¡Correo
confirmado!», check grande sobre fondo semántico de éxito, tarjeta «Verificación
completada» con mensaje y botón «Continuar en Gasway». El éxito se muestra solo
cuando confirmEmail devuelve confirmed; los errores siguen sin simular confirmación.
No se cambiaron el callback, las redirecciones ni el intercambio PKCE. Es un cambio
JavaScript y no añade módulos nativos; el development build actual puede cargarlo
mediante Metro. La revisión no abrió ni renderizó la app.

### Aclaración sobre el estado de la app en la primera prueba

El operador explicó que, al terminar el build, Metro quedó ejecutándose en Cursor
en modo development build y después abrió Gasway en el teléfono. Metro en ejecución
no determina si Gasway estaba cerrada o en segundo plano al pulsar el enlace.
No se comunicó un cierre explícito desde recientes antes de confirmar: se mantiene
pendiente acreditar el caso de arranque con app cerrada. Para ese caso Metro debe
seguir disponible; se cierra únicamente Gasway desde recientes, conservando sus
datos y el verificador del nuevo registro.

## Resultado del enlace consumido y preparación del arranque cerrado

Fecha: **2026-10-22**. El operador informó que cerró sesión, abrió de nuevo el
mismo enlace del correo y Gasway mostró «Este enlace venció o ya fue utilizado…».
Se acredita el rechazo visible de reutilización después de cerrar sesión; no se
consultaron sesiones en servidor ni se operaron cuentas desde esta revisión.

El operador ya recibió un correo para una cuenta nueva y todavía no pulsó el
nuevo enlace. El caso con app cerrada sigue pendiente. Se aclaró el procedimiento:
abrir el selector de aplicaciones del teléfono (botón de recientes o gesto desde
abajo y mantener), buscar la tarjeta de Gasway y deslizarla hacia arriba; volver
a Gmail desde su icono y pulsar el enlace nuevo, manteniendo Metro en el PC.
No desinstalar, borrar datos ni detener Metro: el verificador del registro debe
conservarse. La espera del operador no se registra como resultado de la prueba.

Se ajustó la presentación del resultado expired: título «Revisa tu enlace», tarjeta
con reloj sobre fondo de aviso, texto «Enlace vencido o utilizado» y CTA «Continuar
con mi cuenta». El cuerpo mantiene texto neutro legible y explica que se puede
iniciar sesión si el correo ya fue confirmado. No se afirma que un enlace vencido
haya confirmado la cuenta ni se cambia la verificación, PKCE o configuración Auth.
Cambio JavaScript, sin módulos nativos nuevos ni recompilación. Sin renders ni
apertura de la app por el agente. La condición 1 permanece abierta.

## Fallo de navegación tras ingresar durante la prueba de arranque cerrado

Fecha: **2026-10-22**. El operador precisó el recorrido: quitó Gasway de recientes,
entró al correo y pulsó el enlace nuevo; apareció un selector de aplicación/servidor
de Expo/Metro. Al elegir la entrada de su equipo llegó al formulario de acceso.
Después de pulsar Ingresar, antes de Inicio, apareció Maximum update depth exceeded.
No se registran dirección del servidor, correo, enlaces, códigos ni credenciales.
El selector descrito es compatible con el launcher del development build, pero no
se inspeccionó directamente. Este recorrido no acredita llegada directa del enlace
a /auth/confirm con la app cerrada; ese caso sigue abierto.

La inspección encontró que AuthNavigator sustituía todo el Stack por pantallas
fuera del navegador mientras AuthProvider cargaba los permisos o mostraba un error.
Se corrigió esa transición: el Stack raíz permanece montado; index exporta
AuthEntryScreen, que muestra carga/error y solo redirige con acceso resuelto.
Los guards privados requieren sesión, !loading y !error; el callback público
permanece disponible incluso durante el intercambio PKCE y su carga de permisos.
No se modifica AuthProvider, el cliente Supabase ni la autoridad de roles.

Pruebas offline de Auth correctas: transición inicio sin sesión → formulario →
sesión con permisos pendientes → cliente/conductor; error recuperable y salida;
Stack raíz y callback público presentes en todos los estados y rutas privadas
cerradas durante carga/error. Las regresiones de confirmación y typecheck también
pasaron. No se renderizó la app, no se compiló, no se operaron cuentas ni clouds.
La hipótesis de bucle por sustitución del navegador se aborda con este cambio;
sin traza completa ni repetición en teléfono no se da por demostrada como causa
única del error observado. Pendiente recargar JavaScript y repetir el ingreso con
la misma cuenta antes de reanudar la prueba de enlace con app cerrada.

## Ingreso posterior a la corrección y evaluación de cierre de condición 1

Fecha: **2026-10-22**. El operador confirmó que el error Maximum update depth
exceeded no volvió a aparecer y que la aplicación funciona correctamente después
de la corrección. Se registra el ingreso repetido como correcto según evidencia
manual, sin ejecutar el agente la app ni operar cuentas. Esto respalda el resultado
práctico de la corrección; no identifica por sí solo la causa única del fallo previo.

Estado acumulado: ambos runtimes responden al destino nativo; confirmación real
por correo observada en Android; enlace consumido muestra el estado esperado tras
cerrar sesión; ingreso posterior a la corrección correcto. El contenido histórico
de este documento se conserva y esta sección actualiza su lectura.

**Decisión de cierre: todavía pendiente.** El intento con la app quitada de
recientes pasó por el selector del development build y el formulario de acceso;
no acreditó llegada al callback de confirmación en ese arranque. Falta repetir ese
caso con un enlace nuevo sin consumir, después de la corrección, y observar la
pantalla de confirmación y el acceso al continuar. La causa indeterminada del
localhost histórico no se añade como bloqueo nuevo: el pendiente es la evidencia
del flujo cerrado ya incluida en la lista de teléfono.

## Limpieza autorizada de una cuenta para repetir el registro

Fecha: **2026-10-22**. El operador autorizó expresamente borrar una cuenta concreta
utilizada en las pruebas del teléfono, tanto en Authentication como en la base
de datos, para reutilizar su buzón en el caso pendiente. Esta autorización es
específica de esa cuenta y revoca para esta operación la restricción anterior de
solo lectura; no autoriza otras cuentas ni cambios de configuración.

Se encontró una coincidencia en Gasway Project (gleltbrvpfvfgggcatpt) y ninguna en
Test. Se inspeccionaron 130 columnas de identidad/correo en 56 tablas de
public/private/auth/storage: las únicas coincidencias fueron auth.users,
auth.identities, auth.sessions, auth.refresh_tokens, auth.flow_state y
public.profiles, una fila en cada una. Sin pedidos, registro de conductor,
dependencias comerciales ni archivos vinculados. No se almacena aquí el correo
personal, UUID ni credenciales.

Tras comprobar de nuevo el UUID y correo exactos mediante la API administrativa,
se eliminaron únicamente sus refresh tokens, sesiones y estado de confirmación,
y se borró la cuenta Auth de forma definitiva con deleteUser. El perfil se
eliminó mediante su FK on delete cascade. La comprobación posterior encontró
cero usuarios Auth con ese UUID/correo y cero identidades, sesiones, refresh tokens,
flow states, perfiles y conductores para el UUID. Operación y verificación
terminadas con código 0. No se creó otra cuenta ni se enviaron correos.

La inspección tuvo un fallo temporal HTTP 502 en la API de gestión antes de las
mutaciones; se respetó el backoff de 60 segundos y se completó después. La cuenta
puede registrarse nuevamente con el mismo buzón; cerrar cualquier sesión local
que siga visible en el teléfono y usar el correo nuevo del siguiente registro.
Esto prepara la repetición y no acredita por sí solo el caso de app cerrada ni
cierra la condición 1.

### Segunda limpieza autorizada del mismo buzón de prueba

Fecha: **2026-10-22**. El operador pidió repetir la eliminación porque registró
de nuevo la cuenta sin realizar el cierre de la app previsto para la prueba.
Se identificó la cuenta recreada por su nuevo UUID y correo exacto en Gasway Project.
La inspección de 56 tablas encontró únicamente usuario Auth, identidad, sesión,
refresh token y perfil; sin otras dependencias de aplicación. Tras revocar sus
datos de sesión y borrar Auth, el perfil se eliminó en cascada. La comprobación
posterior en las mismas 56 tablas no encontró referencias al nuevo UUID/correo;
la operación terminó con código 0. No se registran datos personales ni credenciales.

El siguiente intento requiere registrar primero la cuenta desde Gasway para que
el verificador PKCE quede guardado; después de recibir el correo, cerrar solo la
app desde recientes y finalmente pulsar el enlace nuevo, manteniendo Metro activo.
No cerrar Gasway antes del registro: el cierre que se prueba es entre el registro
y la apertura del enlace. La condición 1 sigue pendiente de ese resultado.

## Arranque cerrado interceptado por el launcher del development build

Fecha: **2026-10-22**. El operador repitió el caso y volvió a observar Gasway —
Development Build con la dirección del servidor Metro, en lugar de abrir
inmediatamente la pantalla de confirmación. Al seleccionar el servidor, el primer
intento mostró un error que no se conservó y el segundo funcionó. Al consultar,
el operador indicó que ya no podía reproducirlo ni recordar el texto. No se
atribuye ese error a red, sesión, navegador o PKCE sin evidencia adicional.
No se registra la dirección privada del servidor.

### Hallazgo de la inspección nativa

El paquete instalado expo-dev-launcher 57.0.21 maneja el enlace externo antes de
cargar el JavaScript de Gasway. En Android, DevLauncherController.handleIntent
manda una URI cuyo host no es expo-development-client a handleExternalIntent.
Este guarda el intent pendiente cuando todavía no está en Mode.APP y devuelve
false; redirectFromStartActivity entonces llama navigateToLauncher. La recuperación
del último servidor está en el camino de ACTION_MAIN, que no es el intent VIEW
del enlace de confirmación. createAppIntent intenta recuperar después el intent
pendiente; la inspección no demuestra que el primer intento observado lo haya
entregado con éxito a nuestro callback.

El manifest generado declara gasway/exp+gasway y MainActivity singleTask, por lo
que no falta la declaración del scheme. El hallazgo explica la pantalla del
launcher con el build actual; no identifica la causa del error del primer intento.
Cambiar solamente launchMode a most-recent o recargar JavaScript no corrige el
camino nativo descrito, por lo que no se modificaron esas opciones ni dependencias.

### Corrección del procedimiento de validación

La instrucción anterior de usar únicamente este development build y mantener
Metro no permite acreditar de forma limpia la apertura directa de una app autónoma.
Para cerrar este caso, usar un APK de prueba que incluya JavaScript y no dependa
del launcher/servidor. Los resultados anteriores de correo, uso con app cargada,
aviso de enlace consumido e ingreso se conservan; el arranque cerrado sigue pendiente.
No repetir registros ni limpiar cuentas para intentar superar el selector actual.

Con el Android conectado y los requisitos locales ya preparados, desde la raíz,
el operador puede compilar e instalar la variante release local:

```powershell
npm run android --workspace @gasway/mobile -- --variant release --device --no-bundler
```

Comando preparado, **no ejecutado**. No requiere configurar EAS ni instalar
Android Studio. El Gradle generado usa export:embed para incluir JavaScript y
release no está entre las variantes debuggable. expo-dev-launcher desactiva su
implementación en release salvo override explícito configureInRelease; no se
halló ese override en las propiedades locales inspeccionadas. La variante release
local usa actualmente la firma debug del proyecto: sirve para esta prueba local,
no constituye una entrega firmada para tienda. Se mantiene el applicationId
cl.gasway.mobile; no desinstalar ni borrar datos para instalarlo. Si Android rechaza
la actualización por firma, detenerse y revisar el error antes de eliminar la app.

Antes de registrar o consumir otro enlace, comprobar manualmente que ese APK abre
Gasway con Metro detenido y conexión a Internet disponible. Luego realizar el caso
con un registro controlado nuevo, cerrar Gasway desde recientes tras recibir el
correo, abrir el enlace nuevo en el mismo teléfono y comprobar confirmación/acceso.
Solo ese resultado permitirá aprobar el caso. No se borró ni creó ninguna cuenta,
no se enviaron correos ni se modificaron los clouds en esta investigación.

Fuentes: código local DevLauncherController.kt y DevLauncherPackageDelegate.kt,
app/build.gradle y AndroidManifest.xml generados; [Expo DevClient SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/dev-client/)
y [Expo: compilación local y variante release](https://docs.expo.dev/guides/local-app-development/).

## Comando manual para limpiar una cuenta descartable del piloto

Fecha: **2026-10-22**. Se añadió scripts/security/delete-pilot-account.cjs para
repetir la limpieza desde la raíz, con dependencias instaladas y la CLI Supabase
ya autenticada en la cuenta con acceso a Gasway Project:

```powershell
node scripts/security/delete-pilot-account.cjs --email "buzon-controlado@example.com" --confirm
```

Reemplazar el correo de ejemplo por el de la cuenta de prueba que se desea borrar.
**Borra definitivamente la cuenta y su perfil.** El destino está fijado en el
script a Gasway Project (gleltbrvpfvfgggcatpt); no admite elegir otra URL/ref ni usa
la URL de .env. --confirm es obligatorio y el comando no se ejecuta en CI.

Solo admite un usuario único con perfil customer. Cuenta las dependencias por
UUID/correo en los esquemas public/private/auth/storage y se detiene si encuentra
otros datos de aplicación, como pedidos, archivos o membresías. Revalida identidad
por la API administrativa, revoca sesiones/refresh tokens/flow state y elimina
Auth mediante deleteUser; el perfil cae por su FK. Verifica ausencia de referencias
en las mismas tablas después. Las claves permanecen en memoria y los mensajes no
imprimen credenciales, correo, UUID ni enlaces. No crea cuentas ni envía correos.
Si la cuenta Auth ya no existe, informa SIN CAMBIOS y termina sin mutaciones.
Un error de inspección/API/verificación devuelve código 1; revisar antes de repetir.
No sustituye una política general de eliminación de cuentas con actividad.

El operador volvió a autorizar la limpieza del buzón usado en las pruebas. Se
usó este comando para eliminar la nueva cuenta recreada; terminó con código 0 y
«ELIMINADA Y VERIFICADA: Auth, perfil y sesiones ausentes en 56 tablas revisadas».
No se almacena aquí el correo personal. Las regresiones offline de confirmación
explícita, destino fijo, dependencias, rol, identidad, delimitador SQL y secuencia
revocación/borrado/verificación pasaron; typecheck correcto.

El siguiente registro para validar arranque cerrado debe hacerse en el APK autónomo
preparado en la sección anterior. Esta limpieza no valida el caso ni cierra la
condición 1. No se compiló ni se abrió la app en esta operación.

## Cierre de la condición 1 de DT-07

Fecha: **2026-10-22**. Estado: **aprobada y cerrada**.

El operador confirmó «Ahora sí funcionó» al finalizar la repetición pendiente
con la app cerrada en Android, siguiendo el procedimiento del APK autónomo sin
Metro descrito arriba. Se registra como evidencia manual reportada por el
operador; esta ejecución en el teléfono no fue observada directamente por el
agente. Las secciones anteriores conservan sus estados históricos.

La aprobación reúne la evidencia acumulada de esta condición:

- Destino nativo gasway://auth/confirm y allowlist exacta comprobados; las tandas
  documentadas de sondas de ambos runtimes devolvieron el destino esperado.
- Registro controlado, recepción del correo en el mismo teléfono y confirmación
  real con aviso de éxito en Gasway.
- Reutilización del enlace después de cerrar sesión: aviso de enlace vencido o
  utilizado. Ingreso posterior correcto tras la corrección de navegación.
- Repetición final del callback con la app cerrada en el APK autónomo sin Metro,
  confirmada por el operador; se da por completado el caso pendiente.

La causa histórica de la redirección a localhost permanece indeterminada. El
error del primer intento en el launcher del development build no tuvo una traza
recuperable. Este cierre no atribuye una causa demostrada a ninguno de ambos
antecedentes ni modifica su evidencia histórica.

**DT-07 completo sigue en curso y el piloto no queda habilitado**: faltan las
restantes condiciones de seguridad operativa de docs/pilot-security.md. La
recuperación autónoma de cuenta sigue en NF-01.

En esta actualización solo se documentó el resultado: no se ejecutaron nuevas
sondas, compilaciones, operaciones sobre cuentas ni cambios de configuración.
No se incluyen tokens, códigos ni enlaces completos de confirmación.

## Limpieza para repetir el registro con teléfono

Fecha: **2026-10-23**. El operador autorizó eliminar dos cuentas descartables para
volver a registrarse con el nuevo flujo. Se ejecutó secuencialmente el script
`scripts/security/delete-pilot-account.cjs --email <correo> --confirm` en Gasway
Project (`gleltbrvpfvfgggcatpt`). No se guardan los correos personales en el repositorio.

Ambas ejecuciones terminaron con código 0 y «ELIMINADA Y VERIFICADA: Auth, perfil
y sesiones ausentes en 56 tablas revisadas». Cada una inspeccionó dependencias,
revalidó identidad/rol, revocó sesiones y eliminó la cuenta Auth con su perfil;
la verificación posterior no encontró referencias. No se crearon cuentas ni se
enviaron correos y no se modificó la configuración Auth.

El entorno actual de desarrollo y pruebas es Expo conectado a Metro. Para probar
los cambios JavaScript/TypeScript del registro basta cargar/recargar este checkout;
no hace falta recompilar un APK autónomo. Si Expo conserva una sesión de las
cuentas eliminadas, salir de ella antes de repetir el registro. Esta limpieza no
constituye una validación manual del nuevo flujo.

## Integración de ramas del 2026-10-23

Se conserva la condición 1 aprobada el 2026-10-22 y su evidencia manual reportada
por el operador. La entrega integrada reúne también identidad vectorial, espera
con solo logo y registro en dos pasos con teléfono de contacto. La validación
manual de ese registro nuevo sigue pendiente; no se deduce del cierre anterior.
DT-07 completo continúa abierto según docs/pilot-security.md.

Durante la integración se corrigieron errores de lint de Auth: el envío se prepara
desde el evento, el resultado de confirmación se asocia al enlace que lo originó
y el reloj de reintento protege su sincronización frente al desmontaje. La
regresión de confirmación comprueba además que un enlace nuevo no muestra el éxito
del anterior. Las suites afectadas y el typecheck final pasaron, sin ejecutar
confirmaciones reales ni operaciones de cuentas. Inventario y validación en
docs/integration-2026-10-23.md.
