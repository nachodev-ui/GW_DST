# Gasway

Gasway será una app para pedir cilindros de GLP a distribuidores locales de Chile.
Cliente y repartidor compartirán una app; el repartidor recibirá una oferta y podrá
aceptarla. Más adelante habrá un panel de administración web.

## Estado actual

Scaffolding inicial: estructura por features, configuración, tokens propios,
contrato de pagos, documentación y skills de repositorio. La ruta inicial retorna
null intencionalmente: no hay pantallas finales ni flujos de negocio implementados.
La migración inicial ya está aplicada en Supabase cloud, según lo informado por el
usuario. Esta tarea no ejecutó SQL en la nube. No hay notificaciones enviadas ni
servicios pagados activados. El pago del MVP será contra entrega.

## Stack

- Expo SDK 58 estable (expo 58.0.14), React Native 0.88 y React 19.3;
  versiones compatibles tomadas de bundledNativeModules de Expo y fijadas en lockfile.
- Expo Router y TypeScript strict; TanStack Query, Zustand, react-hook-form y zod.
- expo-location, expo-notifications, react-native-maps con Google Maps.
- Supabase: Postgres 17 + PostGIS, Auth, Realtime, Edge Functions y RLS desde el inicio.
- Theme central propio, tipografía del sistema y ninguna librería genérica de UI.

Fuentes: [Expo SDK 58](https://expo.dev/changelog/sdk-58),
[RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Cómo correrlo

Requisitos: Node 24 LTS y npm. Android requiere su SDK/JDK; una compilación local de
iOS requiere macOS/Xcode. Docker se necesita solo para Supabase local.

1. En un checkout nuevo ejecutar npm ci (el lockfile está versionado).
2. Copiar .env.example a apps/mobile/.env y completar solo claves públicas/restringidas.
3. Para backend local: npm run db:start y luego npm run db:reset.
   El reset destruye los datos locales y aplica migraciones más catálogo semilla.
   Tomar URL/clave pública de la salida local; en un teléfono físico reemplazar
   127.0.0.1 por la IP LAN alcanzable del computador. Nunca copiar service_role.
4. Para instalar un development build en un dispositivo Android conectado:
   npm run android; en macOS, npm run ios para iOS. Estos comandos no se ejecutaron
   durante el scaffolding y requieren el entorno nativo correspondiente.
5. Para iniciar Metro después de instalar el development build: npm start.
   Seleccionar un dispositivo físico; la app mostrará una ruta vacía deliberadamente.

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

No se entregan tipos de base de datos inventados: generarlos una vez aplicada la
migración y antes de conectar un cliente Supabase. La configuración de entorno es
lazy y no realiza llamadas de red al iniciar.

## Estructura

```text
apps/mobile/
  app/                  # Router y ruta vacía
  src/features/         # auth, orders, tracking, driver, profile (reservados)
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
2. Auth y alta controlada de repartidores; formularios es-CL, RUT y comunas.
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

Una sola instalación de dependencias completada y un solo typecheck final aprobado
(tsc --noEmit, código de salida 0). No se ejecutan
emuladores, capturas, renders ni comprobaciones visuales. La migración se entrega
ya aplicada en cloud según el usuario; la suite SQL de esta tarea fue revisada por
lectura y no ejecutada. El shell falló al iniciar y no se reintentó. La ejecución
de pruebas y la concurrencia real quedan pendientes.

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

### 2026-10-17

- Corregida suite SQL: único DO con IDs locales, avisos por verificación y reversión interna, sin tablas auxiliares.

- Agregada suite SQL autocontenida con rollback: RLS por cliente/repartidor, primer ganador, segundo rechazo y transición inválida.
- Confirmado por lectura el UPDATE condicional de aceptación; sin cambios a la migración aplicada.
- Conservado seed idempotente de 12 productos; documentados SQL Editor y pendientes de ejecución/concurrencia.

- Creado monorepo npm, base Expo SDK 58, configuración estricta y herramientas de formato/lint.
- Agregados theme central, providers mínimos, entorno de ejemplo y contrato de pagos.
- Preparado esquema PostGIS con RLS, eventos, ofertas internas y aceptación atómica.
- Documentados dominio chileno, arquitectura, roadmap, seguridad y decisiones de costo.
- Instaladas skills oficiales en .agents/skills, incluida Ponytail; agregada gasway-domain.
- Graphify queda pendiente por su runtime adicional; detalles y procedencia en docs/skills.md.
- Typecheck aprobado en una ejecución; el validador Python de skills no pudo iniciar por falta de PyYAML, sin instalar dependencias adicionales.
