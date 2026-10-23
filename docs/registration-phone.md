# Registro con teléfono

## Flujo implementado

Fecha: 2026-10-23. La propuesta A anterior no estaba implementada: el formulario
todavía creaba la cuenta directamente desde correo y contraseña. Esta entrega
incorpora las rutas `/auth/phone` y `/auth/check-email`.

1. En `/access`, elegir «Registrarme», ingresar correo y contraseña de al menos
   ocho caracteres y pulsar «Continuar». Se validan las credenciales localmente;
   todavía no se llama a Auth ni se crea una cuenta.
2. La pantalla de teléfono muestra una bandera chilena vectorial y el prefijo fijo
   `+56 9`. La persona solo escribe los **ocho dígitos restantes** en un teclado
   numérico, con longitud máxima ocho. El prefijo no es editable; no se pide código
   de país ni el noveno dígito. Zod exige exactamente ocho dígitos y el envío arma
   `+569` más ese sufijo, por ejemplo `12345678` → `+56912345678`. Esto valida formato,
   no existencia, titularidad ni recepción de llamadas.
3. «Crear cuenta» ejecuta `signUp` con correo, contraseña y `options.data.phone`.
   Conserva el destino nativo `gasway://auth/confirm` y el comportamiento web
   existente. No hace una escritura posterior en perfiles sin sesión confirmada.
4. Si Supabase exige confirmar el correo, se muestra «Revisa tu correo» y un
   acceso al ingreso. La respuesta no permite afirmar si el correo ya tenía cuenta;
   el aviso contempla ese caso sin enumerar usuarios. Con sesión inmediata se
   continúa mediante los guards existentes.

## Memoria y navegación

El borrador usa Zustand sin persistencia. No pasa por parámetros de ruta,
almacenamiento, logs ni caché de consultas. El formulario inicial se vacía antes
de navegar. Volver desde teléfono borra la contraseña, pero conserva en memoria
el correo y los ocho dígitos para retomar. `/access` selecciona «Registrarme»,
repone el correo y pide nuevamente la contraseña; «Continuar» vuelve a teléfono
con los dígitos recuperados. Cambiar de correo inicia un teléfono vacío.
Completar el registro elimina el borrador y conserva solo el correo del aviso.
Recargar el proceso o abrir teléfono sin credenciales devuelve al acceso.

La pantalla de teléfono usa cabecera clara compacta, navegación de vuelta visible,
indicador de último paso y un solo campo con prefijo vectorial. El texto de ayuda
es breve; no utiliza los paneles informativos del diseño anterior. `Input` admite
un prefijo ReactNode genérico sin importar nada de la feature de autenticación.

## Límites y reintento

Se distinguen `over_email_send_rate_limit` (no se pudo enviar la confirmación por
límite de correos) y `over_request_rate_limit` (demasiados intentos de acceso).
Un HTTP 429 sin código usa el segundo mensaje. Tras cualquiera se introduce una
pausa local de 60 segundos con botón deshabilitado y cuenta regresiva, sin mostrar
un spinner de solicitud en curso. La persona puede volver al formulario y retomar;
el mensaje y la pausa permanecen en memoria. Después se habilita «Reintentar»
para un envío manual. La pausa **no predice** cuándo se libera el límite servidor:
el SDK instalado no expone `Retry-After`, y el envío podría seguir rechazado.

Eliminar cuentas no reinicia los límites del servicio de correo ni de IP. La
consulta de configuración cloud del 2026-10-23 confirmó `max_frequency=1m0s`;
no se dispararon registros/correos para provocar el error. Los límites globales de
dos correos/hora estaban documentados en la revisión previa de seguridad del piloto;
la consulta `config diff` actual no devuelve ese cupo y no se presenta como una
medición nueva. El proveedor integrado de Supabase documenta dos correos/hora;
ampliarlo requiere SMTP propio o un Send Email hook, no cambios en esta pantalla.
En esta corrección no se cambió la configuración Auth ni se saltó la confirmación.

Un bloqueo síncrono impide solicitudes simultáneas, incluso con dos pulsaciones
antes de actualizar el formulario. Los errores permiten reintentar explícitamente;
no hay reintentos automáticos. Una respuesta tardía después de abandonar no
redirige de nuevo a teléfono/confirmación. Salir después del envío final no puede
cancelar una cuenta que el servidor ya esté creando; una respuesta perdida tampoco
permite garantizar exactamente una ejecución entre reintentos. La contraseña
de una solicitud en vuelo permanece en su promesa hasta que esta termina.

## Contrato de datos y seguridad

