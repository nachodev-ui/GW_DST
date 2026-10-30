# Compra con distribuidora elegida

Gasway conserva sesión, pedidos internos, aceptación atómica y seguimiento de estados.
WhatsApp es una consulta secundaria al negocio. El prompt web de referencia se adapta
a Expo; no se crean Next.js, otro catálogo CUT ni una base paralela de distribuidores.

## Recorrido

1. Dirección y comuna oficial existente. Ubicación opcional en Android/iOS mediante
   expo-location y geocodificación del sistema. No se aproxima a una comuna cercana:
   una coincidencia ambigua exige selección manual. Revisar siempre número y comuna.
2. Tamaño, marca a recibir, variante existente, cantidad 1–99, canje y marca del cilindro
   devuelto (incluye «No sé / Otra marca»). Se reutilizan las imágenes y tokens.
   La marca devuelta no excluye vendedores ni agrega recargos; no acredita compatibilidad
   de válvula/condición. Esa revisión e inventario inverso completos siguen pendientes.
3. Negocios habilitados con producto publicado y stock suficiente. Cada tarjeta muestra
   stock, cobertura CUT definida por la distribuidora y disponibilidad por separado: un negocio sin reparto
   sigue visible, con compra deshabilitada y motivo explícito. Recomendado prioriza los
   negocios donde se puede pedir; también se puede ordenar por precio o tiempo estimado.
   Una hoja muestra vendedor, entrega, cilindro y total antes de confirmar en Gasway.

La cobertura es **por comuna**, no una garantía geográfica por calle. No hay polígonos,
rutas, distancia calculada ni Google Places activado. El conductor confirma la entrega
en la dirección al aceptar. La web de desarrollo conserva ingreso manual de dirección;
no imita la geocodificación nativa. La interfaz `GeocodingProvider` permite otro proveedor
en una tarea posterior, con sus costos y permisos explícitos.

## Datos comerciales y contacto

En **Mi negocio → Catálogo → Editar atención y contacto**, un responsable configura
horario semanal (America/Santiago, un turno por día y cierre posterior a medianoche),
ETA opcional de 1–1.440 minutos y móvil comercial opcional `569XXXXXXXX`.
Guardar el móvil autoriza su publicación a clientes autenticados; nunca se reutilizan
el teléfono, RUT, dirección ni evidencias privadas de postulación.
Horario `null` significa sin informar; `[]`, cerrado toda la semana. ETA no informada
se muestra por confirmar. El horario es una declaración del negocio y no prueba
presencia de conductores. Los días sin turno informado en un horario publicado son cerrados.

Cada producto tiene precio con canje y total sin canje con envase incluido. El segundo
puede quedar pendiente: se permite consultar pero no comprar en esa modalidad. No se
presume que el antiguo precio global sea un precio de vendedor ni un precio con envase.
El negocio sigue editando stock/publicación con control de revisión concurrente.

«Habilitada en Gasway» no se presenta como acreditación SEC. No se inventan reseñas,
valoraciones, precios, stock, horarios ni ETA. Desde el rediseño del 2026-10-27,
por petición del operador, los pasos de selección y revisión no muestran banners
demo repetidos. Se conserva is_demo y los negocios ficticios no abren WhatsApp.

La selección usa fotografías, contador acotado y canje visual. Las tarjetas muestran
el total de la modalidad elegida; precios alternativos, horario y criterio de orden
se consultan en detalles. El pie reúne imagen, producto/comuna y acceso a editar.
Las distribuidoras se actualizan tirando hacia abajo, sin otro botón de refresco.
El servidor sigue validando precio, cobertura, stock y disponibilidad al confirmar.

«Consultar por WhatsApp» abre `wa.me` con saludo y consulta general. El cliente decide
enviar el mensaje en WhatsApp. No incluye dirección, coordenadas, RUT ni confirmación
de pedido. El acceso también está en el detalle del pedido para sus participantes.

