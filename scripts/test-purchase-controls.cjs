// Structural/interaction regression checks only; no native rendering or network.
const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const native = {
  View: 'View',
  StyleSheet: { create: (value) => value },
  Platform: { select: (value) => value.default ?? value.web },
};
const { theme } = load('apps/mobile/src/theme/index.ts', { 'react-native': native });
const ui = load('apps/mobile/src/shared/ui/components.tsx', {
  'react-native': native,
  '@/theme': { theme },
  './text': { Text: 'Text' },
  './pulse-pressable': { PulsePressable: 'Pressable' },
  './icon': { Icon: 'Icon' },
  './gasway-logo': { GaswayLogo: 'Logo' },
});
const nodes = (value) =>
  !value || typeof value !== 'object'
    ? []
    : Array.isArray(value)
      ? value.flatMap(nodes)
      : [value, ...nodes(value.props?.children)];
let changed;
const controls = (value, disabled = false) =>
  nodes(
    ui.Stepper({
      value,
      disabled,
      onChange: (next) => {
        changed = next;
      },
    }),
  ).filter((node) => node.type === ui.Button);
assert.equal(
  ui.ui.stepSide.width,
  theme.layout.touchTarget,
  'Counter sides must have bounded widths inside rows',
);
assert.equal(
  ui.ui.stepControl.width,
  theme.layout.touchTarget,
  'Full-width button defaults must be overridden',
);
assert.equal(
  ui.ui.stepControl.paddingHorizontal,
  0,
  'Glyphs need usable space at the fixed touch width',
);
assert.equal(controls(1)[0].props.disabled, true);
assert.equal(controls(1)[1].props.disabled, false);
assert.equal(controls(99)[1].props.disabled, true);
controls(7)[0].props.onPress();
assert.equal(changed, 6);
controls(7)[1].props.onPress();
assert.equal(changed, 8);
assert.ok(controls(7, true).every((node) => node.props.disabled));

const delivery = load('apps/mobile/src/shared/orders/delivery-options.ts');
const { DeliveryOptionCard } = load(
  'apps/mobile/src/features/orders/customer/delivery-option-card.tsx',
  {
    'react-native': native,
    '@/theme': { theme },
    '@/shared/orders/delivery-options': delivery,
    '@/shared/ui/components': { Button: 'Button' },
    '@/shared/ui/product-image': { ProductImage: 'ProductImage' },
    '@/shared/ui/icon': { Icon: 'Icon' },
    '@/shared/ui/pulse-pressable': { PulsePressable: 'Pressable' },
    '@/shared/ui/text': { Text: 'Text' },
  },
);
const product = { brand: 'Lipigas', weight_kg: 11, variant: 'standard' };
const option = {
  name: 'Distribuidora de prueba',
  total_clp: 15990,
  stock: 20,
  has_coverage: true,
  has_available_driver: true,
  service: { schedule: null, eta_min: null, eta_max: null },
};
const card = (changes = {}) =>
  nodes(
    DeliveryOptionCard({
      option: { ...option, ...changes },
      product,
      quantity: 1,
      exchangeEmpty: true,
      onSelect() {},
      onDetails() {},
    }),
  );
assert.equal(card().find((node) => node.type === 'Button').props.disabled, false);
assert.ok(card().some((node) => node.type === 'ProductImage' && node.props.product === product));
for (const changes of [
  { total_clp: null },
  { has_coverage: false },
  { has_available_driver: false },
  { service: { ...option.service, schedule: [] } },
]) {
  assert.equal(
    card(changes).find((node) => node.type === 'Button').props.disabled,
    true,
    'Visual restyling must preserve every purchase block',
  );
}
console.log(
  'PASS: bounded quantity controls, 1–99 limits, exact product image and server-backed purchase availability gates',
);
