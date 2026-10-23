// Explicitly invoked real-email test, dedicated Test only. No credentials saved.
// Start, then POST the received confirmation URL as {"url":"..."} to the loopback bridge.
const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const { cliJson } = require('./supabase-cli.cjs');
const { targetProject } = require('../testing/sql-suites.cjs');

async function main() {
  if (process.env.CI) throw new Error('Real email test is local only');
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const email = z.email().parse(process.env.GASWAY_CONFIRMATION_TEST_EMAIL);
  const marker = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--output',
    'json',
    `select project_ref from private.test_environment where project_ref='${ref}'`,
  ]);
  if (marker.rows?.[0]?.project_ref !== ref) throw new Error('Dedicated Test marker missing');
  const existing = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--output',
    'json',
    `select count(*)::integer as count from auth.users where lower(email)=lower('${email.replaceAll("'", "''")}')`,
  ]);
  if (existing.rows?.[0]?.count !== 0)
    throw new Error('Use a new test email; existing account will not be modified');
  const keys = cliJson(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']);
  const base = `https://${ref}.supabase.co`;
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  const admin = createClient(base, keys.find((k) => k.name === 'service_role').api_key, options);
  const values = new Map();
  const storage = {
    getItem: async (k) => values.get(k) ?? null,
    setItem: async (k, v) => {
      values.set(k, v);
    },
    removeItem: async (k) => {
      values.delete(k);
    },
  };
  const client = createClient(base, keys.find((k) => k.type === 'publishable').api_key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage,
    },
  });
  // Generate the entire secret at runtime; append character classes for Auth policy.
  const password = randomBytes(24).toString('base64url').concat('Aa1!');
  const signup = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: 'gasway://auth/confirm' },
  });
  let id = signup.data.user?.id;
  if (signup.error) {
    process.exitCode = 1;
    console.log(
      JSON.stringify({
        phase: 'send',
        ok: false,
        code: signup.error.code,
        status: signup.error.status,
      }),
    );
    if (id) await admin.auth.admin.deleteUser(id);
    return;
  }
  if (!id || signup.data.session) {
    await client.auth.signOut({ scope: 'local' });
    if (id) await admin.auth.admin.deleteUser(id);
    throw new Error('Expected unconfirmed test account');
  }
  const denied = await client.auth.signInWithPassword({ email, password });
  if (denied.error?.code !== 'email_not_confirmed') {
    await client.auth.signOut({ scope: 'local' });
    await admin.auth.admin.deleteUser(id);
    throw new Error('Unconfirmed sign-in was not rejected');
  }
  let cleaned = false;
  let busy = false;
  async function cleanup() {
    if (cleaned) return;
    await client.auth.signOut({ scope: 'local' });
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) throw new Error(`Test account cleanup failed: ${id}`);
    cleaned = true;
    values.clear();
    console.log('CLEAN: real-email test account deleted; session closed and memory cleared');
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (
      busy ||
      req.headers.origin ||
      req.method !== 'POST' ||
      req.headers['content-type'] !== 'application/json'
    ) {
      res.writeHead(403);
      res.end('{"ok":false}');
      return;
    }
    busy = true;
    try {
      if (req.url === '/cleanup') {
        await cleanup();
        res.end('{"ok":true}');
        server.close();
        return;
      }
      if (req.url !== '/verify') throw new Error('Unsupported probe operation');
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16_384) throw new Error('Input too large');
      }
      const action = new URL(JSON.parse(body).url);
      if (
        action.origin !== base ||
        action.pathname !== '/auth/v1/verify' ||
        action.searchParams.get('type') !== 'signup'
      )
        throw new Error('Unexpected confirmation endpoint');
      const response = await fetch(action, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      const location = new URL(response.headers.get('location'));
      if (`${location.protocol}//${location.host}${location.pathname}` !== 'gasway://auth/confirm')
        throw new Error('Unexpected effective redirect');
      const code = location.searchParams.get('code');
      if (!code || location.hash.includes('access_token'))
        throw new Error('Expected PKCE code, not bearer tokens');
      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (
        exchanged.error ||
        exchanged.data.user?.id !== id ||
        !exchanged.data.user?.email_confirmed_at
      )
        throw new Error('PKCE confirmation failed');
      const replay = await fetch(action, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      const replayLocation = new URL(replay.headers.get('location'));
      if (new URLSearchParams(replayLocation.hash.slice(1)).get('error_code') !== 'otp_expired')
        throw new Error('Confirmation link reuse was accepted');
      await client.auth.signOut({ scope: 'local' });
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error || login.data.user?.id !== id)
        throw new Error('Confirmed password login failed');
      console.log(
        'PASS: real mail link, native redirect, PKCE, server email confirmation, replay rejection and password sign-in',
      );
      await cleanup();
      res.end('{"ok":true}');
      server.close();
    } catch {
      process.exitCode = 1;
      try {
        await cleanup();
      } catch {
        console.error(`Manual Test cleanup required: ${id}`);
      }
      res.writeHead(400);
      res.end('{"ok":false,"details":"suppressed"}');
      server.close();
    } finally {
      busy = false;
    }
  });
  const expiry = setTimeout(() => {
    void cleanup().finally(() => server.close());
  }, 15 * 60_000);
  server.on('close', () => clearTimeout(expiry));
  process.on('SIGINT', () => {
    void cleanup().finally(() => server.close());
  });
  server.listen(0, '127.0.0.1', () => {
    console.log(JSON.stringify({ phase: 'sent', ok: true, port: server.address().port }));
  });
}
main().catch(() => {
  console.error('Email probe failed; credentials, addresses and links suppressed');
  process.exitCode = 1;
});
