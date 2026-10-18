# Napkin Runbook

## Curation Rules

- Keep recurring, high-value notes; sort by importance and cap each category at 10.
- Every note includes a date and a concrete Do instead action.

## Execution & Validation

1. **[2026-10-17] Keep checks within the requested budget.**
   Do instead: follow the current task validation budget; for the initial scaffold install once and typecheck once, without emulators, renders, screenshots or visual checks.
2. **[2026-10-18] Modern Supabase secret keys are not JWTs.**
   Do instead: send sb_secret_* only as apikey in direct admin HTTP calls and use an explicit terminal User-Agent; reserve Bearer for user JWTs or legacy service_role keys.
3. **[2026-10-18] Optional UI props use exact optional types.**
   Do instead: omit optional string props or pass a string (empty when unused); do not pass explicit undefined unless the shared contract allows it.

## Domain Guardrails

1. **[2026-10-17] Preserve the scaffold boundary.**
   Do instead: implement only requested features; keep assignment atomic in Postgres and RLS enabled.
2. **[2026-10-18] Catalogue products initially have no commercial prices.**
   Do instead: require a configured products.unit_price_clp for purchase; never invent seed prices or accept mobile totals.
3. **[2026-10-18] Offer recipients are not order participants.**
   Do instead: expose only minimal summaries through an authenticated RPC; preserve participant-only orders RLS and reuse private.accept_order for assignment.

## User Directives

1. **[2026-10-18] Design skill requirements follow the current user instructions.**
   Do instead: check the supplied AGENTS.md before UI work; when it explicitly requires the design skills, consult their existing skills-disabled paths without restoring moved files.
