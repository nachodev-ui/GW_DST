const assert = require('node:assert/strict');
require('./testing/offline.cjs');
const { load } = require('./testing/load.cjs');
const { parseConfirmationLink, confirmEmail, confirmationRedirect } = load(
  'apps/mobile/src/features/auth/confirmation.ts',
);

async function main() {
  const { webcrypto } = require('node:crypto');
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let nativeRandomCalls = 0;
  const { ensurePkceCrypto } = load('apps/mobile/src/shared/supabase/pkce-crypto.ts', {
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      getRandomValues: (array) => {
        nativeRandomCalls++;
        return webcrypto.getRandomValues(array);
      },
      randomUUID: () => webcrypto.randomUUID(),
      digest: (algorithm, input) => webcrypto.subtle.digest(algorithm, input),
    },
  });
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    ensurePkceCrypto();
    globalThis.crypto.getRandomValues(new Uint32Array(56));
    assert.equal(nativeRandomCalls, 1, 'Native cryptographic randomness required');
    const challenge = Buffer.from(
      await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode('abc')),
    ).toString('hex');
    assert.equal(
      challenge,
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      'S256 digest mismatch',
    );
    const installed = globalThis.crypto;
    ensurePkceCrypto();
    assert.equal(globalThis.crypto, installed, 'Existing crypto must be preserved');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { subtle: undefined },
    });
    ensurePkceCrypto();
    assert.equal(
      typeof globalThis.crypto.subtle.digest,
      'function',
      'Partial crypto must still support S256',
    );
  } finally {
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    else delete globalThis.crypto;
  }
  const code = 'test-pkce-code';
  assert.deepEqual(parseConfirmationLink(`${confirmationRedirect}?code=${code}`), { code });
  for (const raw of [
    null,
    '',
    'not a url',
    'https://auth/confirm?code=test',
    'gasway://auth.example.invalid/confirm?code=test',
    'gasway://auth/unexpected?code=test',
    `${confirmationRedirect}/?code=test`,
    `${confirmationRedirect}?code=a&code=b`,
    `${confirmationRedirect}?code=`,
    `${confirmationRedirect}?code=${'a'.repeat(2049)}`,
    `${confirmationRedirect}#code=test`,
  ]) {
    assert.equal(parseConfirmationLink(raw).result, 'invalid');
  }
  assert.equal(
    parseConfirmationLink(
      `${confirmationRedirect}#error_code=otp_expired&error_description=untrusted`,
    ).result,
    'expired',
  );
  assert.equal(
    parseConfirmationLink(`${confirmationRedirect}?code=test#error=access_denied`).result,
    'invalid',
  );
  assert.equal(
    parseConfirmationLink(`${confirmationRedirect}#access_token=untrusted&refresh_token=untrusted`)
      .result,
    'sign-in',
  );
  let calls = 0;
  const auth = {
    exchangeCodeForSession: async (received) => {
      calls++;
      assert.equal(received, code);
      return { data: { session: { user: { id: 'test' } } }, error: null };
    },
  };
  assert.equal(await confirmEmail(`${confirmationRedirect}?code=${code}`, auth), 'confirmed');
  assert.equal(await confirmEmail('gasway://auth/unexpected?code=test', auth), 'invalid');
  assert.equal(calls, 1, 'Malformed destinations must not reach Auth');
  for (const [errorCode, expected] of [
    ['otp_expired', 'expired'],
    ['flow_state_expired', 'expired'],
    ['flow_state_not_found', 'sign-in'],
    ['pkce_code_verifier_not_found', 'sign-in'],
    ['bad_code_verifier', 'sign-in'],
    ['server_error', 'unavailable'],
  ]) {
    assert.equal(
      await confirmEmail(`${confirmationRedirect}?code=${code}`, {
        exchangeCodeForSession: async () => ({
          data: { session: null },
          error: { code: errorCode },
        }),
      }),
      expected,
    );
  }
  assert.equal(
    await confirmEmail(`${confirmationRedirect}?code=${code}`, {
      exchangeCodeForSession: async () => {
        throw new Error('private transport details');
      },
    }),
    'unavailable',
  );
  // Inspect the actual presentation contract without mounting native views.
  // Repeating an effect must not exchange a single-use code twice.
  let currentInput = null;
  let screenResult = null;
  let screenEffect;
  let finishConfirmation;
  let exchanges = 0;
  let destination;
  const requestRef = { current: null };
  const { ConfirmationScreen } = load('apps/mobile/src/features/auth/confirmation-screen.tsx', {
    react: {
      useEffect: (effect) => {
        screenEffect = effect;
      },
      useRef: () => requestRef,
      useState: () => [
        screenResult,
        (value) => {
          screenResult = value;
        },
      ],
    },
    'expo-linking': { useLinkingURL: () => currentInput },
    'expo-router': {
      router: {
        replace: (value) => {
          destination = value;
        },
      },
    },
    '@/shared/supabase/client': { getSupabase: () => ({ auth: {} }) },
    '@/shared/ui/components': { Button: 'button' },
    '@/shared/ui/loading-screen': { LoadingScreen: 'loading-screen' },
    '@/features/auth/confirmation': {
      confirmEmail: () => {
        exchanges++;
        return new Promise((resolve) => {
          finishConfirmation = resolve;
        });
      },
    },
  });
  const instructions = ConfirmationScreen();
  assert.equal(instructions.props.state, 'idle');
  assert.equal(instructions.props.footer.props.disabled, false);
  screenEffect();
  assert.equal(exchanges, 0);
  currentInput = 'opaque-confirmation-input';
  const pending = ConfirmationScreen();
  assert.equal(pending.props.state, 'waiting');
  assert.equal(pending.props.footer.props.disabled, true);
  assert.equal(
    pending.props.onRetry,
    undefined,
    'Confirmation must never replay from visual retry',
  );
  const cleanupFirst = screenEffect();
  cleanupFirst();
  const cleanupRepeated = screenEffect();
  await Promise.resolve();
  assert.equal(exchanges, 1);
  finishConfirmation('confirmed');
  for (let turn = 0; turn < 6; turn++) await Promise.resolve();
  const complete = ConfirmationScreen();
  assert.equal(complete.props.state, 'success');
  assert.equal(complete.props.footer.props.disabled, false);
  complete.props.footer.props.onPress();
  assert.equal(destination, '/');
  const confirmedInput = currentInput;
  currentInput = 'different-opaque-confirmation-input';
  const changedLink = ConfirmationScreen();
  assert.equal(changedLink.props.state, 'waiting', 'A new link must not reuse a prior success');
  assert.equal(changedLink.props.footer.props.disabled, true);
  currentInput = confirmedInput;
  cleanupRepeated();
  for (const [result, state] of [
    ['expired', 'notice'],
    ['invalid', 'error'],
    ['unavailable', 'error'],
    ['sign-in', 'notice'],
  ]) {
    screenResult = { url: currentInput, result };
    const fixed = ConfirmationScreen();
    assert.equal(fixed.props.state, state);
    assert.equal(fixed.props.footer.props.disabled, false);
    assert.equal(fixed.props.onRetry, undefined);
    assert.equal(fixed.props.status.includes('private transport details'), false);
  }
  console.log(
    'PASS: exact callback boundary, duplicate/malformed codes, PKCE completion, expired/reused links, private errors, presentation states and single-use effect deduplication',
  );
}
main().catch(() => {
  console.error('FAIL: confirmation boundary regression');
  process.exitCode = 1;
});
