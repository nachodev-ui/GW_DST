# Arquitectura inicial

## Gestión del negocio

ADR 0039 añade [revisión documental](document-verification.md): versiones privadas,
capacidad admin por tabla privada, pantalla mínima en `(admin)` y predicados SQL
que complementan la aprobación operativa en disponibilidad/ofertas/aceptación.
La flota deja de ser solo descriptiva. Migración aplicada solo en Test; no desplegada
en Gasway Project. La función de limpieza está desplegada solo en Test (versión 1,
ACTIVE), tras autorización explícita del operador el 2026-10-26.

Desde ADR 0037, una membresía vigente dirige el inicio al workspace del distribuidor:
Panel, Ventas, Operación y Perfil. `theme.business` diferencia su composición;
`features/business` contiene agregados de ventas por período de Chile, costos por
pedido, flota descriptiva y perfil comercial. Nuevas tablas con RLS, escrituras CAS
mediante RPC y auditoría privada. Imágenes en Storage privado con URLs firmadas;
no se copian antecedentes ni se amplía el acceso a ubicaciones de clientes.
La migración del workspace está aplicada en Test y app; ver
[contrato y activación](distributor-workspace.md).

`features/business` y `(business)` contienen alta y gestión de la distribuidora, con
entrada desde cliente/conductor por navegación. No se mezclan sus hooks de pedidos
ni se añade un rol móvil: `profiles.role` permanece customer/driver, y las capacidades
del negocio provienen de `distributor_members`. El layout de workspace exige membresía
actual consultada al servidor; las RPC vuelven a comprobar identidad y membresía.
Una revocación o error de acceso cierra el workspace; cachés quedan por usuario y
se limpian con la sesión. Pending/rejected no obtienen permisos del negocio.

El alta usa zod y SQL para RUT, contacto, CUT oficial, marcas y referencias privadas.
La revisión INVOKER es exclusiva de postgres, recibe requested_at exacto, registra
snapshot/motivo/operador y crea organización+membresía+marcas en la misma transacción.
Los endpoints móviles son wrappers INVOKER de implementación privada autorizada,
con search_path vacío y EXECUTE mínimo. Nuevas tablas mantienen RLS sin escritura
directa desde la app. El demo se carga con SQL explícito, fuera de las migraciones.

El catálogo del negocio usa CAS sobre revision y bloquea negocio/membresía/marca;
las ediciones registran actor y snapshot privado. ADR 0018 conecta la elección del
vendedor y sus precios a reservas transaccionales, devolución al cancelar y una clave
idempotente de compra. Las nuevas RPC conservan wrappers INVOKER e implementaciones
privadas autorizadas. Contacto/horario/ETA comerciales se configuran expresamente;
no se publican datos privados de postulación. WhatsApp sirve para consultas generales.
Las solicitudes anteriores reutilizan la confirmación versionada de ADR 0013 sin
truncar microsegundos. La incorporación nueva sigue ADR 0015: invitación del negocio,
aceptación personal y revisión administrativa, sin alterar el catálogo.

`private.driver_invitations` y sus eventos son inaccesibles directamente desde la
app. Las RPC toman identidad de auth.uid y comprueban membresía o correo confirmado
desde auth.users. Ningún claim de email/metadata autoriza la aceptación. Las invitaciones
son una bandeja interna; no se requieren tokens portadores, cuentas creadas por otro
usuario ni un servicio de envío. Una aceptación repetida por su destinatario es
idempotente. La unicidad parcial impide dos afiliaciones aceptadas vigentes por conductor.

La creación individual/lote usa la misma RPC, con vista previa sin escrituras, límite
100 y validación de todo el lote antes de cambios. La unicidad por negocio/correo
conserva una invitación pendiente en un reintento. Cancelar y vencer no borra auditoría;
tras rechazo se renueva la invitación. Los bloqueos de driver/solicitud y luego negocio/
invitación coordinan incorporación y revisión. La confirmación de la nueva versión
se registra desde la acción original del invitador; el review guarda esa evidencia.

