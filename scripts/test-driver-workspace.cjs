// Offline view/logic checks with mocked hooks. No rendering, native runtime or network.
const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const contracts = load('apps/mobile/src/features/driver/offer-contracts.ts', {
  '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
});
const id = '10000000-0000-4000-8000-000000000001';
const workspace = {
  is_verified: true,
  application_status: 'approved',
  business: { id, name: 'Negocio', is_verified: true, is_demo: true, brands: ['Lipigas'] },
  can_manage_business: false,
  can_receive_offers: true,
  blocking_reason: null,
};
assert.equal(contracts.driverWorkspaceSchema.safeParse(workspace).success, true);
assert.equal(
  contracts.driverWorkspaceSchema.safeParse({ ...workspace, blocking_reason: 'business_disabled' })
    .success,
  false,
);
const now = Date.now();
const offer = {
  order_id: id,
  brand: 'Lipigas',
  weight_kg: 11,
  variant: 'standard',
  quantity: 1,
  exchange_empty: true,
  commune_code: '13101',
  commune_name: 'Santiago',
  total_clp: 12345,
  expires_at: new Date(now + 60000).toISOString(),
};
assert.equal(contracts.isDriverOfferCurrent(offer, now), true);
assert.equal(contracts.isDriverOfferCurrent(offer, now + 60000), false);
const nodes = (value) =>
  !value || typeof value !== 'object'
    ? []
    : Array.isArray(value)
      ? value.flatMap(nodes)
      : [value, ...nodes(value.props?.children)];
const button = (tree, label) =>
  nodes(tree).find((node) => node.type === 'Button' && node.props.label === label);
const theme = { spacing: {}, borders: {}, colors: {}, layout: {} };
const components = {
  Button: 'Button',
  Card: 'Card',
  Feedback: 'Feedback',
  StatusBadge: 'StatusBadge',
  ui: {},
};
const ui = load('apps/mobile/src/features/driver/driver-ui.tsx', {
  'react-native': { View: 'View', StyleSheet: { create: (value) => value } },
  'expo-router': {},
  '@/shared/ui/components': components,
  '@/shared/ui/text': { Text: 'Text' },
  '@/theme': { theme },
  '@/features/driver/offer-contracts': contracts,
});
let available;
const props = {
  settings: { is_available: false, communes: [] },
  workspace,
  hasOrder: false,
  busy: false,
  uncertain: false,
  onChange: (value) => {
    available = value;
  },
};
assert.equal(button(ui.DriverAvailability(props), 'Activar disponibilidad').props.disabled, true);
props.settings.communes = [{ code: '13101', name: 'Santiago' }];
button(ui.DriverAvailability(props), 'Activar disponibilidad').props.onPress();
assert.equal(available, true);
assert.equal(
  button(ui.DriverAvailability({ ...props, hasOrder: true }), 'Activar disponibilidad').props
    .disabled,
  true,
);
const blocked = { ...workspace, can_receive_offers: false, blocking_reason: 'business_disabled' };
assert.equal(
  button(ui.DriverAvailability({ ...props, workspace: blocked }), 'Activar disponibilidad').props
    .disabled,
  true,
);
button(
  ui.DriverAvailability({
    ...props,
    workspace: blocked,
    settings: { ...props.settings, is_available: true },
  }),
  'Dejar de recibir ofertas',
).props.onPress();
assert.equal(available, false, 'business problems still allow stopping availability');

let assigned = null,
  unknown = false,
  currentWorkspace = workspace;
const accepted = [],
  saved = [],
  messages = [];
const action = { isPending: false, error: null, reset() {}, mutate() {} };
const settings = {
  data: { is_available: true, communes: [{ code: '13101', name: 'Santiago' }] },
  isPending: false,
  isError: false,
  refetch: () => refetch('settings'),
};
let refreshing = false,
  backgroundFetching = false;
const refreshLock = { current: false };
const refreshCalls = [],
  pendingRefreshes = [];
