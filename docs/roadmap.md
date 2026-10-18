# Roadmap

## 0 — Scaffolding (esta entrega)

- [x] Monorepo, Expo Router vacío, TypeScript strict y herramientas.
- [x] Estructura por features y tokens de diseño propios.
- [x] Esquema inicial, PostGIS, RLS y aceptación atómica dirigida.
- [x] Documentación, ADRs y skills oficiales con procedencia.
- [x] Contrato de pagos, sin gateway implementado.
- [x] Migración inicial aplicada en cloud (informado por el usuario).
- [x] Suite SQL transaccional para SQL Editor y seed mínimo de 12 productos preparados.
- [ ] Ejecutar supabase/tests/initial_schema.sql; no ejecutada en esta tarea.
- [ ] Validar carreras reales con dos sesiones, advisors y generar tipos reales.
- [ ] Graphify opcional: evaluar runtime e instalación separada cuando haya código.

## 1 — Identidad y habilitación

Auth, persistencia segura, cierre/refresco de sesión; validación RUT módulo 11 y
catálogo oficial de comunas; alta/aprobación de repartidores y navegación por rol.
Mantener onboarding sin SMS de pago salvo nueva decisión de presupuesto.

## 2 — Pedido y oferta

Catálogo por distribuidor con precio/stock, canje explícito y pedido con precio
calculado en servidor. Motor de ofertas cercanas mediante PostGIS, vigencia y rechazo.
Escribir ofertas privadas sin exponer datos personales antes de la asignación.

## 3 — Entrega

RPC de aceptación, transiciones autorizadas restantes y liberación de disponibilidad
transaccional. Tracking con consentimiento, permisos y límites de frecuencia; Realtime
y push como mecanismos complementarios. Contra entrega como único pago del MVP.

## 4 — Piloto

Pruebas RLS, carreras, recuperación tras desconexión y errores; retención/minimización
de datos; evaluación de seguridad, costos y cuotas gratuitas. Verificar costo real de
mapas, publicación y distribución antes de activarlos. Sin beneficios estatales vencidos.

## 5 — Posterior al MVP

Panel admin web. Evaluar Mercado Pago o Webpay mediante contrato de proveedor, webhooks,
idempotencia y migración de pagos. Requiere una decisión explícita de costos/alcance.
