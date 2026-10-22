const fs = require('node:fs');
const path = require('node:path');
const environment = require('../../supabase/test-environment.json');
const suites = require('../../supabase/tests/suites.json');
const root = path.resolve(__dirname, '../..');

function targetProject(ref) {
  if (
    !ref ||
    !/^[a-z]{20}$/.test(ref) ||
    ref !== environment.projectRef ||
    environment.protectedProjectRefs.includes(ref)
  ) {
    throw new Error('GASWAY_TEST_PROJECT_REF must identify the dedicated Gasway Test project');
  }
  return ref;
}

function currentSuites(requested) {
  const classified = [...suites.current, ...Object.keys(suites.historical)];
  const actual = fs
    .readdirSync(path.join(root, 'supabase/tests'))
    .filter((file) => file.endsWith('.sql'));
  if (
    new Set(classified).size !== classified.length ||
    actual.length !== classified.length ||
    actual.some((file) => !classified.includes(file)) ||
    classified.some((file) => !/^[a-z_]+\.sql$/.test(file) || !actual.includes(file))
  ) {
    throw new Error('Every SQL suite must be classified exactly once');
  }
  if (requested !== undefined) {
    if (!suites.current.includes(requested)) throw new Error('Only current SQL suites can run');
    return [requested];
  }
  return suites.current;
}

module.exports = { currentSuites, targetProject };
