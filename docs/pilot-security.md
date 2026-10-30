# DT-07 — Seguridad operativa del piloto

Auditoría inicial: **2026-10-22**. Estado actualizado: **2026-10-26**,
**en curso; piloto no habilitado**.

**2026-10-27, reemplazos documentales:** ADR 0043 mantiene un pendiente por
titular/tipo, reemplazo transaccional e historial sin decisiones inventadas. La
revisión rechaza versiones retiradas, preservando ACL y aprobaciones vigentes.
Estado y pruebas en [workspace admin](admin-document-workspace.md).
Aplicada solo en Test: ensayo de migración desde cinco pendientes y tres suites
SQL aprobados con fixtures revertidos; originales, revisiones y ACL preservados.
Se mantienen los tres WARN ya documentados del advisor, sin avisos adicionales.

**2026-10-27, licencia personal:** permisos y asistente para que cada conductor
complete únicamente sus datos/licencia; negocio con seguimiento de solo lectura.
Revisión independiente y requisitos de reparto conservados. Evidencia y estado
de aplicación en [documentación del conductor](driver-documentation-flow.md).
No acredita revisión de antecedentes reales ni ensayos de dispositivo.
Aplicado solo en Test, con suites de propiedad personal y elegibilidad aprobadas.
El advisor reporta tres WARN: funciones públicas de elegibilidad SECURITY DEFINER
ya existentes y protección contra contraseñas filtradas desactivada. Detalle y
alcance en la guía enlazada; no se cierra DT-07 con esta entrega.

**2026-10-26, interfaz de Flota:** asistente visual de siete etapas y resumen editable,
con omisiones de prueba exclusivas de Test que no modifican la elegibilidad SQL.
Typecheck aprobado; visualización, selectores y teclado en teléfonos pendientes.
Este cambio no despliega backend ni acredita ensayos físicos.
[Recorrido y límites](vehicle-documentation-flow.md).

**2026-10-26, revisión documental:** UI, versiones, Storage privado, revisión por
otro admin y bloqueos de disponibilidad/ofertas/asignación implementados (ADR 0039).
Migración aplicada **solo en Gasway Test**; tres grupos SQL/RLS aprobados con
rollback de fixtures. No se desplegó en Gasway Project ni se comprobaron pantallas
o dispositivos. La función de eliminación/limpieza fue desplegada solo en Test
el 2026-10-26 tras autorización explícita del operador para el borrado permanente:
versión 1 ACTIVE y HTTP 401 ante POST sin sesión. No se ejecutaron borrados para
esta comprobación; el flujo completo de eliminación/limpieza no quedó validado.
Retención general, comprobación operativa, antecedentes reales y despliegue comercial
siguen pendientes. No confundir revisión manual con certificación legal.
[Evidencia y activación](document-verification.md).

**2026-10-26, prerrequisitos de dispositivos:** se preparó una demo persistente en
Test con las dos cuentas adicionales expresamente autorizadas, negocio `is_demo`,
catálogo, cobertura, conductor y vehículo. Sin correos, copia de Project ni
aprobaciones documentales ficticias. La URL y clave pública locales coinciden con
Test (comparación en memoria, claves no registradas). La preparación utilizó
identidades SQL para onboarding/RPC; no prueba login ni interacción desde teléfono.
[Recorrido pendiente y archivos DEMO](device-demo-test.md).

**2026-10-26, runtime Android:** el operador reportó falta del módulo nativo
ExpoImageManipulator. Se recompiló el development build ARM64 y se actualizó por
USB el Samsung principal conservando firma/datos. Registro nativo y DEX incluyen
los dos módulos de imagen; hash instalado igual al APK verificado. Esto acredita
empaquetado/instalación, no carga de foto ni comprobación visual en ejecución.
[Evidencia y pasos posteriores](expo-runtime.md).

