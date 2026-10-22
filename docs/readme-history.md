# Notas históricas del README anteriores a la revisión

Conservadas el 2026-10-22 para mantener antecedentes, resultados reportados e
instrucciones de entregas anteriores. No describen el estado actual ni autorizan
ejecutar migraciones o suites antiguas. Algunos pasos y contratos fueron retirados.
Consultar [README vigente](../README.md), [roadmap](ROADMAP.md) y
[clasificación de suites SQL](../supabase/tests/README.md) antes de operar.

---

# Gasway

Gasway será una app para pedir cilindros de GLP a distribuidores locales de Chile.
Cliente y repartidor compartirán una app; el repartidor recibirá una oferta y podrá
aceptarla. Más adelante habrá un panel de administración web.

## Estado actual

Base inicial más autenticación por correo/contraseña, sesión segura en Android/iOS
y rutas protegidas de cliente y repartidor aprobado, con postulación en Mi cuenta.
El cliente puede crear pedidos, consultar su lista/detalle y cancelar antes de que
estén en camino. El repartidor aprobado puede configurar disponibilidad/comunas,
recibir ofertas, aceptar/rechazar, consultar su pedido y avanzar a en camino/entregado.
El cliente recibe actualizaciones automáticas y ve una línea de tiempo de eventos.
Sin tracking ni pagos en línea.

La compra ahora elige distribuidora por cobertura de comuna, producto y existencias,
con precio del negocio, reserva de stock y revisión previa en Gasway. WhatsApp es
una consulta secundaria con contacto comercial voluntario; no envía la dirección.
Horarios/ETA opcionales se editan en Mi negocio → Catálogo. Ver
[compra por distribuidora](distributor-shopping.md) para configuración y límites.
La migración `20261021205128_distributor_discovery.sql` pasó su prueba transaccional
y quedó aplicada en Gasway cloud con autorización explícita; RPC, permisos y RLS
verificados después de aplicarla.

El espacio de conductor usa ahora el sistema visual actual: **Ofertas, Cobertura y
Cuenta**, con negocio afiliado, bloqueo explicado, disponibilidad separada de los
borradores de cobertura y entrega con confirmación explícita. La entrada sigue
requiriendo habilitación de Gasway; aceptar una invitación no basta. Ver
[flujo del conductor](driver-workspace.md).
La migración inicial ya está aplicada en Supabase cloud, según lo informado por el
usuario. Esta tarea no ejecutó SQL en la nube. No hay notificaciones enviadas ni
servicios pagados activados. El pago del MVP será contra entrega.

## Stack

- Expo SDK 57 estable (expo 57.0.0), React Native 0.88 y React 19.3;
  versiones compatibles tomadas de bundledNativeModules de Expo y fijadas en lockfile.
- Expo Router y TypeScript strict; TanStack Query, Zustand, react-hook-form y zod.
- expo-location, expo-notifications, react-native-maps con Google Maps.
- Supabase: Postgres 17 + PostGIS, Auth, Realtime, Edge Functions y RLS desde el inicio.
- Theme central propio con oliva, lima, crema y salvia; Outfit para títulos y Figtree para lectura.
  Primitivas propias, animación, degradados y haptics sutiles.
  Tokens, componentes y accesibilidad en [sistema visual](design.md).
