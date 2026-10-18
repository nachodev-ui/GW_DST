# Arquitectura inicial

## Límites

Monorepo npm con una app Expo Android/iOS. El futuro panel web no se crea todavía.
app/ contiene rutas delgadas; src/features agrupa auth, orders, tracking, driver y
profile; auth y orders/customer están implementados; las demás features siguen reservadas. shared
contiene infraestructura compartida; theme exporta tokens semánticos propios.
Las rutas componen AuthNavigator, AccessScreen, pedidos cliente y zonas de repartidor/espera.
El grupo (customer) protege también enlaces directos a nuevo pedido y detalle.
Primitivas visuales compartidas viven en shared/ui; contratos neutrales en shared/orders.

TanStack Query mantiene el acceso remoto, indexado por usuario, con validación zod.
Zustand se reserva para estado UI; AuthProvider es la única fuente React de sesión.
react-hook-form + zod validan credenciales. AppProviders inicializa QueryClient,
SafeAreaProvider y AuthProvider. El cliente shared/supabase usa URL y publishable key
públicas. SecureStore cifra fragmentos de sesión en Android/iOS, con manifiesto
publicado al terminar la escritura; web conserva sesión solo en memoria.
El refresco sigue AppState y las consultas se pausan en segundo plano. Eventos Auth
limpian caché para evitar compartir datos entre identidades; errores bloquean el guard.
Stack.Protected restringe cada ruta y elimina del historial las rutas no autorizadas.
La zona driver exige rol driver y aprobación; solicitudes o estados incompletos
van a espera. Se reconsulta al volver, cada 30 segundos en primer plano y manualmente.
La migración Auth se entrega sin aplicar; falta validar SQL y generar tipos reales.

## Backend y confianza

Postgres 17 con PostGIS geography(Point,4326), índices GiST y UUIDs. Auth crea un
perfil customer mediante trigger; no copia rol desde metadata editable. RLS está
activado en todas las tablas públicas, incluido el catálogo de comunas, y en las ofertas privadas. Grants explícitos
restringen al cliente a lecturas autorizadas, edición de campos seguros de su perfil
y publicación de su propia ubicación cuando el repartidor está verificado.

| Datos                | Lectura móvil                                    | Escritura móvil                            |
| -------------------- | ------------------------------------------------ | ------------------------------------------ |
| profiles             | Propio                                           | display_name, rut, commune_code propios    |
| drivers              | Propio                                           | Solo RPC de solicitud pendiente            |
| products             | Catálogo activo autenticado                      | Ninguna                                    |
| orders               | Cliente o repartidor asignado                    | RPC create_order/cancel_order/accept_order |
| communes             | Catálogo CUT autenticado                         | Ninguna                                    |
| order_events         | Participantes del pedido                         | Ninguna                                    |
| driver_locations     | Propia / cliente con pedido activo de ese driver | Driver verificado, propia                  |
| private.order_offers | Ninguna                                          | Ninguna                                    |

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
Ver ADR 0005 para Auth y ADR 0006 para el flujo posterior de pedidos cliente.

La implementación SECURITY DEFINER de aceptación vive en private, fuera del esquema
API. search_path vacío, nombres calificados, identidad tomada de auth.uid(), grants de
EXECUTE limitados y comprobación explícita de oferta/rol reducen su superficie.
La función pública es un wrapper SECURITY INVOKER. La concesión de USAGE sobre private
no expone sus tablas a PostgREST ni da lectura a las ofertas.

La aceptación condicional y el evento se confirman juntos. Se bloquea también la fila
del driver y existe un índice único parcial de pedidos activos. No se implementa matching,
fan-out push, websockets de aplicación ni una máquina de estados móvil.

Realtime publica orders, order_events y driver_locations. Las lecturas se sujetan a RLS;
no publicar perfiles ni ofertas internas. El despacho futuro debe enviar ofertas con
mínimos datos (sin dirección precisa) por un canal privado/endpoint autorizado.
No crear canales públicos de coordenadas ni depender de notificaciones para consistencia.

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
proyecto cloud ni verificaciones visuales. La suite Auth y la migración siguen pendientes.
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
