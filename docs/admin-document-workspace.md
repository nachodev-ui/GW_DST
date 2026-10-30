# Inicio admin y revisión por distribuidora

Implementado el 2026-10-26. Migración aplicada solo en Gasway Test por autorización
posterior del operador. Project está preparado para una promoción futura, desactivada
por defecto y sin cambios cloud. No se comprobaron pantallas.

## Acceso y navegación

`profiles.role` sigue admitiendo customer/driver: no se creó un rol SQL admin.
En Test, el resolvedor consulta `is_document_admin()` antes de elegir el inicio.
Project requiere además `EXPO_PUBLIC_ADMIN_DOCUMENT_WORKSPACE_ENABLED=true` en el
bundle de ese entorno; por defecto está desactivado. Otros proyectos no se activan
con ese flag. Es una selección de interfaz, nunca una autorización.
La fuente es `private.document_admins`, la misma de `review_document`; nunca el
correo ni `user_metadata`. No se agregó ni modificó ningún revisor. El correo
aportado por el operador identifica una cuenta de referencia, no concede acceso.

El revisor entra en `/admin`, con Inicio, Revisión y cierre de sesión. Los layouts
lo separan del cliente, reparto y negocio. El servidor vuelve a comprobar la
autorización en cada consulta o decisión; el guard de navegación no la sustituye.
El acceso se revalida con el ciclo de sesión/foco y polling existentes.

## Datos y contrato de lectura

La migración `20261027011123_admin_document_workspace.sql` sustituye solamente el
cuerpo privado de `list_pending_documents(timestamptz, uuid)`, conservando firma,
wrapper público invoker y ACL. No hay nuevos GRANT, políticas, tablas, bypass para
la cuenta ni cambios de `review_document` o Storage.

La respuesta pasa de una página de documentos a un envelope **version 2** con:

- Cinco indicadores calculados en SQL: distribuidoras con pendientes, documentos
  pendientes, vencimientos en 30 días, vencidos y total de distribuidoras.
- Las cinco distribuidoras cuyo pendiente es más antiguo, ordenadas por fecha/UUID.
- Una ficha resumida por distribuidora: pendientes, aprobados, rechazados,
  antigüedad y referencias de los vehículos/conductores con documentos.

La fecha de corte es del servidor en America/Santiago. Se excluyen versiones
`superseded` y `replaced`, y se prioriza un archivo actual por tipo. Vencimientos
consideran documentos pending/approved actuales con fecha:
desde hoy hasta hoy + 30 inclusive; vencidos son anteriores a hoy. Rechazados
no suman a los indicadores de vigencia. El progreso cuenta archivos actuales revisados
(approved + rejected), no requisitos cumplidos ni elegibilidad para repartir.
Todas incluye también distribuidoras sin documentos, sin inventar faltantes.

La app filtra fichas con estos conteos ya autorizados; no calcula totales globales
desde tablas. El envelope trae resúmenes completos para esta etapa de Test, sin
paginación documental ni imágenes, rutas de Storage, RUT o credenciales. El detalle
y las versiones se consultan con el `get_owner_documents` existente por paso.
Para un volumen mayor, paginar las fichas requerirá otro cambio de contrato.

**Cambio de contrato:** el único consumidor móvil anterior de la cola fue
reemplazado. Los parámetros de cursor se conservan por firma pero v2 exige ambos
null. Un cliente antiguo no es compatible con esta respuesta. Aplicar migración
y código de forma coordinada solo en Test. Con el backend anterior, el nuevo panel
muestra «Actualización del panel pendiente en este entorno»; nunca ceros ficticios.

## Revisión

**2026-10-27, ADR 0043:** cada tipo documental muestra una sola versión actual;
la versión pendiente tiene prioridad. El administrador encuentra un frente y un
dorso aunque se hayan enviado tres y dos veces respectivamente. Las anteriores
quedan en **Ver historial**, plegado y sin acciones de aprobación/rechazo.
Los conteos consideran archivos actuales por tipo.

La migración `20261027182010_replace_pending_documents` marca pendientes anteriores
del mismo titular/tipo como replaced, también en los datos ya acumulados. Conserva
archivos y autores, sin inventar revisores. Los reintentos no reactivan versiones
antiguas. El bloqueo compartido con review_document impide aprobar un archivo que
acaba de ser reemplazado. Una aprobación vigente se conserva durante reemplazos
pendientes o rechazados.

Pendientes es el filtro inicial; Todas muestra cada distribuidora. Los indicadores
de vigencia abren filtros específicos. Las fichas priorizan el pendiente más antiguo.
Cada ficha abre pasos estables por vehículo/conductor; aprobar el último pendiente
no elimina el paso ni mueve el índice. Anterior/Siguiente permiten volver y el
último paso resume el **estado actual de toda la distribuidora**, no solo decisiones
de esta visita. Nuevos titulares añadidos por otro revisor se incorporan al reabrir.

Vehículos muestran foto y patente; conductores muestran RUT y clase. No existe foto
de perfil documental de conductor en el contrato actual: se usa el ícono existente.
Imágenes tienen miniatura; PDF usa tarjeta/ícono PDF. Ver abre el visor interno de
imágenes/PDF existente, sin abrir enlaces externos. Las miniaturas del paso actual
usan URLs privadas de 60 segundos renovadas mientras está enfocado; no se persisten.