Equipo se sirve por páginas de 20 mediante RPC, sin RUT, teléfono ni documentos;
cuentas y cachés se mantienen separadas por usuario/negocio. El lector de CSV limita
filas/tamaño, soporta entrada pegada y archivo, y elimina su copia de caché nativa
tras leerla. expo-document-picker/expo-file-system necesitan un build que los incluya.

## Límites

Monorepo npm con una app Expo SDK 58 Android/iOS. El futuro panel web no se crea todavía.
app/ contiene rutas delgadas; src/features agrupa auth, orders, tracking, driver y
profile; auth, orders/customer, driver y tracking tienen implementación. shared
contiene infraestructura compartida; theme exporta tokens semánticos propios.
Las rutas componen AuthNavigator, AccessScreen, pedidos cliente y zona de repartidor.
Los grupos (customer) y (driver) protegen también enlaces directos a sus pantallas.
Primitivas visuales compartidas viven en shared/ui; contratos neutrales en shared/orders.

TanStack Query mantiene el acceso remoto, indexado por usuario, con validación zod.
Zustand se reserva para estado UI; AuthProvider es la única fuente React de sesión.
react-hook-form + zod validan credenciales. AppProviders inicializa QueryClient,
SafeAreaProvider y AuthProvider. El cliente shared/supabase usa URL y publishable key
públicas. SecureStore cifra fragmentos de sesión en Android/iOS, con manifiesto
publicado al terminar la escritura; web conserva sesión solo en memoria.
La web usa Metro únicamente para pruebas de desarrollo. SecureStore no recibe
operaciones en web; el selector Google usa una implementación `.native.tsx` y un
fallback web sin importar Maps nativo. El registro web retorna al origen autorizado en Supabase y
la entrega utiliza confirmación explícita dentro de la pantalla, igual en web y nativo.
El refresco sigue AppState y las consultas se pausan en segundo plano. Eventos Auth
limpian caché para evitar compartir datos entre identidades; errores bloquean el guard.
Stack.Protected restringe cada ruta; en Router 58 las rutas protegidas siguen
registradas y redirigen si falla el guard. Las RPC vuelven a autorizar cada operación.

D1 confirma el punto de entrega en el cliente y usa una RPC específica que reutiliza
la compra y guarda la geografía antes del mismo commit; los reintentos comparan
también el punto. La compra anterior admite clientes/web sin coordenadas. No se
añade captura de ubicación del conductor. Ver ADR 0031 y `docs/maps-setup.md`.

D2 define GPS por pedido mediante RPC: coordenadas en `private.driver_locations`,
recepción de servidor, validación temporal, límite 5 s y frescura 30 s. Realtime solo
transporta revisiones sin coordenadas; cada aviso requiere lectura autorizada.
El término/cancelación borra la posición en la misma transacción. Contratos neutrales
en `shared/tracking`. Ver ADR 0032 y `docs/gps-contract.md`.

D3 compone captura en `tracking/driver` con permiso explícito y ciclo de vida de
pantalla; visualización en `tracking/customer` con Maps nativo y fallback web.
`shared/tracking` no conoce roles: recibe usuario/pedido/activación, administra
TanStack Query y señales Realtime, reconsulta al reconectar y caduca con reloj
monotónico. Un error sustituye coordenadas por una lectura vacía; se cancelan
peticiones y se elimina caché al salir/cambiar sesión. No hay persistencia GPS,
cola offline ni servicios de segundo plano. La RPC añade destino confirmado solo
durante el pedido activo; el stream sigue sin coordenadas. Ver ADR 0033 y `docs/live-tracking.md`.

El espacio driver separa Ofertas/Cobertura/Cuenta de los pedidos del cliente y de la
gestión business. Las rutas de compra están disponibles para toda sesión autenticada,
incluido un conductor; las rutas de reparto mantienen el guard de habilitación. No
se introduce un modo local que autorice roles ni imports entre driver y customer.
El cambio de vista solo navega; backend conserva RLS y exclusión de autoasignación.