Actualización demo **2026-10-24, D2**: GPS privado por pedido y RPC con validación,
recepción/frescura y borrado terminal aplicados en Test/app. Las pruebas dirigidas
de GPS, permisos y avance pasaron. [Contrato y límites](gps-contract.md).
**D3 implementado el 2026-10-24:** captura/vista en primer plano y destino por RPC
autorizada, aplicado en Test/app. Pruebas de lógica/ciclo de vida, permisos SQL,
tipos y lint dirigidos aprobados. [Evidencia y límites](live-tracking.md).
**Evidencia del operador, 2026-10-24:** pausa, recuperación tras pausa, segundo
plano, entrega y cancelación reportados correctos. Pérdida de red: recuperación
manual confirmada; el guard de acceso desmonta la entrega y reinicia GPS.
La repetición de permiso explícitamente denegado también fue aprobada por el
operador: aviso rojo y ausencia de recepciones nuevas hasta conceder permiso.
Modo avión, sin internet y permiso solicitado de nuevo aprobados expresamente
por el operador con recuperación manual. La reanudación automática queda como
mejora posterior. Selector y seguimiento recuperan Apple Maps en Expo Go iOS y
conservan Google Maps en Android (2026-10-25). El operador confirmó los anteriores pines y actualizaciones;
la cámara y composición del cliente se refinaron y tienen regresión automática,
pendiente de comprobación física de esa corrección, cambio de sesión y segunda
entrega. [Detalle](live-tracking.md), ADR 0035. Rutas privadas por pedido y Edge
Function aplicadas en Test/app el 2026-10-25; el operador autorizó la clave Directions
solo por API sin IP fija y ya está configurada como secreto. También autorizó OSRM
solo para demo Apple, con logs conocidos, caché por proveedor y presupuesto global.
GPS sigue operativo ante fallos de rutas. Caché TTL de 2 h purgada al leer y al terminar; no hay
purga programada de viajes abandonados, pendiente dentro de retención DT-08.
Pruebas automáticas de animación no acreditan renderizado nativo en Expo Go.
**Ampliación Android del conductor:** GPS al navegar implementado con consentimiento,
permisos y notificación; APK compilado e instalado. No hay evidencia física aún
de continuidad en Waze, pantalla bloqueada o restricciones Samsung. [Guion](driver-navigation.md).
La prueba SQL ampliada de movimiento sintético pasó el 2026-10-24 en Test:
el cliente obtiene la segunda posición y conserva el destino original; rollback
de los datos temporales. No acredita el sensor ni los marcadores nativos del iPhone.
Esto no cierra DT-07 ni DT-08: la evidencia física es parcial,
y la purga física por tiempo de pedidos abandonados sigue pendiente.
DT-01/02 ya tienen entregas y DT-03 está cerrado. Corresponde avanzar con DT-07
antes de continuar DT-04/05/06/08; la numeración no establece dependencias por sí sola.

Condición 1 **aprobada y cerrada (2026-10-22)**: destino nativo
`gasway://auth/confirm` y allowlist exacta guardados; sondas recientes de ambos
runtimes correctas. La evidencia acumulada en Android incluye confirmación real,
aviso de enlace consumido e ingreso posterior a la corrección de navegación.
El operador confirmó que funcionó la repetición final con la app cerrada en el
APK autónomo sin Metro. La discrepancia histórica con localhost dejó de
reproducirse, con causa indeterminada. Ver
[evidencia actualizada de confirmación](auth-confirmation.md), que complementa la
auditoría inicial siguiente. Las condiciones 4 y 6 están parciales y la 5 sigue pendiente.

Condición 2 **Aprobada (2026-10-23)**: mínimo de 15 caracteres y cuotas Auth
endurecidas aplicados y verificados en ambos clouds. Gmail SMTP gratuito
configurado en ambos, recepción real en INBOX verificada en Test y cuenta temporal
eliminada. Decisiones de filtradas y abuso Auth/RPC con responsable y plazo
2026-10-30 en [su evidencia](auth-abuse-smtp.md), ADR 0028. El WARN de filtradas
permanece y no se activó un plan pago. Controles de abuso previos a apertura y
condiciones 4–6 siguen sin cerrar; DT-07 completo no se cierra.

