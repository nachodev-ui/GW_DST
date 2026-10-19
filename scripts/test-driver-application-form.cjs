// Form state/consent checks with mocked hooks; no rendering or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(filename, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
    },
    { filename },
  );
  return module.exports;
}
async function main() {
  const rut = load('apps/mobile/src/shared/validation/rut.ts');
  for (const value of ['12345678-5', '6000000-K', '10000004-0'])
    assert.equal(rut.isValidRut(value), true);
  for (const value of ['12345678-9', '00000000-0', '123-K'])
    assert.equal(rut.isValidRut(value), false);
  const form = load('apps/mobile/src/features/auth/driver-application-form.ts', {
    '@/shared/validation/rut': rut,
  });
  const id = '10000000-0000-4000-8000-000000000001';
  const values = {
    name: ' Conductor ',
    rut: '12.345.678-5',
    phone: '9 1234 5678',
    invitation_id: id,
  };
  assert.equal(form.applicationFormSchema.parse(values).phone, '+56912345678');
  for (const changed of [
    { name: '' },
    { rut: '12345678-9' },
    { phone: '123' },
    { invitation_id: '' },
  ])
    assert.equal(form.applicationFormSchema.safeParse({ ...values, ...changed }).success, false);
  let state = null;
  let app = null;
  let accepted = null;
  let inbox = [
    {
      id,
      name: 'Conductor',
      distributor_id: id,
      distributor_name: 'Negocio',
      expires_at: '2026-11-01T00:00:00Z',
    },
  ];
  const sent = [],
    invalidated = [],
    navigation = [];
  let mutationOptions;
  const { DriverApplicationScreen } = load(
    'apps/mobile/src/features/auth/driver-application-screen.tsx',
    {
      react: {
        useState: () => [
          state,
          (value) => {
            state = value;
          },
        ],
      },
      'expo-router': { router: { replace: (path) => navigation.push(path) } },
      'react-hook-form': {
        Controller: 'Controller',
        useForm: () => ({
          control: {},
          setFocus: () => {},
          formState: { errors: {} },
          handleSubmit: (fn) => () => fn(values),
        }),
      },
      '@hookform/resolvers/zod': { zodResolver: () => null },
      '@tanstack/react-query': {
        useQuery: ({ queryKey }) => ({
          data:
            queryKey[0] === 'driver-application'
              ? app
              : queryKey[0] === 'driver-invitation'
                ? accepted
                : inbox,
          isPending: false,
          isError: false,
          isFetching: false,
        }),
        useQueryClient: () => ({
          invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey[0]),
        }),
        useMutation: (options) => {
          mutationOptions = options;
          return {
            isPending: false,
            isError: false,
            mutate: (value) => sent.push(value),
            reset: () => {},
          };
        },
      },
      '@/features/auth/auth-provider': {
        useAuth: () => ({ session: { user: { id, email: 'driver@example.com' } } }),
      },
      '@/features/auth/driver-application-form': form,
      '@/features/auth/driver-application': {
        acceptDriverInvitation: (value) => value,
        submitDriverApplication: (value, reapply) => ({ value, reapply }),
      },
      '@/shared/ui/components': {
        Button: 'Button',
        Card: 'Card',
        Feedback: 'Feedback',
        Input: 'Input',
      },
      '@/shared/ui/screen': { Screen: 'Screen' },
      '@/shared/ui/skeleton': { Skeleton: 'Skeleton' },
      '@/shared/ui/text': { Text: 'Text' },
    },
  );
  const nodes = (value) =>
    !value || typeof value !== 'object'
      ? []
      : Array.isArray(value)
        ? value.flatMap(nodes)
        : [value, ...nodes(value.props?.children)];
  const button = (tree, label) =>
    nodes(tree).find((node) => node.type === 'Button' && node.props.label === label);
  button(DriverApplicationScreen(), 'Revisar invitación').props.onPress();
  assert.equal(sent.length, 0);
  button(DriverApplicationScreen(), 'Confirmar aceptación').props.onPress();
  assert.equal(sent[0], id);
  inbox = [];
  assert.equal(button(DriverApplicationScreen(), 'Confirmar aceptación'), undefined);
  accepted = { id, distributor_name: 'Negocio', name: 'Conductor', business_enabled: true };
  app = {
    status: 'rejected',
    invitation_id: '10000000-0000-4000-8000-000000000002',
    decision_reason: 'Corregir',
  };
  state = false;
  function fields() {
    const component = DriverApplicationScreen();
    return component.type(component.props);
  }
  button(fields(), 'Revisar antecedentes corregidos').props.onPress();
  assert.equal(sent.length, 1);
  assert.equal(state, true);
  button(fields(), 'Enviar a revisión de Gasway').props.onPress();
  assert.equal(mutationOptions.mutationFn(sent[1]).reapply, true);
  await mutationOptions.onSuccess();
  assert.equal(navigation.at(-1), '/customer/account');
  assert.ok(invalidated.includes('auth-access'));
  app = { ...app, invitation_id: id };
  assert.equal(typeof DriverApplicationScreen().type, 'string'); // Same rejected invitation cannot reopen the form.
  console.log(
    'PASS verified invitation entry, explicit acceptance, private form validation and renewed consent after rejection',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
