# ADR 0031 — Punto de entrega confirmado durante la compra

Fecha: 2026-10-24. Estado: aceptado para la demo Android.

## Decisión

La compra Android requiere confirmar un pin de Google Maps. El GPS solo propone un
punto; editar dirección o comuna invalida la confirmación. Dirección y CUT siguen
siendo explícitos: el pin no certifica pertenencia geográfica a una comuna.
Se recuerda el punto junto a la dirección solo si la persona activa esa opción,
mediante el almacenamiento seguro por cuenta ya existente.

`create_mapped_distributor_order` valida latitud/longitud finitas y sus rangos,
bloquea el perfil igual que la compra existente, reutiliza la reserva/despacho de
`private.create_distributor_order` y guarda `orders.delivery_location` antes del
commit. El cliente hace una sola RPC. Reintentar la misma clave con otro punto
falla; repetir el punto y el resto de datos devuelve el pedido existente sin volver
a descontar stock. RLS y permisos de la tabla se conservan.

La RPC anterior se mantiene para clientes previos, web e iOS sin mapa; no se añade una
sobrecarga ambigua ni se reescribe la lógica de stock. Los pedidos históricos sin
coordenadas siguen válidos. D2–D3 deberán tratar esa ausencia al mostrar seguimiento.

## Alcance y verificación

Maps SDK for Android con mapa estándar, sin Street View, Places, Routes ni APIs de
búsqueda/geocodificación de Google. La clave se restringe al paquete, SHA-1 y SDK,
y se incorpora al binario por el plugin de Expo. La transmisión del GPS del
conductor queda para D2–D3.

Migración `20261024035145_mapped_delivery_point` aplicada en Test y app. La suite
`mapped_delivery_point.sql` pasó en Test con rollback: geometría, reintentos,
stock, entradas inválidas y acceso de un usuario ajeno. Typecheck y regresión del
formulario pasaron. La visualización efectiva depende de facturación activa y de
instalar/probar el nuevo binario en un teléfono.
