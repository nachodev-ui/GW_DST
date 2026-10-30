# ADR 0035 — Google Maps y animación sobre rutas privadas

Fecha: 2026-10-25. Estado: implementado; credencial Directions configurada; ensayo nativo pendiente.
Sustituye ADR 0034 por instrucción explícita del operador.

**Corrección posterior del 2026-10-25:** Expo Go iOS no incluye el SDK Google.
La decisión de unificar proveedores solo es realizable en binarios que lo incluyan.
Se comprueba la capacidad nativa antes de montar. El operador autorizó recuperar
Apple Maps solo en Expo Go iOS; esa excepción ya está implementada.
[Diagnóstico y fuentes](../vehicle-motion.md).

Selector y seguimiento usan `PROVIDER_GOOGLE` en Android y builds iOS con SDK Google,
y proveedor nativo Apple en Expo Go iOS. El plugin mantiene claves separadas por
entorno para builds futuros; una clave no agrega un SDK ausente al runtime.
No se añade un proceso EAS, firma Apple ni compilación iOS.

El mismo motor puro por vehículo calcula rumbo esférico, interpola posición desde
la pose visual actual y gira por el arco corto con velocidad limitada. Google
recibe `rotation` y `flat` nativos. El SDK compone esa orientación respecto de la
cámara; no se resta manualmente el heading del mapa ni se transforma la imagen.
Se conserva un único PNG cenital con orientación norte y offset cero. La excepción
Apple usa transformación de imagen respecto de la cámara, porque MapKit no
implementa `rotation`/`flat`. No solicita ni representa rutas de Google: GPS puro.

Directions API (Legacy), ya habilitada en el proyecto existente, aporta polilíneas
desde una Edge Function autenticada. Se elige frente a Routes para usar el servicio
disponible sin habilitar otra API. Solo se solicita ruta para un pedido autorizado
con GPS fresco. La tabla privada reutiliza el resultado y serializa solicitudes
mediante un lease. Tres fixes desviados durante 10 s permiten recalcular, con
cooldown y seis intentos máximos por pedido. GPS es el fallback ante cualquier fallo.

La credencial del proveedor vive exclusivamente como secreto de servidor. La
revisión automática rechazó crear una clave limitada por API sin restricción IP;
el operador autorizó expresamente ese alcance y la clave ya está configurada
en Test/app. OSRM solo para demo Apple fue autorizado después; caché separada y
GPS Android durante navegación se registran en ADR 0036. Las claves móviles están restringidas
por aplicación y SDK; no sirven para Directions del servidor.

Las coordenadas de ruta son privadas y no se publican por Realtime. Se borran al
terminar el pedido; expiran a las 2 h y se purgan al leer. La purga programada de
viajes abandonados sigue pendiente de DT-08. No se presenta una prueba lógica ni
la simulación local como evidencia visual de Expo Go.

Fuentes: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/),
[Directions](https://developers.google.com/maps/documentation/directions/get-directions),
[políticas del servicio](https://developers.google.com/maps/documentation/directions/policies).
