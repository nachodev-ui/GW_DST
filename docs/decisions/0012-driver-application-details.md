# ADR 0012 — Datos del postulante y distribuidor solicitado

Fecha: 2026-10-18. Estado: implementado, migración y suites aprobadas en cloud.

## Decisión

La postulación ahora pide nombre completo, RUT, teléfono chileno de contacto y el
distribuidor solicitado. Vive en `features/auth` y una ruta customer delgada; no
importa features de conductor. Usa react-hook-form, zod y primitivas existentes.
Conserva Figtree y los tokens actuales, etiquetas visibles, errores por campo y
una selección con nombre de negocio. La búsqueda de diseño se acotó a validación
de formularios después de descartar una propuesta de landing poco pertinente.

`submit_driver_application` toma identidad exclusivamente de auth.uid y valida
los antecedentes también en Postgres. No modifica perfil, RUT de profiles, rol,
verificación ni afiliación. El RUT se normaliza sin puntos, con guion y K mayúscula;
se valida módulo 11 en TypeScript y SQL. El teléfono se normaliza a +56 y nueve
dígitos nacionales; no se presupone que su prefijo pruebe el tipo de línea por la
portabilidad. No se envía SMS ni se verifica identidad automáticamente.

Los datos actuales quedan en driver_applications, con lectura propia por RLS y
sin escritura directa del móvil. Las columnas son todas NULL para solicitudes
anteriores o están completas. No se inventan antecedentes de cuentas existentes.
Las pendientes antiguas pueden completar el formulario; una pendiente completa
no puede editarse mientras está en revisión. Un reintento idéntico es idempotente
y conserva la fecha. Tras rechazo se pueden corregir datos y confirmar una nueva
solicitud; las compras siguen disponibles.

La confirmación administrativa final sigue siendo indispensable: estos datos son
declarados por el postulante y no certifican identidad, habilitación legal ni vínculo.

## Directorio y aprobación

`distributors.accepts_driver_applications` empieza en false. Solo organizaciones
verificadas que activan esa opción aparecen en list_application_distributors,
un wrapper autenticado que devuelve exclusivamente id y nombre. Las filas completas
del negocio y sus responsables mantienen RLS afiliada; el directorio no publica
RUT, direcciones, contactos ni datos de postulantes.

El alta/verificación del negocio y la activación del directorio siguen siendo
operaciones privilegiadas. Después de revisar un negocio real y confirmar que
desea recibir postulaciones, un operador puede habilitarlo en SQL Editor:

```sql
update public.distributors
set accepts_driver_applications = true
where id = 'UUID_DEL_NEGOCIO_VERIFICADO' and is_verified;
```

La RPC vuelve a comprobar verificación y recepción bajo bloqueo al enviar. Si
la opción dejó de estar disponible, falla con GW003 y la app solicita actualizar
la lista. Con el directorio vacío, no pide datos ni envía solicitudes incompletas.

La revisión SQL conserva su firma. Un trigger impide aprobar solicitudes sin datos
o asignar un distribuidor diferente al elegido. La función administrativa ya exige
que ese negocio siga verificado. Un rechazo puede registrarse aun si faltan datos.
Los conductores aprobados anteriormente conservan su acceso, sin exigir completar
antecedentes de manera retroactiva ni crear una afiliación ficticia.

Cada revisión nueva guarda una copia privada de nombre, RUT, teléfono, distribuidor
solicitado y fecha de postulación en application_snapshot. Así una nueva solicitud
no sobreescribe los antecedentes revisados anteriormente. No se reconstruyen copias
para revisiones históricas. Antes del piloto debe definirse la retención de estos datos.

## Compatibilidad y verificación

Las RPC anteriores sin argumentos siguen disponibles para compatibilidad: pueden
crear una solicitud antigua sin datos o reabrirla conservando lo ya informado,
pero nunca conceden acceso; una aprobación ahora exige antecedentes completos.
El cliente actual siempre usa el formulario y submit_driver_application.

- Aplicada completa `20261018211559_driver_application_details.sql` en Gasway Project
  (`gleltbrvpfvfgggcatpt`) como postgres, con dry run previo de esa única migración.
- Aprobadas driver_application_details.sql, distributors_driver_review.sql y
  driver_reapplication.sql: normalización, constraints, RLS, directorio mínimo,
  aprobación coincidente, solicitudes antiguas, reintentos y copias de revisión.
- Los conteos de usuarios, perfiles, conductores, negocios, solicitudes y revisiones
  fueron idénticos antes/después; ningún fixture quedó y las cuentas reales no cambiaron.
- Aprobadas pruebas locales de contrato/navegación y formulario/RUT/teléfono,
  un typecheck y ESLint acotado. Sin dependencias nuevas ni comprobaciones visuales.
- Advisors sin problemas nuevos; permanece el aviso conocido de protección de Auth
  contra contraseñas filtradas desactivada. No se cambió esa configuración.

No hay negocios reales registrados al cierre de esta operación. Falta validación
en dispositivo con un negocio real habilitado. Quedan para tareas siguientes el alta
del distribuidor en la app, su confirmación de vínculo, suspensión y panel administrativo.

Referencias: [validación módulo 11 del SII](https://www.sii.cl/documentos/resoluciones/2008/reso128_anexo_corfo.pdf)
y [numeración y portabilidad de Subtel](https://www.subtel.gob.cl/de-manera-exitosa-ya-opera-en-chile-la-nueva-forma-de-marcar-desde-telefonos-moviles/).
