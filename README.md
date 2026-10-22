# Gasway

Gasway es una aplicación en desarrollo para comprar cilindros de GLP a
distribuidoras locales de Chile. Una sola app reúne cliente y repartidor; los
responsables gestionan su distribuidora mediante membresías independientes del rol
de conducción. El panel administrativo web queda para una etapa posterior.

## Estado actual

Hay flujos implementados sobre Supabase; el proyecto ya supera el scaffold inicial,
pero todavía requiere validación y trabajo antes de un piloto real.

| Área          | Disponible en el código                                                                                                                                                     | Pendiente                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Acceso        | Registro/ingreso por correo y contraseña, sesión segura nativa, guards y consulta de permisos de servidor.                                                                  | Recuperación de contraseña dentro de la app y validación completa de enlaces/sesión en dispositivos. |
| Cliente       | Dirección y comuna CUT, marca/formato/variante, cantidad, canje explícito, selección de distribuidora, revisión, compra, historial, detalle, cancelación y eventos.         | Resolver automáticamente pedidos sin asignación y ampliar regresiones de concurrencia.               |
| Distribuidora | Alta y revisión administrativa SQL; catálogo con precio CLP, stock/publicación, horarios/ETA/contacto opcionales; equipo, invitaciones individuales/CSV y cobertura propia. | Panel admin web, suspensión operativa y verificación de evidencia vigente para negocios reales.      |
| Repartidor    | Invitación aceptada y postulación, aprobación administrativa, Ofertas/Cobertura/Cuenta, disponibilidad, aceptación/rechazo y avance a en camino/entregado.                  | Push y tracking; la cobertura se hereda del negocio y el conductor solo edita disponibilidad.        |
| Backend       | Migraciones Postgres/PostGIS, RLS, RPC, asignación atómica, reserva/liberación de stock e idempotencia de compra.                                                           | Tipos generados integrados, pruebas de concurrencia real y revisión del entorno concreto del piloto. |

El cliente recibe cambios de sus pedidos por Realtime y polling de respaldo en
primer plano. El repartidor consulta ofertas cada 5 s con pantalla enfocada y app
activa. La aceptación es atómica en Postgres y no revela dirección antes de asignar.
El pago habilitado es **efectivo contra entrega**: no hay gateway, tracking ni envío
de notificaciones. `supabase/functions/` está reservado, sin handlers implementados.

La compra vigente usa precios y stock de `distributor_products`, con vendedor
elegido y clave idempotente; `create_order` y el precio global son históricos.
Stock, cobertura y disponibilidad son condiciones distintas. Una compra nueva exige
poder emitir oferta; no hay redespacho automático de ofertas vencidas. WhatsApp es
una consulta secundaria al contacto comercial voluntario y no envía la dirección.
La configuración y límites están en [compra por distribuidora](docs/distributor-shopping.md).

La revisión del **2026-10-22** detectó 25 paquetes afectados en npm (19 altos y 6
moderados, con avisos transitivos compartidos), ausencia de CI/cobertura medida,
tipado SQL pendiente y suites históricas que necesitan clasificación. No se volvió
a comprobar el cloud ni se ejecutaron pruebas o la app durante esta revisión.
Detalles, fuentes y límites: [informe técnico](docs/review-2026-10-22.md).
Plan priorizado: [docs/ROADMAP.md](docs/ROADMAP.md).

DT-01 aplica parches de Expo 57/Router/Location y ESLint y retira la cadena antigua de uuid.
La auditoría posterior baja a **22 paquetes afectados** (19 altos y 3 moderados).
Persisten excepciones temporales con responsable y vencimiento: braces y node-forge
sin parche, dependencia de decodificación de Router y ESLint 9 sin soporte. El parser
configurado usa URLSearchParams; su exposición debe verificarse antes del piloto. Alcance, medidas y
validación en [seguridad de dependencias](docs/dependency-security.md).

DT-02 añade `npm test`, cobertura de siete módulos críticos y CI Linux/Windows con
tipos, lint y formato. Hay 12 suites Node y una PowerShell; siete SQL vigentes y
nueve históricos clasificados. El proyecto separado **Gasway Test** recibe las
migraciones y regresiones con rollback. Configuración y límites: [pruebas](docs/testing.md).

## Stack

- npm workspaces; Expo SDK 57: rango `^57.0.31`, lockfile **57.0.31**.
- App móvil: **React Native 0.86.3**, **React/React DOM 19.2.3**, Expo Router y
  TypeScript 6 estricto. Estas son las versiones resueltas desde `apps/mobile`,
  coherentes con `bundledNativeModules` del Expo instalado.
- TanStack Query para datos remotos; react-hook-form + zod para formularios y
  fronteras externas. Zustand está instalado y reservado para estado UI.
- Supabase JS 2.118.0, CLI 2.121.0; Postgres 17 configurado, PostGIS, Auth, Realtime
  y RLS. La lógica confiable actual vive principalmente en SQL/RPC.
- SecureStore para sesión/dirección recordada nativas; ubicación en primer plano
  a demanda. Mapas Google y notificaciones configurados para desarrollo futuro.
