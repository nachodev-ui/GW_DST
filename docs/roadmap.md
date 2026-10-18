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

- [x] Registro e ingreso email/contraseña, cierre local y persistencia segura nativa.
- [x] Formularios es-CL con react-hook-form/zod y navegación protegida por rol/aprobación.
- [x] Migración nueva: customer por defecto y RPC idempotente de solicitud pendiente.
- [x] Pruebas locales de reglas/almacenamiento y suite SQL preparada.
- [x] Typecheck limpio tras corregir AppState y alinear SDK 57; una ejecución antes del commit.
- [ ] Aplicar 20261018020000_auth_roles.sql en cloud y ejecutar auth_roles.sql.
- [ ] Validar confirmación por correo, reinicio, refresco, cierre, enlaces directos,
      errores de red y aprobación/revocación con dispositivo y cuentas reales.
- [ ] Proveer operación administrativa confiable de aprobación transaccional y auditoría.
- [ ] Recuperación de contraseña y enlaces de confirmación integrados, si se requieren.
- [ ] Validación RUT módulo 11 y catálogo oficial de comunas en onboarding posterior.
- [ ] Generar tipos reales tras aplicar migración; mantener onboarding sin SMS de pago.

## 2 — Pedido y oferta

- [x] Flujo cliente: marca/peso, cantidad, canje explícito, dirección/comuna y notas.
- [x] Mis pedidos, detalle y cancelación antes de on_the_way; efectivo contra entrega.
- [x] Migración posterior con precio products calculado en servidor, eventos atómicos,
      coordenadas opcionales, catálogo CUT y RPC con mínimos privilegios.
- [x] Pruebas SQL autocontenidas preparadas y decisión en ADR 0006.
- [x] Assertions locales de formulario/contratos y único typecheck aprobados; lint
      de archivos modificados aprobado. Lint global: dos errores preexistentes en
      metro.config.cjs y auth-provider.tsx pendientes de otra tarea.
- [x] Usuario informó aplicación manual de 20261018030000_customer_orders.sql y ejecución de customer_orders.sql.
- [x] Usuario configuró precio en products.unit_price_clp y confirmó creación correcta de un pedido.
- [ ] Completar los precios comerciales del resto del catálogo según corresponda; NULL bloquea compra.
- [ ] Generar tipos reales, ejecutar advisors y validar flujo en dispositivo físico.
- [ ] Revisar catálogo CUT contra cambios oficiales posteriores y validar FK de históricos.
- [ ] Idempotencia de creación ante reintentos manuales/respuestas de red perdidas.
- [ ] Catálogo por distribuidor con precios, stock y tarifas por canje si corresponden.
- [ ] Motor de ofertas cercanas con PostGIS, vigencia y rechazo, sin exponer PII.
- [ ] Pruebas con dos conexiones para cancelación concurrente con avance de estado.

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
