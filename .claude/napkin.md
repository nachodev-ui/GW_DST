# Napkin Runbook

## User Directives

1. **[2026-10-30] Keep registration wizards in shared UI**
   Do instead: reuse shared FormStepper, compact form controls and useFormSteps;
   keep one react-hook-form instance mounted, trigger only the current fields,
   and preserve full final validation and rejected-application confirmation.
   Keep catalogue filtering in its owner and show private-reference conditions
   compactly with full meaning behind information. Do not render unless asked.

1. **[2026-10-29] Keep distributor Operations compact**
   Do instead: omit the business subtitle, group short driver/vehicle counts under
   Disponibles and preserve the icon-led access list with short one-line subtitles
   and dividers only between rows. Use Conductores with an intrinsic-width Ver equipo
   link, initial avatars, one-line names and the same compact unfilled StatusBadge
   as Flota; preserve status conditions and readiness actions.
   Equipo uses fixed counted tabs/search, a compact invite action and initial-avatar
   rows with one compact unfilled status. Open readiness on row press and keep
   invitation/access details and existing actions behind info; refresh by pull gesture.
   Preserve server search/pagination while filtering as text changes.
   Driver readiness uses a large initial avatar, one-line name, entry status and
   three compact icon-led requirements. Keep license sides paired, review reasons
   visible and attribution quiet; distinguish pending/rejected/expired with brand
   tokens. Refresh by pull gesture and keep eligibility server-authoritative.
   Vehicle create/edit sheets use Datos/Tipo/Estado/Conductor, paired compact fields,
   single-row icon/status choices and small initial-avatar driver rows. Put details
   behind info icons and use an opt-in compact footer with one contextual save action.
   Coverage uses one compact dark counted summary with integrated hours/common
   status, fixed counted tabs/search and small olive-outline filters. Show a commune
   status only when it differs from the summary; keep editing/info compact and
   help as a numbered vertical stepper with one Ir a Equipo action. Pull to refresh.
   While searching, collapse coverage editing/summary so keyboard and live results
   fit together; preserve the mounted input, fixed tabs/filters and restore on hide.
   Dismiss/blur search on outside taps or list drag without clearing the query;
   keep row/tab/filter actions working on the first tap and inputs editable.
   The coverage driver sheet reuses readiness identity styling, Avatar and compact
   StatusBadge; show counted commune chips without dividers, ownership copy or footer.

1. **[2026-10-29] Ban generic green/mint success styling across every role**
   Do instead: follow AGENTS.md's visual rule and use shared StatusBadge success
   with unfilled olive icon/text. Keep success tokens aliased to brand olive/cream;
   never restore #216144/#E3F1E6 or similar mint fills. Apply globally, including
   catalogue, fleet availability, opening hours and positive feedback; preserve
   labels, accessibility and server-derived conditions.

1. **[2026-10-29] Keep catalogue and its editor compact**
   Do instead: keep the business summary brief, explanations behind an info action,
   coverage as an intrinsic-width link and unlisted status small with warm fill.
   Listed status uses an unfilled olive check. Use Screen.onRefresh for existing
   refresh queries, equal-size price fields with small currency prefixes and direct
   numeric stock input. Say cilindro, omit price previews and repeated explanations.
   Keep product identity inside the editor scroll, preserve publication/save guards
   and product card composition; do not run visual checks unless asked.

1. **[2026-10-27] Keep purchase steps visual and compact**
   Do instead: use photos for cylinders/exchange/returned brand, bounded quantity
   controls, compact image/product/commune footer and pull refresh for distributors.
   Keep technical/ranking/exchange explanations in details, say cilindro throughout,
   and avoid repeated demo banners in this customer flow. Preserve is_demo contact
   guards, prices and purchase eligibility. Secondary sort/edit actions stay unfilled
   or white; primary purchase actions use brand dark green. See docs/design.md.

