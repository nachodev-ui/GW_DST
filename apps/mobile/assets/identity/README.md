# Identidad Gasway en la app

Recursos sincronizados desde `artifacts/gasway-brand-v1` mediante
`npm run brand:sync` desde la raíz. No editar las PNG ni los módulos generados
manualmente: cambiar el maestro del paquete y volver a sincronizar.

- `icon.png`: cuadrado opaco de 1024 px, monograma lima sobre verde profundo.
- `adaptive-foreground.png`: primer plano transparente de 1024 px para Android.
- `adaptive-monochrome.png`: silueta negra transparente para iconos temáticos.
- `splash-light.png`, `splash-dark.png`: monogramas transparentes de 1024 px.
- `favicon.png`: composición dedicada de 48 px para el navegador.
- `brand.json`: paleta y selección de recursos para la configuración Expo.
- `manifest.json`: correspondencia con el paquete y hashes SHA-256 de las PNG.

La marca en pantalla usa los trazados de
`src/shared/branding/gasway-geometry.ts` y `GaswayLogo`, no estas imágenes PNG ni
una tipografía instalada. El monograma y el wordmark comparten el trazado de «g».
Los colores y tamaños están en el módulo generado `src/theme/brand.ts`.

El lettering es una reconstrucción geométrica de la lámina IA limpia; la fuente
original no está identificada. Los archivos no incorporan una fuente comercial.
