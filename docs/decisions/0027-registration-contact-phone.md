# ADR 0027 — Teléfono de contacto en el envío final del registro

Fecha: 2026-10-23. Estado: aceptado.

## Decisión

El registro recopila correo/contraseña y después teléfono. El primer paso solo
valida/navega; el segundo envía una única solicitud simultánea `signUp` con
`options.data.phone`. La contraseña vive en memoria y se descarta al salir del
paso de teléfono o tener éxito. No se crean cuentas al abandonar antes del envío final ni se escribe un
perfil desde un cliente sin sesión confirmada. El campo de la app muestra
bandera de Chile y `+56 9` fijos y solo acepta los ocho dígitos restantes. Al volver
se elimina la contraseña, pero se conserva correo/teléfono en memoria para
reingresar la contraseña y retomar, sin persistir datos ni perder el paso.

Un trigger privado valida/copia el contacto a `profiles.phone` dentro de la misma
transacción del alta y sigue fijando el rol `customer`. La metadata es entrada
editable, nunca fuente de autorización. El teléfono no es una identidad Auth,
no se verifica por SMS y no tiene unicidad. RLS conserva lectura/edición propia;
se concede únicamente el nuevo permiso de columna `UPDATE (phone)`.

El teléfono es obligatorio en este flujo de la app. Se permiten altas técnicas
sin la clave y perfiles anteriores con `NULL`; una clave presente debe ser una
cadena E.164 válida. Esto mantiene compatibilidad sin aceptar entradas malformadas.

## Consecuencias

Registrar antes del teléfono deja cuentas incompletas; pedirlo tras confirmar
requiere otro bloqueo de acceso. Se elige el envío final para evitar ambos pasos.
Un trigger defectuoso puede bloquear registros, por lo que se prueba en Gasway
Test antes de aplicarlo al proyecto de la app. Un envío aceptado cuya respuesta
se pierde puede repetirse manualmente: el bloqueo local impide concurrencia, no
garantiza exactamente una ejecución entre solicitudes ni cancela cuentas tras
abandonar un envío en vuelo.

Los límites de envío y de solicitudes se comunican por separado. Un 429 provoca
una pausa local de 60 segundos, preservada al volver, seguida de reintento manual;
no se interpreta su vencimiento como garantía de disponibilidad del servidor.
No se deshabilita la confirmación de correo para resolver límites del proveedor.

Contrato y evidencia en [registro con teléfono](../registration-phone.md).
