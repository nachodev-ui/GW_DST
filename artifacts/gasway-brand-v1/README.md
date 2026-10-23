# Gasway — paquete de identidad v1

Paquete independiente, 2026-10-23. Abrir `ficha.html` para ver la ficha breve.
Los archivos no necesitan la aplicación Gasway ni una fuente instalada.

La lámina IA limpia está en `reference/ai-clean-board.png`. Los maestros son una
reconstrucción geométrica manual de ese diseño: conservan su dirección visual,
con curvas y rectas limpias, dos letras «a» idénticas y el mismo «g» en wordmark y
monograma. No son un calco exacto ni permiten identificar una fuente original.
Los colores planos del paquete son los HEX solicitados; no se hereda la textura IA.

## Elegir un archivo

| Carpeta / archivo | Contenido y uso |
| --- | --- |
| `masters/wordmark/` | SVG sobre fondo transparente: `on-light` para fondos claros, `on-dark` para oscuros, `black` y `white`. |
| `masters/monogram/` | Los mismos cuatro tratamientos más `lime` y `cream` de un solo color. |
| `masters/icon/` | Icono cuadrado sin esquinas recortadas para el sistema; recortes circulares y cuadrados redondeados para uso gráfico. |
| `masters/android/` | Capas adaptables independientes: primer plano transparente, fondo opaco y monocromo. |
| `masters/splash/` | Monograma cuadrado para splash nativo; wordmark horizontal para splash personalizado/web. |
| `masters/favicon/` | Cuatro tratamientos de favicon. |
| `png/` | Exportaciones PNG que corresponden a los SVG, nombradas por ancho en píxeles. |
| `favicon.svg`, `favicon.ico` | Selección principal lima sobre verde; ICO multirresolución 16/32/48. |
| `android/res/` | VectorDrawable, capas adaptables API 26/33 y launchers anteriores por densidad. |
| `masters/reference/vector-board.svg` | Lámina de control hecha con los trazados reales. |
| `FICHA.md`, `ficha.html` | Colores, lettering, proporciones y mínimos recomendados. |
| `manifest.json`, `SHA256SUMS.txt` | Inventario, dimensiones y huellas de los archivos. |

`on-light` describe el fondo de destino: las letras son verdes. `on-dark` usa
letras crema y punto lima. Los SVG y PNG de wordmark/monograma tienen transparencia;
el blanco puede quedar invisible sobre un visor blanco. Todos los SVG contienen
trazados/círculos reales, sin imágenes incrustadas, fuentes, filtros ni enlaces externos.

## Tamaños exportados

- Wordmark: 320, 640, 1280 y 2560 px de ancho, incluida su zona de protección.
- Monograma: 24, 48, 96, 256, 512 y 1024 px de ancho, incluida su zona de protección.
- Icono: 192, 512 y 1024 px cuadrados. Recortes gráficos: 256 y 512 px.
- Android adaptable: capas cuadradas 432 y 1024 px; maestro de 108 × 108 unidades.
- Splash monograma: 1024 y 2048 px cuadrados y transparentes.
- Splash wordmark: 768 × 256, 1536 × 512 y 3072 × 1024 px transparentes.
- Favicon: 16, 32, 48, 64, 128, 180, 192 y 512 px cuadrados. El de 180 sirve
  como `apple-touch-icon`; el de 192/512 puede usarse en un manifiesto web.

## Selección principal

- Icono: `png/icon/app-icon-lime-on-dark-1024.png` (opaco y sin redondeo previo).
- Android: `png/android/adaptive-foreground-lime-1024.png`, fondo `#1E2417`
  y `png/android/adaptive-foreground-monochrome-1024.png`.
- Splash claro: `png/splash/splash-monogram-light-1024.png`, fondo `#F3F2E8`.
- Splash oscuro: `png/splash/splash-monogram-dark-1024.png`, fondo `#1E2417`.
- Web: `favicon.svg`, respaldo `favicon.ico` y PNG de 32 px.

## Android y splash

Las capas adaptables tienen un lienzo de **108 × 108 dp**. El monograma ocupa
**48 × 44,06 dp**, centrado; su caja completa tiene diagonal de 65,16 dp y cabe
dentro del círculo seguro de 66 dp. No aplicar una máscara circular al primer
plano. La capa monocroma utiliza una silueta negra sobre transparencia, incluidos
sus huecos, para que Android pueda teñirla. Las PNG de 432 son las capas a 4×.

`android/res/` es una alternativa nativa lista para copiar al directorio `res` de
un proyecto Android: referenciar `@mipmap/gasway_launcher` en el manifiesto; las
referencias de los XML usan solo los recursos incluidos. No copiar además capas
PNG con los mismos nombres si se usan los VectorDrawable suministrados.

Para Expo, copiar las PNG elegidas al proyecto y referenciarlas mediante `icon`,
`android.adaptiveIcon.foregroundImage`, `backgroundColor`, `monochromeImage` y
`web.favicon`. Configurar splash con el plugin `expo-splash-screen`: PNG de
monograma, `imageWidth: 240`, `resizeMode: "contain"` y los fondos anteriores,
con su variante `dark`. El monograma ocupa el 43,75 % del ancho de su PNG; con
`imageWidth: 240` el ancho visible es aproximadamente 105 unidades lógicas antes
de los ajustes del sistema. Estos valores son una propuesta de integración.

Android 12+ utiliza el splash del sistema y puede enmascarar el icono: usar allí el
**monograma**; el wordmark horizontal se entrega para superficies que lo admitan.
Los splash son marcas transparentes, no capturas estirables de pantalla completa.
El cambio de recursos nativos requiere reconstruir la app. No se ha integrado
este paquete ni probado en dispositivos o launchers.

Fuentes técnicas consultadas el 2026-10-23:
[Android: adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive),
[Expo SDK 57: configuración](https://docs.expo.dev/versions/v57.0.0/config/app/),
[Expo SDK 57: SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).

## Editar o regenerar

Abrir cualquier SVG maestro en una aplicación vectorial. `masters/geometry.json`
es la fuente común de curvas, ubicación de letras, punto y paleta para todas las
exportaciones; editarla mantiene sincronizados el wordmark y el monograma.

Para regenerar, con Node y npm disponibles:

```sh
cd tools
npm install
npm run build
```

Esto utiliza Sharp 0.35.5 para rasterizar los SVG; no llama a IA ni a servicios de
generación. Las imágenes PNG se exportan desde el maestro vectorial a su tamaño
final, sin ampliar recortes de la lámina. La lámina IA se conserva solo como
referencia. El script regenera el inventario y las huellas al terminar.

Los tamaños mínimos de la ficha son recomendaciones iniciales de diseño; no
representan una prueba de legibilidad en todas las pantallas o métodos de impresión.
