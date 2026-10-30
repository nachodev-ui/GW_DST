// Dedicated Test only; schema and registry commit only if both rollback suites pass.
const fs = require('node:fs');
const path = require('node:path');
const { targetProject } = require('./testing/sql-suites.cjs');
const { spawnSync } = require('node:child_process');
const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
const version = '20261027174325';
const name = 'driver_self_documentation';
const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, `supabase/migrations/${version}_${name}.sql`),
  'utf8',
);
if (!migration.startsWith('begin;') || !migration.trimEnd().endsWith('commit;'))
  throw new Error('Expected transactional migration');
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const suites = ['driver_self_documentation.sql', 'document_eligibility.sql']
  .map((file) => fs.readFileSync(path.join(root, 'supabase/tests', file), 'utf8'))
  .join('\n');
const sql = `begin;
set local statement_timeout='45s';
do $guard$ begin
  if not exists(select 1 from private.test_environment where project_ref=${literal(ref)}) then raise exception 'Dedicated Test marker missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version=${literal(version)}) then raise exception 'Migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261026170703') then raise exception 'Document eligibility prerequisite missing'; end if;
end $guard$;
${migration.slice('begin;'.length).trimEnd().slice(0, -'commit;'.length)}
${suites}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${literal(version)},${literal(name)},array[${literal(migration)}]);
commit;
select 'PASS: personal license permissions, document eligibility and migration committed in Test; fixtures reverted' as result;`;
const directory = path.join(root, 'supabase/.temp');
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, 'apply-driver-documents-test.sql');
fs.writeFileSync(file, sql);
try {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('supabase/dist/supabase.js'),
      'db',
      'query',
      '--linked',
      '--project-ref',
      ref,
      '--file',
      file,
    ],
    { encoding: 'utf8', timeout: 90_000, maxBuffer: 2 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    // This command contains only migration/fixture SQL. Emit bounded database errors, never CLI credentials.
    const diagnostics = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
      .split(/\r?\n/)
      .filter((line) => /ERROR:|SQLSTATE|FAIL:|permission denied|error:|Error:/.test(line))
      .slice(-6)
      .join('\n');
    throw new Error(diagnostics || 'Test migration command failed; no raw CLI output logged');
  }
  const resultData = JSON.parse(result.stdout);
  console.log(JSON.stringify(resultData.rows ?? resultData));
} finally {
  fs.unlinkSync(file);
}
