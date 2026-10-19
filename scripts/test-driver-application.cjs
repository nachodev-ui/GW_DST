// Contract, network and interaction assertions. No app rendering or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(filename, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      Intl,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
    },
    { filename },
  );
  return module.exports;
}

async function main() {
  let response = { data: null, error: null };
  const calls = [];
  const client = {
    from: (name) => {
      calls.push(['from', name]);
      return client;
    },
    select: (columns) => {
      calls.push(['select', columns]);
      return client;
    },
    eq: (column, id) => {
      calls.push(['eq', column, id]);
      return client;
    },
    maybeSingle: async () => response,
    rpc: async (...args) => {
      calls.push(['rpc', ...args]);
      return { error: null };
    },
  };
  const contracts = load('apps/mobile/src/features/auth/driver-application.ts', {
    '@/shared/supabase/client': { getSupabase: () => client },
    '@/features/auth/driver-application-form': load(
      'apps/mobile/src/features/auth/driver-application-form.ts',
      {
        '@/shared/validation/rut': load('apps/mobile/src/shared/validation/rut.ts', {}),
      },
    ),
  });
  const pending = {
    status: 'pending',
    decision_reason: null,
    requested_at: '2026-10-18T20:00:00+00:00',
    reviewed_at: null,
    applicant_name: null,
    applicant_rut: null,
    applicant_phone: null,
    requested_distributor_id: null,
    requested_distributor_name: null,
    invitation_id: null,
  };
  const rejected = {
    ...pending,
    status: 'rejected',
    decision_reason: 'Antecedentes incompletos',
    reviewed_at: '2026-10-18T20:10:00Z',
  };
  assert.equal(contracts.driverApplicationSchema.safeParse(pending).success, true);
  assert.equal(contracts.driverApplicationSchema.safeParse(rejected).success, true);
  assert.equal(
    contracts.driverApplicationSchema.safeParse({ ...pending, status: 'approved' }).success,
    true,
  );
  for (const invalid of [
    { ...rejected, reviewed_at: null },
    { ...rejected, decision_reason: '' },
    { ...pending, decision_reason: 'No debe existir' },
    { ...pending, requested_at: 'ayer' },
    { ...pending, status: 'admin' },
    { ...pending, operator_reference: 'private' },
  ])
    assert.equal(contracts.driverApplicationSchema.safeParse(invalid).success, false);
  assert.equal(await contracts.fetchDriverApplication('current-user'), null);
  response = { data: rejected, error: null };
  assert.equal((await contracts.fetchDriverApplication('current-user')).status, 'rejected');
  assert.ok(
    calls.some((call) => call[0] === 'eq' && call[1] === 'driver_id' && call[2] === 'current-user'),
  );
  response = { data: null, error: new Error('offline') };
  await assert.rejects(contracts.fetchDriverApplication('current-user'), /offline/);
  const formValues = {
    name: ' Postulante de prueba ',
    rut: '12.345.678-5',
    phone: '9 1234 5678',
    invitation_id: '10000000-0000-4000-8000-000000000001',
  };
  await contracts.submitDriverApplication(formValues, false);
  await contracts.submitDriverApplication(formValues, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.filter((call) => call[0] === 'rpc'))), [
    [
      'rpc',
      'submit_invited_driver_application',
      {
        p_name: 'Postulante de prueba',
        p_rut: '12345678-5',
        p_phone: '+56912345678',
        p_invitation_id: formValues.invitation_id,
        p_reapply: false,
      },
    ],
    [
      'rpc',
      'submit_invited_driver_application',
      {
        p_name: 'Postulante de prueba',
        p_rut: '12345678-5',
        p_phone: '+56912345678',
        p_invitation_id: formValues.invitation_id,
        p_reapply: true,
      },
    ],
  ]);
  assert.match(contracts.driverApplicationError({ code: '55000' }), /Actualiza/);

  // Evaluate the component as a function with mocked hooks, without rendering UI.
  let query = { data: rejected, isPending: false, isError: false, isFetching: false };
  const navigations = [];
  let queryOptions;
  const invalidated = [];
  const { DriverApplicationCard } = load(
    'apps/mobile/src/features/auth/driver-application-card.tsx',
    {
      'expo-router': { router: { push: (path) => navigations.push(path) } },
      'react-native': { StyleSheet: { create: (value) => value }, View: 'View' },
      '@tanstack/react-query': {
        useQuery: (options) => {
          queryOptions = options;
          return query;
        },
        useQueryClient: () => ({
          invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey[0]),
        }),
      },
      '@/features/auth/auth-provider': {
        useAuth: () => ({ session: { user: { id: 'current-user' } } }),
      },
      '@/features/auth/driver-application': contracts,
      '@/shared/ui/components': { Button: 'Button', Card: 'Card', Feedback: 'Feedback' },
      '@/shared/ui/skeleton': { Skeleton: 'Skeleton' },
      '@/shared/ui/text': { Text: 'Text' },
      '@/theme': {
        theme: {
          borders: { accent: 4 },
          colors: { primary: 'brand', textMuted: 'muted' },
          spacing: { md: 16, xs: 4 },
        },
      },
    },
  );
  function nodes(value) {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    return [value, ...nodes(value.props?.children)];
  }
  const button = (tree, label) =>
    nodes(tree).find((node) => node.type === 'Button' && node.props.label === label);
  let tree = DriverApplicationCard();
  assert.equal(queryOptions.queryKey[1], 'current-user');
  assert.equal(queryOptions.refetchInterval, 30_000);
  assert.ok(nodes(tree).some((node) => node.props?.children === rejected.decision_reason));
  assert.equal(button(tree, 'Confirmar nueva solicitud'), undefined);
  button(tree, 'Activar mi acceso como conductor').props.onPress();
  assert.deepEqual(navigations, ['/customer/driver-application']);
  query = { ...query, data: pending };
  assert.equal(button(DriverApplicationCard(), 'Volver a postular'), undefined);
  assert.ok(button(DriverApplicationCard(), 'Activar mi acceso como conductor'));
  query = { ...query, data: { ...pending, applicant_name: 'Postulante' } };
  assert.equal(button(DriverApplicationCard(), 'Completar mi postulación'), undefined);
  query = { ...query, data: { ...pending, status: 'approved' } };
  assert.equal(button(DriverApplicationCard(), 'Volver a postular'), undefined);
  query = { ...query, data: null };
  button(DriverApplicationCard(), 'Activar mi acceso como conductor').props.onPress();
  assert.equal(navigations.length, 2);
  query = { ...query, isError: true };
  tree = DriverApplicationCard();
  assert.equal(button(tree, 'Activar mi acceso como conductor'), undefined);
  assert.ok(nodes(tree).some((node) => node.props?.text?.includes('Puedes seguir comprando')));
  assert.ok(button(tree, 'Reintentar consulta'));
  console.log(
    'PASS: application validation, scoped query, payload normalization, errors and form navigation',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