function refetch(name) {
  refreshCalls.push(name);
  return new Promise((resolve, reject) => pendingRefreshes.push({ resolve, reject }));
}
const { OffersScreen } = load('apps/mobile/src/features/driver/offers-screen.tsx', {
  react: {
    memo: (fn) => fn,
    useRef: () => refreshLock,
    useState: (initial) =>
      typeof initial === 'boolean'
        ? [refreshing, (value) => (refreshing = value)]
        : ['', (message) => messages.push(message)],
  },
  'react-native': { FlatList: 'FlatList', View: 'View' },
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  'expo-router': { router: {} },
  '@/features/auth/auth-provider': {
    useAuth: () => ({ session: { user: { email: 'driver@example.com' } } }),
  },
  '@/features/driver/offer-data': {
    useDriverOffers: () => ({
      settings,
      offers: {
        data: [offer],
        isError: false,
        isFetching: backgroundFetching,
        isRefetching: backgroundFetching,
        refetch: () => refetch('offers'),
      },
    }),
    useDriverWorkspace: () => ({
      data: currentWorkspace,
      isPending: false,
      isError: false,
      refetch: () => refetch('workspace'),
    }),
    useAssignedOrder: () => ({
      data: assigned,
      isPending: false,
      isError: unknown,
      isFetching: backgroundFetching,
      refetch: () => refetch('assigned'),
    }),
    useDriverClock: () => now,
    useDriverActions: () => ({
      accept: { ...action, mutate: (...args) => accepted.push(args) },
      reject: action,
      settings: { ...action, mutate: (value) => saved.push(value) },
    }),
  },
  '@/features/driver/offer-contracts': contracts,
  '@/features/driver/driver-ui': ui,
  '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
  '@/shared/ui/avatar': { Avatar: 'Avatar' },
  '@/shared/ui/display-name': { getDisplayName: () => 'Conductor' },
  '@/shared/ui/components': components,
  '@/shared/ui/cylinder-illustration': { CylinderIllustration: 'CylinderIllustration' },
  '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
  '@/shared/ui/skeleton': { Skeleton: 'Skeleton' },
  '@/shared/ui/text': { Text: 'Text' },
  '@/shared/ui/screen': { screenStyles: {} },
});
const list = () => nodes(OffersScreen()).find((node) => node.type === 'FlatList');
const offerCard = () => {
  const item = list().props.renderItem({ item: offer });
  return item.type(item.props);
};
button(offerCard(), 'Aceptar pedido').props.onPress();
assert.equal(accepted.length, 1);
const availability = nodes(list().props.ListHeaderComponent).find(
  (node) => node.type === ui.DriverAvailability,
);
availability.props.onChange(false);
assert.equal(saved[0].is_available, false);
assert.equal(
  Object.keys(saved[0]).join(','),
  'is_available',
  'drivers can change availability only',
);
assigned = { order_id: id };
assert.equal(list().props.data.length, 0);
assigned = null;
unknown = true;
assert.equal(list().props.data.length, 0);
unknown = false;
currentWorkspace = blocked;
assert.equal(list().props.data.length, 0);

// Route visibility follows capabilities; customer navigation never authorizes driver routes.
let zone = 'customer';
function Stack() {}
Stack.Protected = 'Protected';
Stack.Screen = 'Screen';
const navigator = load('apps/mobile/src/features/auth/auth-navigator.tsx', {
  react: { useEffect() {} },
  'expo-router': { usePathname: () => '/driver' },
  'expo-router/stack': { Stack },
  '@/features/auth/registration': { useRegistration: { getState: () => ({ leave() {} }) } },
  '@/features/auth/auth-provider': {
    useAuth: () => ({ session: { user: { id } }, zone, loading: false, error: false }),
  },
  '@/features/auth/auth-ui': {},
  '@/features/auth/zone-screen': {},
});
const guardFor = (name) =>
  nodes(navigator.AuthNavigator()).find(
    (node) =>
      node.type === 'Protected' &&
      nodes(node.props.children).some(
        (child) => child.type === 'Screen' && child.props.name === name,
      ),
  ).props.guard;
assert.equal(guardFor('(customer)'), true);
assert.equal(guardFor('(driver)'), false);
zone = 'driver';
assert.equal(guardFor('(customer)'), true);
assert.equal(guardFor('(driver)'), true);

