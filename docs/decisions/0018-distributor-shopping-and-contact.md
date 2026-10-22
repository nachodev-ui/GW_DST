# ADR 0018 — Elección de vendedor y WhatsApp de consulta

Fecha: 2026-10-21. Estado: aceptada para esta implementación.

## Contexto

El catálogo del negocio ya permite precio y stock por producto. La compra todavía
usaba precio global y resolvía vendedor al aceptar. El prompt de referencia propone
un directorio web con pedidos por WhatsApp; el usuario precisó que WhatsApp debe ser
secundario, para consultar al negocio. Se conservan Expo, sesión y pedidos internos.

## Decisión

Reutilizar CUT, productos/variantes, imágenes, roles y negocio existentes. Incorporar
selección del vendedor antes de confirmar y crear por RPC transaccional nueva con
precio del negocio, clave idempotente y reserva de stock. La creación móvil global
anterior pierde EXECUTE para evitar compras que eludan stock/vendedor. Los históricos
siguen accesibles. El vendedor queda inmutable y la asignación valida su coincidencia.

Publicar contacto comercial solo por una configuración explícita del responsable;
nunca copiar teléfonos de postulación. WhatsApp abre una consulta general sin dirección.
Horario y ETA son opcionales e informados por el negocio. No se publican valoraciones
ni acreditaciones legales inventadas. La cobertura deriva de comunas de conductores
habilitados y no certifica cada dirección dentro de ellas.

No programar compras en horarios cerrados ni sin una oferta emitible: al no existir
redespacho automático, la creación revierte si no obtiene ofertas del negocio. Se
puede consultar el contacto de un negocio cerrado. Los pedidos ya ofrecidos conservan
el ciclo de vida y la aceptación atómica existentes.

## Consecuencias

El precio sin canje debe configurarse expresamente con envase incluido; un NULL impide
comprar esa modalidad. Los negocios sin catálogo/cobertura no aparecen. La marca del
envase devuelto queda registrada sin bloquear canje por marca. Reservas y cancelaciones
incrementan revision; una edición comercial desactualizada exige releer.

La idempotencia evita duplicados al reintentar el formulario montado; persistencia de
operaciones, vencimiento de reservas, redespacho y logística inversa son trabajo posterior.
La migración se verifica transaccionalmente con fixtures revertidos. No se agregan
dependencias, servicios pagos, cuentas demo ni revisión visual sin autorización.
