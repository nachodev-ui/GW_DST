const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { targetProject } = require('./testing/sql-suites.cjs');

const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
const root = path.resolve(__dirname, '..');
const cli = require.resolve('supabase/dist/supabase.js');
for (const args of [
  ['migration', 'up', '--linked', '--project-ref', ref],
  ['db', 'query', '--linked', '--project-ref', ref, '--file', 'supabase/seed.sql'],
  [
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--file',
    'supabase/testing/mark-test-environment.sql',
  ],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: 'inherit',
    timeout: 300_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
