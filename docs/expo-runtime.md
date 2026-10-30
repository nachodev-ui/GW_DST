# Runtime Expo SDK 58

## APK del escáner instalado por USB — 2026-10-26

Tras la solicitud posterior del operador, se compiló e instaló Android localmente.
El error `bash: .appsmobileandroidgradlew.bat: command not found` venía de pegar
rutas PowerShell en Git Bash: no había comenzado la compilación. La guía del
[escáner](document-scanner.md) incluye ahora el comando para ambas terminales.

- Entorno local confirmado contra Gasway Test, sin mostrar credenciales.
- Cámara declarada y ajuste CMake de Windows presentes en el proyecto generado
  por el operador; no se repitió prebuild.
- Clave de firma local coincidente con el respaldo anterior. APK que estaba
  instalado y `debug.keystore` respaldados en
  `apps/mobile/.expo/native-backups/document-scanner-20261026/`, ignorado por Git.
- `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain`:
  **BUILD SUCCESSFUL en 5 min 47 s**; 523 tareas, 67 ejecutadas y 456 reutilizadas.
  La compilación nativa del módulo pasó con Expo 58/RN 0.88 en Android.
- APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`,
  **113.660.604 bytes**. `DocumentScannerModule` presente en DEX y permiso CAMERA
  presente en el manifest empaquetado. `apksigner verify` aprobado; mismo
  certificado SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- SHA-256 local e instalado:
  `9faa966cd56548056dd884b2740b3d6ce21ac0ab732fd0526b78b80ca1aedbe5`.
- `adb install --user 0 -r` terminó con **Success** en SM-A226BR. Actualización
  registrada a las **21:38:46 America/Santiago**. `firstInstallTime` se mantiene
  en 2026-10-22 16:02:04; no se desinstaló ni se borraron datos. Enlace USB de
  Metro 8081 conservado. No se alteró el perfil DUAL_APP.

La cámara aún aparece sin permiso concedido: se solicitará desde el flujo, sin
concederla por adb. No se abrió la app ni se hicieron verificaciones visuales.
Recorte, primera descarga de ML Kit, compresión y subida reales siguen pendientes
de prueba del operador. No hubo despliegues cloud ni builds iOS/EAS.

## Escáner documental local — 2026-10-26

Se incorpora `react-native-document-scanner-plugin` 2.0.4 y su config plugin,
habilitado solo en Test cuando el módulo está en el binario. EAS es opcional:
Android puede seguir compilándose localmente. Expo Go iPhone y el APK anterior
ofrecen cámara y archivo. El nuevo plugin local de cámara elimina el marcador
histórico `tools:node="remove"` durante prebuild sin limpiar; no se regeneró ni
compiló el proyecto nativo en esta tarea. [Comandos y límites](document-scanner.md).
Los apartados siguientes registran evidencia anterior al escáner.

## Visor documental y cámara — 2026-10-26

El visor utiliza PDF.js 6.4.299 (`legacy`) en un componente DOM de Expo 58;
`@expo/dom-webview` ya es dependencia del runtime de Expo. No se agregó
react-native-pdf, react-native-webview ni otro módulo nativo. PDF.js y su worker
se importan en el bundle local, sin CDN ni visores de terceros. Las imágenes usan
Gesture Handler/Reanimated existentes para acercar y desplazar.
[DOM en SDK 56 y posteriores](https://docs.expo.dev/guides/dom-components/).

Se cambió `cameraPermission: false` por un texto de permiso en ImagePicker.
El development build Android instalado conserva `CAMERA` removido de su manifest;
**necesita regeneración y recompilación para tomar fotos**. No se ejecutó ese build
en esta tarea. Elegir archivo y el visor usan el runtime existente. Expo Go ya
incorpora ImagePicker/cámara y DOM; los builds propios iOS también requieren recoger
el texto NSCameraUsageDescription actualizado. No se hicieron verificaciones visuales.

## Módulos de imagen Android — 2026-10-26

El operador reportó `Cannot find native module 'ExpoImageManipulator'` al cargar
una foto. El Samsung conservaba el development build del 2026-10-25, anterior a
`expo-image-manipulator` 58.0.15 e `expo-image-picker` 58.0.10. Instalar dependencias
JavaScript o recargar Metro no añade módulos al binario nativo:
[cuándo recompilar un development build](https://docs.expo.dev/develop/development-builds/use-development-builds/).

- Respaldo del APK anterior y `debug.keystore` en
  `apps/mobile/.expo/native-backups/document-modules-20261026/`, excluido de Git.
- `expo prebuild --platform android --no-clean --no-install
--skip-dependency-update expo,react,react-native` aplicado sobre el proyecto existente.
  Sin cambios en package.json, firma preservada y ajuste CMake de Windows conservado.
- `gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain`:
  **BUILD SUCCESSFUL en 5 min 45 s**; 501 tareas, 45 ejecutadas y 456 reutilizadas.
- Registro nativo generado y DEX del APK contienen `ImageManipulatorModule` y
  `ImagePickerModule`; ABI única `arm64-v8a`. APK de 105.439.937 bytes en
  `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- SHA-256: `30f76aa829a7b028834b9119e9a07ff705f093d1da0a958f756d5604f69f78a0`.
  `apksigner` aprobó y conserva el certificado SHA-1
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- `adb install --user 0 -r` terminó con Success en SM-A226BR. El hash del APK
  instalado coincide con el local; actualización registrada 2026-10-26 15:32:45.
  No se desinstaló ni se borraron datos. Se conserva el enlace USB de Metro 8081.