Los negocios sin cobertura, cerrados o sin conductor disponible siguen visibles para consultar.
La compra exige poder emitir una oferta a un conductor del negocio en ese momento;
si cambia la disponibilidad durante la confirmación, la transacción revierte pedido
y reserva. No se ofrecen pedidos programados para apertura: no existe todavía un
proceso que reactive automáticamente solicitudes al abrir o renovaciones de ofertas.
Las ofertas emitidas siguen teniendo el vencimiento existente de 60 segundos; un pedido
sin aceptación requiere revisión/cancelación por el cliente o intervención operativa.

## Servidor y privacidad

- `list_delivery_options` devuelve solo información comercial mínima por producto,
  comuna, cantidad y modalidad; excluye contactos privados e identidades de conductores.
- `create_distributor_order` valida vendedor/marca/producto/cobertura, bloquea inventario,
  compara el precio revisado, fija el precio real y reserva existencias en una transacción.
  El cliente no fija total ni identidad; un cambio de precio obliga a volver a revisar.
- Una clave UUID de solicitud generada por el servidor evita duplicar la misma solicitud
  al reintentar. El formulario conserva la clave por contenido/vendedor mientras está
  montado. Tras cerrar/reiniciar la app se debe revisar Mis pedidos antes de repetir:
  no hay cola persistente de operaciones ni recuperación de claves entre dispositivos.
- `distributor_id` es inmutable desde la compra. Despacho/listado se limitan a ese negocio;
  el trigger de asignación vuelve a impedir aceptar con otro negocio, incluso con una
  oferta dirigida inválida. Las órdenes históricas sin vendedor conservan su asignación previa.
- Cancelar devuelve la reserva una sola vez e incrementa la revisión del catálogo.
  Entregar consume el stock reservado. Un control de capacidad mantiene espacio para
  devolver reservas aunque el negocio reponga existencias hasta el límite del catálogo.
- Se revoca la creación móvil antigua con precio global, para que no eluda vendedor,
  precio comercial ni reserva. Lecturas/cancelación/avance de órdenes anteriores se conservan.
