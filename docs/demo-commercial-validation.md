# Demo funcional y validación comercial

Fecha: **2026-10-23**. Prioridad solicitada: demostrar Gasway y confirmar la
viabilidad contractual antes de completar el roadmap de producción.
Este documento organiza el trabajo; los cierres remiten a evidencia y sus límites.

**D0 completado posteriormente el 2026-10-23:** entorno cloud, limpieza de cuentas,
aprobación de conductor y comprobaciones de permisos en [evidencia D0](demo-environment.md).
**D1 completado por indicación del operador el 2026-10-24:** [mapa y guardado del
punto](maps-setup.md), configuración Google y migración Test/app. Proyecto vigente
**Gasway Maps (`mapapp-389403`)**, antes MapAPP, con facturación existente activa;
`gw-dst` queda como antecedente sin facturación. No se añadieron tarjetas ni se
reabrieron cuentas de facturación. No se registra aquí una nueva prueba visual de Codex.
**D2 completado el 2026-10-24:** [contrato GPS](gps-contract.md), RPC, aislamiento
por pedido y cierre en servidor, con pruebas dirigidas y migración en Test/app.
**D3 implementado el 2026-10-24:** [GPS en primer plano y mapa en vivo](live-tracking.md),
con permisos, reconexión, caducidad y limpieza. Ensayos del operador parcialmente
aprobados: pausa/recuperación, segundo plano, entrega, cancelación y denegación
de permiso con recuperación al concederlo. Modo avión, sin internet y permiso
solicitado de nuevo aprobados expresamente, con recuperación manual de GPS;
reanudación automática queda como mejora posterior. El mapa iOS ya está implementado
con Apple Maps recuperado en Expo Go iOS y Google Maps en Android (2026-10-25),
pendiente de ensayo visual de animación y demás evidencia física. [Rutas](vehicle-motion.md).
El recorrido completo sigue en D4. Ampliación 2026-10-25 autorizada: rutas Google
y OSRM de demo, mapa del conductor ampliable y GPS durante navegación externa en
Android. Implementación/cloud/APK preparados; [prueba física pendiente](driver-navigation.md).
D4/D5 pendientes. No se presume evidencia de dispositivo por cerrar D0/D1.

## Qué permitió establecer la búsqueda pública

**No se encontró una prohibición pública general de aparecer en aplicaciones
externas para las tres marcas. Tampoco se encontró una autorización general.**
Los contratos y anexos del distribuidor concreto siguen siendo la evidencia decisiva.

