# Pantallas de espera de Gasway

## Identidad y presentación

Desde el 2026-10-23 la espera normal muestra únicamente el logo vectorial de la
empresa, centrado sobre el fondo de marca. GaswayLogo consume la geometría de
artifacts/gasway-brand-v1, con tratamientos claro/oscuro y dimensiones del theme.
Se retiraron el video de Higgsfield, la ilustración de casa/cilindro, los textos
decorativos, el reproductor y la dependencia expo-video. No hay reproducción,
animación ni descargas de medios durante la carga.

El splash nativo ya usa el monograma del mismo paquete mediante
expo-splash-screen **57.0.10**. FontProvider lo oculta cuando las fuentes terminan
de cargar o fallan. La configuración global de apariencia sigue en claro.
Ver [integración de marca](brand-package.md).

## Estados y límites

LoadingScreen comparte espera, éxito, aviso, error e instrucciones. Durante la
espera normal solo se ve el logo; la revisión de sesión o acceso se comunica al
lector de pantalla mediante etiqueta, live region y estado ocupado.

A los 15 segundos aparecen el mensaje de demora y, si el flujo lo ofrece, el
botón Reintentar. El umbral es visual: no cancela solicitudes, dispara reintentos
ni modifica el resultado de Auth. Cambiar la etapa real reinicia ese umbral.

Éxito, aviso, error e instrucciones conservan título, descripción, estado e icono
semántico. Los controles del pie se conservan también durante la confirmación
pendiente, con el bloqueo que decide el flujo de Auth. No se cambian la solicitud,
deduplicación PKCE, navegación ni condiciones para continuar.

## Accesibilidad

La espera es estática con cualquier preferencia de movimiento. El aviso de demora
y los resultados mantienen anuncios accesibles y semántica de error cuando
corresponde. El contenido permite escalado de texto y desplazamiento vertical.
appearance permite seleccionar la variante clara u oscura del componente.

## Compilación y verificación

El reemplazo del contenido de carga pertenece al bundle JavaScript. Para un APK
autónomo que ya está instalado, recompilar e instalar el binario actualizado;
reiniciar Metro no actualiza el JavaScript embebido en ese APK. Los recursos de
splash/icono nativos mantienen su flujo de [sincronización de marca](brand-package.md).

La regresión offline scripts/test-loading-screen.cjs cubre espera con solo logo,
estado accesible, demora, reintento explícito, mensajes terminales, controles de
confirmación y contraste claro/oscuro, sin renderizar la app.

Verificación del 2026-10-23: regresión dirigida y `npm run typecheck` correctos.
No se compiló un APK ni se abrió o renderizó la app en esta tarea.
