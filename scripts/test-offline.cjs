const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const suites = fs
  .readdirSync(__dirname)
  .filter((file) => /^test-.*\.cjs$/.test(file) && file !== path.basename(__filename))
  .sort();
if (suites.length === 0) throw new Error('No offline suites found');
const result = spawnSync(
  process.execPath,
  [
    '--enable-source-maps',
    '--require',
    './scripts/testing/offline.cjs',
    '--test',
    '--test-concurrency=1',
    ...suites.map((file) => `scripts/${file}`),
  ],
  { cwd: root, stdio: 'inherit', timeout: 120_000 },
);
if (result.error) throw result.error;
const powershell = spawnSync(
  'pwsh',
  ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', 'scripts/test-reset-auth-password.ps1'],
  { cwd: root, stdio: 'inherit', timeout: 30_000 },
);
if (powershell.error) throw powershell.error;
process.exitCode = result.status === 0 && powershell.status === 0 ? 0 : 1;
