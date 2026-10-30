// Offline view/logic checks with mocked hooks. No rendering, native runtime or network.
const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const contracts = load('apps/mobile/src/features/driver/offer-contracts.ts', {
  '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
});
const documentContracts = load('apps/mobile/src/features/driver/document-contracts.ts', {
  '@/shared/documents/owner-documents': {},
});
let licenseSubmission = 'unknown';
const documentData = {
  useDriverLicenseSubmission: () => ({
    submission: licenseSubmission,
    refresh: () => Promise.resolve(),
  }),
};
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
      : value.type === 'BottomSheet' && !value.props.visible
        ? []
        : [value, ...nodes(value.props?.children), ...nodes(value.props?.footer)];
const button = (tree, label) =>
  nodes(tree).find((node) => node.type === 'Button' && node.props.label === label);
const theme = { spacing: {}, borders: {}, colors: {}, layout: {}, radii: {} };
const components = {
  Button: 'Button',
  Card: 'Card',
  Feedback: 'Feedback',
  StatusBadge: 'StatusBadge',
  ui: {},
};
const homeNavigation = [];
const ui = load('apps/mobile/src/features/driver/driver-ui.tsx', {
  './document-contracts': documentContracts,
  'react-native': {
    View: 'View',
    Switch: 'Switch',
    ActivityIndicator: 'Spinner',
    StyleSheet: { create: (value) => value },
  },
  'expo-router': { router: { push: (target) => homeNavigation.push(target) } },
  '@/shared/ui/components': components,
  '@/shared/ui/text': { Text: 'Text' },
  '@/shared/ui/icon': { Icon: 'Icon' },
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
available = undefined;
const blockedHome = ui.DriverAvailability({ ...props, workspace: blocked, appearance: 'home' });
button(blockedHome, 'Revisar habilitación').props.onPress();
assert.equal(available, undefined, 'home recovery navigates without enabling a blocked driver');
assert.equal(homeNavigation.at(-1), '/driver-account');
const licenseWorkspace = {
  ...workspace,
  can_receive_offers: false,
  blocking_reason: 'driver_documents',
};
const reviewHome = ui.DriverAvailability({
  ...props,
  workspace: licenseWorkspace,
  appearance: 'home',
  licenseSubmission: 'in_review',
});
assert.ok(nodes(reviewHome).some((node) => node.props?.children === 'Licencia en revisión'));
assert.equal(button(reviewHome, 'Completar mi licencia'), undefined);
available = undefined;
button(reviewHome, 'Actualizar mis archivos').props.onPress();
assert.equal(homeNavigation.at(-1), '/driver-documents');
assert.equal(available, undefined, 'License review never enables availability');
const incompleteHome = ui.DriverAvailability({
  ...props,
  workspace: licenseWorkspace,
  appearance: 'home',
  licenseSubmission: 'incomplete',
});
assert.ok(button(incompleteHome, 'Completar mi licencia'));
assert.equal(button(incompleteHome, 'Actualizar mis archivos'), undefined);
assert.equal(
  button(
    ui.DriverAvailability({ ...props, appearance: 'home', uncertain: true }),
    'Comenzar a repartir',
  ).props.disabled,
  true,
);

// The new coverage control preserves authorization and only writes availability.
const coverageSwitch = (overrides = {}) =>
  nodes(ui.DriverAvailability({ ...props, appearance: 'coverage', ...overrides })).find(
    (node) => node.type === 'Switch',
  );
available = undefined;
coverageSwitch().props.onValueChange(true);
assert.equal(available, true);
for (const state of [
  { settings: { is_available: false, communes: [] } },
  { hasOrder: true },
  { workspace: blocked },
  { uncertain: true },
  { busy: true },
]) {
  available = undefined;
  const toggle = coverageSwitch(state);
  assert.equal(toggle.props.disabled, true);
  toggle.props.onValueChange(true);
  assert.equal(available, undefined, 'a disabled coverage switch cannot activate availability');
}
const pauseDuringDelivery = coverageSwitch({
  settings: { ...props.settings, is_available: true },
  hasOrder: true,
  workspace: blocked,
});
assert.equal(pauseDuringDelivery.props.disabled, false);
pauseDuringDelivery.props.onValueChange(false);
assert.equal(available, false, 'an active delivery/business block still permits pausing');

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
  './document-data': documentData,
  react: {
    memo: (fn) => fn,
    useRef: () => refreshLock,
    useState: (initial) =>
      typeof initial === 'boolean'
        ? [refreshing, (value) => (refreshing = value)]
        : ['', (message) => messages.push(message)],
  },
  'react-native': {
    FlatList: 'FlatList',
    View: 'View',
    RefreshControl: 'RefreshControl',
    ActivityIndicator: 'Spinner',
    StyleSheet: { create: (value) => value },
  },
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
  '@/shared/ui/icon': { Icon: 'Icon' },
  '@/shared/ui/product-image': { ProductImage: 'ProductImage' },
  '@/theme': { theme },
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

// Account management links follow trusted capabilities, never user metadata/cached errors.
const accountQuery = { data: workspace, isPending: false, isError: false, error: null };
const accountRoutes = [];
const { DriverAccountScreen } = load('apps/mobile/src/features/driver/driver-account-screen.tsx', {
  './document-data': documentData,
  './document-contracts': documentContracts,
  react: { useRef: () => ({ current: null }), useState: () => [false, () => {}] },
  'react-native': {
    View: 'View',
    ScrollView: 'ScrollView',
    StyleSheet: { create: (value) => value },
  },
  'expo-router': {
    router: {
      push: (route) => accountRoutes.push(route),
      replace: (route) => accountRoutes.push(route),
    },
  },
  '@/features/auth/auth-provider': {
    useAuth: () => ({
      session: {
        user: {
          email: 'driver@example.com',
          user_metadata: { can_manage_business: true, is_verified: true },
        },
      },
      retry: async () => {},
    }),
  },
  '@/features/auth/zone-screen': { SignOutButton: 'SignOutButton' },
  '@/features/driver/offer-data': { useDriverWorkspace: () => accountQuery },
  '@/features/driver/offer-contracts': contracts,
  '@/shared/ui/components': { ...components, RefreshButton: 'RefreshButton' },
  '@/shared/ui/bottom-sheet': { BottomSheet: 'BottomSheet' },
  '@/shared/ui/display-name': { getDisplayName: () => 'Conductor' },
  '@/shared/ui/icon': { Icon: 'Icon' },
  '@/shared/ui/list-row': { ListRow: 'ListRow' },
  '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
  '@/shared/ui/screen': { Screen: 'Screen' },
  '@/shared/ui/skeleton': { Skeleton: 'Skeleton' },
  '@/shared/ui/text': { Text: 'Text' },
  '@/theme': { theme },
});
const accountRow = (title) =>
  nodes(DriverAccountScreen()).find(
    (node) => node.type === 'ListRow' && node.props.title === title,
  );
assert.equal(
  accountRow('Gestionar mi negocio'),
  undefined,
  'driver metadata cannot grant business management',
);
accountRow('Comprar como cliente').props.onPress();
assert.equal(accountRoutes.at(-1), '/customer');
accountQuery.data = { ...workspace, can_manage_business: true };
accountRow('Gestionar mi negocio').props.onPress();
assert.equal(accountRoutes.at(-1), '/business');
accountQuery.isError = true;
assert.equal(
  accountRow('Gestionar mi negocio'),
  undefined,
  'cached management capability is hidden after a failed access check',
);
assert.ok(
  nodes(DriverAccountScreen()).some(
    (node) => node.props?.accessibilityLabel === 'Ver mi habilitación: Acceso sin confirmar',
  ),
);
accountQuery.isError = false;
accountQuery.data = {
  ...workspace,
  is_verified: false,
  can_receive_offers: false,
  blocking_reason: 'not_approved',
};
assert.ok(
  nodes(DriverAccountScreen()).some(
    (node) =>
      node.props?.accessibilityLabel === 'Ver mi habilitación: Requisitos de reparto pendientes',
  ),
);
accountQuery.data = {
  ...workspace,
  can_receive_offers: false,
  blocking_reason: 'driver_documents',
};
licenseSubmission = 'in_review';
assert.ok(
  nodes(DriverAccountScreen()).some(
    (node) => node.props?.accessibilityLabel === 'Ver mi habilitación: Licencia en revisión',
  ),
);
assert.equal(button(DriverAccountScreen(), 'Completar mi licencia'), undefined);
assert.equal(button(DriverAccountScreen(), 'Actualizar mis archivos').props.variant, 'secondary');
accountRow('Mi licencia y documentos').props.onPress();
assert.equal(accountRoutes.at(-1), '/driver-documents');

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
assert.equal(
  guardFor('(driver-onboarding)'),
  true,
  'Personal documentation does not grant dispatch access',
);
zone = 'driver';
assert.equal(guardFor('(customer)'), true);
assert.equal(guardFor('(driver)'), true);
assert.equal(guardFor('(driver-onboarding)'), true);

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
  'react-native': {
    View: 'View',
    ScrollView: 'ScrollView',
    StyleSheet: { create: (value) => value },
  },
  '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
  '@/features/auth/auth-provider': { useAuth: () => ({ session: { user: { id } } }) },
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
  '@/shared/ui/bottom-sheet': { BottomSheet: 'BottomSheet' },
  '@/shared/ui/icon': { Icon: 'Icon' },
  '@/shared/ui/product-image': { ProductImage: 'ProductImage' },
  '@/features/tracking/driver/driver-tracking-card': { DriverTrackingCard: 'Tracking' },
  './delivery-summary': { DeliverySummary: 'Summary' },
  './delivery-action-notice': {
    DeliveryActionNotice: 'Notice',
    useDeliveryActionAnnouncement() {},
  },
  './use-delivery-progress': {
    useDeliveryProgress: (_user, orderId, mutate) => ({
      feedback: null,
      pending: false,
      clear() {},
      submit: (status) => mutate({ id: orderId, status }),
    }),
  },
  '@/theme': { theme },
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
  const refreshButton = () =>
    nodes(list().props.ListHeaderComponent).find(
      (node) => node.props?.accessibilityLabel === 'Actualizar jornada',
    );
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
