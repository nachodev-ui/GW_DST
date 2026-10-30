# D1 — Preparación de Google Maps

**Corrección posterior, 2026-10-25:** Expo Go iOS no incluye Google Maps; el
requisito de Google en ambas plataformas no puede cumplirse en ese runtime.
Un guard nativo evita montar el componente ausente aunque exista clave iOS.
El operador autorizó Apple Maps solo en Expo Go iOS y ya está recuperado en código.
Esta corrección sustituye las afirmaciones de soporte Google en Expo Go iOS de
la actualización siguiente. [Diagnóstico y fuentes](vehicle-motion.md).

Actualizado el **2026-10-24**. **D1 completado por indicación del operador**, tras
preparar código, cloud y APK con el proyecto vigente. Codex no hizo una nueva
verificación visual; no se acredita todavía el ensayo integral en dos teléfonos
de D4. Continúa [el plan de demo](demo-commercial-validation.md).

**Runtime vigente:** el development build Android ya fue actualizado a SDK 58 e
instalado en el Samsung SM-A226BR el 2026-10-24, con la misma firma y clave Maps.
Firma, manifiesto del APK y hash instalado verificados; carga visual del mapa y
GPS siguen pendientes. [Evidencia y conexión con el iPhone](expo-runtime.md).
Los ensamblados de D1 descritos a continuación son el antecedente de SDK 57.

**Actualización 2026-10-25:** selector y seguimiento usan **Apple Maps en Expo Go
iOS y Google Maps en Android**. Google queda preparado para futuros builds iOS
con SDK y clave propios. Basta recargar Expo Go para recuperar el mapa. Plugin
`react-native-maps` preparado con `iosGoogleMapsApiKey`/`androidGoogleMapsApiKey`
desde variables de entorno para futuros builds. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/).

Verificados en `mapapp-389403`: Maps SDK for iOS, Maps SDK for Android y Directions
API (Legacy) habilitados. Routes API no es necesaria ni se habilitó. Clave iOS
`gasway-ios-demo` creada, restringida a `cl.gasway.mobile` y Maps SDK iOS, guardada
en `.env` ignorado. Android conserva paquete/firma y SDK propios. No se expusieron
valores en código. La revisión automática rechazó inicialmente crear la clave
Directions solo por API, sin IP fija; el operador autorizó expresamente ese alcance
y ya se creó `gasway-directions-demo`, guardada como secreto en Supabase Test/app.
Directions real respondió `OK` con puntos ficticios. OSRM de demo fue autorizado
para Apple Maps, con atribución/límite y caché separada; endpoint desplegado en ambos
proyectos. No se reutilizó la clave web histórica ni se cambiaron tarjetas/facturación.
[Contrato y ensayos](vehicle-motion.md), [ADR 0035](decisions/0035-google-vehicle-route.md).

## Destino vigente: Gasway Maps (2026-10-24)

El operador informó que la verificación de tarjeta para `gw-dst` requería fondos
no disponibles y pidió reutilizar **MapAPP**. Se comprobó con gcloud:

- ID permanente **`mapapp-389403`**, número **`745895471128`**, proyecto activo.
- Facturación ya habilitada (`billingEnabled=true`) y Maps SDK Android ya activo.
  No se vinculó/reabrió facturación ni se añadió un medio de pago.
- Nombre visible cambiado de **MapAPP** a **Gasway Maps**; el ID no cambia.
- Clave nueva `gasway-android-demo` en ese proyecto, restringida al paquete
  `cl.gasway.mobile`, certificado local y Maps SDK Android. Valor guardado directamente
  en `.env` ignorado por Git, sin imprimirlo.
- Se conservó la clave web anterior y las APIs preexistentes: no se reutiliza esa
  clave para el móvil ni se certifica aquí el costo/consumo de los otros servicios.
  La clave Android de Gasway solo permite Maps SDK.