- Logos locales de producto en el cliente, con uso limitado y aviso de independencia; ver [límites de marcas](design.md#logos-de-marcas-de-productos).
- Fotografías originales por marca, tamaño y variante en catálogo, compra e historial.
  Inicio conserva el selector exploratorio neutro y la composición de las tres marcas;
  referencias y prompts en [recursos de cilindros](cylinder-assets.md).

Se subirá a Expo SDK 58 cuando esté estable y la Expo Go de la tienda lo soporte.

Fuentes: [Expo SDK 57](https://expo.dev/changelog/sdk-57),
[RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Cómo correrlo

Requisitos: Node 24 LTS y npm. Android requiere su SDK/JDK; una compilación local de
iOS requiere macOS/Xcode. Docker se necesita solo para Supabase local.

1. En un checkout nuevo ejecutar npm ci (el lockfile está versionado).
2. Copiar .env.example a apps/mobile/.env y completar solo claves públicas/restringidas.
3. Usar la URL del proyecto Supabase cloud y su clave pública publishable en
   EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
   Aplicar primero la nueva migración siguiendo la sección de autenticación.
   Docker no está disponible en este entorno; no ejecutar db:start ni db:reset.
4. Para instalar un development build en un dispositivo Android conectado:
   npm run android; en macOS, npm run ios para iOS. Estos comandos no se ejecutaron
   durante el scaffolding y requieren el entorno nativo correspondiente.
5. Para iniciar Metro después de instalar el development build: npm start.
   Seleccionar un dispositivo físico; sin sesión se muestra la pantalla de acceso.

Expo carga .env desde apps/mobile; un .env solo en la raíz no basta. Las claves de
Google Maps se leen en app.config.ts al compilar y requieren recompilar si cambian.
La ubicación en primer plano se solicita solo al pulsar «Usar mi ubicación» al pedir;
la dirección/comuna propuesta requiere revisión. No se guardan esas coordenadas.
Las notificaciones todavía no solicitan permiso ni envían avisos.
Para un futuro mapa usar PROVIDER_GOOGLE también en iOS. Las push remotas requieren
credenciales/configuración nativa posterior; no están activas en este scaffold.

La web (`npm run web`, Metro) es solo para pruebas de desarrollo; la sesión vive en
memoria y no persiste al recargar. Para la confirmación por correo, agregar
`http://localhost:8081` (o el puerto que use Expo web) a **Authentication → URL
Configuration → Redirect URLs** del proyecto Supabase. El registro web usa ese
origen como retorno; después de confirmar, iniciar sesión con correo y contraseña.
Ver [configuración de redirecciones](https://supabase.com/docs/guides/auth/redirect-urls).

## Comandos

| Comando                       | Uso                                                |
| ----------------------------- | -------------------------------------------------- |
| npm run typecheck             | TypeScript sin emitir archivos                     |
| npm run web                   | Expo web solo para pruebas de desarrollo           |
| npm run lint                  | ESLint del proyecto móvil                          |
| npm run format / format:check | Escribir / revisar formato propio                  |
| npm run db:start / db:stop    | Supabase local                                     |
| npm run db:reset              | Aplicar esquema y seed, destruyendo datos locales  |
| npm run db:lint               | Revisar SQL en la instancia local                  |
| npm run db:test               | Ejecutar futuros tests pgTAP; no hay suite todavía |
| npm run db:types              | Generar tipos reales desde Supabase local          |

No se entregan tipos de base de datos inventados: generar los tipos completos después
de aplicar la migración. Auth valida las respuestas de profiles/drivers con zod en
su frontera. La configuración se valida al inicializar Auth; errores bloquean acceso.

## Autenticación y roles

- Registro e ingreso con email/contraseña, validación react-hook-form + zod y mensajes es-CL.
- Si Supabase exige confirmar el correo, el registro informa que debe confirmarse
  antes de iniciar sesión. Esta entrega no implementa enlace de acceso automático
  ni recuperación de contraseña. Revisar las URLs de confirmación y la política
  de contraseñas del proyecto antes de distribuir la app.
- Android/iOS persisten sesión cifrada en expo-secure-store, en fragmentos pequeños
  para admitir tokens grandes. Refresco solo en primer plano; cierre local borra la
  sesión del dispositivo. En web la sesión es solo en memoria.
- El servidor crea cada perfil como customer. El negocio invita desde **Mi negocio →
  Equipo**; el conductor acepta con su correo confirmado y completa sus antecedentes
  desde **Mi cuenta → Activar mi acceso como conductor**. Las RPC de postulación
  abierta anteriores están retiradas; no concederles permisos de nuevo.
- Una fila drivers con is_verified=false indica acceso no habilitado. El estado de
  postulación pending/approved/rejected vive en driver_applications tras ADR 0009.
  Mi cuenta muestra estado, motivo y fecha; pendientes y rechazados pueden seguir comprando.
  Para entrar a la zona
  de repartidor deben coincidir profiles.role=driver y drivers.is_verified=true.
  La app consulta estos datos bajo RLS, al volver al primer plano, cada 30 segundos
  en primer plano y mediante el botón de revisión. Ante errores bloquea la navegación.
- Aprobar exige una operación administrativa confiable y transaccional que actualice
  ambas filas. No hay endpoint de aprobación móvil ni panel admin en esta entrega.

### Migración Auth aplicada

El usuario confirmó que `20261018020000_auth_roles.sql` ya está aplicada en cloud.
No volver a ejecutarla allí. Las instrucciones siguientes sirven para otro entorno.

En el SQL Editor del proyecto correcto de Supabase, con rol postgres, abrir y
ejecutar completo [20261018020000_auth_roles.sql](../supabase/migrations/20261018020000_auth_roles.sql).
Es posterior a la migración inicial y usa una transacción. No volver a ejecutar
la migración inicial ni el seed para este cambio. Si se usa CLI después, reconciliar
primero el historial de migraciones aplicadas manualmente para evitar reaplicarlas.

Después ejecutar completo [auth_roles.sql](../supabase/tests/auth_roles.sql), también
como postgres. La prueba verifica registro sin escalada por metadata, RLS, privilegios,
solicitud idempotente y rechazo de autoaprobación; revierte sus fixtures incluso en
autocommit. Se entrega sin ejecutar. La aprobación debe revisarse manualmente con
una cuenta de prueba desde una operación de servidor, nunca desde la app.

Ver [ADR 0005](decisions/0005-auth-and-roles.md). Pruebas locales sin red:
`node scripts/test-auth.cjs`.

### Distribuidores y revisión: primera fase

Referencia histórica: la incorporación abierta descrita en las primeras fases se
reemplazó por [Equipo e invitaciones](driver-team.md). Las decisiones y datos
anteriores se conservan; las nuevas incorporaciones parten del negocio.

Aplicada [migración de distribuidores](../supabase/migrations/20261018195303_distributors_driver_review.sql),
posterior a `20261018050000`. Modela negocios, responsables owner/manager y una
afiliación por conductor. No cambia los roles móviles customer/driver.

Aplicar el archivo completo como postgres en SQL Editor del proyecto correcto y
ejecutar después [la suite transaccional](../supabase/tests/distributors_driver_review.sql).
Luego [revisar solicitudes](../supabase/admin/review-driver-application.sql): aprobación
requiere distribuidor verificado; rechazo requiere motivo; ambas decisiones registran
operador y fecha. El motivo es visible al postulante bajo RLS; la auditoría es privada.
La referencia manual del operador no concede permisos. El script de aprobación de
cuenta de prueba ahora requiere esta migración, un negocio verificado y un operador.

El 2026-10-18 se confirmó el proyecto `gleltbrvpfvfgggcatpt` (Gasway Project), se
verificó el esquema previo hasta `20261018050000` y se concilió el historial de las
cuatro migraciones manuales. La CLI aplicó únicamente `20261018195303`, como postgres.
La suite SQL completa pasó y los conteos antes/después confirmaron rollback de todos
sus fixtures. RLS está activo en las cuatro tablas nuevas. Los advisors de seguridad
solo advirtieron que la protección de Auth contra contraseñas filtradas está desactivada.

La migración conserva acceso y datos existentes, sin inventar afiliaciones. Se listó
y rechazó la solicitud pendiente por instrucción explícita del usuario; se verificaron
motivo, auditoría, acceso de conductor deshabilitado y cero solicitudes pendientes.
No hay distribuidores registrados; aprobar nuevas solicitudes exige negocio verificado
y vinculación confirmada. La app ya muestra rechazo/motivo y permite seguir comprando;
el formulario ya registra datos y distribuidor solicitado. Faltan el alta comercial
en la app, la interfaz de confirmación del negocio y vincular conductores anteriores.
Precios/stock, identificación del vendedor en el pedido y despacho por negocio siguen
pendientes; tampoco hay panel web ni suspensión. Ver [ADR 0009](decisions/0009-distributors-and-driver-review.md).

### Respuesta al postulante y nueva solicitud

Mi cuenta muestra la postulación propia, su motivo y fecha de revisión. La consulta
usa zod, se actualiza al volver al primer plano, cada 30 segundos y manualmente;
un fallo de consulta no bloquea comprar. Los enlaces antiguos `/pending` abren Mi cuenta.
Solo rol driver y verificación operativa habilitan las rutas de repartidor.

Tras un rechazo, «Volver a postular» abre el formulario para corregir antecedentes
y confirmar que el usuario revisó y resolvió el motivo. «Confirmar nueva solicitud»
llama submit_driver_application() con intención explícita de nueva postulación;
exige identidad propia, perfil customer, sin habilitación ni entrega activa.
Vuelve a pending sin aprobar ni afiliar y conserva las revisiones anteriores en
auditoría privada. Reintentar una solicitud pendiente no cambia su fecha; request_driver_access()
por sí sola nunca borra un rechazo.

Aplicada en Gasway cloud [20261018205226_driver_reapplication.sql](../supabase/migrations/20261018205226_driver_reapplication.sql).
La [suite SQL](../supabase/tests/driver_reapplication.sql) pasó y revierte sus datos temporales.
Pasaron `node scripts/test-auth.cjs`, `node scripts/test-driver-application.cjs`, un
typecheck y lint acotado. Sin abrir la app ni hacer verificaciones visuales. Ver
[ADR 0010](decisions/0010-applicant-status-and-reapplication.md) y probar en dispositivo antes del piloto.

### Formulario de postulación y distribuidor solicitado

Desde Mi cuenta, «Quiero ser repartidor», «Completar mi postulación» o «Volver a
postular» abre un formulario con nombre, RUT, teléfono de contacto y distribuidor.
Zod normaliza entradas y SQL vuelve a validar RUT módulo 11 y teléfono chileno.
El envío no concede afiliación ni acceso. Los datos son privados bajo RLS;
cada revisión nueva conserva una copia privada de los antecedentes enviados.

La lista solo muestra id/nombre de negocios con is_verified=true y
accepts_driver_applications=true. Este último indicador empieza en false y solo
lo cambia un operador confiable tras confirmar que el negocio desea recibir
postulaciones. No hay negocios registrados actualmente: se muestra un estado vacío
y se mantiene la compra disponible, sin crear distribuidores ficticios.

Aplicada [20261018211559_driver_application_details.sql](../supabase/migrations/20261018211559_driver_application_details.sql).
Pasaron la suite nueva y las de revisión/nueva postulación anteriores, con fixtures
revertidos y conteos reales intactos; también pruebas locales, typecheck y lint acotado.
El script [de revisión SQL](../supabase/admin/review-driver-application.sql) muestra ahora
los antecedentes; aprobar exige datos completos y el distribuidor elegido. Ver
[ADR 0012](decisions/0012-driver-application-details.md) para alta manual y límites.

Para un ingreso rechazado, ver [diagnóstico de Auth](auth-troubleshooting.md).
En PowerShell 7, `pwsh -File ./scripts/diagnose-login.ps1` prueba el acceso directo
con contraseña oculta, sin imprimir tokens, y cierra solo su sesión de diagnóstico.
La misma guía incluye `reset-auth-password.ps1` para reemplazar una contraseña
mediante Auth Admin, solo en la terminal del propietario con su clave oculta.

## Contexto operativo y confirmación del negocio

El contexto verificado del mercado chileno y la distinción negocio/conductor están
guardados en [market-context-chile.md](market-context-chile.md).

La base ya exige confirmación del negocio antes de la aprobación final de Gasway.
Un responsable autenticado lista las postulaciones propias del negocio mediante
list_distributor_driver_applications() y confirma su versión exacta con
confirm_driver_affiliation(driver_id, requested_at). No recibe RUT/teléfono ni
habilita conductores por sí mismo. «Mi negocio» permite hacerlo con su propia sesión.

Las marcas se configuran en distributor_brands, sin presumir exclusividad universal.
Ofertas y aceptación verifican negocio/marca; las compras nuevas fijan vendedor al
crear el pedido y solo su negocio puede aceptarlo. Los históricos sin vendedor lo
siguen fijando al aceptar.
Un conductor anterior sin afiliación conserva acceso e historial, pero requiere
regularizar el negocio y sus marcas para recibir ofertas nuevas. Las entregas ya
asignadas pueden terminar. El precio por negocio y la identificación del vendedor
antes de comprar siguen [ADR 0018](decisions/0018-distributor-shopping-and-contact.md).

No se rechaza un envase solo por su marca ni se agrega un recargo por cambiarla;
su seguridad y características deben revisarse. «Necesito envase» evita presumir
su compra en propiedad. Se registra la marca devuelta; faltan tipo/condición y
logística inversa completos. El precio sin canje incluye el envase según el negocio.

## Mi negocio y entorno de prueba

En **Mi cuenta → Mi negocio** se registra una distribuidora o se gestiona la que
corresponda a la membresía autenticada. Los repartidores acceden desde «Mi negocio»
en su pantalla de ofertas. La sección tiene rutas y feature propias: una membresía
owner/manager no cambia profiles.role ni habilita conducción. Un mismo usuario
puede ser cliente, responsable del negocio y conductor si obtiene cada permiso.

El alta registra nombre, RUT, responsable/contacto, recinto, comuna CUT, marcas y
referencias privadas de antecedentes comerciales/seguridad. Administración resuelve
como postgres con [review-distributor-application.sql](../supabase/admin/review-distributor-application.sql),
motivo, versión exacta y auditoría. No se suben documentos todavía: las referencias
declaradas no sustituyen contrastar evidencia vigente para operar realmente.

La gestión incluye **Equipo**, invitaciones personales, importación CSV con vista previa,
estados de invitación/habilitación separados y catálogo propio con precio CLP, stock e inclusión por
producto. Las escrituras se validan en el servidor; las revisiones evitan sobrescribir
cambios de otro encargado y conservan auditoría de precio/stock. Las compras nuevas
usan **create_distributor_order** con estos precios, vendedor elegido, reserva de
stock y liberación al cancelar. La creación móvil con precio global queda retirada.

**Mi negocio** presenta un resumen con tarjetas hacia Datos del negocio, Equipo,
Cobertura y Catálogo. Cobertura permite revisar comunas y conductores, su disponibilidad
y los motivos de bloqueo, con búsqueda y detalle en hojas. El responsable elige
las comunas del negocio; todos sus conductores las heredan. Reparto → Cobertura
es una consulta, y el conductor solo modifica su disponibilidad. Productos e invitaciones se editan o crean en modales. Equipo separa
Conductores e Invitaciones, con filtros por estado y carga incremental sin páginas
numeradas. Los conteos parciales se marcan con `+` hasta cargar todos los registros.
Detalles y límites de los datos en [panel del negocio](business-admin-ux.md).

Por autorización explícita se creó **Gasway Demo Santiago**, marcado is_demo=true,
para `a30a8236-175c-424d-9bf4-ff753d695649`, con dirección/contacto/antecedentes
ficticios, comuna 13101 y Lipigas. La revisión dice expresamente que es una prueba.
[create-demo-business.sql](../supabase/admin/create-demo-business.sql) es repetible sin
reiniciar precios/stock editados; no crea usuarios ni aprueba conductores. Ver el
[paso a paso de prueba](business-demo.md) y [ADR 0014](decisions/0014-business-workspace-and-demo.md).

Migraciones `20261018215921` y `20261018220732` aplicadas en Gasway cloud.
La suite [business_onboarding.sql](../supabase/tests/business_onboarding.sql) verifica
aislamiento, permisos, rechazo/reenvío/reintentos, versión, revisión administrativa,
membresías, catálogo y auditoría con fixtures revertidos. Validaciones locales:
`node scripts/test-business.cjs` y las regresiones de postulación de conductor.

La migración `20261019004638_business_driver_invitations.sql` reemplaza el directorio
de postulación por invitaciones emitidas por owner/manager. Se pueden crear hasta
100 por lote; vencen a los 7 días y solo las acepta la cuenta con el correo confirmado
registrado en Auth, sin confiar en metadata. No se crean contraseñas ni usuarios desde
el negocio. Las invitaciones aparecen dentro de Gasway: no se enviaron ni se envían
correos automáticamente. Compartir instrucciones requiere la acción del usuario.

La planilla admite CSV UTF-8 con `nombre,correo`, coma o punto y coma, comillas y BOM;
permite seleccionar archivo o pegar contenido, marca errores/duplicados y requiere
confirmar la vista previa. Equipo ofrece búsqueda y carga incremental de 20 registros.
La aceptación no habilita reparto. Una revisión rechazada requiere otra invitación del
negocio y mantiene su auditoría. Ver [guía](driver-team.md),
[CSV de ejemplo](examples/equipo-demo.csv) y [ADR 0015](decisions/0015-business-led-driver-invitations.md).

Se añadieron expo-document-picker y expo-file-system compatibles con SDK 57 para leer
el CSV. Un development build instalado debe recompilarse para incorporar esos módulos;
el pegado de CSV es una alternativa de entrada. No se compiló ni abrió la app en esta tarea.

## Espacio del conductor

Las rutas `/driver`, `/driver-coverage` y `/driver-account` tienen navegación propia
dentro de `(driver)` y siguen protegidas por perfil/driver verificado. `/driver-order/[id]`
es el detalle de la entrega asignada y no muestra dirección antes de la aceptación.
El servidor expone solo el contexto propio mediante `get_my_driver_workspace()`:
negocio, marcas, habilitación y motivo de bloqueo, sin cambiar permisos ni revelar
datos de otros conductores. «Gestionar mi negocio» aparece solo con membresía confiable.

Los conductores aprobados pueden entrar a las rutas de compra mediante **Cuenta →
Comprar como cliente**, y volver desde Mi cuenta. La navegación no cambia roles;
solo las rutas de conductor requieren aprobación. Realtime de compras sigue usuario,
foco del layout y AppState, conservando limpieza y canales independientes.

Migración `20261019011756_driver_workspace.sql` aplicada. Suite
[driver_workspace.sql](../supabase/tests/driver_workspace.sql) aprobada: invitación,
aceptación, revisión, cobertura, oferta privada, asignación y entrega, más bloqueos
por negocio/marcas/habilitación y compra propia, con fixtures revertidos.
Assertions locales: `node scripts/test-driver-workspace.cjs`,
`node scripts/test-driver-offers.cjs` y `node scripts/test-driver-order-progress.cjs`.
No se inició la app ni se hicieron comprobaciones visuales.

## Estructura

```text
apps/mobile/
  app/                  # Rutas delgadas y navegación protegida
  src/features/         # auth implementado; otras features reservadas
  src/shared/           # providers, config, payments y espacios reutilizables
  src/theme/            # colores, tipografía, espaciado y radios
supabase/
  migrations/           # esquema, RLS y RPC de aceptación atómica
  tests/                # SQL transaccional autocontenido para SQL Editor
  functions/            # reservado para Edge Functions
  seed.sql              # 12 combinaciones de marca/peso, sin precios ficticios
  config.toml           # entorno local
scripts/                # generación de tipos
.agents/skills/          # expo-*, gasway-domain, caveman y napkin
.claude/napkin.md        # memoria breve usada por Napkin también en Codex
docs/                   # arquitectura, dominio, roadmap, skills, ADRs
```

## Roadmap

1. Ejecutar las pruebas SQL preparadas; validar concurrencia real en dos sesiones y generar tipos.
2. Validar ofertas con cuentas reales; migraciones hasta distribuidores confirmadas en cloud.
3. Catálogo/precios por distribuidor e idempotencia; pedidos y ofertas implementados.
4. Validar progreso de entrega y Realtime; tracking y push quedan para otra tarea.
5. Piloto local y panel admin web; evaluar gateways después del MVP.

Ver [roadmap](roadmap-history.md), [arquitectura](architecture.md),
[dominio](domain.md) y [skills instaladas y pendientes](skills.md).

## Costos

Desarrollo local primero y Supabase Free dentro de sus límites; sin altas automáticas
ni planes de pago. Google Maps exige configuración de Google Cloud y sus condiciones
de facturación deben revisarse antes del piloto. El scaffold deja las claves vacías
y no usa APIs de rutas/geocoding. Tampoco promete que publicar en tiendas o usar
servicios externos sea gratuito: esas decisiones quedan pendientes del presupuesto.
Ver [ADR de costos](decisions/0003-free-services.md).

## Pedidos del cliente y disponibilidad cloud

La compra vigente usa `create_distributor_order`: dirección/comuna CUT, marca y
formato, cantidad, canje y distribuidora elegida. Precio y stock proceden de
`distributor_products`; el precio global de `products` queda solo como dato histórico.
El servidor revisa precio, reserva existencias y exige poder emitir una oferta a
un conductor del negocio. Cancelar devuelve la reserva una sola vez.

La búsqueda muestra stock publicado incluso sin cobertura, e informa por separado
si hay reparto habilitado para la comuna y un conductor disponible. El botón explica
si falta precio, cobertura, horario o disponibilidad. No se registran solicitudes
nuevas en espera de repartidores: aún no existe redespacho automático.

Diagnóstico de Gasway cloud del 21 de octubre: **sí hay stock** de Lipigas en
Gasway Demo Santiago (5 kg: 12; 11 kg: 11; 15 kg: 12; 45 kg: 9). Los productos están
publicados con precio con canje. **No hay ningún conductor habilitado y afiliado**:
las dos filas de drivers están sin verificar, no disponibles, sin negocio y con
perfiles customer. Eso impide comprar. Sin canje también faltan los cuatro precios
con envase. Gasco/Abastible no tienen ofertas del negocio.

Se debe completar invitación, postulación y aprobación administrativa del conductor,
elegir las comunas desde Mi negocio → Cobertura y activar la disponibilidad del conductor. El cliente usa otra cuenta,
ya que el conductor no puede aceptar su propio pedido. El responsable configura los
precios sin canje en Mi negocio → Catálogo. No se alteraron stock, precios ni roles.

La migración `20261021224033_clarify_inventory_availability.sql` está aplicada en
cloud. La suite SQL completa pasó con rollback antes de aplicarla, incluidas compra,
reserva, cancelación, idempotencia, RLS y rechazo sin cobertura/conductor. Las suites
Node de pedidos y disponibilidad y el typecheck final pasaron. La lectura posterior
como cliente autenticado confirmó stock intacto y ausencia de cobertura/conductor;
RLS y permisos se conservaron. No se abrió la app ni se hicieron pruebas
visuales. Configuración, límites y resultados en la [guía vigente de compra](distributor-shopping.md)
y [ADR 0019](decisions/0019-inventory-and-delivery-readiness.md).
Las migraciones y fixtures del contrato `create_order` se conservan como históricos;
no se deben usar como instrucciones actuales de compra.

## Validación de Auth (entrega anterior)

La entrega Auth reutiliza las dependencias instaladas, sin instalar paquetes.
Pasaron las assertions locales para validación, selección de zona y almacenamiento
seguro simulado. El typecheck posterior a la corrección de AppState y a la alineación
con SDK 57 pasó en una sola ejecución autorizada antes del commit.
Sin emuladores, capturas, renders,
verificación visual ni llamadas al proyecto cloud. Las pruebas SQL y el flujo en
dispositivo real quedan pendientes. La CLI local falló al intentar escribir telemetría
fuera del workspace; el nuevo archivo SQL se preparó directamente.

## Pruebas SQL de la migración inicial

Abrir el SQL Editor del dashboard de Supabase con rol postgres, pegar **todo**
[supabase/tests/initial_schema.sql](../supabase/tests/initial_schema.sql) y ejecutar
el único bloque DO completo. No necesita seed, pgTAP ni estado previo de sesión.
Cada incumplimiento produce un error FAIL; con éxito emite un NOTICE por verificación y revierte
usuarios, perfiles, pedidos, ofertas, eventos y cualquier producto creado mediante
una subtransacción interna, también en autocommit. Un error inesperado revierte el DO
y se propaga. Las secuencias de eventos pueden avanzar aunque se reviertan las filas.
No ejecutar fragmentos. Esta suite es SQL directo, no una suite pgTAP para db:test.

La política inicial oculta los pedidos ofrecidos sin asignar, incluso al destinatario;
las pruebas conservan ese límite de privacidad. La aceptación se prueba en secuencia;
una carrera real requiere dos conexiones. Ver [detalle y decisión](decisions/0004-initial-migration-tests.md).
El seed contiene solo las 12 combinaciones de marca/peso y no es necesario para probar.

## Ofertas del repartidor: aplicación y pruebas pendientes

Migración confirmada en cloud e historial conciliado el 2026-10-18. Su suite SQL
sigue pendiente. Para otro entorno, en SQL Editor con rol postgres:

1. Confirmar las tres migraciones previas aplicadas; Auth y pedidos cliente ya fueron
   confirmadas por el usuario. No volver a ejecutarlas.
2. Ejecutar completo [20261018040000_driver_offers.sql](../supabase/migrations/20261018040000_driver_offers.sql),
   incluidos BEGIN/COMMIT. Mantener el historial manual reconciliado antes de usar CLI.
3. Ejecutar el único DO completo de [driver_offers.sql](../supabase/tests/driver_offers.sql).
   Esperar NOTICE PASS; revierte fixtures incluso con autocommit. Las secuencias pueden avanzar.
   La suite [customer_orders.sql](../supabase/tests/customer_orders.sql) ahora admite requested/offered al crear.
4. Con una cuenta de prueba registrada, solicitar acceso desde la app. Copiar su UUID
   de Auth y reemplazar el marcador en [approve-test-driver.sql](../supabase/admin/approve-test-driver.sql).
   Ejecutar el archivo completo **solo en SQL Editor como postgres, nunca desde la app**.
5. Volver a abrir la app o revisar aprobación; elegir comunas CUT, guardarlas y activar
   disponibilidad. Desde otra cuenta crear un pedido nuevo en una de esas comunas
   con producto activo y precio configurado. La oferta vence en 60 s.
6. Revisar permisos/advisors, generar tipos reales y probar una carrera con dos sesiones.

Las ofertas muestran producto, cantidad, canje, comuna y total; dirección/notas solo
tras aceptar. Las pantallas del grupo `(driver)` se protegen por rol y aprobación.
La app consulta cada 5 s únicamente con pantalla enfocada y aplicación activa.
Ante respuesta de aceptación perdida, actualizar y abrir «Ver mi pedido asignado»;
las mutaciones no se reintentan automáticamente. La RPC distingue «ya fue tomado por
otro repartidor», oferta vencida/rechazada y permisos insuficientes.

Sin candidatos, el pedido queda requested; ofertas vencidas o rechazadas dejan offered.
No hay redispatch automático al activar disponibilidad ni barrido de pedidos anteriores;
probar con un pedido nuevo. Cambiar cobertura/desactivarse vence ofertas afectadas.
La aceptación desactiva disponibilidad y un pedido activo impide reactivarla. Tras
cancelación o entrega puede reactivarse manualmente en la pantalla de ofertas.

Pendiente: ejecutar las suites SQL de ofertas, validar concurrencia real,
red/reinicio y dispositivo físico. Sin verificaciones visuales ni dependencias nuevas.
Ver [ADR 0007](decisions/0007-driver-offers.md). Assertions sin red:
`node scripts/test-driver-offers.cjs` aprobadas, incluyendo pausa del polling por
foco/AppState; también pasaron las assertions existentes de pedidos cliente.
`npm run typecheck` aprobado en una única ejecución; ESLint de los archivos móviles
modificados aprobado. Las pruebas SQL se entregan preparadas, sin ejecutar.

## Progreso del pedido y actualización automática

El repartidor asignado usa «Salir a entregar» y luego «Marcar como entregado», con
confirmación antes de entregar. La RPC solo permite accepted → on_the_way → delivered;
el pedido entregado deja de estar activo. Se conservan los triggers de estados/eventos
y las políticas RLS. No hay tracking, mapas, push, pagos en línea ni cancelación driver.

El layout cliente suscribe sus pedidos mediante Realtime e invalida lista, detalle y
eventos. Si no está conectado, consulta cada 15 s solo en primer plano; al volver a
la app o reconectar también actualiza. El desmontaje elimina canal/listener/intervalo.
Cada suscripción usa un nombre de canal distinto para permitir volver desde Mi negocio
o remontar el layout mientras termina la eliminación asíncrona del canal anterior.
La línea de tiempo muestra los estados alcanzados según order_events, con zod,
theme central y textos es-CL. Sin nuevas dependencias.

Migración confirmada en cloud e historial conciliado el 2026-10-18; su suite SQL
sigue pendiente. Para otro entorno:

1. En SQL Editor como postgres, confirmar que se aplicaron las migraciones anteriores,
   incluida `20261018040000_driver_offers.sql`.
2. Ejecutar completo [20261018050000_driver_order_progress.sql](../supabase/migrations/20261018050000_driver_order_progress.sql).
3. Ejecutar completo [driver_order_progress.sql](../supabase/tests/driver_order_progress.sql):
   un solo DO con rollback interno. Debe terminar con avisos PASS; cualquier error
   indica fallo. No conserva fixtures; las secuencias pueden avanzar.
4. Pendiente: verificar con cliente/repartidor reales, desconexión y retorno a primer
   plano, cambio de cuenta y carreras con cancelación en dos conexiones.

Assertions locales sin red: `node scripts/test-driver-order-progress.cjs`.
Validación de esta entrega: assertions de progreso, ofertas y pedidos aprobadas;
lint de los archivos móviles modificados y único `npm run typecheck` aprobados.
Sin ejecución SQL, emulador, capturas ni verificaciones visuales.
Ver [ADR 0008](decisions/0008-driver-order-progress.md).