Revisión posterior del propietario: registro/helper implementan mínimo **8**, una
mayúscula A-Z y un número, con indicadores cruz/check en tiempo real. Cloud tiene
el overlay de 8 con `letters_digits` aplicado tras autorización explícita y diff
posterior vacío en ambos proyectos. La mayúscula
solo se valida en app/helper. [Decisión y alcance](decisions/0030-accessible-password-policy.md).

Condición 3 **Aprobada y cerrada (2026-10-23)**: inventario Data API verificado en ambos
paneles (`public`, `graphql_public`; `private` excluido y rechazado en runtime).
PAT `gasway-github-tests` limitado a Test, Database RW/Project Settings R y
caducidad 2026-11-21; el operador confirma que es el guardado en
`SUPABASE_TEST_ACCESS_TOKEN`. No se requiere reemplazo ahora.
MFA Google del operador verificado; MFA Supabase/GitHub confirmado por él tras
la revisión inicial. Nacho es responsable actual en operación unipersonal;
automatización futura. Maps fuera del piloto, confirmado por el operador.
Proyecto Google actual confirmado por el operador: `gw-dst`, número
`494420889765`; proyectos antiguos excluidos y nuevo IAM sin auditar.
[Evidencia y límites del cierre](platform-access-security.md). Próxima renovación
del PAT antes de caducidad; responsable Nacho. Piloto no habilitado.

Condición 4 **Parcial (2026-10-23)**: primera copia lógica cifrada creada desde
la app, roles sin contraseñas y manifiesto, guardados en Drive privado y
verificados por descifrado en memoria y SHA-256 tras descarga cifrada. Nacho
aprobó RPO ≤24 h / RTO ≤4 h como objetivos; automatización cada 12 h activa,
todavía sin primera ejecución programada observada. Falta confirmar
segunda copia de la clave fuera del PC; no hay restore ensayado. [Evidencia](backups.md),
ADR 0029. Sin dumps sin cifrar en disco, Git ni CI artifacts.

## Entornos y alcance de la auditoría inicial

| Entorno              | Ref                    | Operación en esta revisión                                                     |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| Gasway Project (app) | `gleltbrvpfvfgggcatpt` | Solo lectura de advisors, configuración y metadatos; sin cuentas ni cambios.   |
| Gasway Test          | `xnrueexpwzvxotgwmamj` | Inventario, pruebas SQL con rollback y dos cuentas Auth temporales eliminadas. |

El conector Supabase pertenece a otra cuenta; se utilizó la CLI 2.121.0 ya
autenticada, con destino explícito. Se preservó el enlace CLI de la app.
No se copiaron datos reales, se enviaron correos ni se activaron servicios pagados.
No se abrió la app ni se probaron enlaces en un dispositivo.

## Evidencia de la auditoría inicial (previa a condición 1)

