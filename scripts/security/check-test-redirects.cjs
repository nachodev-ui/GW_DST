// Local CLI, dedicated Test only. Generates links without sending mail.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { targetProject } = require('../testing/sql-suites.cjs');
const { cliJson } = require('./supabase-cli.cjs');

async function main() {
  if (process.env.CI) throw new Error('Run redirect verification locally');
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const marker = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--output',
    'json',
    `select project_ref from private.test_environment where project_ref = '${ref}'`,
  ]);
  assert.equal(marker.rows?.[0]?.project_ref, ref, 'Dedicated Test marker missing');
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  const key = keys.find((value) => value.name === 'service_role')?.api_key;
  if (!key?.startsWith('eyJ')) throw new Error('Test administrative key unavailable');
  const base = `https://${ref}.supabase.co`;
  const admin = createClient(base, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const allowed = 'gasway://auth/confirm';
  const cases = [
    ['exact destination', allowed, allowed],
    ['external domain', 'https://example.invalid/confirm', allowed],
    ['lookalike scheme', 'gasway-test://auth/confirm', allowed],
    ['lookalike host', 'gasway://auth.example.invalid/confirm', allowed],
    ['userinfo trick', 'gasway://auth@example.invalid/confirm', allowed],
    ['HTTPS scheme', 'https://auth/confirm', allowed],
    ['localhost', 'http://localhost:8081', allowed],
    // Supabase also trusts the Site URL origin; exact entries do not constrain its paths.
    ['Site URL same-origin exception', 'gasway://auth/unexpected', 'gasway://auth/unexpected'],
  ];
  for (const [label, redirectTo, expected] of cases) {
    let id;
    try {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'signup',
        email: `dt07-redirect-${randomUUID()}@example.invalid`,
        password: `Aa1!${randomBytes(24).toString('hex')}`,
        options: { redirectTo },
      });
      if (error || !data.user) throw new Error(`Link generation failed: ${label}`);
      id = data.user.id;
      assert.equal(data.properties.redirect_to, expected, `Unexpected redirect policy: ${label}`);
      const action = new URL(data.properties.action_link);
      assert.equal(action.origin, base, 'Unexpected verification server');
      assert.equal(action.pathname, '/auth/v1/verify', 'Unexpected verification endpoint');
      const response = await fetch(action, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(response.status, 303, 'Expected verification redirect');
      const location = new URL(response.headers.get('location'));
      assert.equal(
        `${location.protocol}//${location.host}${location.pathname}`,
        expected,
        'Verification redirect mismatch',
      );
      const token = new URLSearchParams(location.hash.slice(1)).get('access_token');
      if (!token) throw new Error(`No verification session: ${label}`);
      const user = await admin.auth.admin.getUserById(id);
      assert.ok(user.data.user?.email_confirmed_at, 'Verification did not confirm email');
      const revoked = await admin.auth.admin.signOut(token, 'local');
      if (revoked.error) throw new Error('Temporary verification session logout failed');
      if (label === 'exact destination') {
        const replay = await fetch(action, {
          redirect: 'manual',
          signal: AbortSignal.timeout(30_000),
        });
        const repeated = new URL(replay.headers.get('location'));
        assert.equal(
          new URLSearchParams(repeated.hash.slice(1)).get('error_code'),
          'otp_expired',
          'Reused confirmation accepted',
        );
      }
      console.log(`PASS: ${label}`);
    } finally {
      if (id) {
        const deleted = await admin.auth.admin.deleteUser(id);
        if (deleted.error) throw new Error(`Test user cleanup failed: ${id}`);
      }
    }
  }
  console.log('CLEAN: all synthetic redirect accounts deleted; verification sessions revoked');
}

main().catch((error) => {
  console.error(
    error instanceof assert.AssertionError
      ? error.message.split('\n')[0]
      : 'Redirect verification failed; credentials and links suppressed',
  );
  process.exitCode = 1;
});
