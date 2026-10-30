const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const { nativeMapProvider } = load('apps/mobile/src/shared/maps/provider.ts');
assert.equal(nativeMapProvider('ios', undefined), null);
assert.equal(nativeMapProvider('ios', { ios: false, android: true }), null);
assert.equal(nativeMapProvider('ios', { ios: true }), null);
assert.equal(nativeMapProvider('ios', { ios: true }, false, true), 'google');
assert.equal(nativeMapProvider('ios', undefined, true), 'apple');
assert.equal(nativeMapProvider('ios', undefined, true, true), 'apple');
assert.equal(nativeMapProvider('android', undefined, true), 'google');
assert.equal(nativeMapProvider('android', { android: true }), 'google');
for (const config of [
  undefined,
  null,
  {},
  { android: false },
  { android: 'true' },
  { ios: true },
]) {
  assert.equal(nativeMapProvider('android', config), null);
}
assert.equal(nativeMapProvider('web', { android: true }), null);
const { trackingSnapshotSchema, locationSampleSchema, publishLocationResultSchema } = load(
  'apps/mobile/src/shared/tracking/contracts.ts',
);
const order = '10000000-0000-4000-8000-000000000001';
const now = '2026-10-24T04:00:00+00:00';
const sample = {
  order_id: order,
  latitude: -33.45,
  longitude: -70.66,
  captured_at: now,
  accuracy_m: 8,
};
assert.equal(locationSampleSchema.safeParse(sample).success, true);
for (const patch of [
  { latitude: NaN },
  { longitude: Infinity },
  { latitude: 91 },
  { longitude: -181 },
  { accuracy_m: -1 },
  { accuracy_m: 1001 },
  { accuracy_m: NaN },
  { captured_at: 'yesterday' },
  { order_id: 'driver-id' },
])
  assert.equal(locationSampleSchema.safeParse({ ...sample, ...patch }).success, false);
const point = {
  latitude: -33.45,
  longitude: -70.66,
  captured_at: now,
  received_at: now,
  accuracy_m: 8,
};
const fresh = {
  order_id: order,
  server_now: now,
  state: 'fresh',
  destination: null,
  received_at: now,
  fresh_until: now,
  sample: point,
};
assert.equal(trackingSnapshotSchema.safeParse(fresh).success, true);
for (const state of ['stale', 'waiting', 'ended']) {
  assert.equal(
    trackingSnapshotSchema.safeParse({ ...fresh, state }).success,
    false,
    'Closed/stale response carried coordinates',
  );
}
assert.equal(
  trackingSnapshotSchema.safeParse({ ...fresh, state: 'stale', sample: null }).success,
  true,
);
assert.equal(
  trackingSnapshotSchema.safeParse({
    ...fresh,
    state: 'ended',
    received_at: null,
    fresh_until: null,
    sample: null,
  }).success,
  true,
);
assert.equal(trackingSnapshotSchema.safeParse({ ...fresh, sample: null }).success, false);
assert.equal(
  publishLocationResultSchema.safeParse({ accepted: false, reason: 'accepted', received_at: now })
    .success,
  false,
);
console.log('PASS: GPS boundaries and fresh/stale/ended response isolation');

const { trackingDeadline } = load('apps/mobile/src/shared/tracking/freshness.ts');
const timed = { ...fresh, fresh_until: '2026-10-24T04:00:30+00:00' };
assert.equal(trackingDeadline(timed, 100), 30100);
assert.equal(trackingDeadline({ ...timed, state: 'stale' }, 100), 100);
assert.equal(trackingDeadline({ ...timed, fresh_until: '2026-10-24T03:59:59+00:00' }, 100), 100);
assert.equal(trackingDeadline({ ...timed, fresh_until: '2026-10-24T04:01:30+00:00' }, 100), 30100);
assert.equal(
  trackingSnapshotSchema.safeParse({
    ...fresh,
    state: 'ended',
    received_at: null,
    fresh_until: null,
    sample: null,
    destination: { latitude: -33, longitude: -70 },
  }).success,
  false,
);

