# Revisión documental de flota y conductores

Implementación: **2026-10-26**, ADR 0039. Revisión manual por administración de
Gasway; no certifica autenticidad ante Registro Civil ni habilitación legal.
La interfaz dice «Documentos revisados». No habilita por sí sola el piloto.

## Estado y activación

**2026-10-27, carga personal:** el conductor completa su licencia desde un asistente
de cuatro pasos. El negocio consulta su habilitación y conserva la documentación
de vehículos. La migración nueva restringe la escritura personal a su dueño;
revisión de Gasway y aprobación de reparto siguen separadas. La descripción de
cargas por el negocio que sigue es histórica. Aplicada solo en Test, con dos suites
SQL aprobadas y fixtures revertidos; typecheck y pruebas locales aprobados. Los
teléfonos siguen pendientes. [Flujo y evidencia](driver-documentation-flow.md).

**Rediseño admin (2026-10-26):** inicio propio y revisión por distribuidora, con la
misma lista privada de revisores, RLS y RPC de decisión. La migración de lectura v2
se aplicó posteriormente solo en Test, con contrato y permisos comprobados.
Project queda preparado pero desactivado y sin desplegar. Ver
[espacio admin documental](admin-document-workspace.md). La evidencia histórica
que sigue corresponde al contrato documental original.

**Ensayo desde teléfonos:** [demo persistente y recorrido manual](device-demo-test.md).
El 2026-10-26 se prepararon negocio, cuentas y prerrequisitos ficticios autorizados
en Test. Las regresiones SQL revertían sus datos; aprobarlas no dejaba una demo
lista para usar. Los documentos permanecen pendientes para cargar/revisar en la app.

- Migración `20261026170703_document_eligibility` aplicada **solo en Gasway Test**
  (`xnrueexpwzvxotgwmamj`). Gasway Project conserva su esquema anterior.
- Pasaron en Test los tres grupos SQL/RLS solicitados, con datos sintéticos
  revertidos: aislamiento de distribuidoras/Storage; revisión exclusiva por otro
  admin; disponibilidad, ofertas y aceptación/asignación con vigencia documental.
  Incluyen homologación válida hasta hoy, rechazo de reemplazo, idempotencia de
  envío y continuación de una entrega tras vencer un documento.
- UI implementada, sin renderizados, capturas, emuladores, lint ni suite completa.
  `npm run typecheck` aprobado (código 0). La comprobación visual y en dispositivos
  queda pendiente.
- `delete-document-owner` desplegada **solo en Test** el 2026-10-26, tras autorización
  explícita del operador para el borrado permanente. Estado `ACTIVE`, versión 1;
  petición POST sin sesión rechazada con HTTP 401 por la función. Esta comprobación
  no ejecutó borrados ni valida el flujo completo de eliminación/limpieza.
- Los administradores se provisionan en `private.document_admins`, nunca mediante
  metadata editable. La cuenta indicada por el operador fue creada y provisionada
  solo en Test, sin enviar correos; falta definir su contraseña inicial en Auth.

Para usar la app con este cambio, `apps/mobile/.env` debe contener la URL y
clave pública de **Test**, seguido de un reinicio de Expo. El operador informó
el cambio de ambas variables el 2026-10-26; no se inspeccionaron sus valores.
Gasway Project conserva su esquema anterior. Expo Go incluye ImagePicker y
ImageManipulator. El development build del Samsung se recompiló e instaló el
2026-10-26 con ambos módulos tras el error reportado al cargar fotos; firma y datos
conservados. [Evidencia del APK](expo-runtime.md). No se abrió ni comprobó visualmente
la app; la carga real de fotos queda por confirmar desde el dispositivo.

## Datos y vigencia

La carga de vehículos tiene un [asistente visual de siete etapas](vehicle-documentation-flow.md),
desde foto hasta resumen editable. La UI distingue formato válido, archivo guardado
y aprobación manual; no verifica el contenido automáticamente. Los saltos opcionales
de pruebas aparecen solo en Test y no cambian ninguno de los requisitos SQL siguientes.

Se reutilizan `distributor_vehicles`, `drivers`, `driver_applications.applicant_rut`,
el validador módulo 11, membresías y aprobación operativa existente. `make`, `model`,
`year`, `type` y `photo_path` amplían la flota; `drivers.license_class` indica la
clase cuya vigencia se está revisando. Las fechas viven solo en `documents.expires_on`.
La patente se normaliza a mayúsculas sin espacios/guiones, valida AB1234 o BCDF12 y
es única en la flota completa. Posibles duplicados históricos deben resolverse
antes de desplegar la migración en otro entorno; no se corrigen automáticamente.

