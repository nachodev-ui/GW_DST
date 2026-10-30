# DT-07, condición 2: contraseñas, correo y abuso

Fecha: **2026-10-23**. Condición 2: **Aprobada (2026-10-23)**.
Gmail SMTP configurado en Test y app; recepción real comprobada en Test.
Responsable operativo y de las excepciones: **Nacho, propietario de Gasway**.
Revisión y vencimiento de las excepciones: **2026-10-30**, o antes de abrir el
piloto a usuarios externos, lo que ocurra primero. El piloto sigue bloqueado.

## Contraseñas

Por solicitud del propietario del **2026-10-23**, el registro y el helper
administrativo de restablecimiento pasan a **mínimo 8 caracteres, una mayúscula
A-Z y un número 0-9**. No se exigen minúsculas ni símbolos. Se permiten espacios,
frases y pegado desde gestores; se cuentan puntos de código Unicode sin recortar
ni transformar la contraseña. El ingreso conserva compatibilidad con claves
existentes. Esta decisión reemplaza el mínimo de 15; ver [ADR 0030](decisions/0030-accessible-password-policy.md).

**Estado de despliegue (2026-10-23):** tras autorización explícita del propietario,
aplicado mínimo 8 y `letters_digits` en Test (`xnrueexpwzvxotgwmamj`) y app
(`gleltbrvpfvfgggcatpt`). Cada previsualización mostró solo longitud y composición;
diff posterior de campos declarados vacío en ambos. Se conservaron cuotas,
redirecciones y SMTP. Sin cambios de cuentas ni envío de correos para esta revisión.
El formulario muestra tres filas con cruz/check que se actualizan al escribir,
usando las mismas reglas que la validación del registro.

Supabase solo ofrece presets de composición: `letters_digits` exige una letra de
cualquier caja y un número; el preset con mayúscula también exigiría minúscula.
El overlay usa `letters_digits` para aceptar todas las claves válidas del registro.
**La mayúscula se valida en la app y el helper, no es una garantía del servidor**:
una llamada directa a Auth puede usar solo minúsculas y números.
La política no declara cumplimiento de NIST ni sustituye detección de filtradas.

Configuración vigente en **Test y app** con overlay parcial y lectura posterior:

| Campo                           | Anterior     | Actual                                |
| ------------------------------- | ------------ | ------------------------------------- |
| Mínimo de contraseña            | 15           | 8                                     |
| Composición servidor            | Sin exigir   | Una letra y un número                 |
| Ingreso/registro por IP         | 30/5 min     | 10/5 min                              |
| Verificación por IP             | 30/5 min     | 10/5 min                              |
| Intervalo de correo por usuario | 60 s         | 120 s                                 |
| Correos del proyecto            | 2/h          | 5/h con Gmail SMTP en ambos proyectos |
| OTP                             | 8 caracteres | 8 caracteres                          |

Las cuotas IP usan token bucket; no son un límite por cuenta ni eliminan ataques
distribuidos. No se saturaron endpoints. La pausa de reintento de la app permite
intentar manualmente después de 60 s; no promete que haya vencido una cuota del
servidor. Las redirecciones de la condición 1 no se incluyen en el overlay.

### Decisión de contraseñas filtradas

Se conserva Supabase Free y se acepta **temporalmente** el riesgo residual de
credential stuffing. La protección integrada requiere Pro o superior; permanece
desactivada y el WARN del advisor sigue siendo válido. No se contrata un plan.
La política de contraseñas y los límites de Auth reducen riesgos diferentes y **no detectan
contraseñas filtradas**. No consultar HIBP desde el móvil como control de seguridad:
un cliente modificado lo omitiría.