const { createLocationPublisher } = load(
  'apps/mobile/src/features/tracking/driver/location-publisher.ts',
);
const { test } = require('node:test');
test('runtime provider checks the installed iOS native view, independently of API-key config', () => {
  for (const expoGo of [true, false]) {
    for (const installed of [false, true]) {
      const checked = [];
      const { runtimeMapProvider } = load('apps/mobile/src/shared/maps/runtime-provider.ts', {
        'expo-constants': {
          executionEnvironment: expoGo ? 'storeClient' : 'bare',
          expoConfig: { extra: { googleMaps: { ios: true } } },
        },
        'react-native': {
          Platform: { OS: 'ios' },
          UIManager: {
            hasViewManagerConfig: (name) => {
              checked.push(name);
              return installed;
            },
          },
        },
      });
      assert.equal(runtimeMapProvider(), expoGo ? 'apple' : installed ? 'google' : null);
      assert.deepEqual(checked, expoGo ? [] : ['RNMapsGoogleMapView']);
    }
  }
});

test('customer map: updates preserve camera; only initial framing and explicit recenter move it', () => {
  const refs = [];
  let cursor = 0;
  let effects = [];
  const fits = [];
  const regions = [];
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (options) => options.default } },
  });
  const { useTrackingCamera } = load(
    'apps/mobile/src/features/tracking/customer/use-tracking-camera.ts',
    {
      react: {
        useRef: (initial) => refs[cursor++] ?? (refs[cursor - 1] = { current: initial }),
        useCallback: (callback) => callback,
        useEffect: (callback) => effects.push(callback),
      },
      '@/theme': { theme },
    },
  );
  const destination = { latitude: -33.44, longitude: -70.65 };
  let position = { latitude: -33.45, longitude: -70.66 };
  const render = (ready, target, fix) => {
    cursor = 0;
    effects = [];
    const camera = useTrackingCamera(ready, target, fix);
    camera.map.current = {
      fitToCoordinates: (points) => fits.push(points),
      animateToRegion: (region) => regions.push(region),
    };
    effects.forEach((effect) => effect());
    return camera;
  };
  render(false, destination, null);
  assert.equal(regions.length, 0, 'wait for native readiness');
  render(true, destination, null);
  assert.equal(regions.length, 1);
  let camera = render(true, destination, position);
  assert.equal(fits.length, 1, 'frame both when the first driver fix arrives');
  camera.onInteraction();
  for (let i = 0; i < 12; i++) {
    position = { latitude: position.latitude + 0.0001, longitude: position.longitude };
    camera = render(true, { ...destination }, { ...position });
  }
  assert.equal(fits.length, 1, 'new fixes and object identities must not reset zoom');
  camera.recenter();
  assert.equal(fits.length, 2);
  assert.deepEqual(fits.at(-1), [destination, position], 'manual framing uses the latest position');
  render(true, destination, null);
  render(true, destination, position);
  assert.equal(fits.length, 2, 'stale/recovery must preserve the selected camera');
  assert.equal(regions.length, 1);

  refs.length = 0;
  camera = render(true, destination, null);
  camera.onInteraction();
  render(true, destination, position);
  assert.equal(fits.length, 2, 'a gesture before the first GPS fix also takes camera control');
});

