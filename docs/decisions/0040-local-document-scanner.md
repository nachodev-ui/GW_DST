# ADR 0040 — Captura documental con escáner local

Fecha: 2026-10-26. Estado: implementado para Test; Android compilado e instalado;
captura real e iOS pendientes.

Las fotos comunes dejan al usuario el encuadre de documentos. Se añade
`react-native-document-scanner-plugin` 2.0.4 con detección de bordes, recorte y
enderezado nativos, sin OCR ni servicios de análisis de pago. Datos y fechas
siguen siendo manuales; aprobación, versiones y elegibilidad conservan su contrato.

La integración vive en shared/documents, sin conocer roles; los formularios la
componen y liberan sus archivos temporales. Se comprueba Test y presencia nativa
antes de importar el paquete, que exige su TurboModule al inicializarse. Expo Go,
web y APK anteriores conservan cámara/archivo; los errores ofrecen cámara y
cancelar vuelve sin reemplazar la selección. La foto del vehículo queda fuera.

Se acepta la dependencia de Google Play Services en Android y su descarga inicial.
El plugin admite EAS y generación local; EAS no es un requisito del proyecto.
La compilación Android con Expo 58/RN 0.88 pasó posteriormente y el APK se instaló
por USB; esto no acredita captura real ni compatibilidad iOS. Android limita a una
página; iOS rechaza resultados múltiples explícitamente.

Alcance, límites y comando local: [escáner documental](../document-scanner.md).
