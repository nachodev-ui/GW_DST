const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./testing/load.cjs');
const user = '10000000-0000-4000-8000-000000000001',
  order = '10000000-0000-4000-8000-000000000002';
function harness(platform = 'android', expoGo = false) {
  const saved = new Map(),
    sent = [],
    definitions = [];
  let clock = 0,
    started = false,
    reads = 0,
    stops = 0;
  const state = {
    session: { user: { id: user } },
    ended: false,
    offline: false,
    permission: true,
    startGate: null,
  };
  const base = Date.parse('2026-10-25T04:00:00Z');
  class ClockDate extends Date {
    static now() {
      return base + clock;
    }
  }
  const module = load(
    'apps/mobile/src/features/tracking/driver/background-tracking.ts',
    {
      'react-native': { Platform: { OS: platform } },
      'expo-constants': { executionEnvironment: expoGo ? 'storeClient' : 'bare' },
      'expo-crypto': { randomUUID: () => '10000000-0000-4000-8000-000000000003' },
      'expo-secure-store': {
        getItemAsync: async (key) => saved.get(key) ?? null,
        setItemAsync: async (key, value) => saved.set(key, value),
        deleteItemAsync: async (key) => saved.delete(key),
      },
      get 'expo-task-manager'() {
        if (platform !== 'android' || expoGo)
          throw new Error('Driver native runtime loaded outside Android build');
        return {
          isAvailableAsync: async () => true,
          isTaskDefined: () => false,
          defineTask: (...args) => definitions.push(args),
        };
      },
      'expo-location': {
        Accuracy: { High: 4 },
        getBackgroundPermissionsAsync: async () => ({ granted: state.permission }),
        hasStartedLocationUpdatesAsync: async () => started,
        startLocationUpdatesAsync: async (name, options) => {
          state.options = options;
          started = true;
          if (state.startGate) await state.startGate;
        },
        stopLocationUpdatesAsync: async () => {
          started = false;
          stops++;
        },
      },
      '@/shared/supabase/client': {
        getSupabase: () => ({
          auth: { getSession: async () => ({ data: { session: state.session }, error: null }) },
        }),
      },
      '@/shared/tracking/data': {
        getOrderTracking: async () => {
          reads++;
          if (state.offline) throw new Error('offline');
          return { state: state.ended ? 'ended' : 'waiting' };
        },
        publishOrderLocation: async (sample, signal) => {
          sent.push({ sample, signal });
          return {
            accepted: true,
            reason: 'accepted',
            received_at: new ClockDate(ClockDate.now()).toISOString(),
          };
        },
      },
      '@/theme': { theme: { colors: { primary: '#405d32' } } },
    },
    { Date: ClockDate, performance: { now: () => clock } },
  );
  return {
    ...module,
    saved,
    sent,
    state,
    definitions,
    get started() {
      return started;
    },
    get stops() {
      return stops;
    },
    get reads() {
      return reads;
    },
    advance(ms) {
      clock += ms;
    },
    fix(extra = {}) {
      return {
        timestamp: ClockDate.now(),
        coords: { latitude: -33.45, longitude: -70.66, accuracy: 8 },
        ...extra,
      };
    },
  };
}
test('background GPS registers globally, sends only newest fresh fix and stores no coordinates', async () => {
  const h = harness();
  assert.equal(h.definitions[0][0], h.DRIVER_LOCATION_TASK);
  assert.equal(await h.startDriverBackground(user, order), true);
  assert.equal(h.started, true);
  assert.equal(h.state.options.foregroundService.killServiceOnDestroy, true);
  await h.processDriverLocations({
    locations: [h.fix({ timestamp: h.fix().timestamp - 10000 }), h.fix()],
  });
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].sample.captured_at, new Date(h.fix().timestamp).toISOString());
  assert.ok(
    [...h.saved.values()].every(
      (value) => !value.includes('latitude') && !value.includes('longitude'),
    ),
  );
  h.advance(6000);
  h.state.offline = true;
  await h.processDriverLocations({ locations: [h.fix()] });
  assert.equal(h.sent.length, 1);
  h.advance(6000);
  h.state.offline = false;
  await h.processDriverLocations({ locations: [h.fix({ mocked: true })] });
  assert.equal(h.sent.length, 1);
  await h.processDriverLocations({ locations: [h.fix()] });
  assert.equal(h.sent.length, 2);
  await h.stopDriverBackground(user, order);
  await h.processDriverLocations({ locations: [h.fix()] });
  assert.equal(h.sent.length, 2);
  assert.equal(h.started, false);
  assert.equal(h.backgroundSnapshot().scope, null);
});
test('terminal state, logout, expired consent and native error stop background service', async () => {
  for (const condition of ['terminal', 'logout', 'expiry', 'native']) {
    const h = harness();
    await h.startDriverBackground(user, order);
    if (condition === 'terminal') h.state.ended = true;
    if (condition === 'logout') h.state.session = null;
    if (condition === 'expiry') h.advance(4 * 60 * 60 * 1000 + 1);
    await h.processDriverLocations({ locations: [h.fix()] }, condition === 'native');
    assert.equal(h.sent.length, 0, condition);
    assert.equal(h.started, false, condition);
    assert.equal(h.saved.size, 0, condition);
  }
});
test('pausing during native startup prevents late callbacks from adopting cancelled consent', async () => {
  const h = harness();
  let complete;
  h.state.startGate = new Promise((resolve) => {
    complete = resolve;
  });
  const start = h.startDriverBackground(user, order);
  await new Promise((resolve) => setImmediate(resolve));
  const stop = h.stopDriverBackground(user, order);
  await h.processDriverLocations({ locations: [h.fix()] });
  assert.equal(h.sent.length, 0);
  complete();
  assert.equal(await start, false);
  await stop;
  assert.equal(h.started, false);
  assert.equal(h.saved.size, 0);
});
test('background permission denial cannot start or persist tracking', async () => {
  const h = harness();
  h.state.permission = false;
  await assert.rejects(h.startDriverBackground(user, order), /ubicación siempre/);
  assert.equal(h.started, false);
  assert.equal(h.saved.size, 0);
});

