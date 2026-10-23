// Read-only runtime check. Uses an invalid token; never creates or confirms a user.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { cliJson } = require('./supabase-cli.cjs');

async function main() {
  const ref = process.env.GASWAY_AUTH_PROJECT_REF;
  if (!['xnrueexpwzvxotgwmamj', 'gleltbrvpfvfgggcatpt'].includes(ref))
    throw new Error('Explicit Gasway project required');
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  const key = keys.find((value) => value.type === 'publishable')?.api_key;
  if (!key?.startsWith('sb_publishable_')) throw new Error('Publishable key unavailable');
  const url = new URL(`https://${ref}.supabase.co/auth/v1/verify`);
  url.searchParams.set('token', randomBytes(32).toString('hex'));
  url.searchParams.set('type', 'signup');
  url.searchParams.set('redirect_to', 'https://example.invalid/confirm');
  const response = await fetch(url, {
    headers: { apikey: key },
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 303, 'Expected invalid-token redirect');
  const location = new URL(response.headers.get('location'));
  const destination = `${location.protocol}//${location.host}${location.pathname}`;
  console.log(
    JSON.stringify({
      project: ref,
      destination,
      hasSession: location.hash.includes('access_token='),
    }),
  );
  assert.equal(destination, 'gasway://auth/confirm', 'Runtime still uses an unexpected fallback');
  assert.equal(
    new URLSearchParams(location.hash.slice(1)).has('access_token'),
    false,
    'Invalid token issued session',
  );
  console.log('PASS: runtime fallback is native; external redirect rejected; no account modified');
}
main().catch((error) => {
  console.error(
    error instanceof assert.AssertionError
      ? error.message.split('\n')[0]
      : 'Read-only redirect check failed; credentials suppressed',
  );
  process.exitCode = 1;
});
