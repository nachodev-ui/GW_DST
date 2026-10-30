# ADR 0039 — Revisión documental y despacho

Fecha: 2026-10-26. Estado: implementado; migración aplicada solo en Test.

La flota descriptiva y la aprobación de acceso del conductor no demostraban que
sus documentos estuvieran vigentes. Se necesita una revisión manual trazable que
bloquee nuevos repartos sin interrumpir entregas iniciadas.

Se reutilizan flota, RUT de solicitud, aprobación operativa y membresías existentes.
`documents` contiene versiones inmutables de uploads y fecha de vigencia; solo la
RPC de revisión de otro admin puede decidir o superseder. Una tabla privada de
UUID de revisores es la fuente confiable, sin añadir un rol a `profiles.role` ni
usar metadata editable. La pantalla mínima vive en `(admin)`; no adelanta un panel
web ni divide la app. Contratos/archivos genéricos en shared, negocio y admin
componen sus propias operaciones sin dependencias compartidas hacia features.

Se acepta revisión técnica o CHI vigente, con evidencia y aprobación temporal.
El próximo control por clase se registra en el dorso de la licencia actual,
con revisión de ambas caras para formatos anteriores. Cambiar clase no reutiliza
la aprobación del dorso para otra clase. La revisión no certifica legalidad.

Predicados SQL protegen disponibilidad, oferta, búsqueda y claim atómico, y un
trigger cubre asignación directa. Locks siguen conductor → negocio → vehículo →
documento para compatibilidad con la flota/aceptación existente. Las declaraciones
anteriores de disponibilidad se apagan; no hay excepciones por datos demo ni jobs.

Storage privado aplica pertenencia del dueño, UUID por versión y máximo 5 MB.
La eliminación usa tickets persistentes y Storage API, con reintento explícito y
restricciones de historial. El operador autorizó expresamente su despliegue el
2026-10-26: activa solo en Test, versión 1, con rechazo HTTP 401 sin sesión.
No se ejecutaron borrados para comprobar el despliegue. Rechazos/versiones anteriores permanecen hasta eliminar
la entidad; la política general de retención queda pendiente.

Evidencia, fuentes y activación: [revisión documental](../document-verification.md).
