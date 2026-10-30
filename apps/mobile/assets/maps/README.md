# Marcadores Gasway

Casa vectorial para el destino y camión de gas visto desde arriba para el reparto.
El camión es un sprite semirrealista con cabina clara, carrocería oliva y cilindros
visibles, generado usando la referencia del operador. No tiene placa ovalada ni
logotipos de fabricantes. Maestro y prompt en
`artifacts/gasway-map-markers/generation.md`. La casa conserva la paleta oficial.

`scripts/generate-tracking-markers.cjs` genera el SVG de la casa y los PNG
transparentes de ambos en densidades 1x, 2x y 3x, con lienzo lógico de 56 × 64.
El camión se exporta del maestro raster, conservando alpha y proporciones.

Se usa `shared/maps/artwork-map-marker.tsx`: `Image` normal de React Native dentro
de `Marker`, con contenedor no colapsable y tamaño explícito. No usar `Marker.image`
en este runtime: su cargador MapKit todavía consulta el bridge antiguo y puede
dejar invisibles los recursos en modo bridgeless. Android captura la imagen tras
carga/layout y dos frames antes de desactivar `tracksViewChanges`. Ante error de
imagen, se remonta solo el marcador como pin nativo de respaldo. No se remonta el
mapa ni se reajusta su cámara por cada muestra.

La casa señala su punto con el centro inferior (28, 56); el camión se centra
en la ubicación. Sus anclajes y desplazamiento de MapKit están en `theme.maps`.
La orientación del camión es ilustrativa: el contrato GPS no entrega rumbo.

Para regenerar, usar Node con `sharp` disponible. Si está instalado fuera del
proyecto, indicar su ruta con `GASWAY_SHARP_MODULE` y ejecutar desde la raíz:

```powershell
node scripts/generate-tracking-markers.cjs
```

La aplicación no requiere `sharp`, servicios de imágenes ni cambios nativos.
