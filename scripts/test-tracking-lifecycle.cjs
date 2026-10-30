// Hook effects with explicit boundary mocks; no React renderer, native runtime or network.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./testing/load.cjs');
const { trackingDeadline, trackingFailure } = load('apps/mobile/src/shared/tracking/freshness.ts');
const user = '10000000-0000-4000-8000-000000000001';
const order = '10000000-0000-4000-8000-000000000002';
const fresh = {
  order_id: order,
  state: 'fresh',
  server_now: '2026-10-24T04:00:00Z',
  fresh_until: '2026-10-24T04:00:30Z',
  received_at: '2026-10-24T04:00:00Z',
  destination: { latitude: -33.44, longitude: -70.65 },
  sample: {
    latitude: -33.45,
    longitude: -70.66,
    accuracy_m: 8,
    captured_at: '2026-10-24T04:00:00Z',
    received_at: '2026-10-24T04:00:00Z',
  },
};

function harness() {
  let foreground = true;
  let clock = 0;
  let stateCursor;
  let options;
  let previous = [];
  let pendingEffects;
  let response = async () => fresh;
  const state = [];
  const cache = new Map();
  const channels = [];
  const removed = [];
  const cancelled = [];
  const invalidated = [];
  const timers = new Map();
  let timerId = 0;
  const keyOf = (key) => JSON.stringify(key);
  const client = {
    invalidateQueries: async (value) => {
      invalidated.push(value);
    },
    cancelQueries: async (value) => {
      cancelled.push(value);
    },
    removeQueries: (value) => {
      cache.delete(keyOf(value.queryKey));
    },
  };
  const supabase = {
    channel: (name) => {
      const channel = {
        name,
        listeners: [],
        on: (_kind, filter, callback) => {
          channel.listeners.push({ filter, callback });
          return channel;
        },
        subscribe: (callback) => {
          channel.status = callback;
          return channel;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel: async (channel) => {
      removed.push(channel);
    },
  };
  const { useTrackingSnapshot } = load(
    'apps/mobile/src/shared/tracking/use-tracking-snapshot.ts',
    {
      react: {
        useState: (initial) => {
          const index = stateCursor++;
          if (!(index in state)) state[index] = initial;
          return [
            state[index],
            (next) => {
              state[index] = typeof next === 'function' ? next(state[index]) : next;
            },
          ];
        },
        useEffect: (callback, deps) => pendingEffects.push({ callback, deps }),
      },
      '@tanstack/react-query': {
        useQueryClient: () => client,
        useQuery: (next) => {
          options = next;
          return {
            data: cache.get(keyOf(next.queryKey)),
            isFetching: false,
            refetch: async () => {},
          };
        },
      },
      '@/shared/lifecycle/use-foreground-screen': { useForegroundScreen: () => foreground },
      '@/shared/supabase/client': { getSupabase: () => supabase },
      './data': { getOrderTracking: (...args) => response(...args) },
      './freshness': { trackingClock: () => clock, trackingDeadline, trackingFailure },
    },
    {
      setTimeout: (callback, delay) => {
        timers.set(++timerId, { callback, delay });
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
      setInterval: (callback, delay) => {
        timers.set(++timerId, { callback, delay });
        return timerId;
      },
      clearInterval: (id) => timers.delete(id),
    },
  );
  return {
    channels,
    removed,
    cancelled,
    invalidated,
    cache,
    timers,
    setForeground: (value) => {
      foreground = value;
    },
    setClock: (value) => {
      clock = value;
    },
    setResponse: (value) => {
      response = value;
    },
    options: () => options,
    async read(signal = new AbortController().signal) {
      const current = options;
      const result = await current.queryFn({ signal });
      cache.set(keyOf(current.queryKey), result);
      return result;
    },
    render(identity = user, id = order, active = true) {
      stateCursor = 0;
      pendingEffects = [];
      const result = useTrackingSnapshot(identity, id, active);
      for (let index = 0; index < pendingEffects.length; index++) {
        const next = pendingEffects[index];
        const old = previous[index];
        if (old && next.deps.every((dep, offset) => Object.is(dep, old.deps[offset]))) continue;
        old?.cleanup?.();
        previous[index] = { deps: next.deps, cleanup: next.callback() };
      }
      return result;
    },
    dispose() {
      previous.forEach((effect) => effect.cleanup?.());
      previous = [];
    },
  };
}

test('tracking: subscribe/reconnect refetch, expire offline, redact on read failure and denial', async () => {
  const h = harness();
  h.render();
  assert.equal(h.options().refetchInterval({ state: {} }), 5000);
  await h.read();
  assert.equal(h.render().position.latitude, -33.45);
  const channel = h.channels.at(-1);
  assert.deepEqual(
    channel.listeners.map((item) => item.filter.table),
    ['order_tracking_signals', 'order_tracking_signals', 'orders'],
  );
  channel.status('SUBSCRIBED');
  channel.status('CHANNEL_ERROR');
  channel.status('SUBSCRIBED');
  assert.equal(h.invalidated.length, 2, 'query must close both subscription gaps');
  h.setClock(30001);
  assert.equal(h.render().position, null, 'deadline hides coordinates without a network response');
  assert.equal(h.render().expired, true);
  h.setResponse(async () => {
    throw new Error('offline');
  });
  await h.read();
  const failed = h.render();
  assert.equal(failed.snapshot, null);
  assert.ok(failed.message);
  assert.equal(
    [...h.cache.values()][0].snapshot,
    null,
    'coordinates removed from cache on failed refresh',
  );
  h.setResponse(async () => {
    throw { code: '42501' };
  });
  await h.read();
  assert.equal(h.render().blocked, true);
  assert.equal(h.options().refetchInterval({ state: { data: { blocked: true } } }), false);
  assert.ok(h.removed.includes(channel));
  const count = h.invalidated.length;
  channel.status('SUBSCRIBED');
  channel.listeners[0].callback();
  assert.equal(h.invalidated.length, count, 'removed channel cannot refetch');
  h.dispose();
  assert.equal(h.timers.size, 0);
});

test('tracking: terminal event cuts access immediately; foreground and identity clean up', async () => {
  const h = harness();
  h.render();
  await h.read();
  h.render();
  const old = h.channels.at(-1);
  old.listeners[2].callback({ new: { id: order, status: 'cancelled' } });
  assert.equal(h.render().position, null, 'terminal event wins over a cached fresh result');
  assert.equal(h.render().ended, true);
  assert.equal(h.cache.size, 0);
  assert.ok(h.cancelled.length > 0);
  h.dispose();

  const resumed = harness();
  resumed.render();
  await resumed.read();
  resumed.render();
  const first = resumed.channels.at(-1);
  resumed.setForeground(false);
  assert.equal(resumed.render().position, null);
  assert.equal(resumed.cache.size, 0);
  assert.equal(resumed.timers.size, 0);
  resumed.setForeground(true);
  resumed.render();
  assert.notEqual(resumed.channels.at(-1).name, first.name);
  await resumed.read();
  resumed.render();
  const stranger = '10000000-0000-4000-8000-000000000003';
  assert.equal(resumed.render(stranger).position, null, 'other session never inherits a point');
  assert.equal(resumed.render(undefined, order, false).position, null);
  resumed.dispose();
});

test('tracking: cancelled slow read cannot restore a marker', async () => {
  const h = harness();
  h.render();
  let resolve;
  h.setResponse(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const controller = new AbortController();
  const pending = h.read(controller.signal);
  controller.abort();
  resolve(fresh);
  await assert.rejects(pending, /cancelled/);
  assert.equal(h.cache.size, 0);
  h.dispose();
});

test('tracking requests: timeout and caller cancellation abort the actual transport', async () => {
  let timeout;
  let cleared = 0;
  const { trackingRequest } = load(
    'apps/mobile/src/shared/tracking/request.ts',
    {},
    {
      setTimeout: (callback, delay) => {
        assert.equal(delay, 10000);
        timeout = callback;
        return 1;
      },
      clearTimeout: () => cleared++,
    },
  );
  const request = (signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  const caller = new AbortController();
  const first = trackingRequest(request, caller.signal);
  caller.abort();
  await assert.rejects(first, /aborted/);
  assert.equal(cleared, 1);
  const stalled = trackingRequest(request);
  timeout();
  await assert.rejects(stalled, /aborted/);
  assert.equal(cleared, 2);
  await assert.rejects(
    trackingRequest(() => {
      throw new Error('transport must not start');
    }, caller.signal),
    /cancelled/,
  );
});
