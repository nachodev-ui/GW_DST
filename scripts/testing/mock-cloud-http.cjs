const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { projectRef } = require('../../supabase/test-environment.json');

// Child-process fixture: emulate CI without permitting CLI resolution or link-cache reads.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  if (name.startsWith('supabase/')) throw new Error('HTTPS runner must not resolve the CLI');
  return resolve.call(this, name, ...args);
};
const read = fs.readFileSync;
fs.readFileSync = function (filename, ...args) {
  if (/[\\/]\.temp[\\/](project-ref|pooler-url|linked-project\.json)$/.test(String(filename))) {
    throw new Error('HTTPS runner must not read linked project metadata');
  }
  return read.call(this, filename, ...args);
};
globalThis.fetch = async (url, options) => {
  assert.equal(url, `https://api.supabase.com/v1/projects/${projectRef}/database/query`);
  assert.equal(options.headers.Authorization, 'Bearer fake-scoped-token');
  const { query, read_only } = JSON.parse(options.body);
  assert.equal(read_only, false);
  assert.ok(query.startsWith('begin;'));
  assert.ok(query.includes('private.test_environment'));
  assert.ok(query.trim().endsWith('rollback;'));
  console.log('FIXTURE HTTPS request');
  if (process.env.GASWAY_TEST_HTTP_FAILURE === '1') {
    return {
      ok: false,
      status: 400,
      json: async () => ({ message: 'FAIL injected SQL assertion' }),
    };
  }
  return { ok: true, status: 201, json: async () => [] };
};
