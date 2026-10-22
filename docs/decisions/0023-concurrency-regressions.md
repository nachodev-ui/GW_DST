# 0023 — Regresiones con contención observable

Estado: aceptado para pruebas. Fecha: 2026-10-22.

## Contexto

Las siete suites secuenciales de DT-02 revierten sus fixtures y no demuestran
contención entre sesiones. Lanzar dos promesas tampoco demuestra que los comandos
se solaparon dentro de PostgreSQL. ADR 0021 conserva asignación atómica, reserva de
stock e idempotencia, pero esos contratos requieren pruebas entre transacciones.

## Decisión

El runner `db:test:concurrency` usa el transporte HTTPS de ADR 0022 y, localmente
sin PAT, el CLI autenticado. Cada contendiente ejecuta una transacción completa
en una petición independiente. Las RPC usan claims sintéticos y `SET LOCAL ROLE
authenticated`; solo la coordinación y las assertions usan postgres.

La primera operación conserva sus bloqueos antes de COMMIT. Un observador espera
su `application_name`, inicia la segunda y exige dos PID distintos y que
`pg_blocking_pids(segundo)` incluya al primero. Solo entonces libera la barrera.
No se sustituyen pruebas por sleeps ni se reintentan automáticamente las RPC.
Un timeout, deadlock o SQLSTATE inesperado falla el caso.

Los casos cubren dos conductores/un pedido, dos pedidos/un conductor, último stock,
cancelación frente a aceptación y progreso en ambos órdenes de bloqueo, compras
simultáneas con la misma clave y reintento tras una respuesta descartada después
del commit. Se comprueban estado, asignación, eventos/actores, stock y reservas.
La respuesta descartada simula pérdida en la frontera del cliente; no corta TCP.

Las sesiones necesitan ver fixtures confirmados. Por eso estas pruebas **hacen
commit** en Gasway Test y limpian sus UUID en `finally`, en lugar del rollback
global de las suites secuenciales. Una tabla privada con RLS y sin permisos móviles,
`private.concurrency_test_run`, guarda la propiedad y la barrera de una única
ejecución. Se crea exclusivamente en el entorno de prueba, fuera de migraciones.
Un registro existente impide otra ejecución; no se limpia por antigüedad.

Se conservan allowlist de proyecto y marcador privado antes de cada transacción.
El workflow es manual, solo main, usa `gasway-test` y el mismo grupo de exclusión
que las regresiones secuenciales. Reutiliza el secret existente, sin nuevos tokens.

## Límites

Los casos fuerzan un orden observable de bloqueo; no son una prueba de carga ni
una exploración exhaustiva de todos los interleavings. Un proceso terminado puede
dejar fixtures; no borrarlos hasta confirmar que no quedan contendientes activos.
Una recuperación de deadlocks en cliente requeriría otro contrato explícito; el
runner los trata como fallo, sin ocultarlos con retries.

Referencias: [funciones de sesión de PostgreSQL](https://www.postgresql.org/docs/current/functions-info.html),
[pg_stat_activity](https://www.postgresql.org/docs/current/monitoring-stats.html),
[Management API](https://supabase.com/docs/reference/api/v1-run-a-query).
