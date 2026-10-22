// Presentation rules and response contracts; no native runtime or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(filename) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) =>
    specifier === '@/shared/orders/contracts'
      ? load('apps/mobile/src/shared/orders/contracts.ts')
      : require(specifier);
  vm.runInNewContext(
    code,
    { module, exports: module.exports, require: localRequire },
    { filename },
  );
  return module.exports;
}
const { businessCoverageSchema, groupCoverage, communeCoverageState } = load(
  'apps/mobile/src/features/business/coverage-contracts.ts',
);
const santiago = { code: '13101', name: 'Santiago' };
const providencia = { code: '13123', name: 'Providencia' };
const driver = (id, status) => ({
  id: `10000000-0000-4000-8000-00000000000${id}`,
  name: `Conductor ${id}`,
  status,
});
const data = businessCoverageSchema.parse({
  business_enabled: true,
  is_open: true,
  revision: 0,
  communes: [santiago, providencia],
  drivers: [
    driver(1, 'available'),
    driver(2, 'offline'),
    driver(3, 'not_enabled'),
    driver(4, 'busy'),
  ],
});
const groups = groupCoverage(data);
assert.equal(groups.length, 2);
assert.equal(groups[0].code, '13123');
for (const commune of groups) {
  assert.equal(communeCoverageState(data, commune).enabled, 3);
  assert.equal(communeCoverageState(data, commune).available, 1);
}
const covered = groups[0];
assert.equal(communeCoverageState({ ...data, is_open: false }, covered).available, 0);
assert.equal(communeCoverageState({ ...data, business_enabled: false }, covered).available, 0);
const unstaffed = { ...data, drivers: [] };
assert.equal(groupCoverage(unstaffed).length, 2, 'business coverage exists without drivers');
assert.equal(communeCoverageState(unstaffed, groupCoverage(unstaffed)[0]).available, 0);
const newTeam = { ...data, drivers: [driver(5, 'available')] };
assert.equal(
  groupCoverage(newTeam)[0].drivers[0].id,
  newTeam.drivers[0].id,
  'new drivers inherit the same business communes',
);
assert.equal(groupCoverage({ ...data, communes: [] }).length, 0);
assert.equal(
  businessCoverageSchema.safeParse({ ...data, communes: [{ code: '999', name: 'Invalid' }] })
    .success,
  false,
);
assert.equal(
  businessCoverageSchema.safeParse({ ...data, drivers: [driver(1, 'approved')] }).success,
  false,
);
assert.equal(businessCoverageSchema.safeParse({ ...data, revision: -1 }).success, false);
console.log(
  'PASS: business-owned coverage without drivers, inheritance, CUT, revision, states and business readiness',
);
