# ADR 0036 — Ruta visible y navegación externa del conductor

Fecha: 2026-10-25. Estado: implementado, cloud y APK preparados; pruebas físicas pendientes.

El operador autorizó Directions sin restricción IP como secreto de Supabase,
navegación externa y GPS Android mientras usa otra app. Autorizó separadamente
OSRM de FOSSGIS solo para la demo, con conocimiento de sus logs de coordenadas.

El conductor ve una polilínea real en un mapa ampliable y abre Google Maps/Waze
para indicaciones por voz y tráfico. Gasway no implementa un motor propio de
navegación ni presenta una línea recta entre marcadores como ruta vial.

Rutas Google para Google Maps y OSRM para Apple Maps. La caché y las consultas
se separan por proveedor; lease y controles de desvío permanecen en servidor.
OSRM tiene presupuesto compartido entre pedidos, atribución y switch de demo.
No se consulta un servidor de rutas por cada GPS. Caídas conservan GPS sin
inventar trazados. El endpoint OSRM de demo debe sustituirse antes de producción.

El GPS continuo requiere acción explícita y permisos en Android, con servicio y
notificación persistentes. Se mantiene el modo anterior de primer plano. La
implementación vive bajo tracking/driver y su configuración nativa está aislada
en la sección del conductor. Una sola app permanece; el marcador animado genérico
se comparte sin importar código de cliente desde conductor.

Se conserva únicamente consentimiento acotado y cifrado localmente, sin historial
GPS. Nuevo proceso implica nueva activación; una tarea fría no readopta una sesión
guardada. Identidad/pedido/estado son reautorizados en servidor. Pausa, cierre,
logout y expiración invalidan la ejecución antes de la parada nativa serializada.

No se añade EAS, firma Apple ni compilación iOS. El cliente iPhone sigue en Expo
Go. El Android sí requiere el APK recompilado; la compilación e instalación no
prueban la entrega de GPS con Waze, pantalla bloqueada u optimizaciones Samsung.
[Contrato, evidencias y guion](../driver-navigation.md).
