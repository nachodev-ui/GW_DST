# ADR 0006 — Pedido cliente mediante RPC

Fecha: 2026-10-18. Estado: aceptado; usuario informó aplicación manual, ejecución de
la suite SQL, configuración de precio y creación correcta de un pedido. El agente
no ejecutó SQL cloud.

## Decisión

Agregar solo `20261018030000_customer_orders.sql`, después de la migración Auth.
`create_order` recibe producto, cantidad entera 1–99, canje, dirección, CUT, notas
opcionales y par latitud/longitud opcional. No recibe identidad, precio, estado,
repartidor ni método de pago. Usa `auth.uid()` y precio vigente de `products`;
rechaza producto inactivo/sin precio y total fuera del rango integer CLP.
Un bloqueo `FOR SHARE` estabiliza el precio durante la creación; la actualización
del catálogo espera hasta que termine la transacción. Precio cero es válido.

Se agrega `products.unit_price_clp` nullable, sin rellenar precios ficticios.
El operador debe configurar precios comerciales reales antes de habilitar compras.
Es un precio global por combinación marca/peso; precios/stock por distribuidor y
tarifas diferenciadas por canje requieren una futura decisión y migración.
Cantidad y notas son columnas nuevas; los pedidos existentes conservan cantidad 1.
Las coordenadas pasan a ser opcionales; sin permiso GPS, geocodificador ni mapa.

Las funciones públicas son wrappers SECURITY INVOKER; las implementaciones
SECURITY DEFINER están en `private`, con search_path vacío, nombres calificados,
identidad comprobada y EXECUTE solo para authenticated. No hay nuevas concesiones
INSERT/UPDATE/DELETE sobre pedidos/eventos ni escritura de precios para el móvil.
RLS sigue activo. Los triggers existentes crean eventos en la misma transacción;
no se insertan eventos duplicados en RPC.

`cancel_order` actualiza con predicado único de identidad y estado
requested/offered/accepted y devuelve el pedido. Un cambio concurrente a on_the_way
impide la cancelación al reevaluarse el predicado bajo bloqueo. Un pedido ajeno o no
cancelable devuelve el mismo error 55000 sin revelar existencia o estado ajeno.
La prohibición cliente de cancelar on_the_way no modifica el grafo del backend:
un proceso confiable puede cancelar un pedido en camino por otras razones.
No se modifica aceptación, ofertas ni disponibilidad de repartidores: su liberación
tras terminar/cancelar un pedido sigue pendiente del backend de entrega.

## Comunas

La migración incorpora 346 códigos/nombres del catálogo oficial
[SUBDERE CUT 2018 v04](https://www.subdere.gov.cl/documentacion/c%C3%B3digos-%C3%BAnicos-territoriales-actualizados-al-06-de-septiembre-2018),
que incluye Ñuble. [Archivo original XLS](https://www.subdere.gov.cl/sites/default/files/documentos/CUT_2018_v04.xls).
Para convertir sin instalar lectores XLS se utilizó la
[copia CSV derivada](https://github.com/bastianolea/cut_comunas/blob/master/datos/cut_comuna.csv),
blob `b01dc6cc6256c22df75bca00659075d22c5fc041`, SHA256 del CSV descargado
`c45f52db9187e337b3bc86cc548163f68baff2396ecd373462419eeca5a70e03`.
Se verificaron localmente 346 códigos únicos de cinco dígitos. No se afirma una
comparación celda por celda contra XLS ni una actualización territorial posterior.
La tabla es solo lectura para authenticated; la RPC comprueba existencia y la FK
impide códigos nuevos ajenos al catálogo. La FK es NOT VALID para preservar filas
históricas sin una limpieza destructiva. Auditar y validar datos históricos queda
pendiente. La app descarga este mismo catálogo y valida pertenencia con zod.
No hay una API externa de comunas requerida al usar el formulario.

## App y alcance

Rutas delgadas dentro de `(customer)` con guard en el layout raíz ya existente;
formularios/lista/detalle en `features/orders/customer`. Se mantienen acceso a cuenta,
solicitud de repartidor y cierre de sesión. Primitivas visuales existentes movidas a
`shared/ui` y contratos neutrales a `shared/orders`, sin imports de features en ellos.
Theme central verde/ámbar, etiquetas, estados de carga/error/vacío,
scroll con teclado y lista virtualizada. Sin paquetes nuevos ni validación visual.

TanStack Query indexa catálogo/pedidos por identidad y refresca después de mutaciones.
Las respuestas externas se validan con zod. La app calcula solo un total orientativo
desde el catálogo; la RPC decide el importe definitivo y el detalle muestra ese total.
Crear/cancelar no reintenta automáticamente. Si la respuesta de creación se pierde,
el usuario debe revisar sus pedidos antes de repetir; una clave de idempotencia
para reintentos manuales queda pendiente antes del piloto.

## Verificación

`supabase/tests/customer_orders.sql` es un único DO autocontenido: fixtures propios,
JWT simulado y rol authenticated real, sin seed/pgTAP. Comprueba precio calculado y
reprecio, falta de parámetros de identidad/precio, bloqueo de INSERT directo, RLS,
cancelación ajena/terminal/en camino, eventos, identidad ausente y entradas inválidas.
Una excepción centinela revierte la subtransacción también en autocommit; cualquier
error inesperado se propaga y revierte el DO. La secuencia de eventos puede avanzar.
Sin ejecución SQL, advisors ni simulación de concurrencia real en esta entrega.
Pasaron `node scripts/test-orders.cjs`, el único `npm run typecheck` y ESLint
sobre los archivos móviles modificados. El lint global detectó dos errores
preexistentes fuera del flujo: `__dirname` en metro.config.cjs y actualización
sincrónica de estado en el efecto de auth-provider.tsx. No se modificaron esos archivos.

Referencias técnicas: [funciones y permisos de Supabase](https://supabase.com/docs/guides/database/functions)
y [representación de un resultado RPC como objeto](https://postgrest.org/en/latest/references/api/resource_representation.html).
La app solicita explícitamente `.single()` y selecciona solo el contrato de pedido.
