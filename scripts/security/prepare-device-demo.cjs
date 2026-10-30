// Operator-authorized, persistent fictitious Test data. Never copies Project data or sends mail.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { targetProject } = require('../testing/sql-suites.cjs');
const { cliJson } = require('./supabase-cli.cjs');
async function main() {
  if (process.env.CI || process.argv.length !== 2) throw new Error('Local operator action only');
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const inspected = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--output-format',
    'json',
    `select exists(select 1 from private.test_environment where project_ref='${ref}') as test,
      (select jsonb_agg(jsonb_build_object('email',email,'id',id)) from auth.users where lower(email) in ('nacho.rtk@gmail.com','ig.cisternas@duocuc.cl')) as accounts`,
  ]);
  if (inspected.rows?.[0]?.test !== true) throw new Error('Dedicated Test marker missing');
  const existing = inspected.rows[0].accounts ?? [];
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  const key = keys.find((item) => item.name === 'service_role')?.api_key;
  if (!key) throw new Error('Test administrative key unavailable');
  const admin = createClient(`https://${ref}.supabase.co`, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const email of ['nacho.rtk@gmail.com', 'ig.cisternas@duocuc.cl']) {
    if (existing.some((user) => user.email.toLowerCase() === email)) continue;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error || !created.data.user)
      throw new Error('Could not create approved demo account');
    console.log(
      JSON.stringify({ email, created: true, passwordConfigured: false, emailsSent: false }),
    );
  }
  const sqlFile = path.join(__dirname, '../../supabase/testing/seed-device-demo.sql');
  if (!fs.existsSync(sqlFile)) throw new Error('Demo SQL missing');
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('supabase/dist/supabase.js'),
      'db',
      'query',
      '--linked',
      '--project-ref',
      ref,
      '--file',
      sqlFile,
    ],
    { stdio: 'inherit', timeout: 90000 },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
main().catch(() => {
  console.error('Test demo setup failed; credentials and privileged Auth output suppressed');
  process.exitCode = 1;
});
