# 0017 — Regularización única del conductor de prueba antiguo

Estado: aceptado. Fecha: 2026-10-18.

Una sola cuenta de prueba conserva una habilitación anterior al modelo de negocios,
sin afiliación ni revisión histórica. Las invitaciones actuales rechazan conductores
operativos y el formulario no reabre solicitudes aprobadas.

Se corrige esa cuenta mediante un script exclusivo de postgres, con UUID fijo,
precondiciones e instantánea privada del estado anterior. Se conserva la identidad
y su historial, pero se deja acceso de cliente y habilitación pendiente para seguir
el flujo existente de invitación, consentimiento, antecedentes y revisión administrativa.
La invitación del negocio no se acepta automáticamente ni concede habilitación.

No se añade otro flujo permanente, RPC ni permiso público. La auditoría impide
reabrir por repetición una solicitud que ya avanzó. Afiliaciones, revisiones previas
y entregas activas impiden la corrección. Nuevos conductores siempre entran por el
negocio; el conductor no puede autoasignarse una habilitación ni cambiar de negocio.
