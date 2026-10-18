# ADR 0008 — Progreso de entrega y actualización del cliente

Fecha: 2026-10-18. Estado: implementado; migración y suite SQL pendientes de aplicar/ejecutar.

## Decisión

`advance_driver_order(p_order_id, p_status)` permite exclusivamente
`accepted → on_the_way → delivered` al repartidor aprobado asignado. La identidad
sale de `auth.uid()`, con rol en profiles y verificación en drivers. Bloquea primero
la fila del repartidor y luego el pedido, como aceptación/disponibilidad; valida
la transición tras el bloqueo. Cliente, otro repartidor, usuario sin sesión,
repeticiones, saltos, retrocesos y cancelación por esta RPC quedan rechazados.

El wrapper público es SECURITY INVOKER. La implementación SECURITY DEFINER vive
en private, con search_path vacío y EXECUTE solo para authenticated. Este privilegio
es necesario para escribir sin conceder UPDATE de pedidos al móvil; la función
verifica explícitamente identidad, propiedad y transición. No cambia políticas RLS
ni grants de tablas. Los operadores de base de datos conservan sus privilegios administrativos.

Se reutilizan guard_order_transition y record_order_event: evento con actor y
from/to, estado y marcas temporales se confirman en la misma transacción.
delivered_at ya existe; la RPC lo fija al entregar, preserva accepted_at y el trigger
actualiza updated_at. No se agrega una marca on_the_way_at: su fecha está en el evento.
Un reintento después del éxito se rechaza; la app invalida/relee incluso al fallar
para resolver una respuesta de red ambigua sin avanzar otro paso automáticamente.

La publicación supabase_realtime ya incluye orders desde el esquema inicial. La
nueva migración consulta pg_publication_tables y agrega orders solo si falta.
Mantiene SELECT limitado a participantes. El filtro customer_id del canal reduce
tráfico; RLS sigue siendo la autorización, conforme a la
[documentación de Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

El layout customer monta una única suscripción para sus pedidos. Los avisos solo
invalidan el prefijo TanStack Query por usuario (lista, detalle y eventos), sin
consumir payloads como datos de UI. Cada consulta valida la respuesta con zod.
Al conectar/reconectar y al volver a primer plano se invalidan las consultas. Si
el canal aún no está conectado, falla o se cierra, se usa un intervalo de 15 s
solo con AppState activo. Eventos recibidos en segundo plano quedan pendientes
hasta volver. El desmontaje/cambio de identidad elimina canal, listener e intervalo.

La pantalla driver ofrece una acción por estado y confirma la entrega con Alert.
Tras entregar, el caché de pedido activo queda vacío y get_driver_order(null) ya
excluye terminales. La disponibilidad sigue desactivada desde aceptación: el
repartidor puede reactivarla manualmente en ofertas al no tener pedido activo.
La línea de tiempo cliente usa los eventos reales, también si hubo cancelación,
y los tokens centrales. Las features de ambos roles no se importan entre sí.

## Validación y operación

- `supabase/tests/driver_order_progress.sql`: un DO con usuarios y datos propios,
  identidad authenticated, pruebas de autorización/transiciones/eventos/marcas,
  lista activa, aislamiento de lectura, grants/RLS y publicación. Rollback interno
  por excepción capturada incluso con autocommit; secuencias pueden avanzar.
- `node scripts/test-driver-order-progress.cjs`: assertions sin red sobre canal,
  invalidación, fallback, AppState, limpieza, mutación, zod y caché de activos.
- Aprobadas las assertions nuevas y las existentes de ofertas/pedidos, el lint de
  archivos móviles modificados y un único typecheck. Sin verificaciones visuales.
- Aplicación manual: SQL Editor como postgres, primero todas las migraciones previas,
  luego `20261018050000_driver_order_progress.sql`, luego el DO completo de la suite.
  Detenerse ante cualquier error; éxito termina con avisos PASS y fixtures revertidos.
- Pendiente: ejecutar SQL, probar concurrencia real con cancelación, reconexión,
  cambio de cuenta y confirmación en dispositivo físico. La suite no prueba el
  transporte WebSocket ni simula carreras entre dos conexiones.

Sin tracking, mapas, push, pagos en línea, cancelación driver ni paquetes nuevos.
