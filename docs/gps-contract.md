# D2 — Contrato GPS por pedido

**Completado el 2026-10-24 para la demo privada.** Migración
`20261024045139_order_gps_contract` aplicada en Gasway Test y en la app.
La entrega D2 no incluía captura, permisos, hooks ni mapa; **D3 los implementa
en primer plano**, con prueba física aún pendiente. [Guía D3](live-tracking.md).
Segundo plano y DT-07/08 siguen abiertos.

Ampliación **2026-10-24, D3**: `get_order_tracking` añade `destination`, pin
confirmado o null durante el pedido activo, siempre null al terminar. Migración
`20261024051807_tracking_delivery_destination` aplicada en Test/app y pruebas de
destino/aislamiento aprobadas. Conserva permisos, bloqueos y frescura de D2.

## Revisión histórica

`public.driver_locations` tenía una fila por conductor, ubicación y `recorded_at`
editable por el cliente. Permitía INSERT/UPDATE al conductor verificado sin comprobar
pedido activo, y SELECT al cliente con cualquier pedido activo de ese conductor.
Estaba publicada en Realtime. Faltaban asociación a entrega, recepción autoritativa,
frescura y borrado terminal. No se encontraron escritores en el código móvil vigente;
las otras referencias corresponden al esquema y suites históricas excluidas del runner.

Preflight en ambos clouds: **cero filas GPS**. La migración descarta muestras
heredadas sin asociación confiable; nunca infiere un pedido para ellas. Mueve la
tabla a `private.driver_locations`, mantiene RLS, elimina políticas y revoca todos
los grants de anon/authenticated/service_role. Desaparece el endpoint público y la
tabla se retira de `supabase_realtime`. Las suites históricas no deben reutilizarse.

## Publicación autorizada

`publish_order_location(p_order_id, p_latitude, p_longitude, p_captured_at, p_accuracy_m)`:

- Identidad de `auth.uid()`, perfil `driver` y aprobación vigentes. Nunca metadata
  editable ni un driver_id del payload. Pedido asignado en `accepted`/`on_the_way`.
- Coordenadas presentes y finitas: latitud −90..90, longitud −180..180. Precisión
  presente, finita y 0..1000 metros. No se normalizan posiciones fuera de rango.
- Captura finita, posterior o igual a la aceptación, máximo 30 s antes de recepción
  y máximo 5 s en el futuro. El reloj del dispositivo puede requerir corrección.
- `received_at` lo fija `clock_timestamp()` después de los bloqueos. Máximo una
  muestra aceptada cada 5 s. Capturas repetidas o anteriores no sustituyen la última.
  No subir colas de posiciones offline ni refrescar una captura vieja con otra fecha.
- Bloqueos conductor → pedido → muestra, como `advance_driver_order`. Publicación
  y transición final se serializan sobre el pedido.

Respuesta `{accepted, reason, received_at}`. Motivos `accepted`, `out_of_order`,
`rate_limited`; los dos últimos no escriben ni refrescan la muestra. Errores:
`42501` sin identidad/aprobación/asignación; `55000` pedido cerrado; `22023` muestra
inválida. UUID/timestamp no parseable falla antes de ejecutar.
Esto valida formato, permisos y tiempo; no certifica la autenticidad física de un
sensor ni impide inventar coordenadas válidas desde un cliente modificado.

## Lectura y frescura

`get_order_tracking(p_order_id)` comprueba cliente o conductor asignado en cada
lectura; una membresía owner/manager no concede acceso GPS. Durante el seguimiento,
el conductor debe conservar aprobación y rol. Un bloqueo compartido del pedido
serializa la lectura con su transición final. UUID ajeno o inexistente: `42501`.

Respuesta `{order_id, state, server_now, received_at, fresh_until, sample}`:

