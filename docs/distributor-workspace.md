# Espacio del distribuidor

**2026-10-27, ADR 0042:** Operación añade «Ver qué falta» por conductor y Equipo
consulta su habilitación. La carga de licencia se traslada a la cuenta del propio
conductor con un asistente de cuatro pasos; el negocio mantiene la flota.
Aceptación de invitación, aprobación de acceso y requisitos documentales se muestran
por separado. [Flujo y evidencia](driver-documentation-flow.md).

**2026-10-26, ADR 0039:** Operación incorpora foto, marca/modelo/año/tipo y
documentos por vehículo; Equipo incorpora RUT existente, clase y ambas caras de
licencia. La flota ahora condiciona nuevos repartos mediante SQL. Esta ampliación
está aplicada **solo en Test**, con requisitos y pendientes en
[revisión documental](document-verification.md). No confundir el despliegue previo
del workspace en ambos proyectos con el de esta ampliación.

Implementado y desplegado en Test y app el 2026-10-25. Migración
`20261026010000_distributor_workspace.sql` **aplicada en ambos proyectos**.
La verificación en dispositivos sigue pendiente. El nombre del archivo
usa UTC; la fecha de trabajo corresponde a Chile.

## Navegación y diseño

Flota usa tarjetas con foto, avance de antecedentes y una acción principal para
documentar. El asistente vive fuera de las pestañas persistentes y guía una carga
por etapa, seguida de resumen editable. Referencias y límites de los opcionales
exclusivos de Test en [documentación guiada](vehicle-documentation-flow.md).

Una cuenta con membresía vigente owner/manager entra por defecto a
`/business/manage`. El rol de Auth sigue siendo customer/driver; el inicio consulta
`list_my_businesses`, sin autorizar desde metadata. Perfil permite ir a compra o,
si corresponde, reparto. Desde Cuenta cliente y Cuenta conductor se puede volver
a gestionar la distribuidora. Varias membresías se cambian desde Panel.

El espacio tiene cuatro destinos persistentes: **Panel, Ventas, Operación y
Perfil**. Catálogo, Equipo y Cobertura conservan sus rutas y quedan dentro de
Operación. Cambiar de pestaña conserva `businessId`. Los enlaces a un negocio sin
membresía vuelven al panel propio; las RPC comprueban nuevamente el acceso.

Referencias directas consultadas en ScreensDesign:

