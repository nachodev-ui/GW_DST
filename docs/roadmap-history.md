# Checklist histórico anterior a la revisión

Conservado el 2026-10-22. Sus estados y pasos pertenecen a entregas anteriores;
no son una certificación del esquema actual ni un plan de ejecución de pruebas.
El plan priorizado vigente está en [ROADMAP.md](ROADMAP.md).

---

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
- [x] Migración 20261018020000_auth_roles.sql aplicada en cloud, confirmado por el usuario.
- [ ] Ejecutar auth_roles.sql; aplicación de la migración no confirma ejecución de la suite.
- [ ] Validar confirmación por correo, reinicio, refresco, cierre, enlaces directos,
      errores de red y aprobación/revocación con dispositivo y cuentas reales.
- [x] Script de aprobación transaccional de cuenta de prueba, solo SQL Editor (supabase/admin).
- [ ] Operación administrativa de producción con auditoría.
- [x] Preparada primera fase de organizaciones, responsables y afiliación única de conductor.
- [x] Preparada revisión SQL privilegiada de solicitudes con motivo, auditoría y RLS; ADR 0009.
- [x] Aplicada 20261018195303_distributors_driver_review.sql como postgres en Gasway cloud;
      suite completa aprobada y fixtures revertidos, verificado por conteos.
- [x] Conciliado historial de migraciones manuales 20261018020000 a 20261018050000
      tras comparar funciones/esquema, sin repetirlas; advisors de seguridad revisados.
- [x] Listada y rechazada la solicitud pendiente por instrucción explícita del usuario;
      verificados motivo y auditoría. Estado histórico previo al negocio demo autorizado.
- [x] Mostrar estado/motivo/fecha en Mi cuenta y conservar compras para pendientes/rechazados;
      consulta propia con zod y errores locales, ADR 0010.
- [x] Nueva postulación explícita tras rechazo, sin habilitación ni entrega activa;
      revisión anterior conservada en auditoría y RPC idempotente aplicada en cloud.
- [x] Pruebas locales, typecheck y lint acotado; suite SQL de nueva postulación aprobada.
- [ ] Validar respuesta al postulante, caché al cambiar de usuario y nueva solicitud en dispositivo.
- [ ] Vincular conductores existentes a negocios revisados antes del piloto.
- [x] Backend de confirmación del negocio por versión exacta de postulación y aprobación
      administrativa posterior; RLS, actor y auditoría; ADR 0013.
- [x] Equipo del negocio con invitaciones individuales/lote y aceptación personal; postulación abierta retirada.
- [x] Importación CSV con errores por fila, vista previa, duplicados, búsqueda y paginación de 20 personas.
- [x] Correo confirmado de Auth, expiración/cancelación, idempotencia y auditoría de invitación/aceptación.
- [x] Estados de invitación y habilitación separados; rechazo exige nueva invitación y conserva decisiones previas.
- [ ] Validar en dispositivo invitaciones, CSV/picker, aceptación, revocación de permisos y cambio de usuario.
- [ ] Suspensión segura y panel administrativo web.
- [ ] Registrar y revisar evidencias vigentes de licencia, vehículo/inscripción y capacitación antes del piloto.
- [ ] Recuperación de contraseña y enlaces de confirmación integrados, si se requieren.
- [x] Formulario con nombre, RUT módulo 11 y contacto; negocio fijado desde invitación aceptada.
      El directorio anterior de ADR 0012 se retiró en ADR 0015.
