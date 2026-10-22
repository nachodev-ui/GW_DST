// Local assertions only: no network, native runtime or database required.
const assert = require('node:assert/strict');

const { load } = require('./testing/load.cjs');

async function main() {
  const { resolveZone, profileSchema, driverSchema } = load(
    'apps/mobile/src/features/auth/access.ts',
    {
      '@/shared/supabase/client': {},
    },
  );
  assert.equal(resolveZone({ role: 'customer' }, null), 'customer');
  assert.equal(resolveZone({ role: 'customer' }, { is_verified: false }), 'customer');
  assert.equal(resolveZone({ role: 'customer' }, { is_verified: true }), 'customer');
  assert.equal(resolveZone({ role: 'driver' }, null), 'customer');
  assert.equal(resolveZone({ role: 'driver' }, { is_verified: false }), 'customer');
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

  // Missing configuration reports a recoverable error, and retry resets loading.
  const states = [];
  let hookIndex = 0;
  let effect;
  let receivedSession;
  let configured = false;
  const queryClient = { clear() {}, invalidateQueries: async () => {} };
  const { AuthProvider } = load('apps/mobile/src/features/auth/auth-provider.tsx', {
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useContext() {},
      useEffect: (callback) => {
        effect = callback;
      },
      useState: (initial) => {
        const index = hookIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            states[index] = typeof value === 'function' ? value(states[index]) : value;
          },
        ];
      },
    },
    'react-native': {
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    },
    '@tanstack/react-query': {
      focusManager: { setFocused() {} },
      useQueryClient: () => queryClient,
      useQuery: () => ({ isPending: false, isError: false }),
    },
    '@/features/auth/access': {},
    '@/shared/supabase/client': {
      getSupabase: () => {
        if (!configured) throw new Error('Missing configuration');
        return {
          auth: {
            onAuthStateChange: (callback) => {
              receivedSession = callback;
              return { data: { subscription: { unsubscribe() {} } } };
            },
            getSession: async () => ({ data: { session: null }, error: null }),
            startAutoRefresh() {},
            stopAutoRefresh() {},
          },
        };
      },
    },
  });
  const renderAuth = () => {
    hookIndex = 0;
    return AuthProvider({ children: null }).props.value;
  };
  assert.equal(renderAuth().loading, true);
  const cleanupFailure = effect();
  await Promise.resolve();
  const failedAuth = renderAuth();
  assert.equal(failedAuth.error, true);
  assert.equal(failedAuth.loading, false);
  configured = true;
  await failedAuth.retry();
  assert.equal(renderAuth().loading, true);
  assert.equal(renderAuth().error, false);
  cleanupFailure();
  const cleanupSuccess = effect();
  await Promise.resolve();
  assert.equal(renderAuth().loading, false);
  assert.equal(renderAuth().session, null);
  cleanupSuccess();
  receivedSession('SIGNED_IN', { user: { id: 'stale-session' } });
  assert.equal(renderAuth().session, null);
  console.log(
    'PASS: role guards, boundary validation, credentials, secure session roundtrip, interrupted writes, renewal and logout cleanup',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