test('marker artwork uses RN Image, waits for layout/paint and falls back on load failure', () => {
  const states = [];
  const markerRef = { current: { redraw: () => redraws++ } };
  let redraws = 0;
  let cursor = 0;
  let refCursor = 0;
  const refs = [markerRef, { current: null }, { current: null }];
  let effect;
  let deps;
  let cleanup;
  let frameId = 0;
  const frames = new Map();
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (options) => options.default } },
  });
  const { ArtworkMapMarker } = load(
    'apps/mobile/src/shared/maps/artwork-map-marker.tsx',
    {
      react: {
        useRef: () => refs[refCursor++],
        useCallback: (callback) => callback,
        useImperativeHandle: () => {},
        useState: (initial) => {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [
            states[index],
            (next) => {
              states[index] = next;
            },
          ];
        },
        useEffect: (next, nextDeps) => {
          if (nextDeps.length === 2) return; // pose reapplication is covered separately
          if (!deps || nextDeps.some((value, index) => value !== deps[index])) {
            effect = next;
            deps = nextDeps;
          }
        },
      },
      'react-native': {
        Image: 'RNImage',
        View: 'RNView',
        Platform: { OS: 'android' },
        StyleSheet: { create: (value) => value },
      },
      'react-native-maps': { Marker: 'NativeMarker' },
      '@/shared/ui/icon': { Icon: 'Icon' },
      '@/theme': { theme },
      '../../../assets/maps/delivery-home.png': 1,
      '../../../assets/maps/delivery-truck.png': 2,
    },
    {
      requestAnimationFrame: (callback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  );
  let coordinate = { latitude: -33.45, longitude: -70.66 };
  const render = () => {
    cursor = 0;
    refCursor = 0;
    effect = null;
    const tree = ArtworkMapMarker({ coordinate, artwork: 'truck', title: 'Tu repartidor' });
    if (effect) {
      cleanup?.();
      cleanup = effect();
    }
    return tree;
  };
  const flushFrame = () => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback();
  };
  let tree = render();
  assert.equal(tree.type, 'NativeMarker');
  assert.equal('image' in tree.props, false, 'never use MapKit’s legacy Marker.image loader');
  assert.equal(tree.props.tracksViewChanges, true, 'do not snapshot a blank image');
  const canvas = tree.props.children;
  assert.equal(canvas.props.collapsable, false, 'keep the Fabric marker wrapper');
  assert.equal(canvas.props.style.width, 56);
  assert.equal(canvas.props.style.height, 64);
  const image = canvas.props.children[1];
  assert.equal(image.type, 'RNImage');
  image.props.onLoad();
  render();
  assert.equal(frames.size, 0, 'image decode alone is insufficient without layout');
  canvas.props.onLayout();
  render();
  flushFrame();
  assert.equal(redraws, 1);
  assert.equal(render().props.tracksViewChanges, true, 'let the native frame paint first');
  flushFrame();
  tree = render();
  assert.equal(tree.props.tracksViewChanges, false);
  coordinate = { latitude: -33.46, longitude: -70.67 };
  assert.deepEqual(render().props.coordinate, coordinate);
  assert.equal(frames.size, 0, 'new GPS fixes must not restart image capture');
  image.props.onError();
  tree = render();
  assert.equal(tree.props.children, undefined);
  assert.equal(
    tree.props.pinColor,
    theme.colors.primary,
    'show a fallback instead of invisible artwork',
  );
  assert.notEqual(tree.key, 'truck:artwork');
  cleanup?.();
});

test('Google marker uses native world rotation and flat on iOS and Android', () => {
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (options) => options.default } },
  });
  for (const platform of ['ios', 'android']) {
    const updates = [];
    const refs = [
      { current: { setNativeProps: (pose) => updates.push(pose) } },
      { current: null },
      { current: null },
    ];
    let cursor = 0;
    const poseRef = { current: null };
    const { ArtworkMapMarker } = load('apps/mobile/src/shared/maps/artwork-map-marker.tsx', {
      react: {
        useRef: () => refs[cursor++],
        useState: (initial) => [initial, () => {}],
        useCallback: (callback) => callback,
        useEffect: () => {},
        useImperativeHandle: (ref, create) => {
          ref.current = create();
        },
      },
      'react-native': {
        Image: 'Image',
        View: 'View',
        Platform: { OS: platform },
        StyleSheet: { create: (value) => value },
      },
      'react-native-maps': { Marker: 'Marker' },
      '@/theme': { theme },
      '@/shared/ui/icon': { Icon: 'Icon' },
      '../../../assets/maps/delivery-home.png': 1,
      '../../../assets/maps/delivery-truck.png': 2,
    });
    const coordinate = { latitude: -33.45, longitude: -70.66 };
    const tree = ArtworkMapMarker({ coordinate, artwork: 'truck', title: 'Repartidor', poseRef });
    assert.equal(tree.props.flat, true);
    poseRef.current.setPose({ coordinate, bearing: 359 });
    assert.deepEqual(updates, [{ coordinate, rotation: 359 }]);
    assert.equal('transform' in tree.props.children.props.children[1].props.style, false);
  }
});

test('Apple marker rotates its image relative to camera and reapplies a stopped pose after camera turns', () => {
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (options) => options.default } },
  });
  const positions = [],
    images = [],
    effects = [];
  const refs = [
    { current: { setNativeProps: (value) => positions.push(value) } },
    { current: null },
    { current: { setNativeProps: (value) => images.push(value) } },
  ];
  const poseRef = { current: null };
  let cursor = 0;
  const { ArtworkMapMarker } = load('apps/mobile/src/shared/maps/artwork-map-marker.tsx', {
    react: {
      useRef: () => refs[cursor++],
      useState: (v) => [v, () => {}],
      useCallback: (cb) => cb,
      useEffect: (cb) => effects.push(cb),
      useImperativeHandle: (ref, create) => {
        ref.current = create();
      },
    },
    'react-native': {
      Image: 'Image',
      View: 'View',
      Platform: { OS: 'ios' },
      StyleSheet: { create: (v) => v },
    },
    'react-native-maps': { Marker: 'Marker' },
    '@/theme': { theme },
    '@/shared/ui/icon': { Icon: 'Icon' },
    '../../../assets/maps/delivery-home.png': 1,
    '../../../assets/maps/delivery-truck.png': 2,
  });
  const coordinate = { latitude: -33.45, longitude: -70.66 };
  const render = (mapHeading) => {
    cursor = 0;
    effects.length = 0;
    const tree = ArtworkMapMarker({
      coordinate,
      artwork: 'truck',
      title: 'Repartidor',
      poseRef,
      provider: 'apple',
      mapHeading,
    });
    effects.forEach((cb) => cb());
    return tree;
  };
  const tree = render(350);
  assert.equal(tree.props.flat, false);
  poseRef.current.setPose({ coordinate, bearing: 10 });
  assert.deepEqual(
    positions.at(-1),
    { coordinate },
    'Apple must not receive unsupported native rotation',
  );
  assert.deepEqual(images.at(-1), { style: { transform: [{ rotate: '20deg' }] } });
  render(10);
  assert.deepEqual(
    images.at(-1),
    { style: { transform: [{ rotate: '0deg' }] } },
    'camera turns must update a stationary truck',
  );
});

