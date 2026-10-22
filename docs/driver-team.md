# Incorporar conductores desde Equipo

El distribuidor inicia la incorporación y el conductor acepta. Administración de
Gasway mantiene la habilitación final. No es necesario poseer un camión para recibir
una invitación ni se habilita reparto por tener una cuenta de negocio.

## Invitación individual

1. Entra con el responsable o encargado del negocio y abre **Mi negocio → Equipo**.
2. Pulsa **Invitar conductor → Individual**. Registra nombre y el correo que esa persona usará en Gasway.
3. Revisa la invitación y confirma **Crear invitaciones**. Una invitación vigente al
   mismo correo se conserva al repetir, sin duplicarla ni renovar su vencimiento.
4. La persona verá la invitación dentro de la app. Puedes usar **Compartir instrucciones**
   para indicarle cómo entrar; no se manda un correo automáticamente.

## Planilla de 50 conductores

1. Exporta desde tu hoja de cálculo un **CSV UTF-8** con dos columnas: `nombre,correo`.
   También se admite punto y coma, frecuente al exportar con configuración chilena.
2. Abre **Invitar conductor → Carga CSV** y selecciona el archivo, o pega su contenido.
   Límite: 100 personas y 100 KB. No se aceptan archivos XLSX directamente.
3. Pulsa **Revisar planilla**. Corrige nombres/correos inválidos, columnas sobrantes
   y duplicados. Ninguna invitación se crea durante la vista previa.
4. Revisa las filas y las personas ya invitadas/incorporadas. Confirma
   **Crear invitaciones** una sola vez para el lote completo.
5. Consulta Conductores o Invitaciones por nombre/correo, con carga incremental
   de 20 registros al desplazarte. El resultado del CSV permanece en el modal,
   con invitaciones creadas, existentes y fallidas. Puedes cancelar una
   invitación pendiente; vencidas y canceladas requieren crear una nueva.

Invitaciones ofrece filtros Pendientes, Aceptadas, Vencidas y Canceladas. El rechazo
corresponde a la revisión de habilitación, no a la invitación. No hay estados vista o
recibida. Los contadores con `+` indican registros cargados y aumentan al cargar más.
Ver [presentación del panel](business-admin-ux.md).

[equipo-demo.csv](examples/equipo-demo.csv) contiene datos ficticios para probar la
vista previa. Para completar la aceptación usa el correo de una cuenta de prueba
que puedas confirmar. Importar no crea cuentas ni contraseñas.

## Aceptación y revisión

1. El conductor ingresa o se registra con el correo indicado y confirma ese correo.
2. Abre **Mi cuenta → Activar mi acceso como conductor** y revisa la invitación del negocio.
3. Confirma la aceptación. Las invitaciones pendientes vencen a los 7 días; otra
   cuenta no puede aceptarlas aunque conozca su identificador.
4. Completa nombre, RUT y teléfono privados y envía a revisión de Gasway. El negocio
   se toma de la invitación: no hay un directorio para postular por cuenta propia.
5. Administración revisa mediante `supabase/admin/review-driver-application.sql`.
   Aceptación del negocio y revisión de Gasway aparecen como estados diferentes.
6. Ante rechazo, corrige el motivo y solicita una nueva invitación. Se conserva la
   auditoría anterior y la nueva revisión requiere consentimiento renovado.

El dueño que también reparte sigue el mismo flujo con su propia cuenta. Los encargados
pueden gestionar el equipo con su membresía, sin compartir contraseñas del dueño.

Las incorporaciones anteriores permanecen visibles. Una solicitud pendiente a otro
negocio debe resolverse antes de cambiar de incorporación. Conductores operativos
no se trasladan por este flujo. Habilitación suspendida es un estado informativo;
la suspensión administrativa completa todavía requiere su propio desarrollo.

## Regularización única de la cuenta de prueba antigua

La cuenta `a162a099-70dc-4e89-a4b8-8f9f872aa835` tenía habilitación heredada, sin
negocio, antecedentes ni revisión registrada. Se ejecutó como postgres
`supabase/admin/regularize-legacy-driver.sql`: conserva Auth, perfil, compras,
historial y la invitación pendiente, registra el estado previo en la tabla privada
`legacy_driver_regularizations` y deja la habilitación pendiente, sin disponibilidad.
La cuenta pasa temporalmente a acceso de cliente hasta la revisión administrativa.

En esa misma cuenta, recarga la app y abre **Mi cuenta → Activar mi acceso como
conductor**. Acepta la invitación existente de Gasway Demo Santiago, completa los
antecedentes y envía a revisión. No vuelvas a crear la invitación. Administración
resuelve con `supabase/admin/review-driver-application.sql` cuando estén completos.

Es una corrección administrativa acotada al UUID indicado, sin RPC ni pantalla
adicional. Repetirla no reinicia solicitudes aceptadas o revisadas. Rechaza cuentas
con afiliación, revisión anterior o entregas activas. El estado aprobado anterior
queda en la auditoría como evidencia heredada, sin inventar una aprobación humana.
Nuevas incorporaciones siguen requiriendo invitación del negocio y revisión de Gasway.

## Instalación y pruebas

**Mi negocio → Cobertura** permite al responsable elegir las comunas del negocio,
incluso sin conductores. También se abre desde Equipo y Catálogo. Todos los conductores
afiliados heredan esa cobertura; en Reparto → Cobertura solo la consultan y cambian
su disponibilidad. La aprobación de conducción sigue siendo administrativa.
Ver [panel del negocio](business-admin-ux.md) y ADR 0021.

La lectura de archivos añade expo-document-picker y expo-file-system. Si usas un
development build instalado antes de este cambio, recompílalo para incorporar los
módulos nativos. El formulario admite también contenido CSV pegado. No se ejecutó
una compilación ni una comprobación visual durante esta tarea.

Migración aplicada en Gasway: `20261019004638_business_driver_invitations.sql`.
Suite vigente: `supabase/tests/business_driver_invitations.sql`, autocontenida con
rollback. Assertions locales: `node scripts/test-team.cjs`,
`node scripts/test-driver-application.cjs` y `node scripts/test-driver-application-form.cjs`.

Migración de auditoría aplicada: `20261019021030_legacy_driver_regularization.sql`.
Prueba de la corrección real con fixtures y rollback:

```powershell
node scripts/build-legacy-regularization-test.cjs "$env:TEMP/gasway-legacy-regularization-test.sql"
.\node_modules\.bin\supabase.cmd db query --linked --project-ref gleltbrvpfvfgggcatpt --file "$env:TEMP/gasway-legacy-regularization-test.sql"
```

La prueba recorre permisos, auditoría privada, repetición, consentimiento del
conductor, bloqueo de aprobación prematura, rechazo y aprobación con afiliación.
Se ejecutó sin cambiar otras cuentas ni dejar fixtures. No se renderizó la app.

Antes de un piloto real siguen pendientes documentos vigentes de conductor, vehículo
y seguridad, además de reserva de stock y elección del vendedor al comprar.
