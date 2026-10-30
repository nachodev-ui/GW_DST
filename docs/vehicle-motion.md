# Camión animado y rutas — 2026-10-25

## Corrección: mapa ausente en Expo Go iOS

La afirmación inicial de Google Maps en Expo Go iOS fue incorrecta. Expo Go
actual incluye `react-native-maps/Maps`, sin el subspec Google ni su SDK. La
documentación general de la biblioteca incluida no acredita ambos proveedores.
El código instalado de react-native-maps monta `RNMapsGoogleMapView` al recibir
`provider="google"` en iOS; esa vista requiere Google Maps compilado en el runtime.

Ahora `runtimeMapProvider` consulta `UIManager.hasViewManagerConfig` para ese
componente antes de seleccionarlo. Una variable o API key presente no sustituye
esa comprobación. Selector y seguimiento no intentan montar la vista ausente;
muestran un aviso de indisponibilidad. La prueba automática cubre ambos estados
de la capacidad nativa con idéntica configuración y runtime Expo Go.

El operador autorizó recuperar Apple Maps. Selector y seguimiento omiten el
proveedor Google en Expo Go iOS, usando Apple sin exigir una clave propia.
Android conserva Google. Un build iOS propio sigue requiriendo SDK y clave Google;
no se cambia silenciosamente su proveedor ante una configuración incompleta.
La recuperación está implementada; aún no se comprobó visualmente en el iPhone.
No se ejecutan EAS, compilación iOS ni cambios de cuenta/firma.

