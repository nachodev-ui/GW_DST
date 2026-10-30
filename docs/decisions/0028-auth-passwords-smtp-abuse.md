# 0028 — Contraseñas largas, SMTP sin costo y límites antes de apertura

Fecha: 2026-10-23. Estado: aceptado; SMTP configurado en ambos proyectos y
recepción Test verificada. Condición 2 aprobada; no habilita el piloto.

La política de longitud/composición se reemplaza por [ADR 0030](0030-accessible-password-policy.md)
por solicitud del propietario; desplegada en Test y app. Los controles de correo
y abuso de este ADR siguen vigentes. Lo siguiente conserva la decisión original.

## Decisión

Elevar a 15 caracteres el registro y el mínimo Auth de ambos proyectos, sin
composición forzada. Aplicar solo un overlay Auth acotado, previsualizado y
verificado; nunca sincronizar el config de desarrollo con el cloud completo.
Reducir cuotas de acceso/verificación y ampliar el intervalo de correo.

El propietario no tiene dominio DNS ni cuenta SMTP. Preparar Gmail SMTP con una
cuenta exclusiva preferida y contraseña de aplicación ingresada localmente para las pruebas
actuales; no comprar dominio ni plan. Preferir Resend Free cuando haya dominio
verificado para una apertura externa. Separar configuración, envío aceptado y
recepción/confirmación real como evidencias distintas.

Google impidió crear otra cuenta por reutilización del teléfono. El operador
autorizó usar su Gmail existente como remitente temporal; no se intenta evadir
la restricción y se mantiene la preferencia por separar la cuenta cuando sea posible.

La protección integrada de filtradas requiere Pro. Mantener Free con excepción
temporal a cargo de Nacho hasta 2026-10-30 o apertura externa, lo que ocurra antes.
El WARN persiste; longitud y cuotas no sustituyen la detección de filtradas.

Antes de apertura, integrar Turnstile en Auth y cuotas atómicas servidor para RPC
por identidad/negocio, preservando idempotencia y continuidad de entregas. RLS y
cuotas de Auth no son limitación de tráfico de negocio. La decisión no declara
estos controles futuros como implementados. Sin resolverlos, mantener el piloto
cerrado y no activar servicios pagos automáticamente.

## Consecuencias

Las contraseñas existentes siguen siendo válidas. El ingreso no aplica el nuevo
mínimo del registro. La credencial SMTP queda en Supabase y en memoria local durante
su configuración; no se almacena en Git, env files ni argumentos. Los tests de
cuentas siguen sin enviar correo. La prueba real requiere el buzón autorizado y
una dirección sin cuenta previa en Test.

Evidencia, responsables, comandos y fuentes: [condición 2](../auth-abuse-smtp.md).
