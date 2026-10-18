// Local assertions only: no network, native runtime or database required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(source, mocks = {}) {
  const filename = path.join(__dirname, '..', source);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
    },
    { filename },
  );
  return module.exports;
}

async function main() {
  const { resolveZone, profileSchema, driverSchema } = load(
    'apps/mobile/src/features/auth/access.ts',
    {
      '@/shared/supabase/client': {},
    },
  );
  assert.equal(resolveZone({ role: 'customer' }, null), 'customer');
  assert.equal(resolveZone({ role: 'customer' }, { is_verified: false }), 'pending');
  assert.equal(resolveZone({ role: 'customer' }, { is_verified: true }), 'pending');
  assert.equal(resolveZone({ role: 'driver' }, null), 'pending');
  assert.equal(resolveZone({ role: 'driver' }, { is_verified: false }), 'pending');
  assert.equal(resolveZone({ role: 'driver' }, { is_verified: true }), 'driver');
  assert.equal(profileSchema.safeParse({ role: 'admin' }).success, false);
  assert.equal(driverSchema.safeParse({ is_verified: 'true' }).success, false);
  const { credentialsSchema, registrationSchema } = load(
    'apps/mobile/src/features/auth/credentials.ts',
  );
  assert.equal(
    credentialsSchema.parse({ email: '  cliente@example.cl ', password: 'x' }).email,
    'cliente@example.cl',
  );
  assert.equal(
    registrationSchema.safeParse({ email: 'cliente@example.cl', password: '1234567' }).success,
    false,
  );
  assert.equal(credentialsSchema.safeParse({ email: 'incorrecto', password: 'x' }).success, false);

  const values = new Map();
  let failWrite = false;
  const { secureStorage } = load('apps/mobile/src/shared/supabase/secure-storage.ts', {
    'expo-secure-store': {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        assert.ok(Buffer.byteLength(value, 'utf8') <= 2048);
        if (failWrite && key.endsWith('.1')) throw new Error('simulated interrupted write');
        values.set(key, value);
      },
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
    },
  });
  assert.equal(await secureStorage.getItem('session'), null);
  const unicodeSession = JSON.stringify({
    access_token: 'a'.repeat(4000),
    metadata: 'Chile 🇨🇱 á'.repeat(200),
  });
  await secureStorage.setItem('session', unicodeSession);
  assert.equal(await secureStorage.getItem('session'), unicodeSession);
  failWrite = true;
  await assert.rejects(secureStorage.setItem('session', 'b'.repeat(6000)));
  assert.equal(await secureStorage.getItem('session'), unicodeSession);
  failWrite = false;
  await secureStorage.setItem('session', 'renewed');
  assert.equal(await secureStorage.getItem('session'), 'renewed');
  assert.equal(values.size, 2);
  await secureStorage.removeItem('session');
  assert.equal(await secureStorage.getItem('session'), null);
  assert.equal(values.size, 0);
  console.log(
    'PASS: role guards, boundary validation, credentials, secure session roundtrip, interrupted writes, renewal and logout cleanup',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
