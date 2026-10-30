# Documentación guiada del vehículo

**Vista previa interna:** foto/archivo antes de guardar y Ver dentro de la app,
con zoom de imágenes y PDF.js local; cámara y archivo como opciones separadas.
La lista permite reemplazar directamente cada tipo.
[Alcance y runtime](document-preview.md).

Implementada el 2026-10-26. Cambio de interfaz; reutiliza los contratos de
[revisión documental](document-verification.md), sin migraciones ni despliegues.
La comprobación visual y funcional en teléfonos sigue pendiente. No agrega paquetes
ni módulos nativos; el APK que ya incorpora ImagePicker/ImageManipulator admite
estos cambios de JavaScript.

Validación de esta interfaz: `npm run typecheck` aprobado (código 0). No se abrió
la app, no se tomaron capturas ni se ejecutaron emuladores o suites adicionales.

## Flota y recorrido

Operación → Flota muestra foto cuando existe, patente, marca/modelo/año, conductor,
estado operativo y cinco segmentos de requisitos con archivo. Si falta completar
o revisar documentos, Documentar vehículo o Continuar documentación es la acción
principal; editar sus datos queda como acción secundaria discreta. Con documentación
al día y fuera de servicio, la acción principal es «Poner disponible» y Ver documentación
queda como secundaria.
El contador incluye foto, padrón, permiso, SOAP y revisión técnica **o** homologación.
No equivale a cinco aprobaciones ni a disponibilidad para repartir.

### De aprobación a disponibilidad

Flota muestra la cantidad de vehículos con documentación aprobada que están fuera
de servicio y sin entrega activa. «Ver vehículos» abre el filtro «Por activar»;
cada tarjeta conserva su foto, patente y conductor, con su propia activación.
No hay modal automático, slider ni notificaciones con confirmaciones de lectura.
El aviso permanece mientras haya candidatos; los vehículos disponibles o en
mantención no se incluyen. Una nueva aprobación se refleja con la actualización
existente de la flota: al volver a la pantalla, cada 30 segundos en primer plano
o al actualizar manualmente.

La aprobación no modifica automáticamente el estado operativo. «Poner disponible»
llama a `set_business_vehicle` con el identificador, revisión y datos actuales;
no usa una actualización directa de tablas ni cambia la asignación del conductor.
El servidor conserva sus comprobaciones de membresía, distribuidora verificada,
documentos vigentes del vehículo/conductor, revisión concurrente y entregas activas.
No se conceden permisos nuevos ni se modifica la RLS.

Tras una respuesta exitosa se confirma la patente y se actualizan flota, métricas
y cobertura. La acción se bloquea durante la solicitud; ante un rechazo se muestra
el motivo y se recargan los datos para recuperar cambios concurrentes. No se
presenta el vehículo como disponible antes de la confirmación del servidor.
La disponibilidad del conductor se gestiona por separado y nunca se activa con
este botón. Un vehículo en mantención conserva la edición explícita de su estado.

Cambio de JavaScript sin migración, compilación ni despliegue. Queda pendiente
comprobar en Test el paso de ZZ9999 a disponible desde el botón, el caso con varios
vehículos, un rechazo por documentos del conductor y un cambio concurrente. No se
han cambiado estados operativos desde herramientas administrativas para esta tarea.
`npm run typecheck` aprobado (código 0); sin lint, pruebas extra ni comprobación visual.

### Recorrido guiado

El asistente usa una ruta propia con guard de membresía, fuera de la navegación
inferior del workspace. Las RPC siguen comprobando el acceso. Sus siete etapas son:

1. Foto del vehículo, con patente visible.
2. Padrón del vehículo.
3. Permiso de circulación.
4. Revisión técnica.
5. Certificado de homologación, como alternativa a la revisión técnica.
6. SOAP.
7. Resumen de títulos, archivos, fechas y estados, con acceso a cada etapa.

Una barra segmentada y «Paso N de 7» indican la posición. Una tarjeta grande abre
el selector; las imágenes se previsualizan y los PDF muestran su tipo/nombre/tamaño.
Los archivos guardados se pueden abrir mediante URL privada de 60 segundos.
Las fechas se escriben DD/MM/AAAA y se convierten a ISO antes de llamar a la RPC.
Un archivo vencido se puede registrar, pero queda advertido y no cumple el requisito.
La fecha de referencia proviene del servidor.

## Tratamiento visual de las siete etapas

Revisión del 2026-10-26 a partir de la captura Android aportada por el operador.
Se conserva el recorrido y se sustituye el interior genérico por superficies crema
y papel blanco, verde oscuro y acentos lima oficiales. Los estados «Foto guardada»,
«Aprobado» y «En revisión» usan icono y texto sin fondo ni pastillas verdes menta;
los avisos se identifican con una línea lateral, reservando rojo para errores.
Este tratamiento se limita al asistente; no cambia los estados globales de la app.

