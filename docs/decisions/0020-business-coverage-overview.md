# ADR 0020 — Cobertura visible para el negocio

Fecha: 2026-10-21. Estado: sustituida en la propiedad de cobertura por
[ADR 0021](0021-distributor-owned-coverage.md). La cobertura ya no la edita el conductor.

## Contexto

El cliente ve si un negocio tiene reparto para su comuna, pero el responsable no
tenía una vista para revisar las comunas de su equipo ni el motivo de un bloqueo.
La lista paginada de invitaciones no permite calcular una cobertura completa.

## Decisión

Incorporar **Mi negocio → Cobertura**, con vistas por comuna y conductor,
búsqueda y detalle en una hoja. Separar comunas con cobertura de comunas con
reparto disponible ahora. Las comunas guardadas por conductores sin habilitación
pueden consultarse, con su estado pendiente y sin contarlas como cobertura activa.

Una RPC `get_business_coverage` entrega el equipo actualmente afiliado, nombres,
comunas CUT oficiales y estados operativos mínimos. La función privada comprueba
la membresía owner/manager mediante `auth.uid()`, mantiene `search_path` vacío y
expone un wrapper público INVOKER con EXECUTE autenticado. No amplía RLS sobre
drivers/driver_communes ni entrega RUT, teléfonos, correos, direcciones o ubicaciones.

La disponibilidad distingue habilitación pendiente, no disponible, entrega activa
y disponible. La vista también contempla el horario y la habilitación/marcas del
negocio. No aplica el catálogo de producto: tener reparto no garantiza stock/precio
para un cilindro concreto. Se conserva la exclusión de autoasignación al comprar.

## Consecuencias

No hay una segunda lista editable de comunas del negocio. Cada conductor mantiene
sus comunas desde Reparto → Cobertura; el responsable revisa y coordina su equipo.
El polling de 30 segundos se limita a pantalla enfocada y app en primer plano.
El resumen usa la misma respuesta completa, sin totales de páginas parciales.
La pantalla puede consultar datos de un negocio no habilitado, indicando ese bloqueo.
La consulta no concede habilitación, disponibilidad ni permisos de conducción.