- Theme propio, tokens centrales, Outfit/Figtree, primitivas, animación y haptics.
  Ver [sistema visual](docs/design.md), [recursos de cilindros](docs/cylinder-assets.md)
  y [aviso de marcas](apps/mobile/assets/brands/NOTICE.md).

El registro ya ofrece versiones superiores, incluido Expo 58. Actualizar el SDK
requiere una tarea separada que preserve su matriz nativa; una versión `latest`
superior no demuestra por sí sola incompatibilidad o vulnerabilidad.

## Instalación

Requisitos: **Node 24** según `.nvmrc`, npm y acceso al proyecto Supabase correcto.
Para Android se necesita SDK/JDK; compilar iOS localmente requiere macOS/Xcode.
La app usa un **development build**. Los módulos nativos añadidos, como selector de
documentos/archivos, requieren recompilar el build instalado.

Desde la raíz, en PowerShell:

```powershell
npm ci
Copy-Item .env.example apps/mobile/.env
```

Editar `apps/mobile/.env` con URL cloud y clave pública del proyecto:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

El ejemplo de entorno contiene localhost para desarrollo local: reemplazarlo al
usar cloud. Expo carga `.env` desde `apps/mobile`; uno solo en la raíz no basta.
Todos los valores `EXPO_PUBLIC_*` se incluyen en el bundle. Nunca colocar allí
`service_role`, claves secretas, contraseñas o credenciales de pagos.

Para un entorno nuevo, preparar el esquema siguiendo las migraciones en orden y
la [arquitectura](docs/architecture.md), revisando los ADRs actuales. Para un
proyecto existente, comprobar primero su historial; no reaplicar migraciones,
seed o SQL históricos por seguir notas de entregas anteriores. Esta revisión no
aplicó cambios cloud. **Docker no está disponible en este entorno: usar cloud y
no ejecutar `db:start` ni `db:reset`.**

## Uso

```powershell
# Compilar/instalar el development build en Android conectado
npm run android

# Después de instalar el build, iniciar Metro
npm start

# Alternativa web de desarrollo
npm run web
```

En macOS, `npm run ios` compila/instala el development build iOS.
Estos son pasos para el desarrollador; no se ejecutaron durante la revisión.

1. Registrarse, confirmar el correo si Auth lo exige e iniciar sesión.
2. Como cliente, indicar dirección/comuna, producto y canje; elegir distribuidora
   disponible y revisar el total antes de confirmar. Consultar Pedidos para eventos
   y cancelación antes de `on_the_way`.
3. En **Mi cuenta → Mi negocio**, postular una distribuidora o entrar por membresía.
   Tras revisión, configurar catálogo, comunas de cobertura e invitaciones de equipo.
4. El conductor acepta su invitación con correo confirmado, completa antecedentes
   y espera aprobación administrativa. Luego activa disponibilidad, acepta ofertas
   y confirma avance/entrega. Puede comprar como cliente sin cambiar su rol.

Aceptar una invitación no habilita reparto. La aprobación, afiliación, precio,
stock y estados se deciden en servidor. Un conductor no acepta su propio pedido.
Un negocio sin conductor habilitado/disponible no puede completar una compra nueva.
El catálogo contempla Lipigas/Gasco/Abastible, 5/11/15/45 kg y variantes VMA/VM
exclusivas de Abastible 15 kg; CLP entero sin decimales y textos es-CL.

La ubicación se solicita solo al pulsar **Usar mi ubicación**; propone dirección y
comuna para revisión, sin guardar coordenadas en ese flujo. Recordar la dirección
es opcional, cifrado y separado por usuario en nativo. No hay ubicación en segundo
plano. Para mapas futuros se debe usar `PROVIDER_GOOGLE`; las claves
`GOOGLE_MAPS_ANDROID_API_KEY`/`GOOGLE_MAPS_IOS_API_KEY` son de build, se restringen
por app/SDK y requieren recompilar si cambian.