Fuentes: [Podfile actual de Expo Go](https://github.com/expo/expo/blob/main/apps/expo-go/ios/Podfile),
[confirmación del mantenedor Expo](https://github.com/react-native-maps/react-native-maps/issues/5049#issuecomment-2103642878).
La selección del proveedor está centralizada y se aplica tanto al selector como
al seguimiento. Google usa `flat` y `rotation` nativos. El código MapKit instalado
no implementa esas propiedades: Apple gira la misma imagen RN con
`bearing - heading de cámara`, reaplicando la última pose incluso detenido cuando
se gira el mapa. Las lecturas de cámara se limitan a 10 Hz y una en curso; la lectura
final de un gesto no se pierde y las respuestas tras desmontar se descartan.
Ninguna lectura cambia el encuadre. No se añaden dependencias.

Apple usa GPS y, desde la autorización del operador del 2026-10-25, rutas OSRM de
FOSSGIS solo para demo, con atribución y límite de peticiones. No consulta Directions
ni dibuja/snappea su polilínea. Las políticas de Google requieren mostrar los resultados
de Directions sobre Google Maps. [Política](https://developers.google.com/maps/documentation/directions/policies).

## Probar con Expo Go

Desde la raíz, con un solo Metro:

```powershell
npm start -- --go
```

Si Metro ya está abierto basta recargar. Abrir el proyecto en Expo Go del iPhone;
Android puede usar Expo Go o el build ya instalado con el mismo servidor.
No se requiere Mac, EAS, firma Apple ni claves propias para Expo Go.

1. Usar un pedido ficticio nuevo con destino confirmado; conductor aprobado lo
   acepta y comparte ubicación desde Tu entrega.
2. Cliente abre Sigue tu entrega. Comprobar casa y camión, sin cambios al hero.
3. Con nuevos GPS, comprobar avance continuo. Al alejar el zoom manualmente, las
   recepciones no deben modificar la cámara. «Ver ambos» conserva su acción explícita.
4. Rotar el mapa con dos dedos: el camión debe mantener orientación respecto de
   la calle. Google aplica bearing mundial nativo; Apple gira la imagen respecto
   de la cámara, sin modificar su posición ni reencuadrar.
5. Al pausar/ocultar pantalla, caducar GPS, denegar acceso o terminar el pedido,
   no debe mantenerse un vehículo animado ni una ruta de otro pedido/sesión.

No es necesario caminar 30–50 m ni perder la conexión al PC para probar la lógica.
La simulación siguiente no activa GPS físico ni modifica pedidos. La comprobación
visual en Expo Go sigue pendiente: Codex no tiene acceso al iPhone desde este PC.
La prueba nativa de Google en iOS requiere un runtime propio con su SDK.

## Simulación reproducible

```powershell
node scripts/generate-vehicle-motion-demo.cjs
```

Abrir [la simulación](../artifacts/vehicle-motion-demo/index.html). Usa los mismos
módulos TypeScript transpilados del motor y el mismo PNG de la app. Muestra GPS
sintético cada 5 s, varios giros de 90°, una curva, dos vehículos independientes,
pausa y rotación del plano. No usa tiles Google ni acredita renderizado nativo.
Regenerar tras cambiar geometría o motor.

## Contrato de animación

- `shared/maps/vehicle-motion/geometry.ts`: bearing esférico, diferencia angular
  corta, interpolación lat/lng, distancias, proyección y punto adelantado.
- `VehicleAnimator`: una instancia independiente por vehículo. Duración por
  intervalo entre muestras, configurable, máximo 15 s. Retarget desde pose visual,
  sin extrapolar más allá de la última muestra aceptada.
- Ruido menor de 4 m conserva posición y rumbo; movimiento lento se acumula desde
  la última posición significativa. Heading opcional se acepta solo si el origen
  lo declara confiable; el contrato GPS actual no lo envía y no se inventa.
- Giro corto, máximo 180°/s y suavizado de 180 ms. PNG único norte, offset 0.
- Con ruta: snap si ambos extremos están a ≤35 m, interpolación por distancia
  sobre segmentos conservando esquinas y look-ahead de 8 m. Fuera de ruta: GPS.
- Se actualizan únicamente posición y rotación mediante el ref nativo. La instancia
  del marcador y su coordenada React inicial permanecen estables. RAF se cancela
  al perder foco/primer plano y se destruye al desmontar. Caducidad, cierre y
  autorización existentes siguen controlando la presencia del marcador.

## Directions y acceso

`order-route` autentica el JWT contra Auth y llama `begin_order_route` como usuario.
La RPC revalida participante, conductor aprobado, pedido activo y GPS fresco con
precisión ≤50 m. La función consulta Google solo tras adquirir lease de 25 s.
La escritura del resultado está reservada al backend; vuelve a autorizar la lectura
después de la respuesta. Una cancelación concurrente no devuelve la geometría.

Se solicita Directions Legacy con `mode=driving`, `region=cl`, `language=es`, sin
tráfico ni alternativas. Usa polilíneas detalladas de pasos, con overview como
respaldo. `region=cl` sesga resultados, no constituye una frontera: servidor limita
origen/destino/geometría a cajas del territorio continental e islas soportadas;
no se pretende una validación cartográfica exacta del límite internacional.

La caché privada permite una consulta inicial compartida por viaje, incluso tras
remontar/reconectar. No se pide Directions en cada GPS. Cliente y servidor requieren
tres fixes desviados más de `max(60 m, 3×accuracy)` durante ≥10 s y al menos 60 s
desde el intento anterior para recalcular. Hay seis intentos máximos por pedido y
backoff exponencial hasta 15 min ante error. Un intento fallido puede reintentarse
mediante refresco/reentrada una vez transcurrido el backoff; no hay bucle automático
de compras. Mientras otra petición tiene lease, cliente espera cada 2 s.

Geometría con TTL de 2 h, lectura solo mientras hay GPS fresco; borrado terminal y
limpieza de caché cliente al salir, cambiar sesión/pedido, caducar o cerrar. La
purga física programada de viajes abandonados sigue pendiente de DT-08; expiración
no equivale a borrado físico sin una lectura posterior.

## Configuración y evidencia

Proyecto `mapapp-389403`: Maps SDK for Android, Maps SDK for iOS y Directions API
(Legacy) ya habilitados. No se requiere Routes API para esta implementación.

- Android: `GOOGLE_MAPS_ANDROID_API_KEY` → `androidGoogleMapsApiKey`, restringida a
  `cl.gasway.mobile`, SHA-1 de la firma local y Maps SDK Android.
- iOS: `GOOGLE_MAPS_IOS_API_KEY` → `iosGoogleMapsApiKey`, clave `gasway-ios-demo`
  restringida a bundle `cl.gasway.mobile` y Maps SDK iOS. Valor solo en `.env` ignorado.
- Servidor: `GOOGLE_DIRECTIONS_API_KEY`, exclusivamente en secretos de Edge Functions.
  El operador autorizó expresamente la restricción solo por API sin IP fija de
  salida; `gasway-directions-demo` quedó creada y guardada en Test/app sin imprimir
  su valor ni reutilizar la clave web. OSRM se habilita con `OSRM_DEMO_ENABLED=true`.

Migración `20261025030611_order_route_cache` y función desplegadas en Test/app.
Suite SQL Test aprobada con rollback: permisos, lease, escritura backend, lectura
de caché, rechazo de geometría fuera de área, desvío sostenido frente a dos fixes,
presupuesto/backoff, caducidad repetida y purga terminal.
Las cinco suites dirigidas pasaron (25 tests). Deno check aprobó la función.
HTTP cloud sin token o con token inválido devuelve 401 en ambos proyectos.
Advisors: Test sin avisos; app conserva únicamente el aviso previo de contraseñas
filtradas desactivado, sin nuevos avisos por rutas.
Pruebas unitarias cubren cardinales, cruce 359→1, retarget, ruido, velocidad angular,
esquinas, look-ahead, cancelación, vehículos independientes, proveedor nativo,
cliente, autorización HTTP y fallback. Actualización: Directions real devolvió
una ruta `OK` y OSRM 153 puntos con coordenadas ficticias. Se añadió caché por
proveedor en `20261025041041_multi_provider_routes`, aplicada y probada en Test/app.
No se verificó visualmente Expo Go. D3 mantiene pendientes sus ensayos
físicos; no se marca completado por estas pruebas. El navegador de herramientas
rechazó abrir el HTML local por su política de protocolos (`file:`); el artefacto
queda disponible para abrirlo localmente y no se declara inspeccionado visualmente.
