# 0025 — Confirmación de correo nativa con PKCE

Fecha: 2026-10-22. Estado: aceptado.

## Decisión

El piloto es móvil y no dispone de dominio. Se usa `gasway://auth/confirm`, con
scheme ya registrado por la app y ruta pública en Expo Router. La pantalla vive
en auth; la ruta solo la exporta. Un overlay separado declara únicamente Site URL
y allowlist exacta, sin trasladar defaults locales al cloud.

Auth JS usa PKCE; el verificador se guarda con SecureStore. Expo Crypto 57.0.4
suministra aleatoriedad criptográfica y SHA-256 cuando faltan en Hermes, evitando
el fallback de generación Math.random/challenge plain. Se conservan las operaciones
WebCrypto existentes. El adaptador es acotado a las operaciones necesarias por Auth,
no una implementación general de SubtleCrypto.

La frontera de URL valida scheme, host, ruta, código único y errores. No adopta
bearer tokens desde enlaces, no sigue parámetros next y nunca muestra detalles
de errores remotos. El intercambio de un código mantiene los guards existentes;
la ruta permanece montada mientras AuthProvider carga los permisos de la sesión.

## Consecuencias

Se necesita recompilar el development build por el módulo nativo nuevo. Un scheme
custom no prueba propiedad de dominio; PKCE impide que un interceptor canjee el
código sin el verificador del dispositivo. Si se abre en otro dispositivo o ya no
existe ese verificador, se conserva el ingreso posterior con correo y contraseña.
Universal/App Links requieren dominio y quedan para una decisión de distribución.

Supabase confía adicionalmente en el origen de Site URL. Las entradas exactas no
limitan todas sus rutas: también se valida el callback en la app. Configuración
guardada y comportamiento real se verifican por separado. Un reinicio con downtime
requiere autorización específica para cada proyecto, sin restaurar ni resetear datos.

Pruebas cloud con escrituras/correo se restringen a Test. El proyecto de la app
recibe los dos ajustes y comprobaciones de redirección de solo lectura. La prueba
en teléfono sigue siendo evidencia distinta de la verificación HTTP/Auth.

Guía y evidencia: [confirmación nativa](../auth-confirmation.md).

## Estabilidad del navegador al cambiar de sesión

El Stack raíz se mantiene montado durante carga, recuperación y errores de Auth.
La ruta index compone AuthEntryScreen, que muestra esos estados y solo redirige
cuando el acceso está resuelto. Los grupos privados y el formulario de acceso
esperan !loading && !error; auth/confirm permanece público en todos los estados.
Esto evita sustituir el navegador completo por una pantalla temporal al ingresar
o resolver permisos, sin depender de leer useSegments desde el propio navegador.
La regresión offline verifica las transiciones y conserva el reintento/cierre de
sesión en error. No sustituye la comprobación del flujo en un dispositivo real.