test('tracking and destination picker use the selected provider; Apple never displays Google routes', () => {
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (v) => v.default } },
  });
  let selected = 'apple',
    stateIndex = 0;
  const mocks = {
    react: { useState: (initial) => [stateIndex++ === 0 ? true : initial, () => {}] },
    'react-native': { View: 'View', StyleSheet: { create: (v) => v, absoluteFill: {} } },
    'react-native-maps': {
      __esModule: true,
      default: 'MapView',
      Polyline: 'Polyline',
      PROVIDER_GOOGLE: 'google',
    },
    '@/theme': { theme },
    '@/shared/maps/runtime-provider': { runtimeMapProvider: () => selected },
    '@/shared/maps/use-map-heading': {
      useMapHeading: () => ({ heading: 45, readHeading: () => {} }),
    },
    '@/shared/maps/route-attribution': { RouteAttribution: 'RouteAttribution' },
    '@/shared/maps/artwork-map-marker': { ArtworkMapMarker: 'Artwork' },
    '@/shared/ui/components': { Feedback: 'Feedback', Button: 'Button', ui: {} },
    '@/shared/ui/text': { Text: 'Text' },
    '@/shared/ui/icon': { Icon: 'Icon' },
    '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
    '@/shared/ui/bottom-sheet': { BottomSheet: 'Sheet' },
    './vehicle-map-marker': { VehicleMapMarker: 'Vehicle' },
    './use-tracking-camera': {
      useTrackingCamera: () => ({
        map: { current: null },
        onInteraction: () => {},
        recenter: () => {},
      }),
    },
  };
  const find = (tree, type) => {
    if (!tree || typeof tree !== 'object') return;
    if (tree.type === type) return tree;
    return [tree.props?.children]
      .flat()
      .map((child) => find(child, type))
      .find(Boolean);
  };
  const { TrackingMap } = load(
    'apps/mobile/src/features/tracking/customer/tracking-map.native.tsx',
    mocks,
  );
  const { DeliveryPointPicker } = load(
    'apps/mobile/src/features/orders/customer/delivery-point-picker.native.tsx',
    mocks,
  );
  const coordinate = { latitude: -33.45, longitude: -70.66 };
  for (const [provider, routeProvider] of [
    ['apple', 'google'],
    ['google', 'google'],
    ['apple', 'osrm'],
    ['google', 'osrm'],
  ]) {
    selected = provider;
    stateIndex = 0;
    const tracking = TrackingMap({
      destination: coordinate,
      position: { ...coordinate, captured_at: now },
      route: [coordinate, { latitude: -33.44, longitude: -70.65 }],
      routeProvider,
    });
    const map = find(tracking, 'MapView');
    assert.equal(map.props.provider, provider === 'google' ? 'google' : undefined);
    const compatible =
      provider === 'google' ? routeProvider === 'google' : routeProvider === 'osrm';
    assert.equal(!!find(tracking, 'Polyline'), compatible);
    assert.equal(find(tracking, 'Vehicle').props.provider, provider);
    assert.equal(!!find(tracking, 'Vehicle').props.route, compatible);
    stateIndex = 0;
    const picker = DeliveryPointPicker({
      point: coordinate,
      suggestion: null,
      onConfirm: () => {},
    });
    assert.equal(
      find(picker, 'MapView').props.provider,
      provider === 'google' ? 'google' : undefined,
    );
  }
});