`get_my_driver_workspace()` toma auth.uid, consulta solo su afiliación, marcas y
membresías y devuelve razones operativas, sin conceder capacidades. Su implementación
privada usa search_path vacío y EXECUTE autenticado mínimo; wrapper INVOKER público.
La habilitación depende de profiles/drivers; el negocio verificado con marcas es un
requisito adicional para nuevos repartos. Terminar entregas asignadas conserva la
regla anterior aunque el negocio pierda verificación. Ver ADR 0016.

Ofertas/contexto/configuración/entrega se releen solo con foco y primer plano; los
conductores heredan las comunas de su distribuidora. El responsable edita la cobertura
por RPC con revisión; el conductor solo cambia disponibilidad. La expiración local oculta ofertas
viejas; el servidor mantiene la decisión atómica y la expiración autoritativa.
Un error al consultar el pedido activo bloquea nuevas aceptaciones. Realtime de
compras se monta en el layout customer con su foco, también al comprar un conductor.
La zona driver exige rol driver y aprobación; las demás cuentas conservan acceso
customer. Mi cuenta consulta estado/motivo/fecha de postulación bajo RLS, con caché
propia por usuario y errores locales que no bloquean comprar. Se reconsulta al volver,
cada 30 segundos en primer plano y manualmente. `/pending` redirige a Mi cuenta.
La migración Auth está aplicada según el usuario; falta validar su suite y generar tipos reales.

## Backend y confianza

Postgres 17 con PostGIS geography(Point,4326), índices GiST y UUIDs. Auth crea un
perfil customer mediante trigger; no copia rol desde metadata editable. RLS está
activado en todas las tablas públicas, incluido el catálogo de comunas, y en las ofertas privadas. Grants explícitos
restringen al cliente a lecturas autorizadas, edición de campos seguros de su perfil
y RPC de ubicación por pedido para el repartidor verificado asignado.

| Datos                    | Lectura móvil                                                 | Escritura móvil                                                                    |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| profiles                 | Propio                                                        | display_name, rut, commune_code propios                                            |
| drivers                  | Propio                                                        | RPC de solicitud pendiente y disponibilidad                                        |
| distributor_communes     | Miembros del negocio y sus conductores                        | RPC set_business_coverage                                                          |
| products                 | Catálogo activo autenticado                                   | Ninguna                                                                            |
| orders                   | Cliente o repartidor asignado                                 | RPC create_distributor_order/cancel_order/accept_driver_offer/advance_driver_order |
| communes                 | Catálogo CUT autenticado                                      | Ninguna                                                                            |
| order_events             | Participantes del pedido                                      | Ninguna                                                                            |
| private.driver_locations | Solo RPC para participantes del pedido activo; muestra fresca | RPC del conductor verificado asignado; borrado terminal                            |
| order_tracking_signals   | Participantes activos, solo ID/revisión                       | Sin escritura directa móvil                                                        |
| private.order_offers     | Ninguna                                                       | Ninguna                                                                            |

No se habilitan escrituras generales para completar features todavía ausentes.
Precios, aprobación, ofertas y demás transiciones requieren operaciones confiables;
create_distributor_order y cancel_order encapsulan la escritura cliente en Postgres
(ADRs 0006 y 0018). `create_order` es histórico y no permite ejecución móvil.
La consulta comercial separa stock, cobertura CUT y disponibilidad de conductor;
la app no usa el precio global histórico ni concede reparto a partir del stock (ADR 0019).
ADR 0021 traslada cobertura a la distribuidora y elimina la tabla y escritura por
conductor. Las comunas antiguas se conservan en un archivo privado administrativo.
Los futuros endpoints con privilegios requieren JWT verificado y zod. service_role permanece
solo en servidor. Leer RLS no sustituye autorización de acciones privilegiadas.

request_driver_access() es un wrapper SECURITY INVOKER sobre una función privada
SECURITY DEFINER, con search_path vacío y EXECUTE solo para authenticated. Toma
identidad exclusivamente de auth.uid(), inserta pendiente/no disponible y no cambia
el rol. ON CONFLICT DO NOTHING preserva aprobaciones ante reintentos. La aprobación
administrativa debe actualizar rol y verificación juntos en una transacción confiable.
Ver ADR 0005 para Auth, ADR 0006 para pedidos cliente y ADR 0007 para ofertas del repartidor.

