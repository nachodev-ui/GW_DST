# Licencia y documentos del conductor

Implementado el **2026-10-27**. El conductor carga sus propios antecedentes;
el negocio consulta el avance y gestiona la flota. Gasway conserva la revisión
documental y la aprobación de acceso como controles independientes (ADR 0042).

## Recorrido

Cuenta de conductor → **Mi licencia y documentos**. Si la licencia bloquea la
disponibilidad, Inicio, Cobertura y Cuenta consultan los datos y archivos guardados:
si falta un requisito ofrecen **Completar mi licencia**; al completar datos,
frente y dorso vigentes muestran **Licencia en revisión**, con la acción secundaria
**Actualizar mis archivos**. No es necesario visitar el resumen para quedar enviado.
La consulta se actualiza al volver a la pantalla, por refresco manual y por sondeo
en foco. Un fallo de lectura muestra estado sin confirmar; no presume que faltan
archivos ni anuncia revisión desde datos cuya consulta falló. La cuenta
de una persona con postulación también ofrece el acceso: una guarda consulta su
vinculación en servidor, sin concederle acceso a ofertas ni reparto.

1. **Tus datos:** RUT reutilizado, módulo 11 y clase de licencia. El RUT queda
   bloqueado tras una aprobación; cambiar clase requiere un dorso de esa clase.
2. **Frente:** cámara, archivo o escáner cuando el runtime lo admite; vista previa
   antes de enviar, JPG/PNG/PDF hasta 5 MB.
3. **Dorso:** misma carga más fecha de próximo control para la clase elegida,
   ingresada DD/MM/AAAA. La UI pide una fecha vigente; la autoridad es el servidor.
4. **Resumen:** datos y ambas caras, archivos enviados/revisados, observaciones,
   acceso al visor privado y reemplazo de versiones.

El progreso permanece visible durante el scroll; el pie conserva la acción
principal. Paleta crema/verde oscuro/oliva/lima, ilustración propia de licencia y
estados sin rellenos verdes. Se reutilizan estilos y primitivas documentales del
asistente de vehículos desde shared/documents; el conductor no importa business.
No se agregaron dependencias ni módulos nativos.

El asistente retoma el primer requisito incompleto, o el resumen si ambos archivos
ya están enviados. «Enviado» no equivale a «aprobado». Un reemplazo pendiente o
rechazado no elimina una aprobación anterior vigente. El dorso debe corresponder
a la clase actual. Reintentar un envío reutiliza la ruta ya subida; los borradores
y bytes permanecen en memoria. Salir con cambios pide confirmación y guardar
bloquea la navegación. No se activan disponibilidad, aprobación ni GPS.

## Distribuidora

**Reenvíos (2026-10-27):** cada cara conserva un único pendiente actual. Volver a
subir el frente reemplaza su pendiente anterior; no afecta al dorso ni elimina
archivos. Los envíos reemplazados quedan en el historial del administrador y no
requieren otra decisión. Una aprobación vigente se conserva mientras se revisa
la nueva versión. Ver ADR 0043.

Operación → Conductores ahora → **Ver qué falta** abre el detalle de habilitación.
Equipo → **Ver habilitación** ofrece el mismo detalle, sin editar licencias.
Expone el estado de cada cara, su responsable, observaciones y vehículo vinculado.
La invitación se etiqueta «Invitación aceptada» y la aprobación de acceso «Acceso
aprobado por Gasway». La condición de reparto se consulta por separado al servidor.

## Servidor y verificación

Migración `20261027174325_driver_self_documentation`: lectura propia de documentos
y Storage, carga y modificación de RUT/clase solo por `auth.uid() = driver_id`.
Los miembros conservan lectura del equipo y carga de vehículos; no pueden enviar
ni modificar licencias ajenas. La revisión exige un admin distinto del cargador.
Se conservan versiones, buckets privados, RLS, bloqueo de identidad y requisitos
de disponibilidad/asignación. Un conductor aún no aprobado puede completar su
licencia si ya está vinculado a un negocio habilitado.

La suite driver_self_documentation.sql comprueba propiedad, aislamiento entre
conductores, negocio de solo lectura, revisión separada, RUT bloqueado, clase y
ausencia de habilitación automática. document_eligibility.sql conserva los casos
de flota/despacho usando al conductor como cargador de su licencia. Los fixtures
se revierten y no aprueban documentos de la demo persistente.

## Evidencia del 2026-10-27

- `npm run typecheck`: aprobado; corregida una firma de mutación del visor antes
  de la ejecución final.
- Pruebas locales de estados/fechas, workspace del conductor y Auth: aprobadas.
  Los mocks de Auth se actualizaron a las referencias, consulta de negocios y
  guarda administrativa que ya existían en el código.
- Migración aplicada **solo en Gasway Test** (`xnrueexpwzvxotgwmamj`), en una
  transacción que ejecutó driver_self_documentation.sql y document_eligibility.sql
  antes de confirmar. Ambas suites aprobadas; fixtures revertidos.
- El primer ensayo integral chocó con la patente ZZ9999 de la demo persistente:
  rollback confirmado, fixture corregido para buscar una patente libre y nueva
  ejecución aprobada. No se modificó el vehículo ni los documentos de la demo.
- Consulta posterior: migración registrada, ejecución anónima denegada para
  lectura/edición documental y cero negocios temporales remanentes.
- Advisor de seguridad: tres WARN, sobre las funciones existentes públicas
  `is_driver_eligible` / `is_vehicle_eligible` con SECURITY DEFINER y protección
  contra contraseñas filtradas desactivada. Esta migración no cambia esas funciones
  públicas ni Auth. Las funciones de elegibilidad comprueban el ámbito antes de
  leer; no se afirma que el advisor esté limpio. Referencias del advisor:
  [funciones públicas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
  y [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

La configuración de Storage conserva [políticas RLS para cargas y lecturas](https://supabase.com/docs/guides/storage/security/access-control).
El conector del plugin no tenía acceso al proyecto y se utilizó el CLI vinculado,
con referencia y marcador de Test comprobados por el script.

No se ejecutaron renderizados ni pruebas en teléfonos. Falta comprobar cámara,
selector, teclado, visor, navegación y revisión con las cuentas reales de Test.
Project no recibió esta migración. Recargar Metro incorpora los cambios de UI;
no hace falta recompilar por esta entrega.
