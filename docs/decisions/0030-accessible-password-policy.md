# 0030 — Contraseñas de 8 caracteres con mayúscula y número

Fecha: 2026-10-23. Estado: aceptado por solicitud del propietario; implementado
y desplegado en Test y app con autorización explícita. Reemplaza la política de contraseñas del
[ADR 0028](0028-auth-passwords-smtp-abuse.md).

## Decisión

Reducir la fricción de registro: mínimo 8 puntos de código Unicode, al menos una
mayúscula A-Z y un número 0-9. No exigir minúsculas ni símbolos; aceptar espacios
y pegado sin transformar la clave. Aplicar en registro y helper administrativo;
el ingreso solo exige una clave no vacía para conservar cuentas existentes.

Supabase Management API limita la composición a presets. Se aplica mínimo 8 con
`letters_digits`, que exige una letra de cualquier caja y un dígito. El preset
`lower_upper_letters_digits` añadiría una minúscula no solicitada. La mayúscula
se valida en la app/helper; llamadas directas a Auth pueden eludir ese requisito.
No se declara equivalencia entre validación cliente y garantía servidor.

## Consecuencias y despliegue

El mínimo menor acepta claves más fáciles de adivinar. Se mantienen correo
confirmado, cuotas Auth y las decisiones de abuso/filtradas existentes. No se
reemplazan contraseñas actuales ni se declara cumplimiento NIST.

El overlay y su allowlist incluyen únicamente los campos Auth declarados. Tras
el rechazo inicial de la revisión automática, el propietario autorizó explícitamente
aplicar en Test `xnrueexpwzvxotgwmamj` y app `gleltbrvpfvfgggcatpt`. Se desplegó
secuencialmente en ambos: solo cambiaron longitud (15 → 8) y composición (vacía →
letras y dígitos). El diff posterior de campos declarados quedó vacío en ambos;
no se sincronizó el config de desarrollo ni se cambiaron cuentas existentes.

El registro muestra tres requisitos junto al campo, calculados desde su valor
actual y las mismas reglas que usa zod. Cada fila comienza con una cruz en color
de error y cambia a check verde al cumplir; vuelve a cruz si se borra el requisito.
Solo aparece en registro, usa los tokens e iconos existentes y anuncia cumplido o
pendiente sin incluir la contraseña en etiquetas de accesibilidad. La contraseña
no se persiste para esta ayuda.

Validación local: `node scripts/test-auth.cjs`,
`pwsh -NoProfile -File scripts/test-reset-auth-password.ps1` (24 escenarios)
y `npm run typecheck` aprobados. Se cubren claves válidas de 8 sin minúsculas ni
símbolos, falta de mayúscula/número, longitud Unicode y compatibilidad del ingreso.
Sin render, emulador, envío de correos ni cambios de cuentas cloud. El cambio
visual requiere comprobación manual en dispositivo; la lectura cloud demuestra
configuración, no una prueba de registro nueva.

[Presets de Supabase Management API](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