ADR 0009 agrega organizaciones distributors, responsables distributor_members,
afiliación única drivers.distributor_id y solicitudes driver_applications. Las tablas
nuevas tienen RLS, lectura propia/afiliada y ninguna escritura móvil. La revisión
es una función privada SECURITY INVOKER exclusiva del operador SQL privilegiado:
actualiza acceso y decisión e inserta auditoría privada en una transacción. No hay
API administrativa pública. ADR 0010 agrega la respuesta en Mi cuenta y la RPC explícita
reapply_driver_access: solo rejected → pending, con identidad propia, sin habilitación
ni entrega activa, preservando revisiones anteriores. El vínculo vendedor-pedido sigue pendiente.

ADR 0012 agrega formulario en features/auth y submit_driver_application, que valida
datos/estado/negocio bajo bloqueos y conserva el acceso customer. Los datos personales
quedan en driver_applications con RLS propia; una copia de cada revisión nueva queda
en la auditoría privada. El directorio autenticado devuelve solo id/nombre de negocios
verificados que aceptan postulaciones. Un trigger impide aprobar sin antecedentes o
afiliar a un negocio distinto al elegido. No se amplían permisos de tablas del móvil.

ADR 0013 exige además confirmación de un responsable autenticado del negocio para
la versión exacta de la postulación. El listado del negocio expone solo nombre e
identificadores mínimos; RUT/teléfono permanecen privados. distributor_brands limita
disponibilidad, despacho, ofertas y aceptación; orders.distributor_id se fija e
inmoviliza al asignar. La pérdida posterior de verificación del negocio bloquea nuevas
asignaciones, pero permite terminar la entrega ya asignada. Falta su interfaz y el
flujo comercial de precio/stock y vendedor conocido antes de confirmar la compra.

La implementación SECURITY DEFINER de aceptación vive en private, fuera del esquema
API. search_path vacío, nombres calificados, identidad tomada de auth.uid(), grants de
EXECUTE limitados y comprobación explícita de oferta/rol reducen su superficie.
La función pública es un wrapper SECURITY INVOKER. La concesión de USAGE sobre private
no expone sus tablas a PostgREST ni da lectura a las ofertas.

La aceptación condicional y el evento se confirman juntos. Se bloquea también la fila
del driver y existe un índice único parcial de pedidos activos. El despacho usa comunas
CUT y ofertas de 60 s. list_driver_offers entrega solo el resumen sin PII; accept_driver_offer
reutiliza la aceptación y get_driver_order entrega datos privados solo al asignado.
El rechazo vence la oferta propia. No se implementan matching geográfico ni push;
el seguimiento en primer plano se compone por separado en D3.

Realtime publica orders, order_events y order_tracking_signals; driver_locations es
privada y no se publica. Las lecturas se sujetan a RLS;
no publicar perfiles ni ofertas internas. Las ofertas se consultan por RPC autorizada
con polling de 5 s solo con pantalla enfocada y AppState activo, validación zod y
caché por usuario. La dirección se entrega tras aceptar. Ver ADR 0007.
No crear canales públicos de coordenadas ni depender de notificaciones para consistencia.

advance_driver_order verifica rol/aprobación y asignación, bloquea driver y pedido,
y permite únicamente accepted → on_the_way → delivered. Reutiliza los triggers de
transiciones y eventos; fija delivered_at existente. El driver sale de activos al
entregar y reactiva disponibilidad manualmente. La migración nueva asegura orders
en la publicación idempotentemente sin modificar RLS. Ver ADR 0008.

El layout customer monta una suscripción filtrada por customer_id. Invalida el prefijo
customer-orders por usuario para releer lista, detalle y eventos validados con zod.
Sin conexión usa intervalo de 15 s en AppState activo; reconectar y volver a primer
plano también invalidan. Canal, listener e intervalo se limpian al desmontar/cambiar
identidad. La línea de tiempo lee order_events para conservar la historia real.
Cada ejecución del efecto tiene un identificador de canal distinto: Supabase reutiliza
canales por nombre y removeChannel termina de forma asíncrona. Esto evita registrar
callbacks sobre una suscripción anterior al remontar el layout, incluso en Strict Mode.

