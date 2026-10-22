# DT-01: dependencias y soporte

Revisión: **2026-10-22**. Responsable de seguimiento de las excepciones:
**mantenedor de Gasway (mitsf)**. Este registro permite continuar el desarrollo;
no acredita seguridad del piloto ni aceptación de riesgo para producción.

## Cambios compatibles

- Expo **57.0.30 → 57.0.31**, manteniendo SDK 57 y su matriz React/React Native.
- Expo Router **57.0.28 → 57.0.29**, dentro de la misma línea de SDK.
- Expo Location **57.0.21 → 57.0.22**, requerido por la matriz de Expo 57.0.31.
- ESLint **9.39.1 → 9.39.5**, último parche de la línea 9; sigue fuera de soporte.
- El parche de Expo requiere `@expo/config-plugins ~57.0.11`, que usa
  `xcode ^4.0.0`. Xcode 4 retira `uuid`; se elimina así la cadena vulnerable
  `@expo/config-plugins → xcode 3.0.1 → uuid 7.0.3`, sin forzar overrides mayores.

Las versiones se consultaron en el registro npm en línea. No se aplicó
`npm audit fix --force`: sus propuestas de Expo 44/React Native 0.72 no respetan
el SDK instalado. Tampoco se modificaron permisos, SQL ni funcionalidades.

La auditoría inicial en línea devolvió **25 paquetes afectados** (19 altos y 6
moderados), por cuatro avisos raíz. Tras los parches quedan **22** (19 altos y 3
moderados), por tres avisos raíz: braces, node-forge y decode-uri-component.
Ya no aparecen uuid, xcode ni config-plugins en el informe. ESLint EOL se registra
aparte: la ausencia de un aviso npm no equivale a mantenimiento vigente.

## Alcanzabilidad y excepciones temporales

Los avisos transitivos se propagan a paquetes padres: el conteo de npm no representa
fallos independientes. Que npm marque una dependencia como `prod` no demuestra que
su código forme parte del runtime móvil; Expo incluye herramientas de build en su árbol.
La siguiente clasificación proviene de imports y llamadas en las versiones instaladas,
sin generar ni inspeccionar un bundle. No demuestra ausencia de otras rutas de ejecución.

| Registro   | Cadena y exposición                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Tratamiento y condición de salida                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Vencimiento    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| EX-DT01-01 | **braces 3.0.3, alta.** Metro/metro-file-map → micromatch 4.0.8 → braces. `metro-file-map/src/watchers/common.js` evalúa patrones mediante micromatch; `Watcher.js` construye globs desde extensiones/configuración. Es tooling de desarrollo/build; no se encontró uso directo en las features.                                                                                                                                                                                                                                                                                                                     | No hay versión corregida publicada. Usar únicamente configuración/extensiones y fuentes de confianza en builds; no pasar patrones aportados por usuarios a Metro/micromatch ni exponer el servidor de desarrollo a redes no confiables. Reevaluar el parche upstream y la cadena Metro al vencer; no declarar eliminado el aviso.                                                                                                                                                                                                                                                                                                                     | **2026-11-05** |
| EX-DT01-02 | **node-forge 1.4.0, alta.** @expo/cli → node-forge y @expo/code-signing-certificates → node-forge. El CLI lo importa para certificados iOS; `build/main.js` de certificados llama `certificate.verify` y `publicKey.verify`. Tooling/firma de desarrollo; no se encontró import en la app.                                                                                                                                                                                                                                                                                                                           | No hay versión corregida publicada. Limitar certificados/CSR y claves a material controlado por el proyecto; no usar esta cadena para validar firmas externas no confiables. No configurar firma OTA como parte de esta excepción. Revisar upstream antes de habilitar nuevos flujos de firma.                                                                                                                                                                                                                                                                                                                                                        | **2026-11-05** |
| EX-DT01-03 | **decode-uri-component 0.2.2, moderada.** expo-router → query-string 7.1.3 → decode-uri-component. Es dependencia de runtime, pero **no se demostró una llamada vulnerable en el flujo configurado**: `getLinkingConfig.js` → `link/linking.js` → `fork/getStateFromPath.js` → `fork/getStateFromPath-forks.js::parseQueryParams` usa `URLSearchParams`. Los forks de salida usan `queryString.stringify`, que no llama al decoder. El parser base `react-navigation/core/getStateFromPath.js` sí llama `queryString.parse(query)`, que decodifica por defecto; cambiar al parser base podría exponer URLs externas. | Existe 0.5.0 corregida, pero es ESM y cambia la exportación; query-string 7 la consume mediante `require()` y espera una función CommonJS. No imponer un override incompatible ni asumir que Router 57.0.29 retira el paquete. Mantener el parser de Expo; no importar el parser base ni introducir `query-string.parse/parseUrl/stringifyUrl` sin revisar entradas. Zod en una pantalla no protegería una decodificación anterior. Antes del piloto, verificar el recorrido de enlaces nativo/web con entradas válidas y malformadas; esta revisión estática no lo certifica. Evaluar por separado SDK 58/Router corregido o un backport compatible. | **2026-10-29** |
| EX-DT01-04 | **ESLint 9.39.5, sin soporte.** Solo desarrollo. eslint-config-expo 57.0.2 permite ESLint >=8.10, pero los plugins instalados `eslint-plugin-react 7.37.5` e `eslint-plugin-import 2.32.0` solo declaran soporte hasta ESLint 9.                                                                                                                                                                                                                                                                                                                                                                                     | Se toma el último parche 9 sin presentarlo como soporte vigente. No forzar ESLint 10 con peers incompatibles. Migrar el conjunto config/plugins cuando declaren compatibilidad y verificar lint; no contratar soporte comercial automáticamente.                                                                                                                                                                                                                                                                                                                                                                                                      | **2026-11-05** |

