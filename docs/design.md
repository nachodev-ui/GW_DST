# Gasway · Calor en casa

Referencia visual actualizada el 23 de octubre de 2026. Fuente de verdad:
`apps/mobile/src/theme/index.ts`; `legacy.ts` adapta disposición y comparte los
mismos colores. `theme/brand.ts` recibe la paleta exacta del paquete de identidad
mediante `npm run brand:sync`. Identidad cálida y local: oliva profundo, lima suave,
crema y salvia de apoyo.
Composiciones compactas, tipografía expresiva y una acción clara por momento.

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
  semántico. Ayuda del registro reducida a «Mínimo 8 caracteres», oculta cuando
  el campo ya tiene un error para evitar mensajes duplicados.
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

1. **Entrega:** calle/número, comuna oficial, notas y ubicación opcional con revisión.
2. **Tu cilindro:** marca, tamaño con foto original, variante, cantidad y canje explícito.
   El formato recibido desde Inicio se conserva cuando existe para la marca elegida.
3. **Distribuidoras:** cobertura, stock, precio de vendedor, horarios y ETA informada.
   La revisión se abre en una hoja con foto exacta, vendedor, cantidad, total CLP,
   canje y entrega. Confirmar llama a la RPC transaccional; el servidor conserva
   la autoridad sobre el precio final. Ver ADR 0018.

Validación por paso; los datos permanecen al volver. Botones bloqueados durante
creación, límites de cantidad/total conservados. Efectivo contra entrega solamente.

El aviso redundante sobre pagar al recibir se retiró de Inicio, la revisión de
compra y el detalle del pedido, junto con el componente `CashNote`.

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

## Enlace de confirmación vencido o utilizado

Este resultado presenta una tarjeta de aviso con reloj y colores warning/warningLight,
texto de cuerpo neutro y CTA «Continuar con mi cuenta». El título «Revisa tu enlace»
y la etiqueta «Enlace vencido o utilizado» distinguen el estado de una confirmación
exitosa. No se comunica únicamente con texto rojo ni se presupone correo confirmado.
