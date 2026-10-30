# Probar el espacio del conductor

Rama: `feat/driver-workspace`. La app sigue siendo única; conductor, cliente y negocio
conservan permisos separados.

## Entrada desde una invitación

1. El responsable crea una invitación desde **Mi negocio → Gestionar equipo**, con el
   correo de prueba que la persona puede confirmar. También admite CSV.
2. En esa cuenta, abre **Mi cuenta → Activar mi acceso como conductor**, acepta la
   invitación y completa sus antecedentes. Las compras siguen disponibles.
3. Administración revisa mediante `supabase/admin/review-driver-application.sql`.
   No aprobar datos ficticios para una operación real ni tratar esta acción como
   revisión documental vigente de conductor/vehículo/seguridad.
4. Tras aprobar, actualiza el acceso o espera el refresco en primer plano: se habilita
   el espacio de conductor. Aceptar la invitación por sí solo no cambia ese acceso.

## Jornada de reparto

1. **Inicio** muestra disponibilidad, entrega activa y nuevas ofertas.
   Si falta afiliación, verificación del negocio o marcas, explica el bloqueo.
2. Abre **Cobertura** para consultar las comunas del negocio. El responsable las
   gestiona desde Mi negocio; el conductor hereda esa cobertura y no la modifica.
3. Activa disponibilidad. Recibes ofertas compatibles con tu negocio/marcas y comunas,
   sin otra entrega activa. Inicio no activa ubicación; el GPS se comparte desde
   Tu entrega, únicamente en primer plano.
4. Las ofertas muestran producto, cantidad, comuna, canje, total y vencimiento. La
   dirección no aparece antes de la asignación. Rechazar no cancela el pedido.
5. Acepta una oferta vigente. El servidor decide la asignación atómica; un error de
   red obliga a actualizar para recuperar el pedido antes de asumir otro.
6. Abre **Tu entrega**, revisa dirección/indicaciones y pulsa **Iniciar entrega**.
   Al finalizar, **Marcar como entregado** solicita una confirmación explícita.
7. Tras entregar, vuelve a Inicio. La disponibilidad se reactiva manualmente.

El Inicio del 2026-10-25 usa una tarjeta principal verde oscuro y crema para la
disponibilidad; cuando hay ofertas se compacta para darles prioridad. Con pedido
asignado aparece la tarjeta «Tu entrega en curso», foto del cilindro y «Continuar
entrega», sin otro panel redundante de disponibilidad. Se conserva la posibilidad
de pausarla si el servidor todavía informa `is_available=true`.

Distribuidora y cobertura se resumen en una fila que abre Cuenta/Cobertura,
incluyendo la etiqueta Demo cuando corresponde. Las ofertas muestran foto real,
marca/formato/variante, cantidad, comuna, canje/marca del cilindro vacío, total en
efectivo y cuenta atrás. La dirección privada no se añade a ofertas. «Aceptar
pedido» y «Rechazar» mantienen sus RPC y guardas; al pulsar aceptar se revalida el
vencimiento con la hora actual. La aceptación del servidor apaga disponibilidad.

La cabecera ofrece un icono «Actualizar jornada»; también se actualiza tirando
hacia abajo con loader de marca. El indicador manual espera las cuatro consultas
y no responde al polling. Sin datos confiables se muestra «Estado sin confirmar»
o «Revisando tu jornada», sin asumir disponibilidad. Un bloqueo permite abrir la
habilitación; no se convierte en un botón para activarse sin autorización.

**Ampliación 2026-10-25:** «Navegar» añade mapa ampliable, rutas y GPS
mientras usa Waze/Google Maps, con permiso siempre y notificación en el Android
actualizado. Ese modo se detiene al pausar, salir de la entrega, terminar o cambiar
de usuario. [Guion y límites](driver-navigation.md). El comportamiento siguiente
corresponde al botón de primer plano:

Desde D3, **Tu entrega → Activar** en la fila GPS solicita permiso durante el uso
y publica GPS del pedido asignado mientras esa pantalla está visible. **Pausar**,
bloquear, cambiar de app o salir detiene nuevos envíos en este modo de primer plano. El cliente ve
el mapa en el detalle de su pedido, con caducidad; una última muestra puede seguir
visible hasta 30 s. Entregar/cancelar corta el seguimiento por pedido. Implementado,
con prueba física aún pendiente: [guía D3](live-tracking.md).