## Ubicación, mapas y pagos

La ubicación se solicita al activar explícitamente el seguimiento. El modo inicial
es primer plano; navegación del conductor Android añade servicio de ubicación con
notificación, permisos y consentimiento acotado por entrega (ADR 0036). iOS no
incorpora ubicación en segundo plano. Selector y seguimiento usan
react-native-maps: PROVIDER_GOOGLE en Android y builds iOS con su SDK; Apple Maps
en Expo Go iOS por indicación del operador. Se verifica la capacidad nativa.
`shared/maps/provider.ts` exige clave propia solo fuera de Expo Go. iOS/Android exigen pin
para compras nuevas; web conserva dirección manual. Ver ADR 0035. Claves Google
de build restringidas a package/firma o bundle; no son secretos de servidor.
El motor puro compartido anima una instancia por vehículo; el cliente compone
captura autorizada y marcador nativo. Apple gira la imagen respecto de la cámara;
Google aplica rotación nativa. OSRM de demo proporciona rutas para Apple, separado
por proveedor y con límite/atribución. Directions solo se consume sobre Google Maps desde Edge Functions,
nunca con la clave del SDK móvil. Caché privada por pedido, lease, límite de intentos,
desvío validado en servidor y purga terminal. [Contrato de rutas](vehicle-motion.md).

PaymentProvider es solo contrato; cash_on_delivery es el único método habilitado en
SQL. No existe SDK de gateway, implementación falsa ni servicio facturable activo.

## Configuración y operación

.env.example se copia al directorio de la app. EXPO_PUBLIC_* se inserta en el bundle;
solo URL y clave publishable de Supabase. Nunca incluir service_role, contraseñas o
credenciales de proveedores. SQL y seed quedan versionados; la migración inicial
está aplicada en el proyecto cloud según el usuario.
Config local habilita Auth, Realtime y correo de desarrollo local. Cambiar URLs locales
para un dispositivo físico. No fijar redirect wildcards en producción sin revisarlos.

## Validación y pendientes

La suite supabase/tests/initial_schema.sql se entrega sin ejecutar: crea sus usuarios,
simula authenticated con request.jwt.claims y revierte todos los datos con ROLLBACK.
Ver instrucciones de SQL Editor en README y ADR 0004. Para Auth pasaron las assertions
locales de reglas, credenciales y almacenamiento seguro simulado. El typecheck posterior
a la corrección de AppState y a la alineación con SDK 57 pasó antes del commit. Sin instalaciones, llamadas al
proyecto cloud ni verificaciones visuales. La suite Auth sigue pendiente; la migración está aplicada.
La aceptación usa un único UPDATE de orders condicionado a offered y sin asignación,
con oferta dirigida vigente; el bloqueo de fila reevalúa ese predicado al competir.
Los UPDATE de disponibilidad y los eventos comparten la transacción de la llamada.
La suite cubre aislamiento de pedidos, ganador/rechazo secuencial y salto inválido
accepted → delivered. Las ofertas sin asignar siguen ocultas por privacidad.
Pendientes de ejecución y escenarios adicionales:

- anon no lee tablas ni llama aceptación; un cliente no modifica rol, precio o estados.
- customer A no lee pedidos/eventos/ubicación de B; tampoco hay lectura de ofertas privadas.
- driver no aprobado, sin oferta o con oferta vencida no acepta.
- dos sesiones de drivers compiten por el mismo pedido: exactamente una gana y se crea un evento accepted.
- dos ofertas aceptadas simultáneamente por un driver: queda como máximo un pedido activo.
- cancelación concurrente y aceptación no crean una combinación inválida.
- estado terminal no reabre y el cliente deja de ver coordenadas al terminar.

Los tipos generados, tests pgTAP, precios/stock por distribuidor, retención de coordenadas,
consentimiento y observabilidad deben definirse antes del piloto.

Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PostGIS](https://supabase.com/docs/guides/database/extensions/postgis),
[Google Maps en Expo](https://docs.expo.dev/versions/latest/sdk/map-view/).