test('Apple camera heading reads are bounded, preserve framing and ignore late unmounted results', async () => {
  let heading = 0,
    clock = 0,
    complete,
    cleanup;
  const refs = [];
  let ref = 0,
    calls = 0;
  const { useMapHeading } = load(
    'apps/mobile/src/shared/maps/use-map-heading.ts',
    {
      react: {
        useState: () => [
          heading,
          (value) => {
            heading = value;
          },
        ],
        useRef: (value) => refs[ref++] ?? (refs[ref - 1] = { current: value }),
        useCallback: (cb) => cb,
        useEffect: (cb) => {
          cleanup = cb();
        },
      },
    },
    { performance: { now: () => clock } },
  );
  const map = {
    current: {
      getCamera: () => {
        calls++;
        return new Promise((resolve) => {
          complete = resolve;
        });
      },
    },
  };
  const hook = useMapHeading(map, true);
  hook.readHeading();
  hook.readHeading();
  assert.equal(calls, 1);
  hook.readHeading(true);
  complete({ heading: 350 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(heading, 350);
  assert.equal(calls, 2, 'final camera read queued behind in-flight read');
  complete({ heading: 10 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(heading, 10);
  hook.readHeading();
  assert.equal(calls, 2, 'throttle reads during a gesture');
  clock = 150;
  hook.readHeading();
  assert.equal(calls, 3);
  cleanup();
  complete({ heading: 90 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(heading, 10, 'late read cannot update an unmounted marker');
});

test('GPS publisher: one in flight, no offline queue, no publish after lifecycle stop', async () => {
  let clock = 0;
  let active = true;
  let complete;
  const sent = [];
  const statuses = [];
  let closed = 0;
  const publisher = createLocationPublisher({
    orderId: order,
    now: () => clock,
    wallNow: () => Date.parse(now) + clock,
    isActive: () => active,
    onStatus: (value) => statuses.push(value),
    onClosed: () => closed++,
    publish: (value, signal) => {
      sent.push({ value, signal });
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  });
  const position = (patch = {}) => ({
    timestamp: Date.parse(now) + clock,
    coords: { latitude: -33.45, longitude: -70.66, accuracy: 8 },
    ...patch,
  });
  await publisher.accept(position({ mocked: true }));
  await publisher.accept(position({ timestamp: Date.parse(now) - 31000 }));
  await publisher.accept(position({ coords: { latitude: 91, longitude: -70.66, accuracy: 8 } }));
  assert.equal(sent.length, 0);
  const first = publisher.accept(position());
  clock = 6000;
  await publisher.accept(position());
  assert.equal(sent.length, 1, 'overlapping fixes must not queue');
  complete({ accepted: true, reason: 'accepted', received_at: now });
  await first;
  assert.equal(statuses.at(-1).receivedAt, now);
  await publisher.accept(position());
  assert.equal(sent.length, 1, 'wait after response, not capture time');
  clock = 11000;
  active = false;
  await publisher.accept(position());
  assert.equal(sent.length, 1, 'background fix dropped');
  active = true;
  const second = publisher.accept(position());
  assert.equal(sent.length, 2);
  publisher.stop();
  assert.equal(sent.at(-1).signal.aborted, true);
  const statusCount = statuses.length;
  complete({ accepted: true, reason: 'accepted', received_at: now });
  await second;
  clock = 50000;
  await publisher.accept(position());
  assert.equal(statuses.length, statusCount, 'late success cannot resurrect sharing');
  assert.equal(sent.length, 2);
  assert.equal(closed, 0);
});

test('GPS publisher: transient failure only retries a new fix; authorization closes capture', async () => {
  let clock = 0;
  let calls = 0;
  let closed = 0;
  const statuses = [];
  const publisher = createLocationPublisher({
    orderId: order,
    now: () => clock,
    wallNow: () => Date.parse(now) + clock,
    isActive: () => true,
    onStatus: (status) => statuses.push(status),
    onClosed: () => closed++,
    publish: async () => {
      calls++;
      throw calls === 1 ? new Error('offline') : { code: '42501' };
    },
  });
  const position = () => ({
    timestamp: Date.parse(now) + clock,
    coords: { latitude: -33.45, longitude: -70.66, accuracy: 8 },
  });
  await publisher.accept(position());
  assert.equal(statuses.at(-1).error, true);
  assert.equal(closed, 0);
  clock = 6000;
  await publisher.accept(position());
  assert.equal(closed, 1);
  clock = 20000;
  await publisher.accept(position());
  assert.equal(calls, 2, 'revocation prevents any further fix');
});
