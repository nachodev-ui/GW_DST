# Dominio Gasway

## Catálogo y compra

Un pedido corresponde a un cilindro GLP de 5, 11, 15 o 45 kg, de Lipigas, Gasco o
Abastible. exchange_empty distingue compra con o sin entrega de envase vacío.
La compatibilidad del envase, stock, zona y precio deben confirmarse por distribuidor;
no se presume canje entre marcas. No hay precios, recargos ni reglas de stock ficticias.
El catálogo inicial es global; precios/stock por distribuidor quedan para una migración futura.

La dirección tiene comuna identificada por código CUT de cinco dígitos y un punto
geográfico WGS84. No usar el nombre de comuna como identificador. Aún falta integrar
un catálogo oficial de comunas y validar existencia del código, no solo su formato.
RUT canónico: sin puntos, guion y dígito verificador en mayúsculas; validar módulo 11
con zod al implementar entradas. La restricción SQL actual valida solo formato.

CLP se almacena como integer no negativo y se presenta con locale es-CL y cero decimales.
No usar floats para dinero ni aceptar precios calculados en el dispositivo.
El servidor fija total_clp al crear el pedido; términos comerciales son inmutables.
No se considera el Cupón de Gas Licuado estatal vencido.

## Roles

profiles.role es customer o driver; drivers contiene la habilitación operativa.
Todos los usuarios nuevos parten como customer, independientemente de su metadata.
Solo el backend confiable puede habilitar drivers y cambiar roles; cambiar de vista
no concede permisos. Un repartidor puede comprar cuando no actúa como repartidor,
pero no aceptar su propio pedido. El rol del perfil identifica su capacidad principal;
no hay un tercer rol admin expuesto al móvil. Admin web futuro necesita un diseño propio.

## Estados

| Estado     | Significado                                   | Siguientes permitidos |
| ---------- | --------------------------------------------- | --------------------- |
| requested  | Pedido registrado                             | offered, cancelled    |
| offered    | Una o más ofertas privadas emitidas           | accepted, cancelled   |
| accepted   | Primer repartidor elegible ganó la asignación | on_the_way, cancelled |
| on_the_way | En camino                                     | delivered, cancelled  |
| delivered  | Entregado; terminal                           | Ninguno               |
| cancelled  | Cancelado; terminal                           | Ninguno               |

Una oferta rechazada o vencida no cancela automáticamente el pedido. Despacho futuro
puede volver a ofertar manteniendo offered. private.order_offers representa destinatarios
y expiración; se escribe solo desde el backend confiable. No hay algoritmo de despacho.
La creación inicia en requested. Los triggers hacen cumplir el grafo y agregan eventos
en la misma transacción; eventos sin actor corresponden a procesos de sistema.

## Aceptación atómica

accept_order(p_order_id) toma identidad de auth.uid(), verifica rol, aprobación y
disponibilidad, bloquea el repartidor y actualiza solo un pedido offered sin asignar
con oferta dirigida vigente. Postgres reevalúa el predicado bajo bloqueo: un solo ganador.
Un índice único parcial impide dos pedidos accepted/on_the_way para el mismo repartidor.
La función devuelve el UUID o falla: 42501 para identidad/permisos y 55000 para
indisponibilidad, oferta expirada o pedido activo. Un reintento tras éxito falla;
el cliente futuro debe releer su pedido ante respuesta de red ambigua.

Al aceptar se desmarca disponibilidad. Liberarla tras entrega/cancelación pertenece
al futuro backend y debe ocurrir en la misma transacción que ese cambio de estado.
No se implementa esa operación ni botones de aceptar/rechazar en esta entrega.

## Pago y privacidad

MVP: cash_on_delivery. No hay captura ni integración de pagos. El contrato TypeScript
permite adaptadores futuros Mercado Pago/Webpay; SQL solo permite contra entrega y
necesitará una migración antes de habilitar otro método. No se confunde entrega con
confirmación electrónica de pago.

Direcciones, RUT y coordenadas son privados. El cliente solo puede leer su perfil;
los participantes leen el pedido y sus eventos. Solo un cliente con un pedido activo
accepted/on_the_way del repartidor puede ver su ubicación actual. No hay historial
público ni acceso general a repartidores cercanos. La ubicación necesita una política
de retención y frescura antes del piloto; recorded_at enviado por el móvil no es prueba confiable.
