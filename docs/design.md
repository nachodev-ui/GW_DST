# Gasway · Calor en casa

Referencia visual actualizada el 23 de octubre de 2026. Fuente de verdad:
`apps/mobile/src/theme/index.ts`; `legacy.ts` adapta disposición y comparte los
mismos colores. `theme/brand.ts` recibe la paleta exacta del paquete de identidad
mediante `npm run brand:sync`. Identidad cálida y local: oliva profundo, lima suave,
crema y salvia de apoyo.
Composiciones compactas, tipografía expresiva y una acción clara por momento.

## Regla global de estados positivos — 2026-10-29

`AGENTS.md` prohíbe el verde genérico `#216144`, el fondo menta `#E3F1E6` y
variantes similares en los estados positivos de todos los roles. Se usa texto
e icono oliva sin relleno a través de `StatusBadge` con `tone="success"`. No se
deben crear alternativas locales con fondos verdes ni recuperar esos colores
desde otras bibliotecas o ejemplos. Los textos e iconos mantienen el significado
sin depender únicamente del color.

La implementación compartida elimina el relleno y reduce icono/espaciado en
todos los badges positivos, incluidos «En catálogo», «Disponible» en Flota y
«Abierto ahora» en Horario y contacto. Catálogo reutiliza ahora ese componente.
Los tokens `success` y `successLight` se mantienen por compatibilidad, pero
apuntan al oliva y crema de la marca. Sus consumidores directos (confirmaciones,
indicadores de conexión, requisitos de contraseña y avatares) también abandonan
el verde genérico. `theme/legacy.ts` hereda la misma paleta.

Se conservan las condiciones de apertura, disponibilidad, entrega y habilitación;
los estados de advertencia/error mantienen su presentación. Sin verificaciones
visuales, renderizados ni capturas.

## Catálogo del negocio — 2026-10-29

La cabecera oscura se reduce a «Catálogo del negocio», nombre e icono informativo.
El aviso de precios, existencias y canje se conserva en una hoja desplazable,
accesible desde ese icono. Cobertura usa un enlace de ancho propio con pin y
flecha. Ambos accesos conservan objetivos táctiles de 48 puntos y texto escalable.
«Fuera del catálogo» pasa a una etiqueta pequeña sin icono, con fondo cálido y
texto apagado de los tokens existentes. «En catálogo» usa un check oliva pequeño
y texto sin relleno. El resto de las cards conserva su composición.

El editor usa una cabecera breve y deja la foto e identidad del producto dentro
del scroll. Se retira el `flex: 1` de la antigua cabecera personalizada, que
podía colapsar su altura y solapar el contenido en una hoja de altura variable.
El switch de inclusión no repite el estado mediante un badge ni párrafos.
Los dos precios comparten tamaño de fuente y prefijo `$` pequeño. Se elimina la
vista previa y se reduce la ayuda a «Incluye el cilindro. Opcional.» en el precio
sin canje. El stock pasa de −/+, cuyos botones de ancho completo ocultaban el
campo, a un Input de ancho disponible, con teclado numérico y errores visibles.
Los tres campos rechazan signos y separadores; zod conserva los límites de CLP
y stock, la obligación de precio al publicar y el bloqueo mientras se guarda.
Fuera del catálogo los campos siguen bloqueados con una indicación breve para
activar el producto; sus valores se conservan. El vocabulario del Catálogo usa
«cilindro» en todas sus etiquetas y ayudas.

Referencias públicas de ScreensDesign:

