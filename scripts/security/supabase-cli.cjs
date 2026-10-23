const { execFileSync } = require('node:child_process');

function cliJson(args) {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [require.resolve('supabase/dist/supabase.js'), ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 90_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
    );
  } catch {
    // api-keys stdout is privileged. Never propagate subprocess output or error objects.
    throw new Error('Local Supabase CLI failed; no credentials or CLI output were logged');
  }
}

module.exports = { cliJson };
