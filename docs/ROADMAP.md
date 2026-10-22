# Roadmap de Gasway

Actualizado: **2026-10-22**, a partir de la [revisión técnica](review-2026-10-22.md)
del árbol de trabajo actual. El [checklist anterior](roadmap-history.md) conserva
antecedentes; sus casillas no certifican el estado actual del cloud.

## Punto de partida

Una app Expo SDK 57 reúne compra de GLP, reparto y gestión de distribuidoras.
Ya existen autenticación, invitaciones, postulación/revisión, catálogo comercial,
cobertura del negocio, compra idempotente con reserva, ofertas y avance de entrega.
El backend autoriza operaciones en Postgres con RLS. Tracking, push, panel admin
web, recuperación de contraseña dentro de la app y pagos electrónicos siguen pendientes.

La revisión npm inicial en línea encontró **25 paquetes afectados: 19 altos y 6 moderados**,
incluida propagación de cuatro avisos raíz. DT-01 reduce el total a **22: 19 altos y
3 moderados**, por tres avisos raíz. No equivalen a fallos independientes.
DT-02 incorpora runner offline, cobertura de siete módulos críticos y workflows CI;
clasifica siete SQL vigentes y nueve históricos y prepara Gasway Test separado.
Actions offline y SQL ya fueron ejecutados; el usuario confirmó 7/7 suites SQL por HTTPS en Gasway Test.
Evidencias y límites en [guía de pruebas](testing.md) y en la revisión inicial.

## Prioridades y estimaciones

- **Alta:** antes de un piloto con usuarios/datos reales o del trabajo dependiente.
- **Media:** siguiente iteración, después de establecer seguridad y regresiones reproducibles.
- **Baja:** posterior al piloto o sujeta a validación de necesidad, alcance y costos.

Esfuerzo en **días-persona de desarrollo**, incluyendo implementación, documentación
y validación técnica acotada. Excluye esperas de terceros, publicación, revisión
operativa y auditoría externa. Son estimaciones, no compromisos de fechas.
Las tareas propuestas no se implementaron durante la revisión inicial. DT-01/02 tienen
entregas posteriores de parches, excepciones y automatización el mismo 2026-10-22;
ver su estado a continuación.

## Deuda técnica

### Alta

| ID    | Descripción del próximo paso                                                                                                                                                                                                                                                                                                                                                     | Justificación                                                                                                                                                                                                                                         | Esfuerzo estimado                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| DT-01 | **Parches aplicados; excepciones vigentes (2026-10-22).** Expo 57.0.31/Router 57.0.29/Location 57.0.22 y ESLint 9.39.5; config-plugins 57.0.11/xcode 4 retiran uuid 7. Alcanzabilidad, evidencia y excepciones con responsable/vencimiento en [seguridad de dependencias](dependency-security.md). Verificar rutas de URLs antes del piloto; evaluar SDK 58/Router por separado. | Braces/node-forge siguen sin parche publicado; el decoder corregido cambia a ESM y Router 57 usa query-string CommonJS, aunque su parser configurado usa URLSearchParams. ESLint 9 sigue sin soporte y dos plugins no declaran compatibilidad con 10. | Seguimiento de excepciones: decoder 2026-10-29; braces/node-forge/ESLint 2026-11-05. Evaluación de SDK mayor separada: 3–5 días. |
| DT-02 | **Completado y validado en Actions (2026-10-22).** npm test/test:coverage, C8 con umbrales y CI Linux/Windows de tipos/lint/formato. Siete SQL vigentes y nueve históricos excluidos; Gasway Test separado con migraciones y catálogo. [Guía y evidencia](testing.md), ADR 0022.                                                                                                 | El usuario confirmó el workflow SQL exitoso: 7/7 suites por Management API HTTPS, con environment/secret configurados. El runner conserva allowlist, marcador privado y rollback.                                                                     | Completado. Concurrencia real y respuestas perdidas continúan en DT-03.                                                          |
| DT-03 | **Probar concurrencia real y respuestas perdidas.** Usar dos conexiones para dos conductores por pedido, dos pedidos por conductor, último stock, cancelación frente a aceptación/progreso y reintento tras commit. Verificar ganador, eventos y stock final.                                                                                                                    | Bloqueos, CAS e índices son buena base; pruebas secuenciales no demuestran carreras, orden de bloqueos ni recuperación ante deadlocks.                                                                                                                | 2–4 días; después de DT-02.                                                                                                      |
| DT-04 | **Generar y usar tipos de Supabase.** Permitir generación desde cloud de prueba y parametrizar cliente, tablas y RPC; comparar tipos en CI y mantener zod.                                                                                                                                                                                                                       | Cliente no parametrizado, ausencia de `database.generated.ts` y `db:types` exclusivamente local; contratos evolucionados en 20 migraciones.                                                                                                           | 1–2 días.                                                                                                                        |
| DT-05 | **Reparar el límite de arquitectura.** Componer AuthProvider en la raíz y dejar shared independiente de features; proteger imports entre capas/roles con una regla automática.                                                                                                                                                                                                   | `shared/providers/app-providers.tsx` importa una feature, contrario a la convención y a la separación futura de apps.                                                                                                                                 | 0,5–1 día.                                                                                                                       |
| DT-06 | **Completar integridad del perfil.** Validar módulo 11 y pertenencia CUT en SQL para profiles; auditar históricos antes de validar restricciones `NOT VALID` de pedidos.                                                                                                                                                                                                         | Perfil con escritura directa propia y validación solo de formato; postulaciones tienen controles más fuertes. Persisten restricciones históricas pendientes.                                                                                          | 1–2 días.                                                                                                                        |
| DT-07 | **Verificar seguridad operativa del piloto.** Revisar grants/RLS/RPC con advisors/cuentas de prueba, correo confirmado, redirecciones, límites de abuso, claves restringidas, backups y restauración. Añadir detección de secretos al CI.                                                                                                                                        | Revisión de código no certifica cloud. Resultados de Auth/advisors son históricos; verificar disponibilidad/costo de protección contra contraseñas filtradas antes de activarla.                                                                      | 2–3 días; requiere acceso al entorno de prueba.                                                                                  |
| DT-08 | **Definir ciclo de vida de datos personales.** Retención, eliminación/exportación, dirección recordada por cuenta y borrado local; limpieza de coordenadas, postulaciones y auditorías según necesidad operativa.                                                                                                                                                                | Hay direcciones/RUT y tabla driver_locations, sin una política ejecutable de retención. Es requisito previo para ampliar tracking.                                                                                                                    | 2–3 días.                                                                                                                        |