| Fuente primaria consultada                                                                                                                     | Hallazgo                                                                                                                                                  | Límite para Gasway                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [FNE, informe de archivo del 25-03-2024, párrafos 7–8 y 18](https://www.fne.gob.cl/wp-content/uploads/2024/04/inpu_002_2024-Rol-2668-21.pdf)   | Distingue venta directa y distribuidores independientes, usualmente exclusivos, con recepción propia de pedidos. Examina contratos de Abastible en Arica. | No publica una habilitación para marketplaces ni resuelve el contrato de un futuro participante.                       |
| [Gasco, promoción PedidosYa](https://convenios.gasco.cl/promociones/pedidosya)                                                                 | Publica una promoción para distribuidores adheridos a esa app externa.                                                                                    | Prueba un canal acordado; no permite asumir adhesión libre a otras plataformas ni vigencia de condiciones para Gasway. |
| [Abastible, términos de su app](https://abastible.cl/terminos-y-condiciones-app-abastible/)                                                    | Regulan a usuarios de esa plataforma y contemplan alianzas comerciales.                                                                                   | No sustituyen el contrato de distribución ni autorizan a Gasway.                                                       |
| [Lipigas, LipiPartners](https://lipigas.cl/puntos-de-contacto/para-lipipartners/) y [LipiApp](https://lipiapp.lipigas.cl/terminos-condiciones) | Ofrece contacto especializado para distribuidores; la página de LipiApp no expuso el clausulado completo en la lectura web.                               | No se obtuvo contrato público que confirme o descarte restricciones para apps externas.                                |

**Interpretación:** exclusividad de marca y exclusividad del canal de pedidos son
preguntas diferentes. La evidencia permite investigar una integración comercial;
no permite prometer a un distribuidor que su contrato admite Gasway.
Un operador que solo entrega pedidos de la marca puede tener facultades distintas
a las de un negocio que vende por cuenta propia.

La [comunicación de la FNE del 20-06-2023](https://www.fne.gob.cl/gobierno-presento-proyecto-de-ley-que-recoge-recomendaciones-de-la-fne-para-mejorar-la-competencia-en-el-mercado-del-gas-licuado-de-petroleo/)
describe un proyecto contra exclusividades. Aquí se cita como antecedente histórico:
no se comprobó su tramitación actual ni se presenta como ley vigente.

## Cómo despejar la duda con un distribuidor

1. Identificar si el interesado vende por cuenta propia o presta logística a la marca.
2. Solicitar revisión del contrato vigente, anexos y manuales incorporados:
   canales digitales, exclusividad, territorio, marcas/imágenes, datos de clientes,
   subcontratación tecnológica, comisiones y causales de término. Puede entregar
   solo las cláusulas necesarias, ocultando información comercial ajena a la consulta.
3. Pedir respuesta escrita a su ejecutivo comercial o área de contratos sobre el
   modelo concreto: vendedor identificado, precio propio, reparto del distribuidor,
   efectivo contra entrega y eventual comisión de Gasway. Consultar por separado
   si cambia la respuesta cuando la plataforma muestra distribuidores de otras marcas.
4. Obtener autorización o modificación contractual cuando corresponda; una respuesta
   informal o la mera ausencia de respuesta no cierra esta condición. Si la cláusula
   es ambigua, encargar su revisión jurídica antes de operar.
5. Confirmar interés comercial y modalidad de cobro antes de ampliar desarrollo.
   Si se restringe el marketplace, evaluar software de pedidos para una sola
   distribuidora, sujeto también a su contrato; no asumir que ese cambio elimina la restricción.

Texto sugerido para enviar por el interesado; **no enviado por Codex**:

> Estamos evaluando Gasway, una plataforma independiente donde el distribuidor
> aparece como vendedor, fija sus precios y entrega con su equipo. El cliente
> solicita el cilindro, paga en efectivo al recibir y ve el seguimiento del reparto.
> La plataforma podría mostrar otros distribuidores y cobrar una comisión.
> ¿Nuestro contrato permite este canal? ¿Requiere autorización previa, limita la
> presencia junto a otras marcas o el uso de imágenes, y exige condiciones para
> compartir datos y ubicación? Agradeceremos indicar las cláusulas aplicables y
> quién puede autorizarlo por escrito. Inicialmente mostraremos una demo privada
> con operaciones ficticias.

## Recorrido que debe quedar funcional

Dos teléfonos Android con cuentas separadas, cliente y repartidor; el responsable
puede preparar el negocio desde una tercera sesión. Una app mantiene ambos roles.
Usar un negocio ficticio identificado como demo, una comuna CUT oficial, un producto
publicado con precio de ejemplo en CLP y stock, y un conductor aprobado para pruebas,
afiliado y disponible. No transportar GLP ni generar ventas reales en esta demostración.

1. Responsable configura catálogo, stock y cobertura.
2. Cliente confirma dirección y punto de entrega en Google Maps, elige producto,
   canje de vacío y distribuidora, revisa el precio y compra.
3. Repartidor recibe la oferta en su bandeja abierta y la acepta mediante la RPC
   atómica existente, antes del vencimiento.
4. Cambia a «En camino» y comparte su GPS real; el cliente ve el marcador actualizarse
   en Google Maps desde el segundo teléfono, con hora de última actualización.
5. Repartidor termina la entrega ficticia. Ambos ven el estado final y el cliente
   deja de acceder a su ubicación. El pedido queda en el historial.

Primera versión propuesta: seguimiento **con la app del repartidor en primer plano**.
La ampliación autorizada del 2026-10-25 incorpora GPS Android durante navegación
externa; implementación y APK listos, ensayos físicos pendientes en la guía actual.
Es seguimiento real, pero no garantiza continuidad al bloquear el teléfono o abrir
otra app. La demo debe explicar esa condición. Si la presentación exige ese
comportamiento, añadir una fase específica de segundo plano y sus pruebas antes
de considerarla lista. Push, navegación giro a giro y ETA de tráfico son capacidades
distintas del mapa y del GPS; no forman parte de este primer recorrido.

## Inventario inicial, antes de D1 y sin ejecutar la app

- Compra por distribuidora, stock, ofertas, aceptación y avance: implementados;
  su funcionamiento en el entorno elegido se debe ensayar.
- Realtime de pedidos y polling de respaldo: existentes; no equivalen a GPS en vivo.
- `react-native-maps` 1.27.2, `expo-location` y plugin con claves Android/iOS:
  declarados. `src/features/tracking` contiene solo `.gitkeep`; falta la interfaz.
- `public.driver_locations`: tabla, políticas y publicación Realtime en la migración
  inicial. Falta el productor móvil de coordenadas y el lector de seguimiento.
  La tabla sola no certifica el contrato de privacidad requerido ni su estado cloud.
- Dirección actual: GPS propone texto y comuna, sin conservar coordenadas en
  `DeliveryAddress`. Falta confirmar y persistir el punto del pedido para el mapa.
- `is_demo` y preparación histórica de negocio: existentes. Ese indicador no aísla
  datos ni acredita autorización comercial.

## Orden de ejecución acotado

| Paso                                                        | Trabajo                                                                                                                                                                                                                                                                        | Criterio de salida                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D0. Entorno — ✅ Completado                                 | Supabase de la app identificado, cuentas de prueba depuradas, conductor aprobado y negocio demo preparado. [Evidencia](demo-environment.md).                                                                                                                                   | Destino y permisos mínimos comprobados; Test/CI conserva su aislamiento y marcador.                                                                                                                  |
| D1. Maps — ✅ Completado                                    | Reutilizado **MapAPP `mapapp-389403` (745895471128)**, renombrado **Gasway Maps**, con facturación ya activa. `gw-dst` sin facturación queda histórico. Clave Android nueva restringida a paquete/SHA-1/SDK; APK recompilado, selector y guardado atómico del punto.           | Cierre solicitado por el operador; configuración, binario y pruebas del punto documentados en [D1](maps-setup.md). Ensayo integral en dos teléfonos pendiente en D4.                                 |
| D2. Contrato GPS — ✅ Completado                            | RPC de publicación/lectura por pedido, validación de coordenadas y captura, recepción del servidor, frescura de 30 s y máximo un envío aceptado cada 5 s. `driver_locations` pasa a privado, sin escrituras directas ni coordenadas en Realtime; borrado al entregar/cancelar. | Solo conductor verificado asignado publica en accepted/on_the_way; solo participantes leen. Muestras anteriores, antiguas o de otra entrega no se reutilizan. [Contrato y pruebas](gps-contract.md). |
| D3. Emisión y vista — Implementado, prueba física pendiente | Captura GPS explícita en primer plano y mapa cliente conectados. Envío acotado sin cola, Realtime/reconsulta/polling, destino, antigüedad, errores y caducidad. Migración Test/app y pruebas dirigidas aprobadas. Guía en [D3](live-tracking.md).                              | Un movimiento físico cambia el marcador en el otro teléfono. Logout, cancelación y entrega detienen captura/lectura y limpian caché.                                                                 |
| D4. Ensayo completo                                         | Recorrer compra → oferta → aceptación → en camino → entrega, repetir y probar pérdida de conexión/permiso GPS. Preparar forma de reponer fixtures propios.                                                                                                                     | Dos recorridos completos y repetibles; ningún paso depende de editar una fila durante la presentación.                                                                                               |
| D5. Presentación                                            | Instalar una versión Android con JS incluido si se mostrará sin el PC; documentar versión y guion.                                                                                                                                                                             | La presentación elegida funciona sin depender de Metro; se muestran límites y datos ficticios.                                                                                                       |

Estimación orientativa D0–D5: **5–8 días-persona**, reutilizando los flujos existentes;
excluye esperas de credenciales, autorización comercial y trabajo de segundo plano.
No es necesario implementar todo DT-07 ni todas las features para una demo privada.
Sí se conservan RLS, aprobación confiable, precios/asignación de servidor, separación
de cuentas y restricciones de claves. Los requisitos de apertura real siguen vigentes.

En D2–D3 mantener contratos y cliente Supabase neutrales en `src/shared`, captura en
`features/tracking/driver` y visualización de cliente en `features/tracking/customer`.
No introducir imports cruzados entre cliente y repartidor. Acordar retención corta
de la última posición; no guardar un historial de recorridos para esta demo.

Parámetros aplicados en servidor por D2: máximo una muestra aceptada cada 5 s y
frescura hasta 30 s desde captura/recepción (la que venza antes). D3 debe respetar
esos plazos y ocultar el marcador al caducar; no son garantías del GPS/red.
Ante desconexión no animar movimiento inventado ni
presentar una línea recta como una ruta calculada o una ETA de tráfico.

## Configuración y costos de Maps

`apps/mobile/app.config.ts` ya lee `GOOGLE_MAPS_ANDROID_API_KEY` y
`GOOGLE_MAPS_IOS_API_KEY`. Son claves incorporadas al binario: su protección depende
de restricciones de aplicación/API, no de ocultarlas en una variable. Revisar el
binario realmente usado: un cambio de clave/configuración nativa requiere reconstruir;
una recarga de Metro solo sirve para cambios compatibles de JavaScript.
[Expo Maps, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/).

Android primero reduce preparación. iOS con proveedor Google requiere su propia
clave y configuración; no se presume validado por probar Android. `watchPositionAsync`
sirve solo en primer plano.
[Expo Location, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

El destino vigente elegido después por el operador es **Gasway Maps**, ID
`mapapp-389403`, número `745895471128`, con facturación ya activa. El proyecto
`gw-dst` conserva la historia de preparación; usar el destino
vigente en cualquier configuración nueva. [Evidencia D1](maps-setup.md).

Confirmar los requisitos de cuenta/facturación de Maps antes de habilitarlo.
Usar solo el SDK necesario; Places, Routes y Geocoding de Google no se necesitan
para mostrar dos marcadores y elegir el destino manualmente. Revisar precios/cuotas
aplicables; no prometer costo cero. Presupuestos y alertas **no cortan el gasto**;
usar restricciones y cuotas donde estén disponibles.
[Configuración Android](https://developers.google.com/maps/documentation/android-sdk/get-api-key),
[control de costos](https://developers.google.com/maps/billing-and-pricing/manage-costs).

## Evidencia de salida y siguiente decisión

La demo se considera lista cuando el operador confirma los dos recorridos en
teléfonos, el mapa muestra GPS real, las interrupciones se indican con honestidad
y un usuario ajeno no puede leer ni publicar esa ubicación. Verificar también que
el cliente deja de verla tras entrega/cancelación y que no reaparece en otra sesión.
Registrar por separado implementación, migraciones aplicadas y evidencia de dispositivo.

Después de la presentación: obtener confirmación comercial/contractual del participante
y acordar costos. Recién entonces retomar el [roadmap de piloto y producción](ROADMAP.md)
y las condiciones de [seguridad operativa](pilot-security.md). Una demo exitosa no
convierte esas condiciones en completadas.

En la entrega inicial de investigación solo se consultaron fuentes y código y se
actualizó documentación. La preparación cloud posterior está registrada en D0.
La entrega D1 incorpora Maps Android y el punto; D2 añade el contrato GPS en servidor.
La captura/vista en vivo está implementada en D3, pendiente de prueba física.
Se reutiliza facturación existente,
sin habilitar otra cuenta; Codex no ejecutó la app ni pruebas visuales.
