# Diagnosticar un ingreso rechazado

Una cuenta confirmada con identidad email y contraseña configurada puede recibir
`invalid_credentials`. Esos registros no prueban que el ingreso con contraseña
funcione: un evento login puede proceder de la confirmación por enlace.

Para comparar el ingreso directo con la app, desde la raíz del repositorio, en
PowerShell 7 con Node instalado:

```powershell
pwsh -File ./scripts/diagnose-login.ps1
```

El script lee la configuración pública de `apps/mobile/.env` con Node. Las variables
ya exportadas en la terminal tienen prioridad. Muestra la URL consultada y pide
correo y contraseña; esta última se ingresa oculta y no como argumento ni en SQL.
No ejecutar con transcripción o depuración de comandos habilitada.

Solo imprime el estado HTTP, el código de error y el resultado. No guarda ni
imprime contraseña, hash o tokens. Envía una solicitud real a Auth, sujeta a sus
límites de intentos. Si funciona, cierra únicamente la sesión de diagnóstico con
`scope=local`; un fallo de cierre se informa y los tokens se descartan de memoria.
No cambia contraseña, confirmación, roles ni datos de la cuenta.

- HTTP 200: las credenciales funcionan directamente. Comparar el proyecto de la
  app en ejecución con la URL impresa; revisar variables de entorno del proceso
  que inició Metro y recargar la app tras corregirlas.
- `invalid_credentials`: el rechazo se reproduce fuera de la app. Revisar Auth
  Logs para el instante de esta prueba antes de decidir una recuperación.
- Otro código o fallo de conexión: usar ese resultado para investigar configuración,
  límites o conectividad; no concluir que la contraseña es incorrecta.

El script no detecta la configuración incluida en una app ya compilada ni resuelve
por sí solo el rechazo. No repetir registros de una cuenta existente como método
de recuperación: la respuesta puede ocultar que la cuenta ya existe y no garantiza
el envío de un correo nuevo. La app aún no tiene flujo de recuperación de contraseña.

## Restablecimiento administrativo sin depender del correo

Para el propietario del proyecto, cuando el rechazo directo está confirmado y
se desea reemplazar la contraseña conservando la cuenta:

```powershell
pwsh -File ./scripts/reset-auth-password.ps1 -UserId UUID_DE_AUTH -Email correo@ejemplo.cl
```

Reemplazar UUID y correo por los de la cuenta en Authentication → Users. El script
muestra el proyecto y pide una clave administrativa del mismo proyecto, disponible
en Settings → API Keys (secret o service_role heredada). Ingresarla únicamente en
el prompt oculto; nunca pegarla en el chat, argumentos o EXPO_PUBLIC_*.
La clave tiene privilegios elevados; esta herramienta es exclusivamente local y
no forma parte de la app móvil. No usar transcripción ni depuración de comandos.
Las claves `sb_secret_*` se envían solo en `apikey`; las `service_role` heredadas
también usan Bearer. Las solicitudes identifican la herramienta con un User-Agent
propio de terminal, porque Supabase rechaza las secret keys usadas desde navegadores.

Primero verifica por API que UUID y correo coincidan. Después pide dos veces la
nueva contraseña y envía únicamente el campo password a Auth Admin. Supabase aplica
su política de contraseñas. No modifica directamente tablas Auth, roles ni pedidos,
ni desactiva confirmaciones. Un cambio puede generar una notificación de seguridad
si el proyecto la tiene habilitada; no requiere recibir un enlace para completarse.

Tras HTTP 200, ejecutar `diagnose-login.ps1` con la nueva contraseña y probar la
app. Ante un fallo de red durante el cambio, probar primero el ingreso: la solicitud
puede haberse aplicado aunque no llegara su respuesta. El restablecimiento permite
recuperar el acceso, pero no demuestra por qué se rechazaban las credenciales previas.

Ambos scripts se verificaron con respuestas simuladas, sin credenciales reales.
La comprobación contra el proyecto debe realizarla su propietario en su terminal.
La regresión de headers y validación de cuenta se ejecuta sin red con
`pwsh -File ./scripts/test-reset-auth-password.ps1`.

Referencias: [actualización administrativa](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid),
[claves API y restricciones](https://supabase.com/docs/guides/getting-started/api-keys),
[ingreso con contraseña](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
[cierre de sesión](https://supabase.com/docs/reference/javascript/auth-signout) y
[registro de una cuenta existente](https://supabase.com/docs/reference/javascript/auth-signup).
# Recuperación del estado de sesión

El reintento de inicialización activa el estado de carga y limpia el error desde
la acción del usuario. Un fallo al crear el cliente se comunica de forma diferida,
con protección tras desmontar. `node scripts/test-auth.cjs` comprueba el fallo de
configuración, el reintento exitoso y la exclusión de eventos de una suscripción cerrada.