Volver a abrir **Gasway sin distintivo naranja**, conectar al mismo Metro y
reintentar Foto y documentos. No se abrió la app ni se hicieron comprobaciones
visuales desde Codex; la carga/compresión/subida reales siguen pendientes de
evidencia del operador. El iPhone con Expo Go no necesita este APK.

Los apartados posteriores conservan la evidencia histórica de builds anteriores.

## Actualización del 2026-10-24

El Expo Go instalado en el iPhone del operador exige SDK 58; el proyecto usaba
SDK 57. Se actualiza Expo y su matriz de dependencias con
`npx expo install expo@^58.0.0 --fix` desde `apps/mobile`, conservando el lockfile.
La versión de Expo Go (58.0.5 reportada por el operador) y la del paquete `expo`
no necesitan coincidir en el parche; sí deben corresponder al mismo SDK.

Web conserva `web.output: 'single'` explícito: se usa como SPA de desarrollo,
sin introducir servidor SSR por el nuevo valor predeterminado de Router.
Node 24 sigue siendo la versión del repositorio.

La matriz usa React Native 0.88.0 y React/React DOM 19.3.0. El componente Input
comparte ahora una ref `TextInputInstance`, acorde con la API estricta de tipos
de React Native; listas y estilos se ajustan a esas definiciones sin cambiar su
presentación. Se conservan los hooks de foco y los guards de Router.
Los overrides raíz fijan React y React DOM a 19.3.0 para que los peers del CLI
no instalen 19.3.1 junto al runtime móvil. Al cambiar de SDK, actualizar ambos
overrides con la matriz de Expo y deduplicar; no usar `--force` ni ignorar peers.
Metro utiliza directamente la configuración predeterminada de Expo para monorepos.

## Abrir en Expo Go

Detener Metro con Ctrl+C en su terminal y ejecutar desde la raíz:

```powershell
npm start -- --go --clear
```

Escanear el nuevo QR con el iPhone en la misma red. El script móvil usa `expo start`
sin forzar un destino: la dependencia `expo-dev-client` selecciona development build
por defecto y `--go` permite elegir Expo Go sin combinar flags incompatibles.
`--clear` limpia la caché
de Metro después del cambio de SDK. No iniciar `npx expo start` desde la raíz:
el proyecto Expo vive en `apps/mobile`.

