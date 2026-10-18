# Dominio Gasway

## Catálogo y compra

Un pedido corresponde a un producto GLP de 5, 11, 15 o 45 kg, de Lipigas, Gasco o
Abastible, con cantidad de 1 a 99 cilindros de la misma combinación.
exchange_empty distingue compra con o sin entrega de envase vacío para el pedido completo.
La compatibilidad del envase, stock, zona y precio deben confirmarse por distribuidor;
no se presume canje entre marcas. No hay precios, recargos ni reglas de stock ficticias.
El catálogo es global: products.unit_price_clp guarda el precio unitario de servidor,
nullable hasta configuración comercial. Sin precio no se puede comprar; sin recargos
inventados por canje. Precios/stock por distribuidor quedan para una migración futura.

La dirección tiene comuna identificada por código CUT de cinco dígitos y un punto
geográfico WGS84 opcional. No usar el nombre de comuna como identificador.
La nueva migración incorpora el catálogo CUT de 346 comunas: zod y la RPC validan
pertenencia; una FK NOT VALID preserva históricos y restringe nuevas escrituras.
Procedencia y auditoría pendiente en ADR 0006.
RUT canónico: sin puntos, guion y dígito verificador en mayúsculas; validar módulo 11
con zod al implementar entradas. La restricción SQL actual valida solo formato.

CLP se almacena como integer no negativo y se presenta con locale es-CL y cero decimales.
No usar floats para dinero ni aceptar precios calculados en el dispositivo.
create_order fija total_clp = products.unit_price_clp × quantity al crear el pedido;
no recibe identidad ni precio. Los términos comerciales y datos de entrega son inmutables.
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

Una oferta rechazada o vencida no cancela automáticamente el pedido. El despacho por
comuna emite ofertas de 60 segundos desde create_order a repartidores aprobados,
disponibles y con cobertura CUT, sin entrega activa. private.order_offers conserva
destinatarios y expiración; la PK evita duplicar o renovar filas existentes.
Sin candidatos el pedido queda requested; rechazo/vencimiento conservan offered.
No hay reintento automático ni barrido de pedidos históricos. Ver ADR 0007.
La creación inicia en requested. Los triggers hacen cumplir el grafo y agregan eventos
en la misma transacción; eventos sin actor corresponden a procesos de sistema.
El cliente cancela solo pedidos propios requested/offered/accepted mediante cancel_order.
No puede cancelar on_the_way ni terminales; la posibilidad en el grafo de cancelar
en camino queda reservada para procesos confiables del backend.

## Aceptación atómica

accept_order(p_order_id) toma identidad de auth.uid(), verifica rol, aprobación y
disponibilidad, bloquea el repartidor y actualiza solo un pedido offered sin asignar
con oferta dirigida vigente. Postgres reevalúa el predicado bajo bloqueo: un solo ganador.
Un índice único parcial impide dos pedidos accepted/on_the_way para el mismo repartidor.
La función devuelve el UUID o falla: 42501 para identidad/permisos y 55000 para
indisponibilidad, oferta expirada o pedido activo. Un reintento tras éxito falla;
la app relee el pedido asignado ante respuesta de red ambigua.

Al aceptar se desmarca disponibilidad. Tras entrega/cancelación el repartidor puede
reactivarla manualmente mediante set_driver_settings al no tener un pedido activo;
no se implementa reactivación automática.
La app implementa aceptar/rechazar; la RPC accept_driver_offer reutiliza la aceptación
existente y devuelve dirección/notas solo al ganador. get_driver_order recupera el
pedido asignado, sin ampliar RLS. GW001 indica que otro repartidor lo tomó y GW002
indica oferta vencida/rechazada. Disponibilidad/comunas se guardan por RPC; un pedido
activo impide volver a estar disponible. Tras cancelación se puede reactivar manualmente.

## Progreso de entrega

Solo el repartidor aprobado asignado puede usar advance_driver_order para avanzar
accepted → on_the_way → delivered. No puede saltar, retroceder, repetir estados ni
cancelar por esta RPC. El servidor serializa la transición y sus eventos, preserva
accepted_at y fija delivered_at; updated_at lo mantiene el trigger. Entregar es
terminal y excluye el pedido de activos, sin confirmar un pago electrónico.

El cliente recibe cambios de sus pedidos por Realtime, con lecturas sujetas a RLS
y respaldo cada 15 s solo en primer plano si el canal está desconectado. Al volver
a la app se actualizan consultas. La línea de tiempo usa order_events y no inventa
estados alcanzados para pedidos cancelados. Ver ADR 0008.

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