1. **[2026-10-26] Guide vehicle documents with visual steps**
   Do instead: keep Flota compact with a thumbnail, plate first, one-line driver,
   uniform unfilled compact StatusBadge and a quiet count/thin progress rail.
   Use intrinsic-width one-line filters; put add/info in the header and secondary
   actions in the vehicle menu. Show a primary only for missing/correctable files;
   keep review/error feedback visible. Offer manual Poner disponible in the menu
   for documented inactive vehicles via set_business_vehicle;
   approval never activates a vehicle or driver. Exclude maintenance/busy from
   Por activar; keep revisions and SQL guards. Use
   photo → padrón → permiso → RT → homologation → SOAP → editable summary, visible
   progress and saved/reviewed/error states. Test-only skips never grant SQL
   eligibility; RT and homologation remain alternatives. See vehicle-documentation-flow.md.
   Inside all seven stages, use brand cream/dark green/olive/lime and custom
   document artwork; never use mint/semantic-green success fills or generic status
   pills. Saved/reviewed states stay unfilled; progress remains visible while scrolling.
   Preview selected files before submission; Ver stays in-app (image zoom, local
   PDF.js via SDK 58 DOM, never an external viewer). Sign URLs only on open and keep
   bytes/URLs in memory. Rebuild Android when camera/scanner native config changes;
   keep PDF rendering in the existing DOM runtime without extra native modules.
   Document scanning is Test-only and native-capability guarded; lazy-load its
   enforcing TurboModule. Expo Go/old APKs keep camera/file. Cancel preserves the
   selection; failures offer camera. Keep dates/review manual and vehicle photos
   outside scanning. See document-scanner.md for the local build command; EAS is optional.

1. **[2026-10-29] Keep distributor Profile and Panel visual and concise**
   Do instead: show icon-led summaries for weekly hours, WhatsApp and delivery ETA;
   open one task per sheet. Keep brand/location forms and manual coordinates behind
   explicit editing, preserve drafts and reveal invalid fields. Keep publication
   consent beside contact editing and real errors visible; avoid explanatory paragraphs
   across the overview. Do not confuse unreported hours with a closed week.
   Pending commercial-profile drafts use a fixed save/discard footer above navigation,
   outside the scroll with reserved space, and olive dots on modified sections.
   Say Listo to collapse editing; keep pending drafts and the footer visible.
   Keep contact/ETA summaries full width, phone on one line, one small edit-pencil
   pattern and all seven weekday columns flexible without minimum widths. Emphasize
   open status with shared unfilled olive StatusBadge; omit redundant helper copy.
   New schedule drafts start with all seven days enabled (Mon–Sat 09:00–20:00,
   Sun 10:00–15:00), editable and unpublished until saved. Preserve existing
   schedules and do not imply the weekly contract handles holiday exceptions.
   Sales and Dashboard show only completed-order customer sale totals (2026-10-29).
   Keep costs/profit and cost-entry actions out of the UI until requested again;
   preserve their backend/data for later. Delivery cards are read-only.
   Sales omit product variants: do not infer an Abastible 15 kg
   photo from weight alone; use a weight tile until the contract exposes variants.
   Panel groups verification/opening status with the business heading, keeps Demo
   as a quiet icon-free tag and sales as the dark focal card. Use compact 2x2
   operation stats, separated catalogue rows and singular/plural counts. Omit
   explanatory demo footers, update timestamps and chart-empty paragraphs.

1. **[2026-10-23] Prioritize commercial validation and the private demo**
   Do instead: follow docs/demo-commercial-validation.md before the full production
   roadmap; demonstrate Maps and real GPS with fictitious orders, distinguish
   foreground from background scope, and confirm distributor contractual permission
   before real operation. Keep pilot requirements open and preserve existing RLS.

