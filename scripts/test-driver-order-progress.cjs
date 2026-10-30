// Offline behavior checks. No Supabase, native runtime, app rendering or timers.
const assert = require('node:assert/strict');
const { test } = require('node:test');

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
  invalidateQueries: async () => {},
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

function progressHarness() {
  let activeUser = userId,
    activeOrder = orderId,
    record = null,
    cursor = 0,
    previousScope,
    cleanup,
    pendingEffect,
    updates = 0;
  const refs = [],
    calls = [];
  const { useDeliveryProgress } = load('apps/mobile/src/features/driver/use-delivery-progress.ts', {
    react: {
      useState: () => [
        record,
        (next) => {
          record = next;
          updates++;
        },
      ],
      useRef: (initial) => refs[cursor++] ?? (refs[cursor - 1] = { current: initial }),
      useEffect: (callback, [scope]) => {
        if (scope !== previousScope) {
          previousScope = scope;
          pendingEffect = callback;
        }
      },
    },
  });
  return {
    calls,
    get updates() {
      return updates;
    },
    identity: (user, id = orderId) => {
      activeUser = user;
      activeOrder = id;
    },
    render() {
      cursor = 0;
      const hook = useDeliveryProgress(activeUser, activeOrder, (values, callbacks) =>
        calls.push({ values, callbacks }),
      );
      if (pendingEffect) {
        cleanup?.();
        cleanup = pendingEffect();
        pendingEffect = null;
      }
      return hook;
    },
    close: () => cleanup?.(),
  };
}

test('delivery feedback waits for server acknowledgement, deduplicates taps and ignores polling', () => {
  const h = progressHarness();
  const initial = h.render();
  assert.equal(initial.feedback, null);
  initial.submit('on_the_way');
  initial.submit('on_the_way');
  assert.equal(h.calls.length, 1, 'block second tap before React renders');
  assert.equal(h.render().feedback.state, 'pending');
  assert.equal(h.render().feedback.state, 'pending', 'a query refresh cannot manufacture success');
  h.calls[0].callbacks.onSuccess({ order_id: orderId, status: 'on_the_way' });
  h.calls[0].callbacks.onSettled();
  const success = h.render();
  assert.equal(success.feedback.state, 'success');
  assert.equal(success.feedback.target, 'on_the_way');
  assert.equal(h.render().feedback.key, success.feedback.key, 're-renders preserve one event');
  success.clear();
  assert.equal(h.render().feedback, null);
  assert.equal(h.calls.length, 1, 'dismissal does not retry or change the order');
  h.close();
});

test('failed or mismatched transitions never report success; final delivery has its own event', () => {
  const h = progressHarness();
  h.render().submit('delivered');
  h.calls[0].callbacks.onError({ code: '55000' });
  h.calls[0].callbacks.onSettled();
  const failed = h.render().feedback;
  assert.equal(failed.state, 'error');
  assert.equal(failed.error.code, '55000');
  h.render().clear();
  h.render().submit('delivered');
  h.calls[1].callbacks.onSuccess({ order_id: userId, status: 'delivered' });
  h.calls[1].callbacks.onSettled();
  assert.equal(h.render().feedback.state, 'error', 'another order cannot confirm this delivery');
  h.render().submit('delivered');
  h.calls[2].callbacks.onSuccess({ order_id: orderId, status: 'on_the_way' });
  h.calls[2].callbacks.onSettled();
  assert.equal(
    h.render().feedback.state,
    'error',
    'a different status is not delivery confirmation',
  );
  h.render().submit('delivered');
  h.calls[3].callbacks.onSuccess({ order_id: orderId, status: 'delivered' });
  h.calls[3].callbacks.onSettled();
  const delivered = h.render().feedback;
  assert.equal(delivered.state, 'success');
  assert.equal(delivered.target, 'delivered');
  assert.notEqual(delivered.key, failed.key);
  h.close();
});

test('late delivery replies cannot notify another account, order or an unmounted screen', () => {
  for (const boundary of ['account', 'order', 'unmount']) {
    const h = progressHarness();
    h.render().submit('on_the_way');
    if (boundary === 'account') {
      h.identity('other-user');
      h.render();
    }
    if (boundary === 'order') {
      h.identity(userId, 'other-order');
      h.render();
    }
    if (boundary === 'unmount') h.close();
    const before = h.updates;
    h.calls[0].callbacks.onSuccess({ order_id: orderId, status: 'on_the_way' });
    h.calls[0].callbacks.onError(new Error('late error'));
    h.calls[0].callbacks.onSettled();
    assert.equal(h.updates, before);
    if (boundary !== 'unmount') {
      assert.equal(h.render().feedback, null);
      h.close();
    }
  }
});

test('delivery notices announce once, pair text with icons, and keep final success persistent', () => {
  const announcements = [],
    vibrations = [],
    ref = { current: null };
  let foreground = true,
    effect,
    reduceMotion = false;
  const { theme } = load('apps/mobile/src/theme/index.ts', {
    'react-native': { Platform: { select: (value) => value.default } },
  });
  const { DeliveryActionNotice, useDeliveryActionAnnouncement } = load(
    'apps/mobile/src/features/driver/delivery-action-notice.tsx',
    {
      react: {
        useRef: () => ref,
        useEffect: (callback) => {
          effect = callback;
        },
      },
      'react-native': {
        View: 'View',
        Platform: { OS: 'ios' },
        AccessibilityInfo: { announceForAccessibility: (value) => announcements.push(value) },
        StyleSheet: { create: (value) => value },
      },
      'react-native-reanimated': {
        __esModule: true,
        default: { View: 'AnimatedView' },
        FadeIn: { duration: (duration) => duration },
        useReducedMotion: () => reduceMotion,
      },
      'expo-haptics': {
        notificationAsync: async (value) => {
          vibrations.push(value);
        },
        NotificationFeedbackType: { Success: 'success', Error: 'error' },
      },
      '@/shared/lifecycle/use-foreground-screen': { useForegroundScreen: () => foreground },
      '@/shared/ui/icon': { Icon: 'Icon' },
      '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
      '@/shared/ui/text': { Text: 'Text' },
      './offer-contracts': { driverProgressError: () => 'Revisa el pedido antes de reintentar.' },
      '@/theme': { theme },
    },
  );
  let feedback = { key: 'start:1', scope: 'scope', target: 'on_the_way', state: 'success' };
  const render = () => {
    useDeliveryActionAnnouncement(feedback);
    const tree = DeliveryActionNotice({ feedback, onDismiss() {} });
    effect();
    return tree;
  };
  let tree = render();
  render();
  assert.equal(vibrations.length, 1);
  assert.equal(announcements.length, 1);
  assert.match(announcements[0], /Entrega iniciada/);
  assert.equal(tree.props.children[0].props.accessibilityLiveRegion, 'polite');
  assert.equal(tree.props.children[1].props.accessibilityLabel, 'Cerrar confirmación de inicio');
  feedback = { ...feedback, key: 'end:2', target: 'delivered' };
  tree = render();
  assert.match(announcements[1], /Entrega completada/);
  assert.equal(
    tree.props.children[1],
    null,
    'final completion stays visible until leaving the screen',
  );
  reduceMotion = true;
  assert.equal(render().props.entering, undefined);
  foreground = false;
  feedback = { ...feedback, key: 'error:3', state: 'error', error: new Error('offline') };
  tree = render();
  foreground = true;
  render();
  assert.equal(vibrations.length, 2, 'returning to the screen does not replay background feedback');
  assert.equal(tree.props.children[0].props.accessibilityRole, 'alert');
});