Las ilustraciones vectoriales propias distinguen encuadre de foto, identidad del
padrón, calendario de permiso, inspección, homologación y seguro. Son decorativas,
no vistas previas de documentos oficiales. Las imágenes reales se muestran dentro
de un marco crema con esquinas de encuadre y fallback/reintento de carga. En PDF
se identifica el archivo y se ofrece «Abrir documento»; no se simula una miniatura
de su contenido. Los archivos seleccionados se distinguen de los ya guardados.

Cada etapa tiene un folio y una jerarquía de título/ayuda breve; la fecha ocupa
una sección de vigencia propia. La confirmación de foto se integra en su tarjeta,
sin duplicarla en otro aviso. El resumen reúne sus seis entradas numeradas en una
carpeta del vehículo con su patente y contador de requisitos; mantiene visibles
faltantes, alternativas y correcciones. Las acciones pequeñas conservan un área
táctil mínima de 48 puntos y texto escalable. El progreso queda fuera del scroll,
visible al revisar archivos o llegar al final de la etapa.

La captura del operador acredita el aspecto anterior de la pantalla de foto;
no acredita las cargas, la revisión completa ni el resultado visual de esta nueva
revisión. `npm run typecheck` aprobado (código 0); sigue pendiente comprobar estos
interiores en teléfonos. No se agregaron dependencias ni cambios nativos.

«Guardar archivo» guarda exclusivamente la etapa actual. La confirmación permanece
visible y «Continuar» avanza después. La selección valida formato y máximo 5 MB;
no hace OCR ni afirma que el contenido corresponda al documento solicitado. Un
archivo guardado queda «En revisión», hasta la decisión de otro administrador.
El resumen permite volver a Flota aunque haya pendientes; no existe un envío final
masivo ni un permiso de reparto concedido por completar la barra.

La carga conserva la ruta en memoria si Storage termina y falla la RPC, para
reintentar sin crear otra carga. La salida se bloquea mientras se selecciona/guarda;
si queda una selección sin guardar se pide confirmación de descarte. No se
persisten bytes ni rutas de borrador entre reinicios. Los archivos ya registrados
se recuperan del servidor al volver. Las versiones anteriores, sus fechas y motivos
de rechazo siguen accesibles. Una aprobación anterior vigente se conserva cuando
el reemplazo está pendiente o rechazado.

## Opcionales para probar

Solo el hostname exacto de Gasway Test (`xnrueexpwzvxotgwmamj.supabase.co`) muestra
la marca «Opcional para esta prueba · Test» y permite omitir revisión técnica,
homologación y SOAP. No depende de metadata, del rol, de `is_demo` ni de un interruptor
local. Foto, padrón y permiso conservan su recorrido normal para ensayar cargas.
«Tengo homologación» permite pasar de revisión técnica a su alternativa en cualquier
entorno; si una alternativa ya tiene archivo utilizable, la otra no bloquea el paso.
Administración confirma su vigencia y pertinencia.

Un paso omitido se muestra sin archivo y pendiente en el resumen. La indicación
«Omitido en Test» dura esta visita; al reabrir se deriva «Sin adjuntar» del servidor.
Omitir no escribe exenciones, documentos, aprobaciones ni estados operativos.
La disponibilidad y las nuevas asignaciones mantienen los requisitos SQL existentes.

## Referencias de diseño

Se consultaron los catálogos y descripciones públicas de ScreensDesign:

- [Modyfy: AI Car Designer](https://screensdesign.com/apps/modyfy-ai-car-designer/):
  flujo por etapas con carga de foto, previsualización, reemplazo y acción inferior.
  Se adapta a la tarjeta de carga y a la continuidad entre pantallas.
- [Progress indicators](https://screensdesign.com/explore/ui-elements/progress-indicators/):
  marcadores segmentados de Planty y estados conectado/cargado/guardado de PDF Scanner.
  Se adapta a las etapas y al feedback después de guardar.
- [Upload screens](https://screensdesign.com/explore/screens/upload/):
  zona de carga central con icono, límites del archivo y acción principal reconocible.

No se descargaron activos ni se accedió a imágenes Pro restringidas. Gasway mantiene
crema, verde oscuro, oliva y lima, con tokens de `theme.business` y
`theme.documentation`, controles accesibles y texto escalable.

## Comprobación manual pendiente

Usar la [demo de Test](device-demo-test.md). Revisar en Android/iPhone el tamaño del
área de carga, teclado/fecha y acción inferior; cancelar el selector; probar formato
inválido, archivo mayor a 5 MB, fallo/reintento de guardado y salida con selección.
Guardar cada etapa, omitir los opcionales y comprobar el resumen y la persistencia
al reabrir. Aprobar/rechazar con el admin separado y verificar reemplazos sin perder
una aprobación vigente. En Project no deben aparecer las opciones exclusivas de
Test; no realizar allí este ensayo ni desplegar su backend sin autorización.