1. **[2026-10-25] Keep the driver delivery focused on the stop**
   Do instead: prioritize destination/map, one Navegar entry, compact GPS control
   and load/cash summary. Keep progress fixed below and final confirmation explicit.
   Use floating map controls and pull refresh; place explanations in detail sheets
   without hiding errors, customer notes or tracking privacy consent.
   Keep the navigator chooser visual: two app tiles, one brief background-GPS
   disclosure and optional details, rather than paragraphs and long CTA labels.
   In driver copy say "cilindro vacío", not "envase vacío"; keep load/exchange
   details visual and concise while retaining returned brand and inspection cues.
   Confirm explicit order progress beside the fixed action only after its RPC
   succeeds. Pair text/check with accessible status and haptics; never replay on
   polling. Keep final completion and actionable errors visible until handled.
   Use Gasway cream/dark green/olive/lime for success feedback, not generic success
   greens. Keep completion status quiet; avoid duplicate checks, circles and copy.
   Put "Entrega completada" inside the order card, not in a separate footer alert;
   retain action announcements/haptics independently of presentation.
   Driver Home prioritizes availability, an active delivery and actionable offers;
   keep business/coverage compact and cylinder imagery, cash/exchange/expiry clear.
   Do not invent operational metrics or activate GPS from Home. Prior visual
   permission for Tu entrega does not authorize rendering other app pages.
   Coverage is inherited: use read-only searchable commune rows and a guarded
   availability control; do not imply the driver can edit zones or enable GPS here.
   Driver Account keeps identity, business and grouped actions compact; put access
   explanations in its detail sheet while keeping real blocks/errors visible.
   All bottom sheets use an accessible brand-colored X and downward header/handle
   dragging; preserve inner scrolling/maps, save locks and explicit confirmations.

## Execution & Validation (Highest Priority)

1. **[2026-10-30] Keep SQL runner expectations aligned with the suite manifest**
   Do instead: derive transport request counts from currentSuites(), keep an explicit
   current-suite inventory in test-tooling, and update component boundary mocks when
   controls change. Test forward migrations with rollback before reporting cloud deployment.

1. **[2026-10-25] Keep inline actions intrinsic on native rows**
   Do instead: use auto width and flexShrink for link buttons; keep full-width
   primary buttons inside flexible wrappers. A 100% link can leave sibling text
   at zero width in Yoga and create enormous blank vertical sections. Let narrow
   rows wrap and keep accessibility font scaling; do not mask this with fixed heights.
   Custom sheet headers must size to content: avoid flex: 1 in their vertical
   auto-height container; put larger product summaries inside the scroll instead.

1. **[2026-10-25] Test sheet responder ownership, not only drag callbacks**
   Do instead: claim header touch starts in bubbling before RN Modal takes them;
   do not capture starts ahead of the X. Capture vertical moves and keep a native
   header host. Regression uses installed PanResponder/TouchHistoryMath, not only
   mocked callbacks. Fast Refresh can retain class instances in useState: use a
   full JS Reload after changing the gesture controller, without rebuilding native.

1. **[2026-10-24] Keep automatic query refresh visually quiet**
   Do instead: use Screen.onRefresh for requested pull refresh, or RefreshButton
   for button feedback; never bind manual feedback to isFetching from polling/Realtime.
   Keep initial loading, error and
   authorization guards, pagination coordination and GPS expiry cleanup intact.
   For the customer map, fit initially and on explicit recenter only; GPS polling
   must preserve manual zoom. Keep map identity stable across fresh/stale samples,
   removing expired markers conditionally instead of remounting the whole map.
   Customer order detail now refreshes by pull gesture (Screen.onRefresh), scoped
   to active queries for its user/order. Keep its manual spinner independent of
   polling. Marker.image can fail in MapKit bridgeless (legacy RCTBridge loader).
   Use ArtworkMapMarker with a fixed non-collapsable RN Image wrapper; keep tracking
   until load/layout/paint, then freeze. Keep its load-error pin fallback. Bundled
   home/truck PNGs avoid live SVG children; never equate logic tests with native UI.

1. **[2026-10-24] Capture Google key-creation output before inspecting it**
   Do instead: capture both stdout and stderr for gcloud API-key operations;
   --format does not suppress the operation-completion payload with keyString.
   Print only an allowlist of metadata and write values directly to ignored .env.

