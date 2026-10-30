# ADR 0032 — Coordenadas GPS privadas y acceso por pedido

Fecha: 2026-10-24. Estado: aceptado para D2 de la demo privada.

## Contexto

El esquema inicial permitía publicar por conductor mediante escritura directa y
leer su última posición por cualquier pedido activo del mismo conductor. No
aseguraba que la muestra perteneciera a esa entrega ni que fuera reciente.

## Decisión

Mover `driver_locations` a privado, revocar acceso directo y retirar coordenadas
de Realtime. Muestras con order_id, captura, precisión y recepción de servidor.
Solo el conductor verificado asignado publica en accepted/on_the_way por RPC;
solo participantes leen. Wrappers públicos INVOKER, implementación privada DEFINER,
search_path vacío, autorización explícita y EXECUTE mínimo, como las otras RPC.

Lectura autorizada por petición y coordenadas solo durante 30 s desde captura y
recepción. Máximo una muestra aceptada cada 5 s; reenvíos anteriores no refrescan
frescura. Rangos válidos no certifican procedencia física del GPS.

Realtime transporta únicamente revisiones de pedido con RLS para invalidar una
consulta. No autoriza ni contiene coordenadas: evita depender de DELETE de Postgres
Changes o de revocar una suscripción ya abierta para detener la exposición GPS.

Publicación y transición final bloquean el pedido; un trigger borra la muestra
al entregar/cancelar en la misma transacción. El lector toma bloqueo compartido.
Datos ya recibidos no pueden retirarse del dispositivo: D3 debe caducar el marcador
y limpiar caché/captura al terminar o cambiar sesión.

## Consecuencias

La segunda entrega espera muestra propia y no hereda ubicación. El cliente debe
reconsultar tras avisos/reconexión, con polling y caducidad local: hay una lectura
adicional por actualización. No se almacena historial de recorridos.
Las muestras heredadas se descartan sin asignarlas retrospectivamente: ambos
clouds tenían cero al migrar. La retención física automática de muestras de pedidos
abandonados y backups sigue abierta en DT-08; frescura solo limita lectura.
Captura/vista D3, segundo plano y rutas/ETA quedan fuera de D2.

Contrato y evidencia: [D2](../gps-contract.md).
