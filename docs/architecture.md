# Arquitectura inicial

## Gestión del negocio

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
las ediciones registran actor y snapshot privado. No se reutiliza para precios de
pedidos hasta implementar elección del vendedor y reserva de stock en el servidor.
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

Monorepo npm con una app Expo Android/iOS. El futuro panel web no se crea todavía.
app/ contiene rutas delgadas; src/features agrupa auth, orders, tracking, driver y
profile; auth, orders/customer y driver están implementados; las demás features siguen reservadas. shared
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
operaciones en web; ubicación, notificaciones y mapas no se importan en los flujos
actuales. El registro web retorna al origen del navegador autorizado en Supabase y
la entrega utiliza confirmación explícita dentro de la pantalla, igual en web y nativo.
El refresco sigue AppState y las consultas se pausan en segundo plano. Eventos Auth
limpian caché para evitar compartir datos entre identidades; errores bloquean el guard.
Stack.Protected restringe cada ruta y elimina del historial las rutas no autorizadas.

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
borradores de comunas permanecen locales hasta guardar. Cambiar disponibilidad usa
las comunas guardadas, sin incorporar el borrador. La expiración local oculta ofertas
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
y publicación de su propia ubicación cuando el repartidor está verificado.

| Datos                | Lectura móvil                                    | Escritura móvil                                                        |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| profiles             | Propio                                           | display_name, rut, commune_code propios                                |
| drivers              | Propio                                           | RPC de solicitud pendiente y disponibilidad                            |
| driver_communes      | Propia                                           | RPC set_driver_settings                                                |
| products             | Catálogo activo autenticado                      | Ninguna                                                                |
| orders               | Cliente o repartidor asignado                    | RPC create_order/cancel_order/accept_driver_offer/advance_driver_order |
| communes             | Catálogo CUT autenticado                         | Ninguna                                                                |
| order_events         | Participantes del pedido                         | Ninguna                                                                |
| driver_locations     | Propia / cliente con pedido activo de ese driver | Driver verificado, propia                                              |
| private.order_offers | Ninguna                                          | Ninguna                                                                |

No se habilitan escrituras generales para completar features todavía ausentes.
Precios, aprobación, ofertas y demás transiciones requieren operaciones confiables;
create_order y cancel_order ya encapsulan la escritura cliente en Postgres (ADR 0006).
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
El rechazo vence la oferta propia. No se implementan matching geográfico, push ni tracking.

Realtime publica orders, order_events y driver_locations. Las lecturas se sujetan a RLS;
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

Solo están configurados permisos de ubicación en primer plano. No se solicita ubicación
al iniciar ni se activa tracking en segundo plano. Un mapa futuro debe especificar
PROVIDER_GOOGLE en react-native-maps. Claves de build por plataforma, restringidas a
package/firma o bundle; no equivalen a secretos de servidor.

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