Expo Go permite comprobar los flujos compatibles con su runtime. La configuración
de claves Google, esquemas de enlaces y permisos de un binario Gasway propio
requiere validación en ese binario; Expo Go no acredita las condiciones del piloto.

## Development builds existentes

`npm start` mantiene el destino development build. El APK de D1 fue compilado con
SDK 57 y no debe cargarse con JavaScript de SDK 58; recargar Metro no actualiza
su runtime nativo. Debe regenerarse el proyecto nativo y recompilarse.

Los directorios `android/` e `ios/` son generados e ignorados por Git. Antes de
regenerar, conservar cualquier ajuste local necesario y el APK anterior si se
quiere mantener como evidencia histórica. Para Android, desde `apps/mobile`:

```powershell
npx expo prebuild --clean --platform android
```

Después, desde la raíz, `npm run android` compila e instala el nuevo build.
La regeneración limpia sustituye el directorio generado; no ejecutarla sobre
cambios nativos manuales sin guardarlos antes. Compilar iOS local requiere
macOS/Xcode. La actualización inicial de dependencias no compiló binarios.

En SDK 58, `expo prebuild` recrea las carpetas nativas por defecto, incluso sin
`--clean`. Para aplicar un cambio de plugin sin borrarlas, usar `--no-clean`.
Respaldar/restaurar siempre la firma local antes de regenerar: Maps restringe
el certificado, además del paquete.

## Compilación en Windows

El plugin local `plugins/with-windows-cmake-path-limit.cjs` limita
`CMAKE_OBJECT_PATH_MAX` a 256 solo al compilar en Windows. El valor generado de
1024 produjo un fallo de Ninja por rutas de más de 260 caracteres en el C++ de
Gesture Handler. CMake acorta los nombres mediante hashes; no cambia el código
ni el comportamiento de la aplicación.

Después de aplicar el plugin, `:app:configureCMakeDebug[arm64-v8a]` pasó y los
77 objetos generados tienen rutas de hasta 254 caracteres en este checkout.
Si se mueve el repositorio a una ruta más larga, volver a comprobar ese límite.
Referencia: [CMAKE_OBJECT_PATH_MAX](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html).

## Android actualizado e instalado — 2026-10-24

- Development build ARM64 compilado con SDK 58 (`expo` 58.0.19, React Native
  0.88.0). Ensamblado final: **BUILD SUCCESSFUL en 12 min 30 s**.
- APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, **96,1 MiB**.
  SHA-256: `484a731823fb7e53f1020c8742070612133a8235f9cb97be4011d9c669bad0cc`.
- `apksigner` aprobó la firma, con el mismo SHA-1 de desarrollo de D1:
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Configuración embebida verificada: SDK 58.0.0, paquete `cl.gasway.mobile` y
  Maps Android configurado. La clave dentro del manifiesto del APK coincide con
  el `.env` local; se comprobó sin imprimirla ni cambiar recursos Google Cloud.
- Instalado mediante `adb install -r` en el Samsung **SM-A226BR**, sin desinstalar
  ni borrar datos. Package Manager registra actualización a las **15:22:01** de
  Chile; el SHA-256 del APK en el teléfono coincide con el archivo verificado.
  La sesión de conductor debe confirmarse al abrir la app; no se inspeccionó Auth.
- APK, firma y configuración anteriores de SDK 57 respaldados localmente en
  `apps/mobile/.expo/native-backups/sdk57-before-sdk58/`, excluido de Git.

El primer ensamblado se detuvo por rutas largas de Ninja; el ajuste de Windows
resuelve ese fallo sin cambiar la aplicación. El typecheck posterior aprobó.
No se abrió la app ni se realizaron capturas o pruebas visuales; arranque, sesión,
mapa y GPS en dos teléfonos siguen requiriendo la comprobación del operador.

### Usar iPhone cliente y Android conductor

**Navegación Android, 2026-10-25:** se añadió TaskManager y permisos/servicio GPS
durante navegación. APK ARM64 compilado e instalado en el Samsung principal;
firma preservada. El JavaScript por sí solo no incorpora esos cambios en un APK
anterior. El iPhone sigue en Expo Go. [Prueba guiada](driver-navigation.md).

