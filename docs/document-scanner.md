# Escáner documental local — Gasway Test

Implementación del 2026-10-26. Se mantiene el ingreso manual de datos/fechas y la
revisión humana de Gasway; escanear no aprueba documentos ni cambia la habilitación
para repartir. No requiere cambios de SQL, buckets, RPC ni despliegues de Supabase.

## Captura

- Padrón, permiso de circulación, revisión técnica, homologación, SOAP y licencia
  frente/dorso ofrecen **Escanear documento** cuando el runtime incorpora el módulo
  y la URL pública corresponde exactamente a Gasway Test.
- El escáner nativo detecta bordes y permite revisar el recorte/enderezado. Entrega
  JPEG al mismo flujo de vista previa, fechas, guardado privado y versiones.
- Android limita la captura a una página. iOS no ofrece ese límite mediante el
  módulo: si devuelve varias páginas se rechaza la selección completa y se explica
  que debe escanearse una sola; nunca se elige la primera silenciosamente.
- Cancelar vuelve al formulario sin sustituir la selección anterior. Ante un fallo
  se ofrece **Usar cámara** o **Volver**; no se abre la cámara automáticamente.
- Sin módulo, en Expo Go o fuera de Test se mantienen **Tomar foto** y
  **Elegir archivo**. La foto del vehículo usa ImagePicker, sin escáner.
- Elegir archivo conserva JPG/PNG/PDF y su validación de 5 MiB. Los escaneos que
  superan ese límite se recomprimen localmente con ImageManipulator a calidad
  0,85/0,70/0,55, sin reducir resolución. Si no caben o falla el procesamiento,
  se ofrece la cámara; no se sube un archivo mayor al límite.
- La vista previa usa el JPEG final que se enviará. Las salidas originales del
  escáner dentro del almacenamiento propio se eliminan al procesar; la copia
  temporal de vista previa se libera al guardar, reemplazar, descartar o desmontar
  el formulario. La eliminación es de mejor esfuerzo; no es borrado seguro ni
  garantiza limpieza ante cierre abrupto. No se eliminan archivos elegidos por el usuario.

## Dependencia y límites

Se fija `react-native-document-scanner-plugin` **2.0.4**, licencia MIT, con
TurboModules y config plugin de Expo. El historial upstream muestra la actualización
a TurboModules en septiembre de 2025 y la versión 2.0.4 el 2026-01-02. No publica
una matriz de compatibilidad específica para Expo 58/React Native 0.88. La
compilación Android pasó posteriormente; captura real e iOS siguen pendientes.
No se añaden parches ni se cambia el SDK.

Android usa ML Kit Document Scanner de Google Play Services; iOS usa VisionKit.
El procesamiento de imágenes es local, sin OCR ni análisis remoto de pago. La subida
final autenticada al Storage privado de Gasway sigue siendo la existente. Android
puede necesitar internet la primera vez para descargar componentes y requiere un
dispositivo compatible con Google Play Services y al menos 1,7 GB de RAM.

## Expo Go, compilación local y EAS

**EAS es opcional.** Android puede seguir compilándose en este PC. iPhone con
Expo Go conserva cámara y archivos; para usar el escáner necesitará un binario iOS
propio en otro momento. Compilar iOS localmente requiere macOS/Xcode.

El APK Android anterior no incorporaba este módulo. Recargar Metro no lo añade.
El config plugin del escáner y el de ImagePicker configuran el texto es-CL.
`with-document-camera-permission.cjs` elimina el marcador antiguo
`CAMERA tools:node="remove"` al regenerar sin limpiar, conservando otros permisos.
La integración inicial no editó ni regeneró carpetas nativas. Posteriormente el
operador regeneró Android y se compiló/instaló por USB, según la evidencia inferior.

Antes de recompilar, confirmar que `apps/mobile/.env` apunta a **Gasway Test** y
conservar el `debug.keystore`/APK existentes. Desde la raíz, en PowerShell:

```powershell
npm exec --workspace @gasway/mobile -- expo prebuild --platform android --no-clean --no-install --skip-dependency-update expo,react,react-native
if ($LASTEXITCODE -eq 0) {
  .\apps\mobile\android\gradlew.bat -p .\apps\mobile\android :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain
}
```

Esto genera el APK ARM64 en
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`; no lo instala.
Se conserva `--no-clean` y el ajuste CMake de Windows. No usar `--clean` para este
cambio. El APK nuevo necesita instalarse después para probar la captura.

Si se usa **Git Bash**, no pegar las rutas PowerShell con `\`: Bash las interpreta
como escapes y produce `command not found`. Después de regenerar, compilar desde
la raíz con el wrapper POSIX:

```bash
(cd apps/mobile/android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain)
```

## Evidencia

### Integración inicial

Dependencia descargada y fijada. npm terminó con `UNKNOWN: unknown error, open
'C:\Users\mitsf\Desktop\Gasway\package-lock.json'` después de extraer el módulo;
se completaron las dos entradas del lockfile con la versión, URL e integridad
oficiales de npm. No se repitió la instalación.

`npm run typecheck` aprobado (código 0). Sin lint, pruebas adicionales,
renderizado, screenshots, builds, instalaciones en dispositivos ni despliegues.
Pendiente de evidencia en Test: primera descarga de Google Play Services,
recorte legible, cancelación, fallo/cámara alternativa, compresión, envío/reintento
y limpieza temporal. Typecheck no acredita estas operaciones nativas.

### Compilación e instalación posterior — 2026-10-26

A solicitud posterior del operador, build Android ARM64 aprobado e instalado por
USB en el usuario principal del Samsung, con la misma firma y los datos conservados.
El módulo está en DEX, CAMERA está en el manifest y el hash instalado coincide.
La captura real sigue pendiente: no se abrió la app ni se hicieron verificaciones
visuales. No hubo despliegues cloud ni builds iOS.
[Detalle del APK, firma y respaldo](expo-runtime.md).

Fuentes: [módulo y Expo](https://react-native-document-scanner.js.org/),
[historial](https://github.com/WebsiteBeaver/react-native-document-scanner-plugin/commits/master/),
[ML Kit Android](https://developers.google.com/ml-kit/vision/doc-scanner/android),
[builds locales y EAS](https://docs.expo.dev/develop/development-builds/introduction/).