Vehículo: padrón, permiso de circulación, SOAP, **revisión técnica o certificado de
homologación individual**, y foto con patente visible. La homologación requiere
archivo, vencimiento y aprobación; no existe una exención indefinida «no aplica».
No se presume que cualquier camión nuevo esté exento.
[Decreto 160, artículo 4](https://www.bcn.cl/leychile/navegar?idNorma=75497).

Conductor: frente y dorso aprobados. El vencimiento obligatorio corresponde al
dorso, capturando el **próximo control de la clase seleccionada** en el formato
vigente. En formatos anteriores puede figurar en el frente; se conservan ambas
caras y el admin confirma/corrige la fecha efectiva, incluidas prórrogas aplicables.
No se calcula una prórroga legal automáticamente.
[Decreto 23, artículo 4](https://www.bcn.cl/leychile/navegar?i=162769),
[formato anterior](https://www.bcn.cl/leychile/Navegar?idNorma=1100551&idParte=9775257).
El dorso guarda una instantánea de `license_class`: cambiar la clase exige un
dorso aprobado para esa nueva clase. Las clases admitidas para el registro de
carga son B, A2 antigua, A4 y A5; el sistema no certifica su compatibilidad legal
con un vehículo/carga determinados.

Cada archivo es una versión nueva. `submit_document` obtiene MIME/tamaño de
Storage y fija autor/estado; reintentar el mismo archivo devuelve su fila existente.
No hay UPDATE/DELETE directo del cliente, ni siquiera para distribuidores. La RPC
`review_document` exige admin actual y que sea distinto del autor; registra quién,
cuándo y la fecha confirmada sobre esa fila. Al aprobar supersede la aprobación
anterior del mismo tipo; rechazar o dejar pendiente un reemplazo conserva la
aprobación previa. Una versión de revisión técnica y una de homologación pueden
coexistir: basta una alternativa vigente. Vigencia inclusiva hasta el final del día
de `America/Santiago` (`expires_on >= hoy`).

Estado derivado: `approved` si cumple todos los requisitos, `rejected` si existe
rechazo vigente sin una aprobación vigente que lo cubra, `pending` en el resto.
La UI conserva versiones, motivos de rechazo y fechas vencidas/por vencer (30 días).
Patente y RUT quedan bloqueados después de cualquier aprobación, incluso si luego
se supersede. Para otra identidad se necesita un registro nuevo; no se copia cédula.

## Despacho y permisos

`private.is_driver_eligible` y `private.is_vehicle_eligible` son comprobaciones
documentales; sus wrappers públicos limitan la lectura al dueño/admin (y la
elegibilidad propia del conductor). No sustituyen `drivers.is_verified`, el rol,
la afiliación, la marca, cobertura, stock u horario existentes.

La disponibilidad del conductor exige su licencia y el vehículo concreto vinculado,
disponible y documentalmente elegible. La disponibilidad del vehículo exige sus
antecedentes y, si está vinculado, los del conductor. Se filtran ofertas y búsqueda
de vendedores; aceptación conserva el claim atómico y vuelve a comprobar bajo
locks. Un trigger también protege asignaciones en `orders`. Los errores `GD001`
y `GD002` distinguen conductor y vehículo, sin reutilizar los códigos de ofertas.
Una entrega aceptada puede avanzar/terminar después de un vencimiento. No hay jobs.

La migración apaga declaraciones previas de disponibilidad y deja los vehículos
antes disponibles como `inactive`; no inventa documentos ni aprueba datos demo.
No revoca la aprobación de acceso del conductor. Los nuevos vehículos se guardan
fuera de servicio; después se cargan foto/documentos y se solicita disponibilidad.

## Archivos y eliminación

Buckets privados `documents` y `vehicle-photos`, límite 5 MB; JPG/PNG y PDF solo en
documents. Rutas `{distributor_id}/{vehicle|driver}/{owner_id}/{uuid}.ext`.
El servidor comprueba pertenencia real, no solo el prefijo. Solo la distribuidora
dueña sube; dueña/admin leen mediante enlaces nuevos de 60 segundos. Sin upsert,
escrituras de revisión, borrados de Storage ni modificación de versiones desde el
cliente. La foto se selecciona con ImagePicker y comprime a ancho 1280/calidad 0,7.

La función de eliminación desplegada en Test valida el JWT en Auth, reautoriza la membresía
o admin en SQL y rechaza entregas activas. Respeta las FK de historial: no borra
conductores con pedidos/revisiones históricas incompatibles con su eliminación.
Una transacción elimina la entidad/documentos y guarda un ticket privado con todos
sus archivos, incluidos uploads aún no registrados y fotos anteriores. Después
el servidor elimina los objetos por Storage API. Si falla, repetir la misma
solicitud retoma el ticket; no hay job. No borrar filas directamente en SQL como
sustituto del flujo. Rechazados/superseded se conservan mientras exista la entidad;
la política más amplia de retención sigue pendiente.

## Operación y despliegue pendiente

Administración mínima en `/admin/documents`, accesible desde Tu cuenta para cuentas
provisionadas; el layout consulta capacidad actual y las RPC/RLS vuelven a imponerla.
Lista paginada, archivo y antecedentes del dueño, otras caras/versiones, fecha,
aprobación/rechazo con motivo. Un admin no puede revisar lo que él mismo cargó.

Para provisionar otra cuenta en Test, solo con autorización del operador:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
node scripts/security/provision-test-document-reviewer.cjs correo@example.cl
```

El script es exclusivo de Test; crea una cuenta confirmada sin correos ni clave
inicial si no existe. Configura su contraseña en Auth del proyecto **Test** antes
de ingresar; no se imprime/guarda ninguna contraseña ni clave de servidor.

Para repetir únicamente las comprobaciones autorizadas:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
npm run db:test:cloud -- --suite=document_eligibility.sql
```

`scripts/apply-document-test.cjs` ya aplicó la migración en una transacción que
exigió el marcador Test y aprobó estos tres grupos antes de registrar/confirmar
la migración. Rechaza aplicarla de nuevo. Los fixtures de suites previas se adaptaron
con antecedentes sintéticos postgres-only; no se ejecutaron esas suites adicionales.

Quedan pendientes la validación de dispositivos y una autorización independiente para desplegar la
migración/función en Gasway Project, provisionar sus revisores y completar los
antecedentes reales antes de reactivar la flota. No hay despliegue comercial.