El rediseño del 2026-10-25 prioriza destino y mapa; ampliar/centrar son controles
flotantes con etiquetas accesibles. «Navegar» es la única entrada al navegador
externo. La fila GPS muestra estado, pausa y ayuda de privacidad. Carga/cobro se
agrupan con fotografía; las indicaciones solo aparecen cuando existen. Detalle del
canje en el botón de información de la carga: «Carga y canje» muestra producto,
cantidad y retiro/marca del cilindro vacío sin explicaciones extensas. La acción de avance permanece fija
abajo y entregar requiere confirmar en una hoja. Deslizar hacia abajo actualiza
pedido y consultas activas de seguimiento/ruta de ese usuario y pedido.
La confirmación final incluye foto del producto, marca, formato/variante, cantidad,
total en efectivo y canje/marca del cilindro vacío. No presume pago ni canje
efectuados: el conductor confirma la entrega explícitamente.

El avance muestra progreso en el botón y bloquea pulsaciones duplicadas. Solo la
respuesta válida de `advance_driver_order` activa «Entrega iniciada» o «Entrega
completada», con anuncio accesible y háptica nativa. El aviso de inicio aparece
en el pie fijo y puede cerrarse; el resultado final es el título de la tarjeta
con producto y cobro, persistente también al volver a abrir un pedido entregado.
La cabecera del destino no repite «Entregado». Un error mantiene «Cambio sin
confirmar» y ofrece «Revisar pedido» antes de volver a avanzar. El refresco de
jornada no retrasa la confirmación de una RPC ya exitosa; el sondeo nunca crea
avisos de éxito ni vibraciones. No se activa GPS ni disponibilidad al avanzar.

Revisión visual autorizada el 2026-10-25 solo para esta página: render web de los
componentes reales de «Tu entrega» con pedido ficticio y dependencias de datos
aisladas, imagen del cilindro y fuentes locales. Se comprobó el título único dentro
de la tarjeta y el pie con «Volver a ofertas». No se navegaron otras pantallas ni
se alteraron pedidos cloud. Esta revisión no acredita apariencia nativa ni háptica
en teléfono. La utilidad y captura temporales permanecen ignoradas bajo `.expo/`.

El sondeo automático ocurre cada 5 segundos mientras la pantalla está activa. No
deshabilita **Actualizar jornada** ni activa el indicador de actualización manual.
Ese indicador solo aparece al pulsar el icono o deslizar para actualizar, espera las
cuatro consultas (configuración, negocio, ofertas y entrega) y evita peticiones
manuales duplicadas. Si falla una consulta, su error sigue visible y permite reintentar.
El reloj local de vencimientos se revisa cada segundo sin ejecutar consultas.

Si la verificación del negocio cambia durante una entrega, se bloquean nuevos
repartos pero se conserva la posibilidad de terminar la ya asignada mientras siga
vigente la habilitación del conductor. Una suspensión del conductor cierra su acceso
operativo; la aprobación histórica no se borra ni aparece como actualización pendiente.

## Cuenta y otros permisos

### Disponibilidad y cobertura

El rediseño del 2026-10-25 reemplaza tarjetas explicativas y el botón grande de
actualización por un interruptor compacto, un resumen de zona y una lista de
comunas. El resumen muestra la cantidad real, nombre del negocio, marcas y
etiqueta Demo cuando corresponde. No inventa límites geográficos ni consulta GPS.
La búsqueda es local, alfabética e ignora mayúsculas/tildes; no altera los CUT ni
la cobertura heredada. Una búsqueda vacía de resultados permite limpiarla.

El interruptor confirma únicamente `is_available` del servidor; durante la
mutación muestra «Guardando disponibilidad…» y bloquea otra acción. Sin datos
confiables, aprobación, cobertura o con otro pedido activo no permite activarse.
Sí permite pausar si la disponibilidad sigue activa, incluso con pedido o negocio
bloqueado. Una entrega activa ofrece «Continuar mi entrega»; las incidencias de
habilitación siguen visibles y permiten consultar Cuenta.

