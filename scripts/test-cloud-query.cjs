const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { queryCloud } = require('./testing/cloud-query.cjs');
const { currentSuites } = require('./testing/sql-suites.cjs');
const { projectRef, protectedProjectRefs } = require('../supabase/test-environment.json');

async function main() {
  const token = 'fake-scoped-token';
  const query = 'begin; select 1; rollback;';
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    assert.equal(url, `https://api.supabase.com/v1/projects/${projectRef}/database/query`);
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.deepEqual(JSON.parse(options.body), { query, read_only: false });
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, status: 201, json: async () => [] };
  };
  assert.deepEqual(await queryCloud({ ref: projectRef, token, query, request }), []);
  assert.equal(calls, 1);
  for (const ref of [undefined, protectedProjectRefs[0], 'a'.repeat(20)]) {
    await assert.rejects(queryCloud({ ref, token, query, request }), /dedicated Gasway Test/);
  }
  await assert.rejects(queryCloud({ ref: projectRef, token: '', query, request }), /required/);
  assert.equal(calls, 1, 'invalid targets and missing credentials must not contact the server');
  for (const status of [401, 403, 429, 500]) {
    let attempts = 0;
    await assert.rejects(
      queryCloud({
        ref: projectRef,
        token,
        query,
        request: async () => {
          attempts++;
          return { ok: false, status, json: async () => ({ message: `denied ${token}` }) };
        },
      }),
      (error) =>
        error.message.includes(`HTTP ${status}`) &&
        error.message.includes('[REDACTED]') &&
        !error.message.includes(token),
    );
    assert.equal(attempts, 1, 'failed SQL must not be retried');
  }
  await assert.rejects(
    queryCloud({
      ref: projectRef,
      token,
      query,
      request: async () => {
        throw new Error(token);
      },
    }),
    /connection failed or timed out/,
  );
  await assert.rejects(
    queryCloud({
      ref: projectRef,
      token,
      query,
      request: async () => ({
        ok: true,
        status: 201,
        json: async () => {
          throw new Error('not JSON');
        },
      }),
    }),
    /invalid JSON/,
  );
  for (const failure of [false, true]) {
    const child = spawnSync(
      process.execPath,
      ['--require', './scripts/testing/mock-cloud-http.cjs', './scripts/run-sql-tests.cjs'],
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CI: 'true',
          GASWAY_TEST_PROJECT_REF: projectRef,
          SUPABASE_ACCESS_TOKEN: token,
          GASWAY_TEST_HTTP_FAILURE: failure ? '1' : '0',
        },
      },
    );
    if (child.error) throw child.error;
    assert.equal(child.status, failure ? 1 : 0, child.stderr);
    assert.equal(
      (child.stdout.match(/FIXTURE HTTPS request/g) ?? []).length,
      failure ? 1 : currentSuites().length,
    );
    assert.ok(child.stdout.includes('Supabase Management API over HTTPS'));
    assert.equal((child.stdout + child.stderr).includes(token), false);
    if (failure) assert.ok(child.stderr.includes('FAIL injected SQL assertion'));
  }
  console.log(
    'PASS: HTTPS SQL transport without CLI link/cache, exact target, credentials, SQL errors, redaction and no retries',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
