# Dominio Gasway

## Catálogo y compra

Un pedido corresponde a un producto GLP de 5, 11, 15 o 45 kg, de Lipigas, Gasco o
Abastible, con cantidad de 1 a 99 cilindros del mismo producto.
El catálogo distingue `variant`: `standard`, `vma` y `vm`; VMA y VM solo existen
en Abastible de 15 kg. La identidad única es marca + peso + variante; los pedidos
siguen referenciando el UUID del producto. No se presume compatibilidad entre válvulas.
Ver [ADR 0011](decisions/0011-product-cylinder-variants.md).
exchange_empty distingue compra con o sin entrega de envase vacío para el pedido completo.
El derecho de intercambio no se rechaza solo por la marca del envase devuelto;
no implica compatibilidad de válvulas ni aptitud de seguridad del cilindro.
Se deben registrar y revisar sus características. Stock, zona y precio dependen
del negocio; no se inventan precios ni recargos por cambiar de marca.
El producto/variante es global; precio y stock para compras nuevas proceden de
distributor_products, por vendedor. unit_price_clp es el precio con canje y
price_without_exchange_clp incluye el envase; NULL impide comprar esa modalidad.
No se inventan recargos por marca devuelta. Ver ADR 0018 y distributor-shopping.md.

La dirección tiene comuna identificada por código CUT de cinco dígitos y un punto
geográfico WGS84 opcional. No usar el nombre de comuna como identificador.
La nueva migración incorpora el catálogo CUT de 346 comunas: zod y la RPC validan
pertenencia; una FK NOT VALID preserva históricos y restringe nuevas escrituras.
Procedencia y auditoría pendiente en ADR 0006.
RUT canónico: sin puntos, guion y dígito verificador en mayúsculas. La postulación
valida módulo 11 mediante zod y una función SQL; la columna independiente profiles.rut
conserva su restricción de formato anterior y no se actualiza desde el formulario.

CLP se almacena como integer no negativo y se presenta con locale es-CL y cero decimales.
No usar floats para dinero ni aceptar precios calculados en el dispositivo.
create_distributor_order fija total_clp con el precio comercial bloqueado × quantity;
compara el precio que el cliente revisó, sin usarlo como autoridad. Vendedor, términos
comerciales y entrega son inmutables. La creación anterior con precio global pierde
EXECUTE móvil; las órdenes existentes se conservan.
No se considera el Cupón de Gas Licuado estatal vencido.

## Roles

profiles.role es customer o driver; drivers contiene la habilitación operativa.
Todos los usuarios nuevos parten como customer, independientemente de su metadata.
Solo el backend confiable puede habilitar drivers y cambiar roles; cambiar de vista
no concede permisos. Un repartidor puede comprar cuando no actúa como repartidor,
pero no aceptar su propio pedido. El rol del perfil identifica su capacidad principal;
no hay un tercer rol admin expuesto al móvil. Admin web futuro necesita un diseño propio.

Primera fase de distribuidores: distributors representa al negocio, con responsables
owner/manager en distributor_members y afiliación única en drivers.distributor_id.
No son nuevos roles móviles. La sección business usa membresías owner/manager, sin
añadir otro valor a profiles.role. distributor_applications registra el alta del
negocio, sus referencias privadas y la decisión administrativa versionada. Solo la
aprobación SQL confiable crea el negocio y su responsable; no crea un driver ni
cambia su habilitación. is_demo=true señala una revisión con datos ficticios, sin
acreditar cumplimiento real. Ver ADR 0014.

driver_applications registra pending/approved/rejected;
solo una revisión administrativa confiable aprueba y vincula al conductor a un negocio
verificado, o rechaza con motivo. La decisión de incorporación no sustituye la
habilitación operativa. No hay suspensión ni reapertura automática. Mi cuenta muestra
estado, motivo y fecha sin bloquear compras. La incorporación comienza en el negocio:
owner/manager emite una invitación individual o en lote. Solo la acepta la cuenta
con el correo confirmado correspondiente en Auth. La aceptación reconoce el vínculo,
sin exigir vehículo propio ni conceder habilitación operativa. El conductor completa
nombre/RUT/contacto privados mediante submit_invited_driver_application, que fija el
negocio desde la invitación y registra el consentimiento versionado del negocio.
Tras rechazo se necesita una nueva invitación, corrección y envío explícito. La revisión
conserva copia privada de antecedentes, invitador y aceptación. Las RPC de solicitud
abierta y el directorio anterior perdieron EXECUTE móvil; no basta ocultar la interfaz.
Ver ADR 0015 y los ADRs 0009–0013 para antecedentes históricos.
Un negocio registrado no implica validación legal automática.