1. **[2026-10-23] Verify CI credential scope at the issuer**
   Do instead: inspect Supabase token resource/capability/expiry metadata and
   GitHub environment policies separately. A workflow's Test ref guard does not
   restrict a PAT; GitHub secret timestamps cannot prove token identity or expiry.
   Accept an explicit owner confirmation of token-to-secret mapping as reported
   evidence; an unreadable secret alone does not require credential rotation.
   Keep historical Google projects found by name separate from confirmed pilot
   dependencies; record operator MFA attestations distinctly from direct checks.
   Current demo Maps project is mapapp-389403 (745895471128), renamed Gasway Maps
   on 2026-10-24 at the operator's request because its billing was already active.
   gw-dst (494420889765) is the former unbilled target. Use explicit project flags;
   preserve legacy keys/resources and do not inspect unrelated projects.
   For backups, use native pg_dump and age streaming; the Git-bundled GPG lacks
   keyboxd here. Keep recovery keys outside Git/Drive and confirm off-PC custody.

1. **[2026-10-23] Distinguish implementation from a proposal and installed builds**
   Do instead: verify routes and mutations exist before reporting a feature done;
   state cloud migration status separately. The operator uses Expo/Metro for current
   development tests: reload that checkout for JavaScript changes; only discuss
   rebuilding a standalone APK when that runtime is actually being used.
   Before movement tests, inspect adb reverse/LAN access to Metro; USB forwarding
   does not support walking away. Require no fixed distance or loss of Wi-Fi;
   distinguish synthetic Test positions from physical GPS and native map evidence.

1. **[2026-10-18] Respect the requested validation budget**
   Do instead: follow the current task’s explicit validation budget; by default run only a final typecheck, with no rendering, screenshots, UI installs or backend commands. Explicit user exceptions take precedence.

1. **[2026-10-22] Register source maps before trusting transpiled test coverage**
   Do instead: use the common module loader with inline maps and Node source-map
   support; verify findSourceMap returns the original TypeScript source. VM-only
   execution does not register maps for V8 and can report shifted uncovered lines.

1. **[2026-10-21] Bound image height explicitly in Expo web cards**
   Do instead: give React Native Image both width and height; relative width and
   aspectRatio alone can retain the PNG's intrinsic height on web. Avoid vertical
   flex growth inside content-sized cards in a ScrollView.

1. **[2026-10-22] Trace configured callers before claiming runtime exposure**
   Do instead: follow Expo Router's getLinkingConfig into its forks; SDK 57's active
   query parser uses URLSearchParams, while the bundled React Navigation base parser
   uses query-string.parse. An installed/imported decoder alone does not prove a
   vulnerable call from external URLs.

## Domain Behavior Guardrails

1. **[2026-10-26] Regression fixtures do not prepare a device demo**
   Do instead: check Test prerequisites and use the authorized persistent device
   demo seed before asking for phone evidence. Keep reviewer separate from uploader,
   leave documentary approvals to the UI exercise, and do not copy Project identities
   or passwords. A nonempty Auth password hash does not prove a human-chosen password.
   See docs/device-demo-test.md; never claim physical evidence from SQL setup.

1. **[2026-10-26] Documentary readiness is separate from driver access**
   Do instead: drivers upload their own license via the four-step personal wizard;
   business members track readiness read-only and manage vehicle documents. Never
   label invitation/access approval as full dispatch readiness; use server coverage.
   See driver-documentation-flow.md and ADR 0042 for personal RPC/Storage ownership.
   Keep one pending version per owner/type; replaced uploads are historical and
   unreviewed, distinct from approved/superseded. Never count or review every retry.
   After saved identity + both current license sides, show review pending with
   a secondary update-files action; do not infer incomplete from driver_documents.
   Use documents and its SQL eligibility gates alongside is_verified;
   reuse applicant_rut. Require RT or approved current CHI, license front/back with
   next control by class on back (check legacy front), and vehicle photo. Keep
   Test-only deployment evidence separate; never grandfather demo availability or
   provision reviewers through editable metadata. See docs/document-verification.md.
   Admin UI is on in Test; Project requires its explicit public feature flag,
   off by default. Authorize via is_document_admin/private.document_admins, never
   profiles.role, email or that flag. Grouped workspace uses list_pending_documents
   v2 with its existing ACL; coordinate migration/client rollout. Keep owner steps
   stable after reviews and decisions exclusively through review_document.