| state   | Datos                                               | Significado                                        |
| ------- | --------------------------------------------------- | -------------------------------------------------- |
| waiting | sample/fechas null                                  | Pedido activo sin muestra propia.                  |
| fresh   | latitud, longitud, precisión, captura y recepción   | Muestra vigente de este pedido/conductor.          |
| stale   | sample null, conserva fechas de recepción/caducidad | Frescura vencida; no entrega coordenadas antiguas. |
| ended   | sample/fechas null                                  | Fuera de accepted/on_the_way, sin seguimiento.     |

`fresh_until = min(captured_at, received_at) + 30 s`: una captura antigua no se
vuelve fresca por llegar tarde. D3 debe calcular el plazo restante con `server_now`
y ocultar el marcador al vencer, aunque no lleguen eventos. No mantener un pin
viejo como posición actual ni inventar movimiento por desconexión.

## Realtime y cierre

`public.order_tracking_signals` contiene solo **order_id y revision**, SELECT con
RLS de participantes de un pedido activo/aprobado, sin escritura móvil. Cada muestra
aceptada incrementa la revisión en la misma transacción. D3 escuchará INSERT/UPDATE
filtrados por order_id para **reconsultar la RPC**, también al suscribir/reconectar,
con polling de respaldo en primer plano. El filtro del cliente no autoriza.

Al entregar o cancelar, un trigger borra la posición privada en la misma transacción;
RLS oculta señales y la RPC retorna `ended` sin GPS. El historial del pedido conserva
sus reglas existentes. La siguiente entrega comienza en `waiting`, aunque use el
mismo conductor. No hay historial de recorridos. Se conserva la señal mínima para
evitar emitir DELETE durante el cierre; su ciclo de vida depende del pedido.

Supabase documenta que DELETE de Postgres Changes no es filtrable y no aplica RLS
como INSERT/UPDATE; por eso el stream no transporta coordenadas. Un aviso atrasado
solo provoca otra lectura autorizada. Datos ya recibidos no se pueden recuperar del
dispositivo: D3 debe limpiar caché, detener captura/lectura y ocultar el marcador
al terminar, cancelar, perder acceso, cerrar sesión o cambiar de identidad.

La última coordenada de un pedido todavía activo queda almacenada hasta reemplazo,
término o eliminación del pedido/conductor, aunque se oculta después de 30 s.
No hay job de purga por antigüedad de pedidos abandonados: retención física automática
y backups siguen abiertos en DT-08 antes de ampliar la operación.

## Integración y evidencia

`src/shared/tracking/contracts.ts` valida entradas/respuestas con zod y publica
plazos de 5/30 s; `data.ts` encapsula las RPC sin conocer roles ni features. D3
compondrá captura en `features/tracking/driver` y vista en `features/tracking/customer`.
No hay permisos nativos nuevos ni build Android necesario por D2.

- Test/app: migración aplicada y comprobación posterior de tablas, grants,
  publicación y funciones. Sin fixtures en el proyecto de la app.
- `order_tracking.sql` aprobado en Test con rollback: asignación/roles, anónimo,
  no participantes (incluido owner de la distribuidora), identidad ausente,
  datos no finitos/rangos/tiempo, recepción autoritativa,
  reenvío/frecuencia, lectura propia, stale sin punto, revocación, entrega,
  cancelación y segunda entrega sin heredar muestra.
- `pilot_security.sql` y `driver_order_progress.sql` aprobados. Retirada la excepción
  que admitía escritura GPS directa. Sin repetir toda la suite SQL ni acreditar
  un ensayo de carrera entre conexiones.
- Pruebas offline dirigidas de contratos y clasificación de diez suites SQL
  aprobadas. Typecheck final aprobado. Advisors de seguridad: Test sin hallazgos;
  app conserva el WARN conocido de protección de contraseñas filtradas deshabilitada
  (decisión registrada en DT-07), sin hallazgos nuevos del contrato GPS.
- Sin pruebas visuales, GPS físico, WebSocket/reconexión ni dos teléfonos en D2:
  quedan en D3/D4. Sin seguimiento de segundo plano ni prueba de carga.

[ADR 0032](decisions/0032-order-gps-contract.md).
[Referencia oficial: Postgres Changes y límites de DELETE](https://supabase.com/docs/guides/realtime/postgres-changes).