Nacho debe resolver antes del **2026-10-30**, y antes de apertura externa, una
protección servidor de contraseñas comprometidas o un cambio de plan autorizado
explícitamente. Si no hay decisión implementada y probada a esa fecha, se mantiene
cerrado el piloto; no hay renovación automática de esta excepción.
[Capacidad y límites oficiales](https://supabase.com/docs/guides/auth/password-security).

## SMTP gratuito y dominio

Un dominio es un nombre propio comprado o cedido; DNS permite demostrar que lo
controlas y publicar SPF/DKIM/DMARC. No hace falta un sitio web ni contratar un
buzón empresarial para autenticar un dominio de envío. Comprar un dominio tiene
un costo independiente del plan gratuito de correo: aquí no se compra ninguno.

| Opción investigada           | Ventaja                                                                | Requisito o límite relevante                                                                     |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Resend Free                  | SMTP para transaccionales, documentación e integración Supabase claras | 3.000/mes y 100/día; SMTP exige dominio verificado y clave API                                   |
| Brevo Free                   | 300 envíos/día, sin vencimiento del plan                               | Autenticación de dominio; branding Brevo y cola al agotar cuota                                  |
| Gmail SMTP, cuenta exclusiva | Costo cero sin dominio propio; Google autentica su dominio             | Cuenta con 2FA y contraseña de aplicación; controles antispam variables, sin garantía de entrega |

**Elección para las pruebas actuales:** Gmail SMTP; se recomienda cuenta exclusiva,
remitente igual al usuario SMTP, `smtp.gmail.com:465` con TLS. No se reutiliza el
Gmail personal como remitente sin autorización expresa. El operador autorizó en
esta conversación usar su Gmail actual tras el bloqueo de Google al crear otra
cuenta por reutilización del teléfono; no se intenta eludir ese bloqueo. El script
acepta ese remitente con una contraseña de aplicación revocable. Es una solución temporal
de desarrollo: no se presenta como equivalente a correo transaccional de producción.
Con dominio disponible, la opción preferida para el piloto externo es Resend Free.
Nacho revisará esta transición antes de la apertura y como máximo el 2026-10-30.

Google publica un límite general de 500 correos/día para Gmail personal, pero puede
bloquear antes por abuso o reputación. Se configuraron solo **5/h por proyecto** en
Supabase (dos proyectos: hasta 240/día teóricos en conjunto), con uso exclusivo
para Auth. Esto no reserva cuota ni garantiza disponibilidad. Ante rechazos o
agotamiento: detener pruebas, revisar Auth/Google y no aumentar cuotas ni pagar
automáticamente. No habilitar campañas ni seguimiento de enlaces de confirmación.

### Activación local, sin claves por el chat

1. Usar el Gmail actual autorizado por el operador. Si Google permite crear una
   [cuenta exclusiva](https://accounts.google.com/signup) en el futuro, preferirla.
2. Activar [verificación en dos pasos](https://myaccount.google.com/security).
3. Crear una [contraseña de aplicación](https://myaccount.google.com/apppasswords)
   denominada Gasway SMTP. Si la opción no aparece, revisar restricciones de la
   cuenta; no desactivar 2FA ni utilizar la contraseña principal como alternativa.
4. Ejecutar primero sobre **Test**, sustituyendo el remitente:

```powershell
pwsh -NoProfile -File scripts/security/configure-gmail-smtp.ps1 -ProjectRef xnrueexpwzvxotgwmamj -Sender CUENTA_EXCLUSIVA@gmail.com
pwsh -NoProfile -File scripts/security/configure-gmail-smtp.ps1 -ProjectRef xnrueexpwzvxotgwmamj -Sender CUENTA_EXCLUSIVA@gmail.com -Apply
```

El primer comando es de solo lectura. El segundo pide la contraseña de aplicación
con entrada oculta. Usa la sesión CLI administrativa existente, limita el diff a
SMTP/cuota de correo y conserva redirects, confirmación y los demás campos.
La clave se transmite a Supabase, que necesita conservarla para enviar correos;
localmente solo se mantiene en memoria/env del proceso hijo, se restaura el entorno
y se elimina el overlay temporal. Nunca se escribe en `.env`, argumentos, Git ni
logs. La comparación posterior verifica campos no secretos; solo una entrega real
puede validar la credencial. No envía correo por sí mismo.

El overlay de endurecimiento de contraseñas omite la cuota de correo para no
sobrescribir los 5/h al repetirlo después de configurar SMTP. El TOML principal
de desarrollo conserva 2/h y no es el baseline cloud. Tratar la contraseña de
aplicación como acceso sensible a la cuenta Google y revocarla al retirar SMTP;
el nombre «Gasway SMTP» es una etiqueta, no un aislamiento de permisos.

Tras verificar la recepción real desde Test, aplicar el mismo comando con
`-ProjectRef gleltbrvpfvfgggcatpt`. Registrar ambas configuraciones y la evidencia
real sin direcciones privadas, contraseñas ni enlaces. Si falla, inspeccionar el
estado cloud antes de repetir: un fallo de red puede ocurrir después del cambio.
Para retirar Gmail, desactivar custom SMTP en el panel correspondiente y revocar
la contraseña de aplicación de Google; esto vuelve al correo integrado limitado,
no a una solución apta para apertura pública.

### Repetir la prueba de recepción autorizada

El operador autorizó un buzón de Gmail en esta conversación. No se copia la
dirección al repositorio. Las cuentas sintéticas `example.invalid` del smoke no
envían correo y no demuestran SMTP. La prueba real se ejecuta **aparte**, en Test:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
$env:GASWAY_CONFIRMATION_TEST_EMAIL = Read-Host 'Buzón de prueba autorizado'
node scripts/security/check-confirmation-email.cjs
```

Usar una dirección nueva para Test; el script rechaza modificar cuentas existentes.
Si el buzón ya tiene cuenta, no eliminarla ni inventar un alias autorizado: acordar
otra dirección o alias con el propietario. El script envía una confirmación y
espera el enlace en su puente loopback; no pegarlo en el chat ni dejarlo en historial.
Para entregarlo al puente desde otra terminal:

```powershell
$received = Read-Host 'Enlace recibido (oculto)' -AsSecureString
$text = ([pscredential]::new('link', $received)).GetNetworkCredential().Password
try {
  $body = @{ url = $text } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:PUERTO/verify' -ContentType 'application/json' -Body $body | Select-Object ok
} finally {
  $received.Dispose()
  $text = $null
  $body = $null
}
```

Sustituir PUERTO por el número emitido. El script verifica PKCE, destino nativo,
confirmación servidor, rechazo de reutilización e ingreso; elimina la cuenta al
completar o al vencer su espera. Registrar fecha, proyecto, proveedor, llegada a
inbox/spam y latencia aproximada sin contenido sensible. La configuración sola o
una respuesta de envío aceptado no bastan.

Para comprobar solo transporte SMTP, verificar los encabezados del mensaje recibido
y cerrar después la sonda sin consumir el enlace:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:PUERTO/cleanup' -ContentType 'application/json' -Body '{}'
```

Esta fue la modalidad usada en esta entrega: recepción por Gmail y limpieza
inmediata. No se atribuye a esta ejecución una nueva prueba PKCE o de dispositivo.

## Decisión de bots y abuso

**Auth, controles actuales:** cuotas servidor anteriores, correo confirmado y
usuarios anónimos desactivados. No activar CAPTCHA antes de integrar su token en
el cliente: bloquearía el registro/ingreso móvil. Se elige **Cloudflare Turnstile**
para una futura apertura, con página HTTPS controlada, integración nativa y pruebas
de token ausente, inválido, vencido y reutilizado. La secret solo va en Supabase;
el site key es público. No está implementado ni activado.

**RPC de negocio, controles actuales:** denegación a anon, auth.uid/RLS y membresías
servidor, aprobación confiable de negocios/conductores, lote de invitaciones de
1–100, compra idempotente y stock/asignación atómicos. Estos controles protegen
integridad/autorización; no son una cuota de tráfico ni detienen spam de una
cuenta válida. Las invitaciones de negocio no envían correos Auth.

**Decisión antes de apertura:** añadir cuotas atómicas servidor por identidad y
negocio en las implementaciones privadas de las RPC de escritura. Presupuesto
inicial propuesto: 5 compras nuevas/10 min/cliente, 100 destinatarios de invitación/h
por negocio (sumando todos sus responsables), 30 cambios comerciales/min/negocio.
Mantener reintentos idempotentes y progreso/cancelación de entregas existentes;
no bloquear operación activa por una cuota de compras. No basarse en UUID enviados
por el cliente ni IP de headers manipulables. Probar concurrencia, otro miembro
del mismo negocio y llamadas directas a la API, además de la app.

Una cuota dentro de una transacción que hace rollback no cuenta intentos fallidos:
no declararla protección de todos los requests. Para apertura se requiere además
presupuesto por IP/tráfico en una frontera confiable y vigilancia del consumo;
si se usa gateway, impedir el bypass directo de las RPC protegidas. No instalar un
WAF delante del cliente dejando la API original abierta y llamarlo mitigación.

Responsable: Nacho; plazo **2026-10-30 o antes de apertura** para implementar y
validar Turnstile/cuotas, o mantener cerrado el entorno. Durante desarrollo revisar
Auth logs y consumo antes/después de cada sesión de pruebas; detener registros
nuevos ante volumen inesperado o errores 429/SMTP sostenidos. No hay alertas
automáticas implementadas. Concluida la condición 2, las condiciones 3–6 de DT-07
siguen siendo requisitos independientes para habilitar el piloto.

## Evidencia de esta entrega

- Overlay Auth aplicado en Test y app; diff posterior de campos declarados vacío.
- Regresión local Auth y helper administrativo correctos; sin render ni emulador.
- Typecheck móvil aprobado después de los cambios; sin instalar dependencias.
- Configurador SMTP probado con fixtures: solo lectura sin pedir clave ni escribir,
  aplicación, fallo CLI y rechazo de cambios fuera de alcance; en todos los casos
  protege la salida, restaura el entorno y elimina el overlay temporal. Repetir con
  `pwsh -NoProfile -File scripts/security/test-configure-gmail-smtp.ps1`.
- Configurador SMTP comprobado en modo solo lectura en Test; no activó SMTP,
  no envió correo y no usó credenciales SMTP.
- Smoke Auth/Data API real aprobado en Test: correo sin confirmar rechazado,
  aislamiento entre cuentas, metadata sin escalamiento, rol protegido y rechazo
  de anon. Dos cuentas temporales eliminadas y sesiones locales cerradas; sin correo.
- Prueba SMTP real del **2026-10-23, 20:42:18 America/Santiago**: confirmación
  recibida en Gmail con etiqueta INBOX, remitente Gasway y encabezado
  `X-PM-Metadata-project-ref` de Test. `Received` identifica el host de Test y
  `smtp.gmail.com`, autenticación UTF8SMTPSA y TLS 1.3. No hay cabeceras de
  Authentication-Results en esta entrega al propio buzón: no se declara una
  comprobación independiente de SPF/DKIM/DMARC para otro proveedor destinatario.
  No se abrió ni registró el enlace; la condición 1 conserva su evidencia previa.
  La sonda se cerró por su puente `/cleanup`: cuenta temporal eliminada, sesión
  cerrada y memoria liberada. No quedó una cuenta nueva pendiente en Test.
- Advisor de app repetido el 2026-10-23: único hallazgo
  `auth_leaked_password_protection`, WARN vigente; no se activó un plan pago.
- El operador aplicó el perfil SMTP en Test y app con la clave ingresada localmente.
  Ambas configuraciones no secretas coinciden con el perfil; el último diff Auth
  fue vacío en ambos y conservó en ese momento mínimo 15, cuotas IP e intervalo de 2 min.
  La credencial SMTP de app no se probó mediante un segundo correo: la recepción
  real corresponde a Test. No se crean cuentas de prueba en app.
- **Aprobada (2026-10-23):** mínimo elevado, decisión de filtradas con responsable
  y vencimiento, entrega SMTP real y decisión diferenciada de abuso Auth/RPC.
  Esto no declara CAPTCHA/cuotas de negocio implementados ni habilita DT-07 completo.

### Revisión de contraseña e indicador del 2026-10-23

- Autorización explícita del propietario para Test y app; mínimo 8 y
  `letters_digits` aplicados secuencialmente con diff posterior vacío. Reemplaza
  el mínimo 15 de la evidencia previa; la mayúscula sigue siendo validación app/helper.
- Indicador del registro conectado al valor actual del campo y a las mismas reglas
  de zod, con cruz/check, colores del tema y estado accesible por requisito.
- `node scripts/test-auth.cjs` y `npm run typecheck` aprobados tras esta revisión.
  Sin render ni emulador; revisión visual en dispositivo pendiente. Sin envío de
  correos ni cuentas creadas para esta aplicación de configuración.

## Fuentes consultadas el 2026-10-23

- [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp),
  [cuotas Auth](https://supabase.com/docs/guides/auth/rate-limits),
  [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).
- [Resend: cuotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
  [requisitos SMTP](https://resend.com/docs/send-with-smtp).
- [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan),
  [dominio](https://help.brevo.com/hc/en-us/articles/35852083084178-Domain-setup-for-better-email-deliverability).
- [Contraseñas de aplicación Google](https://support.google.com/accounts/answer/185833),
  [SMTP y TLS](https://developers.google.com/workspace/gmail/imap/imap-smtp),
  [límites Gmail](https://support.google.com/mail/answer/22839).
