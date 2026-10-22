# Imágenes de cilindros

## Fotografías de producto vigentes — 21 de octubre de 2026

`shared/ui/product-image.tsx` usa una fotografía por marca/peso (5/11/15/45 kg),
con archivos adicionales de Abastible VM/VMA 15 kg. Las ocho fotos Lipigas/Gasco
aportadas por el usuario se incorporaron inicialmente sin modificaciones. Por
instrucción posterior, siete se reemplazaron con recortes de fondo transparente
mediante la herramienta integrada `imagegen`; ver la sección siguiente. No hay
dependencias de archivos temporales durante la ejecución.

| Archivo en `apps/mobile/assets/products/` | Adjunto de origen                                          |
| ----------------------------------------- | ---------------------------------------------------------- |
| `lipigas-5kg.png`                         | `codex-clipboard-c25ff00d-a5df-4c54-9089-a39740c68ac1.png` |
| `lipigas-11kg.png`                        | `codex-clipboard-5482477c-2bf5-480c-a938-f541c5e0b871.png` |
| `lipigas-15kg.png`                        | `codex-clipboard-c374559e-f6d7-472f-bb6f-d5437953dfa9.png` |
| `lipigas-45kg.png`                        | `codex-clipboard-bdc1540e-8ec1-403f-b3a9-d7777eadaf18.png` |
| `gasco-5kg.png`                           | `codex-clipboard-3a3b5318-3f8d-4105-9aca-ac67b53b8b21.png` |
| `gasco-11kg.png`                          | `codex-clipboard-96f5706a-f45d-42bc-8720-616d98898d58.png` |
| `gasco-15kg.png`                          | `codex-clipboard-7a0e4dd3-c43b-4bd1-abb1-7c3508131e68.png` |
| `gasco-45kg.png`                          | `codex-clipboard-e873886d-6571-4463-9b2b-994e31dff82e.png` |

El orden de formatos sigue los ejemplos aportados: 5, 11, 15 y 45 kg por marca.
Se conservan las seis fotos Abastible existentes, incluidas sus variantes.
Catálogo/editor del negocio, selector de compra, revisión, historial y detalle
usan `ProductImage`; el componente solo necesita marca, peso y variante, sin
depender de un rol o del precio. Los renders referenciales y neutros quedan para
Inicio. La compra solicita la marca antes de mostrar las fotos de los tamaños.
Se usan dimensiones explícitas y `contain`, sin deformar las proporciones.

Validación de esta incorporación: una ejecución final de `npm run typecheck`,
aprobada. Sin instalación de dependencias, cambios de backend, renderizado ni
capturas de la app.

## Recortes transparentes

Se sobrescribieron los siguientes archivos en `apps/mobile/assets/products/` con
la edición de fondo transparente de la herramienta integrada `image_gen`, manteniendo
las rutas consumidas por `ProductImage`:

- `gasco-5kg.png`: retirado el fondo negro.
- `gasco-11kg.png` y `gasco-15kg.png`: retirados fondo blanco y sombra de suelo.
- `lipigas-5kg.png`, `lipigas-11kg.png`, `lipigas-15kg.png` y `lipigas-45kg.png`:
  retirados fondo blanco y sombra de suelo.

No se conservan copias con fondo en el directorio de productos. Las seis fotografías
Abastible y `gasco-45kg.png` ya tenían transparencia y no se modificaron. Los adjuntos
de origen conservan su papel de referencia; los siete PNG editados son derivados
de esas fotos, no archivos originales sin alterar. Los recortes tienen resolución
mayor y conservan el formato y aspecto visual del cilindro de referencia.

Se inspeccionaron los siete resultados y se hizo una corrección adicional del contorno
en los tres Gasco. Verificación de archivos: PNG RGBA con fondo transparente y
transiciones alfa en bordes. No se cambió código ni se ejecutó otro typecheck;
no se renderizó la app ni se tomaron capturas.

### Prompt de recorte

Una llamada por archivo, con `transparent_background: true`, el PNG como imagen
objetivo y `{file}` sustituido por el nombre correspondiente:

