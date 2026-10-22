// Contracts and RPC boundary checks. No app rendering or network.
const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
async function main() {
  const contracts = load('apps/mobile/src/features/business/business-contracts.ts', {
    '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
    '@/shared/validation/rut': load('apps/mobile/src/shared/validation/rut.ts'),
  });
  const userId = 'a30a8236-175c-424d-9bf4-ff753d695649';
  const businessId = '10000000-0000-4000-8000-000000000001';
  const values = {
    name: ' Negocio demo ',
    rut: '76.000.000-0',
    contact_name: ' Responsable demo ',
    phone: '9 0000 0000',
    address: ' Dirección ficticia ',
    commune_code: '13101',
    brands: ['Lipigas'],
    commercial_evidence: 'Referencia ficticia comercial',
    storage_evidence: 'Referencia ficticia recinto',
  };
  const parsed = contracts.businessFormSchema.parse(values);
  assert.equal(parsed.rut, '76000000-0');
  assert.equal(parsed.phone, '+56900000000');
  assert.equal(parsed.name, 'Negocio demo');
  for (const changed of [
    { rut: '76000000-1' },
    { brands: [] },
    { brands: ['Lipigas', 'Lipigas'] },
    { phone: '+12345' },
    { commune_code: 'Santiago' },
    { storage_evidence: '' },
  ]) {
    assert.equal(contracts.businessFormSchema.safeParse({ ...values, ...changed }).success, false);
  }
  const form = { price: '15990', priceWithoutExchange: '49990', stock: '12', is_listed: true };
  assert.equal(contracts.businessProductFormSchema.safeParse(form).success, true);
  assert.equal(
    contracts.businessProductFormSchema.safeParse({
      price: '',
      priceWithoutExchange: '',
      stock: '0',
      is_listed: false,
    }).success,
    true,
  );
  for (const changed of [
    { price: '15.990' },
    { price: '1.5' },
    { price: '-1' },
    { price: '' },
    { price: '2147483648' },
    { stock: '1.5' },
    { stock: '-1' },
    { stock: '' },
    { stock: '1000001' },
  ]) {
    assert.equal(
      contracts.businessProductFormSchema.safeParse({ ...form, ...changed }).success,
      false,
    );
  }
  const calls = [];
  let response = { data: null, error: null };
  const client = {
    from: (table) => {
      calls.push(['from', table]);
      return client;
    },
    select: () => client,
    eq: (field, id) => {
      calls.push(['eq', field, id]);
      return client;
    },
    maybeSingle: async () => response,
    rpc: async (name, args) => {
      calls.push([name, args]);
      return response;
    },
  };
  const data = load('apps/mobile/src/features/business/business-data.ts', {
    '@tanstack/react-query': { useQuery: () => null },
    '@/features/auth/auth-provider': {},
    '@/shared/supabase/client': { getSupabase: () => client },
    '@/shared/orders/contracts': load('apps/mobile/src/shared/orders/contracts.ts'),
    './business-contracts': contracts,
    '@/features/business/business-contracts': contracts,
  });
  assert.equal(await data.fetchBusinessApplication(userId), null);
  assert.ok(
    calls.some((call) => call[0] === 'eq' && call[1] === 'applicant_id' && call[2] === userId),
  );
  await data.submitBusinessApplication(values, false);
  const submitted = calls.find((call) => call[0] === 'submit_distributor_application')[1];
  assert.equal(submitted.p_rut, '76000000-0');
  assert.equal(submitted.p_reapply, false);
  assert.equal('p_is_demo' in submitted, false);
  assert.equal('p_applicant_id' in submitted, false);
  const product = {
    product_id: userId,
    brand: 'Lipigas',
    weight_kg: 11,
    variant: 'standard',
    unit_price_clp: null,
    price_without_exchange_clp: null,
    stock: 0,
    is_listed: false,
    revision: 0,
  };
  await data.saveBusinessProduct(businessId, product, form);
  const saved = calls.find((call) => call[0] === 'set_business_offer')[1];
  assert.equal(saved.p_unit_price_clp, 15990);
  assert.equal(saved.p_price_without_exchange_clp, 49990);
  assert.equal(saved.p_stock, 12);
  assert.equal(saved.p_revision, 0);
  const timestamp = '2026-10-18T21:00:00.123456+00:00';
  await data.confirmBusinessAffiliation({
    driver_id: userId,
    name: 'Repartidor',
    requested_at: timestamp,
    distributor_id: businessId,
    affiliation_confirmed: false,
  });
  assert.equal(calls.at(-1)[1].p_requested_at, timestamp);
  assert.equal('p_distributor_id' in calls.at(-1)[1], false);
  response = { data: [{ ...product, revision: -1 }], error: null };
  await assert.rejects(data.fetchBusinessProducts(businessId));
  response = { data: null, error: new Error('offline') };
  await assert.rejects(data.saveBusinessProduct(businessId, product, form), /offline/);
  assert.match(contracts.businessError({ code: '40001' }), /Otra persona/);
  console.log(
    'PASS business contracts, own application, commercial validation, RPC permissions and exact affiliation version',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