Todas las filas tienen el responsable indicado arriba. Al vencer, el mantenedor debe
resolver o renovar explícitamente la excepción con evidencia actual, nuevas medidas
y una fecha concreta; no se prorrogan automáticamente. EX-DT01-03 exige verificar
las rutas de navegación antes del piloto aunque su fecha no haya vencido.
Estas condiciones son restricciones de uso,
no correcciones del código vulnerable ni controles de red comprobados en este entorno.

## Seguimiento separado

Evaluar SDK 58 y su matriz completa solo en una tarea posterior: confirmar la versión
de Router que retira la cadena vulnerable y revisar enlaces válidos/malformados,
parámetros repetidos/codificados y navegación web/nativa. El salto de SDK no corrige
por sí solo braces/node-forge mientras upstream siga sin parche. El cambio de ESLint
también requiere coordinar sus plugins, no solo cambiar la versión directa.

## Reproducción y límites

Desde la raíz, consultar la red expresamente y comprobar código de salida y `error`:

```powershell
npm audit --package-lock-only --ignore-scripts --offline=false --prefer-offline=false --json
npm explain uuid
npm explain braces
npm explain node-forge
npm explain decode-uri-component
```

`npm audit` devuelve 1 mientras existan avisos. Una respuesta vacía por modo offline o
un fallo del endpoint no acredita cero vulnerabilidades. No usar `--omit=dev` como
prueba de alcanzabilidad: el CLI/Metro llegan a través de la dependencia Expo.

Las instalaciones usan scripts deshabilitados y el lockfile común de npm workspaces.
La comprobación inicial de Expo pidió alinear expo-location; se aplicó únicamente
ese parche adicional, sin ejecutar `--fix` sobre el resto de las dependencias.
La validación obtenida fue:

- Auditoría final en línea: código 1 por los 22 paquetes afectados; sin error del endpoint.
- `expo install --check` en línea: código 0, `Dependencies are up to date`.
- `npm run typecheck`: código 0.
- `npm run lint`: código 0, sin errores y con cinco advertencias en archivos no
  modificados: cuatro imports duplicados en zone-screen/catalog-screen y una por
  `watch()` de react-hook-form frente a React Compiler en catalog-screen.
- React/React DOM **19.2.3** y React Native **0.86.3**, resueltos desde apps/mobile.

La comprobación inicial offline de Expo no se tomó como resultado final. El lockfile
también recoge parches transitivos de CLI, módulos de Expo, material-symbols y postcss.
No se renderiza la app ni se certifica un build nativo. Al preparar el
próximo build se debe recompilar el development build con las dependencias resueltas.

## Fuentes

- [braces: GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- [node-forge: GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
- [decode-uri-component: GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
- [uuid: GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
- [Soporte de versiones de ESLint](https://eslint.org/version-support/).
- [Actualización de Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
- [Informe previo, conservado como fotografía anterior](review-2026-10-22.md).
