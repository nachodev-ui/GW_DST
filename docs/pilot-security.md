# DT-07 — Seguridad operativa del piloto

Auditoría inicial: **2026-10-22**. Estado actualizado: **2026-10-23**,
**en curso; piloto no habilitado**.
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
auditoría inicial siguiente. Las demás condiciones de DT-07 siguen pendientes.

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
| Google Maps             | Config nativa separa claves Android/iOS; no hay evidencia de restricciones en Google Cloud.                                                                                                                                                                     | Verificar restricción Android por package/certificado y SDK; iOS por bundle y SDK. La configuración del repo no demuestra restricciones efectivas.                                                     |
| Backups                 | Ambos devuelven `backups:null`, `physical_backup_data:{}`, `pitr_enabled:false`, `walg_enabled:true`.                                                                                                                                                           | No se listó ninguna copia recuperable; walg_enabled no prueba disponibilidad/retención ni restauración. Sin simulacro ejecutado.                                                                       |
| Detección de secretos   | Gitleaks 8.30.1 local: 13 commits, ~5,88 MB, cero hallazgos tras clasificar un falso positivo de contraste sRGB. Control positivo: clave sintética rechazada con exit 1.                                                                                        | Solo historial disponible localmente; CI escanea todo el historial fetched. Nueva entrega aún no ejecutada en Actions.                                                                                 |

Los límites leídos mediante config diff son una foto del entorno, no pruebas de
carga. También se solicitó una lectura del esquema `private` por Data API con
publishable en ambos proyectos: los dos la rechazaron con `PGRST106` (Invalid schema).
Esto confirma el rechazo de ese esquema; `pgrst.db_schemas` no apareció en la sesión
SQL. Confirmar el inventario completo de esquemas en Integrations → Data API →
Settings antes del piloto, conservando `private` fuera de la exposición.

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
2. Subir el mínimo de contraseña; documentar decisión de protección filtrada con
   responsable y plazo, sin activar un plan pago automáticamente. Verificar entrega
   SMTP con un buzón de prueba autorizado y decidir mitigación de bots/abuso tanto
   de Auth como de RPC de negocio. Los tests de cuentas no envían correo.
3. Verificar esquemas Data API, restricciones Google y alcance/caducidad del PAT de
   CI; confirmar MFA de administradores y responsables de incidentes.
4. Establecer backup cifrado fuera del proyecto y su responsable. Propuesta a
   aprobar: RPO ≤24 h y RTO ≤4 h; no son garantías actuales. Free requiere estrategia
   de exportación propia. No almacenar dumps en Git, CI artifacts ni carpetas públicas.
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

La pausa local de reintento y el mínimo de ocho caracteres del formulario no
cierran la condición 2: falta endurecimiento servidor y decisión documentada de
contraseñas/abuso. El operador mantuvo el proveedor de correo actual; no se
configuró SMTP ni se aumentaron cuotas. Las condiciones 3–5 siguen pendientes y
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

## Fuentes vigentes

- [Checklist de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod).
- [Confirmación y configuración Auth](https://supabase.com/docs/guides/local-development/cli/config),
  [redirecciones](https://supabase.com/docs/guides/auth/redirect-urls),
  [rate limits](https://supabase.com/docs/guides/auth/rate-limits) y
  [protección de contraseñas, Pro o superior](https://supabase.com/docs/guides/auth/password-security).
- [Backups: planes, límites y restauración](https://supabase.com/docs/guides/platform/backups).
- [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) y
  [uso de git/stdin y configuración](https://github.com/gitleaks/gitleaks/tree/v8.30.1).
