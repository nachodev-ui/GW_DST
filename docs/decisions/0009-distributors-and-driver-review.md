# ADR 0009 — Distribuidores y revisión de solicitudes

Fecha: 2026-10-18. Estado: primera fase aplicada y suite SQL aprobada en cloud.

## Decisión

El distribuidor es una organización (`distributors`), no un tercer valor de
`profiles.role`. Sus responsables se registran en `distributor_members` como owner
o manager; una misma cuenta puede ser responsable y conductor. Esto no concede
permisos administrativos ni cambia el rol móvil. Un conductor tiene como máximo
una afiliación, en `drivers.distributor_id`.

La solicitud vive en `driver_applications`: pending, approved o rejected. Una
solicitud aprobada registra una decisión histórica; la autorización operativa sigue
dependiendo de `profiles.role` y `drivers.is_verified`. Revocar o suspender requiere
otra operación que trate entregas activas, ofertas y disponibilidad; esta fase no
introduce esa operación ni interpreta un rechazo como revocación.

La revisión inicial ocurre solo en SQL Editor como postgres, mediante
`private.review_driver_application`. Es SECURITY INVOKER, con search_path vacío,
sin EXECUTE para PUBLIC/anon/authenticated/service_role y sin wrapper público.
El operador revisa la identidad y la vinculación antes de aprobar; los responsables
del distribuidor todavía no tienen una API para confirmar afiliaciones.

La función bloquea conductor, solicitud y distribuidor, exige solicitud pendiente
y distribuidor verificado para aprobar. Cambia solicitud, perfil y habilitación e
inserta la auditoría en la misma transacción. Deja disponibilidad en false. Rechazar
exige motivo y no puede afectar conductores habilitados o con entregas activas.
La segunda revisión falla; los reintentos de solicitud conservan la decisión.

`decision_reason` es visible solo al postulante bajo RLS. El operador identificado
por una referencia manual, el usuario de base de datos y el momento quedan en
`private.driver_application_reviews`, sin lectura ni escritura del móvil. La
referencia del operador aporta trazabilidad manual, no autentica a un administrador.
El panel futuro necesitará identidad y autorización administrativa verificadas.

## Compatibilidad y límites

- La migración agrega datos y reemplaza solo la implementación privada de
  `request_driver_access()`. Conserva firma pública, roles, guards y RPC de pedidos.
- Las filas existentes se importan como approved si is_verified=true y pending
  en otro caso. No se inventan afiliaciones, motivos, operadores ni fechas de revisión.
- Los conductores existentes conservan su acceso, incluso con distributor_id NULL.
  Antes del piloto se deben revisar y vincular manualmente; no existe un distribuidor
  ficticio compartido ni una aprobación automática de negocios.
- El alta y verificación de negocios y sus responsables sigue siendo manual y
  privilegiada. Esta estructura no certifica cumplimiento SEC, tributario o municipal.
  Los antecedentes comerciales y su validación se diseñarán antes del onboarding real.
- `distributors.is_verified` es requisito de nuevas aprobaciones, todavía no un
  interruptor de suspensión del despacho. No usarlo para revocar entregas.
- No cambia catálogo, precio, stock ni despacho. Los pedidos todavía no identifican
  al vendedor y el matching continúa por conductor/comuna. Esa migración comercial
  será el siguiente paso antes de admitir varios distribuidores reales.
- Esta primera fase no modificó pantallas. ADR 0010 incorpora después estado/motivo
  en Mi cuenta, conserva compras y permite una nueva solicitud explícita tras rechazo.
- Sin reapertura automática, suspensión, panel web, notificaciones ni permisos de
  gestión de equipo. Los miembros leen solo su propia membresía y su organización.

## Aplicación y verificación

1. Confirmar migraciones anteriores hasta `20261018050000` en el proyecto correcto.
2. Aplicar completa `20261018195303_distributors_driver_review.sql` como postgres.
3. Ejecutar completo `supabase/tests/distributors_driver_review.sql`: prueba
   idempotencia, aislamiento RLS, permisos, rechazo, aprobación con afiliación,
   validación de entradas, repetición y auditoría. Revierte sus fixtures.
4. Usar `supabase/admin/review-driver-application.sql` para listar y resolver;
   `approve-test-driver.sql` ahora exige esta migración y un negocio verificado.

Para preparar un negocio de prueba, SQL Editor permite crear su registro y un
responsable ya registrado. Reemplazar nombre e identificadores; conservar
is_verified=false hasta revisar los antecedentes fuera de la app:

```sql
insert into public.distributors (name)
values ('NOMBRE DEL NEGOCIO') returning id;

insert into public.distributor_members (distributor_id, user_id, role)
values ('UUID_DEL_NEGOCIO', 'UUID_DEL_RESPONSABLE', 'owner');

-- Solo después de la revisión manual del negocio:
update public.distributors set is_verified = true where id = 'UUID_DEL_NEGOCIO';

-- Tras confirmar que el negocio desea recibir postulaciones (ADR 0012):
update public.distributors set accepts_driver_applications = true
where id = 'UUID_DEL_NEGOCIO' and is_verified;
```

Ejecución cloud confirmada el 2026-10-18 en Gasway Project (`gleltbrvpfvfgggcatpt`)
mediante CLI autenticada, como postgres. Se compararon los cuerpos de las 26 funciones
previas con el repositorio y se verificaron columnas, restricciones, RLS y publicación
Realtime. Las migraciones 20261018020000 a 20261018050000 ya estaban aplicadas
manualmente; se conciliaron sus entradas en el historial sin repetirlas. El dry run
identificó solo la migración nueva, aplicada completa mediante db push sin seed,
roles ni cambios de Vault.

La suite completa terminó sin errores. Los conteos de usuarios Auth, perfiles,
conductores, negocios, miembros, solicitudes y revisiones coincidieron antes y después:
ningún fixture quedó persistido. RLS está activo en las cuatro tablas nuevas.
Se listó una solicitud pendiente y se rechazó por instrucción explícita del usuario,
con motivo administrativo, fecha y una revisión en auditoría. La verificación posterior
confirmó status=rejected, role=customer, is_verified=false, is_available=false y cero
solicitudes pendientes. No hay negocios registrados ni se inventó un negocio
verificado. Hay además un conductor habilitado anterior sin afiliación.

Los advisors de seguridad no reportaron problemas del esquema nuevo. Advirtieron
que la [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
de Auth está desactivada; no se cambió esa configuración.

Antes del uso real: completar datos/afiliación de postulación, generar tipos reales y probar dos
sesiones que revisan la misma solicitud: solo una debe crear una decisión y un evento.

Referencias técnicas consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
y [funciones Postgres](https://supabase.com/docs/guides/database/functions).
