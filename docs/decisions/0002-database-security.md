# ADR 0002 — Asignación y autorización en Postgres

Fecha: 2026-10-17. Estado: aceptado.

Decisión: RLS y grants mínimos desde la migración inicial. Aceptación por una función
SQL atómica, implementación privilegiada fuera de los esquemas API y wrapper público
sin privilegios adicionales. Rol y aprobación solo los cambia el backend confiable.

Motivo: ofertas concurrentes no pueden asignarse con lecturas/escrituras separadas
del cliente. Tener una sesión no autoriza leer todos los pedidos ni sus coordenadas.

Consecuencia: se agrega private.order_offers como soporte interno mínimo para ofertas
dirigidas y vigentes. El primer UPDATE elegible gana. Bloqueo del driver e índice
único parcial impiden dos entregas activas. Eventos se registran por trigger.
Las demás operaciones de negocio esperan futuros endpoints; no se abren políticas
permisivas para simularlas. Los perfiles se crean con rol customer sin metadata.

Pendiente: validación SQL/RLS/concurrencia en instancia local y alta controlada de drivers.
