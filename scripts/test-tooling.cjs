const assert = require('node:assert/strict');
require('./testing/offline.cjs');
const { currentSuites, targetProject } = require('./testing/sql-suites.cjs');
const environment = require('../supabase/test-environment.json');
const suites = require('../supabase/tests/suites.json');
assert.equal(targetProject(environment.projectRef), environment.projectRef);
for (const ref of [
  undefined,
  '',
  ...environment.protectedProjectRefs,
  'a'.repeat(20),
  '../target',
]) {
  assert.throws(() => targetProject(ref), /dedicated Gasway Test/);
}
assert.deepEqual(currentSuites(), [
  'document_eligibility.sql',
  'driver_self_documentation.sql',
  'document_replacement.sql',
  'abastible_cylinder_variants.sql',
  'business_onboarding.sql',
  'business_driver_invitations.sql',
  'distributor_discovery.sql',
  'distributor_owned_coverage.sql',
  'driver_order_progress.sql',
  'driver_workspace.sql',
  'pilot_security.sql',
  'mapped_delivery_point.sql',
  'order_tracking.sql',
  'distributor_workspace.sql',
]);
assert.deepEqual(currentSuites('driver_workspace.sql'), ['driver_workspace.sql']);
for (const file of ['driver_offers.sql', '../seed.sql', 'absent.sql', '']) {
  assert.throws(() => currentSuites(file), /Only current/);
}
assert.equal(
  currentSuites().some((file) => Object.hasOwn(suites.historical, file)),
  false,
);
try {
  suites.current.push(suites.current[0]);
  assert.throws(() => currentSuites(), /exactly once/);
} finally {
  suites.current.pop();
}
assert.throws(() => fetch('https://example.invalid'), /Network access is forbidden/);
assert.throws(
  () => require('node:net').connect(443, 'example.invalid'),
  /Network access is forbidden/,
);
console.log(
  'PASS: SQL allowlist, complete classification, production target refusal and offline network guard',
);
