# Gasway

Gasway será una app para pedir cilindros de GLP a distribuidores locales de Chile.
Cliente y repartidor compartirán una app; el repartidor recibirá una oferta y podrá
aceptarla. Más adelante habrá un panel de administración web.

## Estado actual

Base inicial más autenticación por correo/contraseña, sesión segura en Android/iOS
y rutas protegidas de cliente, repartidor aprobado y solicitud pendiente.
Las zonas son placeholders; pedidos, tracking y pagos no están implementados.
La migración inicial ya está aplicada en Supabase cloud, según lo informado por el
usuario. Esta tarea no ejecutó SQL en la nube. No hay notificaciones enviadas ni
servicios pagados activados. El pago del MVP será contra entrega.

## Stack

- Expo SDK 57 estable (expo 57.0.0), React Native 0.88 y React 19.3;
  versiones compatibles tomadas de bundledNativeModules de Expo y fijadas en lockfile.
- Expo Router y TypeScript strict; TanStack Query, Zustand, react-hook-form y zod.
- expo-location, expo-notifications, react-native-maps con Google Maps.
- Supabase: Postgres 17 + PostGIS, Auth, Realtime, Edge Functions y RLS desde el inicio.
- Theme central propio, tipografía del sistema y ninguna librería genérica de UI.

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
Permisos de ubicación/notificaciones se configuraron, pero todavía no se solicitan.
Para un futuro mapa usar PROVIDER_GOOGLE también en iOS. Las push remotas requieren
credenciales/configuración nativa posterior; no están activas en este scaffold.

## Comandos

| Comando                       | Uso                                                |
| ----------------------------- | -------------------------------------------------- |
| npm run typecheck             | TypeScript sin emitir archivos                     |
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
- El servidor crea cada perfil como customer. Desde la zona de cliente se puede
  solicitar ser repartidor mediante request_driver_access(), sin pasar IDs ni roles.
- Una fila drivers con is_verified=false significa pendiente. Para entrar a la zona
  de repartidor deben coincidir profiles.role=driver y drivers.is_verified=true.
  La app consulta estos datos bajo RLS, al volver al primer plano, cada 30 segundos
  en primer plano y mediante el botón de revisión. Ante errores bloquea la navegación.
- Aprobar exige una operación administrativa confiable y transaccional que actualice
  ambas filas. No hay endpoint de aprobación móvil ni panel admin en esta entrega.

### Aplicar la migración (pendiente; no ejecutada aquí)

En el SQL Editor del proyecto correcto de Supabase, con rol postgres, abrir y
ejecutar completo [20261018020000_auth_roles.sql](supabase/migrations/20261018020000_auth_roles.sql).
Es posterior a la migración inicial y usa una transacción. No volver a ejecutar
la migración inicial ni el seed para este cambio. Si se usa CLI después, reconciliar
primero el historial de migraciones aplicadas manualmente para evitar reaplicarlas.

Después ejecutar completo [auth_roles.sql](supabase/tests/auth_roles.sql), también
como postgres. La prueba verifica registro sin escalada por metadata, RLS, privilegios,
solicitud idempotente y rechazo de autoaprobación; revierte sus fixtures incluso en
autocommit. Se entrega sin ejecutar. La aprobación debe revisarse manualmente con
una cuenta de prueba desde una operación de servidor, nunca desde la app.

Ver [ADR 0005](docs/decisions/0005-auth-and-roles.md). Pruebas locales sin red:
`node scripts/test-auth.cjs`.

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
.agents/skills/          # skills oficiales y gasway-domain
.claude/napkin.md        # memoria breve usada por Napkin también en Codex
docs/                   # arquitectura, dominio, roadmap, skills, ADRs
```

## Roadmap

1. Ejecutar las pruebas SQL preparadas; validar concurrencia real en dos sesiones y generar tipos.
2. Aplicar migración Auth y validar flujo real; aprobación administrativa, RUT y comunas pendientes.
3. Catálogo/precios por distribuidor, creación de pedidos y ofertas privadas.
4. Aceptación, tracking, estados y notificaciones; pago contra entrega.
5. Piloto local y panel admin web; evaluar gateways después del MVP.

Ver [roadmap](docs/roadmap.md), [arquitectura](docs/architecture.md),
[dominio](docs/domain.md) y [skills instaladas y pendientes](docs/skills.md).

## Costos

Desarrollo local primero y Supabase Free dentro de sus límites; sin altas automáticas
ni planes de pago. Google Maps exige configuración de Google Cloud y sus condiciones
de facturación deben revisarse antes del piloto. El scaffold deja las claves vacías
y no usa APIs de rutas/geocoding. Tampoco promete que publicar en tiendas o usar
servicios externos sea gratuito: esas decisiones quedan pendientes del presupuesto.
Ver [ADR de costos](docs/decisions/0003-free-services.md).

## Validación de esta entrega

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
[supabase/tests/initial_schema.sql](supabase/tests/initial_schema.sql) y ejecutar
el único bloque DO completo. No necesita seed, pgTAP ni estado previo de sesión.
Cada incumplimiento produce un error FAIL; con éxito emite un NOTICE por verificación y revierte
usuarios, perfiles, pedidos, ofertas, eventos y cualquier producto creado mediante
una subtransacción interna, también en autocommit. Un error inesperado revierte el DO
y se propaga. Las secuencias de eventos pueden avanzar aunque se reviertan las filas.
No ejecutar fragmentos. Esta suite es SQL directo, no una suite pgTAP para db:test.

La política inicial oculta los pedidos ofrecidos sin asignar, incluso al destinatario;
las pruebas conservan ese límite de privacidad. La aceptación se prueba en secuencia;
una carrera real requiere dos conexiones. Ver [detalle y decisión](docs/decisions/0004-initial-migration-tests.md).
El seed contiene solo las 12 combinaciones de marca/peso y no es necesario para probar.

## Changelog

### 2026-10-18

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