test('iPhone Expo Go and Android Expo Go never load the driver-only TaskManager native runtime', async () => {
  for (const platform of ['ios', 'android']) {
    const h = harness(platform, true);
    assert.equal(h.definitions.length, 0);
    await assert.rejects(h.startDriverBackground(user, order), /build Android/);
  }
});

test('a cold JavaScript restart cannot resume a previously stored sharing intent', async () => {
  const first = harness();
  await first.startDriverBackground(user, order);
  const restarted = harness();
  for (const [key, value] of first.saved) restarted.saved.set(key, value);
  await restarted.processDriverLocations({ locations: [restarted.fix()] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(restarted.sent.length, 0);
  assert.equal(restarted.saved.size, 0);
});
test('navigation links use exact coordinates, driving navigation and reject invalid points', () => {
  const { navigationUrl } = load('apps/mobile/src/features/tracking/driver/navigation.ts');
  const point = { latitude: -33.45, longitude: -70.66 };
  const google = new URL(navigationUrl('google', point)),
    waze = new URL(navigationUrl('waze', point));
  assert.equal(google.searchParams.get('destination'), '-33.45,-70.66');
  assert.equal(google.searchParams.get('dir_action'), 'navigate');
  assert.equal(waze.searchParams.get('ll'), '-33.45,-70.66');
  assert.equal(waze.searchParams.get('navigate'), 'yes');
  assert.throws(() => navigationUrl('google', { latitude: NaN, longitude: 0 }));
});

test('driver map frames the complete polyline, preserves manual zoom and recenters explicitly', () => {
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (v) => v.default } },
  });
  const fits = [],
    refs = [],
    effects = [];
  let cursor = 0;
  const nativeMap = { fitToCoordinates: (points) => fits.push(points), animateToRegion: () => {} };
  const { DriverMapCanvas } = load(
    'apps/mobile/src/features/tracking/driver/driver-route-map.native.tsx',
    {
      react: {
        useRef: (initial) => {
          const i = cursor++;
          return refs[i] ?? (refs[i] = { current: i === 0 ? nativeMap : initial });
        },
        useState: () => [true, () => {}],
        useEffect: (cb) => effects.push(cb),
        useCallback: (cb) => cb,
      },
      'react-native': {
        Modal: 'Modal',
        View: 'View',
        StyleSheet: { create: (v) => v, absoluteFill: {} },
      },
      'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
      'react-native-maps': {
        __esModule: true,
        default: 'MapView',
        Polyline: 'Polyline',
        PROVIDER_GOOGLE: 'google',
      },
      '@/shared/maps/runtime-provider': { runtimeMapProvider: () => 'google' },
      '@/shared/maps/artwork-map-marker': { ArtworkMapMarker: 'Artwork' },
      '@/shared/maps/animated-vehicle-marker': { AnimatedVehicleMarker: 'Vehicle' },
      '@/shared/maps/use-map-heading': {
        useMapHeading: () => ({ heading: 0, readHeading: () => {} }),
      },
      '@/shared/maps/route-attribution': { RouteAttribution: 'Attribution' },
      '@/shared/ui/components': { Button: 'Button' },
      '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
      '@/shared/ui/icon': { Icon: 'Icon' },
      '@/theme': { theme },
    },
  );
  const route = [
    { latitude: -33.45, longitude: -70.66 },
    { latitude: -33.45, longitude: -70.65 },
    { latitude: -33.44, longitude: -70.65 },
  ];
  const destination = route.at(-1);
  let position = { ...route[0], captured_at: '2026-10-25T04:00:00Z' };
  const render = () => {
    cursor = 0;
    effects.length = 0;
    const tree = DriverMapCanvas({ route, destination, position });
    effects.forEach((cb) => cb());
    return tree;
  };
  let tree = render();
  assert.equal(fits.length, 1);
  assert.ok(fits[0].includes(route[1]), 'include corner, not just endpoints');
  tree.props.children[0].props.onTouchStart();
  position = { latitude: -33.449, longitude: -70.65, captured_at: '2026-10-25T04:00:05Z' };
  tree = render();
  assert.equal(fits.length, 1, 'GPS must not reset manual zoom');
  tree.props.children[2].props.children.props.onPress();
  assert.equal(fits.length, 2);
  assert.ok(fits.at(-1).includes(position));
});
test('same-session token refresh preserves active driver screen caches; logout clears them', () => {
  let callback,
    clears = 0;
  const effects = [];
  const client = {
    auth: {
      onAuthStateChange: (cb) => {
        callback = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      getSession: async () => ({ data: { session: null }, error: null }),
      startAutoRefresh() {},
      stopAutoRefresh() {},
    },
  };
  const { AuthProvider } = load('apps/mobile/src/features/auth/auth-provider.tsx', {
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useContext: () => null,
      useState: (value) => [value, () => {}],
      useRef: (value) => ({ current: value }),
      useEffect: (effect) => effects.push(effect),
    },
    'react-native': {
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    },
    '@tanstack/react-query': {
      focusManager: { setFocused() {} },
      useQuery: () => ({ data: 'driver', isPending: false, isError: false }),
      useQueryClient: () => ({ clear: () => clears++, invalidateQueries: async () => {} }),
    },
    '@/shared/supabase/client': { getSupabase: () => client },
    '@/features/auth/access': { fetchAccess: async () => 'driver' },
  });
  AuthProvider({ children: null });
  const cleanups = effects.map((effect) => effect());
  callback('INITIAL_SESSION', { user: { id: user } });
  callback('TOKEN_REFRESHED', { user: { id: user } });
  assert.equal(clears, 1);
  callback('TOKEN_REFRESHED', { user: { id: order } });
  assert.equal(clears, 2, 'identity changes always clear private caches');
  callback('SIGNED_OUT', null);
  assert.equal(clears, 3);
  cleanups.forEach((cleanup) => cleanup?.());
});