Criterio de salida: regresiones del contrato vigente y carreras reproducibles,
tipos generados y límites de imports protegidos; avisos corregidos o con excepción
temporal documentada y riesgo acotado; seguridad y tratamiento de datos revisados
para el entorno concreto. Esto no concede aprobación comercial a negocio/conductor.

### Media

| ID    | Descripción del próximo paso                                                                                                                                                                                                        | Justificación                                                                                                                             | Esfuerzo estimado           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| DT-09 | **Unificar fallos y diagnóstico.** Añadir frontera de errores propia y política de mensajes/reintentos; capturar códigos sin RUT, dirección ni tokens. Definir timeouts/cancelación y reconciliar mutaciones de resultado incierto. | Buen feedback local, pero no ErrorBoundary propio ni observabilidad de producción. trackEvent es una función vacía.                       | 2–3 días.                   |
| DT-10 | **Estabilizar sesión y caché.** Probar refresh, cierre, revocación, cambio de cuenta y operaciones en vuelo; limpiar según identidad si las pruebas lo permiten.                                                                    | `onAuthStateChange` vacía toda la caché en cada evento, incluso refresh; puede provocar recargas sin cambio de usuario.                   | 1–2 días.                   |
| DT-11 | **Medir red y consultas.** Contar RPC por pantalla, p95 y consumo con datos representativos; revisar polling, foco y refetch de páginas acumuladas. Evaluar consolidación y EXPLAIN de opciones/cobertura.                          | Varias RPC driver cada 5 s y agregaciones JSON completas; no hay mediciones para justificar cambios de estrategia.                        | 2–3 días.                   |
| DT-12 | **Acotar listas y cálculos.** Evaluar cursor para pedidos/equipo y paginar búsqueda/cobertura desde SQL; reemplazar deduplicación cuadrática y reutilizar conteos/formateadores según mediciones.                                   | Offset puede desplazarse ante inserciones y el trabajo crece con equipo/comunas/historial. Ya hay FlatList y páginas de 20 que conservar. | 2–4 días; después de DT-11. |
| DT-13 | **Optimizar recursos.** Ajustar dimensiones/compresión de imágenes usadas, preservando transparencia y marcas; medir bundle/memoria después.                                                                                        | Assets ocupa ~19,7 MiB en fuentes y varios PNG superan 1 MiB; descarga y memoria todavía no medidas.                                      | 1–2 días.                   |
| DT-14 | **Dividir módulos de alto cambio.** Extraer formulario, CSV, selección de distribuidora y revisión de compra desde pantallas grandes; separar primitivas al editar components.tsx.                                                  | Facilita pruebas y mantenimiento sin reescribir toda la app; mantener rutas delgadas, tokens y contratos.                                 | 2–4 días, incremental.      |
| DT-15 | **Unificar documentación operativa.** Alinear arquitectura/AGENTS con business y ADRs 0018–0021; aclarar comandos local/cloud y guía de entorno nuevo; registrar vigencia de suites y catálogo CUT.                                 | Persisten referencias al scaffold, contratos retirados y resultados antiguos. README/roadmap ya se corrigen en esta entrega.              | 1–2 días.                   |

### Baja

