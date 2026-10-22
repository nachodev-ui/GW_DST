# ADR 0005 — Sesión segura y acceso por rol aprobado

Fecha: 2026-10-17. Estado: aceptado; migración pendiente de aplicación.

## Decisión

El trigger privado crea profiles con customer explícito, ignorando metadata de Auth.
La nueva migración posterior conserva las existentes y completa perfiles ausentes.
No se permite escribir role desde la app. Se preservan RLS y los grants de edición
de campos de perfil que ya existían; esta entrega no agrega formularios para ellos.

request_driver_access() no recibe argumentos. Un wrapper público SECURITY INVOKER
llama a una función privada SECURITY DEFINER, necesaria para crear la fila bajo
privilegios del servidor sin conceder INSERT al cliente. Tiene search_path vacío,
nombres calificados, identidad obligatoria auth.uid() y EXECUTE solo autenticado.
La función inserta is_verified=false/is_available=false, no cambia role y es
idempotente por clave primaria. No reinicia una aprobación existente.

Se reutiliza is_verified en vez de duplicar el estado de aprobación: fila ausente
significa sin solicitud; false, pendiente; true, aprobada. La zona driver exige
además profiles.role=driver. Un rol driver sin fila o verificación entra en espera.
La aprobación requiere cambiar ambos valores en una transacción administrativa
confiable. Revocar debe quitar la verificación y revisar sus efectos de negocio
antes de incorporar entregas reales. No hay autoaprobación ni API admin móvil.

El cliente Supabase usa EXPO_PUBLIC_SUPABASE_URL y
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Las sesiones nativas se guardan únicamente
en SecureStore, accesible con el dispositivo desbloqueado y sin migración a otro
dispositivo. Se fragmenta JSON ASCII para valores grandes. Un manifiesto se publica
al terminar; si una escritura falla, permanece la sesión anterior completa. Un
cierre elimina manifiesto y fragmentos. Una interrupción de proceso puede dejar
fragmentos huérfanos cifrados, sin manifiesto accesible. Web no persiste sesión.

AuthProvider mantiene la sesión y el ciclo de refresco en primer plano; TanStack
Query consulta acceso por usuario con validación zod, sin tipos SQL inventados.
El guard Stack.Protected no concede acceso si falla la consulta. Revalidación
manual, al volver al primer plano y periódica cada 30 segundos; el guard es UX,
la autorización real siempre depende de RLS y funciones del servidor. No se
autoriza desde user_metadata. Se limpia caché en eventos Auth.

## Interfaz y alcance

Los tokens visuales históricos quedan reemplazados por el sistema vigente de
docs/design.md. Se mantiene el encabezado alineado a
la izquierda, acento vertical y formularios sin tarjetas decorativas. Etiquetas
visibles, áreas táctiles de 52, errores por campo, autofill y pegado habilitados.
La búsqueda general de diseño devolvió una landing de operaciones poco pertinente;
se descartó. La búsqueda específica de autenticación accesible sí respalda autofill,
pegado y nombres accesibles. Sin fuentes, kits UI ni dependencias nuevas.

Solo hay acceso por correo/contraseña, solicitud y zonas mínimas. Confirmación
de correo se completa fuera de la app y luego se inicia sesión. Quedan pendientes
aprobación admin, recuperación de contraseña, RUT/comunas y pruebas reales. No se
implementaron pedidos, tracking ni pagos ni se activaron servicios.

## Verificación y operación

Assertions locales: selección de zonas, validación de respuestas y credenciales,
roundtrip Unicode grande, fallo de escritura, renovación y borrado seguro simulado.
Suite SQL autocontenida con rollback preparada en supabase/tests/auth_roles.sql.
El typecheck inicial detectó AppState.currentState nullable; se corrigió la firma
para aceptar null/undefined. La verificación posterior a la corrección y a la
alineación con SDK 57 pasó en una ejecución autorizada antes del commit.
No se ejecutó SQL ni consultas contra el proyecto cloud, ni comprobaciones visuales.
El archivo de migración se creó directamente porque la CLI falló al escribir su
telemetría fuera del workspace. Aplicar el archivo completo en SQL Editor como
postgres y ejecutar después la suite; revisar historial antes de usar CLI db push.

Referencias: [SecureStore SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
[rutas protegidas](https://docs.expo.dev/router/advanced/protected/),
[Auth Expo](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth).
