// Real Auth/Data API smoke test. Local CLI only, dedicated project only, no email sent.
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { targetProject } = require('../testing/sql-suites.cjs');
const { cliJson } = require('./supabase-cli.cjs');

async function main() {
  if (process.env.CI)
    throw new Error('Run Auth smoke locally; CI does not retrieve administrative API keys');
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
  assert.equal(marker.rows?.[0]?.project_ref, ref, 'Dedicated test marker missing');
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  const publicKey = keys.find((key) => key.type === 'publishable')?.api_key;
  const adminKey = keys.find((key) => key.name === 'service_role')?.api_key;
  if (!publicKey?.startsWith('sb_publishable_') || !adminKey?.startsWith('eyJ')) {
    throw new Error('Expected Test publishable and administrative keys unavailable');
  }
  const url = `https://${ref}.supabase.co`;
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  const admin = createClient(url, adminKey, options);
  const clients = [createClient(url, publicKey, options), createClient(url, publicKey, options)];
  const created = [];
  let failed = false;
  try {
    const credentials = [];
    for (let index = 0; index < clients.length; index++) {
      const email = `dt07-${randomUUID()}@example.invalid`;
      // Runtime entropy, with character classes required by stricter Auth policies.
      const password = randomBytes(30).toString('base64url').concat('Aa1!');
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: index === 1,
        user_metadata: { role: 'driver', is_verified: true, is_admin: true },
      });
      if (error || !data.user) throw new Error('Test account creation failed');
      created.push(data.user.id);
      credentials.push({ email, password });
    }
    const denied = await clients[0].auth.signInWithPassword(credentials[0]);
    assert.equal(denied.error?.code, 'email_not_confirmed', 'Unconfirmed email must not sign in');
    assert.equal(denied.data.session, null, 'Unconfirmed account received a session');
    console.log('PASS: unconfirmed email rejected by real Auth');
    const confirmation = await admin.auth.admin.updateUserById(created[0], { email_confirm: true });
    if (confirmation.error) throw new Error('Test account confirmation failed');
    for (let index = 0; index < clients.length; index++) {
      const login = await clients[index].auth.signInWithPassword(credentials[index]);
      if (login.error || !login.data.session) throw new Error('Confirmed account login failed');
      const own = await clients[index].from('profiles').select('id,role');
      if (own.error) throw new Error('Profile query failed');
      assert.equal(own.data.length, 1, 'Data API exposed another profile');
      assert.equal(own.data[0].id, created[index], 'Data API returned wrong identity');
      assert.equal(own.data[0].role, 'customer', 'Editable metadata escalated role');
      const escalation = await clients[index]
        .from('profiles')
        .update({ role: 'driver' })
        .eq('id', created[index]);
      assert.equal(escalation.error?.code, '42501', 'Data API allowed role escalation');
    }
    const anonymous = createClient(url, publicKey, options);
    const exposed = await anonymous.from('profiles').select('id');
    assert.equal(exposed.error?.code, '42501', 'Anonymous Data API profile access allowed');
    const rpc = await anonymous.rpc('get_my_driver_workspace');
    assert.ok(rpc.error, 'Anonymous Data API RPC access allowed');
    console.log(
      'PASS: confirmed logins, cross-account RLS, metadata and role-write rejection, anonymous denial',
    );
  } finally {
    for (const client of clients) {
      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) failed = true;
      } catch {
        failed = true;
      }
    }
    for (const id of created) {
      try {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) {
          failed = true;
          console.error(`Test account cleanup failed: ${id}`);
        }
      } catch {
        failed = true;
        console.error(`Test account cleanup failed: ${id}`);
      }
    }
    if (failed)
      throw new Error('Test cleanup incomplete; inspect only the reported test account IDs');
    console.log(`CLEAN: ${created.length} temporary accounts deleted; local sessions signed out`);
  }
}

main().catch((error) => {
  // Only our fixed messages / assertion labels are emitted, never SDK or HTTP objects.
  console.error(
    error instanceof assert.AssertionError ? error.message.split('\n')[0] : error.message,
  );
  process.exitCode = 1;
});
