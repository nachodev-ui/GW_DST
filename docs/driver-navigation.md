# Navegación de la demo — 2026-10-25

Implementado: mapa del conductor ampliable a pantalla completa, trazado por calles,
encuadre inicial completo, zoom manual y control de centrar con icono. Navegación externa a
Google Maps o Waze con el destino confirmado del pedido, sin geocodificar texto.
Las rutas de ambos navegadores pueden diferir de la vista previa de Gasway.

## Preparación completada

- Clave `gasway-directions-demo` creada en `mapapp-389403`, restringida únicamente
  a Directions API. El operador autorizó expresamente no restringir IP porque
  Edge Functions no tiene egreso fijo. Guardada como `GOOGLE_DIRECTIONS_API_KEY`
  solo en secretos de Supabase Test/app. No se imprimió su valor ni quedó el
  archivo temporal de carga. Se mantienen las claves móviles separadas.
- Google Maps utiliza Directions. Apple Maps del iPhone utiliza OSRM de FOSSGIS
  exclusivamente para la demo, con autorización explícita del operador sobre su
  registro de coordenadas en logs. `OSRM_DEMO_ENABLED=true` en Test/app.
- Migración `20261025041041_multi_provider_routes` aplicada en Test/app: caché,
  lease, contador y backoff separados por pedido/proveedor. No se devuelve una
  geometría Google a un consumidor OSRM. Límite OSRM compartido entre pedidos
  dentro de cada proyecto: un inicio cada 1,1 s. Sin rutas privadas en Realtime.
- Función desplegada en ambos proyectos. Conserva JWT validado online, acceso
  por participante/conductor aprobado/pedido activo, GPS fresco, reautorización
  posterior y purga terminal. Seis intentos por pedido y proveedor, TTL de 2 h.
  Caducidad no equivale a purga física programada; DT-08 sigue abierto.
- OSRM muestra «Ruta OSRM · © OpenStreetMap · Corregir mapa». Endpoint HTTPS fijo
  con User-Agent de demo; no se aceptan URLs de proveedor enviadas por el cliente.
  Las consultas requieren sesión y se envían solo tras adquirir el lease.

## GPS durante Waze/Google Maps

«Activar», junto al estado GPS, conserva el comportamiento anterior en primer plano.
«Navegar» abre una hoja que explica la captura durante otras apps y
pantalla bloqueada. Al tocar la tarjeta Google Maps o Waze solicita ubicación durante
el uso, notificaciones y ubicación siempre; en Android puede abrir Ajustes para
el último permiso. Rechazarlo no activa el servicio ni abre el navegador.

El build Android incorpora `expo-task-manager` y el servicio de ubicación de Expo
con notificación persistente. Los permisos/configuración están en la sección del
conductor de app.config.ts; iOS no incorpora ubicación en segundo plano.
La tarea se define globalmente desde el módulo del conductor al cargar el bundle.

El consentimiento está limitado a usuario, pedido, identificador de ejecución y
4 h. Solo ese contrato se guarda en SecureStore; no se guarda un recorrido ni se
reenvían puntos offline. Cada lote toma únicamente el fix más reciente, validado
por el publicador y por el servidor. Pausar invalida inmediatamente la ejecución
y aborta su solicitud; la parada nativa se serializa con el arranque para evitar
carreras. Cambiar de usuario, salir de la entrega, entrega/cancelación, revocación
detectada por servidor, error nativo o caducidad cierran el servicio.

Un reinicio en frío de JavaScript nunca readopta automáticamente el consentimiento
guardado: la siguiente tarea lo elimina y detiene la captura. `killServiceOnDestroy`
está activado. No se garantiza supervivencia a cierres forzados, restricciones de
batería ni decisiones del fabricante. El token de sesión se refresca cuando hace
falta; `TOKEN_REFRESHED` ya no borra cachés ni desmonta el conductor de esa sesión.
Logout/cambios de sesión conservan su limpieza y cierre.

## Instalar y probar

