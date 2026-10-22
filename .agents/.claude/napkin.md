# Napkin Runbook

## Curation Rules

- Keep recurring, high-value notes; sort by importance and cap each category at 10.
- Every note includes a date and a concrete Do instead action.

## Execution & Validation

1. **[2026-10-18] Realtime reuses channels by topic while removal is asynchronous.**
   Do instead: use a distinct topic per effect subscription and remove only its owned channel; cover immediate remounts and late callbacks in offline tests.
1. **[2026-10-17] Keep checks within the requested budget.**
   Do instead: follow the current task validation budget; for the initial scaffold install once and typecheck once, without emulators, renders, screenshots or visual checks.
1. **[2026-10-18] Modern Supabase secret keys are not JWTs.**
   Do instead: send sb_secret_* only as apikey in direct admin HTTP calls and use an explicit terminal User-Agent; reserve Bearer for user JWTs or legacy service_role keys.
1. **[2026-10-18] Optional UI props use exact optional types.**
   Do instead: omit optional string props or pass a string (empty when unused); do not pass explicit undefined unless the shared contract allows it.
1. **[2026-10-18] Connector and CLI may use different Supabase accounts.**
   Do instead: match the app URL and linked project ref against accessible projects; if the connector lacks Gasway, check the authenticated CLI before requesting credentials. Reconcile manual migration history only after verifying the deployed schema.

## Domain Guardrails

1. **[2026-10-18] Role capability and current view are independent.**
   Do instead: allow authenticated customer routes for approved drivers without changing role; keep driver guards/SQL approval and business membership checks. Scope purchase Realtime to the customer layout focus, not profile.role.

1. **[2026-10-17] Preserve the scaffold boundary.**
   Do instead: implement only requested features; keep assignment atomic in Postgres and RLS enabled.
1. **[2026-10-18] Catalogue products initially have no commercial prices.**
   Do instead: require a server price for purchase; never invent commercial prices. Explicitly authorized demo prices belong to is_demo businesses in distributor_products, which is not yet wired to order pricing.
1. **[2026-10-18] Offer recipients are not order participants.**
   Do instead: expose only minimal summaries through an authenticated RPC; preserve participant-only orders RLS and reuse private.accept_order for assignment.
1. **[2026-10-18] Weight alone no longer identifies catalogue products.**
   Do instead: select by product UUID, include variant in summaries, and target `(brand, weight_kg, variant)` in seed/test conflicts; VMA/VM belong only to Abastible 15 kg.
1. **[2026-10-18] Separate seller, delivery and empty-cylinder exchange.**
   Do instead: start onboarding from a business invitation accepted by the confirmed-email account, then require admin approval; keep legacy confirmations versioned. Dispatch only configured business brands; never reject an empty solely for its brand. See ADR 0015 and docs/market-context-chile.md.

## User Directives

