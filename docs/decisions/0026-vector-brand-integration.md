# ADR 0026 — Identidad vectorial y recursos nativos

- Fecha: 2026-10-23
- Estado: aceptado para la implementación solicitada

## Contexto

La marca aprobada se entregó como paquete independiente. La app aún dibujaba
«gasway» con fuentes de interfaz y puntos separados en cinco superficies y no
tenía configurados icono, capas adaptables, favicon ni splash de marca.

## Decisión

Usar `artifacts/gasway-brand-v1/masters/geometry.json` y sus exportaciones como
fuente de origen. `npm run brand:sync` copia únicamente seis PNG necesarias para
las plataformas y genera geometría TypeScript, tokens de marca y JSON de config.
El JSON permite evaluar app.config.ts en Node sin cargar React Native ni resolver
imports de otros módulos TypeScript.

`GaswayLogo`, en shared/ui, usa react-native-svg ya instalado, dimensiones explícitas
y la misma geometría para todos los roles. Incluye protección, letras y punto en
un único recurso accesible. Ofrece wordmark/monograma y tratamientos claro, oscuro,
negro, blanco, lima y crema. No usa fuentes de interfaz ni decide roles.

La paleta nueva alimenta los tokens de marca; los fondos de apoyo, colores semánticos
y fotografías de fabricantes conservan sus funciones. Outfit y Figtree siguen
sirviendo para títulos y lectura. La marca es lettering de contornos, sin una
fuente original identificada.

El icono utiliza lima sobre verde profundo. Android recibe primer plano transparente,
fondo verde y capa monocroma. El splash usa expo-splash-screen compatible con SDK 57,
monograma transparente y variantes crema/verde; conserva el bloqueo existente hasta
que las fuentes se carguen o fallen. El favicon usa la composición específica de 48 px.

## Consecuencias

No se necesita un transformer de SVG ni una nueva biblioteca visual. El paquete de
entrega permanece independiente; la app no importa archivos desde fuera de su raíz
durante Metro. Los cambios al maestro requieren sincronización y los recursos
nativos requieren una nueva compilación. El aspecto final del splash se debe
comprobar en un binario release, según la documentación de Expo SDK 57.
