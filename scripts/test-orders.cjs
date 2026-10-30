// Local domain/form assertions: no network, database or native runtime.
const assert = require('node:assert/strict');

const { load } = require('./testing/load.cjs');
const { createOrderFormSchema } = load('apps/mobile/src/features/orders/customer/order-form.ts');
const { canCancel, formatClp, productSchema, productLabel, clpSchema } = load(
  'apps/mobile/src/shared/orders/contracts.ts',
);
const schema = createOrderFormSchema([{ code: '13101', name: 'Santiago' }]);
const form = {
  productId: '10000000-0000-4000-8000-000000000001',
  quantity: '3',
  exchangeEmpty: false,
  address: '  Calle Prueba 123  ',
  communeCode: '13101',
  notes: '',
};
assert.equal(schema.parse(form).address, 'Calle Prueba 123');
assert.equal(schema.parse(form).exchangeEmpty, false);
for (const quantity of ['0', '-1', '1.5', '100', '', '1e2', 'NaN']) {
  assert.equal(schema.safeParse({ ...form, quantity }).success, false, quantity);
}
for (const communeCode of ['99999', 'Santiago', '', '1310']) {
  assert.equal(schema.safeParse({ ...form, communeCode }).success, false, communeCode);
}
assert.equal(schema.safeParse({ ...form, address: '  ' }).success, false);
assert.equal(schema.safeParse({ ...form, address: 'a'.repeat(301) }).success, false);
assert.equal(schema.safeParse({ ...form, notes: 'a'.repeat(1001) }).success, false);
assert.equal(schema.safeParse({ ...form, exchangeEmpty: 'false' }).success, false);
assert.equal(schema.safeParse({ ...form, quantity: '99' }).success, true);
assert.equal(
  schema.safeParse({ ...form, deliveryPoint: { latitude: -33.45, longitude: -70.66 } }).success,
  true,
);
for (const deliveryPoint of [
  { latitude: NaN, longitude: -70.66 },
  { latitude: -91, longitude: -70.66 },
  { latitude: -33.45, longitude: Infinity },
  { latitude: -33.45, longitude: 181 },
  { latitude: -33.45 },
])
  assert.equal(schema.safeParse({ ...form, deliveryPoint }).success, false);
for (const status of ['requested', 'offered', 'accepted']) assert.equal(canCancel(status), true);
for (const status of ['on_the_way', 'delivered', 'cancelled'])
  assert.equal(canCancel(status), false);
assert.equal(
  formatClp(37035),
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(37035),
);
const product = { id: form.productId, brand: 'Gasco', weight_kg: 11 };
assert.equal(productSchema.safeParse(product).success, true);
assert.equal(clpSchema.safeParse(0).success, true);
assert.equal(clpSchema.safeParse(1.5).success, false);
assert.equal(clpSchema.safeParse(-1).success, false);
assert.equal(productLabel(productSchema.parse(product)), '11 kg');
for (const variant of ['vma', 'vm']) {
  const cylinder = productSchema.parse({ ...product, brand: 'Abastible', weight_kg: 15, variant });
  assert.equal(productLabel(cylinder), `${variant.toUpperCase()} 15 kg`);
}
assert.equal(productSchema.safeParse({ ...product, variant: 'unknown' }).success, false);
console.log(
  'PASS: order form, official catalogue membership, integer quantity/CLP, explicit exchange and cancellation visibility',
);

const { test } = require('node:test');
test('pull to refresh scopes reads to this account/order and joins requests already running', async () => {
  const userId = '10000000-0000-4000-8000-000000000002';
  const orderId = '10000000-0000-4000-8000-000000000003';
  let session = { user: { id: userId } };
  const calls = [];
  const { useOrderDetailRefresh } = load('apps/mobile/src/features/orders/customer/order-data.ts', {
    '@tanstack/react-query': {
      useQueryClient: () => ({ refetchQueries: async (...args) => calls.push(args) }),
    },
    '@/features/auth/auth-provider': { useAuth: () => ({ session }) },
    '@/shared/supabase/client': {},
  });
  await useOrderDetailRefresh(orderId)();
  assert.deepEqual(
    calls.map(([filter]) => filter.queryKey),
    [
      ['customer-orders', userId, orderId],
      ['order-catalogue', userId],
      ['order-tracking', userId, orderId],
      ['order-route', userId, orderId],
    ],
  );
  for (const [filter, options] of calls) {
    assert.equal(filter.type, 'active', 'do not wake inactive/off-screen GPS queries');
    assert.equal(options.cancelRefetch, false, 'join polling instead of cancelling it');
  }
  assert.notEqual(calls[0][0].exact, true, 'include this order’s events and business contact');
  assert.equal(calls[2][0].exact, true, 'target only this order’s tracking');
  session = null;
  await useOrderDetailRefresh(orderId)();
  assert.equal(calls.length, 4, 'logout must not start more reads');
});

test('manual refresh: indicator follows the gesture, rejects overlap and clears after failure', async () => {
  let refreshing = false;
  const inFlight = { current: false };
  let calls = 0;
  let complete;
  const { useManualRefresh } = load('apps/mobile/src/shared/ui/use-manual-refresh.ts', {
    react: {
      useRef: () => inFlight,
      useState: () => [
        refreshing,
        (value) => {
          refreshing = value;
        },
      ],
    },
  });
  const action = () => {
    calls++;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  let refresh = useManualRefresh(action);
  assert.equal(refresh.refreshing, false);
  assert.equal(calls, 0, 'render/polling alone must not start a manual refresh');
  const first = refresh.refresh();
  refresh = useManualRefresh(action);
  assert.equal(refresh.refreshing, true);
  await refresh.refresh();
  assert.equal(calls, 1, 'a second gesture must not duplicate in-flight work');
  complete();
  await first;
  assert.equal(useManualRefresh(action).refreshing, false);
  await useManualRefresh(async () => {
    throw new Error('offline');
  }).refresh();
  assert.equal(
    useManualRefresh(action).refreshing,
    false,
    'a failed read must release the spinner',
  );
  await useManualRefresh(undefined).refresh();
  assert.equal(calls, 1, 'screens without an action must remain unchanged');
});