El contexto aportado por el usuario, sus precisiones y fuentes oficiales están en
[market-context-chile.md](market-context-chile.md). Distribuidor identifica al negocio
vendedor; conductor identifica la entrega. Un dueño puede ser ambos y un prestador
independiente no implica vehículo propio ni un contrato laboral determinado.
El negocio inicia cada incorporación mediante un responsable autenticado y
administración aprueba al final. Las solicitudes antiguas conservan su confirmación
manual versionada y pueden regularizarse mediante una invitación al mismo negocio.
Las marcas se configuran por negocio, sin presumir
exclusividad universal. RUT/contacto no bastan para habilitar reparto real: faltan
evidencias vigentes de conductor, vehículo y operación según corresponda.

«Mi negocio» permite preparar distributor_products por producto UUID: precio CLP
entero nullable, stock no negativo e inclusión. El servidor exige negocio verificado,
membresía y marca configurada, y audita cada edición. revision evita pisar cambios
concurrentes; un reintento idéntico ya guardado no duplica cambios.
Solo el negocio demo autorizado tiene valores comerciales ficticios de ejemplo.
Desde ADR 0018 el catálogo propio se conecta a la compra y reserva stock atómicamente;
cancelar lo repone una vez y entregar lo consume. El cliente elige vendedor antes
de comprar y sus ofertas solo se dirigen a conductores de ese negocio.
La búsqueda muestra stock publicado aunque no haya cobertura operativa. `has_coverage`
y `has_available_driver` distinguen esa situación de inventario agotado; la compra
sigue requiriendo cobertura y una oferta emitible. Ver ADR 0019.
El responsable configura las comunas en Mi negocio → Cobertura, incluso sin equipo.
`distributor_communes` es la única fuente y todos los conductores afiliados heredan
esa cobertura. Cada conductor solo cambia su disponibilidad. Cobertura declarada
no implica que haya un conductor habilitado/disponible para entregar. Ver ADR 0021.

Invitación y habilitación son estados distintos: pending/accepted/cancelled/expired
describen la invitación; incomplete/in_review/enabled/rejected/suspended describen
la vista de habilitación. No hay autoaprobación, autosuspensión ni traslado entre
negocios al aceptar una invitación. Una afiliación aceptada en curso impide aceptar
otra; un conductor operativo no puede ser reasignado por este onboarding.

## Estados

El conductor aprobado entra a su espacio de reparto; tener una invitación aceptada
o membresía del negocio no sustituye esa habilitación. Para recibir ofertas nuevas
necesita negocio afiliado verificado, marcas configuradas, cobertura definida por el negocio y
disponibilidad, además de no tener otra entrega activa. La cuenta explica qué falta
sin permitir autoaprobarse. Un acceso operativo suspendido conserva la decisión
histórica, pero no se presenta como una aprobación aún en proceso.

La disponibilidad del conductor y la cobertura del negocio son independientes:
activarse usa las comunas vigentes de la distribuidora, sin permitir modificarlas. Un conductor también puede comprar con su misma cuenta; cambiar de vista
no cambia permisos ni permite aceptar su propio pedido. No se habilita gestión de
distribuidora a un conductor por el solo hecho de estar afiliado.

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
Además exige negocio verificado y una marca comercializada configurada que coincida
con el producto. La aceptación fija orders.distributor_id de forma inmutable. Los
históricos sin ese dato no se rellenan por suposición. Ver ADR 0013.
Sin candidatos el pedido queda requested; rechazo/vencimiento conservan offered.
No hay reintento automático ni barrido de pedidos históricos. Ver ADR 0007.
Para compras nuevas, `create_distributor_order` exige oferta emitible y revierte si
no hay reparto; los estados requested sin candidatos describen órdenes históricas.
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
reactivarla manualmente mediante set_driver_availability al no tener un pedido activo;
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
