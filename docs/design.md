# Sistema visual del cliente

Fuente de verdad: `apps/mobile/src/theme/index.ts`. Figtree 400–700 y componentes
propios en `src/shared/ui`, sin dependencias hacia features ni conocimiento de roles.

| Token                   | Valor             | Uso                                            |
| ----------------------- | ----------------- | ---------------------------------------------- |
| Fondo                   | #FAF9F6           | Blanco cálido de pantallas y barras            |
| Superficie / secundaria | #FFFFFF / #F0EDE8 | Campos y tarjetas                              |
| Primario / claro        | #C62D42 / #FCECEF | Rojo frambuesa para acciones, foco y selección |
| Acento / claro          | #A63B24 / #FFF0EB | Acentos secundarios y estados                  |
| Texto / suave           | #24242B / #62616A | Carbón para lectura y ayudas                   |
| Éxito / error           | #146B45 / #B42318 | Estados con ícono y texto                      |
| Borde / divisor         | #85828A / #DEDAD5 | Campos y separadores decorativos               |

- Dirección de acceso y registro rehecha directamente desde el código, sin usar
  skills de diseño: blanco cálido, carbón y rojo frambuesa. El encabezado contiene
  el nombre Gasway y un punto rojo; el formulario protagoniza la pantalla, sin
  bloque de color promocional ni ilustraciones. Figtree se conserva.
- Los tokens centrales reemplazan la combinación azul/mandarina anterior. Las
  pantallas que importan `@/theme` heredan los colores; el cambio de composición
  sigue limitado a acceso y registro. `theme/legacy.ts` conserva las otras vistas.
- `features/auth/access-ui.tsx` presenta el título de 40/48, descripción breve,
  campos y una acción principal con radio 14. El ancho máximo del acceso es 440;
  el resto de pantallas conserva 560. El cambio entre registro e ingreso está
  al pie, con texto contextual y botón de texto, separado por una línea discreta.
- Input, Button y Text siguen siendo compartidos. Button admite un estilo opcional
  para adaptar la forma del acceso. Los controles mantienen mínimo 56 de alto,
  autocompletado, pegado de contraseñas y escalado de texto. Bordes de campo de 2
  mantienen las dimensiones al enfocar; los errores conservan prioridad visual.
- El contenido se desplaza dentro del área segura y se ajusta al teclado; el pie
  permanece en el flujo y cede espacio cuando aumenta el texto o aparece el teclado.
  Envío, validación y cambio de modo conservan la lógica existente.
- Contraste calculado sobre sRGB: blanco/rojo 5.45:1 y 4.71:1 durante pulsación;
  texto/fondo 14.64:1; texto secundario/fondo 5.80:1; error/superficie 6.57:1;
  borde/superficie 3.78:1 y foco/fondo del campo 4.77:1. Son verificaciones de
  pares de tokens, no una certificación de accesibilidad de la aplicación.
- Display 34 bold; título 28, subtítulo 20, cuerpo 17, etiqueta 16 y nota 15.
  Lectura y títulos respetan el escalado del sistema sin tope. Solo botones,
  insignias y barras usan máximo 1.3. Figtree mantiene carga local y respaldo del sistema.
- Tarjetas sin borde ni sombra, radio 20; botones en píldora con mínimo 56 de alto.
  Zonas táctiles de al menos 48, espacios 4/8/12/16/20/24/32/48 y ancho máximo 560.
  Alturas de texto y controles crecen con el contenido.
- `Avatar`: iniciales y color determinista de la paleta, sin fotos. El nombre se
  toma de la sesión existente solo para presentación; sin nombre se usa la parte
  del correo anterior a @. Nunca se utiliza metadata para autorizar acceso.
- `CylinderIllustration`: SVG original dibujado en código, cuatro siluetas para
  5/11/15/45 kg en el primario y llama de acento oscuro. Sin imágenes descargadas ni assets
  de Uber, Lipigas, Gasco o Abastible. Se agregó react-native-svg con expo install.
- `ListRow`: círculo a la izquierda, título, segunda línea, contenido de estado
  opcional y flecha en filas interactivas; separadores finos. `BottomSheet` usa
  Modal, cierre explícito/atrás y lista virtualizada con buscador; conserva el
  foco modal de React Native Web. No requiere gestos para elegir o cerrar.
- Inicio saluda y enlaza el avatar con Cuenta. Destaca el pedido activo encontrado
  en las páginas ya cargadas y resume su progreso. «Pedir gas» ocupa una tarjeta
  horizontal blanca con padding 16, cilindro pequeño de 48 sobre primario claro,
  título 20, ayuda 15 y flecha blanca sobre rojo frambuesa en un círculo de 48.
  La tarjeta completa abre Nuevo pedido, sin botón interior ni altura fija;
  debajo se conserva la nota de efectivo. Usa Figtree y los tokens existentes.
  El historial «Tus pedidos», su vacío y la paginación se muestran exclusivamente
  en Pedidos, con filas de marca, producto, cantidad, total y StatusBadge.
