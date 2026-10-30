# ADR 0041 — Espacio admin documental en Test

Fecha: 2026-10-26. Estado: implementado y migración aplicada en Test;
Project preparado, desactivado y sin despliegue.

La cola plana no permite priorizar distribuidoras y el revisor inicia como cliente.
Se resuelve una zona UI admin consultando `is_document_admin` en Test, sin ampliar
`profiles.role`, usar correos ni aprovisionar cuentas. Layouts acotan la navegación.
Para una promoción futura, Project requiere activar explícitamente una variable
pública de interfaz; por defecto queda desactivado y la autorización sigue en SQL.

Se reutiliza `list_pending_documents` con un envelope v2 agrupado por distribuidora.
Se conservan firma, ACL y wrapper público; el cuerpo privado calcula conteos con la
misma comprobación de `private.document_admins`. No se agregan APIs ejecutables,
GRANT ni cambios RLS. El detalle sigue en `get_owner_documents` y las decisiones
en `review_document`, manteniendo la prohibición de revisión propia y los locks.

Se acepta el cambio de contrato de la cola porque su único consumidor móvil se
sustituye en esta tarea. Exige aplicar código/migración coordinadamente en Test.
El cliente detecta el backend anterior y muestra actualización pendiente. Los
resúmenes completos son suficientes para la etapa actual; no se descargan todos
los documentos para contar. Los pasos se fijan al entrar para evitar saltos.

La nueva interfaz reutiliza tema, botones, barra de navegación, hojas y visor.
No hay foto de conductor disponible: no se simula. [Alcance y límites](../admin-document-workspace.md).

Aplicación posterior autorizada en Test: transacción con marcador de aislamiento,
contrato v2 bajo revisor existente, denegaciones y ACL conservados, versión
registrada. El runner excluye Project. La migración es portable y exige que las
funciones documentales ya existan para no heredar permisos públicos por defecto.