El icono de actualización y el gesto comparten un refresco manual que espera
configuración, negocio y pedido asignado, incluso si falla alguna consulta. El
polling no activa ese indicador. No se modifica la cobertura desde el conductor.
Regresión local del interruptor: activación permitida, bloqueo por cobertura,
pedido, negocio, estado incierto o guardado, y pausa permitida. No se renderizó
esta pantalla ni se validó visualmente en dispositivo en esta tarea.

**Cuenta** presenta identidad, habilitación y negocio. La afiliación no concede
permisos para administrar: **Gestionar mi negocio** solo aparece si hay membresía
owner/manager. Un dueño que conduce conserva ambas capacidades.

Rediseño de Cuenta del 2026-10-25: tarjeta de identidad en verde oscuro/crema/lima,
estado de habilitación consultable y tarjeta compacta del negocio con marcas y
etiqueta Demo. La pantalla principal conserva los bloqueos reales, sin párrafos
explicativos permanentes. «Tu espacio» agrupa Cobertura, administración si está
autorizada y compras personales. Cerrar sesión conserva su acción/errores/bloqueo
durante la operación.

Pulsar el estado abre «Tu habilitación», con revisión de Gasway, afiliación,
bloqueo y explicación breve de permisos independientes. Deslizar actualiza
workspace y acceso de sesión; la recuperación de errores y la hoja permiten
actualizar también mediante botón. Todas esas entradas comparten la solicitud
pendiente y esperan ambas consultas, incluso si una falla. El sondeo no genera
un indicador manual. Un error de workspace oculta capacidades y muestra «Acceso
sin confirmar»; metadata solo presenta el nombre. Regresión local verifica
administración autorizada, metadata sin permisos, fallo con caché y navegación a
compras. No se renderizó esta pantalla ni se hicieron capturas de Gasway.

**Comprar como cliente** abre las compras con la misma sesión. **Mi cuenta → Volver
a reparto** regresa al conductor. Navegar no cambia el rol, y el servidor impide
autoasignar el pedido propio. Los canales de compras se limitan a esa cuenta y al
foco de su layout; los sondeos de reparto se pausan fuera de sus pantallas/primer plano.

## Comprobaciones realizadas y pendientes

Migración `20261019011756_driver_workspace.sql` aplicada en Gasway cloud. La prueba
`supabase/tests/driver_workspace.sql` recorre invitación, revisión, cobertura, despacho,
aceptación, compra como conductor y entrega, con fixtures revertidos. Comprueba
cuenta sin aprobar, negocio deshabilitado, marcas ausentes, afiliación nula y suspensión.

Assertions locales: `test-driver-workspace.cjs`, `test-driver-offers.cjs`,
`test-driver-order-progress.cjs` y las de activación por invitación. Typecheck y lint
acotado aprobados. No se abrió ni renderizó la app ni se realizaron capturas. Queda
probar en dispositivo la presentación, navegación, teclado, letra grande y reconexión.
El selector CSV de la tarea anterior sigue requiriendo un build con sus módulos nativos.

La regresión local también comprueba que el sondeo no simula pulsaciones, que el
refresco manual espera todas las consultas y libera el botón tras un error, y que
los SVG decorativos conservan accesibilidad compatible con web/iOS/Android.

El rediseño de Inicio añade regresiones de su acceso bloqueado y estado incierto.
La comprobación visual anterior se limita a «Tu entrega»; no se renderizó Inicio
ni se capturó en este cambio. Su apariencia nativa queda pendiente de revisión
en teléfono.

La compra aún usa el prototipo global de precios. Faltan vendedor elegido antes de
comprar, reservas de stock y antecedentes/documentos vigentes antes del piloto real.

### Corrección de presentación Samsung — 2026-10-25

La captura aportada por el operador mostraba «Aceptar pedido» comprimido y el
nombre del negocio con poco espacio. Los enlaces compartidos ahora usan ancho
intrínseco; aceptar/rechazar tienen columnas con un mínimo y pasan a filas cuando
no caben. El contexto del negocio reserva ancho legible y cobertura puede moverse
a otra fila; marca y tamaño del cilindro tienen líneas independientes. Se conserva
el escalado de texto, el vencimiento de ofertas y la aceptación atómica existente.
No se añadieron consultas, cambios de disponibilidad ni nuevas comprobaciones
visuales. Requiere Reload de JavaScript y confirmación en el dispositivo.
