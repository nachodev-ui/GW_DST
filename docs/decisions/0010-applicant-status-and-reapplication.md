# ADR 0010 — Estado de postulación y nueva solicitud

Fecha: 2026-10-18. Estado: implementado; migración aplicada y suite SQL aprobada.

## Decisión

La postulación para repartir no restringe las compras. `resolveZone` habilita driver
solo cuando coinciden `profiles.role=driver` y `drivers.is_verified=true`; los demás
perfiles autenticados usan la zona customer. La autorización operativa sigue en
Postgres y los guards de conductor no cambian. Los enlaces antiguos `/pending`
redirigen a `/customer/account`, bajo el guard customer.

Mi cuenta muestra pending/approved/rejected, motivo y fecha de revisión. Las cuentas
anteriores aprobadas pueden no tener motivo/fecha históricos; no se inventan. La
consulta propia se valida con zod y usa una caché por usuario, independiente de la
consulta de autorización. Si falla, muestra reintento local y permite seguir comprando.
Se actualiza al volver al primer plano, cada 30 segundos en primer plano y manualmente;
Auth limpia ambas cachés al cambiar de identidad. Un conductor habilitado entra a
su zona y ve confirmación de acceso aprobado.

La composición usa las fuentes y tokens centrales vigentes; el rediseño de producto
del 20 de octubre reemplaza la paleta anterior (ver docs/design.md). Un solo bloque de
postulación usa un borde de marca, jerarquía textual y motivo seleccionable; el
estado no depende del color. La búsqueda inicial de ui-ux-pro-max devolvió una
landing operativa; no se trasladó su estructura ni su paleta a la pantalla nativa.
Se usan las primitivas existentes y controles con texto, sin dependencias nuevas.

## Regla de nueva postulación

- No ocurre automáticamente. El usuario rechazado puede volver a postular después
  de revisar y resolver el motivo informado. La interfaz exige abrir la confirmación
  y luego confirmar explícitamente esa declaración; permite cancelar.
- La RPC `reapply_driver_access()` no recibe identidad ni datos de autorización.
  Exige auth.uid, perfil customer, conductor no verificado y sin entrega activa.
  Bloquea conductor y solicitud en el mismo orden que la revisión administrativa.
- Solo transforma rejected en pending y limpia el motivo/fecha de la decisión actual;
  fija una nueva fecha de solicitud y disponibilidad=false. Un reintento en pending
  es idempotente y no cambia su fecha. Una solicitud aprobada no se reabre.
- No concede rol, aprobación ni afiliación. Las revisiones previas permanecen en
  `private.driver_application_reviews`; la siguiente revisión agrega otra fila.
  Ese historial sigue siendo administrativo, no un recurso público del postulante.
- `request_driver_access()` conserva su comportamiento: nunca reinicia un rechazo.
  La RPC privada es SECURITY DEFINER con search_path vacío y el wrapper público
  SECURITY INVOKER; solo authenticated tiene EXECUTE. Las tablas no ganan permisos.

Revisar/corregir los antecedentes es una declaración del usuario; el servidor valida
la elegibilidad para solicitar revisión y administración vuelve a comprobar los
antecedentes antes de aprobar. No se presume resuelto un requisito comercial o legal.
No se define espera arbitraria, aprobación automática ni suspensión.

## Verificación y operación

- `node scripts/test-auth.cjs`: guards, validación y regresiones de sesión aprobados.
- `node scripts/test-driver-application.cjs`: contrato, consulta propia, errores,
  confirmación/cancelación y acciones por estado aprobados con hooks simulados.
  No renderiza la app ni realiza llamadas de red.
- Un `npm run typecheck` aprobado y ESLint de los archivos móviles modificados aprobado.
- Aplicada `20261018205226_driver_reapplication.sql` como postgres en Gasway Project
  (`gleltbrvpfvfgggcatpt`), tras dry run con esa única migración pendiente, sin seed/Vault.
- Ejecutado completo `supabase/tests/driver_reapplication.sql`: identidad, permisos,
  RLS, rechazo previo, reintentos, nueva revisión y conservación de auditoría aprobados;
  revierte sus fixtures y no modifica solicitudes reales. Los conteos de usuarios,
  perfiles, conductores, negocios, solicitudes y revisiones coincidieron antes/después;
  las solicitudes reales conservan sus estados approved/rejected.
- Advisors: mismo aviso de Auth por protección contra contraseñas filtradas desactivada;
  sin problemas nuevos de seguridad del esquema.

No se abrió la app ni se hicieron capturas, emuladores o verificaciones visuales.
Antes del piloto falta probar el flujo en dispositivo, carreras con dos conexiones,
datos/afiliación del postulante, confirmación por el negocio, suspensión y panel admin.
