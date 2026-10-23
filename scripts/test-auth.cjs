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

  const { registrationPhoneSchema, authErrorMessage, authRetryDelay } = load(
    'apps/mobile/src/features/auth/credentials.ts',
  );
  assert.equal(registrationPhoneSchema.parse('12345678'), '+56912345678');
  assert.equal(registrationPhoneSchema.parse('01234567'), '+56901234567');
  for (const value of [
    '',
    '123',
    '912345678',
    '+56912345678',
    '123456789',
    '12a45678',
    '12 34567',
  ]) {
    assert.equal(registrationPhoneSchema.safeParse(value).success, false, value);
  }
  assert.notEqual(
    authErrorMessage({ code: 'over_request_rate_limit' }),
    authErrorMessage({ code: 'over_email_send_rate_limit' }),
  );
  assert.equal(authRetryDelay({ status: 429 }), 60_000);
  assert.equal(authRetryDelay({ code: 'invalid_credentials' }), 0);
  let authNow = 100_000;
  const { useRegistration } = load(
    'apps/mobile/src/features/auth/registration.ts',
    {},
    { Date: { now: () => authNow } },
  );
  const registration = () => useRegistration.getState();
  const credentials = { email: 'cliente@example.cl', password: 'safe-password' };
  let registrations = 0;
  let finishRegistration;
  let registrationInput;
  const registrationAuth = {
    signUp: (input) => {
      registrations++;
      registrationInput = input;
      return new Promise((resolve) => {
        finishRegistration = resolve;
      });
    },
  };
  const redirect = 'gasway://auth/confirm';
  assert.equal(registration().begin(credentials), true);
  assert.equal(registrations, 0, 'Credentials step must not create accounts');
  registration().setPhone('12345678');
  registration().leave('/access');
  assert.equal(registration().draft, null, 'Back must erase the password');
  assert.deepEqual(
    registration().contact,
    { email: credentials.email, digits: '12345678' },
    'Back must keep non-secret resume fields',
  );
  assert.equal(await registration().submit(registrationAuth, '12345678', redirect), 'ignored');
  assert.equal(registrations, 0, 'Missing draft/deep link must not register');
  registration().begin(credentials);
  await assert.rejects(registration().submit(registrationAuth, 'bad phone', redirect));
  assert.equal(registrations, 0, 'Invalid phone must not reach Auth');
  const request = registration().submit(registrationAuth, '12345678', redirect);
  assert.equal(registration().submitting, true);
  assert.equal(await registration().submit(registrationAuth, '12345678', redirect), 'ignored');
  assert.equal(registrations, 1, 'Same-frame duplicate must not call signUp twice');
  assert.deepEqual(registrationInput, {
    ...credentials,
    options: { emailRedirectTo: redirect, data: { phone: '+56912345678' } },
  });
  finishRegistration({ data: { session: null }, error: null });
  assert.equal(await request, 'check-email');
  assert.equal(registration().draft, null, 'Successful registration must erase password');
  assert.equal(registration().email, credentials.email);
  registration().leave('/auth/check-email');
  assert.equal(registration().email, credentials.email);
  registration().leave('/access');
  assert.equal(registration().email, null);

  registration().begin(credentials);
  const cancelled = registration().submit(registrationAuth, '12345678', redirect);
  registration().leave('/access');
  assert.equal(registration().draft, null);
  assert.equal(
    registration().begin(credentials),
    false,
    'Leaving must not release an in-flight lock',
  );
  finishRegistration({ data: { session: null }, error: null });
  assert.equal(await cancelled, 'cancelled', 'Late result must not navigate a departed screen');
  assert.equal(registration().email, null);
  assert.equal(registration().submitting, false);

  registration().begin(credentials);
  const failed = registration().submit(registrationAuth, '12345678', redirect);
  finishRegistration({ data: { session: null }, error: { code: 'over_request_rate_limit' } });
  await assert.rejects(failed, (error) => error.code === 'over_request_rate_limit');
  assert.equal(
    registration().submitting,
    false,
    'Failed registration must release the in-flight lock',
  );
  const beforePause = registrations;
  assert.equal(registration().retryAt, authNow + 60_000);
  assert.equal(await registration().submit(registrationAuth, '12345678', redirect), 'ignored');
  assert.equal(
    registrations,
    beforePause,
    'Rate-limited attempts must not hit Auth again during the pause',
  );
  registration().leave('/access');
  assert.equal(registration().draft, null);
  assert.equal(registration().contact.digits, '12345678');
  registration().begin(credentials);
  assert.equal(registration().retryAt, authNow + 60_000, 'Back and resume must preserve the pause');
  authNow += 60_000;
  const retry = registration().submit(registrationAuth, '12345678', redirect);
  finishRegistration({ data: { session: { user: { id: 'customer' } } }, error: null });
  assert.equal(await retry, 'authenticated');
  assert.equal(registration().draft, null);
  assert.equal(registration().email, null);
  assert.equal(registration().contact, null);
  assert.equal(registration().retryAt, 0);

  // Exercise the actual credentials-screen submit handler, without native rendering.
  let destination;
  let resetCalls = 0;
  let resetValues;
  const screenState = [true, null];
  let screenHook = 0;
  const screenRegistration = Object.assign(
    (selector) => (selector ? selector(registration()) : registration()),
    { getState: registration },
  );
  const { AccessScreen } = load('apps/mobile/src/features/auth/access-screen.tsx', {
    react: {
      useState: () => {
        const index = screenHook++;
        return [
          screenState[index],
          (next) => {
            screenState[index] = next;
          },
        ];
      },
      useRef: () => ({ current: false }),
      useCallback: (callback) => callback,
    },
    'expo-router': {
      useFocusEffect: (callback) => callback(),
      router: {
        push: (path) => {
          destination = path;
        },
      },
    },
    'react-hook-form': {
      Controller: 'controller',
      useForm: () => ({
        control: {},
        handleSubmit: (callback) => () => callback(credentials),
        reset: (values) => {
          resetCalls++;
          resetValues = values;
        },
        setError: () => assert.fail('Valid credentials should advance'),
        setFocus() {},
        formState: { errors: {}, isSubmitting: false },
      }),
    },
    '@/shared/supabase/client': { getSupabase: () => assert.fail('Step one must not access Auth') },
    '@/shared/ui/components': { Input: 'input' },
    '@/shared/ui/text': { Text: 'text' },
    '@/features/auth/access-ui': {
      AccessPage: 'page',
      AccessNavigation: 'navigation',
      AccessSubmit: 'submit',
      AccessFeedback: 'feedback',
      styles: {},
    },
    '@/features/auth/registration': { useRegistration: screenRegistration },
  });
  const accessScreen = AccessScreen();
  const accessSubmit = accessScreen.props.children.find((child) => child?.type === 'submit');
  assert.equal(accessSubmit.props.label, 'Continuar');
  accessSubmit.props.onPress();
  await Promise.resolve();
  assert.equal(destination, '/auth/phone', 'Registration must navigate to the phone route');
  assert.equal(resetCalls, 1, 'The previous form must not retain a password');
  assert.deepEqual(registration().draft, credentials);
  registration().leave('/access');

  let formError;
  let phoneDefaults;
  const { RegistrationPhoneScreen, RegistrationCheckEmailScreen } = load(
    'apps/mobile/src/features/auth/registration-screens.tsx',
    {
      react: {
        useState: (initial) => [typeof initial === 'function' ? authNow : initial, () => {}],
        useEffect() {},
      },
      'react-native': { Platform: { OS: 'android' } },
      'expo-router': {
        Redirect: 'redirect',
        router: {
          replace: (path) => {
            destination = path;
          },
        },
      },
      'react-hook-form': {
        Controller: 'controller',
        useForm: (options) => {
          phoneDefaults = options.defaultValues;
          return {
            control: {},
            handleSubmit: (callback) => () => callback({ phone: '12345678' }),
            setError: (_name, error) => {
              formError = error.message;
            },
            formState: { errors: {} },
          };
        },
      },
      '@/shared/supabase/client': { getSupabase: () => ({ auth: registrationAuth }) },
      '@/shared/ui/components': { Input: 'input', Button: 'button' },
      '@/shared/ui/text': { Text: 'text' },
      '@/features/auth/access-ui': {
        AccessPage: 'page',
        AccessSubmit: 'submit',
        AccessFeedback: 'feedback',
        AccessBack: 'back',
        RegistrationPhonePrefix: 'phone-prefix',
        styles: {},
      },
      '@/features/auth/registration': { useRegistration: screenRegistration },
    },
  );
  assert.equal(RegistrationPhoneScreen().props.href, '/access', 'Direct phone link needs a draft');
  assert.equal(RegistrationCheckEmailScreen().props.href, '/access');
  registration().begin(credentials);
  const phoneScreen = RegistrationPhoneScreen();
  assert.equal(phoneScreen.props.title, 'Tu teléfono.');
  assert.equal(phoneScreen.props.step, true);
  let changedDigits;
  const phoneInput = phoneScreen.props.children
    .find((child) => child?.type === 'controller')
    .props.render({
      field: {
        value: '',
        onChange: (value) => {
          changedDigits = value;
        },
        onBlur() {},
        ref: null,
      },
    });
  assert.equal(phoneInput.props.prefix.type, 'phone-prefix');
  assert.equal(phoneInput.props.maxLength, 8);
  assert.equal(phoneInput.props.keyboardType, 'number-pad');
  phoneInput.props.onChangeText('12a3456789');
  assert.equal(changedDigits, '12345678');
  assert.equal(registration().contact.digits, '12345678');
  const phoneSubmit = phoneScreen.props.children.find((child) => child?.type === 'submit');
  const beforeFinalStep = registrations;
  phoneSubmit.props.onPress();
  phoneSubmit.props.onPress();
  assert.equal(registrations, beforeFinalStep + 1);
  assert.equal(RegistrationPhoneScreen().props.navigation.props.disabled, true);
  finishRegistration({ data: { session: null }, error: null });
  for (let tick = 0; tick < 6; tick++) await Promise.resolve();
  assert.equal(formError, undefined);
  assert.equal(destination, '/auth/check-email', 'Final step must open the email notice');
  const emailScreen = RegistrationCheckEmailScreen();
  assert.equal(emailScreen.props.title, 'Revisa tu\ncorreo.');
  assert.ok(emailScreen.props.children[0].props.text.includes(credentials.email));
  emailScreen.props.children.find((child) => child?.type === 'submit').props.onPress();
  assert.equal(destination, '/access');
  registration().leave('/access');

  // Email limits stay visible through back/resume, without retaining a password.
  registration().begin(credentials);
  const limitedScreen = RegistrationPhoneScreen();
  limitedScreen.props.children.find((child) => child?.type === 'submit').props.onPress();
  finishRegistration({ data: { session: null }, error: { code: 'over_email_send_rate_limit' } });
  for (let tick = 0; tick < 6; tick++) await Promise.resolve();
  const paused = RegistrationPhoneScreen();
  const pausedSubmit = paused.props.children.find((child) => child?.type === 'submit');
  assert.equal(pausedSubmit.props.disabled, true);
  assert.equal(pausedSubmit.props.loading, false, 'Cooldown must not look like a hanging request');
  assert.equal(pausedSubmit.props.label, 'Reintentar en 60 s');
  assert.ok(registration().error.includes('correos'));
  assert.equal(paused.props.navigation.props.disabled, false, 'User can leave during the pause');
  paused.props.navigation.props.onPress();
  assert.equal(destination, '/access');
  assert.equal(registration().draft, null);
  assert.deepEqual(registration().contact, { email: credentials.email, digits: '12345678' });
  screenState[0] = false;
  screenHook = 0;
  AccessScreen();
  assert.deepEqual(
    resetValues,
    { email: credentials.email, password: '' },
    'Focus must restore email with a blank password',
  );
  assert.equal(screenState[0], true, 'Returning must select registration mode');
  registration().begin(credentials);
  RegistrationPhoneScreen();
  assert.equal(phoneDefaults.phone, '12345678', 'Returning restores all eight phone digits');
  registration().leave('/access');
  registration().begin({ ...credentials, email: 'otra@example.cl' });
  assert.equal(
    registration().contact.digits,
    '',
    'A different email must not inherit the previous phone',
  );
  registration().leave('/');

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

  // Evaluate the actual route declarations across sign-in/out transitions without
  // mounting native views: permissions must settle before private routes open,
  // and the public PKCE callback must survive every loading/error transition.
  let navigationAuth;
  let navigationPath = '/access';
  let retries = 0;
  const Stack = Object.assign(function Stack() {}, {
    Screen: 'screen',
    Protected: 'protected',
  });
  const authBoundary = { useAuth: () => navigationAuth };
  const { AuthNavigator } = load('apps/mobile/src/features/auth/auth-navigator.tsx', {
    react: { useEffect: (callback) => callback() },
    'expo-router': { usePathname: () => navigationPath },
    'expo-router/stack': { Stack },
    '@/features/auth/auth-provider': authBoundary,
    '@/features/auth/registration': { useRegistration },
  });
  const { AuthEntryScreen } = load('apps/mobile/src/features/auth/auth-entry-screen.tsx', {
    'expo-router': { Redirect: 'redirect' },
    '@/features/auth/auth-provider': authBoundary,
    '@/features/auth/auth-ui': {
      ActionButton: 'action',
    },
    '@/shared/ui/loading-screen': { LoadingScreen: 'loading-screen' },
    '@/features/auth/zone-screen': { SignOutButton: 'sign-out' },
  });
  const customerSession = { user: { id: 'new-customer' } };
  const transitions = [
    { session: null, loading: true, error: false, guards: [false, false, false, false] },
    {
      session: null,
      loading: false,
      error: false,
      guards: [false, true, false, false],
      href: '/access',
    },
    { session: customerSession, loading: true, error: false, guards: [false, false, false, false] },
    {
      session: customerSession,
      zone: 'customer',
      loading: false,
      error: false,
      guards: [true, false, true, false],
      href: '/customer',
    },
    {
      session: customerSession,
      zone: 'driver',
      loading: false,
      error: false,
      guards: [true, false, true, true],
      href: '/driver',
    },
    { session: customerSession, loading: false, error: true, guards: [false, false, false, false] },
    {
      session: null,
      loading: false,
      error: false,
      guards: [false, true, false, false],
      href: '/access',
    },
  ];
  for (const transition of transitions) {
    navigationAuth = {
      ...transition,
      retry: async () => {
        retries += 1;
      },
    };
    const navigation = AuthNavigator();
    assert.equal(navigation.type, Stack, 'The root navigator must survive auth transitions');
    const declarations = navigation.props.children;
    assert.deepEqual(
      declarations
        .filter((element) => element.type === 'screen')
        .map((element) => element.props.name),
      ['index', 'auth/confirm'],
      'Index and the single-use callback must remain public',
    );
    assert.deepEqual(
      declarations
        .filter((element) => element.type === 'protected')
        .map((element) => element.props.guard),
      transition.guards,
    );
    assert.deepEqual(
      declarations
        .find(
          (element) =>
            element.type === 'protected' &&
            element.props.children?.some?.((child) => child.props.name === 'access'),
        )
        .props.children.map((child) => child.props.name),
      ['access', 'auth/phone', 'auth/check-email'],
      'All registration screens must share the guest guard',
    );
    const entry = AuthEntryScreen();
    if (transition.href) {
      assert.equal(entry.type, 'redirect');
      assert.equal(entry.props.href, transition.href);
    } else {
      assert.equal(entry.type, 'loading-screen', 'Loading/errors must not issue a redirect');
      if (transition.error) {
        entry.props.footer.props.children[0].props.onPress();
        assert.equal(entry.props.footer.props.children[1].type, 'sign-out');
      } else {
        assert.equal(entry.props.state, 'waiting');
        assert.equal(typeof entry.props.onRetry, 'function');
      }
    }
  }
  assert.equal(retries, 1, 'Access errors retain a working retry action');
  registration().begin(credentials);
  navigationPath = '/auth/phone';
  AuthNavigator();
  assert.deepEqual(registration().draft, credentials, 'Phone route must keep the draft');
  navigationPath = '/access';
  AuthNavigator();
  assert.equal(registration().draft, null, 'System back/route departure must erase credentials');
  console.log(
    'PASS: credentials-to-phone navigation, phone validation, registration metadata, cancellation, same-frame submit lock, retry, password cleanup, role guards, secure storage, auth recovery and public confirmation route',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
