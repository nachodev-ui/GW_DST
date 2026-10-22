# Napkin Runbook

## Execution & Validation (Highest Priority)

1. **[2026-10-18] Respect the requested validation budget**
   Do instead: follow the current task’s explicit validation budget; by default run only a final typecheck, with no rendering, screenshots, UI installs or backend commands. Explicit user exceptions take precedence.

2. **[2026-10-21] Bound image height explicitly in Expo web cards**
   Do instead: give React Native Image both width and height; relative width and
   aspectRatio alone can retain the PNG's intrinsic height on web. Avoid vertical
   flex growth inside content-sized cards in a ScrollView.

## Domain Behavior Guardrails

1. **[2026-10-21] Inventory and delivery readiness are independent**
   Do instead: inspect distributor stock/prices/publication, then verified driver affiliation,
   CUT coverage and availability; never infer that stock permits dispatch or autoapprove a driver.

2. **[2026-10-21] The distributor owns delivery coverage**
   Do instead: read/write `distributor_communes` through business membership RPCs;
   drivers inherit their distributor's CUT communes and only edit availability.
   Never restore `driver_communes` or require a driver before configuring business coverage.

3. **[2026-10-20] Cylinder branding follows the manufacturer**
   Do instead: use `ProductImage` with exact brand/weight/variant photos for catalogue,
   purchase and order history. Keep reference/neutral artwork on Inicio only; choose
   brand before size in purchases. Preserve original manufacturer colors and logos.

4. **[2026-10-18] Keep invitation and activation states distinct**
   Do instead: use the existing contracts; invitation rejection/read receipts and the business contact name are not exposed by the workspace response.

## Shell & Command Reliability

1. **[2026-10-22] Offline npm can report an empty audit without checking advisories**
   Do instead: for dependency reviews, use explicit `--offline=false --prefer-offline=false`,
   inspect the exit code and error body, and discard offline zero-vulnerability reports.
   Resolve package versions from the mobile workspace; root React can be a different version.

2. **[2026-10-21] Cloud CLI SQL sessions share a temporary login role**
   Do instead: run Supabase cloud SQL/advisor commands sequentially; concurrent role
   initialization can invalidate another connection's temporary password. Use the linked
   CLI session when the connector belongs to a different account; never expose credentials.

3. **[2026-10-21] Preserve SQL dollar delimiters in JavaScript replacements**
   Do instead: use a replacement callback when inserting SQL with `String.replace`;
   a replacement string collapses `$$` to `$` and corrupts function bodies.

4. **[2026-10-21] Pass ripgrep globs through its own filter on Windows**
   Do instead: search a directory with `rg -g '*.sql' ... supabase/migrations`;
   do not pass a wildcard filename as a positional PowerShell path.

5. **[2026-10-20] Explicit UTF-8 for Python file edits on Windows**
   Do instead: pass encoding="utf-8" to both read_text and write_text; the default
   Windows encoding can corrupt Spanish copy when mixed with UTF-8 writes.
