// Read-only Test readiness. Never prints API keys, passwords, tokens or password hashes.
const { targetProject } = require('../testing/sql-suites.cjs');
const { cliJson } = require('./supabase-cli.cjs');
try {
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  console.log(
    JSON.stringify({
      localUrlIsTest:
        process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === `https://${ref}.supabase.co`,
      localPublicKeyMatchesTest: keys.some(
        (key) =>
          key.api_key === process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
          (key.type === 'publishable' || key.name === 'anon'),
      ),
    }),
  );
  const functions = cliJson(['functions', 'list', '--project-ref', ref, '--output', 'json']);
  console.log(
    JSON.stringify({
      testFunctions: functions.map((fn) => ({ name: fn.slug ?? fn.name, status: fn.status })),
    }),
  );
  const query = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--output-format',
    'json',
    "select jsonb_agg(jsonb_build_object('id',id,'email',email,'password_hash_present',coalesce(encrypted_password,'')<>'')) as accounts from auth.users where lower(email) in ('nacho.rtk@gmail.com','ig.cisternas@duocuc.cl','ig.cisternas.dev@gmail.com')",
  ]);
  console.log(JSON.stringify(query.rows?.[0]));
} catch {
  console.error('Test readiness inspection failed; privileged output suppressed');
  process.exitCode = 1;
}
