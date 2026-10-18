# ADR 0004 — Pruebas de la migración aplicada

Fecha: 2026-10-17. Estado: aceptado.

Decisión: conservar intacta 20261018003027_initial_schema.sql, ya aplicada en cloud
según el usuario. No se encontró una corrección necesaria para la aceptación por
lectura; no se agrega migración. Toda corrección posterior debe usar una migración
con timestamp mayor y registrar su decisión aquí.

La asignación ocurre en un único UPDATE de orders condicionado a status = offered,
driver_id IS NULL, cliente distinto del actor y oferta dirigida vigente. RETURNING
identifica al ganador; cero filas produce 55000. Hay un SELECT FOR UPDATE del driver
antes de esa sentencia y otro UPDATE de disponibilidad después: la función completa
no es una sola sentencia, pero sí lo es la asignación condicionada. El índice único
parcial impide dos entregas activas por driver. Eventos y disponibilidad pertenecen
a la misma transacción. La revisión por lectura no sustituye una carrera real.

RLS permite leer pedidos al cliente propietario o al repartidor asignado. Un
destinatario de oferta aún no puede leer el pedido completo: la dirección y punto
preciso permanecen privados, como exige el dominio. La suite comprueba esta política
más restrictiva y la lectura positiva de asignaciones; no afirma que las ofertas
sean visibles. Mostrar un resumen de oferta requerirá un contrato mínimo autorizado
y una migración posterior; ampliar SELECT a todo el pedido expondría datos privados.

Se entrega SQL directo, sin extensión pgTAP, con usuarios UUID aleatorios propios,
aprovisionamiento confiable y SET LOCAL ROLE authenticated más request.jwt.claims.
La suite usa un único DO con IDs locales, sin tablas ni funciones auxiliares; cada
verificación emite NOTICE o falla con un mensaje explícito.
La transición inválida se intenta como postgres para comprobar específicamente el
trigger y su SQLSTATE/mensaje, sin confundir falta de UPDATE con rechazo del grafo.
La aceptación del segundo driver exige 55000 y el motivo esperado, y verifica que
el primero conserve pedido/evento y solo él pierda disponibilidad.

Un error controlado GW001 al final revierte la subtransacción de todos los fixtures
y se captura para devolver éxito, incluso en autocommit. Otros errores se propagan
y revierten el DO completo. Las secuencias no son
transaccionales y pueden dejar huecos. No se ejecutó SQL ni se accedió al proyecto
cloud. Pendiente: ejecutar el archivo completo en SQL Editor y comprobar concurrencia
real desde dos sesiones independientes.