- [x] Validación SQL y copias privadas de antecedentes por revisión; migración y tres suites aprobadas.
- [x] Alta del distribuidor en la app, revisión SQL privilegiada/auditada y workspace por membresía.
- [x] Negocio ficticio autorizado con responsable indicado, datos de prueba y catálogo propio configurable.
- [ ] Contrastar antecedentes vigentes y habilitar negocio real antes del piloto; validación en dispositivo pendiente.
- [ ] Catálogo oficial de comunas en onboarding posterior, si se requiere antes de disponibilidad.
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
- [x] Marcas configuradas por negocio, despacho/aceptación filtrados y vendedor inmutable al asignar.
- [x] Preparación del catálogo por distribuidor: precios/stock/inclusión por producto, CAS y auditoría.
- [x] Conectar catálogo por distribuidor a compra, reservas y vendedor identificado antes de comprar; ADR 0018.
- [x] WhatsApp secundario de consulta, contacto comercial opt-in, horarios/ETA y precio sin canje con envase incluido.
- [ ] Desglosar suministro/garantía del envase según el contrato comercial; sin recargo por cambiar de marca.
- [ ] Registrar marca/peso/tipo/condición del envase devuelto y su logística inversa.
- [x] Despacho por comuna, ofertas de 60 s, listado mínimo, aceptación atómica y rechazo.
- [x] Disponibilidad del conductor y cobertura CUT del negocio; pantalla de ofertas y pedido asignado en features/driver.
- [x] Suite SQL autocontenida preparada, script admin de prueba y ADR 0007.
- [x] Assertions locales de contratos/privacidad y polling, lint acotado y único typecheck aprobados.
- [x] Confirmada 20261018040000_driver_offers.sql en cloud y conciliado su historial.
- [ ] Ejecutar driver_offers.sql en SQL Editor; no ejecutada en esta operación.
- [ ] Validar carreras con dos sesiones, recuperación tras fallo de red y flujo en dispositivo físico.
- [ ] Recuperación de pedidos sin candidatos, redispatch/renovación y matching geográfico si se solicita.
- [ ] Pruebas con dos conexiones para cancelación concurrente con avance de estado.

## 3 — Entrega

- [x] RPC de progreso accepted → on_the_way → delivered exclusiva del repartidor asignado.
- [x] Acción por estado, confirmación de entrega, feedback y salida de pedidos activos.
- [x] Realtime de pedidos propios del cliente; invalidación de lista/detalle/eventos,
      respaldo de 15 s solo en primer plano, refetch al volver y limpieza del canal.
- [x] Línea de tiempo con eventos reales, zod, theme y textos es-CL; ADR 0008.
- [x] Suite SQL autocontenida con rollback y assertions locales sin red preparadas.
- [x] Assertions locales de progreso/ofertas/pedidos, lint acotado y único typecheck aprobados.
- [x] Confirmada 20261018050000_driver_order_progress.sql en cloud y conciliado su historial.
- [ ] Ejecutar supabase/tests/driver_order_progress.sql en SQL Editor; no ejecutada en esta operación.
- [ ] Validar Realtime/reconexión, segundo plano, cambio de usuario y confirmación en dispositivo.
- [ ] Validar avance concurrente, entrega repetida y cancelación concurrente con dos conexiones.
- [ ] Automatización de disponibilidad, solo si se solicita; hoy se reactiva manualmente.
- [ ] Tracking con consentimiento/permisos y push en tareas separadas.

Contra entrega continúa como único pago del MVP.

## 4 — Piloto

- [x] Espacio del conductor con diseño actual, Ofertas/Cobertura/Cuenta y afiliación visible.
- [x] Verificación completa desde invitación hasta entrega, con razones operativas y RLS.
- [x] Disponibilidad separada de la cobertura heredada del negocio, ofertas vencidas, lectura fallida
      de asignación y confirmación de entrega contempladas en UI/servidor.
- [x] Compra del conductor como cliente sin alterar rol; Realtime con foco y sesión.
- [ ] Comprobar visualmente las pantallas del conductor en dispositivo, incluyendo
      letra grande, teclado, reanudación y la transición de aprobación/suspensión.

Pruebas RLS, carreras, recuperación tras desconexión y errores; retención/minimización
de datos; evaluación de seguridad, costos y cuotas gratuitas. Verificar costo real de
mapas, publicación y distribución antes de activarlos. Sin beneficios estatales vencidos.

## 5 — Posterior al MVP

Panel admin web. Evaluar Mercado Pago o Webpay mediante contrato de proveedor, webhooks,
idempotencia y migración de pagos. Requiere una decisión explícita de costos/alcance.