| Control                 | Resultado observado                                                                                                                                                                                                                                             | Límite / acción pendiente                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Advisors de seguridad   | Test: sin hallazgos. App: un WARN `auth_leaked_password_protection`.                                                                                                                                                                                            | La ausencia de avisos no certifica los demás controles.                                                                                                                                                |
| Tablas de aplicación    | App: 26; Test: 28 (incluye dos tablas de infraestructura de pruebas). Todas con RLS. Sin vistas de aplicación en public/private.                                                                                                                                | Se excluyen objetos pertenecientes a extensiones; revisar cualquier nuevo esquema expuesto.                                                                                                            |
| Grants efectivos        | `anon` sin acceso a tablas/RPC de aplicación. `authenticated` tiene lecturas filtradas, UPDATE de display_name/rut/commune_code propios y SELECT/INSERT/UPDATE de driver_locations sujeto a RLS.                                                                | La integridad de RUT/CUT en profiles sigue en DT-06; tracking no se incorpora.                                                                                                                         |
| RPC                     | 94 funciones de aplicación entre public/private; 45 definer privadas con search_path vacío; ninguna definer pública ni función de aplicación ejecutable por anon.                                                                                               | Los wrappers públicos invoker necesitan EXECUTE de sus implementaciones privadas; no revocarlos indiscriminadamente.                                                                                   |
| Privilegios futuros     | Los defaults de postgres y supabase_admin en public todavía conceden permisos amplios a roles API en tablas, secuencias y funciones nuevas. Los objetos actuales tienen revocaciones explícitas.                                                                | Cada migración debe revocar/grantar explícitamente. Evaluar endurecer defaults por propietario con migración y regresiones; RLS no protege RPC definer.                                                |
| Regresión SQL nueva     | `pilot_security.sql` pasó con rollback: RLS, grants de tabla/columna, definer/search_path, aprobación administrativa, metadata, perfiles cruzados, escritura propia y rechazo anon/sin identidad.                                                               | Claims SQL sintéticos; no reemplaza Auth real. Se integra como octava suite current.                                                                                                                   |
| Invitaciones            | `business_driver_invitations.sql` pasó: correo confirmado, destinatario real, intentos de suplantación por claims, membresía, privacidad y revisión.                                                                                                            | Fixtures con rollback; no envía ni valida entrega de correo.                                                                                                                                           |
| Auth real / Data API    | Dos cuentas temporales: rechazo `email_not_confirmed`, login tras confirmación administrativa, aislamiento entre cuentas, rol customer pese a metadata maliciosa, UPDATE de rol denegado y rechazo anon. Logout local y eliminación de ambas cuentas correctos. | No se utilizó confirmación por correo; no prueba transporte SMTP ni enlaces.                                                                                                                           |
| Confirmación y sesiones | Ambos proyectos coinciden con `enable_confirmations=true`, anónimos desactivados, JWT de 3600 s y rotación refresh activada con reutilización de 10 s.                                                                                                          | Verificados por config diff contra campos declarados; no se modificó el cloud.                                                                                                                         |
| Contraseñas             | Mínimo cloud de 6 caracteres, sin requisitos de composición.                                                                                                                                                                                                    | Elevar al menos a 8 antes del piloto y alinear mensajes/validación de la app. Protección filtrada requiere Pro o superior; no activada.                                                                |
| Redirecciones           | Ambos: site_url `http://localhost:3000`, lista adicional vacía. El repo local declara puerto 8081 y `gasway://**`.                                                                                                                                              | Definir destino real controlado y URLs exactas; no publicar el wildcard local como configuración del piloto. NF-01 debe implementar el manejo de enlaces.                                              |
| Límites Auth            | Config diff coincide con 30 ingresos/registros por 5 min/IP, 150 refresh por 5 min/IP, 30 verificaciones por 5 min/IP y 2 correos/h; intervalo de correo 60 s, OTP de 8 caracteres. CAPTCHA desactivado.                                                        | No se saturaron endpoints ni se enviaron correos. Límites Auth no limitan compras, invitaciones o RPC de negocio. Definir presupuesto/alertas de abuso y controles servidor antes de apertura pública. |
| Claves                  | Test dispone de publishable/secret y legacy anon/service_role. El smoke usa publishable en clientes y service_role solo en memoria administrativa. No registra valores.                                                                                         | No se rotaron claves ni se certificó su distribución. Inventariar PAT de CI, caducidad y alcance con el propietario. Supabase publishable se protege con grants/RLS.                                   |
| Google Maps             | Restricciones Android por package/SHA-1/SDK e iOS por bundle/SDK verificadas en mapapp-389403. Directions de servidor autorizado sin IP fija y guardado en secretos Test/app. OSRM solo demo Apple autorizado con logs conocidos y límite compartido.           | Falta ensayo físico de mapa/navegación. No se reutiliza la clave web; los servicios de demo no habilitan producción.                                                                                   |
| Backups                 | Ambos devuelven `backups:null`, `physical_backup_data:{}`, `pitr_enabled:false`, `walg_enabled:true`.                                                                                                                                                           | No se listó ninguna copia recuperable; walg_enabled no prueba disponibilidad/retención ni restauración. Sin simulacro ejecutado.                                                                       |
| Detección de secretos   | Gitleaks 8.30.1 local: 13 commits, ~5,88 MB, cero hallazgos tras clasificar un falso positivo de contraste sRGB. Control positivo: clave sintética rechazada con exit 1.                                                                                        | Solo historial disponible localmente; CI escanea todo el historial fetched. Nueva entrega aún no ejecutada en Actions.                                                                                 |

