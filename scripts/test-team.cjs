const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(filename, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module,
      exports: module.exports,
      Set,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
    },
    { filename },
  );
  return module.exports;
}
async function main() {
  const contracts = load('apps/mobile/src/features/business/team-contracts.ts');
  const csv = load('apps/mobile/src/features/business/team-import.ts', {
    '@/features/business/team-contracts': contracts,
  });
  const entries = csv.invitationImportEntries(
    csv.parseInvitationCsv(
      '\uFEFFnombre;correo\r\n"Persona, Uno"; UNO@example.com\r\n"Persona ""Dos""";dos@example.com\r\n',
    ),
  );
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'Persona, Uno');
  assert.equal(entries[0].email, 'uno@example.com');
  assert.equal(entries[1].name, 'Persona "Dos"');
  assert.throws(
    () => csv.parseInvitationCsv('nombre,correo\n"Nombre sin cerrar,a@example.com'),
    /comillas/,
  );
  assert.throws(() => csv.parseInvitationCsv('email,name\na@example.com,Nombre'), /columnas/);
  assert.throws(() => csv.parseInvitationCsv('x'.repeat(100001)), /100 KB/);
  assert.throws(
    () =>
      csv.invitationImportEntries(
        csv.parseInvitationCsv('nombre,correo\nUno,a@example.com\nDos,A@example.com'),
      ),
    /Corrige/,
  );
  assert.throws(
    () =>
      csv.invitationImportEntries(
        csv.parseInvitationCsv('nombre,correo\nUno,bad\nDos,dos@example.com,extra'),
      ),
    /Corrige/,
  );
  const fifty =
    'nombre,correo\n' +
    Array.from({ length: 50 }, (_, n) => `Conductor ${n},conductor${n}@example.com`).join('\n');
  assert.equal(csv.invitationImportEntries(csv.parseInvitationCsv(fifty)).length, 50);
  assert.throws(
    () =>
      csv.parseInvitationCsv(
        'nombre,correo\n' +
          Array.from({ length: 101 }, (_, n) => `Conductor ${n},a${n}@example.com`).join('\n'),
      ),
    /100 personas/,
  );
  const calls = [];
  let response = { data: [{ id: null, email: 'uno@example.com', result: 'new' }], error: null };
  const api = load('apps/mobile/src/features/business/team-data.ts', {
    '@/features/business/team-contracts': contracts,
    '@/shared/supabase/client': {
      getSupabase: () => ({
        rpc: async (...args) => {
          calls.push(args);
          return response;
        },
      }),
    },
  });
  const businessId = '10000000-0000-4000-8000-000000000001';
  await api.createDriverInvitations(businessId, entries, true);
  assert.equal(calls[0][1].p_preview, true);
  assert.equal(calls[0][1].p_entries[0].email, 'uno@example.com');
  response = { data: { items: [], has_more: false }, error: null };
  await api.fetchDriverTeam(businessId, 40, 'Conductor');
  assert.equal(calls.at(-1)[1].p_offset, 40);
  response = { data: null, error: new Error('offline') };
  await assert.rejects(api.cancelDriverInvitation(businessId), /offline/);
  console.log(
    'PASS CSV quoting/BOM/delimiters, line validation, duplicate prevention, 50-row import and scoped RPC contracts',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
