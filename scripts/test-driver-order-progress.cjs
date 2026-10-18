// Offline behavior checks. No Supabase, native runtime, app rendering or timers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(filename, overrides = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      Intl,
      ...globals,
      require: (name) => overrides[name] ?? require(name),
    },
    { filename },
  );
  return module.exports;
}

const userId = '10000000-0000-4000-8000-000000000001';
const orderId = '10000000-0000-4000-8000-000000000002';
let zone = 'customer';
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
const channel = {
  on: (event, options, callback) => {
    assert.equal(event, 'postgres_changes');
    filter = options;
    onChange = callback;
    return channel;
  },
  subscribe: (callback) => {
    onStatus = callback;
    return channel;
  },
};
const supabase = {
  channel: (name) => {
    channelName = name;
    return channel;
  },
  removeChannel: (value) => {
    assert.equal(value, channel);
    removeChannel++;
  },
};
const { useCustomerOrderUpdates } = load(
  'apps/mobile/src/features/orders/customer/order-updates.ts',
  {
    react: { useEffect: (callback) => (effect = callback) },
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
assert.equal(channelName, `customer-orders:${userId}`);
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
zone = 'driver';
useCustomerOrderUpdates();
assert.equal(effect(), undefined, 'no customer channel for driver role');

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
