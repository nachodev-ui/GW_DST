# Arranque de Expo en el monorepo

La aplicación Expo vive en `apps/mobile`. La raíz `Gasway` administra npm
workspaces; su package.json no define una aplicación ni un archivo App.

## Error AppEntry y ../../App

Ejecutar `npx expo start` desde `Gasway` selecciona la raíz como proyecto. En
Expo SDK 57.0.31, al no encontrar main ni index allí, el resolver utiliza
`node_modules/expo/AppEntry.js`, que intenta importar `../../App` y falla.

La resolución comprobada con el código instalado para iOS y Android es:

| Directorio de proyecto | Entrada resuelta                  |
| ---------------------- | --------------------------------- |
| Gasway                 | node_modules/expo/AppEntry.js     |
| Gasway/apps/mobile     | node_modules/expo-router/entry.js |

## Solución

Detener el Metro iniciado desde la raíz con Ctrl+C. Desde `Gasway`, ejecutar:

```powershell
npm start -- --clear
```

El script raíz delega al workspace móvil y reenvía los argumentos. Inicia
`expo start --dev-client --clear` desde `apps/mobile`, con la configuración de
Gasway y Expo Router. Conectar el teléfono al servidor nuevo.

Si se prefiere invocar Expo directamente desde la raíz:

```powershell
npx expo start apps/mobile --dev-client --clear
```

No hace falta crear App.tsx ni cambiar el main del workspace móvil. Este error
ocurre antes de cargar las pantallas y es independiente del reemplazo del video
por el logo. La comprobación del resolver y de argumentos no requiere abrir la
app ni un emulador.
