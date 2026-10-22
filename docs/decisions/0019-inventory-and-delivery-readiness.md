# ADR 0019 — Stock visible y disponibilidad de reparto

Fecha: 2026-10-21. Estado: aceptada.

## Contexto

Gasway cloud tiene productos publicados con stock, pero no tiene conductores
habilitados y afiliados. La búsqueda anterior excluía esos negocios por cobertura;
la app mostraba una búsqueda vacía sin distinguir inventario de capacidad de entrega.

## Decisión

`list_delivery_options` conserva negocios verificados, marca habilitada, producto
activo/publicado y stock suficiente para la cantidad. Devuelve `stock` y
`has_coverage` por separado de `has_available_driver`. La cobertura sigue derivando
de las comunas de conductores habilitados del negocio. No devuelve identidades ni
datos privados de conductores. La búsqueda puede mostrar un negocio sin cobertura,
con compra deshabilitada y explicación explícita.

La app comparte una regla de presentación entre tarjetas, ranking y confirmación:
precio informado, cobertura, horario permitido y conductor disponible. El servidor
conserva toda la autorización, aceptación atómica y reserva transaccional existentes.
No se aprueban conductores ni se inventan precios para desbloquear compras.

## Consecuencias

Tener stock no implica poder repartir. Sin canje exige su propio precio publicado.
La app deja de leer el precio global histórico de `products`; los precios de compra
proceden de `distributor_products`. Crear/cancelar invalida consultas de pedidos,
opciones de entrega y catálogo del negocio para actualizar las existencias visibles.
La migración y la app se entregan juntas; los nuevos campos se validan con zod.
Los pedidos históricos y sus migraciones se conservan.
