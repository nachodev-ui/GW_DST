# ADR 0037 — Inicio y gestión del distribuidor

Fecha: 2026-10-25. Estado: implementado y desplegado en Test/app; pruebas de dispositivo pendientes.

Actualización de alcance, 2026-10-29: por decisión del responsable del proyecto,
Panel y Ventas se limitan al total de precios de venta al cliente de entregas
completadas. Registro de costos y ganancia estimada quedan para una etapa futura.
Se retira su interfaz y se conserva la infraestructura existente sin borrar datos.
Las referencias a costos y margen en la decisión original describen esa base,
no una funcionalidad visible en el alcance actual.

## Contexto

Los responsables de distribuidoras entraban al inicio del cliente. Las herramientas
del negocio no mostraban ventas, costos ni flota y su identidad comercial no era
editable. Un rol customer/driver no expresa la membresía de una organización.

## Decisión

Mantener una sola app y los roles existentes. El inicio consulta membresías y
prioriza el workspace para owners/managers. Las pestañas Panel/Ventas/Operación/
Perfil viven bajo el guard de membresía; compra y reparto siguen accesibles desde
Perfil. La capacidad no se persiste como autorización en almacenamiento local ni
metadata. `features/business` concentra la funcionalidad y `theme.business` sus
tokens, sin que shared/theme importen features.

Agregar RPC con wrappers INVOKER e implementaciones privadas que comprueban
auth.uid/membresía. Agregados financieros usan entregas y períodos de Chile; costos
por pedido permiten un margen explícitamente parcial cuando falta información.
No llamarlo conciliación de caja ni utilidad neta contable.

Agregar perfil comercial separado de antecedentes privados y flota descriptiva
separada de la autoridad de despacho. Tablas con RLS, SELECT para miembros y
escrituras solo por RPC con revisión CAS y auditoría. Imágenes en bucket privado,
rutas inmutables por negocio y URLs firmadas; no publicación de datos privados.

## Consecuencias

Una membresía vigente lleva al panel, incluso si el usuario también conduce. La
cuenta puede cambiar de experiencia sin cambiar permisos. Las métricas necesitan
la nueva migración; deben mostrar error si no está desplegada. La gestión de costos
depende de los datos del negocio y no reemplaza un sistema contable. La flota no
acredita seguridad o autorización operativa. Retención/limpieza de imágenes
antiguas queda pendiente antes de escalar almacenamiento.

Referencias, contrato, pasos de activación y límites en
[distributor-workspace.md](../distributor-workspace.md).