- [Budget app dashboard design](https://screensdesign.com/articles/budget-app-dashboard-design/):
  período visible, separación de ingresos/costos/resultado y estados sin datos.
  Se aplica al selector Hoy/7 días/Este mes y al resumen financiero.
- [Budget app — spending tracker](https://screensdesign.com/apps/budget-app-spending-tracker/):
  descripción pública de resúmenes financieros, actividad fechada y detalle por
  transacción. Se aplica a las barras diarias explorables y a las ventas individuales.
- [Blinq — Digital Business Card](https://screensdesign.com/apps/blinq-digital-business-card/):
  flujo Add Company Logo (00:58–01:16), datos profesionales y vista previa comercial.
  Se aplica a logo, portada, nombre y previsualización del negocio.

Las referencias son patrones de composición, no una copia de activos ni una
afirmación de haber accedido a pantallas Pro restringidas. Gasway conserva sus
colores; `theme.business` define fondo gris cálido, superficies blancas, verde
oscuro sólido, radios más contenidos y números tabulares. Cliente conserva su
composición de compra y Conductor su experiencia centrada en la entrega.

## Ventas

- La RPC agrega **solo pedidos delivered del vendedor**, usando `delivered_at`.
  Hoy comienza a medianoche de America/Santiago; 7 días incluye hoy y seis días
  previos; Este mes comienza el primer día local. El servidor fija las fechas.
- El total es la suma histórica `orders.total_clp`; no se recalcula con los precios
  actuales. Cantidad de ventas y cantidad de cilindros son distintas.
- Alcance vigente desde el 2026-10-29: sumar únicamente el precio de venta al
  cliente de las entregas completadas. Panel y Ventas muestran el total vendido,
  cantidad de entregas y cilindros. El total no representa ganancia ni conciliación
  de efectivo.
- Costos y ganancias se posponen para una etapa futura. La interfaz no solicita
  costos, no muestra estados de costo pendiente ni calcula resultados visibles.
  La tabla, RPC y contratos existentes se conservan sin modificar datos previos.
- Las barras contienen importes reales por día y ofrecen sus valores al tocar o
  usar un lector de pantalla. No se dibujan tendencias ficticias en estados vacíos.
- Ventas pagina 20 registros con cursor `(delivered_at,id)` y muestra entregas
  de solo lectura. No expone RUT, dirección, coordenadas ni identidad de clientes.
- Pedidos en reparto y por asignar son conteos actuales, independientes del período.
  No se añaden operaciones de despacho o cambios de estado al distribuidor.

## Operación y flota

Conductores usa el resumen completo de `get_business_coverage`, no una cuenta
parcial de invitaciones paginadas. Conserva disponibles, en entrega, desconectados
y por habilitar; Equipo mantiene invitaciones y revisión administrativa.

`distributor_vehicles` registra patente, nombre, estado declarado y conductor
opcional del mismo negocio. Un conductor se vincula como máximo a un vehículo.
Disponible, en mantención y fuera de servicio son declaraciones del negocio;
«En reparto» se deriva de una entrega activa del conductor. No se edita un
vehículo/conductor mientras tiene una entrega activa. La escritura bloquea los
conductores antes del negocio, en el orden usado por aceptación.

La flota es un registro operativo: no acredita requisitos del vehículo, habilita
conductores ni interviene en la elegibilidad o aceptación de pedidos. Vehículo
disponible no equivale a reparto disponible; horario, conductor y cobertura se
evalúan por separado. No se incorporan vehículos ficticios automáticamente.

## Perfil, imágenes y ubicación

El nombre comercial, descripción, dirección, comuna CUT y punto geográfico son
datos nuevos expresamente ingresados. No se copia el expediente privado de
postulación ni se cambia el nombre legal/revisado o la habilitación del negocio.
Por ahora son visibles para miembros del negocio; no se amplía el directorio de
clientes con direcciones o coordenadas comerciales.

Logo y portada se eligen con el selector de archivos del sistema ya instalado
(`expo-document-picker`), sin añadir dependencias. Admite JPG/PNG/WebP de hasta
5 MB, valida firma binaria en el cliente y MIME/tamaño en Storage. Se usa
ArrayBuffer nativo, bucket privado `business-media`, ruta UUID nueva y URL firmada
de una hora, renovada a los 30 minutos. No se sobrescriben objetos ni se acepta
SVG/HTML. Guardar perfil vincula la imagen y comprueba pertenencia y existencia
en el servidor. Quitar una imagen elimina su referencia; no borra el objeto.
Subidas abandonadas y versiones anteriores requieren limpieza administrativa
futura; no se escribe directamente en las tablas internas de Storage para borrarlas.

La ubicación admite selección explícita en mapa nativo, GPS en primer plano
solo al pulsar el botón o coordenadas manuales. Corregir una dirección o comuna
sugerida conserva el punto elegido y pide revisar su correspondencia. La comuna se
elige del catálogo oficial; el geocoder solo puede proponer una coincidencia
exacta y única de sus nombres, nunca inventa un CUT ni demuestra límites geográficos.
El mapa usa el proveedor que ya admite el runtime: Google en Android/builds
configurados y Apple en Expo Go iOS. El mapa inicial no se guarda como ubicación.
Web admite coordenadas sin importar Maps nativo.

Horario, WhatsApp y estimación de reparto reutilizan `set_business_service` con
sus revisiones actuales. Ahora se editan en Perfil. La cobertura pertenece al
negocio y se configura en Operación → Cobertura.

## Activación y evidencia cloud — 2026-10-25

El operador autorizó expresamente ampliar la validación: aplicar en Test, ejecutar
la suite SQL y activar en la app solo si pasaba. Se usó el CLI fijado en el repo,
con `--linked --project-ref` explícito, preservando el vínculo local de la app.

| Entorno                              | Migración                                            | Validación realizada                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gasway Test (`xnrueexpwzvxotgwmamj`) | `20261026010000`, aplicada                           | `distributor_workspace.sql` y `pilot_security.sql`: código 0, fixtures revertidos. Advisors de seguridad: sin hallazgos.                                                                                       |
| App (`gleltbrvpfvfgggcatpt`)         | La misma versión corregida, aplicada después de Test | RPC de lectura como miembro en los tres períodos, forma de perfil/flota, rechazo de no miembro, RLS de tablas y bucket privado con límite/MIME/políticas: correctos. Sin crear ni modificar datos del negocio. |

La aplicación inicial en Test detectó un alias SQL no válido. Se confirmó rollback
completo antes de corregirlo y aplicar la versión que pasó las suites. La app solo
recibió esa versión corregida; no se ejecutaron suites de fixtures contra ella.

Advisors de app: permanece únicamente el WARN conocido
`auth_leaked_password_protection`, documentado en ADR 0028 y pilot-security.md.
No se habilitó un plan pago. [Explicación del control](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No aparecieron hallazgos sobre las nuevas tablas/RPC en el advisor de seguridad.

Pendiente en dispositivos: navegación, subida/visualización real de imágenes,
permisos, teclado, mapa, cambios concurrentes y errores de red. La suite comprueba
referencias de medios y permisos SQL; no sustituye una subida HTTP ni una prueba
nativa de imágenes. No se ejecutaron comprobaciones visuales.

Las pantallas muestran errores/reintento ante fallos de red o permisos;
no sustituyen los datos por cifras demo ni simulan guardados. Recargar Metro
permite usar el nuevo inicio; no se añadieron dependencias o módulos nativos.

Evidencia local del 2026-10-25: `npm run typecheck` terminó con código 0.
Se aplicó formato únicamente a los archivos de esta reestructuración. No se
instalaron dependencias ni se abrió la app, emuladores o capturas.

La migración no modifica estados de pedidos, aprobación de conductores, precios,
pagos ni GPS de reparto. No da por resuelto DT-07 ni habilita el piloto.

## Correcciones a partir del Samsung — 2026-10-25

El operador aportó seis capturas: panel con espacios enormes, títulos ocultos,
estado de costo estirado verticalmente, «Operación» partido, un error persistente
tras completar las coordenadas y acciones del conductor comprimidas. Es evidencia
del dispositivo del operador; no son capturas obtenidas por Codex.

La causa de los vacíos se encontró en `Button`: `width: 100%` se aplicaba también
a enlaces dentro de filas, dejando a los hermanos sin ancho. En Yoga el texto
podía crecer verticalmente mientras el botón quedaba centrado. Los enlaces ahora
usan ancho intrínseco y pueden encogerse. Los encabezados, estados y acciones
permiten ajustar su distribución sin forzar texto a columnas de ancho cero.
Las cuatro etiquetas de navegación usan una línea y tokens propios; el texto
general conserva escalado de accesibilidad. Las pantallas de fondo claro fijan
iconos oscuros en la barra de estado.

GPS y mapa guardan ambas coordenadas antes de ejecutar una sola validación de
los campos dependientes. La edición manual revalida el par al salir del campo y
admite punto o coma decimal. El mapa solo recibe coordenadas finitas dentro de
rango. El tratamiento de las correcciones manuales se amplió el 2026-10-26 para
conservar el punto elegido al corregir una dirección o comuna sugerida.

Se eliminó la construcción de 346 `OptionCard` animadas cada vez que se editaba
Perfil con el selector cerrado. La búsqueda normaliza una vez el texto y la lista
virtualizada se monta solo al abrir la hoja. `BusinessMemberGuard` conserva la
consulta de membresía al entrar y su sondeo; navegación/páginas consumen el mismo
contexto sin crear observadores adicionales. El inventario del panel se pausa al
perder foco. Las RPC siguen autorizando cada acceso y escritura en el servidor.

El selector «Comuna del negocio» consulta `communes` en Supabase (`code,name`, por
nombre), con la clave `['business-communes', userId]`. Desde el 2026-10-30 conserva
`staleTime` y `gcTime` en `Infinity`: abrir/cerrar el selector o volver a Perfil
reutiliza el catálogo en memoria. La limpieza de caché de Auth sigue vigente;
no se persiste el catálogo entre reinicios. `FlatList` monta 12 filas inicialmente,
con lotes de 8 y ventana de 5, solo mientras la hoja está abierta. La búsqueda
normaliza nombres/CUT una vez por catálogo, ignora tildes y mayúsculas (incluye
«nunoa» → «Ñuñoa») y filtra tras 200 ms sin teclear. Durante una búsqueda muestra
como máximo 40 coincidencias y avisa si hay más; sin texto permite recorrer todo
el catálogo virtualizado. Las filas están memoizadas y la selección conserva las
validaciones y el contrato existentes. Sin comprobación visual nueva.

Fuentes técnicas: [Flexbox de React Native](https://reactnative.dev/docs/flexbox)
y [validación de campos dependientes en React Hook Form](https://react-hook-form.com/docs/useform/trigger).
La corrección es JavaScript y no requiere migración ni compilación nativa nueva.
Pendiente confirmar el resultado tras Reload completo en Samsung y contrastarlo
con iOS/web. No se abrió la app ni se tomaron capturas nuevas en esta corrección.
Validación de esta corrección: `npm run typecheck`, código 0; sin instalaciones,
recompilaciones o comandos de backend.

## Dirección desde mapa/GPS y jerarquía del formulario — 2026-10-26

Confirmar un punto (tocando el mapa o arrastrando el marcador) y usar GPS pasan por
el mismo flujo. `expo-location.reverseGeocodeAsync` busca una dirección aproximada
en Android/iOS, y el borrador recibe dirección, coordenadas y comuna sugerida en
una actualización conjunta. El usuario revisa/corrige el número y guarda el perfil
explícitamente. Corregir el texto o seleccionar la comuna cuando no se pudo resolver
no borra la entrada ya elegida en el mapa. Una nueva comuna pide revisar su
correspondencia; no desplaza el marcador ni presume una nueva ubicación.

El catálogo CUT sigue siendo la autoridad de códigos. Se normalizan tildes/case
para comparar district/city/subregion con nombres del catálogo; solo una coincidencia
única propone código. Cuando faltan calle o país CL, hay varios nombres coincidentes,
falla la red o se rechaza el permiso requerido por Android, se conserva el punto
nuevo pero se exige completar lo que no pudo resolverse. No se arrastra la dirección
del punto anterior ni se asigna una comuna cercana por distancia.

Solo hay una búsqueda por confirmación, no por movimiento, pulsación de teclado
o render. GPS y geocodificación tienen espera limitada; se ignoran resultados
posteriores al desmontar el formulario y se bloquean confirmaciones duplicadas.
No se registra ubicación en logs ni se añade seguimiento. Web conserva dirección
y comuna manuales: la API nativa inversa de Expo no está disponible allí.

La comuna se muestra como campo blanco con borde, etiqueta y chevron; las acciones
del mapa tienen su propio bloque, separado por divisor y explicación. Dejan de ser
dos botones secundarios con el mismo peso visual.

Places Autocomplete puede mejorar la escritura de direcciones, pero es otra
capacidad. Esta sincronización usa el geocoder existente, sin activar nuevos
servicios de Google. [Decisión y fuentes](decisions/0038-business-address-geocoding.md).
Pendiente el ensayo nativo de calidad de resultados, permisos y presentación.
Validación de código del 2026-10-26: `npm run typecheck`, código 0. Sin instalación,
renderizado, capturas ni cambios de backend o facturación en esta ampliación.

## Perfil visual y edición por tarea — 2026-10-26

Horario y contacto se presentan como tres tarjetas accionables: semana de atención,
WhatsApp y tiempo estimado de reparto. Los iconos acompañan etiquetas explícitas;
los días usan abreviaturas y marcas además de color. El horario distingue abierto,
cerrado y sin informar, con la siguiente apertura según America/Santiago. Las
tarjetas comunican su acción y estado a lectores de pantalla.

Cada tarjeta abre una hoja con sus propios campos. El horario ordena los días de
lunes a domingo y muestra interruptores por día; apertura/cierre aparecen solo para
días activos, con aviso si el cierre corresponde al día siguiente. No se confunde
una semana cerrada con un horario sin publicar. La autorización para publicar el
teléfono se conserva junto al campo y la estimación sigue siendo orientativa.
Al abrir la edición de un horario aún no informado, el borrador activa los siete
días con valores sugeridos editables: lunes a sábado 09:00–20:00 y domingo
10:00–15:00, escogidos dentro de los rangos proporcionados por el operador.
El distribuidor desmarca días cerrados y ajusta las horas antes de guardar.
Los horarios existentes (incluida una semana completamente cerrada) se conservan.
Reactivar un día cerrado usa la sugerencia correspondiente al día. No se publica
un horario por abrir/cerrar la hoja ni por guardar solo WhatsApp o tiempo de reparto.
El contrato es semanal: no contiene excepciones por fecha ni aplica automáticamente
el horario dominical a festivos; la hoja lo indica sin prometer esa capacidad.
Cada guardado conserva los demás ajustes y la revisión original del borrador:
un refresco en segundo plano no elimina la protección frente a ediciones simultáneas.

Marca y ubicación muestran resúmenes con edición desplegable; las coordenadas
manuales tienen su propio desplegable. Cerrar una sección conserva el borrador,
sin guardarlo. El botón Guardar perfil aparece cuando hay cambios. Los errores
de validación revelan los campos correspondientes y los fallos de imágenes siguen
visibles. El GPS conserva su indicación de usarlo estando en el negocio.

No se añaden consultas, dependencias ni cambios de backend. Los campos y las hojas
solo se montan al editar. La comprobación en Samsung/iOS/web continúa pendiente;
esta revisión no incluye renderizado ni capturas.

Validación de esta revisión: `npm run typecheck`, código 0 (2026-10-26).