El APK ARM64 compiló correctamente en **3 min 34 s** y se instaló con éxito en el
usuario principal `0` del Samsung `R9WT80N6PVH`, sin borrar datos. Firma SHA-1
verificada contra la restricción Google existente:
`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
No se abrió la app, no se otorgaron permisos automáticamente ni se hicieron
capturas. APK disponible en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
Si hay que reinstalar desde la raíz:

```powershell
adb install --user 0 -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Sigue necesitando un único Metro; no es el build autónomo de presentación D5:

```powershell
npm start -- --go
```

1. iPhone: abrir Expo Go y el proyecto como cliente. Android: abrir Gasway sin
   distintivo naranja, conectado al mismo Metro. Recargar ambos proyectos.
2. Crear un pedido ficticio nuevo con pin de entrega y aceptarlo en Android.
3. En «Tu entrega», pulsar «Activar» en la fila GPS. Esperar el GPS y la ruta.
   El icono superior derecho amplía el mapa; el inferior centra toda la ruta.
   Alejar zoom y comprobar que los GPS siguientes lo conservan. Centrar debe
   incluir todas las curvas y el destino.
4. Pulsar «Navegar» y elegir Google Maps o Waze. Leer la explicación,
   conceder notificaciones/ubicación y, si Android abre Ajustes, elegir «Permitir
   siempre» y volver a Gasway. Después se abre el navegador con el destino exacto.
5. Mantener el navegador abierto unos 40 s. En el iPhone, la ubicación debe seguir
   vigente; estando quieto el camión puede no moverse, pero no debería pasar a
   «Ubicación desactualizada». Comprobar también la ruta OSRM y su atribución.
   No hace falta caminar fuera del alcance de Metro/Wi-Fi.
6. Volver a Gasway y pulsar «Pausar» junto al GPS: desaparece la notificación y
   cesan envíos; la última muestra del cliente caduca a los 30 s como máximo.
7. Repetir para pantalla bloqueada, cancelación desde cliente, entrega final,
   logout, permiso denegado, cierre forzado y una segunda entrega. Cancelar o
   entregar elimina el acceso preciso en servidor; la tarea se detiene al recibir
   ese cierre o al procesar su siguiente fix autorizado.

Son ensayos **pendientes del operador**, distintos de las pruebas automáticas.
No se marca D3 completado ni se declara aprobado GPS físico en segundo plano.

El 2026-10-25 el operador indicó «Listo, es funcional» antes de solicitar el
rediseño. Es evidencia reportada del flujo anterior, sin detalle de cada ensayo.
La presentación nueva requiere revisión en su teléfono; el rediseño no modifica
el servicio GPS ni las autorizaciones del backend.

## Evidencia automática/cloud

- Las seis suites dirigidas pasaron: **39 tests**, incluidos motor, cámara,
  navegación, ciclo de vida y contratos. TypeScript y Deno check aprobados.
- Suite SQL de GPS/rutas en Test aprobada con rollback: aislamiento de proveedor,
  leases cruzados rechazados, presupuesto OSRM, acceso y purga terminal.
- Directions real con coordenadas ficticias de Santiago: `OK`, una ruta.
  OSRM real con esos puntos ficticios: 153 puntos. No se usaron pedidos ni GPS reales.
- Pruebas de callbacks tardíos, pausa durante arranque, permisos, expiración,
  cambio de sesión, ausencia de cola/recorrido local y reinicio sin reanudación;
  enlaces exactos y cámara que encuadra la polilínea completa sin reiniciar zoom.
- Advisors: Test sin avisos; app conserva el aviso previo de contraseñas filtradas
  desactivado, sin avisos nuevos asociados a las rutas.

Referencias: [Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/),
[TaskManager](https://docs.expo.dev/versions/v58.0.0/sdk/task-manager/),
[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started),
[Waze](https://developers.google.com/waze/deeplinks),
[OSRM/FOSSGIS: privacidad y límites](https://routing.openstreetmap.de/about.html).