1. **[2026-10-24] GPS reads always reauthorize the order**
   Do instead: use shared/tracking RPC contracts; driver_locations is private and
   never read/written directly. Realtime order_tracking_signals carries revisions
   only; refetch after events/reconnect. Expire coordinates at fresh_until, stop on
   terminal/denial/logout, clear cache, and never carry a sample into another order.
   D3 binds capture to explicit intent plus the assigned screen in foreground;
   keep the sensor timestamp, drop fixes during sends/cooldown, and never buffer an
   offline route. Use monotonic deadlines from server_now and subtract request time.
   Expo Go iOS does not bundle Google Maps: Expo Go's Podfile includes only Maps.
   Check UIManager.hasViewManagerConfig('RNMapsGoogleMapView') before mounting;
   env keys cannot add an absent native SDK. Android Go supports Google. Keep
   env/plugin platform keys for future builds. If Google-only conflicts with Go
   iOS, explain the source-backed constraint. The operator authorized Apple Maps
   in iOS Expo Go on 2026-10-25: omit the Google provider in both picker/tracking.
   Keep Google in Android and configured iOS builds; Apple rotates the RN Image
   by vehicle bearing minus camera heading, without moving the camera. Google
   Directions must not be queried/displayed/snapped on Apple Maps; the operator
   authorized OSRM/FOSSGIS only for the demo (including coordinate logs). Keep
   provider-specific caches, shared OSRM budget and attribution. The operator also
   authorized Directions API-only server credentials without an IP restriction;
   gasway-directions-demo is stored only in Supabase secrets in Test/app.
   Native Google uses rotation+flat, with no manual camera-heading compensation.
   Never claim native verification from logic tests.
   Navigation background GPS was authorized for Android on 2026-10-25. Keep it in
   tracking/driver, load TaskManager only in the Android build, request explicit
   consent/permissions and show a service notification. Stop/abort on pause,
   terminal, identity change and scope exit; never replay batches or readopt consent
   after a cold JS restart. Preserve caches on same-session TOKEN_REFRESHED so an
   active driver screen is not unmounted during background token renewal.

1. **[2026-10-23] Keep the requested password policy accessible**
   Do instead: require 8 Unicode code points, uppercase A-Z and digit 0-9 in registration
   and the reset helper; do not add lowercase/symbol requirements or reject legacy login.
   Supabase only offers letter+digit without forced lowercase; document that uppercase
   is client/helper validation, and verify cloud deployment separately (ADR 0030).

1. **[2026-10-23] Registration uses a fixed Chilean mobile prefix**
   Do instead: show the Chile flag and non-editable +56 9; accept exactly eight
   suffix digits. On back erase the password but keep email/phone in memory so
   the user can re-enter their password and resume. Account deletion does not
   reset Auth email quotas; never promise that a local retry timer resets them.

1. **[2026-10-21] Inventory and delivery readiness are independent**
   Do instead: inspect distributor stock/prices/publication, then verified driver affiliation,
   CUT coverage and availability; never infer that stock permits dispatch or autoapprove a driver.

1. **[2026-10-21] The distributor owns delivery coverage**
   Do instead: read/write `distributor_communes` through business membership RPCs;
   drivers inherit their distributor's CUT communes and only edit availability.
   Never restore `driver_communes` or require a driver before configuring business coverage.

1. **[2026-10-20] Cylinder branding follows the manufacturer**
   Do instead: use `ProductImage` with exact brand/weight/variant photos for catalogue,
   purchase and order history. Keep reference/neutral artwork on Inicio only; choose
   brand before size in purchases. Preserve original manufacturer colors and logos.

1. **[2026-10-18] Keep invitation and activation states distinct**
   Do instead: use the existing contracts; invitation rejection/read receipts and the business contact name are not exposed by the workspace response.

## Shell & Command Reliability