El destino anterior `gw-dst` queda como antecedente de preparación, no como el
proyecto que proporciona Maps a este binario. No se borraron sus recursos.
El APK se recompiló con la nueva clave: **BUILD SUCCESSFUL en 11 min 24 s**,
Android ARM64 de desarrollo. `apksigner` verificó que el certificado del binario
coincide con la restricción de Maps. Archivo vigente:
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
Requiere Metro. Codex no instaló ni abrió la app. El operador solicitó el cierre de
D1 posteriormente; no se añade evidencia de capturas ni de pruebas en dos teléfonos.

Para instalar desde **Git Bash**, situado en la raíz del repositorio, usar barras
normales: las barras invertidas de una ruta PowerShell se interpretan como escapes
y pueden producir `failed to stat .appsmobile...`.

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
npm start
```

Usar el APK recompilado con la clave de `mapapp-389403`; después abrir Gasway y
**Nuevo pedido → Entrega → Elegir punto en el mapa**. No hace falta repetir login
de gcloud ni configurar facturación para ejecutar estos dos comandos.

## Primera preparación en gw-dst (antecedente del 2026-10-24)

- Sesión gcloud y proyecto `gw-dst` / `494420889765` verificados.
- Maps SDK for Android (`maps-android-backend.googleapis.com`) habilitado.
- Clave `gasway-android-demo` creada con restricciones de paquete
  `cl.gasway.mobile`, SHA-1 local indicada abajo y ese único SDK. Se verificaron
  las restricciones y el `.env` excluido de Git; no se crearon claves iOS/web.
  La CLI de creación incluyó el valor en su salida pese al formato solicitado;
  las consultas posteriores capturaron el valor sin volver a imprimirlo.
- Selector de pin Google en Entrega, con confirmación explícita; editar dirección
  o comuna invalida el punto. El GPS propone el lugar; el CUT no se deduce del pin.
  El punto se recuerda solo con la opción explícita de recordar dirección.
- La compra guarda coordenadas atómicamente mediante `create_mapped_distributor_order`,
  preservando stock, precio, despacho e idempotencia. Web conserva el formulario
  manual sin importar Maps nativo; iOS sin clave sigue usando dirección manual.
  [ADR 0031](decisions/0031-mapped-delivery-point.md).
- Migración `20261024035145_mapped_delivery_point` aplicada y verificada en Test y
  app. La prueba SQL dirigida pasó en Test con fixtures revertidos; typecheck y
  `scripts/test-orders.cjs` pasaron. RPC autenticada, sin EXECUTE anon.
- Prebuild Android terminado, clave en manifiesto comprobada sin imprimirla y
  SHA-1 posterior coincidente con la restricción. No hubo instalación de dependencias.
- Primera inspección: facturación deshabilitada y única cuenta accesible cerrada.
  El operador indicó que la revisaría. Codex no reabrió ni vinculó facturación.

El APK de desarrollo **Android ARM64** compiló correctamente con
`gradlew :app:assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a`
(`BUILD SUCCESSFUL`, 14 min 38 s). Archivo local ignorado por Git:
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
Tamaño: 92,3 MiB. `apksigner verify --print-certs` confirmó que la firma del APK
coincide con el SHA-1 restringido de la clave Maps.
Este binario incorpora la configuración de Maps y necesita Metro (`npm start`
desde la raíz); la presentación sin PC/JS incluido queda para D5.

No se instaló ni ejecutó la app ni se abrieron emuladores. La última consulta de
facturación aún devolvió `billingEnabled=false`. Falta vincular una cuenta activa,
instalar el binario y comprobar **Nuevo pedido → Entrega → Elegir punto en el mapa**.
Una compilación no acredita la carga efectiva del mapa ni completa D1.

## Preflight local inicial (histórico)

- Expo SDK 57, `react-native-maps` 1.27.2 y `expo-location` ya declarados.
- `apps/mobile/app.config.ts` ya admite `GOOGLE_MAPS_ANDROID_API_KEY` e
  `GOOGLE_MAPS_IOS_API_KEY`. Ninguna está configurada en `apps/mobile/.env`.
- Android SDK/ADB y Java 17 disponibles. Hay proyecto Android local y keystore de
  desarrollo; la configuración Gradle actual firma debug y release con ese keystore.
- Paquete Android: `cl.gasway.mobile`.
- SHA-1 del keystore local inspeccionado:
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
  Esta huella corresponde a esa firma local; no se presume idéntica en otro PC,
  EAS o Play. No usar la firma de desarrollo como decisión de producción.
- Google Cloud CLI no está en PATH ni en las ubicaciones estándar comprobadas;
  tampoco existe configuración gcloud predeterminada. WinGet está disponible.
- Proyecto Google confirmado previamente por el operador: `gw-dst`, número
  `494420889765`. Su acceso, APIs, claves y facturación siguen sin inspeccionar.

## Acceso necesario y reparto de tareas

La preparación inicial se limita a Android, conforme al plan de demo. El operador
debe iniciar sesión en Google Cloud con una cuenta que tenga acceso a `mapapp-389403` y
completar MFA. No se necesitan contraseñas, códigos MFA ni archivos de cuenta de
servicio en el chat. Los permisos concretos se revisarán tras autenticar; no añadir
Owner a nuevas identidades como atajo.

Se puede instalar Google Cloud CLI para el usuario actual mediante el instalador
oficial. La instalación no habilita facturación ni APIs por sí sola. A continuación,
en una terminal que reconozca gcloud:

```powershell
gcloud auth login --project=mapapp-389403
```

Codex puede ejecutar la instalación/configuración y los comandos administrativos;
el operador completa personalmente el acceso interactivo de Google. Antes de
modificar el cloud se verificará el proyecto y se revisarán APIs, claves y estado de
facturación. Si hace falta vincular facturación o activar un servicio sujeto a cobro,
presentar primero el alcance y las condiciones aplicables al operador.

## Trabajo tras autenticar

1. Confirmar acceso a `mapapp-389403` y su número; usar destino explícito en cada comando.
2. Consultar facturación y servicios habilitados. Inspeccionar claves por metadatos
   y restricciones; no imprimir sus valores. Reutilizar una clave adecuada o crear
   una específica de Android, restringida al paquete, SHA-1 y Maps SDK for Android.
3. Guardar el valor localmente en `apps/mobile/.env`, excluido de Git. La clave va
   incorporada al binario; las restricciones de aplicación/API son su protección.
4. Implementar mapa Google y selección/confirmación de destino en el flujo cliente,
   conservando dirección/CUT y conectando el punto al contrato de pedido existente.
   No añadir Places, Routes ni Geocoding de Google para este recorrido básico.
5. Reconstruir el development build al incorporar la configuración nativa de la clave;
   una recarga Metro sola no basta. Verificar el mapa en Android con el operador.
   No ejecutar pruebas visuales ni abrir emuladores sin autorización explícita.

El GPS transmitido entre dispositivos corresponde a D2–D3. Captura/vista en primer
plano ya están implementadas en [D3](live-tracking.md), pendientes de prueba física.
El cierre de D1 no acredita el ensayo en dos teléfonos de D3/D4.
Google Maps en un futuro build iOS propio necesita configuración/clave y verificación
propias. El iPhone de la demo usa ahora Apple Maps nativo en Expo Go (ADR 0034).

## Fuentes y costos

- [Instalación oficial de Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk).
- [Login gcloud](https://docs.cloud.google.com/sdk/gcloud/reference/auth/login).
- [Maps con Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/).
- [Configuración de Maps SDK para Android](https://developers.google.com/maps/documentation/android-sdk/get-api-key).
- [Creación y restricciones de claves por CLI](https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/create).
- [Control de costos de Maps](https://developers.google.com/maps/billing-and-pricing/manage-costs).

El [precio oficial del SKU Maps SDK](https://developers.google.com/maps/billing-and-pricing/pricing)
consultado el 2026-10-24 indica uso gratuito ilimitado. Google exige de todos modos
[facturación activa para Android](https://developers.google.com/maps/documentation/android-sdk/usage-and-billing).
Otros SKUs, como Routes, Places, Street View o mapas web, tienen condiciones propias;
no se habilitaron esos servicios. Un presupuesto con alertas no corta el gasto.
