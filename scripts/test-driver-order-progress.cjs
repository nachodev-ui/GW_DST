// Offline behavior checks. No Supabase, native runtime, app rendering or timers.
const assert = require('node:assert/strict');

const { load } = require('./testing/load.cjs');

const userId = '10000000-0000-4000-8000-000000000001';
const orderId = '10000000-0000-4000-8000-000000000002';
let zone = 'customer';
let customerFocused = true;
let effect;
let appState;
let onChange;
let onStatus;
let filter;
let channelName;
let removeListener = 0;
let removeChannel = 0;
let nextTimer = 0;
const timers = new Map();
const invalidations = [];
const client = { invalidateQueries: (value) => invalidations.push(value) };
const auth = { useAuth: () => ({ session: { user: { id: userId } }, zone }) };
const channels = new Map();
const pendingRemovals = [];
const supabase = {
  channel: (name) => {
    channelName = name;
    if (channels.has(name)) return channels.get(name);
    let subscribed = false;
    const channel = {
      on: (event, options, callback) => {
        assert.equal(subscribed, false, 'cannot add postgres_changes after subscribe');
        assert.equal(event, 'postgres_changes');
        filter = options;
        onChange = callback;
        return channel;
      },
      subscribe: (callback) => {
        subscribed = true;
        onStatus = callback;
        return channel;
      },
    };
    channels.set(name, channel);
    return channel;
  },
  removeChannel: (value) => {
    const entry = [...channels].find(([, channel]) => channel === value);
    assert.ok(entry, 'remove only the owned channel');
    removeChannel++;
    return new Promise((resolve) => {
      pendingRemovals.push(() => {
        channels.delete(entry[0]);
        resolve('ok');
      });
    });
  },
};
const { useCustomerOrderUpdates } = load(
  'apps/mobile/src/features/orders/customer/order-updates.ts',
  {
    react: { useEffect: (callback) => (effect = callback) },
    'expo-router/react-navigation': { useIsFocused: () => customerFocused },
    'react-native': {
      AppState: {
        currentState: 'active',
        addEventListener: (event, callback) => {
          assert.equal(event, 'change');
          appState = callback;
          return { remove: () => removeListener++ };
        },
      },
    },
    '@tanstack/react-query': { useQueryClient: () => client },
    '@/features/auth/auth-provider': auth,
    '@/shared/supabase/client': { getSupabase: () => supabase },
  },
  {
    setInterval: (callback, delay) => {
      assert.equal(delay, 15_000);
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearInterval: (id) => timers.delete(id),
  },
);
useCustomerOrderUpdates();
const cleanup = effect();
assert.ok(channelName.startsWith(`customer-orders:${userId}:`));
const firstChannelName = channelName;
assert.equal(filter.filter, `customer_id=eq.${userId}`);
assert.equal(filter.table, 'orders');
assert.equal(filter.schema, 'public');
assert.equal(filter.event, '*');
assert.equal(timers.size, 1, 'fallback starts while connecting');
[...timers.values()][0]();
assert.equal(invalidations.length, 1);
assert.deepEqual(Array.from(invalidations[0].queryKey), ['customer-orders', userId]);
onStatus('SUBSCRIBED');
assert.equal(timers.size, 0);
assert.equal(invalidations.length, 2, 'catch up on subscription');
onChange({ new: { status: 'delivered' } });
assert.equal(invalidations.length, 3);
appState('background');
onChange({});
assert.equal(invalidations.length, 3, 'no refetch while backgrounded');
onStatus('CHANNEL_ERROR');
assert.equal(timers.size, 0);
appState('active');
assert.equal(invalidations.length, 4, 'refetch on resume');
assert.equal(timers.size, 1);
onStatus('TIMED_OUT');
assert.equal(timers.size, 1, 'no duplicate polling intervals');
onStatus('SUBSCRIBED');
assert.equal(timers.size, 0);
onStatus('CLOSED');
assert.equal(timers.size, 1);
cleanup();
assert.equal(timers.size, 0);
assert.equal(removeListener, 1);
assert.equal(removeChannel, 1);
const previous = invalidations.length;
onStatus('SUBSCRIBED');
onChange({});
assert.equal(invalidations.length, previous, 'ignore late callbacks after unmount');
const oldOnStatus = onStatus;
const oldOnChange = onChange;
const remountCleanup = effect();
assert.notEqual(channelName, firstChannelName, 'new channel during asynchronous removal');
assert.equal(channels.size, 2, 'old channel remains registered until removal completes');
oldOnStatus('SUBSCRIBED');
oldOnChange({});
assert.equal(invalidations.length, previous, 'old callbacks cannot refresh the remount');
pendingRemovals.shift()();
assert.equal(channels.size, 1, 'old cleanup preserves the new subscription');
onStatus('SUBSCRIBED');
onChange({});
assert.equal(invalidations.length, previous + 2, 'remounted subscription receives updates');
remountCleanup();
pendingRemovals.shift()();
assert.equal(channels.size, 0);
assert.equal(timers.size, 0);
assert.equal(removeListener, 2);
zone = 'driver';
useCustomerOrderUpdates();
const driverBuyingCleanup = effect();
assert.equal(channels.size, 1, 'approved driver buying as customer keeps own order updates');
driverBuyingCleanup();
pendingRemovals.shift()();
customerFocused = false;
useCustomerOrderUpdates();
assert.equal(effect(), undefined, 'no customer subscription outside the customer layout focus');

const contracts = load('apps/mobile/src/shared/orders/contracts.ts');
const driverContracts = load('apps/mobile/src/features/driver/offer-contracts.ts', {
  '@/shared/orders/contracts': contracts,
});
const cache = new Map();
let mutation;
let response;
let rpcCalls = 0;
const driverClient = {
  invalidateQueries: () => {},
  setQueryData: (key, data) => cache.set(JSON.stringify(key), data),
};
const { useDriverActions } = load('apps/mobile/src/features/driver/offer-data.ts', {
  react: {},
  'react-native': {},
  'expo-router/react-navigation': {},
  '@tanstack/react-query': {
    useMutation: (options) => {
      mutation = options;
      return options;
    },
    useQueryClient: () => driverClient,
  },
  '@/features/auth/auth-provider': auth,
  '@/shared/orders/contracts': contracts,
  '@/features/driver/offer-contracts': driverContracts,
  '@/shared/supabase/client': {
    getSupabase: () => ({
      rpc: async (name, args) => {
        rpcCalls++;
        assert.equal(name, 'advance_driver_order');
        assert.equal(args.p_order_id, orderId);
        assert.ok(['on_the_way', 'delivered'].includes(args.p_status));
        return response;
      },
    }),
  },
});
useDriverActions();
const order = {
  order_id: orderId,
  brand: 'Gasco',
  weight_kg: 11,
  quantity: 1,
  exchange_empty: true,
  commune_code: '13101',
  commune_name: 'Santiago',
  total_clp: 12345,
  status: 'delivered',
  delivery_address: 'Calle 123',
  notes: null,
};
async function checkMutation() {
  assert.equal(mutation.retry, false);
  response = { data: order, error: null };
  const delivered = await mutation.mutationFn({ id: orderId, status: 'delivered' });
  mutation.onSuccess(delivered);
  assert.equal(cache.get(JSON.stringify(['driver', userId, 'assigned', null])), null);
  assert.equal(
    cache.get(JSON.stringify(['driver', userId, 'assigned', orderId])).status,
    'delivered',
  );
  mutation.onSuccess({ ...order, status: 'on_the_way' });
  assert.equal(
    cache.get(JSON.stringify(['driver', userId, 'assigned', null])).status,
    'on_the_way',
  );
  response = { data: { ...order, status: 'offered' }, error: null };
  await assert.rejects(mutation.mutationFn({ id: orderId, status: 'on_the_way' }));
  response = { data: null, error: { code: '42501' } };
  await assert.rejects(mutation.mutationFn({ id: orderId, status: 'on_the_way' }));
  const callsBefore = rpcCalls;
  await assert.rejects(mutation.mutationFn({ id: orderId, status: 'cancelled' }));
  assert.equal(rpcCalls, callsBefore, 'invalid state rejected before RPC');
  assert.match(driverContracts.driverProgressError({ code: '42501' }), /asignado/);
  assert.match(driverContracts.driverProgressError({ code: '55000' }), /estado/i);
  assert.match(driverContracts.driverProgressError(new Error('offline')), /conexión/);
  console.log(
    'PASS: customer Realtime isolation, foreground fallback, cleanup; driver mutation/zod/cache/errors',
  );
}
checkMutation().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