// Delivery closes only after explicit confirmation; stale/terminal orders cannot advance.
let deliveryConfirmation = false;
let delivery = {
  ...offer,
  status: 'on_the_way',
  delivery_address: 'Dirección privada',
  notes: null,
};
let deliveryError = false;
const advanced = [];
const { AssignedOrderScreen } = load('apps/mobile/src/features/driver/assigned-order-screen.tsx', {
  react: {
    useState: () => [
      deliveryConfirmation,
      (value) => {
        deliveryConfirmation = value;
      },
    ],
  },
  'expo-router': { router: {}, useLocalSearchParams: () => ({ id }) },
  '@/features/driver/offer-data': {
    useAssignedOrder: () => ({
      data: delivery,
      isPending: false,
      isError: deliveryError,
      isFetching: false,
    }),
    useDriverActions: () => ({ advance: { ...action, mutate: (value) => advanced.push(value) } }),
  },
  '@/features/driver/offer-contracts': contracts,
  '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
  '@/shared/ui/components': { ...components, Section: 'Section' },
  '@/shared/ui/screen': { Screen: 'Screen' },
  '@/shared/ui/skeleton': { Skeleton: 'Skeleton' },
  '@/shared/ui/text': { Text: 'Text' },
});
button(AssignedOrderScreen(), 'Marcar como entregado').props.onPress();
assert.equal(advanced.length, 0);
button(AssignedOrderScreen(), 'Sí, pedido entregado').props.onPress();
assert.equal(advanced[0].status, 'delivered');
delivery = { ...delivery, status: 'cancelled' };
assert.equal(button(AssignedOrderScreen(), 'Marcar como entregado'), undefined);
delivery = { ...delivery, status: 'on_the_way' };
deliveryError = true;
assert.equal(button(AssignedOrderScreen(), 'Marcar como entregado'), undefined);

console.log(
  'PASS: inherited coverage, availability-only writes, expired offers, active-order blocking and separate role capabilities',
);

async function checkManualRefresh() {
  const refreshButton = () => button(list().props.ListHeaderComponent, 'Actualizar jornada');
  for (const fetching of [true, false, true]) {
    backgroundFetching = fetching;
    assert.equal(
      refreshButton().props.disabled,
      false,
      'background polling must not pulse the button',
    );
    assert.equal(
      list().props.refreshing,
      false,
      'polling must not show the manual refresh spinner',
    );
  }
  assert.equal(refreshCalls.length, 0, 'rerenders must not invoke manual refresh');
  const first = refreshButton().props.onPress();
  assert.equal(refreshButton().props.disabled, true);
  assert.equal(list().props.refreshing, true);
  await list().props.onRefresh();
  assert.deepEqual(refreshCalls, ['settings', 'workspace', 'offers', 'assigned']);
  pendingRefreshes[0].resolve();
  pendingRefreshes[1].reject(new Error('offline'));
  pendingRefreshes[2].resolve();
  await Promise.resolve();
  assert.equal(list().props.refreshing, true, 'wait for every query even when another fails');
  pendingRefreshes[3].resolve();
  await first;
  assert.equal(list().props.refreshing, false);
  assert.equal(refreshButton().props.disabled, false, 'a failed query must allow another retry');
  const retry = list().props.onRefresh();
  assert.equal(refreshCalls.length, 8);
  pendingRefreshes.slice(4).forEach(({ resolve }) => resolve());
  await retry;
  assert.equal(list().props.refreshing, false);
  console.log(
    'PASS background polling stays quiet; manual refresh waits, deduplicates and recovers',
  );
}
checkManualRefresh().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

for (const os of ['web', 'ios', 'android']) {
  const mocks = {
    'react-native': { Platform: { OS: os } },
    'react-native-svg': {
      default: 'Svg',
      Path: 'Path',
      Circle: 'Circle',
      Ellipse: 'Ellipse',
      Rect: 'Rect',
    },
    '@/theme': { theme },
  };
  const { Icon } = load('apps/mobile/src/shared/ui/icon.tsx', mocks);
  for (const svg of [Icon({ name: 'clock' })]) {
    assert.equal(svg.props['aria-hidden'], true, 'decorative SVGs stay hidden from screen readers');
    assert.equal(Object.hasOwn(svg.props, 'accessible'), os !== 'web');
    if (os !== 'web') assert.equal(svg.props.accessible, false);
  }
}
console.log('PASS decorative icon accessibility props for web, iOS and Android');