La web sirve para desarrollo: sesión en memoria, sin persistir tras recargar.
Autorizar `http://localhost:8081` (o el puerto usado) en los Redirect URLs de Auth
para confirmar correo; después iniciar sesión con contraseña. Ver
[redirecciones de Supabase](https://supabase.com/docs/guides/auth/redirect-urls) y
[diagnóstico de ingreso](docs/auth-troubleshooting.md).

## Comandos y pruebas

| Comando                                                     | Uso y límites                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm start`                                                 | Metro para el development build instalado.                                                          |
| `npm run android` / `npm run ios`                           | Compilar/instalar nativo; iOS exige macOS.                                                          |
| `npm run web`                                               | Web de desarrollo.                                                                                  |
| `npm run typecheck`                                         | TypeScript sin emitir archivos.                                                                     |
| `npm run lint`                                              | ESLint móvil.                                                                                       |
| `npm test`                                                  | Regresiones offline Node + PowerShell 7, sin cloud ni render.                                       |
| `npm run test:coverage`                                     | Offline con C8; umbrales sobre siete módulos críticos, LCOV y resumen.                              |
| `npm run db:test:list`                                      | Allowlist SQL vigente; comprueba clasificación de todos los SQL.                                    |
| `npm run db:test:prepare`                                   | Migraciones y catálogo solo en Gasway Test; exige ref explícita.                                    |
| `npm run db:test:cloud`                                     | Siete SQL en Gasway Test, con timeout, destino protegido y rollback.                                |
| `npm run format` / `npm run format:check`                   | Escribir/revisar formato.                                                                           |
| `node scripts/test-<nombre>.cjs`                            | Assertions específicas; `npm test` ejecuta el conjunto offline.                                     |
| `pwsh -File scripts/test-reset-auth-password.ps1`           | Regresión offline del script administrativo, requiere PowerShell 7.                                 |
| `npm run db:types`                                          | Generador actual **local**; requiere Supabase local. Integración cloud/tipos pendiente.             |
| `npm run db:lint`                                           | Lint SQL **local**; no comprueba el cloud.                                                          |
| `npm run db:test`                                           | Runner de Supabase local; los SQL actuales no son una suite pgTAP compatible sin adaptación.        |
| `npm run db:start` / `npm run db:stop` / `npm run db:reset` | Herramientas locales con Docker; reset destruye datos locales. No iniciar/resetear en este entorno. |

Hay 12 suites CommonJS de pruebas y una PowerShell, para Auth, pedidos, ofertas,
progreso, postulación, negocio, equipo, disponibilidad y cobertura. Usan assertions,
transpilación y mocks; no equivalen a pruebas reales de dispositivo. CI y cobertura
de lógica crítica se incorporan en DT-02; Actions requiere publicar la rama, y el
workflow SQL manual requiere configurar su environment y credenciales privadas.

Las suites SQL se ejecutan completas como postgres en el entorno de prueba
correspondiente y revierten sus fixtures; las secuencias pueden avanzar. Consultar
[clasificación SQL](supabase/tests/README.md): `distributor_owned_coverage.sql` y
`distributor_discovery.sql` cubren los contratos actuales de cobertura/compra.
No ejecutar todas las suites antiguas contra el esquema más reciente. Las carreras
reales requieren conexiones independientes.

Para consultar dependencias, sin instalarlas ni cambiarlas:

```powershell
npm audit --package-lock-only --ignore-scripts --offline=false --prefer-offline=false
npm outdated --workspaces --include-workspace-root --offline=false --prefer-offline=false
```

`.npmrc` desactiva auditoría automática de instalación y el entorno revisado tenía
npm offline: una respuesta vacía sin consulta en línea no acredita seguridad.
Audit/outdated devuelven código 1 cuando encuentran avisos/desactualización.
Revisar compatibilidad Expo antes de remediar; los fixes automáticos no constituyen
un plan de actualización. Ver [hallazgos y versiones](docs/review-2026-10-22.md).

## Estructura del proyecto

```text
apps/mobile/
  app/                  # Rutas; grupos (customer), (driver), (business) y acceso
  src/features/
    auth/               # Sesión, acceso y postulación de conductor
    orders/customer/    # Dirección, catálogo, compra, pedidos y actualizaciones
    driver/             # Ofertas, disponibilidad, cobertura heredada y entrega
    business/           # Alta, catálogo, equipo, invitaciones y cobertura
    tracking/, profile/ # Espacios reservados
  src/shared/           # Supabase, contratos, validación, pagos y UI reutilizable
  src/theme/            # Tokens y estilos centrales
  assets/               # Fuentes visuales locales, productos y marcas
supabase/
  migrations/           # 20 migraciones de esquema, RLS y RPC
  tests/                # 16 SQL; vigentes e históricos clasificados en su README
  admin/                # Operaciones privilegiadas de revisión y demo
  functions/            # Reservado, sin handlers
  seed.sql              # 14 productos con variantes, sin precios comerciales
  config.toml           # Configuración local; no acredita ajustes cloud
scripts/                # Pruebas offline, diagnóstico y generación de tipos
docs/                   # Roadmap, revisión, arquitectura, dominio, guías y ADRs
.agents/skills/         # Instrucciones especializadas del repositorio
.claude/napkin.md        # Runbook de pautas recurrentes
```

Dirección de dependencias: features → shared/theme; cliente y driver se comunican
por contratos compartidos, sin imports entre ambos. Hay una desviación identificada
en la composición de providers, registrada como DT-05 del roadmap.

## Documentación y próximos pasos

- [Roadmap priorizado: Alta / Media / Baja, deuda técnica y funcionalidades](docs/ROADMAP.md).
- [Revisión técnica del 2026-10-22](docs/review-2026-10-22.md).
- [Arquitectura](docs/architecture.md), [dominio chileno](docs/domain.md) y
  [contexto de mercado](docs/market-context-chile.md); ante referencias históricas,
  revisar ADRs 0018–0021 y las guías vigentes.
- [Flujo del conductor](docs/driver-workspace.md), [equipo e invitaciones](docs/driver-team.md),
  [panel del negocio](docs/business-admin-ux.md) y [demo](docs/business-demo.md).
- [Diseño](docs/design.md), [cilindros](docs/cylinder-assets.md),
  [skills](docs/skills.md) y [decisiones](docs/decisions/0001-stack-and-scope.md).
- [Notas históricas de entregas](docs/readme-history.md) y
  [checklist anterior](docs/roadmap-history.md): conservan instrucciones y resultados
  reportados anteriormente, sin presentarlos como verificación vigente.

Prioridades inmediatas: tratar avisos npm, automatizar pruebas actuales y
concurrencia, generar tipos, corregir límites de arquitectura e integridad y
definir privacidad/seguridad operativa. Después, recuperación de acceso y pedidos
sin asignación. No se implementan nuevas features por esta revisión documental.

## Seguridad, administración y costos

RLS limita datos a sus participantes; las ofertas no incluyen dirección ni notas.
La autorización usa identidad/membresía/estado del servidor, nunca user_metadata.
RUT, direcciones y coordenadas son privados. El contrato de pagos solo prepara
extensiones futuras; efectivo contra entrega sigue siendo el único método SQL.

La aprobación usa scripts de `supabase/admin` con privilegios de operador,
versión exacta y auditoría; no se ejecutan desde la app. La aceptación de invitación
no crea contraseñas ni envía correos automáticamente. Las evidencias declaradas no
sustituyen la revisión real de negocio/conductor. El negocio demo está marcado
`is_demo=true` y no acredita habilitación comercial: consultar su guía antes de usarlo.
Los resultados históricos de stock, roles y migraciones no describen necesariamente
el cloud actual.

No se activan planes ni servicios pagados automáticamente. Evaluar cuotas Supabase,
mapas, distribución/tiendas y proveedores antes del piloto; no se promete costo cero.
Ver [ADR de costos](docs/decisions/0003-free-services.md). Mercado Pago/Webpay,
tracking y push requieren tareas explícitas. No se incorpora el cupón estatal de
GLP vencido.

## Changelog

### 2026-10-22

- DT-02: runner offline, loader común con mapas de origen, C8 con umbrales y CI
  Linux/Windows de tipos/lint/formato/cobertura. SQL clasificado (7 vigentes, 9
  históricos), progreso/workspace adaptados a ADR 0021 y proyecto Free Gasway Test
  separado con migraciones, catálogo y ejecución transaccional. Baseline de formato
  normalizado; guía en docs/testing.md y decisión en ADR 0022.
- DT-01: Expo 57.0.31, Router 57.0.29, Location 57.0.22 y ESLint 9.39.5;
  auditoría de 25 a 22 paquetes afectados. Config-plugins 57.0.11/xcode 4
  eliminan uuid 7. Excepciones de seguridad/soporte con responsable, fechas y revisión
  de rutas previa al piloto en docs/dependency-security.md. Matriz Expo y typecheck
  correctos; lint sin errores, con cinco advertencias en archivos no modificados.
- Consolidados los cambios locales de experiencia de cliente, gestión del negocio,
  cobertura, recursos visuales y documentación para integrar la base previa al ROADMAP.
- Revisados estructura, arquitectura, código, seguridad, dependencias, pruebas, errores,
  rendimiento y documentación. Informe con evidencias y límites en docs/review-2026-10-22.md.
- Nuevo docs/ROADMAP.md con prioridades Alta/Media/Baja, justificación, esfuerzo, deuda
  técnica y funcionalidades; checklist anterior conservado en docs/roadmap-history.md.
- README actualizado con alcance real, versiones del workspace, instalación, uso,
  estructura y pruebas vigentes. Notas anteriores conservadas en docs/readme-history.md.
- Revisión inicial: auditoría npm con 25 paquetes afectados (19 altos, 6 moderados). Sin cambios
  de dependencias, ejecución de suites, SQL cloud ni comprobaciones visuales.

- Reducido el círculo de quitar comuna de 24 a 20 y su icono a 14, con más margen
  dentro de la etiqueta y el mismo objetivo táctil accesible de 48.

- Comunas seleccionadas visibles en etiquetas compactas con acción para quitarlas,
  independientes de la búsqueda. Texto oscuro sobre lima pastel y X crema sobre
  oliva; objetivos táctiles de 48, nombre accesible y conteo anunciado. Los cambios
  se conservan como borrador hasta guardar.

### 2026-10-21

- Cobertura administrada por la distribuidora: selección CUT en una hoja, disponible
  incluso sin conductores; todos los afiliados heredan la misma área y solo cambian
  disponibilidad. Búsqueda, compra, despacho y aceptación usan `distributor_communes`.
- Aplicada `20261021230714_distributor_owned_coverage.sql`: retiradas `driver_communes`
  y la RPC de edición por conductor, preservando las tres filas antiguas sin negocio
  en un archivo privado. Edición con revisión y retiro de ofertas fuera del área;
  entregas asignadas continúan. Suites cloud con rollback, Node y typecheck aprobados.
  La cobertura demo permanece vacía hasta que el responsable la elija. ADR 0021.

- Nueva sección **Mi negocio → Cobertura**: comunas, conductores, reparto disponible,
  búsqueda y detalle en hojas. Accesos desde el resumen, Equipo y Catálogo; mensajes
  de disponibilidad del cliente más breves. Consulta protegida por membresía aplicada
  en cloud, sin modificar habilitaciones ni comunas. Pruebas SQL con rollback y
  contratos/conteos locales y typecheck aprobados; ver ADR 0020.

- Diagnosticado Gasway cloud: stock Lipigas publicado, pero ningún conductor
  habilitado/afiliado y precios sin canje pendientes. Separados inventario, cobertura
  y disponibilidad en RPC y app; stock visible con motivos de compra deshabilitada.
- Aplicada migración de disponibilidad tras suite cloud con rollback. Retirada la
  lectura móvil del precio global y el carrusel editorial sin referencias; crear o
  cancelar refresca también las consultas de existencias. Sin cambios a datos o roles.

- Reemplazados los fondos blancos de Lipigas 5/11/15/45 kg y Gasco 11/15 kg,
  además del fondo negro de Gasco 5 kg, por transparencia mediante `imagegen`.
  Mismos nombres de archivo, sin duplicados con fondo en la app; Abastible y
  Gasco 45 kg conservan sus PNG transparentes. Procedencia y prompts en
  [recursos de cilindros](docs/cylinder-assets.md#recortes-transparentes).

- Incorporadas las ocho fotografías originales aportadas de Lipigas/Gasco para
  5/11/15/45 kg, sin modificar sus archivos. Catálogo del negocio (incluido editor),
  selector, revisión e historial usan la foto exacta por marca y formato; Abastible
  conserva sus fotos y variantes VM/VMA. Marca antes de tamaño en Nuevo pedido;
  imágenes referenciales limitadas a Inicio. Sin cambios de backend.

- Compra en tres pasos con elección de distribuidora por CUT, producto y stock;
  precio con/sin canje del negocio, reserva/cancelación e idempotencia de confirmación.
- Horarios semanales Chile con turnos nocturnos, ETA informada y contacto comercial
  voluntario. WhatsApp secundario para consultas sin dirección, también en el detalle.
- Ubicación nativa opcional, dirección recordada en almacenamiento seguro por cuenta,
  interés sin cobertura y eventos sin envío ni datos personales. CUT e imágenes reutilizados.
- Nuevas RPC con RLS/privilegios mínimos, vendedor inmutable y ofertas solo de su negocio;
  retirada la creación móvil con precio global. ADR 0018 y guía de configuración agregados.
- Migración de compra por distribuidora aplicada en cloud con autorización explícita;
  verificados historial, RPC y siete comprobaciones de permisos/RLS. Advisor de
  seguridad: solo aviso de Auth por protección contra contraseñas filtradas desactivada;
  esa configuración no se modificó.

- Restaurados los logos locales de Lipigas, Gasco y Abastible en las tarjetas de
  selección de marca, con nombre e indicador de selección. Los tamaños sin marca
  conservan los renders PNG neutros.
- Sustituidos los SVG de tamaños por los PNG neutros v2, con pizarra por defecto y
  perla disponible. El de 15 kg conserva la altura del de 11 kg y un cuerpo más ancho.
  `Image` reemplaza el SVG que enviaba `accessible={false}` al DOM web; dimensiones
  explícitas y `contain` evitan estirar los recortes. Recursos locales optimizados,
  sin nuevas dependencias; ver [procedencia y uso](docs/cylinder-assets.md).
- Corregida la distribución de la tarjeta inicial: composición de marcas centrada
  junto al título, dentro del flujo de la tarjeta y con halo propio. Corregido además
  el desborde en web con ancho/alto explícitos de imagen y sin expansión vertical del cuerpo.
- Tamaños más legibles con siluetas neutras y encuadres independientes para
  5/11/15/45 kg. Las vistas sin marca dejan de mostrar Abastible por defecto;
  al elegir marca se conservan las fotografías existentes.
- Aplicada la paleta oliva/lima aprobada, con colores extraídos de la referencia,
  crema y salvia de apoyo, CTA lima con texto oscuro y tokens comunes a todos los roles.
  Contrastes calculados en [diseño](docs/design.md).

### 2026-10-20

- Reemplazado el cilindro SVG por fotografías y PNG con transparencia. Inicio usa una
  composición Abastible/Gasco/Lipigas; selección y pedidos muestran la marca correcta.
  Se conservan las fotografías por tamaño/variante de Abastible y se agregan imágenes
  referenciales de Gasco y Lipigas, creadas desde las imágenes aportadas por el usuario.
  Ver [recursos y procedencia](docs/cylinder-assets.md).

- Nuevo sistema petróleo/crema/cobre con Outfit y Figtree, cilindros SVG con volumen,
  navegación clara, skeletons animados, selección y haptics. Rediseñados Inicio,
  pedido en cuatro pasos, seguimiento por estados, Pedidos y Cuenta. Negocio y
  conductor comparten los tokens; cabeceras del negocio con degradado. Mismos
  hooks, contratos, rutas y backend; sin precios ni tiempos inventados. Agregados
  expo-linear-gradient, expo-haptics y @expo-google-fonts/outfit.
  Ver [referencia visual](docs/design.md).

- Rediseñado Inicio del cliente: títulos grandes, entrada tipo búsqueda, accesos
  circulares 5/11/15/45 kg, banner activo, hasta tres filas sin cancelados y
  carruseles de bienvenida/seguridad. Barra inferior carbón con selección de la paleta anterior,
  safe area y punto en Pedidos. Nuevos tokens discovery/navigation; mismas consultas
  y flujo sin preselección, sin dependencias nuevas. Nueva referencia en
  [diseño](docs/design.md#inicio-del-cliente); único typecheck aprobado, sin revisión visual.

- Ajustado Inicio del cliente: tarjeta blanca «Pedir gas» con una sola acción,
  pedido en curso primero, repetición del último entregado, hasta tres pedidos
  sin cancelados y guía solo sin historial. Saludo sin identificadores; se omiten
  tarjetas o filas sin producto disponible. Mismas consultas y rutas, sin cambios
  de negocio; ver [Inicio](docs/design.md#inicio-del-cliente).

### 2026-10-19

- Modernizados Inicio del cliente y barra inferior: hero de la paleta anterior,
  tamaños, pedido en curso, repetición e historial breve según datos existentes,
  guía de tres pasos y pestañas flotantes con indicador activo y punto en Pedidos.
  Sin preselección (el flujo no la admite), consultas nuevas ni cambios de negocio;
  ver [sistema visual](docs/design.md). Validación limitada a typecheck.

- Cabeceras alineadas a la paleta anterior y neutros, incluida la paleta heredada. Editor
  de catálogo con switch, precio CLP con vista previa, stock editable con −/+ y
  pie fijo Guardar cambios/Cancelar. Sin cambios de contratos ni backend;
  ver [reglas visuales](docs/design.md#cabeceras-y-edición-del-catálogo).

- Rediseñado el espacio de negocio completo (resumen, datos, equipo y catálogo):
  cabeceras verde profundo, acento lima, conteos destacados, navegación agrupada,
  fichas de producto e identidad de personas. Tokens centrales y formularios existentes;
  ver [diseño del panel](docs/business-admin-ux.md). Sin revisión visual en dispositivo.

- Agregados tres niveles de elevación, superficie destacada y borde sutil; Card y
  OptionCard ganan profundidad. Ampliados IconChip, badges y BottomSheet de edición,
  sin rediseñar pantallas ni cambiar lógica o backend. Actualizado docs/design.md.

- Eliminadas las skills de diseño ui-ux-pro-max y frontend-design, ponytail y
  react-native-skills; actualizado AGENTS.md y el inventario de skills.

### 2026-10-18 — Panel del negocio

- Resumen con tarjetas y pantallas propias de datos y catálogo; edición de producto
  en modal, manteniendo validación, precio pendiente y CLP entero.
- Conductores e Invitaciones separados, badges, filtros y scroll incremental;
  invitación individual/CSV con resultado persistente en modal.
- Componentes propios y tokens reutilizados, sin nuevas dependencias ni cambios
  de backend, RLS o dominio. Solo typecheck; sin comprobaciones visuales.

### 2026-10-18

- Regularizada una sola cuenta antigua sin afiliación mediante script exclusivo de
  postgres: identidad e historial conservados, estado anterior auditado en privado
  y acceso pendiente hasta aceptar invitación y completar la revisión administrativa.
  No se añade una vía pública de conversión ni de traslado de conductores.

- Corregido parpadeo de «Actualizar jornada»: el sondeo automático ya no cambia el
  botón ni el indicador manual. El refresco espera las cuatro consultas y evita
  duplicados. SVG decorativos omiten `accessible` en web para evitar el aviso DOM.

- Espacio de conductor actualizado a Figtree/tema actual: Ofertas, Cobertura, Cuenta
  y entrega asignada; se retiraron Page/ActionButton y theme/legacy de esas pantallas.
- Negocio afiliado y bloqueos operativos consultados con RPC propia; disponibilidad
  usa cobertura guardada, ofertas vencidas dejan de ofrecer aceptación y errores
  de lectura impiden asumir que no existe otra entrega activa.
- Compra como cliente sin cambiar permisos, regreso a reparto y Realtime sujeto al
  foco del layout; acceso suspendido deja de presentarse como aprobación en espera.
- Entrega con confirmación explícita común a web/nativo y prueba completa desde una
  invitación; migración aplicada, fixtures revertidos y documentación en ADR 0016.

- Corregida reutilización de canales Realtime al volver al inicio; regresión local
  para remontaje con eliminación pendiente y callbacks tardíos.

- Incorporación de conductores iniciada por el negocio: Equipo, invitaciones individuales,
  importación CSV con revisión, aceptación por correo confirmado y revisión final de Gasway.
- Estados separados de invitación/habilitación, búsqueda/paginación, cancelación,
  vencimiento, reintentos seguros y renovación del consentimiento tras rechazo.
- Retiradas las RPC de postulación abierta; historial conservado y suite de invitaciones
  aplicada en cloud con fixtures revertidos. Sin envío automático de correos.

- Alta y revisión de distribuidores con referencias privadas, motivo y auditoría;
  «Mi negocio» separado de cliente/conductor por membresías y guardas de navegación.
- Gestión autenticada de vinculación de repartidores, apertura de postulaciones y
  catálogo propio con precio/stock, revisión concurrente y auditoría, aún sin compras.
- Negocio demo ficticio autorizado para el responsable indicado; datos repetibles,
  señalización visible y revisión de prueba sin habilitar automáticamente al conductor.

- Guardado contexto operativo de GLP con fuentes oficiales y precisiones sobre
  exclusividad, intercambio, licencias, capacitación y límites del alcance.
- Aplicadas confirmación del negocio por versión de postulación, marcas configuradas,
  filtros de despacho/aceptación y distribuidor inmutable del pedido; nueve suites SQL aprobadas.
- Preservados históricos y entregas asignadas; cuentas anteriores sin negocio no
  reciben ofertas nuevas. Sin asignaciones ficticias ni ampliación a GN o granel.

- Incorporado formulario de postulación con nombre, RUT módulo 11, teléfono y
  distribuidor solicitado, manteniendo las compras y solicitudes existentes.
- Aplicada migración con directorio autenticado de negocios que aceptan postulaciones,
  validación SQL, aprobación coincidente y copias privadas de antecedentes revisados.
- Pruebas locales, typecheck, lint y tres suites SQL aprobadas; datos reales intactos.
  Sin negocios ficticios, cambio de rama ni comprobaciones visuales.

- Nuevo pedido usa las seis fotografías adjuntas para Abastible (5/11/15/45 kg,
  VMA 15 kg y VM 15 kg); las otras marcas conservan su ilustración.
- Catálogo ampliado con variantes VMA/VM exclusivas de Abastible 15 kg, sin precios
  ficticios; selección y resúmenes cliente/repartidor distinguen cada producto.
  Migración aplicada y verificada en cloud; ver ADR 0011.

- Integrado estado/motivo/fecha de postulación en Mi cuenta, conservando compras
  de pendientes/rechazados y errores de consulta locales; `/pending` redirige a cuenta.
- Agregada confirmación de nueva solicitud tras rechazo y RPC idempotente aplicada
  en cloud, sin conceder habilitación ni borrar revisiones; suite SQL aprobada.
- Pruebas locales de contratos/interacción, regresión Auth, typecheck y lint acotado
  aprobados. Sin dependencias, cambio de rama ni comprobaciones visuales.

- Confirmadas migraciones previas hasta 20261018050000 en Gasway cloud, comparando
  funciones y esquema; conciliado historial de cuatro aplicaciones manuales.
- Aplicada 20261018195303 como postgres mediante CLI; suite SQL completa aprobada
  y rollback verificado por conteos. Revisados advisors de seguridad.
- Listada y rechazada la solicitud pendiente por instrucción explícita del usuario;
  motivo y auditoría verificados, sin solicitudes pendientes ni negocios inventados.

- Preparada base de distribuidores como organizaciones, responsables y afiliación
  única de conductores; roles móviles conservados.
- Agregadas solicitudes pending/approved/rejected y revisión SQL privilegiada con
  motivo, auditoría privada, aprobación transaccional y suite SQL con rollback.
- Actualizado script de aprobación de prueba. Migración y suite cloud pendientes;
  pantallas de postulación, catálogo y despacho por distribuidor siguen pendientes.

- Preparada entrega conjunta de cliente, repartidor y seguimiento. Corregidos lint
  de Metro y pulsación Reanimated; el reintento de sesión reinicia su estado desde
  la acción del usuario y protege errores diferidos tras desmontar. Regresión local
  de recuperación de sesión agregada a `scripts/test-auth.cjs`.

- Rediseñado Nuevo pedido: logos sin texto repetido, tamaños compactos con selección
  visible, paneles blancos para cantidad/canje y entrega y resumen mínimo en el pie.
  Conservados catálogo, validación, precios del servidor y creación del pedido;
  «Revisar mis pedidos» ahora abre la pestaña Pedidos.

- Compactado «Pedir gas» en Inicio en una tarjeta horizontal con cilindro pequeño
  y flecha de acceso. Retirados el historial «Tus pedidos», su vacío y la paginación
  de Inicio; se conservan en Pedidos y se mantiene el seguimiento activo en Inicio.

- Rehechos inicio de sesión y registro sin skills de diseño: blanco cálido, carbón,
  la paleta anterior, encabezado tipográfico y formulario sin bloque promocional ni
  ilustración. Cambio de modo al pie, foco visible y contraste calculado de 5.45:1
  en la acción principal (4.71:1 al pulsar). Los tokens centrales sustituyen la
  combinación anterior; las demás composiciones quedan para una etapa posterior.
  Detalles en [sistema visual](docs/design.md).

- Integrados logos locales Lipigas/Gasco/Abastible en selección, pedidos y resúmenes del cliente, con aviso en Mi cuenta y límites documentados.

- Rediseñadas las pantallas del cliente con display 34, paleta cálida, pestañas, avatares, cilindros SVG, esqueletos y pulsación 0.98; sin cambios de backend, datos ni lógica de negocio; único typecheck aprobado.
- Renovado el sistema visual del cliente: tokens cálidos/primario petróleo, Figtree
  400–700 con splash y respaldo del sistema, texto accesible y componentes propios.
- Rediseñados Mis pedidos, Nuevo pedido, Mi cuenta y detalle, con estados legibles,
  selección en columnas, contador y botón inferior. Sin cambios de negocio ni backend.
- Conservada la presentación del repartidor y el soporte de web de pruebas;
  documentadas reglas en docs/design.md. Sin ejecución ni verificación visual.
- Único typecheck: detectó un tipo opcional de Input; corregido para admitir
  undefined explícito, sin repetir el chequeo. Ejecución web/dispositivo pendiente.

- Habilitado Expo web de desarrollo con dependencias compatibles, Metro y script web;
  sesión en memoria, retorno de confirmación por correo y confirmación de entrega web.

- Agregado avance de entrega exclusivo del repartidor asignado, confirmación de
  entregado y eliminación inmediata del pedido activo en caché.
- Preparadas migración 20261018050000, publicación idempotente de orders y suite SQL
  con rollback para permisos, transiciones, eventos, marcas y publicación.
- Agregados Realtime cliente con respaldo de 15 s en primer plano, línea de tiempo
  de eventos, assertions locales y ADR 0008. Aplicación SQL y prueba real pendientes.

- Agregado diagnóstico manual de ingreso directo a Auth con contraseña oculta y
  guía para distinguir un rechazo del servidor de un problema en la app.
- Agregada recuperación administrativa local por UUID/correo verificados, sin
  depender del correo ni incluir claves privilegiadas en la app.
- Corregidos headers del restablecimiento para `sb_secret_*` y User-Agent de
  terminal; agregada regresión local sin red para claves modernas y heredadas.

- Implementado flujo repartidor en grupo protegido `(driver)`: disponibilidad,
  selección CUT, ofertas con polling de 5 s en primer plano, aceptación/rechazo y pedido asignado.
- Preparada `20261018040000_driver_offers.sql`: despacho por comuna con ofertas de
  60 s, RPC mínima sin PII, aceptación que reutiliza la operación atómica y rechazo.
- Agregados suite SQL con rollback, aprobación de prueba solo SQL Editor y ADR 0007.
- Auth marcada como aplicada según confirmación del usuario. Sin dependencias nuevas,
  commits, push, PR ni ejecución contra Supabase en esta tarea.

- Creado flujo cliente: nuevo pedido, lista, detalle y cancelación, con TanStack Query,
  react-hook-form/zod, rutas protegidas, theme y textos es-CL; sin paquetes nuevos.
- Preparadas RPC create_order/cancel_order, precio unitario de servidor, cantidad/notas,
  coordenadas opcionales y catálogo CUT; RLS y permisos mínimos conservados.
- Agregadas pruebas SQL autocontenidas con rollback, ADR 0006 e instrucciones manuales;
  sin ejecutar Supabase ni chequeos visuales por parte del agente.
- Usuario confirmó aplicación manual, configuración de precios y creación correcta de un pedido.
- Eliminado baseUrl obsoleto del tsconfig móvil; alias @/* conservado con la ruta relativa explícita ./src/* para TypeScript 6.
- Alineadas documentación y configuración con Expo SDK 57; documentado el criterio para subir a SDK 58 y simplificada la regla de shell.

### 2026-10-17

- Implementados registro, ingreso y cierre de sesión con persistencia segura, validación es-CL y guard por rol/aprobación.
- Agregadas migración posterior y pruebas SQL para alta customer y solicitud idempotente de repartidor pendiente, sin permisos de autoaprobación.
- Documentados aplicación manual, aprobación solo en servidor y pendientes en ADR 0005 y roadmap; sin ejecutar cambios cloud.

- Corregida suite SQL: único DO con IDs locales, avisos por verificación y reversión interna, sin tablas auxiliares.

- Agregada suite SQL autocontenida con rollback: RLS por cliente/repartidor, primer ganador, segundo rechazo y transición inválida.
- Confirmado por lectura el UPDATE condicional de aceptación; sin cambios a la migración aplicada.
- Conservado seed idempotente de 12 productos; documentados SQL Editor y pendientes de ejecución/concurrencia.

- Creado monorepo npm, base Expo SDK 57, configuración estricta y herramientas de formato/lint.
- Agregados theme central, providers mínimos, entorno de ejemplo y contrato de pagos.
- Preparado esquema PostGIS con RLS, eventos, ofertas internas y aceptación atómica.
- Documentados dominio chileno, arquitectura, roadmap, seguridad y decisiones de costo.
- Instaladas skills oficiales en .agents/skills, incluida Ponytail; agregada gasway-domain.
- Graphify queda pendiente por su runtime adicional; detalles y procedencia en docs/skills.md.
- Typecheck aprobado en una ejecución; el validador Python de skills no pudo iniciar por falta de PyYAML, sin instalar dependencias adicionales.
