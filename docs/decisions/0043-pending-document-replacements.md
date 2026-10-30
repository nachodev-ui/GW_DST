# ADR 0043 — Un pendiente por documento

Fecha: 2026-10-27. Estado: aceptado.

Reenviar una licencia creaba pendientes independientes para cada intento. El
administrador debía revisar todas las fotos, incluso las reemplazadas por su dueño.

Cada titular y tipo documental mantiene un único pendiente. Un nuevo envío cambia
los pendientes previos del mismo tipo a `replaced`; no altera otros tipos.
Ese estado conserva revisión y fecha de revisión nulas. Se distingue de
`superseded`, reservado para versiones revisadas: no inventa una decisión
administrativa ni bloquea el RUT antes de una aprobación.

La operación reutiliza el bloqueo del titular, compartido con la revisión, y dos
índices únicos parciales. Reintentar una ruta ya registrada devuelve su ID sin
reactivar el envío. Si el nuevo registro falla, se conserva el pendiente anterior.
Una aprobación vigente sigue operativa durante una nueva revisión o tras rechazo.

La migración regulariza duplicados previos por fecha/UUID, conserva archivos y
decisiones, y mantiene ACL/RLS. La revisión existente rechaza todo estado distinto
de pending tras bloquear y releer el documento: protege también las vistas obsoletas.

El panel cuenta y muestra un archivo actual por tipo. Las versiones anteriores
quedan en un historial plegado de solo consulta. get_owner_documents conserva
todas las versiones; los clientes reconocen replaced y lo excluyen del avance.
Desplegar SQL y recargar clientes coordinadamente en Test.