| ID    | Descripción del próximo paso                                                                                                                                 | Justificación                                                                                      | Esfuerzo estimado                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| DT-16 | **Revisar dependencias reservadas.** Confirmar uso de Zustand, notificaciones y mapas; decidir mantener, cargar por demanda o retirar en tarea acotada.      | Estar instalado no implica capacidad implementada; evitar complejidad/permisos anticipados.        | 0,5–1 día.                                  |
| DT-17 | **Preparar entrega reproducible.** Definir perfiles de build, ambientes, versiones, distribución y rollback; criterios para migrar SDK/herramientas mayores. | No hay configuración EAS de entrega en el árbol revisado; development build no equivale a release. | 2–3 días; tiendas/costos se deciden aparte. |

## Nuevas funcionalidades

### Alta

| ID    | Descripción del próximo paso                                                                                                                                              | Justificación                                                                                                      | Esfuerzo estimado                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| NF-01 | **Recuperación de acceso en la app.** Solicitud por correo, enlaces de confirmación/recuperación y nueva contraseña con expiración y mensajes sin enumeración de cuentas. | Hay diagnóstico/restablecimiento administrativo, sin flujo autónomo completo para el usuario.                      | 2–3 días; coordinar DT-07 y probar enlaces en entorno autorizado. |
| NF-02 | **Resolver ofertas agotadas.** Definir plazo sin asignación, estado visible, cancelación/liberación y eventual renovación/redespacho idempotente de servidor.             | Ofertas de 60 s sin barrido/redespacho; una compra offered puede mantener reserva sin asignación hasta cancelarse. | 3–5 días; requiere DT-02/03 y decisión de producto.               |

### Media

| ID    | Descripción del próximo paso                                                                                                                                 | Justificación                                                                                                                            | Esfuerzo estimado                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| NF-03 | **Administración web mínima.** Revisar negocios/conductores y evidencia vigente; suspensión y auditoría con permisos de servidor y continuidad de entregas.  | Operación privilegiada depende de SQL manual; membresía de negocio no concede aprobación de Gasway.                                      | 6–10 días, en fases; después de DT-07/08.                 |
| NF-04 | **Notificaciones.** Registro de dispositivos, preferencias, envío de servidor, permisos, deduplicación y bajas de tokens.                                    | Solo hay módulo configurado; polling requiere app activa. SQL/Realtime siguen siendo autoridad.                                          | 3–5 días; revisar costos y credenciales antes de activar. |
| NF-05 | **Seguimiento solicitado expresamente.** Ubicación con consentimiento, acceso por pedido activo, mapas y caducidad; aislar permisos/servicios del conductor. | tracking está reservado; ubicación actual solo propone dirección. Segundo plano requiere una tarea y autorización de alcance propias.    | 5–8 días; después de DT-07/08 y decisión de costos.       |
| NF-06 | **Completar contrato del envase.** Tipo/condición/características del vacío, logística inversa y desglose comercial cuando corresponda.                      | Ya hay canje y marca devuelta; faltan características e intercambio posterior. No presumir compatibilidad ni cobrar por cambio de marca. | 3–5 días; requiere definición operativa.                  |

### Baja

| ID    | Descripción del próximo paso                                                                                                                       | Justificación                                                                                              | Esfuerzo estimado                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| NF-07 | **Operación sin conexión.** Datos recientes con antigüedad, borradores por cuenta y reconciliación; compra/aceptación siempre sujetas al servidor. | Mejora conectividad inestable sin prometer stock, precio o asignación desde datos locales.                 | 3–5 días; después de DT-09/10.                  |
| NF-08 | **Evaluar Mercado Pago o Webpay.** Servidor, webhooks verificados, idempotencia, conciliación y devoluciones usando el contrato existente.         | MVP solo contra entrega; no hay gateway. Requiere aprobación explícita de alcance/costos antes de activar. | 5–10 días por un proveedor; después del piloto. |
| NF-09 | **Medir demanda y cobertura.** Métricas agregadas/tablero desde coverage_interests tras definir finalidad, consentimiento y retención.             | Ya se guarda interés por comuna/producto, sin avisos ni backend de trackEvent.                             | 2–3 días; después de DT-08/09.                  |

## Secuencia recomendada

1. DT-01/02/07: dependencias y entorno de pruebas seguro/reproducible.
2. DT-03–08: concurrencia, tipos, límites, integridad y privacidad.
3. NF-01/02 y DT-09/10/15: recuperación de acceso/operaciones y documentación vigente.
4. DT-11–14: medir y optimizar los cuellos de botella observados.
5. Evaluar piloto acotado; luego administración, notificaciones y tracking por separado.

Un piloto exige negocios/conductores realmente revisados, precios comerciales,
cobertura elegida por negocio y conductores habilitados/disponibles. is_demo y stock
publicado no acreditan operación real. Pruebas futuras de dispositivo/visuales
requieren una tarea autorizada; no se hicieron durante esta revisión.
Este plan no divide apps, activa pagos/servicios facturables ni incorpora beneficios
estatales vencidos automáticamente.