1. **[2026-10-24] Match Expo Go to the project's SDK**
   Do instead: use SDK 58 for the current iOS Expo Go; launch it from the root with
   npm start -- --go --clear. Keep npm start for development builds and rebuild
   their native runtime after an SDK upgrade or adding a native dependency (including
   image picker/manipulator); a Metro reload cannot upgrade an APK. Verify generated
   registration and APK DEX, then install with -r on user 0; preserve signature/data.
   Match build commands to the terminal: PowerShell uses .\gradlew.bat; Git Bash
   uses ./gradlew and forward slashes. Never paste PowerShell paths into Bash.
   Keep React/React DOM root overrides aligned with Expo's matrix, then deduplicate
   and verify with Expo Doctor; wildcard CLI peers can install a second React patch.
   SDK 58 prebuild cleans native folders by default; use --no-clean to keep them.
   Back up/restore the debug keystore before regeneration. On Windows preserve the
   CMake path-limit plugin; verify generated object paths before a lengthy rebuild.
   For duplicate Samsung icons, inspect pm users/package paths first: this phone
   has DUAL_APP user 95. Use main user 0 for the demo; the clone's RN inspector
   crashes reading SSAID. Do not uninstall a profile or clear data as a shortcut.

1. **[2026-10-23] Start Expo from the mobile workspace**
   Do instead: use npm start from the repo root, or pass apps/mobile to expo start.
   Bare npx expo start at the root falls back to expo/AppEntry and fails on ../../App.
   Keep the root start script's trailing -- so CLI options reach the mobile script.

1. **[2026-10-23] Keep Expo config imports loadable by Node**
   Do instead: share generated JSON with app.config.ts. Its config loader transpiles
   the entry file but cannot resolve extensionless imports of sibling TypeScript files.

1. **[2026-10-22] Inspect cloud Auth without syncing local defaults**
   Do instead: use `supabase config diff --project-ref <ref> --output-format json`
   and select only needed fields; `--output json` is unsupported for this command.
   Matching declared fields have no diff. Never use config push as an audit shortcut;
   for authorized changes use a partial overlay with a reviewed declared-path allowlist
   and verify afterward. CLI 2.121 push preserves fields absent from that overlay.

1. **[2026-10-22] Test cloud connections without local link-cache assumptions**
   Do instead: use db:test:cloud over HTTPS when a scoped PAT is set; a clean Actions
   runner lacks pooler metadata and CLI Postgres setup can fail without IPv6.
   Re-run jobs keeps the old commit; start a new run after merging a transport fix.

1. **[2026-10-22] Explicit cloud targets still require the linked selector in CLI 2.121**
   Do instead: use `--linked --project-ref <ref>` for db query and migration up.
   Gasway Test is xnrueexpwzvxotgwmamj; preserve the app project's CLI link and run
   mutations only through the test-target guards for regression tasks.

1. **[2026-10-22] Offline npm can report an empty audit without checking advisories**
   Do instead: for dependency reviews, use explicit `--offline=false --prefer-offline=false`,
   inspect the exit code and error body, and discard offline zero-vulnerability reports.
   Resolve package versions from the mobile workspace; root React can be a different version.

1. **[2026-10-21] Cloud CLI SQL sessions share a temporary login role**
   Do instead: run Supabase cloud SQL/advisor commands sequentially; concurrent role
   initialization can invalidate another connection's temporary password. For authorized
   concurrency tests prefer scoped PAT/HTTPS; local runners need startup grace before
   another CLI initializes, then must prove distinct PID and pg_blocking_pids. Use the
   linked CLI when the connector belongs to a different account; never expose credentials.
   CLI db query returns only the last statement result: combine inventories into one
   SELECT with JSON fields when every result is needed.

1. **[2026-10-21] Preserve SQL dollar delimiters in JavaScript replacements**
   Do instead: use a replacement callback when inserting SQL with `String.replace`;
   a replacement string collapses `$$` to `$` and corrupts function bodies.

1. **[2026-10-21] Pass ripgrep globs through its own filter on Windows**
   Do instead: search a directory with `rg -g '*.sql' ... supabase/migrations`;
   do not pass a wildcard filename as a positional PowerShell path.