- Barra inferior Inicio/Pedidos/Cuenta, compuesta en el layout protegido del cliente.
  Inicio conserva `/customer`; se agrega `/customer/orders` para la lista.
  `/orders/new` y `/orders/[id]` se conservan y se abren sin barra de pestañas.
- Nuevo pedido: selección abierta sobre fondo cálido; logos en tarjetas blancas
  de igual ancho sin repetir el nombre debajo, con etiqueta accesible por marca.
  Tamaños en dos columnas con cilindros pequeños de 48, peso 20 y precio 15;
  borde rojo, fondo claro y check identifican la selección. Los no disponibles
  usan fondo neutro y texto explícito, sin reducir la opacidad de lectura.
  Cantidad y canje explícito comparten un panel blanco; entrega ocupa otro con
  dirección, comuna del catálogo en BottomSheet y notas opcionales. Se conservan
  Stepper, controles, errores y validaciones. Sin resumen duplicado al final:
  cantidad × tamaño y total acompañan «Confirmar pedido» en el pie fuera del
  scroll, dentro del área segura y del ajuste por teclado. Pago en efectivo
  indicado bajo los datos de entrega. Todo usa los tokens y Figtree existentes.
- Detalle usa titular por estado, línea de tiempo con íconos y eventos existentes,
  resumen con logo horizontal y entrega. El contrato actual no expone el nombre del repartidor:
  se omite su fila sin agregar consultas, datos ni permisos.
- Cuenta muestra avatar grande, nombre y correo existentes, opciones de pedidos,
  solicitud destacada para repartir y cierre de sesión discreto al final.
- Cargas con esqueletos, sin spinners en estas pantallas. Botones, filas y tarjetas
  interactivas responden con escala 0.98 mediante Reanimated ya instalado;
  movimiento reducido desactiva la escala y conserva feedback por opacidad.
  Los estados incluyen ícono y texto además del color.
- Se conservan validaciones, precios, mutaciones, consultas, Realtime y guards.
  `theme/legacy.ts` conserva la presentación previa de las vistas que aún lo usan. El botón flotante
  de Expo Go y la configuración de web de pruebas permanecen intactos.

Validación de acceso y registro: contrastes calculados por script, TypeScript y ESLint de los cuatro archivos de código modificados aprobados. La revisión visual en dispositivo queda pendiente. Sin iniciar Expo, emulador, capturas,
renders ni verificaciones visuales; ejecución web/dispositivo, lector de pantalla,
teclado y escalado real pendientes de prueba manual.

## Logos de marcas de productos

El espacio del conductor se alineó con el sistema actual: fondo #FAF9F6, superficies
blancas, acciones frambuesa #C62D42, texto carbón #24242B y Figtree. Se reutilizan
Screen/Text/Button/Card/StatusBadge, iconos propios y tokens centrales. Ofertas prioriza
negocio, estado de jornada y entrega actual; Cobertura separa selección y guardado;
Cuenta distingue afiliación de permisos de gestión. Barra propia de tres destinos:
Ofertas/Cobertura/Cuenta. El detalle de entrega tiene confirmación en el flujo, sin
diálogos distintos para web/nativo. No se añadieron logos oficiales al conductor,
mapas ficticios ni métricas de jornada inventadas. Solo revisión de código y pruebas
sin render; dispositivos, tamaños de texto y teclado siguen pendientes de prueba visual.

- `BrandLogo` en `src/shared/ui/brand-logo.tsx` recibe `brand` (`lipigas`, `gasco`,
  `abastible`), `variant` (`mark`, `horizontal`, `stacked`) y `size` (alto de imagen).
  Usa nueve `require` estáticos de los PNG locales en `assets/brands`, compatibles
  con la web de pruebas, sin descargar, procesar ni editar los archivos.
- Conserva proporciones con `resizeMode="contain"`, nombre en `accessibilityLabel`
  y espacio libre por cada lado de un cuarto del alto. Solo se permiten superficies
  blancas o el fondo #FAF9F6; el componente incorpora su propia superficie blanca.
  Nunca colocar logos sobre el primario ni sobre otros fondos oscuros.
- Uso limitado a identificar el producto del cliente: tarjetas de marca de igual
  ancho con `stacked` sin nombre duplicado debajo en Nuevo pedido; selección con borde e
  indicador en primario, manteniendo el fondo blanco. Los tamaños conservan la
  ilustración de cilindro. Mis pedidos usa `mark` de 32 dentro de un círculo blanco
  de 48 junto al producto, estado y total. Detalle y resumen usan `horizontal` de
  28 de alto junto al producto y tamaño. Si falta el producto no se inventa una marca.
- No usar en ícono de app, arranque, inicio de sesión, encabezado de Gasway,
  zona del repartidor ni pantallas o material que sugieran alianza o respaldo.
  No recolorear, deformar ni integrar estos logos en la identidad de Gasway.
- Mi cuenta termina con el aviso: «Lipigas, Gasco y Abastible son marcas de sus
  respectivos dueños. Gasway es independiente y no está afiliada a ellas.»
- Los PNG actuales deben reemplazarse por los logos oficiales en SVG cuando se
  consigan, respetando sus guías oficiales de uso y espacio libre.