- RLS en tablas nuevas, reservas/intereses privados y RPC autenticadas con EXECUTE mínimo.
  Se siguen los [wrappers y privilegios de funciones de Supabase](https://supabase.com/docs/guides/database/functions).
- Recordar dirección es voluntario, por cuenta, en SecureStore del teléfono; no se
  guarda en localStorage web. Desactivar la opción y continuar elimina la copia.
  La geocodificación usa el sistema del teléfono con permiso en primer plano. Gasway no
  almacena esas coordenadas y WhatsApp no recibe la dirección.
- `trackEvent` es una extensión sin envío ni console; tipos limitan los eventos a
  formato, conteos/orden y distribuidora. No admite dirección, RUT ni teléfonos.
- Sin resultados se puede registrar interés por cuenta/comuna/producto, sin dirección
  ni envío real de avisos. La interfaz explica que los avisos aún no están activos.

## Validación

La migración `20261021224033_clarify_inventory_availability.sql` se aplicó en Gasway
cloud el 21 de octubre de 2026, después de verificar la suite SQL completa con rollback.
La suite ahora comprueba que el stock se ve sin cobertura, que tener cobertura no
implica conductor disponible y que intentar comprar en ambos casos falla sin consumir
stock. Las suites Node de pedidos y opciones de entrega y el typecheck final pasaron.
La lectura posterior como cliente autenticado devolvió los cuatro productos reales
con stock intacto y ambas señales de reparto en falso. Se comprobaron historial,
permisos y RLS; el advisor de seguridad mantiene únicamente el aviso de Auth descrito
abajo. Ver ADR 0019.

Estado de esta entrega: migración `20261021205128_distributor_discovery.sql`
verificada en Gasway cloud dentro de una transacción con rollback, junto con la suite,
y aplicada permanentemente tras autorización explícita del usuario el 21 de octubre
de 2026. El historial registra `20261021205128`; se comprobaron por lectura la presencia
de RPC, EXECUTE de compra autenticada, bloqueo anónimo, retiro de creación global y
RLS en las tres tablas nuevas. Las siete comprobaciones devolvieron verdadero.

El advisor de seguridad devolvió únicamente `auth_leaked_password_protection`:
la protección de Auth contra contraseñas filtradas está desactivada. Esta migración
no modifica esa configuración de Auth ni activa servicios pagos.

En la entrega inicial de ADR 0018, las tres suites Node indicadas abajo pasaron.
Su único typecheck encontró un `leading`
obligatorio ausente en una fila de comuna: corregido agregando el icono de ubicación.
No se repitió el typecheck para respetar el presupuesto del repositorio.

`node scripts/test-delivery-options.cjs` cubre horario de verano/invierno, medianoche,
cambio semanal, ranking, datos faltantes, CLP y consulta WhatsApp con caracteres especiales.
`node scripts/test-business.cjs` y `node scripts/test-orders.cjs` cubren contratos existentes
y edición de ambos precios. La suite `supabase/tests/distributor_discovery.sql` verifica
el recorrido SQL, RLS, precio modificado, reservas, reintentos, contacto demo, horario cerrado
y aceptación dirigida; todos sus fixtures revierten. Las suites antiguas que crean pedidos
con `create_order` describen el contrato retirado y deben migrarse antes de ejecutarlas.
No se abre la app, emulador ni navegador para esta entrega; no se afirma validación visual,
Lighthouse ni una prueba E2E de componentes. Validar ubicación y WhatsApp en un teléfono
con una distribuidora real que publique su contacto antes del piloto.

Después: revisión de evidencias SEC vigentes, zonas más precisas, precios de suministro
y envase desglosados si corresponde, logística inversa completa, reseñas solo tras entrega,
redespacho/expiración de reservas, recuperación persistente de reintentos y avisos con
consentimiento. Los pagos en línea, recordatorios y tracking GPS siguen en tareas separadas.

## Diagnóstico cloud y requisitos para comprar

Lectura del 21 de octubre de 2026, sin modificar inventario ni habilitaciones:

| Negocio              | Marca/formato | Stock | Precio con canje | Precio sin canje |
| -------------------- | ------------- | ----: | ---------------: | ---------------- |
| Gasway Demo Santiago | Lipigas 5 kg  |    12 |          $10.990 | Pendiente        |
| Gasway Demo Santiago | Lipigas 11 kg |    11 |          $15.990 | Pendiente        |
| Gasway Demo Santiago | Lipigas 15 kg |    12 |          $21.990 | Pendiente        |
| Gasway Demo Santiago | Lipigas 45 kg |     9 |           $8.000 | Pendiente        |

Son datos ficticios de un negocio demo; el precio de 45 kg es el configurado y no se
corrige por suposición. No existen ofertas publicadas de Gasco o Abastible en
`distributor_products`. Los cuatro productos Lipigas y el negocio están habilitados.
El horario no está informado y no bloquea. Las dos filas de `drivers` están sin
verificar, no disponibles, sin distribuidora y con perfiles `customer`; por tanto
no hay cobertura operativa ni ofertas de reparto emitibles.

Para habilitar una compra se necesita completar la incorporación por invitación al
negocio, postulación y revisión administrativa confiable; después el conductor
habilitado hereda las comunas CUT elegidas por el negocio y activa disponibilidad. El cliente compra con
otra cuenta: un conductor no puede aceptar su propio pedido. Para comprar sin canje,
el responsable además debe informar el precio con envase en **Mi negocio → Catálogo**.
Cargar stock por sí solo no sustituye ninguno de esos pasos.

La configuración vigente de cobertura está en **Mi negocio → Cobertura → Elegir/Editar
comunas**. No requiere conductores para guardarla. Desde ADR 0021 la fuente es
`distributor_communes`: `has_coverage` describe la cobertura del negocio y
`has_available_driver`, su capacidad de reparto actual. Retirar una comuna vence
ofertas sin asignar en esa zona; las entregas ya asignadas pueden terminar.
