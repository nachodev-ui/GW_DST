# ADR 0015 — El negocio incorpora a su equipo de conductores

Fecha: 2026-10-18. Estado: implementado; migración 20261019004638 aplicada en Gasway cloud.

## Problema

La postulación pública hacía parecer que poseer un camión bastaba para ofrecer
reparto. El usuario aclaró que la distribuidora incorpora a sus conductores y pidió
gestión individual y eficiente para equipos de unas 50 personas, conservando la
habilitación administrativa y una sola app con permisos separados.

## Decisión

«Mi negocio → Equipo» sustituye el listado principal de postulantes. owner/manager
puede crear invitaciones individuales o importar hasta 100 mediante CSV con vista
previa. La creación individual y masiva comparten validación y RPC. No se crea una
cuenta Auth, contraseña ni rol driver en nombre de otra persona.

Cada invitación está dirigida a un correo. Aparece en «Mi cuenta → Activar mi acceso
como conductor» solo cuando auth.users confirma ese correo para auth.uid(). No se
autoriza mediante JWT email, user_metadata ni un correo enviado por el cliente.
Así se evita repartir 50 códigos y no se requiere enviar mensajes externos. El
responsable puede compartir instrucciones mediante el selector nativo, por acción
propia; la aplicación no envía correos automáticamente.

Aceptar reconoce el vínculo, sin habilitar reparto. La aceptación es personal,
explícita e idempotente, vence para invitaciones pendientes a los 7 días y falla si
fue cancelada. Una cuenta solo tiene una incorporación aceptada vigente; conductores
operativos no pueden trasladarse usando este flujo. Las invitaciones pendientes
de otros negocios no conceden acceso. Ser dueño no exime de aceptar con su propia
cuenta, completar antecedentes ni obtener la revisión de Gasway.

El conductor completa sus datos privados después de aceptar. El servidor fija el
negocio desde la invitación, crea una nueva versión de la solicitud y adjunta el
consentimiento del invitador. Administración conserva la decisión final. Ante un
rechazo, el negocio debe emitir otra invitación; no se recicla el consentimiento de
la revisión rechazada. El audit guarda invitación, invitador, aceptación y snapshot.

Las invitaciones y eventos viven en private con RLS y sin privilegios directos de
app/service_role. Nuevos endpoints públicos son wrappers INVOKER, implementaciones
privadas con auth.uid, search_path vacío y autorización explícita. Se revoca EXECUTE
móvil de request/reapply/submit abiertos, directorio y apertura de postulaciones.
Conservar funciones históricas sin permiso evita romper el historial de migraciones.

Las solicitudes anteriores no se borran ni aprueban automáticamente: siguen visibles
como incorporaciones anteriores y admiten confirmación manual de su versión. Una
solicitud pendiente a otro negocio no se sobrescribe al aceptar una nueva invitación.
Las afiliaciones y entregas existentes no se reasignan.

## Experiencia y límites

Equipo separa invitación pending/accepted/cancelled/expired de habilitación
incomplete/in_review/enabled/rejected/suspended. Es una vista del estado real; no
añade un botón de suspensión ni una autorización alternativa a drivers.is_verified.
Búsqueda y paginación de 20 evitan cargar 50 formularios. El CSV admite encabezados
nombre/correo o name/email, BOM, CRLF, coma/punto y coma y comillas; muestra errores
por fila y duplicados antes de confirmar. La revisión remota identifica invitaciones
ya existentes en todo el negocio, aunque no estén en la página visible.

expo-document-picker y expo-file-system se añaden con versiones compatibles con SDK
57 para seleccionar archivos CSV hasta 100 KB; también se admite pegar contenido.
Un development build previo necesita recompilarse. No hay soporte XLSX, envío de
emails, alta masiva de cuentas Auth ni recopilación de documentos sensibles por el
negocio. Conductor/vehículo/seguridad vigentes y sus vencimientos siguen pendientes
antes del piloto real, igual que la conexión comercial de stock a la compra.

## Validación

La suite business_driver_invitations.sql prueba aislamiento, correo confirmado frente
a metadata falsa, expiración/cancelación, lote de 50, idempotencia, privacidad, estados,
revisión final y auditoría, con fixtures revertidos. Se adaptan las suites de negocio
y confirmaciones históricas/despacho; las antiguas suites de postulación abierta son
históricas de sus migraciones y su reemplazo vigente es la nueva suite. Assertions
locales verifican CSV, contratos, formularios y aceptación explícita sin renderizar UI.
TypeScript y lint acotado pasan. Sin comprobaciones visuales ni ejecución de la app.
