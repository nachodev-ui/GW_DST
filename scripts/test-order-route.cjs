const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./testing/load.cjs');
const { decodePolyline, fetchDirections } = load('supabase/functions/order-route/directions.ts');
const { makeRouteHandler, RouteHttpError } = load('supabase/functions/order-route/handler.ts');
const order = '10000000-0000-4000-8000-000000000001';
const lease = '10000000-0000-4000-8000-000000000002';
const points = [
  { latitude: -33.45, longitude: -70.66 },
  { latitude: -33.44, longitude: -70.65 },
];
const request = (body = { order_id: order }, token = 'valid') =>
  new Request('https://test/order-route', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
test('Google polyline decoder and Chile-biased request with provider failure fallback', async () => {
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  assert.deepEqual(decodePolyline(encoded), [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
  assert.throws(() => decodePolyline('_'));
  const result = await fetchDirections(points[0], points[1], 'test-only-key', async (url) => {
    assert.equal(url.origin, 'https://maps.googleapis.com');
    assert.equal(url.searchParams.get('region'), 'cl');
    assert.equal(url.searchParams.get('mode'), 'driving');
    assert.equal(url.searchParams.has('departure_time'), false);
    return Response.json({ status: 'OK', routes: [{ overview_polyline: { points: encoded } }] });
  });
  assert.equal(result.length, 3);
  assert.equal(
    await fetchDirections(points[0], points[1], 'test-only-key', async () =>
      Response.json({ status: 'ZERO_RESULTS' }),
    ),
    null,
  );
});
test('authentication, strict input and missing server key cannot call Google', async () => {
  let called = 0;
  const handler = makeRouteHandler({
    authenticate: async (t) => t === 'valid',
    begin: async () => {
      called++;
    },
    directions: async () => {
      called++;
    },
    finish: async () => {
      called++;
    },
  });
  assert.equal((await handler(request({}, null))).status, 401);
  assert.equal((await handler(request({}, 'expired'))).status, 401);
  assert.equal((await handler(request({ order_id: order, latitude: 0 }))).status, 400);
  assert.equal((await (await handler(request())).json()).state, 'unavailable');
  assert.equal(called, 0);
});
test('cached routes do not call Google; server permission failure is preserved', async () => {
  let calls = 0;
  const deps = {
    key: 'test-only-key',
    authenticate: async () => true,
    begin: async () => ({ state: 'ready', points }),
    finish: async () => true,
    directions: async () => {
      calls++;
      return points;
    },
  };
  const handler = makeRouteHandler(deps);
  for (let i = 0; i < 3; i++)
    assert.deepEqual((await (await handler(request())).json()).points, points);
  assert.equal(calls, 0);
  deps.begin = async () => {
    throw new RouteHttpError(403);
  };
  assert.equal((await makeRouteHandler(deps)(request())).status, 403);
});
test('one claimed request commits provider result, reauthorizes, and closes on terminal race', async () => {
  let begins = 0,
    calls = 0;
  const saved = [];
  const deps = {
    key: 'test-only-key',
    authenticate: async () => true,
    begin: async () =>
      ++begins === 1
        ? { state: 'compute', lease, origin: points[0], destination: points[1] }
        : { state: 'ended' },
    finish: async (...args) => {
      saved.push(args);
      return true;
    },
    directions: async () => {
      calls++;
      return points;
    },
  };
  const response = await makeRouteHandler(deps)(request());
  assert.equal((await response.json()).state, 'ended');
  assert.equal(calls, 1);
  assert.deepEqual(saved[0], [order, lease, points, 'google']);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  begins = 0;
  deps.directions = async () => {
    throw new Error('provider unavailable');
  };
  assert.equal((await (await makeRouteHandler(deps)(request())).json()).state, 'unavailable');
  assert.equal(saved.at(-1)[2], null, 'failure releases lease and applies database backoff');
});

test('OSRM geometry is validated and provider-specific claims never call Directions', async () => {
  const { fetchOsrm } = load('supabase/functions/order-route/osrm.ts');
  const result = await fetchOsrm(points[0], points[1], async (url, options) => {
    assert.equal(url.hostname, 'routing.openstreetmap.de');
    assert.equal(url.searchParams.get('geometries'), 'geojson');
    assert.ok(options.headers['User-Agent'].includes('Gasway'));
    return Response.json({
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: points.map((p) => [p.longitude, p.latitude]),
          },
        },
      ],
    });
  });
  assert.deepEqual(result, points);
  let calls = 0;
  const handler = makeRouteHandler({
    osrmEnabled: true,
    authenticate: async () => true,
    begin: async (_order, _token, provider) => {
      assert.equal(provider, 'osrm');
      return { state: 'ready', points };
    },
    finish: async () => true,
    directions: async () => {
      calls++;
    },
    osrm: async () => points,
  });
  const response = await handler(request({ order_id: order, provider: 'osrm' }));
  assert.deepEqual(await response.json(), {
    state: 'ready',
    points,
    order_id: order,
    provider: 'osrm',
  });
  assert.equal(calls, 0);
});

