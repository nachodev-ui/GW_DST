// Apply only this migration to the dedicated Test target, after its scoped assertions pass.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { targetProject } = require('./testing/sql-suites.cjs');
const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
const version = '20261026170703';
const migration = fs.readFileSync(
  path.join(__dirname, `../supabase/migrations/${version}_document_eligibility.sql`),
  'utf8',
);
const suite = fs.readFileSync(
  path.join(__dirname, '../supabase/tests/document_eligibility.sql'),
  'utf8',
);
if (!migration.startsWith('begin;') || !migration.trimEnd().endsWith('commit;'))
  throw new Error('Expected transactional migration');
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const guard = `do $guard$ begin
  if not exists(select 1 from private.test_environment where project_ref=${literal(ref)}) then raise exception 'Dedicated Test marker missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version=${literal(version)}) then raise exception 'Migration already applied; run only the suite'; end if;
end $guard$;`;
const sql = `begin; set local statement_timeout='45s';
${guard}
${migration.slice('begin;'.length).trimEnd().slice(0, -'commit;'.length)}
${suite}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${literal(version)},'document_eligibility',array[${literal(migration)}]);
commit;
select 'PASS: migration and three documentary SQL/RLS groups in Gasway Test only' as result;`;
const tempDir = path.join(__dirname, '../supabase/.temp');
fs.mkdirSync(tempDir, { recursive: true });
const file = path.join(tempDir, 'apply-document-test.sql');
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
    { stdio: 'inherit', timeout: 90_000 },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.unlinkSync(file);
}