- [Disclosure indicators](https://screensdesign.com/explore/ui-elements/disclosure-indicators/):
  acciones con icono, texto breve e indicador de navegación.
- [SimplyWise](https://screensdesign.com/showcase/simplywise-receipts-expenses):
  información y opciones secundarias disponibles al tocar, con una vista inicial
  más simple.

Se adaptan estos patrones al diseño de Gasway sin inspeccionar pantallas Pro.
El gesto de actualización usa `Screen.onRefresh`, conserva la invalidación de
negocios y el refetch de productos existentes, y sustituye «Actualizar datos».
El indicador responde solo al gesto; el sondeo cada 30 segundos sigue igual.
Edición, validaciones, precios, stock, publicación y permisos conservan su lógica.
No se ejecutaron renderizados, capturas, comparaciones ni verificaciones visuales.

## Tu pedido: seguimiento y resumen — 2026-10-24

Cambio exclusivo del cliente desde «Sigue tu entrega» hacia abajo. Se conservan
sin cambios el hero («Tu pedido está confirmado», ilustración y demás estados)
y el progreso superior. Se consultaron referencias públicas de ScreensDesign:

- [Shop y otros ejemplos de seguimiento](https://screensdesign.com/articles/mobile-app-order-tracking-screen-examples/):
  estado legible y separación entre seguimiento e historial.
- [Route4Me](https://screensdesign.com/showcase/route4me-route-planner):
  mapa con acciones contextuales próximas.
- [LeanBites](https://screensdesign.com/showcase/leanbites-healthy-dining):
  resumen prioritario y detalles secundarios agrupados.

Son adaptaciones de los patrones descritos públicamente; las pantallas bloqueadas
por Pro no se inspeccionaron. Se mantienen identidad, componentes existentes y
fuentes de datos de Gasway, sin añadir dependencias nativas.

El mapa del cliente tiene 280 puntos de alto, estado breve y leyenda de marcadores.
Se retiran contador, precisión, recepción y explicación técnica del primer plano;
la caducidad y los mensajes de error siguen activos. La cámara encuadra inicialmente
el destino y la primera ubicación; cualquier gesto cede el control al usuario.
Las consultas y posiciones posteriores no ajustan zoom ni centro. «Ver ambos»
reencuadra expresamente con los puntos vigentes. La pérdida/recuperación de señal
retira/reincorpora el marcador sin cambiar la identidad del mapa por cada muestra.

Una tarjeta reúne cilindro/canje, precio en CLP, efectivo al recibir, dirección,
comuna y distribuidora. El distintivo Demo sigue visible. «Ver detalles del pedido»
abre una hoja desplazable con canje completo, indicaciones, historial, fecha e ID.
La actualización manual usa el gesto de tirar hacia abajo; cancelar conserva su
confirmación. El conductor y las reglas del servidor no cambian.

Prueba de cámara aprobada con límites nativos simulados. La revisión visual de
esta nueva composición en teléfonos sigue pendiente; no se ejecutó la app.

### Marcadores propios, recibo y actualización por gesto

- Destino: casa sobre base clara con techo oliva y puerta lima, anclada al punto
  inferior. Repartidor: camión de gas semirrealista visto desde arriba, cabina clara,
  carrocería oliva/lima y cilindros visibles, sin base ovalada. Se usan PNG locales
  1x/2x/3x: casa vectorial y camión generado a partir de la referencia del operador.
  Se mantiene la casa al
  elegir el punto del pedido. Leyenda con iconos de casa/vehículo y títulos nativos.
  La orientación del vehículo es ilustrativa; no se infiere rumbo ni ruta del GPS.
  [Fuentes y regeneración](../apps/mobile/assets/maps/README.md).
- La hoja «Detalles del pedido» contiene una tarjeta ordenada con fotografía
  pequeña del producto exacto, marca, tamaño/variante, cantidad, canje, pago y total.
  Entrega/indicaciones, historial y registro del pedido tienen bloques separados.
  No se reemplazan fotos de fabricantes por una ilustración genérica.
- Se elimina «Actualizar pedido». Al llegar al inicio del scroll y tirar hacia
  abajo aparece el indicador nativo: oliva en iOS, oliva/lima sobre crema en Android.
  `Screen.onRefresh` es optativo; aquí refresca pedido, eventos, catálogo, contacto
  de distribuidora y tracking de la cuenta/pedido actual. Se une a consultas en
  curso y evita gestos simultáneos; polling y Realtime no activan el indicador.
  Los reintentos específicos ante errores se conservan. Otras pantallas y el
  conductor no activan este nuevo comportamiento.

Comprobar en teléfonos el dibujo/anclaje de los marcadores, el scroll de la hoja
y el indicador al tirar desde el inicio. No se ejecutó la app ni se capturó su UI.
Typecheck, lint dirigido y suites `test-orders.cjs`/`test-tracking.cjs` aprobados:
incluyen aislamiento del refresco por cuenta/pedido, consultas activas sin cancelar
lecturas en curso, bloqueo de gestos solapados y cierre del indicador ante error.

### Corrección por marcadores invisibles — 2026-10-24

El operador reportó que no se veía ninguno tras usar `Marker.image`. El código
instalado de MapKit usa `[RCTBridge currentBridge]` en `setImageSrc`, la misma ruta
del [fallo bridgeless reportado](https://github.com/react-native-maps/react-native-maps/issues/5912).
Es una causa compatible con la evidencia; no se obtuvo un log del iPhone.

Se sustituye por una imagen React Native dentro de un contenedor no colapsable,
con dimensiones fijas. El seguimiento de cambios solo se congela después de carga,
layout y pintura; Android recibe un redraw explícito. Una carga fallida conserva
un pin de respaldo. Las coordenadas y su caducidad siguen controladas por D3.
La regresión automática verifica esa secuencia y el respaldo sin ejecutar el mapa
nativo. El 2026-10-25 se recuperó Apple Maps en Expo Go iOS, conservando Google en Android; la visibilidad
y rotación nativas siguen pendientes de reporte. No se usa una imagen por rumbo:
el mismo PNG cenital gira con `rotation`/`flat` en Google y transformación de imagen
respecto de la cámara en Apple. [Motor y simulación](vehicle-motion.md).

Camión creado con la herramienta integrada de generación de imágenes, usando la
referencia como estilo. [Maestro y prompt](../artifacts/gasway-map-markers/generation.md).

## Actualizaciones silenciosas — 2026-10-24

El polling y Realtime actualizan los datos sin cambiar el texto, la opacidad o
el estado de los botones de actualización. `isFetching` también representa esas
consultas automáticas y no debe usarse para simular una acción del usuario.
Los skeletons corresponden a la carga inicial (`isPending`).

`RefreshButton`, en `shared/ui/components.tsx`, muestra «Actualizando…» y bloquea
dobles pulsaciones solo durante su petición manual. Cada pantalla conserva su
propia información de errores y restricciones de permisos/estado. Las consultas
manuales directas se unen a una lectura en curso con `cancelRefetch: false`.

Se aplica al seguimiento del cliente/conductor, detalle e historial de pedidos,
distribuidoras, entrega, cuenta/cobertura del conductor y actualización de datos,
catálogo, cobertura, equipo y solicitudes del negocio. La pantalla de Ofertas ya
separaba el gesto manual de su polling y conserva ese comportamiento. Los bloqueos
de paginación siguen coordinando las consultas para no solaparlas.

Con un pedido válido, el polling tampoco deshabilita los botones de avance del
conductor; se conservan la carga inicial, los errores, la mutación en curso y la
confirmación de entrega. El servidor sigue validando cada transición.
Typecheck aprobado después de estos cambios. No se ejecutó la app ni una
verificación visual; comprobar la estabilidad en los teléfonos tras recargar Metro.

## Paleta

| Token                                        | Valor                       | Uso                                               |
| -------------------------------------------- | --------------------------- | ------------------------------------------------- |
| primary / progress                           | #4A5A2A                     | Acciones, selección y pedido confirmado/en camino |
| onPrimary / surface                          | #FFFFFF                     | Texto inverso y superficies                       |
| primaryLight / progressLight                 | #E1E6C6                     | Selección y progreso                              |
| background                                   | #F3F2E8                     | Crema, lienzo general                             |
| text                                         | #1E2417                     | Tinta oliva                                       |
| textMuted                                    | #5F6857                     | Lectura secundaria                                |
| accent                                       | #4A5A2A                     | Oliva oscuro para texto e iconos                  |
| accentLight                                  | #E1E6C6                     | Fondo claro de apoyo                              |
| lime / copper                                | #A8C26A                     | CTA del hero y decoración                         |
| sage                                         | #A3AF9C                     | Salvia de la referencia                           |
| copperLight                                  | #E1E6C6                     | Apoyo decorativo heredado                         |
| cylinderBody / cylinderShade / cylinderShine | #A3AF9C / #4A5A2A / #F3F2E8 | Ilustraciones decorativas heredadas               |
| cylinderDark                                 | #1E2417                     | Aros y base decorativos                           |
| heroStart / heroEnd                          | #1E2417 / #4A5A2A           | Degradado del hero                                |
| heroMuted                                    | #E1E6C6                     | Texto secundario sobre el hero                    |
| surfaceBorder / divider                      | #D3DAC9                     | Separadores discretos                             |
| border                                       | #74816C                     | Límite visible de campos                          |
| warm                                         | #EBEEDD                     | Fondos neutros y skeletons                        |
| success / successLight                       | #216144 / #E3F1E6           | Entregado                                         |
| warning / warningLight                       | #80520B / #FCF0D1           | Solicitado y búsqueda de repartidor               |
| error / errorLight                           | #A32D32 / #FBE9E7           | Cancelación y errores                             |
| scrim                                        | rgba(30, 36, 23, 0.56)      | Fondo de hojas modales                            |

Contraste calculado con luminancia sRGB de los tokens: blanco/primary 7,53:1;
text/background 14,15:1; textMuted/background 5,18:1; accent/accentLight 5,86:1;
success 6,29:1, warning 5,92:1 y error 6,01:1 sobre sus fondos semánticos.
Blanco sobre el extremo más claro del hero 7,53:1 y heroMuted 5,86:1.
Texto oscuro sobre lima 8,02:1. Estos pares superan WCAG AA para texto normal.
Lima y salvia no se usan como texto sobre blanco. Los estados incluyen icono y texto,
además del color.

La paleta de interfaz del 21 de octubre conservaba derivados salvia y crema verdoso.
El paquete de marca del 23 de octubre fija #1E2417, #F3F2E8, #A8C26A y #4A5A2A,
ahora aplicados a los tokens principales. Los tonos secundarios y estados semánticos
se conservan.
Oliva oscuro para lectura y acciones, crema para el lienzo y lima con texto oscuro
en la acción del hero. La percepción de confianza requiere validación con clientes.
Referencia del mínimo de 4,5:1 para texto normal:
[WCAG AA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
Los nombres copper/copperLight se mantienen por compatibilidad y ahora remiten a
lima/crema; no representan el color de fotografías de fabricantes.

## Tipografía, espacio y profundidad

- GaswayLogo representa el wordmark y monograma como contornos vectoriales del
  paquete maestro. La fuente original de la lámina IA no está identificada. El logo
  no depende de Outfit/Figtree; punto y proporciones se escalan juntos. Ancho de
  lienzo 160 para wordmark y 32 para monograma, con protección incluida. Su etiqueta
  accesible es «Gasway». Origen, recursos nativos y sincronización en
  [paquete de marca](brand-package.md).
- Outfit 600 para títulos y 700 para display; Figtree 400–700 para lectura y controles.
  Fuentes locales cargadas con expo-font, con respaldo del sistema si fallan.
- Escala: display 36; hero 42/45; título 28; subtítulo 21; cuerpo 16/24;
  etiqueta 15; nota 14. Los precios se destacan y usan cifras tabulares donde procede.
- Espaciado 4/8/12/16/20/24/32/48; margen lateral 20; ancho máximo 560.
  Texto escalable, filas con altura mínima y posibilidad de crecer.
- Radios: controles 16; tarjetas y navegación 24; hero y hojas 32.
  La profundidad usa degradado y tres niveles de sombra oliva.
  Evitar envolver cada texto en otra caja; agrupar por propósito.
- Áreas táctiles de al menos 48; botones 56. Safe areas incluidas en pantallas,
  pies y navegación. El pie del pedido permanece fuera del scroll y sobre el teclado.

## Inicio de sesión y registro

Composición renovada el 23 de octubre de 2026, tomando como punto de partida
[la galería solicitada de ScreensDesign](https://screensdesign.com/store-screenshots/)
y [la referencia de acceso de VSCO](https://screensdesign.com/apps/vsco-photo-video-editor/):
cabecera visual con identidad fuerte y formulario en un panel superpuesto.
La adaptación usa exclusivamente la paleta Gasway, sin copiar fotografías ni
recursos de la referencia.

- Cabecera verde profundo, wordmark vectorial en crema y títulos Outfit en dos
  líneas. Una ilustración SVG de puerta, ruta y círculos en lima aporta carácter;
  es decorativa y queda fuera del árbol de accesibilidad.
- Panel crema con esquinas superiores redondeadas y selector «Iniciar sesión /
  Registrarme». El estado seleccionado se comunica con superficie y semántica de
  radio; cada opción mantiene un área táctil mínima de 48.
- Campos blancos con etiquetas persistentes, foco oliva y errores en color
  semántico. En registro, panel cálido bajo la contraseña con tres filas: «Al menos
  8 caracteres», «Una mayúscula (A-Z)» y «Un número». Cada fila muestra cruz en
  terracota si está pendiente y check verde al cumplir, en tiempo real al escribir,
  pegar o borrar. Usa iconos, espaciado, radios y tipografía del tema. El estado
  accesible dice cumplido/pendiente; los iconos son decorativos. No aparece al ingresar.
- Acción principal oliva en cápsula, flecha y estado de envío con indicador de
  actividad. El selector y los campos se bloquean durante el envío.
- Retirados «Tu próximo pedido empieza aquí…», la descripción promocional del
  registro y las preguntas del pie. Se conservan validación, errores y aviso de
  confirmación de correo.

La composición puede crecer con el tamaño del texto, incluye safe areas y scroll
con adaptación al teclado. Ancho de contenido limitado a 440; las superficies se
extienden en web. Medidas específicas centralizadas en `theme.access`; colores,
tipografía y controles reutilizan los tokens existentes. Implementación contenida
en `features/auth/access-ui.tsx` y `access-screen.tsx`, sin dependencias nuevas.
El registro ahora reutiliza esta composición en dos pasos: correo/contraseña con
«Continuar», luego teléfono con «Crear cuenta». El aviso «Revisa tu correo» tiene
su propia ruta. Solo el paso final crea la cuenta; contrato y validación en
[registro con teléfono](registration-phone.md). El callback PKCE conserva su lógica.

El paso de teléfono usa una composición clara y compacta: vuelta y logo en la
cabecera, indicador «2 de 2», título y explicación breve. El campo reúne bandera
chilena SVG, prefijo fijo `+56 9` y un espacio editable de ocho dígitos, con foco en
el borde completo. El CTA comunica la pausa/reintento si Auth limita el envío;
volver conserva correo/teléfono en memoria y pide otra vez la contraseña.

### Aviso de confirmación de correo

La revisión del 2026-10-23 reemplaza los dos paneles verdes y la cabecera genérica
por una composición propia en `features/auth/check-email-page.tsx`: fondo crema,
logo compacto, «Último paso» y sobre SVG con papel, recorrido punteado y reloj de
espera en oliva/lima. El título y la explicación van centrados. La dirección
seleccionable ocupa una tarjeta blanca con borde fino; crece en varias líneas.
Dos pasos numerados explican buscar el correo y abrir el enlace en este teléfono.
La ayuda de spam usa icono y separador; el pie reúne una única acción de ingreso
y el aviso neutral para cuentas existentes. No hay navegación duplicada.

Referencia solicitada: [ScreensDesign · Store screenshots](https://screensdesign.com/store-screenshots/)
y su [colección de verificación](https://screensdesign.com/explore/screens/verification/),
especialmente la jerarquía de logo/ilustración de The Guardian y sobre/destinatario
de EveryDollar. Se adapta esa jerarquía a la identidad propia, con arte vectorial
original y sin copiar assets o introducir nuevas dependencias.

Los tamaños propios están en `theme.access.confirmation`; colores, tipografías,
radios y espaciados reutilizan el tema. Safe areas, scroll y marcadores que crecen
con el texto conservan lectura en pantallas pequeñas y fuentes ampliadas. El arte
es decorativo para lectores de pantalla. El reloj no afirma confirmación ni entrega
del correo; el flujo conserva su respuesta neutral y los guards existentes.
No se cambia Auth, el enlace ni el envío. Sin render/capturas; revisión visual en
dispositivo pendiente, conforme al presupuesto del repositorio.
`npm run typecheck` y la regresión existente `node scripts/test-auth.cjs` aprobaron
tras el rediseño; esta última conserva la comprobación de correo y vuelta al ingreso.

La composición de acceso original pasó `npm run typecheck`. La validación de la
ampliación con teléfono y su migración se registra en el documento enlazado.
No se renderizó la app ni se realizaron capturas o pruebas en emulador; la revisión
visual y del teclado en dispositivo queda pendiente.

## Primitivas

Compra por distribuidora: tres pasos (Entrega, Tu cilindro, Distribuidoras), resumen
fuera del scroll y hoja de revisión antes de confirmar. Tarjetas con precios de ambas
modalidades, disponibilidad, horario y ETA informada; cerrados al final. La acción
principal confirma en Gasway; WhatsApp es consulta secundaria con aviso de privacidad.
Sin precio/stock/reparto no se ofrece confirmar. Configuración comercial en una hoja
del catálogo del negocio, con horario semanal y teléfono opt-in. No se agregan tokens
de color locales ni se usan logos como insignias de habilitación.

`shared/ui`: Button, Card, OptionCard (chip de elección), StatusBadge, Input,
BottomSheet, BottomTabBar, Skeleton, EmptyState, Enter, PulsePressable y
CylinderSelector. Ninguna importa features ni decide permisos o roles.

La navegación es una superficie blanca ligera con indicador crema verdoso animado,
icono/etiqueta oliva y punto lima si las páginas cargadas contienen un
pedido activo. Ocupa espacio propio y no tapa contenido. Los tres destinos y rutas
se conservan; no aparece en nuevo pedido ni detalle.

Motion: press 0,965 en 130 ms; selección y transiciones 240 ms; entrada 360 ms con
65 ms entre bloques. Lift sutil en cilindros y pulsación del skeleton a 1 s.
Movimiento reducido desactiva entradas, lift, pulso y haptics; conserva feedback
por opacidad. Haptics solo en selección, navegación y acciones principales nativas;
web no vibra. No hay animación continua decorativa ni cambios de consulta.

Los productos con marca usan las fotografías originales locales de cada formato.
Abastible: envase naranja y letras azul oscuro; Gasco: blanco y letras rojas;
Lipigas: amarillo y letras azul oscuro. Estos colores pertenecen al producto;
la identidad de Gasway usa oliva, lima, crema y salvia.
`ProductImage` resuelve marca + peso + variante a un archivo concreto. Catálogo del
negocio, editor, selección, revisión, historial y detalle comparten esa resolución;
no usan un recorte referencial como sustituto de un producto. Abastible VM/VMA
conserva sus fotos específicas. `contain` y dimensiones explícitas preservan proporción
y rotulación, también en web; los fondos se retiran en los PNG cuando corresponde,
sin aplicar tintes ni deformaciones en la interfaz.

Los renders neutros y la composición referencial se reservan para Inicio. El selector
exploratorio de Inicio sigue sin presuponer marca. En Nuevo pedido se elige primero
marca y después tamaño, con fotos originales de esa marca en cada opción y formatos
no disponibles deshabilitados. Las variantes muestran su fotografía al seleccionarlas.
Las cajas visuales facilitan lectura; no representan escala física común ni stock.
Procedencia, limitaciones y prompts en [recursos de cilindros](cylinder-assets.md).

## Inicio del cliente

Saludo breve, identidad y acceso a Cuenta. Si hay un pedido activo entre las páginas
cargadas, aparece antes del hero. Hero asimétrico oliva con composición PNG de las tres marcas,
centrada junto al título en dos columnas flexibles, halo local y CTA lima en una
fila propia. La imagen declara ancho y alto de 176, con ancho máximo del contenedor;
no depende de la altura intrínseca del PNG en web. El cuerpo no tiene expansión
vertical flex. La tarjeta tiene altura mínima y crece solo por su contenido.
El selector 5/11/15/45 kg permite elegir y llevar ese tamaño al
flujo mediante un parámetro opcional de presentación; el catálogo vuelve a decidir
qué producto está disponible. No se presupone marca ni se crea un producto.

Actividad muestra hasta tres pedidos reales, incluidos cancelados, con fecha,
precio registrado y estado. No oculta un pedido porque el catálogo falte: usa una
etiqueta neutra. Skeleton, error con reintento y bienvenida ilustrada son explícitos.
Se conserva useOrdersList/useCatalogue, sin consultas ni polling nuevos.

## Pedido completo

### Rediseño visual de pasos 2 y 3 — 2026-10-27

Las cinco capturas del operador mostraron desborde del contador, nombres de marcas
partidos, canje y distribuidoras dominados por párrafos y avisos demo repetidos.
Se corrigió el contador compartido con ancho de toque fijo y padding propio: un
Button al 100 % dentro de un padre sin ancho definido expandía la fila en Yoga.
Esto es diagnóstico de código más evidencia del operador; no un render del agente.

- **Tu cilindro:** marcas con logo, foto por tamaño, variantes solo cuando hacen
  falta, contador compacto y dos opciones visuales de entrega de cilindro vacío.
  La marca devuelta usa tres fotos y una fila «Otra marca / No sé». Se conserva
  canje explícito; sus condiciones se consultan en una hoja secundaria.
- **Distribuidoras:** ficha con imagen exacta del producto, total elegido,
  disponibilidad, stock y ETA real o «Por confirmar». Horario, otros precios y
  criterio de orden quedan en detalles. No hay reseñas ni cifras inventadas.
- **Acciones:** ordenar usa control blanco con borde e icono; editar está en el
  pie como icono que abre dos destinos (dirección o cilindro). Las CTA principales
  usan verde oscuro de marca, sin los rellenos oliva/salvia de las acciones antiguas.
- **Pie:** miniatura compacta sin recortar, cantidad/producto y comuna con pin.
  En el tercer paso no hay un segundo botón grande que compita con las tarjetas.
- **Refresco:** tirar hacia abajo en el tercer paso, mediante Screen.onRefresh;
  sin botón «Actualizar distribuidoras». La carga manual se separa del sondeo.
- **Revisión:** foto, dirección, canje, pago y total agrupados con iconos. Se
  retiran avisos demo repetidos por petición del operador. is_demo y el bloqueo
  de WhatsApp para negocios ficticios permanecen en los contratos.

Se dice «cilindro» en el flujo. Los pasos comienzan arriba al cambiar, conservando
los valores del formulario y la clave de idempotencia en su componente padre.
Se reutilizan las fotografías existentes y tokens purchase; sin dependencias nuevas,
migraciones, renderizados, capturas ni emuladores. Comprobación en teléfono pendiente.

Validación de esta entrega: typecheck final aprobado y pruebas dirigidas de
controles de compra, formularios de pedidos y opciones de reparto aprobadas.
La regresión del contador comprueba ancho acotado, espacio para los signos y
límites 1–99; las tarjetas conservan los bloqueos por precio, cobertura, horario
y conductor. Estos resultados no acreditan la composición visual en el teléfono.

### Contrato del recorrido

1. **Entrega:** calle/número, comuna oficial, notas y ubicación opcional con revisión.
2. **Tu cilindro:** marca, tamaño con foto original, variante, cantidad y canje explícito.
   El formato recibido desde Inicio se conserva cuando existe para la marca elegida.
3. **Distribuidoras:** cobertura, stock, precio de vendedor, horarios y ETA informada.
   La revisión se abre en una hoja con foto exacta, vendedor, cantidad, total CLP,
   canje y entrega. Confirmar llama a la RPC transaccional; el servidor conserva
   la autoridad sobre el precio final. Ver ADR 0018.

Validación por paso; los datos permanecen al volver. Botones bloqueados durante
creación, límites de cantidad/total conservados. Efectivo contra entrega solamente.

El pago se resume junto al precio y en la revisión mediante icono y etiqueta breve.
El componente redundante CashNote permanece retirado de Inicio y detalle.

## Seguimiento y Pedidos

Hero de seguimiento con copy por cada uno de los seis estados y dibujo de trayecto
ilustrativo. Se declara que el seguimiento es por estados y sin ubicación en vivo.
No se dibuja un mapa con posiciones, kilómetros o tiempos ficticios.
Línea de progreso y eventos reales, con offered y cancelled visibles cuando existen.
No se inventan fechas para eventos ausentes. El dibujo queda oculto a accesibilidad.

Detalle con producto/total, entrega, eventos y referencia seleccionable. Cancelación
solo cuando lo permite canCancel y sin error de la consulta, con confirmación en
BottomSheet. La hoja se oculta si cambia la elegibilidad. Se conservan las consultas,
Realtime, RPC y estados existentes.

Pedidos tiene filtros Todos/En curso/Historial sobre las páginas cargadas y carga
manual de más páginas. No muestra conteos totales inferidos. Tarjetas con estado,
fecha, producto, cantidad, total y acceso a detalle. Vacíos por filtro aclaran el
límite de las páginas disponibles; errores conservan datos y permiten reintentar.

## Cuenta

Identidad en hero compacto; acciones de hogar en un grupo y negocio/reparto en otro.
La postulación conserva su componente y sus permisos en una hoja desplazable,
consultada al abrir. El cierre de sesión y el acceso del conductor no cambian.
No se muestran direcciones guardadas ni edición de perfil: no hay contrato existente
para ellas. El nombre de metadata es solo presentación.

## Negocio y conductor

Comparten automáticamente nueva paleta, tipografía, controles, tarjetas, hojas y
barra inferior. WorkspaceHero del negocio usa el mismo degradado con profundidad.
Se preservan sus composiciones y lógica. Queda pendiente una revisión específica
pantalla por pantalla de estos dos espacios y de la postulación completa.

## Logos de marcas de productos

Lipigas, Gasco y Abastible se identifican por nombre y fotografías de cilindros.
Las tarjetas «Tu marca» muestran además el isotipo local de cada empresa, su nombre
y el check de selección. Reutilizan `BrandLogo` en variante `mark`, sin tintes ni
deformación y con tamaño definido por tokens; la tarjeta conserva el nombre accesible
y los estados de selección/disponibilidad. La selección de tamaño sigue siendo neutra.
La composición de Inicio y los recortes de Gasco/Lipigas se generaron con image_gen
a partir de las referencias proporcionadas por el usuario. Son recursos de interfaz
de Gasway, no archivos oficiales emitidos por los fabricantes ni un nuevo logotipo.
Se conservan los logos y fotografías Abastible existentes. No cambian icono ni splash.

## Cabeceras y edición del catálogo

El negocio utiliza la nueva paleta y WorkspaceHero. Los editores existentes mantienen
hojas con Guardar cambios/Cancelar, pie fijo, stock, precio y validación originales.
Ver [panel del negocio](business-admin-ux.md).

## Omisiones y verificación

Sin promociones, descuentos, precios de muestra, ETA, mapa de tracking, direcciones
guardadas ni datos de cuenta nuevos. Sin modo oscuro en esta entrega; requiere una
variante completa y comprobación de todas las pantallas para mantener el contraste.
La lista y el badge conservan el límite de las páginas cargadas del hook existente.

Expo web disponible y compilado con Metro. La revisión de las pantallas privadas
requiere iniciar sesión en la pestaña local. No se eluden guardas ni se crean usuarios/pedidos de
prueba. Máximo autorizado: una captura de Inicio, pedido, seguimiento y Cuenta,
y una ronda de correcciones. El estado final de la revisión se registra en el resumen
de entrega. Se tomaron tres capturas: Inicio (posición desplazada de la pestaña),
pedido en marca/canje sin precios disponibles y Cuenta, a 390 × 844. Una ronda de
correcciones: opacidad de controles deshabilitados, estados ARIA de selección y
avatar compacto en Cuenta. No se repitieron capturas. No había pedidos para capturar
seguimiento ni precios para avanzar a dirección/confirmación; no se crearon datos.
Prueba de teclado/nativo, entrega completa y tracking real quedan pendientes.
La única ejecución de typecheck detectó cuatro incompatibilidades: subtitle opcional,
absoluteFillObject retirado, entering opcional y aria-disabled nullable. Se corrigieron
omitiendo props ausentes, usando anclajes explícitos y normalizando el booleano.
No se repitió typecheck, respetando el tope; el cierre de tipos tras esos ajustes no
se revalidó en aquella entrega. En la corrección posterior del 21 de octubre,
con altura explícita del hero y paleta oliva/lima, la única ejecución final de
`npm run typecheck` fue aprobada. Sin nuevas capturas ni renderizado de la app;
el resultado visual corregido queda pendiente de comprobación. Sin tests ni comandos de backend.

Dependencias nuevas: expo-linear-gradient ~57.0.2, expo-haptics ~57.0.3 y
@expo-google-fonts/outfit ^0.4.3. Se reutilizan SVG, Reanimated y Figtree.
Referencias API: [degradados SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/)
y [haptics SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/).

## Archivos de esta entrega

Rutas respecto de la raíz del repositorio; se conservaron los cambios locales previos.

- `apps/mobile/src/theme/{index,legacy}.ts`.
- `apps/mobile/src/shared/ui/`: `text.tsx`, `font-provider.tsx`,
  `pulse-pressable.tsx`, `components.tsx`, `bottom-sheet.tsx`, `bottom-tab-bar.tsx`,
  `cylinder-illustration.tsx`, `cylinder-selector.tsx`, `enter.tsx`, `skeleton.tsx`,
  `empty-state.tsx`, `segmented-tabs.tsx`.
- `apps/mobile/src/features/orders/customer/`: `customer-home-screen.tsx`,
  `new-order-screen.tsx`, `orders-screen.tsx`, `order-ui.tsx` y recoloración del
  `home-editorial-carousel.tsx` previo, que Inicio ya no utiliza.
- `apps/mobile/src/features/auth/zone-screen.tsx`.
- `apps/mobile/src/features/business/workspace-ui.tsx`.
- `apps/mobile/package.json` y `package-lock.json`.
- `README.md`, `docs/design.md`, `docs/business-admin-ux.md` y actualización de
  referencias de paleta en `docs/decisions/0005-auth-and-roles.md` y
  `docs/decisions/0010-applicant-status-and-reapplication.md`.
- `.claude/napkin.md`: precedencia del presupuesto explícito y edición UTF-8 en Windows.

Las rutas, hooks/consultas, contratos, SQL, RLS y assets de icono/splash no se editaron.

## Confirmación de correo completada

La espera normal de acceso/confirmación muestra solo el logo vectorial centrado
de la nueva identidad; el estado real sigue disponible para lectores de pantalla.
Tras 15 segundos aparecen aviso y reintento cuando el flujo lo permite. Los
resultados y controles de confirmación se conservan. El video de Higgsfield y la
ilustración de casa/cilindro se retiraron. Ver [pantallas de espera](loading-screen.md).

El callback de Auth cambia el título a «¡Correo confirmado!» solo después del
intercambio correcto. Una tarjeta de éxito reúne check grande, etiqueta textual
«Verificación completada» y mensaje; el CTA dice «Continuar en Gasway». Icono,
texto y color comunican el estado, con anuncio accesible y tokens existentes.
Los estados de espera, enlace vencido/inválido y acceso no completado conservan
sus mensajes; el éxito no se deduce de haber abierto el enlace.

## Tu entrega del conductor

Rediseño del 2026-10-25, limitado al conductor. Jerarquía: destino y estado,
mapa adaptable a la altura del teléfono, «Navegar», GPS, carga/cobro e indicaciones.
El siguiente paso del pedido queda fijo abajo. Se elimina la repetición de tarjetas
explicativas, horas de envío y botones grandes de mapa. No se inventan ETA,
distancia, contacto del cliente ni pasos de navegación dentro de Gasway.

- Ampliar y centrar son controles flotantes de 48 pt, con etiqueta accesible;
  conservan el encuadre inicial y respetan zoom manual en las actualizaciones GPS.
- «Navegar» usa verde profundo y acento lima, abre la selección Google Maps/Waze y
  conserva la explicación y consentimiento de GPS antes de los permisos.
  La hoja prioriza dos tarjetas visuales con las imágenes Google Maps/Waze
  adjuntadas por el operador y sus nombres debajo, un
  aviso breve de que se compartirá ubicación incluso con otra app/pantalla bloqueada
  y detalles secundarios desplegables. Solo la opción pulsada muestra preparación;
  ambas se bloquean durante la apertura y los errores permanecen visibles.
- Estado GPS compacto con texto e icono/indicador, acción Activar/Pausar y ayuda
  de privacidad bajo demanda. Errores, permiso rechazado y caducidad siguen visibles.
- Carga con foto real, cantidad, variante y canje; total CLP en efectivo agrupado.
  La hoja «Carga y canje» resume foto, producto y cantidad en un bloque visual;
  una fila indica «Retirar cilindro vacío» y su marca (o «Sin canje»). Conserva
  una indicación breve para revisar tipo, válvula y estado, sin párrafos repetidos.
  Las indicaciones del cliente permanecen completas y seleccionables.
- Acción final separada de navegación; confirmación explícita antes de cerrar el
  pedido. Pull-to-refresh independiente del sondeo, con consultas por usuario/pedido.
  «¿Entregaste el pedido?» muestra fotografía del cilindro, marca, formato/variante
  y cantidad en un bloque visual. Cobro en efectivo y canje/marca a retirar se
  presentan en filas con iconos. Una sola línea explica que confirmar cierra
  pedido/seguimiento; se conservan confirmar y seguir en camino, con bloqueo al guardar.

Referencias públicas consultadas en Screensdesign: [Spoke Route Planner](https://screensdesign.com/apps/circuit-route-planner/),
[Transit](https://screensdesign.com/apps/transit-subway-bus-times/),
[OS Maps](https://screensdesign.com/apps/os-maps-walk-hike-run-bike/),
[Route4Me](https://screensdesign.com/apps/route4me-route-planner/) y
[ABRP](https://screensdesign.com/apps/a-better-routeplanner-abrp/).
Se revisaron galerías públicas y descripciones de flujos; varias pantallas internas
requieren Pro y no se accedió a ellas. Se adaptan jerarquía mapa/parada, controles
compactos y detalles progresivos a los tokens de Gasway, sin copiar assets.
No se renderizó la app ni se hicieron capturas de dispositivos en este cambio.
Typecheck aprobado. Regresiones existentes de espacio del conductor, navegación y
ciclo de vida aprobadas (13 tests de Node más aserciones del workspace): confirmación
de entrega, enlaces exactos, encuadre completo/zoom manual y cierre del GPS.

### Feedback al avanzar la entrega

El estado pequeño es información persistente de consulta; la acción explícita
necesita una respuesta visible junto al control que se acaba de pulsar.
Se adopta un aviso integrado sobre el botón fijo, inspirado en los ejemplos públicos
de [toast de Screensdesign](https://screensdesign.com/explore/ui-elements/toasts/):
Zalando confirma y explica el resultado en un snackbar; Yelp confirma con icono y
acción opcional; Expedia sitúa la confirmación al pie. También se consultó la
[colección de éxito y confirmación](https://screensdesign.com/explore/screens/success/).

- **Esperando:** spinner y «Iniciando entrega…» / «Confirmando entrega…», con
  estado accesible ocupado y bloqueo inmediato de doble pulsación.
- **Inicio confirmado:** check, «Entrega iniciada · Ya estás en camino», háptica
  de éxito y fundido suave. El aviso puede cerrarse; no desaparece por un temporizador.
- **Entrega confirmada:** «Entrega completada» como título persistente dentro
  de la tarjeta del pedido, junto a producto y cobro. El pie contiene únicamente
  «Volver a ofertas». La confirmación explícita previa se conserva.
- **Error:** aviso «Cambio sin confirmar», explicación del error y «Revisar
  pedido». No se muestra éxito ni se permite otro avance sin revisar el estado.

Se evita añadir otra alerta modal para éxitos rutinarios. La intensidad del aviso
corresponde a su importancia, siguiendo [Apple: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback).
Icono y texto complementan el color. Android utiliza región accesible de estado e
iOS anuncio sin mover foco; la háptica no es el único canal. Se aplica el principio
de [W3C: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
de informar cambios sin obligar a cambiar de contexto. El fundido respeta movimiento reducido.

El éxito requiere respuesta RPC del pedido y estado solicitados. No es optimista,
no deriva de polling/Realtime y no se repite al refrescar. La respuesta tardía tras
desmontar o cambiar usuario/pedido se descarta. El refresco de jornada continúa en
segundo plano después del resultado; no bloquea su feedback. Cuatro regresiones
dirigidas cubren confirmación real, error, doble toque, aislamiento, lectores y
háptica única mediante mocks. No equivalen a validación visual/háptica en teléfono.

Refinamiento de marca del 2026-10-25: los éxitos del conductor usan exclusivamente
crema `#F3F2E8`, verde oscuro `#1E2417`, oliva `#4A5A2A` y lima `#A8C26A`, mediante
tokens existentes. Se retiran `success`/`successLight` de esas confirmaciones.
El resultado final se integra como título de la tarjeta blanca, en verde oscuro,
sin check, círculo, aviso separado ni «Pedido cerrado». Se retira también el
estado duplicado junto al destino. El inicio conserva su aviso crema/oliva/lima.
Los anuncios/háptica están ligados al evento de la acción desde la pantalla,
independientes de la ubicación del mensaje; no se repiten al actualizar los datos.
La tarjeta muestra el título también al consultar una entrega histórica, sin
generar una nueva háptica. Las referencias
públicas de Meetup y Vivino en la galería de confirmación orientan la jerarquía
tipográfica y el uso de identidad propia; los colores proceden solo de Gasway.

Comprobación visual excepcional autorizada solo de «Tu entrega»: vista web aislada
de la pantalla real, con un pedido ficticio entregado, fuentes e imagen del producto
locales. Se verificó composición a 390 px, título único dentro de la tarjeta y
ausencia del aviso en el pie. No se abrieron otras páginas de Gasway, no se alteró
cloud y no se validó el runtime nativo. Captura local ignorada:
`apps/mobile/.expo/delivery-completed-review.png`.

## Inicio del conductor

Rediseño del 2026-10-25. La disponibilidad ocupa la tarjeta principal en verde
oscuro y crema, con acento lima y una acción clara. Cuando llegan ofertas, se
compacta para dejar espacio a los pedidos. La entrega activa pasa primero con
foto del producto y «Continuar entrega»; no se repite otro panel de disponibilidad,
salvo la acción de pausarla si aún sigue activa en servidor.

La cabecera reúne saludo, actualización manual y cuenta. Distribuidora/cobertura
se consultan desde una fila compacta. Cada oferta agrupa foto real del cilindro,
marca/formato/variante y cantidad, comuna, cobro en efectivo, canje/marca a retirar,
cuenta atrás y acciones de aceptar/rechazar. Los estados vacíos son breves y
visuales. No se añaden métricas ficticias, ubicación privada antes de asignación
ni activación del GPS desde Inicio. El contador no se anuncia cada segundo.

Se conservan vencimiento, aceptación atómica, habilitación y exclusión de otra
entrega activa. Los errores siguen visibles; un estado incierto impide activarse
o aceptar. Pull-to-refresh y el icono de cabecera indican únicamente refrescos
manuales y esperan las cuatro consultas, sin responder al sondeo automático.

Referencias públicas consultadas en Screensdesign: [paneles](https://screensdesign.com/explore/screens/dashboards/),
[Proton](https://screensdesign.com/showcase/proton-vpn-fast-secure),
[AuroraMe](https://screensdesign.com/showcase/aurora-forecast-map-aurorame) y
[Spoke Route Planner](https://screensdesign.com/apps/circuit-route-planner/).
Se adaptan la jerarquía de estado/acción principal, tarjetas compactas y detalles
progresivos a los tokens de Gasway. Las pantallas internas que requieren Pro no
se consultaron. No se renderizó ni capturó Inicio: la autorización visual previa
se limitaba a «Tu entrega». Queda pendiente la revisión nativa en teléfono.

## Disponibilidad y cobertura del conductor

Rediseño del 2026-10-25 con los mismos tokens crema, verde oscuro, oliva y lima
del Inicio. La disponibilidad se presenta en una tarjeta blanca con interruptor
nativo, estado textual y progreso de guardado. La tarjeta de zona destaca el
conteo real de comunas, la distribuidora, sus marcas y la etiqueta Demo. El listado
usa filas de consulta sin chevrons ni controles de edición; el conductor hereda
esta cobertura. Búsqueda local por nombre, orden alfabético y estados diferenciados
de carga, fallo, ausencia de cobertura y ausencia de coincidencias.

Referencias consultadas: [selección de ubicaciones](https://screensdesign.com/explore/screens/location-selection/)
(HBX y Map My Run: buscador/lista limpia), [gestión de ubicaciones](https://screensdesign.com/explore/flows/managing-locations/)
(Transit: jerarquía de búsqueda y resultados), y las descripciones públicas de
[Proton](https://screensdesign.com/apps/proton-vpn-fast-secure/) y
[Norton VPN](https://screensdesign.com/apps/norton-vpn-fast-secure/)
(estado principal/control y consulta de zonas). No se accedió a pantallas Pro.
Se adapta la estructura a Gasway, sin copiar assets ni añadir mapas sin datos
geográficos autorizados. El refresco por icono y gesto es independiente del sondeo.
Se conserva aceptación/habilitación y no se activa GPS desde esta pantalla.
Sin render ni capturas de Gasway; revisión de apariencia nativa pendiente.

## Mi cuenta de conductor

Rediseño del 2026-10-25 inspirado en las galerías públicas de
[cuenta](https://screensdesign.com/explore/screens/account-settings/) y
[ajustes](https://screensdesign.com/explore/screens/settings/) de Screensdesign:
Heyyyy y Redfin orientan la agrupación de filas, Transit la identidad compacta y
Too Good To Go la separación entre opciones de cuenta y cierre de sesión. Se
consultaron las capturas públicas; no se accedió a pantallas Pro.

Identidad en verde oscuro con nombre/correo y símbolo de usuario en lima; una
fila abre la habilitación. La distribuidora muestra nombre, marcas y etiqueta
Demo sin explicaciones repetidas. Cobertura, gestión del negocio cuando existe
capacidad confirmada y compras personales se agrupan en una tarjeta de acciones.
El cierre de sesión permanece separado. No se añaden edición de perfil, métricas,
documentos ni ayuda que no tengan un flujo implementado.

Los detalles sobre habilitación y afiliación pasan a una hoja; los bloqueos y
errores siguen visibles en la pantalla principal. La habilitación no se deduce
del negocio ni de metadata. Colores exclusivamente de los tokens de Gasway;
el estado positivo no usa el verde genérico de success. Pull-to-refresh espera
workspace y acceso, sin activarse durante polling. Typecheck/lint y regresiones
dirigidas; no se renderizó ni capturó Cuenta. Revisión visual nativa pendiente.

## Cierre de hojas inferiores

Cambio transversal del 2026-10-25 en `shared/ui/bottom-sheet.tsx`: todas las hojas
de Cliente, Conductor y Distribuidor muestran una X oliva, sin el botón textual
«Cerrar». Conserva un área táctil de 48 pt y la etiqueta accesible «Cerrar ventana».
La X también está disponible en editores con cabecera propia y Guardar/Cancelar;
esas acciones del formulario conservan su función.

Arrastrar hacia abajo desde manilla o cabecera desplaza el panel con el dedo.
Un arrastre suficiente o lanzamiento descendente deliberado cierra; uno corto o
interrumpido vuelve al origen. El gesto no captura el cuerpo: scroll de listas,
formularios y mapas conserva sus interacciones. No se cambia el mapa a pantalla
completa, que no es una hoja inferior. Sin dependencias ni configuración nativa
nuevas; parámetros de gesto en `theme.bottomSheet` y animación en `theme.motion`.

X, fondo, escape accesible, botón Atrás y arrastre respetan `dismissible` y `saving`.
Un bloqueo iniciado durante el gesto cancela el cierre y restaura la posición.
Callbacks antiguos se invalidan al cerrar, reabrir, cambiar bloqueo o desmontar.
Se respeta movimiento reducido en entrada, salida y retorno. No se altera ninguna
confirmación de pedidos ni se disparan acciones Guardar/Confirmar al descartar.

`scripts/test-bottom-sheet.cjs` comprueba X/cabeceras/formularios, arrastres y
dirección, retorno, umbral por distancia/velocidad, bloqueo por cada entrada,
cambios de guardado durante la salida, reapertura, desmontaje y movimiento
reducido mediante límites nativos simulados. No acredita el tacto ni apariencia
en teléfonos. No se renderizó Gasway ni se hicieron capturas; queda probar X,
arrastre de cabecera, scroll interior y formularios guardando en iOS/Android.

Corrección posterior al reporte del operador en «Detalles del pedido»: el primer
gesto no respondía. La implementación esperaba al movimiento para reclamar el
responder. En RN 0.88 el Modal reclama inicios sin otro propietario, por lo que
la negociación posterior podía partir desde el Modal y omitir la cabecera.
La cabecera ahora reclama el inicio en bubbling (sin capturarlo antes de la X),
y captura movimientos verticales cuando el toque empezó en un control hijo.
La superficie conserva su vista nativa con `collapsable=false`.

La regresión adicional usa PanResponder y TouchHistoryMath reales del RN instalado,
transpilados con el preset ya disponible: prueba inicio, captura, movimiento desde
historial táctil y liberación. Antes solo se invocaban callbacks simulados y no
se comprobaba la adquisición del toque. Son seis pruebas locales; no equivalen
a un ensayo nativo. Tras actualizar, usar Reload completo de JavaScript para
renovar el controlador que Fast Refresh puede conservar, sin recompilar.

## Enlace de confirmación vencido o utilizado

Este resultado presenta una tarjeta de aviso con reloj y colores warning/warningLight,
texto de cuerpo neutro y CTA «Continuar con mi cuenta». El título «Revisa tu enlace»
y la etiqueta «Enlace vencido o utilizado» distinguen el estado de una confirmación
exitosa. No se comunica únicamente con texto rojo ni se presupone correo confirmado.

## Ventas del distribuidor · 2026-10-29

Resumen compacto con «Total vendido», suma de precios históricos al cliente en
entregas completadas. Solo muestra total, entregas y cilindros; costos y ganancias
quedan fuera de la interfaz de Panel y Ventas por decisión de alcance. Información
del total bajo demanda, refresco por gesto y errores explícitos.

Cada entrega presenta fecha/folio, producto/cantidad e importe en una tarjeta de
solo lectura. Se retiran el pie de costos/ganancia, el editor y las acciones de
registro. Se conserva la infraestructura de costos para una etapa futura.
Fotos por marca y peso cuando la identidad lo permite; Abastible 15 kg muestra peso,
porque el contrato de ventas no expone la variante y no permite elegir su foto exacta.

Referencias públicas consultadas: [Budget dashboards](https://screensdesign.com/articles/budget-app-dashboard-design/)
(jerarquía de cifras, período y datos faltantes) y
[SimplyWise](https://screensdesign.com/showcase/simplywise-receipts-expenses)
(acciones contextuales y detalle bajo demanda). Adaptación a tokens Gasway sin
acceder a contenido Pro. No se renderizó la app ni se tomaron capturas; revisión
visual en dispositivo pendiente.

## Habilitación del conductor · 2026-10-29

La hoja de Equipo prioriza avatar con iniciales, nombre en una línea y estado de
entrada; «Habilitación para repartir» queda como etiqueta pequeña. Los tres
requisitos comparten icono en contenedor cálido, título, valor y estado a la
derecha. La patente lleva mayor peso y Frente/Dorso se presentan en paralelo.
La atribución de revisión es secundaria; los motivos de rechazo siguen visibles.

Los estados positivos usan StatusBadge sin relleno, con texto/icono olive.
Pendiente usa reloj warning, rechazo usa aspa/error y vencimiento calendario,
superficie warning y borde discontinuo. Los detalles de acceso/disponibilidad
quedan tras información. Pull-to-refresh sustituye al botón ancho y consulta
las mismas tres fuentes, con indicador independiente del refresco automático.
No se modifican contratos, consultas ni condiciones de habilitación.

Referencias consultadas: [cuenta de ScreensDesign](https://screensdesign.com/explore/screens/account-settings/)
(identidad y filas agrupadas) y [verificación](https://screensdesign.com/explore/screens/verification/)
(contraste y estado visible), adaptadas a los tokens Gasway. Sin renderizados,
capturas ni comparaciones visuales.

### Registro de negocio por pasos (2026-10-30)

Registrar negocio organiza el mismo formulario en Negocio, Recinto, Antecedentes
y Marcas y envío. FormStepper y los controles compactos viven en shared/ui,
sin dependencias entre features ni componentes compartidos que conozcan roles.
El indicador queda en la cabecera y la acción fija se adapta al teclado.
Atrás y el botón Android retroceden un paso; desde el primero conservan la salida.
Un único useForm conserva los valores al volver; Continuar ejecuta trigger con
los campos actuales y el envío mantiene la validación completa y la confirmación
adicional de solicitudes rechazadas.

La comuna usa una hoja con búsqueda y filas nombre/CUT; conserva la consulta,
el filtro y el límite original de seis resultados. Las marcas usan tiles sin
assets; el resumen enlaza a cada sección. Las referencias privadas mantienen
el aviso de ausencia de carga documental/acreditación y revisión administrativa,
con el significado completo disponible al tocar la línea con escudo.

Referencia consultada: [verificación en ScreensDesign](https://screensdesign.com/explore/screens/verification/),
adaptando su jerarquía con icono destacado y contenido breve a los tokens Gasway.
Se reutilizan Enter/Reanimated, BottomSheet y el contenedor de pantalla existentes,
sin dependencias nuevas. No se realizaron verificaciones visuales ni comparaciones.
