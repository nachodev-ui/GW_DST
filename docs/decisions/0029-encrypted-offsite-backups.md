# ADR 0029 — Backup lógico cifrado fuera de Supabase

Fecha: 2026-10-23. Estado: aceptado para la implementación; custodia externa de
clave pendiente. Complementa DT-07, no habilita el piloto.

## Contexto

El piloto Free necesita copias fuera del proyecto. Docker no está disponible.
Nacho aprobó Drive privado, responsabilidad unipersonal y objetivos RPO ≤24 h /
RTO ≤4 h, todavía sin demostrar. Autorizó copias cada 12 horas en este chat.

## Decisión

Usar PostgreSQL nativo para exportar esquemas/datos y roles sin contraseñas,
con cifrado age X25519 por streaming antes de cualquier persistencia. La clave
privada vive fuera de Git/Drive bajo ACL local; el operador conservará otra copia
en un almacén separado del PC. Los archivos cifrados se guardan en una carpeta
Drive sin compartir. El recibo solo acredita copia externa tras verificar envío,
permisos y SHA-256 de readback. No se usa CI para almacenar dumps ni se amplían
las credenciales de Test para copiar la app.

## Consecuencias

Backups sin Docker y sin un plan pago nuevo; renovables con el destinatario
público. La automatización local depende de disponibilidad del PC y sesiones.
Sin segunda copia de clave, la condición 4 permanece parcial. Datos/configuración
administrados no incluidos requieren recuperación separada; el archivo lógico
necesita ensayo en destino aislado y revisión del TOC/roles antes de restaurar.
No se garantiza RPO/RTO hasta demostrar proceso y restauración. Evidencia y
limitaciones en [backups](../backups.md).