Solo el documento seleccionado ofrece Aprobar primario y Rechazar secundario
destructivo. Ver es secundario y la navegación cede prominencia a Aprobar. La hoja
de aprobación exige una fecha válida y confirmación explícita cuando corresponde;
editarla desmarca la confirmación. Rechazar admite motivos rápidos y texto libre,
sin exigir corregir la vigencia para poder rechazar. Envía la fecha existente.

Ambas decisiones llaman únicamente a `review_document`. Se bloquean cargas
propias en UI; la prohibición y la concurrencia siguen en SQL. No se autoaprueba
nada y no hay estados optimistas. Durante el envío se bloquean cierre/navegación;
los errores permanecen visibles. Aprobar no equivale a certificar autenticidad.

## Estado para probar

La migración **ya está aplicada en Test**. Actualizar/recargar el bundle desde este
checkout y entrar con el revisor existente; no se requiere recompilar el APK.
Typecheck aprobado en la implementación inicial. No hubo builds, lint, suites
adicionales ni verificaciones visuales.

## Aplicación en Test — 2026-10-26

- Destino explícito `xnrueexpwzvxotgwmamj`; marcador privado de Test confirmado.
- Runner `scripts/apply-admin-workspace-test.cjs`: acepta solo el ref de Test,
  rechaza Project y una versión ya aplicada. No ejecuta otras migraciones.
- Migración `20261027011123` registrada en el historial con su fuente íntegra.
  Precondiciones evitan crear funciones ausentes con permisos por defecto.
- En la misma transacción: contrato v2 consultado como un revisor existente,
  denegación a anon y authenticated sin membresía, y ACL/SECURITY DEFINER
  conservados en las funciones de lectura/revisión. Fallar abortaba el commit.
- Resultado: `applied`, `contract_v2`, `anonymous_denied`, `non_reviewer_denied`
  y `acl_preserved` verdaderos. Sin cambios de documentos, revisores ni datos demo.
- El conector estaba en otra cuenta; se usó la CLI autenticada con destino
  explícito y guard, sin relink ni imprimir credenciales. Project no fue consultado
  ni modificado en la nube.
- Typecheck final aprobado (código 0), incluyendo la activación futura por entorno.
  El enlace CLI local sigue apuntando a Project; no se cambió para desplegar Test.

Siguen pendientes en dispositivo: pasos estables, miniaturas, visor, confirmación
de fechas, decisiones reales/concurrentes y autoaprobación rechazada al operar.

## Promoción posterior a Gasway Project

La promoción futura debe incluir también ADR 0042/0043 y clientes que reconozcan
el estado replaced; el historial anterior se conserva para consulta.

1. Autorizar explícitamente ese despliegue futuro. Destino protegido:
   `gleltbrvpfvfgggcatpt`. No utilizar el runner de Test, sus cuentas, UUID ni semillas.
2. Inspeccionar el historial de Project en ese momento y aplicar sus dependencias
   pendientes en orden. Esta migración requiere el contrato documental
   `20261026170703_document_eligibility` y el workspace que lo precede. Hoy no se
   inspeccionó ni se afirma que esos prerrequisitos estén desplegados en Project.
3. Aplicar la misma migración portable `20261027011123_admin_document_workspace.sql`
   con el despliegue normal de migraciones e historial. No contiene ref de Test,
   correos ni datos demo. Conservar los ACL y verificar el contrato autenticado.
4. Usar revisores reales autorizados en `private.document_admins` de Project,
   provisionados allí de manera independiente; el flag nunca los crea ni habilita.
5. Distribuir código compatible con v2 apuntando a Project y establecer
   `EXPO_PUBLIC_ADMIN_DOCUMENT_WORKSPACE_ENABLED=true` en su entorno de bundle.
   La variable está documentada como false en `.env.example`; no se cambió `.env`.
6. Verificar ingreso y revisión en Project una vez autorizado. La promoción del
   endpoint y los clientes admin debe ser coordinada: la cola antigua no entiende v2.

Desactivar el flag oculta la nueva zona UI de Project, pero no revierte el SQL ni
sus permisos. No activar Project antes de completar los pasos de backend.

## Evidencia de reemplazos — 2026-10-27

- Migración 20261027182010 aplicada solo en Test, con el marcador y la referencia
  dedicados comprobados. Project no se consultó ni modificó.
- En la misma transacción se reprodujo el estado antiguo de tres frentes y dos
  dorsos pendientes y se ensayó la migración: dos pendientes, tres replaced y cinco
  registros conservados. Ese ensayo revirtió fixtures y DDL antes de la aplicación.
- Pasaron document_replacement.sql, document_eligibility.sql y
  driver_self_documentation.sql. Cubren reintentos, revisión de una imagen retirada,
  carga inválida, reemplazos por tipo, aprobaciones vigentes y permisos. No se
  ejecutaron pruebas nativas de concurrencia; el caso obsoleto usa la RPC real.
- Comparación antes/después: cantidad y rutas de documentos, metadatos de revisión,
  objetos de Storage y ACL/SECURITY DEFINER de RPC conservados. Fixtures revertidos.
- Consulta posterior del entorno: migración registrada, cero grupos con pendientes
  duplicados, dos pendientes actuales y tres envíos reemplazados.
- Typecheck y pruebas locales de agrupación/avance de licencia aprobados.
- Advisor: los mismos tres WARN documentados en driver-documentation-flow.md
  (funciones públicas existentes de elegibilidad y protección contra contraseñas
  filtradas desactivada); no se afirma un entorno sin avisos.

Falta verificar en el teléfono la vista inicial, expansión del historial y visor.
Recargar el bundle incorpora el nuevo estado y las vistas; no requiere recompilar.