test('client route query is scoped, validates response and only recalculates after sustained deviation', async () => {
  const effects = [],
    refs = [],
    calls = [];
  let hook = 0,
    ref = 0,
    clock = 0,
    options;
  const state = { data: { state: 'ready', order_id: order, points } };
  const client = {
    cancelQueries: (filter) => calls.push(['cancel', filter]),
    removeQueries: (filter) => calls.push(['remove', filter]),
    invalidateQueries: (filter) => calls.push(['invalidate', filter]),
  };
  let response = { state: 'ready', order_id: order, points, provider: 'google' };
  const { useOrderRoute } = load(
    'apps/mobile/src/shared/tracking/use-order-route.ts',
    {
      react: {
        useRef: (initial) => refs[ref++] ?? (refs[ref - 1] = { current: initial }),
        useMemo: (create) => create(),
        useEffect: (create, deps) => {
          const i = hook++;
          const previous = effects[i];
          if (!previous || deps.some((value, index) => value !== previous.deps[index])) {
            previous?.cleanup?.();
            effects[i] = { deps, cleanup: create() };
          }
        },
      },
      '@tanstack/react-query': {
        useQueryClient: () => client,
        useQuery: (value) => {
          options = value;
          return state;
        },
      },
      '@/shared/supabase/client': {
        getSupabase: () => ({
          functions: { invoke: async () => ({ data: response, error: null }) },
        }),
      },
      './request': { trackingRequest: (create, signal) => create(signal) },
    },
    { performance: { now: () => clock } },
  );
  const render = (fix, active = true) => {
    hook = 0;
    ref = 0;
    return useOrderRoute('customer', order, active, fix);
  };
  const fix = (seconds, latitude = -33.45, longitude = -70.66) => ({
    latitude,
    longitude,
    accuracy_m: 8,
    captured_at: new Date(seconds * 1000).toISOString(),
  });
  assert.deepEqual(render(fix(0)), points);
  assert.equal(options.staleTime, Infinity);
  assert.equal(options.retry, false);
  assert.equal(options.refetchInterval({ state: { data: { state: 'ready' } } }), false);
  assert.equal(options.refetchInterval({ state: { data: { state: 'pending' } } }), 2000);
  assert.deepEqual(await options.queryFn({ signal: new AbortController().signal }), response);
  response = { ...response, order_id: lease };
  assert.equal(
    (await options.queryFn({ signal: new AbortController().signal })).state,
    'unavailable',
    'reject cross-order route',
  );
  for (let i = 1; i <= 4; i++) render(fix(i * 5));
  assert.equal(calls.length, 0, 'healthy GPS must not refetch a route');
  for (let i = 0; i < 3; i++) {
    clock = i * 5000;
    render(fix(30 + i * 5, -33.46, -70.67));
  }
  assert.equal(calls.filter(([kind]) => kind === 'invalidate').length, 1);
  clock = 20000;
  render(fix(50, -33.46, -70.67));
  assert.equal(calls.filter(([kind]) => kind === 'invalidate').length, 1, 'recalculation cooldown');
  assert.equal(render(null, false), undefined);
  assert.deepEqual(
    calls.slice(-2).map(([kind]) => kind),
    ['cancel', 'remove'],
  );
  assert.deepEqual(calls.at(-1)[1].queryKey, ['order-route', 'customer', order, 'google']);
});
