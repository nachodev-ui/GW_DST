# Paquete independiente de identidad Gasway

El paquete v1 del 2026-10-23 está en
[`artifacts/gasway-brand-v1/`](../artifacts/gasway-brand-v1/README.md) y se distribuye
también como [`gasway-brand-v1.zip`](../artifacts/gasway-brand-v1.zip).

Incluye wordmarks para claro/oscuro y negro/blanco, seis variantes de «g.», maestros
SVG de contornos reales, PNG, iconos, capas adaptables Android con recursos nativos,
splash, favicon SVG/ICO y una ficha de colores, lettering, proporciones y mínimos.

Los trazados son una reconstrucción geométrica manual de la lámina IA limpia,
conservada en el paquete. La fuente original no está identificada. No se presenta
como un calco exacto de una tipografía. El paquete se puede usar fuera de la app.
La ficha contiene recomendaciones iniciales de legibilidad, no una validación en
dispositivos. Las capas Android respetan el círculo seguro de 66 dp en 108 dp.

`masters/geometry.json` permite regenerar todas las variantes con las mismas formas;
`tools/build.mjs` rasteriza mediante Sharp. `manifest.json` y `SHA256SUMS.txt`
documentan el inventario y su integridad. La exportación del paquete no añadió
dependencias al workspace.

## Integración en la app

Implementada el 2026-10-23. `npm run brand:sync` desde la raíz genera
`apps/mobile/src/theme/brand.ts`, el JSON que consume `app.config.ts`, la geometría
de `shared/branding` y seis PNG en `apps/mobile/assets/identity`. El manifiesto de
esa carpeta conserva el origen y hash de cada imagen. El script no requiere Sharp
ni generación IA; copia las exportaciones ya aprobadas.

`GaswayLogo` representa los trazados con react-native-svg, ya instalado. Se usa en
acceso/registro, cabecera compartida, Page heredada, Inicio del cliente y estados de
carga/confirmación, con variante oscura cuando corresponde. Agrupa la geometría y
el punto bajo una única etiqueta accesible «Gasway», sin depender de las fuentes de
lectura ni del escalado de texto. Los tamaños y colores están en el theme. Incluye
también monograma y tratamientos monocromos para futuras composiciones.

La paleta de marca actualiza `primary`, `accent`, `progress`, `background`, `text`,
`lime` y los extremos del hero. Se conservan los fondos derivados de apoyo, las
familias tipográficas de interfaz y los estados semánticos. No cambia el color ni
la rotulación de fotografías de productos.

`app.config.ts` selecciona icono cuadrado opaco, capas adaptables de Android con
monocromo, favicon y splash claro/oscuro de expo-splash-screen **57.0.10**. El código
existente de FontProvider sigue reteniendo el splash hasta cargar las fuentes o
resolver su error. La app conserva su configuración global clara.

Los recursos se sincronizan con el proyecto Android local mediante prebuild; no
se versiona el directorio nativo generado. **Recompilar el binario** para aplicar
icono, splash y el módulo nativo nuevo: actualizar solo Metro no modifica el launcher.
Tras cambios a los maestros, ejecutar `npm run brand:sync` y repetir prebuild en las
plataformas que se compilen. iOS requiere su flujo de compilación con macOS/EAS.

La comprobación nativa verifica configuración y recursos generados, no su apariencia
en el dispositivo. Quedan para revisión en binario release: arranque frío, máscara del
launcher, iconos temáticos Android, splash y transición al contenido con fuentes listas
y con error de fuentes. El splash de Expo Go/development build no reproduce todos los
detalles del release. No se han tomado capturas ni abierto la app para esta tarea.

Decisión de implementación: [ADR 0026](decisions/0026-vector-brand-integration.md).

## Verificación de la integración

- `npm run typecheck`: correcto, una ejecución final.
- `node scripts/test-loading-screen.cjs`: correcto; conserva espera acotada,
  reintento explícito y contraste. La revisión posterior sustituye el video por
  una espera con solo logo; alcance actual en [pantallas de espera](loading-screen.md).
- Configuración Expo evaluada: seis rutas válidas, plugin splash y variantes correctas.
- Hashes contra el paquete, tamaños y transparencia de las seis PNG: correctos.
- Prebuild Android terminado: iconos normal/redondo con capas de fondo, primer plano
  y monocromo, splash claro/oscuro y esquema de Auth `gasway` comprobados en los
  recursos generados. Se conserva `local.properties` para el SDK local.
- Prebuild avisó que `userInterfaceStyle` necesita expo-system-ui, módulo ausente
  previamente; se mantiene la configuración existente, sin ampliar esta tarea al
  control del tema del sistema.

No se compiló un APK ni se renderizó la app. La validación en teléfono y en iOS
requiere sus respectivas compilaciones.

Fuentes técnicas:
[Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive),
[Expo SDK 57: iconos](https://docs.expo.dev/versions/v57.0.0/config/app/),
[Expo SDK 57: splash](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).