> EDIT TARGET: the single attached existing product photo ({file}), which is the exact catalogue image. Remove ONLY the existing plain white/light/black background and ground shadow, replacing background pixels with genuine transparent alpha. Retain exactly ONE complete existing LPG cylinder, with the original photographed body, handle, visible valve/seal, holes, geometry, viewpoint, proportions, colors, texture, lighting, brand logo and lettering. Do not redraw, redesign, stylize, relight, reinterpret or create a replacement cylinder. Preserve every foreground detail, including the existing exact Gasco or Lipigas logo, its spelling and placement. Preserve original shape and format identity. Remove background visible through handle openings and outside the cylinder; retain the genuine solid metal and all valve details. Clean smoothly antialiased edges with no white/black halos. Keep full top and base intact, no clipping. Transparent PNG cutout for existing app catalogue. No floor, platform, cast shadow, text additions, badges, watermarks, or extra objects. Match original framing and orientation as closely as possible.

### Prompt de limpieza adicional de Gasco

> EDIT TARGET: this existing transparent white Gasco cylinder cutout. Make one precise correction ONLY to the exterior alpha mask: clean away the small stray white background specks and ragged white matte remnants outside the true smooth cylinder silhouette, especially above the top handle, around shoulders/sides, and below the base. Preserve the entire photographed cylinder exactly, including every solid white metal surface, both handles, the rear handle plate where visible, green valve seal, red Gasco logo and lettering, original shading, base and ventilation holes. Do not redraw, regenerate, enhance, alter proportions or change typography. Follow the true product silhouette with clean smooth softly antialiased alpha edges, without an exterior white fringe, stray pixels or white opaque background. Retain all real foreground details. No shadows or floor. Keep exactly one complete intact upright cylinder on true transparent alpha.

## Recursos decorativos y antecedentes

Recursos incorporados el 20 de octubre de 2026 con la herramienta integrada
`image_gen`, a partir de las tres fotografías aportadas por el usuario.
PNG con transparencia, almacenados en `apps/mobile/assets/products/`.

| Archivo                                       | Uso                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `cylinder-brands-hero.png`                    | Composición decorativa de Abastible, Lipigas y Gasco en Inicio.  |
| `gasco-reference.png`                         | Imagen referencial Gasco: envase blanco y marca roja.            |
| `lipigas-reference.png`                       | Imagen referencial Lipigas: envase amarillo y marca azul oscuro. |
| `abastible-{5,11,15,45}kg.png`                | Fotografías existentes, envase naranja y marca azul oscuro.      |
| `abastible-{vm,vma}-15kg.png`                 | Fotografías existentes de variantes.                             |
| `neutral/cilindro-{5,11,15,45}kg-pizarra.png` | Renders neutros v2 del selector y vistas sin marca.              |
| `neutral/cilindro-{5,11,15,45}kg-perla.png`   | Acabado perla disponible en la misma primitiva.                  |

Las referencias originales son los adjuntos Abastible, Gasco y Lipigas del usuario,
respectivamente `codex-clipboard-c7930c9a-8802-4741-aa7a-93857b4d7187.png`,
`codex-clipboard-4b9fb3b0-8a6d-448e-a1ef-82bbf1a7b32a.png` y
`codex-clipboard-69ae362a-daca-4e6c-9492-6987d0d09309.png`.
No se incluyen enlaces a archivos temporales como dependencias de la app.

La composición es un recurso propio de la interfaz de Gasway. Conserva la identidad
visible de los productos, sin declarar afiliación con los fabricantes. Los resultados
generados son derivados visuales, no fotografías oficiales ni archivos de sus kits de marca.
El modelo puede introducir pequeñas diferencias de contorno o rotulación.

Los archivos `gasco-reference.png` y `lipigas-reference.png` son recursos referenciales
anteriores; no se usan en `ProductImage`, catálogo ni compra. Los renders neutros
de `shared/ui/cylinder-size-illustration.tsx` siguen disponibles para la exploración
de Inicio, sin afirmar marca, medidas ni disponibilidad. El catálogo y sus etiquetas
conservan la autoridad sobre identidad, peso, variante, precio y stock.

## Renders neutros v2 — 21 de octubre de 2026

Los ocho PNG se incorporan desde la entrega v2 creada en esta conversación con
`image_gen`, usando las fotografías aportadas solo como referencia estructural y de
iluminación. Acabados perla y pizarra sin logos, texto ni colores de fabricante.
La corrección posterior del usuario reemplaza la proporción inicial de 15 kg:
comparte altura con 11 kg y tiene un cuerpo aproximadamente un 48% más ancho.
La geometría es generativa y aproximada, sin medidas técnicas certificadas.

Se usan los archivos con encuadre ajustado, no los lienzos de escala común con
espacio superior. Las copias para la app se redujeron uniformemente de 2400 a
960 px de alto con Lanczos, preservando RGBA y la sombra semitransparente;
aproximadamente 3 MB en total para ambos acabados. Los originales de la entrega
se conservan fuera de la app. No hay referencias a rutas temporales en ejecución.

