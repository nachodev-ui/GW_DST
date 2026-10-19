// Offline assertions for the driver response boundary; no database/native runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(filename, overrides = {}) {
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
      require: (name) =>
        overrides[name] ??
        (name === '@/shared/orders/contracts'
          ? load('apps/mobile/src/shared/orders/contracts.ts')
          : require(name)),
    },
    { filename },
  );
  return module.exports;
}
const { offerSchema, assignedOrderSchema, settingsSchema, driverError } = load(
  'apps/mobile/src/features/driver/offer-contracts.ts',
);
const summary = {
  order_id: '10000000-0000-4000-8000-000000000001',
  brand: 'Gasco',
  weight_kg: 11,
  quantity: 2,
  exchange_empty: true,
  commune_code: '13101',
  commune_name: 'Santiago',
  total_clp: 24690,
};
const offer = { ...summary, expires_at: '2026-10-18T12:00:00+00:00' };
assert.equal(offerSchema.safeParse(offer).success, true);
for (const variant of ['standard', 'vma', 'vm']) {
  assert.equal(
    offerSchema.parse({ ...offer, brand: 'Abastible', weight_kg: 15, variant }).variant,
    variant,
  );
}
for (const privateField of [
  'delivery_address',
  'notes',
  'customer_id',
  'delivery_location',
  'rut',
]) {
  assert.equal(offerSchema.safeParse({ ...offer, [privateField]: 'private' }).success, false);
}
for (const invalid of [
  { quantity: 0 },
  { total_clp: 1.5 },
  { total_clp: -1 },
  { commune_code: '1310' },
  { exchange_empty: null },
  { expires_at: 'tomorrow' },
]) {
  assert.equal(offerSchema.safeParse({ ...offer, ...invalid }).success, false);
}
assert.equal(
  assignedOrderSchema.safeParse({
    ...summary,
    status: 'accepted',
    delivery_address: 'Calle privada 123',
    notes: null,
  }).success,
  true,
);
assert.equal(
  assignedOrderSchema.safeParse({
    ...summary,
    status: 'offered',
    delivery_address: 'Calle privada 123',
    notes: null,
  }).success,
  false,
);
assert.equal(assignedOrderSchema.safeParse(summary).success, false);
assert.equal(
  settingsSchema.safeParse({ is_available: true, commune_codes: ['13101'] }).success,
  true,
);
assert.equal(
  settingsSchema.safeParse({ is_available: 'true', commune_codes: ['Santiago'] }).success,
  false,
);
assert.match(driverError({ code: 'GW001' }), /ya fue tomado por otro repartidor/);
assert.match(driverError({ code: 'GW002' }), /venció/);
assert.match(driverError(new Error('network')), /pedido asignado/);
// Exercise real query configuration with native lifecycle/navigation boundaries mocked.
const appState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
let focused = true;
const hooks = load('apps/mobile/src/features/driver/offer-data.ts', {
  react: { useEffect() {}, useState: (value) => [value, () => {}] },
  'react-native': { AppState: appState },
  'expo-router/react-navigation': { useIsFocused: () => focused },
  '@tanstack/react-query': { useQuery: (options) => options },
  '@/features/auth/auth-provider': {
    useAuth: () => ({ session: { user: { id: summary.order_id } }, zone: 'driver' }),
  },
  '@/shared/supabase/client': {
    getSupabase() {
      throw new Error('No network allowed');
    },
  },
  '@/features/driver/offer-contracts': { offerSchema, assignedOrderSchema, settingsSchema },
});
for (const [screenFocused, state, expected] of [
  [true, 'active', true],
  [false, 'active', false],
  [true, 'background', false],
  [true, 'inactive', false],
]) {
  focused = screenFocused;
  appState.currentState = state;
  const { offers } = hooks.useDriverOffers();
  assert.equal(offers.enabled, expected);
  assert.equal(offers.refetchInterval, expected ? 5000 : false);
  assert.equal(hooks.useAssignedOrder().enabled, expected);
}
focused = true;
appState.currentState = 'active';
assert.equal(hooks.useAssignedOrder('invalid-order-id').enabled, false);
console.log(
  'PASS: driver privacy boundary, assigned details, settings, result messages and foreground-only polling',
);