**Actualización 2026-10-25:** selector y seguimiento recuperan Apple Maps en Expo
Go iOS, autorizado por el operador. Android conserva Google Maps. No hacen falta
Mac, EAS, claves propias iOS ni firma de Apple para esta prueba. Recargar el
proyecto; crear un pedido ficticio nuevo y confirmar el pin. El camión Apple gira
su imagen respecto de la cámara; Google usa `rotation`/`flat` nativos.
[Animación y verificación pendiente](vehicle-motion.md).

Iniciar **un solo Metro** desde la raíz, con QR para el iPhone:

```powershell
npm start -- --go --clear
```

El iPhone abre ese proyecto en Expo Go. En Android, abrir **Gasway** y conectar
el development build al mismo servidor. Mientras siga conectado por USB, quedó
configurado `adb reverse tcp:8081 tcp:8081`: el launcher puede usar
`http://localhost:8081`. También se puede elegir el servidor LAN detectado; ambos
teléfonos necesitan la misma red para ese acceso. Cambiar el destino del QR no
requiere iniciar un segundo Metro.

Ingresar con la cuenta de conductor si la sesión no se conserva. El build necesita
el PC y Metro activos; no contiene un bundle autónomo para una demo sin PC.

### Dos iconos Gasway en Samsung — diagnóstico del 2026-10-24

El operador informó que Gasway sin distintivo funciona y la copia con distintivo
naranja falla con `Ssaid settings not accessible`. Inspección ADB sin abrir apps:

- El paquete `cl.gasway.mobile` está instalado en el usuario principal **0** y
  en el perfil Samsung **95 (`DUAL_APP`)**. Ambos apuntan al mismo APK; el hash
  de la instalación principal coincide con el build SDK 58 verificado arriba.
  Son dos perfiles de datos del mismo binario, no versiones SDK distintas.
- El proceso del perfil clonado (`u95_a346`, PID observado 10554) coincide con
  el error del registro de crashes. La traza entra en
  `DevServerHelper.getInspectorDeviceId`: el inspector de React Native lee
  `Settings.Secure.ANDROID_ID` y SettingsProvider rechaza ese acceso en el clon.
  No se modificaron identificadores, permisos de sistema ni código de React Native.
- Para la demo usar **Gasway sin distintivo naranja**, en el perfil principal.
  Samsung identifica la segunda instancia de Dual Messenger con un distintivo
  en su icono ([documentación Samsung](https://www.samsung.com/us/support/answer/ANS10001650/)).
  El clon y sus datos se conservaron; no se desinstaló ninguna app.
- Presionar **S** en Metro cambia el destino del QR entre development build y
  Expo Go. Para el iPhone corresponde Expo Go; se puede iniciar directamente con
  `npm start -- --go`. El Android principal sigue usando Gasway y el mismo servidor.

El funcionamiento de la app principal es evidencia reportada por el operador;
la identidad del APK y el perfil del crash se comprobaron por ADB. Esto no acredita
todavía la carga de Maps ni el recorrido GPS D3/D4.

## Validación

Comprobado el 2026-10-24 tras alinear y deduplicar las dependencias:

- `npx expo-doctor`: **20/20 comprobaciones aprobadas**, sin duplicados nativos.
- `npm run typecheck`: aprobado con React Native 0.88 y sus tipos estrictos.
- `git diff --check` sobre los archivos de esta actualización: aprobado.

Estas comprobaciones son independientes de la prueba física. No se ejecuta la
app, no se abre emulador y no se toman capturas.
Queda pendiente confirmar el arranque en Expo Go SDK 58 y repetir los flujos
de acceso, navegación, pedidos y GPS en el runtime de cada teléfono.

Fuentes: [actualización de SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/),
[notas SDK 58](https://expo.dev/changelog/sdk-58) y
[migración Router 57 → 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/).
