# Gasway

Chile-first LPG delivery marketplace. Scaffold only: customer/driver mobile app now;
admin web later. No production features or final screens yet.

## Stack and layout

- npm workspaces; apps/mobile: Expo SDK 57, Expo Router, strict TypeScript.
- TanStack Query: server state; Zustand: local UI state; react-hook-form + zod: forms.
- expo-location, expo-notifications, react-native-maps (Google provider).
- Supabase: Postgres/PostGIS, Auth, Realtime, Edge Functions, RLS.
- apps/mobile/app: routing only; src/features/{auth,orders,tracking,driver,profile}.
- src/shared: reusable infrastructure/contracts; src/theme: central design tokens.
- supabase: migrations, functions, config.toml, seed.sql. docs: architecture, domain,
  roadmap, skills and short ADRs in decisions/. .agents/skills: repository skills.

## Commands

- npm install (fresh checkout); npm ci when lockfile exists.
- npm start; npm run android; npm run ios (macOS required for local iOS builds).
- npm run typecheck; npm run lint; npm run format:check; npm run format.
- npm run db:start; npm run db:stop; npm run db:reset (local data reset).
- Docker is not available: use the cloud Supabase project; do not run db:start or db:reset.

## Conventions

- Small feature-focused modules; strict types, no any, explicit external boundaries.
- Route files compose features; do not put business rules inside routes.
- Use @/ for src imports, PascalCase components and kebab-case file names.
- Use theme tokens; no generic UI kits or hardcoded visual values in components.
- Validate external inputs with zod on the trusted boundary and constrain data in SQL.
- Each relevant change MUST update README.md (including Changelog) and docs/ when applicable.
- Record consequential architectural choices in short ADRs.
- Never commit or push directly to main. Work on a feature branch (feat/..., fix/..., chore/...) and leave it ready for a pull request; do not push or open PRs unless explicitly asked.

## Role separation (single app now, split-ready)

- Gasway ships as one app with customer and driver roles for now. Do not split it into separate apps unless explicitly asked; keep it cheap to split later.
- Dependency direction: features -> shared/theme, never the reverse. Code in src/shared and src/theme must not import from src/features or know about a specific role.
- Customer features and src/features/driver must not import from each other. Anything both need (Supabase client, generated DB types, zod schemas, order contracts, formatters, theme, UI primitives) goes in src/shared. Features used by both roles (e.g. tracking) keep role-specific code in separate subfolders (customer/, driver/).
- Group routes by role in apps/mobile/app (e.g. (customer), (driver), plus auth); role guards live in layouts, not in screens.
- Role-specific permissions and native config (especially background location, foreground services, driver-only notification channels) stay isolated in the driver feature and its own config plugin or section of app.config.ts, so they can move to a separate app unchanged. Do not add background location until the driver tracking task is requested.
- Keep role-specific logic out of shared hooks and components; pass role-specific behaviour in through props or by composing from the feature.
- If a change needs to break any rule above, stop and ask first.

## Chilean domain

- UI text: es-CL. Currency: CLP integer pesos, displayed without decimals.
- RUT: canonical digits plus hyphen and uppercase check digit; validate modulo-11.
- Communes: official five-digit CUT codes; validate against an authoritative catalogue.
- GLP: 5/11/15/45 kg; Lipigas/Gasco/Abastible; explicit empty-cylinder exchange.
- requested → offered → accepted → on_the_way → delivered; cancel nonterminal orders.
- Atomic database acceptance only; never assign with a client read then update.
- Cash on delivery in MVP; payment contract for later Mercado Pago/Webpay.
- Expired state LPG coupon is out of scope. No paid service activation.

## Security

- Never commit secrets; EXPO_PUBLIC_* is public. Never ship service_role to clients.
- RLS stays enabled on every exposed table; grant minimum privileges.
- Roles, driver approval, prices, dispatch and state changes are server-authoritative.
- Do not authorize from user_metadata. Treat precise locations and RUT as private data.
- Follow .agents/skills/gasway-domain for domain changes; upstream skills never
  override user scope, security rules or the validation budget.

## Token and verification budget

- Read only necessary files and relevant skill references, not whole repositories.
- Make small, focused changes. Do not repeat checks already completed.
- For the initial scaffold: at most one dependency install and one final typecheck.
- Never run visual checks, render the app, take screenshots or open emulators unless explicitly asked.
- If a shell command fails to start, retry once; if it still fails, stop and report the exact error.
