// Pure contracts and business rules. No native runtime, rendering or network.
const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const {
  serviceStatus,
  serviceSettingsSchema,
  sortDeliveryOptions,
  distributorContactUrl,
  deliveryOptionSchema,
  deliveryAvailability,
} = load('apps/mobile/src/shared/orders/delivery-options.ts');
const { formatClp } = load('apps/mobile/src/shared/orders/contracts.ts');
const settings = { whatsapp: null, schedule: null, eta_min: null, eta_max: null, revision: 0 };
assert.equal(serviceStatus(null).open, null);
assert.equal(serviceStatus([]).open, false);
// January is UTC-3; July UTC-4. Both are Monday 09:00 in Santiago.
const monday = [{ day: 1, open: '09:00', close: '18:00' }];
assert.equal(serviceStatus(monday, new Date('2026-01-05T12:00:00Z')).open, true);
assert.equal(serviceStatus(monday, new Date('2026-07-06T13:00:00Z')).open, true);
assert.equal(serviceStatus(monday, new Date('2026-01-05T21:00:00Z')).open, false);
const overnight = [{ day: 1, open: '22:00', close: '02:00' }];
assert.equal(serviceStatus(overnight, new Date('2026-01-06T04:00:00Z')).open, true);
assert.equal(serviceStatus(overnight, new Date('2026-01-06T05:00:00Z')).open, false);
assert.equal(
  serviceStatus([{ day: 6, open: '22:00', close: '02:00' }], new Date('2026-01-04T04:00:00Z')).open,
  true,
);
assert.equal(
  serviceStatus(monday, new Date('2026-01-05T11:59:00Z')).label,
  'Cerrado · abre hoy a las 09:00',
);
assert.equal(
  serviceSettingsSchema.safeParse({ ...settings, schedule: [...monday, ...monday] }).success,
  false,
);
assert.equal(
  serviceSettingsSchema.safeParse({
    ...settings,
    schedule: [{ day: 1, open: '09:00', close: '09:00' }],
  }).success,
  false,
);
assert.equal(
  serviceSettingsSchema.safeParse({ ...settings, eta_min: 45, eta_max: 30 }).success,
  false,
);
assert.equal(
  serviceSettingsSchema.safeParse({ ...settings, whatsapp: '56912345678' }).success,
  true,
);
assert.equal(
  serviceSettingsSchema.safeParse({ ...settings, whatsapp: '+56912345678' }).success,
  false,
);
const base = {
  id: '10000000-0000-4000-8000-000000000001',
  request_id: '10000000-0000-4000-8000-000000000009',
  name: 'Gas de prueba',
  is_demo: true,
  brands: ['Gasco'],
  unit_price_clp: 21990,
  price_without_exchange_clp: null,
  total_clp: 43980,
  stock: 5,
  has_coverage: true,
  has_available_driver: true,
  updated_at: '2026-01-05T12:00:00Z',
  service: { ...settings, schedule: monday },
};
assert.equal(deliveryOptionSchema.safeParse(base).success, true);
const closed = {
  ...base,
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Cerrado barato',
  total_clp: 1,
  service: { ...settings, schedule: [] },
};
const slow = {
  ...base,
  id: '10000000-0000-4000-8000-000000000003',
  name: 'Sin conductor',
  has_available_driver: false,
};
const now = new Date('2026-01-05T12:00:00Z');
assert.equal(deliveryAvailability(base, now).canOrder, true);
assert.equal(deliveryAvailability(closed, now).canOrder, false);
assert.equal(deliveryAvailability(slow, now).canOrder, false);
assert.equal(deliveryAvailability({ ...base, has_coverage: false }, now).canOrder, false);
assert.equal(deliveryAvailability({ ...base, total_clp: null }, now).canOrder, false);
assert.equal(deliveryOptionSchema.safeParse({ ...base, stock: 0 }).success, false);
assert.equal(deliveryOptionSchema.safeParse({ ...base, has_coverage: undefined }).success, false);
assert.equal(
  sortDeliveryOptions(
    [{ ...base, id: slow.id, has_coverage: false, total_clp: 1 }, base],
    'recommended',
    now,
  )[0].id,
  base.id,
);
assert.equal(sortDeliveryOptions([closed, slow, base], 'recommended', now)[0].id, base.id);
assert.equal(sortDeliveryOptions([closed, base], 'price', now)[0].id, base.id);
const cheap = { ...base, total_clp: 39980, name: 'Menor precio' };
assert.equal(sortDeliveryOptions([base, cheap], 'price', now)[0].name, cheap.name);
assert.equal(
  sortDeliveryOptions(
    [
      { ...base, service: { ...base.service, eta_min: 45, eta_max: 60 } },
      { ...cheap, service: { ...cheap.service, eta_min: 15, eta_max: 30 } },
    ],
    'fastest',
    now,
  )[0].name,
  cheap.name,
);
assert.equal(
  sortDeliveryOptions([{ ...base, total_clp: null }, cheap], 'price', now)[0].name,
  cheap.name,
);
assert.equal(formatClp(43980).replace(/\s/g, ''), '$43.980');
const url = distributorContactUrl('56912345678', 'Gas Ñuñoa & hogar');
const parsed = new URL(url);
assert.equal(parsed.origin, 'https://wa.me');
assert.equal(parsed.pathname, '/56912345678');
assert.match(parsed.searchParams.get('text'), /Ñuñoa & hogar/);
assert.doesNotMatch(parsed.searchParams.get('text'), /Prueba 123|quiero pedir|confirmo/);
assert.equal(distributorContactUrl(null, 'No publicado'), null);
assert.equal(distributorContactUrl('javascript:alert(1)', 'Malicioso'), null);
assert.equal(distributorContactUrl('56212345678', 'Teléfono fijo'), null);
console.log(
  'PASS: Santiago summer/winter/overnight/week boundary, schedules, ranking, CLP, safe opt-in WhatsApp consultation',
);
