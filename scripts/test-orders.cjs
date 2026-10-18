// Local domain/form assertions: no network, database or native runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(source) {
  const filename = path.join(__dirname, '..', source);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require, Intl }, { filename });
  return module.exports;
}
const { createOrderFormSchema } = load('apps/mobile/src/features/orders/customer/order-form.ts');
const { canCancel, formatClp, productSchema } = load('apps/mobile/src/shared/orders/contracts.ts');
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
const product = { id: form.productId, brand: 'Gasco', weight_kg: 11, unit_price_clp: null };
assert.equal(productSchema.safeParse(product).success, true);
assert.equal(productSchema.safeParse({ ...product, unit_price_clp: 0 }).success, true);
assert.equal(productSchema.safeParse({ ...product, unit_price_clp: 1.5 }).success, false);
assert.equal(productSchema.safeParse({ ...product, unit_price_clp: -1 }).success, false);
console.log(
  'PASS: order form, official catalogue membership, integer quantity/CLP, explicit exchange and cancellation visibility',
);
