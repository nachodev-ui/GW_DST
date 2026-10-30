// Explicit operator action, Test only. No invitations, emails or passwords generated/logged.
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const { targetProject } = require('../testing/sql-suites.cjs');
const { cliJson } = require('./supabase-cli.cjs');
async function main() {
  if (process.env.CI || process.argv.length !== 3)
    throw new Error(
      'Local use: node scripts/security/provision-test-document-reviewer.cjs <email>',
    );
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const email = z.email().max(254).parse(process.argv[2]).toLowerCase();
  const literal = (value) => `'${value.replaceAll("'", "''")}'`;
  const query = (sql) =>
    cliJson(['db', 'query', '--linked', '--project-ref', ref, '--output-format', 'json', sql]);
  const inspected =
    query(`select exists(select 1 from private.test_environment where project_ref=${literal(ref)}) as test,
    (select id from auth.users where lower(email)=${literal(email)}) as user_id`);
  if (inspected.rows?.[0]?.test !== true) throw new Error('Dedicated Test marker missing');
  let id = inspected.rows[0].user_id;
  const created = !id;
  if (!id) {
    const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
    const key = keys.find((item) => item.name === 'service_role')?.api_key;
    if (!key) throw new Error('Test administrative credential unavailable');
    const admin = createClient(`https://${ref}.supabase.co`, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (result.error || !result.data.user)
      throw new Error('Could not create Test account; no email was requested');
    id = result.data.user.id;
  }
  id = z.uuid().parse(id);
  const provisioned =
    query(`insert into private.document_admins(user_id) values(${literal(id)}::uuid) on conflict do nothing;
    select exists(select 1 from private.document_admins where user_id=${literal(id)}::uuid) as enabled`);
  if (provisioned.rows?.[0]?.enabled !== true) throw new Error('Reviewer provisioning unconfirmed');
  console.log(
    JSON.stringify({
      projectRef: ref,
      email,
      userId: id,
      created,
      reviewerProvisioned: true,
      ...(created
        ? {
            passwordConfigured: false,
            nextStep: 'Set a password in Test Auth before signing in; no emails were sent.',
          }
        : {}),
    }),
  );
}
main().catch(() => {
  console.error('Test reviewer provisioning failed; privileged output suppressed');
  process.exitCode = 1;
});
