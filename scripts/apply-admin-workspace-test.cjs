// Explicit operator action. This runner can never target Gasway Project.
const fs = require('node:fs');
const path = require('node:path');
const { targetProject } = require('./testing/sql-suites.cjs');
const { cliJson } = require('./security/supabase-cli.cjs');

const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
const version = '20261027011123';
const migration = fs.readFileSync(
  path.join(__dirname, `../supabase/migrations/${version}_admin_document_workspace.sql`),
  'utf8',
);
const start = migration.indexOf('\nbegin;');
const end = migration.lastIndexOf('\ncommit;');
if (start < 0 || end <= start || migration.slice(end).trim() !== 'commit;')
  throw new Error('Expected transactional workspace migration');
const body = migration.slice(start + '\nbegin;'.length, end);
const literal = (value) => `'${value.replaceAll("'", "''")}'`;

const sql = `begin;
set local statement_timeout='45s';
do $guard$ begin
  if not exists(select 1 from private.test_environment where project_ref=${literal(ref)}) then
    raise exception 'Dedicated Test marker missing';
  end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version=${literal(version)}) then
    raise exception 'Migration already applied';
  end if;
  if not exists(select 1 from private.document_admins) then
    raise exception 'Existing Test reviewer required for contract verification';
  end if;
end $guard$;
create temporary table workspace_acl_before on commit drop as
  select oid,proacl,prosecdef from pg_proc where oid in (
    'private.list_pending_documents(timestamptz,uuid)'::regprocedure,
    'public.list_pending_documents(timestamptz,uuid)'::regprocedure,
    'public.review_document(uuid,text,text,date)'::regprocedure,
    'private.review_document(uuid,text,text,date)'::regprocedure);
${body}
do $acl$ begin
  if exists(select 1 from workspace_acl_before b join pg_proc p on p.oid=b.oid
    where b.proacl is distinct from p.proacl or b.prosecdef is distinct from p.prosecdef) then
    raise exception 'Existing function permissions changed';
  end if;
end $acl$;
set local role anon;
do $anonymous$ begin
  begin
    perform public.list_pending_documents(null,null);
    raise exception 'Anonymous access unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $anonymous$;
reset role;
do $claims$ begin
  perform set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}',true);
end $claims$;
set local role authenticated;
do $denied$ begin
  begin
    perform public.list_pending_documents(null,null);
    raise exception 'Non-reviewer access unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $denied$;
reset role;
do $claims$ begin
  perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated',
    'sub',(select user_id::text from private.document_admins order by user_id limit 1))::text,true);
end $claims$;
set local role authenticated;
do $contract$
declare payload jsonb;
begin
  payload:=public.list_pending_documents(null,null);
  if (payload->>'version')::int<>2 or jsonb_typeof(payload->'businesses')<>'array'
    or jsonb_array_length(payload->'businesses')<>(payload->'metrics'->>'total_businesses')::int
    or jsonb_array_length(payload->'next_business_ids')>5 then
    raise exception 'Workspace contract verification failed';
  end if;
end $contract$;
reset role;
do $claims$ begin perform set_config('request.jwt.claims','{}',true); end $claims$;
insert into supabase_migrations.schema_migrations(version,name,statements)
  values(${literal(version)},'admin_document_workspace',array[${literal(migration)}]);
commit;
select jsonb_build_object('project_ref',${literal(ref)},'migration',${literal(version)},
  'applied',exists(select 1 from supabase_migrations.schema_migrations where version=${literal(version)}),
  'contract_v2',true,'anonymous_denied',true,'non_reviewer_denied',true,'acl_preserved',true) as result;`;

const tempDir = path.join(__dirname, '../supabase/.temp');
fs.mkdirSync(tempDir, { recursive: true });
const file = path.join(tempDir, 'apply-admin-workspace-test.sql');
fs.writeFileSync(file, sql);
try {
  const result = cliJson([
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--file',
    file,
    '--output-format',
    'json',
  ]);
  console.log(JSON.stringify(result.rows));
} finally {
  fs.unlinkSync(file);
}
