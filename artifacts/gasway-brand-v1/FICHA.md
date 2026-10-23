# Gasway — ficha breve de identidad

Versión 1.0 · 23 de octubre de 2026

## Colores

| Nombre | HEX | RGB | Aplicación |
| --- | --- | --- | --- |
| Verde profundo | `#1E2417` | 30, 36, 23 | Letras sobre claro; fondos oscuros e iconos. |
| Crema | `#F3F2E8` | 243, 242, 232 | Fondo claro; letras sobre oscuro. |
| Lima | `#A8C26A` | 168, 194, 106 | Punto sobre oscuro; monograma destacado. |
| Oliva | `#4A5A2A` | 74, 90, 42 | Punto sobre claro. |
| Negro / blanco | `#000000` / `#FFFFFF` | 0 / 255 | Reproducción monocroma, incluido el punto. |

Colores RGB/sRGB. Para impresión, convertir con el perfil ICC del proveedor;
no se fijan equivalencias CMYK universales.

## Fuente y construcción

**Lettering vectorial personalizado**, reconstruido de la lámina IA limpia.
La fuente original no está identificada: no se atribuye a una familia comercial
ni se incluye un archivo de fuente. Los SVG tienen letras convertidas en contornos.
No sustituir el logo escribiendo «gasway.» con una fuente parecida.

Minúsculas geométricas de peso alto, «a» y «g» de un piso y espaciado compacto.
El mismo trazado de «a» se repite dos veces y el mismo «g» se usa en el monograma.
El punto y los huecos de «a»/«g» son círculos de diámetro 35 unidades.

## Proporciones y protección

- Wordmark visible: **588 × 123 u**, relación **4,7805:1**.
- Monograma visible: **134 × 123 u**, relación **1,0894:1**.
- Altura nominal de las minúsculas: **85 u**, con sobrepasos ópticos de hasta 2 u;
  la «g» desciende hasta 123 u y la «y» hasta 118 u.
- Punto: **Ø35 u**; centro a **69 u** desde el borde superior. No moverlo ni escalarlo aparte.
- Zona de protección mínima: **17,5 u** alrededor de la silueta (medio diámetro de punto).
- Los SVG de wordmark incluyen un lienzo de **623 × 158 u** y los de monograma,
  **169 × 158 u**. Los nombres de las PNG indican el ancho del lienzo completo.
- Escalar de forma uniforme. Mantener rellenos planos; no estirar, añadir contornos,
  sombras, degradados ni recortar los descendentes.

## Tamaños mínimos recomendados

| Uso | Pantalla | Impresión |
| --- | --- | --- |
| Wordmark, lienzo con protección | 160 px de ancho | 28 mm de ancho |
| Monograma, lienzo con protección | 24 px de ancho | 6 mm de ancho |
| Favicon específico | 16 × 16 px | No aplica |

Por debajo de 160 px de ancho, preferir el monograma. El favicon tiene una
composición propia más grande dentro del lienzo; no reducir el wordmark a 16 px.
Los mínimos son recomendaciones iniciales, pendientes de prueba en el soporte final.

## Iconos y splash

Icono principal: «g.» lima sobre verde profundo. Alternativa: «g» crema con punto
lima sobre verde profundo. Se incluyen también verde sobre lima y verde sobre crema.
Entregar un cuadrado opaco de 1024 px al sistema; los recortes de círculo y cuadrado
redondeado son recursos gráficos adicionales, no máscaras para aplicar al icono nativo.

Android adaptable: lienzo de 108 dp, caja del monograma 48 × 44,06 dp dentro de
un círculo seguro Ø66 dp; capas separadas de primer plano, fondo y monocromo.
Splash nativo: monograma transparente sobre crema o verde profundo. Wordmark
horizontal reservado para superficies que permitan su proporción.

**Alcance:** maestros vectoriales normalizados, derivados manualmente de la lámina
generada; no se afirma coincidencia geométrica exacta con una fuente original.
