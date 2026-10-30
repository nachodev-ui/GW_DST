const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { currentSuites, targetProject } = require('./testing/sql-suites.cjs');
const { queryCloud } = require('./testing/cloud-query.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => arg !== '--list' && !arg.startsWith('--suite='))) {
    throw new Error('Use --list or --suite=<current.sql>');
  }
  const requested = args.find((arg) => arg.startsWith('--suite='))?.slice('--suite='.length);
  const files = currentSuites(requested);
  if (process.argv.includes('--list')) {
    console.log(files.join('\n'));
  } else {
    const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
    const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
    if (process.env.CI && !token)
      throw new Error('CI requires SUPABASE_ACCESS_TOKEN for HTTPS SQL tests');
    console.log(
      `SQL transport: ${token ? 'Supabase Management API over HTTPS' : 'local Supabase CLI session'}`,
    );
    // Invoke the pinned CLI through Node, avoiding shell-dependent npx quoting.
    const cli = token ? undefined : require.resolve('supabase/dist/supabase.js');
    fs.mkdirSync(path.join(root, 'supabase/.temp'), { recursive: true });
    const temp = fs.mkdtempSync(path.join(root, 'supabase/.temp/sql-tests-'));
    try {
      for (const file of files) {
        const sql = fs.readFileSync(path.join(root, 'supabase/tests', file), 'utf8');
        const batch = path.join(temp, file);
        const query = `begin;
set local statement_timeout = '45s';
do $environment$ begin
  if not exists(select 1 from private.test_environment where project_ref = '${ref}') then
    raise exception 'Dedicated test environment marker missing';
  end if;
end $environment$;
${file === 'document_eligibility.sql' ? '' : fs.readFileSync(path.join(root, 'supabase/tests/helpers/document-fixture.sql'), 'utf8')}
${sql}
rollback;\n`;
        console.log(`SQL: ${file}`);
        if (token) {
          await queryCloud({ ref, query, token });
          console.log(`PASS: ${file}`);
          continue;
        }
        fs.writeFileSync(batch, query);
        const result = spawnSync(
          process.execPath,
          [cli, 'db', 'query', '--linked', '--project-ref', ref, '--file', batch],
          { cwd: root, stdio: 'inherit', timeout: 90_000 },
        );
        if (result.error) throw result.error;
        if (result.status !== 0) {
          process.exitCode = 1;
          break;
        }
      }
    } finally {
      // Only the explicitly-created files are removed; no recursive delete.
      for (const file of fs.readdirSync(temp)) fs.unlinkSync(path.join(temp, file));
      fs.rmdirSync(temp);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
