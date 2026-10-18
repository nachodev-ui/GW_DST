# Arquitectura inicial

## Límites

Monorepo npm con una app Expo Android/iOS. El futuro panel web no se crea todavía.
app/ contiene rutas delgadas; src/features agrupa auth, orders, tracking, driver y
profile, vacíos hasta su implementación. shared contiene infraestructura compartida;
theme exporta tokens semánticos propios. La única ruta retorna null.

TanStack Query administrará estado remoto y su invalidación. Zustand se reserva para
estado local; no duplicar pedidos/sesiones en varios stores. react-hook-form + zod
se usarán en formularios; hoy solo existe validación lazy de configuración.
AppProviders inicializa QueryClient y SafeAreaProvider sin servicios de negocio.
No hay cliente Supabase todavía: la migración inicial está aplicada en cloud según
el usuario; falta validar pruebas y generar tipos reales.
Antes de Auth elegir almacenamiento seguro de sesión y refresco ligado al ciclo de
vida; expo-secure-store está instalado, sin persistencia de credenciales implementada.

## Backend y confianza

Postgres 17 con PostGIS geography(Point,4326), índices GiST y UUIDs. Auth crea un
perfil customer mediante trigger; no copia rol desde metadata editable. RLS está
activado en las seis tablas públicas y en las ofertas privadas. Grants explícitos
restringen al cliente a lecturas autorizadas, edición de campos seguros de su perfil
y publicación de su propia ubicación cuando el repartidor está verificado.

| Datos                | Lectura móvil                                    | Escritura móvil                         |
| -------------------- | ------------------------------------------------ | --------------------------------------- |
| profiles             | Propio                                           | display_name, rut, commune_code propios |
| drivers              | Propio                                           | Ninguna                                 |
| products             | Catálogo activo autenticado                      | Ninguna                                 |
| orders               | Cliente o repartidor asignado                    | Solo RPC accept_order                   |
| order_events         | Participantes del pedido                         | Ninguna                                 |
| driver_locations     | Propia / cliente con pedido activo de ese driver | Driver verificado, propia               |
| private.order_offers | Ninguna                                          | Ninguna                                 |

No se habilitan escrituras generales para completar features todavía ausentes.
Creación, precios, aprobación, ofertas y demás transiciones requieren futuros endpoints
con JWT verificado y zod antes de usar privilegios de servidor. service_role permanece
solo en servidor. Leer RLS no sustituye autorización de acciones privilegiadas.

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
Ver instrucciones de SQL Editor en README y ADR 0004. El shell falló al iniciar; se
continuó solo con archivos. Sin instalaciones, nube ni verificaciones visuales.
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
