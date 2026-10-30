// Explicit partial Auth deployment. Never sync the development config to cloud.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { parseArgs } = require('node:util');

const allowedPaths = new Set([
  'auth.minimum_password_length',
  'auth.password_requirements',
  'auth.rate_limit.sign_in_sign_ups',
  'auth.rate_limit.token_verifications',
  'auth.email.max_frequency',
  'auth.email.otp_length',
]);

function cli(args) {
  try {
    return execFileSync(process.execPath, [require.resolve('supabase/dist/supabase.js'), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90_000,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch {
    throw new Error('Auth configuration CLI failed; subprocess output suppressed');
  }
}

function inspect(ref) {
  const workdir = path.resolve(__dirname, '../../supabase/ops/auth-hardening');
  const args = ['--project-ref', ref, '--workdir', workdir, '--output-format', 'json'];
  const diff = JSON.parse(cli(['config', 'diff', ...args]));
  if (diff.schema_version !== 1 || diff.target?.project_ref !== ref || !Array.isArray(diff.changes))
    throw new Error('Unexpected configuration diff');
  const changes = diff.changes.filter((change) => change.declared);
  if (changes.some((change) => !allowedPaths.has(change.path.join('.'))))
    throw new Error('Overlay contains changes outside the Auth hardening scope');
  return { args, changes };
}

function main() {
  if (process.env.CI) throw new Error('Administrative configuration is local only');
  const { values } = parseArgs({
    options: { 'project-ref': { type: 'string' }, apply: { type: 'boolean', default: false } },
    allowPositionals: false,
  });
  const ref = values['project-ref'];
  if (!['xnrueexpwzvxotgwmamj', 'gleltbrvpfvfgggcatpt'].includes(ref))
    throw new Error('Explicit Gasway project required');
  const { args, changes } = inspect(ref);
  console.log(JSON.stringify({ project: ref, apply: values.apply, changes }));
  if (!values.apply || changes.length === 0) return;
  cli(['config', 'push', ...args, '--yes']);
  if (inspect(ref).changes.length) throw new Error('Auth configuration still differs after push');
  console.log('PASS: declared Auth hardening fields match cloud; unrelated fields untouched');
}

try {
  main();
} catch {
  console.error('Auth configuration failed; credentials and CLI output suppressed');
  process.exitCode = 1;
}