Los límites leídos mediante config diff son una foto del entorno, no pruebas de
carga. También se solicitó una lectura del esquema `private` por Data API con
publishable en ambos proyectos: los dos la rechazaron con `PGRST106` (Invalid schema).
Esto confirma el rechazo de ese esquema; `pgrst.db_schemas` no apareció en la sesión
SQL. El inventario completo se verificó el 2026-10-23 en ambos paneles:
`public` y `graphql_public` expuestos, `private` excluido. La nueva sonda runtime
de ambos devolvió HTTP 406/PGRST106; detalle en la evidencia de condición 3.

## Repetir la revisión

Solo lectura, con ref explícita para cada entorno:

```powershell
npx --no-install supabase db advisors --linked --project-ref REF --type security --output json
npx --no-install supabase db query --linked --project-ref REF --file supabase/security/audit.sql --output json
npx --no-install supabase config diff --project-ref REF --output-format json
npx --no-install supabase backups list --project-ref REF --output json
```

`audit.sql` abre una transacción read only y devuelve metadatos, nunca filas de
usuarios. Config diff es de solo lectura; no ejecutar config push para resolver
diferencias automáticamente: el TOML local no es el baseline del cloud.

Pruebas con escrituras **solo en Test**:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:cloud -- --suite=pilot_security.sql
npm run db:test:cloud -- --suite=business_driver_invitations.sql
npm run db:test:auth
```

El smoke Auth requiere la sesión CLI administrativa local y conectividad. Rechaza
CI, otras refs y ausencia del marcador privado. Obtiene claves por stdout capturado,
las conserva en memoria y utiliza contraseñas aleatorias; no acepta contraseñas por
argumentos ni carga `.env`. Hace commit de dos cuentas temporales vía Auth Admin,
sin enviar emails. En `finally` cierra sesiones locales y elimina esas cuentas. Si
falla la limpieza informa exclusivamente sus UUID sintéticos; eliminarlos por Auth
Admin tras confirmar que ya no corre el proceso. Una terminación forzada puede
impedir finally: revisar usuarios `dt07-…@example.invalid` antes de repetir.

## Detección en CI

`.github/workflows/secret-scan.yml` corre en PR, push a ramas de trabajo/main y
workflow_dispatch, sin secretos cloud ni licencia externa. Checkout completo,
acciones fijadas por SHA, lectura del repo y credenciales no persistidas. Descarga
Gitleaks **8.30.1** con SHA-256 fijo; falla ante checksum inválido, error o hallazgo.
Primero exige que una clave sintética sea rechazada; después escanea `git --all`
con redacción total. No sube reportes que puedan contener credenciales.

`.gitleaks.toml` extiende reglas oficiales y añade secret/PAT Supabase y JWT
completo. Los JWT anon también se revisan: son públicos, pero no deben confundirse
con service_role; los clientes nuevos utilizan publishable. La única excepción
acota regla generic-api-key + ruta docs/design.md + coincidencia exacta
del texto sRGB; no excluye archivos ni commits completos. Un hallazgo
real exige revocar/rotar primero y revisar uso, aunque luego se retire del árbol.
Configurar el check como requerido tras su primera ejecución en GitHub.

## Condiciones para cerrar DT-07

1. **Aprobada (2026-10-22):** URL nativa definida y allowlist exacta guardada en ambos;
   sondas de ambos runtimes y correo real correctos. En Android se observaron
   confirmación y rechazo visible del enlace consumido; el ingreso ya funciona
   tras la corrección de navegación. El operador confirmó éxito del callback con
   la app cerrada en el APK autónomo sin Metro.
   [Detalle](auth-confirmation.md).
   La recuperación autónoma depende de NF-01.
2. **Aprobada (2026-10-23):** mínimo 15 y cuotas Auth desplegados en ambos;
   Gmail SMTP gratuito configurado en Test y app. Recepción real de confirmación
   verificada en el buzón autorizado desde Test, por TLS 1.3; cuenta eliminada.
   Decisión temporal de filtradas sin plan pago y decisiones de abuso Auth/RPC
   registradas con Nacho como responsable y plazo 2026-10-30 o antes de apertura.
   [Evidencia y límites](auth-abuse-smtp.md). El smoke de cuentas sigue sin enviar
   correo; la prueba SMTP es independiente. CAPTCHA/cuotas de RPC son compromisos
   previos a apertura, no controles ya implementados.
3. **Aprobada y cerrada (2026-10-23):** esquemas Data API verificados en ambos y
   PAT limitado a Test, con caducidad 2026-11-21; correspondencia con el secret CI
   confirmada por el operador. MFA Supabase/GitHub y operación unipersonal
   confirmados por él; Maps fuera del piloto. Sin reemplazo de token/secret.
   [Evidencia y límites](platform-access-security.md).
4. **Parcial (2026-10-23):** backup cifrado externo creado y verificado en Drive
   privado; responsable Nacho, objetivos RPO ≤24 h / RTO ≤4 h aprobados, sin
   garantía actual. Automatización cada 12 h activa. Falta confirmar custodia de una
   segunda clave fuera del PC. [Evidencia y límites](backups.md). No almacenar
   dumps en Git, CI artifacts ni carpetas públicas.
5. Ensayar restauración en destino aislado, registrando hora/copia, integridad,
   recuentos y acceso con cuentas de prueba. Revisar autenticación, permisos, RLS y RPC y la operación
   tras restaurar. Migraciones + seed recrean estructura, no recuperan datos reales.
   Configuración Auth/redirects, claves y objetos Storage requieren recuperación
   separada; el backup de DB no contiene los archivos de Storage ni contraseñas de
   roles personalizados. No restaurar sobre la app como simulacro.
6. **Parcial (2026-10-23):** detector de secretos aprobado en
   [Actions 40038443767](https://github.com/nachodev-ui/GW_DST/actions/runs/40038443767),
   commit 2d995404c18f7b56e8204a44327c5f87d2b924b7, [PR #11](https://github.com/nachodev-ui/GW_DST/pull/11).
   GitGuardian también aprobó ese commit. Al añadir
   cambios de seguridad, ejecutar las regresiones relevantes en Test y repetir
   inventario/advisors del entorno que recibirá el piloto.

Hasta completar estos puntos, DT-07 permanece abierto. Se puede preparar DT-04,
pero no usar esta revisión para autorizar usuarios o datos reales.

## Integración del 2026-10-23

La [entrega integrada](integration-2026-10-23.md) conserva el cierre de condición 1
y reúne scripts de diagnóstico/limpieza, PKCE y detección de secretos con los
cambios posteriores de identidad, carga y registro con teléfono. La auditoría
inicial y los resultados históricos siguientes no son una nueva medición cloud.

El registro ahora solicita correo/contraseña y después teléfono de contacto;
mantiene el destino nativo. La migración de teléfono figura aplicada en Test y
app, con suite SQL afectada aprobada, en [su evidencia](registration-phone.md).
La prueba manual del nuevo registro sigue pendiente. El teléfono no está
verificado y sus metadatos no conceden roles ni autorización.

En esa integración, la pausa local de reintento y el mínimo de ocho caracteres
del formulario no cerraban la condición 2: faltaban endurecimiento servidor y
decisión documentada de contraseñas/abuso. El operador mantuvo entonces el proveedor
de correo integrado; no se
configuró SMTP ni se aumentaron cuotas en esa integración. La entrega posterior
de condición 2 eleva a 15 el mínimo móvil y cloud, configura SMTP y verifica
recepción real; esa condición quedó aprobada como se indica al inicio.
La condición 3 quedó cerrada según su evidencia; las 4–5 siguen pendientes y
la 6 conserva arriba evidencia del workflow de secretos; siguen pendientes las
regresiones SQL vigentes y el inventario/advisors actualizados del entorno del
piloto. Las regresiones offline del PR se consultan en GitHub. Publicar o integrar
el PR no cierra por sí solo esta condición.

## Validación de la entrega

- Typecheck móvil correcto, sin instalar dependencias ni renderizar la app.
- Regresión offline de clasificación/destino SQL correcta (ocho current).
- SQL pilot_security e invitaciones correctos en Test, con rollback.
- Smoke Auth/Data API correcto; dos cuentas eliminadas y sesiones locales cerradas.
- Data API rechazó el esquema privado en Test y app con PGRST106.
- Gitleaks: historial disponible y árbol de trabajo revisados; controles sintéticos
  de secret, PAT y JWT rechazados, texto inocuo aceptado. El workflow se aprobó
  posteriormente en Actions el 2026-10-23; enlace en la condición 6.

## Evidencia adicional — workspace del distribuidor, 2026-10-25

Migración `20261026010000` aplicada en Gasway Test y, tras aprobar sus pruebas,
en el proyecto de la app por autorización expresa del operador. Nuevas tablas de
perfil, flota y costos con RLS y sin escritura móvil directa; RPC con autorización
por membresía, revisión CAS y auditoría privada. Bucket de imágenes privado.

`distributor_workspace.sql` y `pilot_security.sql` pasaron en Test con rollback de
fixtures. En app se comprobaron contratos de RPC de lectura como miembro, rechazo
de no miembro, RLS y configuración/políticas del bucket sin modificar datos del
negocio. Advisors: Test sin hallazgos; app conserva únicamente el WARN conocido
`auth_leaked_password_protection`. No se activaron servicios pagos.

Typecheck ya aprobado. No hay evidencia visual nueva, subida real de imágenes ni
prueba física del mapa de perfil. La activación del workspace no cierra condiciones
DT-07 ni acredita seguridad del vehículo o preparación del piloto.
[Contrato y evidencia completa](distributor-workspace.md).

## Evidencia de integración — 2026-10-30

La regresión completa encontró dos RPC públicas SECURITY DEFINER en la entrega
documental: `is_driver_eligible` e `is_vehicle_eligible`. Sus guardas de acceso
existían, pero incumplían el patrón de privilegios privados exigido por
pilot_security. La migración `20261030053253_eligibility_invoker_wrappers.sql`
mantiene las firmas públicas como SECURITY INVOKER y mueve la autorización y
lectura privilegiada a wrappers privados. Los helpers internos siguen revocados.

Las 14 suites SQL pasaron al incorporar la corrección temporalmente en cada
transacción en Test y revertirla junto a los fixtures. La suite documental verifica
lecturas propias, de miembros y administradores y rechazos de terceros/anónimos.
Esto acredita la corrección probada, **no su despliegue persistente**. No se aplicó
al proyecto de la app ni se alteraron las condiciones DT-07 o la evidencia física.
[Alcance de integración](integration-2026-10-30.md).

## Fuentes vigentes

- [Checklist de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod).
- [Confirmación y configuración Auth](https://supabase.com/docs/guides/local-development/cli/config),
  [redirecciones](https://supabase.com/docs/guides/auth/redirect-urls),
  [rate limits](https://supabase.com/docs/guides/auth/rate-limits) y
  [protección de contraseñas, Pro o superior](https://supabase.com/docs/guides/auth/password-security).
- [Backups: planes, límites y restauración](https://supabase.com/docs/guides/platform/backups).
- [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) y
  [uso de git/stdin y configuración](https://github.com/gitleaks/gitleaks/tree/v8.30.1).
