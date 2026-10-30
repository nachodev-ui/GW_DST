# Vista previa y visor documental

Implementado el 2026-10-26 para el asistente de vehículos y el panel de conductores.
Reutiliza `documents`, buckets privados y RPC de versiones existentes; no requiere
migración ni guarda URLs firmadas en la base de datos.

- Adjuntar/Reemplazar ofrece **Escanear documento** en el binario compatible de
  Gasway Test, **Tomar foto** en los demás runtimes y **Elegir archivo** siempre.
  La foto del vehículo conserva la cámara común. Tras elegir se
  muestra una miniatura o tarjeta PDF con nombre, tamaño y **Ver**, antes de guardar.
- La lista incluye cada tipo esperado, aunque falte. Muestra estado, vencimiento,
  motivo de rechazo y Ver/Reemplazar; revisión técnica y homologación siguen siendo
  alternativas. Las aprobaciones anteriores vigentes se conservan según las reglas SQL.
- **Ver** abre un modal de la app. Para archivos guardados obtiene una URL firmada
  de 60 segundos en ese momento. Si es PDF, descarga sus bytes desde Storage a
  memoria y los pasa al visor; imágenes usan esa URL. No se escriben archivos de
  descarga ni URLs en tablas, AsyncStorage o logs. Cerrar desmonta el visor, aborta
  descargas pendientes y descarta sus referencias en memoria.
- Imágenes: pantalla completa, pellizco/desplazamiento y controles de zoom accesibles.
  PDF: PDF.js `legacy` en Expo DOM, paginación y zoom; errores de carga/página y
  aviso de archivo protegido con contraseña. **No** renderiza enlaces, scripts del
  documento, formularios, OCR ni extracción de datos para completar campos.
- PDF.js y el worker están dentro del bundle, con `useWorkerFetch: false` y
  `useWasm: false`; no se usan CDN, Google Docs, Office ni otros visores externos.
  La transferencia del archivo se hace exclusivamente desde el bucket privado al
  cliente autenticado; al visor DOM se entregan bytes en base64, no credenciales.

El esquema no guarda el nombre original: antes de enviar se muestra el nombre
seleccionado; los documentos persistidos se identifican por su título/tipo y tamaño.
La selección y el visor no persisten después de cerrar/reiniciar la app.

[Escáner local](document-scanner.md): se añadió un módulo nativo opcional para
captura en Test; el visor sigue usando su runtime existente.
[Runtime y permiso de cámara](expo-runtime.md): el APK Android necesita recompilarse
para incorporar el escáner y actualizar el permiso de cámara.
No se ejecutan builds, comprobaciones visuales, lint ni pruebas adicionales en esta
tarea; la validación de código se limita al typecheck final.

`npm run typecheck` aprobado (código 0). La visualización real y la captura de
cámara no se ensayaron en dispositivos en esta tarea.

Fuentes: [Expo DOM](https://docs.expo.dev/guides/dom-components/),
[PDF.js, render y datos binarios](https://mozilla.github.io/pdf.js/examples/),
[Storage createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).