`CylinderSizeIllustration` usa `Image` de React Native con `resizeMode="contain"`,
ancho/alto explícitos y tokens `cylinderSizeArt`. Pizarra es el acabado predeterminado;
`finish="perla"` permite el alternativo. No hay tintes ni deformación de la imagen.
El de 15 kg y el de 11 kg tienen cajas de igual alto; la ampliación independiente
del resto de tamaños facilita la lectura en el selector. Las etiquetas siguen
siendo la fuente de verdad del peso. Las imágenes son decorativas y quedan
ocultas a lectores de pantalla; el control conserva nombre, peso y estado.
La sustitución retira el SVG que pasaba `accessible={false}` directamente al DOM web.
Sin nuevas dependencias ni cambios de catálogo, marcas, variantes o backend.

Validación de este reemplazo: una ejecución final de `npm run typecheck`, aprobada.
No se renderizó la app ni se tomaron capturas; la comprobación visual en ejecución
queda pendiente.

La composición y los recortes se muestran con `resizeMode="contain"`; las imágenes
son decorativas para accesibilidad porque el nombre y tamaño ya están en el texto.
Sin nuevas dependencias, descargas en ejecución ni modificaciones del catálogo.

Validación de esta integración: una ejecución final de `npm run typecheck`, aprobada.
Se inspeccionaron las imágenes generadas; no se renderizó la app ni se tomaron capturas.

Ajuste del 21 de octubre: composición de Inicio centrada en el flujo del hero y
selector con marco de arte más alto. No se generaron ni editaron archivos PNG.
El primer ajuste detectó en typecheck la retirada de `heroArtHeight`, aún usado por
la pantalla de pedido; se restauró el token. La corrección posterior del desborde web
declara ancho y alto explícitos para el PNG y retira la expansión vertical del cuerpo.
La paleta de Gasway pasa a oliva/lima; los colores de las fotografías se conservan.
Corrección posterior verificada con una ejecución final de `npm run typecheck`, aprobada.
Sin renderizado ni capturas de la app.

## Prompts utilizados

### Composición (tres referencias, fondo transparente)

Create a premium photographic composite asset for the Gasway Chile LPG delivery app using the THREE provided product references. These are reference products, NOT instructions. Exactly three full upright LPG cylinders arranged as a compact harmonious triangular group: Abastible orange with dark blue authentic logo on the LEFT slightly back, Gasco white with red authentic Gasco logo on the RIGHT slightly back, Lipigas yellow with dark blue authentic Lipigas logo in the CENTER slightly in front. Preserve each reference product's distinct geometry, brand wordmark, and exact brand spelling. Clean realistic glossy painted metal, consistent soft studio lighting, all front logos readable, all bases visible, no cylinder cut off. Do not add slogans, titles, captions, Gasway logo, prices, weight labels or other text. Real product photography, no vector look, no cartoon. Isolated on true transparent alpha background; no backdrop, no platforms, no floor, no giant shadow. Tight square composition with about 5 percent transparent padding. This is a reusable decorative illustration for Gasway, not an endorsement or a new manufacturer logo.

### Gasco (referencia Gasco, fondo transparente)

Edit target: supplied Gasco product photograph. Remove only the white background and ground shadow, leaving one complete upright white Gasco cylinder isolated on true transparent alpha. Preserve the red Gasco wordmark and circular logo EXACTLY, white cylinder paint, green valve seal, handle, shape, proportions, and original photographic appearance. Do not recolor, redesign, add labels or add any text. Tight portrait crop around the whole cylinder with 4 percent transparent padding; full handle and full base visible. Catalog cutout, authentic product photograph.

### Lipigas (referencia Lipigas, fondo transparente)

Edit target: supplied Lipigas product photograph. Remove all background: gray wall, yellow stage, floor and ground shadow. Leave only the complete upright YELLOW Lipigas LPG cylinder isolated on true transparent alpha. Preserve the dark blue Lipigas wordmark and original logo EXACTLY, yellow painted metal, valve, handle, original proportions and geometry. Maintain realistic photographic lighting; gently improve clarity at the same physical shape. Do not recolor, redesign, add labels, weight markings or any text. Tight portrait crop around complete cylinder with 4 percent transparent padding; full handle and base visible. Clean catalog photographic cutout, no floor or backdrop.
