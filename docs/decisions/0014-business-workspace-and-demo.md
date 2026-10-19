# ADR 0014 — Alta del negocio, workspace y demostración explícita

Fecha: 2026-10-18. Estado: implementado y aplicado en Gasway cloud.

## Problema

Existían organizaciones y confirmación de vínculos en el servidor, pero ningún
responsable podía gestionarlas desde la app. El usuario pidió completar los pasos
1–3 con datos ficticios y asignó el usuario a30a8236-175c-424d-9bf4-ff753d695649.

## Decisión

Una sola app mantiene perfiles customer/driver y añade una sección business separada,
con membresías owner/manager existentes. Sus layouts verifican sesión y membresía;
las RPC verifican siempre al actor y el negocio sin confiar en metadata ni navegación.
Ser dueño de negocio no concede acceso de conductor.

El alta por usuario registra identidad del negocio, responsable, contacto, recinto,
CUT, marcas y referencias comerciales/seguridad. Solo applicant_id=auth.uid() puede
leer la solicitud propia. No hay subida de archivos ni validación documental automática.
Se admite una solicitud inicial por usuario; membresías adicionales se provisionan
por administración. Pendiente es inmutable salvo reintento idéntico; rechazo permite
reenvío explícito y nueva versión. La segunda migración hace idempotente también el
reintento idéntico de ese reenvío, sin cambiar requested_at.

La revisión administrativa es SQL INVOKER sin EXECUTE móvil ni service_role. Exige
versión, motivo y operador; aprueba negocio, owner y marcas juntos, o rechaza. Guarda
snapshot privado por decisión. No altera perfiles, conductores ni revisiones previas.

El workspace permite abrir postulaciones, confirmar vínculo de conductor y editar
catálogo propio. Solo negocio verificado, miembro y marca configurada pueden escribir
precio CLP/stock/inclusión. revision evita escrituras perdidas, un retry exacto de la
última versión ya guardada no repite auditoría, y las ediciones registran actor.
Los precios no sustituyen los globales ni afectan pedidos en esta fase.

La autorización explícita permite un seed persistente de prueba separado de las
migraciones. El negocio tiene is_demo=true, nombre Demo y revisión marcada FICTICIA;
los datos no representan autorización SEC ni evidencia comercial. Esta excepción
actualiza la decisión anterior de no inventar organizaciones: no aprueba conductores
reales ni rellena vendedores de pedidos históricos. El script se niega a sobrescribir
una solicitud o negocio ajenos y conserva cambios de catálogo al repetirse.

## Límites y validación

Faltan precio/stock conectados a la compra, vendedor elegido al crear, reserva y
liberación atómicas, evidencia vigente de conductor/vehículo/seguridad y operación
administrativa de producción. Las referencias de alta no son documentos validados.
La prueba demo tampoco sustituye estos requisitos para un piloto real.

SQL transaccional verifica roles, RLS, revisiones, reenvíos, privacidad, confirmación,
catálogo, revocación, auditoría y concurrencia por revisión; fixtures revertidos.
Assertions locales comprueban normalización, CLP/stock y versión exacta de confirmación.
Sin renders, emuladores ni comprobaciones visuales por instrucción del repositorio.