Migración: `20261023180000_registration_phone.sql`.

- `public.profiles.phone text`, sin unicidad; perfiles anteriores conservan `NULL`.
- `CHECK` E.164 para escrituras y trigger de alta que valida tipo/formato y copia
  el teléfono en la misma transacción que el perfil. Valores presentes inválidos,
  incluido JSON `null`, rechazan el alta sin dejar una cuenta parcial.
- Las altas técnicas sin la clave `phone` siguen permitidas para compatibilidad.
  La app exige teléfono para los registros nuevos realizados con este flujo.
- El teléfono es un contacto privado no verificado; no habilita ingreso por SMS,
  OTP, permisos ni rol. El trigger fija `customer` aunque los metadatos pidan otro rol.
- RLS de lectura/edición propia se conserva. El único nuevo permiso de escritura
  es `UPDATE (phone)`; siguen vigentes los permisos anteriores de nombre, RUT y
  comuna. Otra cuenta y `anon` no pueden leer ni modificar el teléfono.
- Cambiar metadatos Auth después del alta no reemplaza el perfil: este es la
  fuente del contacto. Se permite editarlo o limpiarlo a `NULL` según el contrato
  nullable existente; no se incorpora una pantalla de edición en esta tarea.

## Validación y despliegue

Las regresiones iniciales `scripts/test-auth.cjs` y `scripts/test-confirmation.cjs` pasaron:
navegación real del handler inicial, validación, metadatos, limpieza de contraseña,
doble envío, errores/reintento, respuesta tardía, guards y confirmación PKCE.
Son pruebas sin renderizado ni llamadas reales a Auth.

`pilot_security.sql` amplía la suite existente con copia del teléfono, números
compartidos, compatibilidad sin teléfono, rechazo de entradas inválidas y rollback
del alta, edición propia, RLS cruzada y rechazo del rol editable. No añade una
novena suite ni cambia el fallo de concurrencia histórico 7/8.

Resultado de esta entrega:

- `npm run typecheck`: aprobado, una ejecución final.
- `node scripts/test-auth.cjs`: aprobado, incluida la navegación de los handlers
  de ambas pantallas, la confirmación y el borrado al retroceder por el navegador.
- `node scripts/test-confirmation.cjs`: aprobado.
- Migración aplicada en Gasway Test (`xnrueexpwzvxotgwmamj`) y
  `pilot_security.sql` aprobado con transacción y rollback; se ejecutó únicamente
  esta suite SQL afectada. No se reejecutó ni se reclasificó la regresión global.
- Tras aprobación explícita del operador, la misma migración se aplicó en
  Gasway Project (`gleltbrvpfvfgggcatpt`), configurado en la app. Verificación
  posterior de esquema/permisos sin registrar usuarios ni enviar correos.

Corrección de interfaz y recuperación del 2026-10-23: la regresión de Auth ahora
cubre sufijo estricto de ocho dígitos, bloqueo durante la pausa, mensaje de correo,
vuelta sin contraseña, recuperación de correo/teléfono y limpieza al cambiar de
cuenta. No cambió el contrato SQL ni se repitieron pruebas de base de datos.
La ejecución final de `node scripts/test-auth.cjs` y una única ejecución de
`npm run typecheck` pasaron. No se renderizó la app ni se tomaron capturas.
El operador eligió mantener el proveedor de correo actual; no se configuró SMTP
ni se aumentaron cupos. La pausa local mejora el reintento, sin resolver ni eludir
un límite que el servidor todavía esté aplicando.

La aplicación en Gasway Project fue rechazada inicialmente por la revisión
automática de aprobación, que limitó la autorización a implementación y Test.
Se detuvo esa operación; el operador aprobó explícitamente la aplicación fuera de
Test y solo entonces se ejecutó. No se cambiaron las URLs, allowlists ni ajustes Auth.

La prueba manual en teléfono sigue pendiente; no se abrió ni se compiló la app,
no se crearon cuentas reales ni se enviaron correos durante esta implementación.

El operador usa Expo conectado a Metro para desarrollo y pruebas. Para ver estas
pantallas debe cargar/recargar este checkout desde Expo; los cambios de registro
son JavaScript/TypeScript y no requieren una recompilación nativa. La advertencia
de recompilar solo corresponde a un APK autónomo con JavaScript incluido, que no
es el entorno de prueba actual.

Referencias: [datos y triggers de usuario](https://supabase.com/docs/guides/auth/managing-user-data),
[contrato de signUp](https://supabase.com/docs/reference/javascript/auth-signup)
y [límites de Auth](https://supabase.com/docs/guides/auth/rate-limits).
