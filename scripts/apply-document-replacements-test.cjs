// Dedicated Test only. Validate upgrade, queue semantics and security before commit.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { targetProject } = require('./testing/sql-suites.cjs');
const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
const root = path.resolve(__dirname, '..');
const version = '20261027182010';
const name = 'replace_pending_documents';
const migration = fs.readFileSync(
  path.join(root, `supabase/migrations/${version}_${name}.sql`),
  'utf8',
);
if (!migration.startsWith('begin;') || !migration.trimEnd().endsWith('commit;'))
  throw new Error('Expected transactional migration');
const body = migration.slice('begin;'.length).trimEnd().slice(0, -'commit;'.length);
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const suites = [
  'document_replacement.sql',
  'document_eligibility.sql',
  'driver_self_documentation.sql',
]
  .map((file) => fs.readFileSync(path.join(root, 'supabase/tests', file), 'utf8'))
  .join('\n');
const sql = `begin;
set local statement_timeout='60s';
do $guard$ begin
  if not exists(select 1 from private.test_environment where project_ref=${literal(ref)}) then raise exception 'Dedicated Test marker missing'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version=${literal(version)}) then raise exception 'Migration already applied'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261027174325') then raise exception 'Personal documentation prerequisite missing'; end if;
end $guard$;
create temporary table replacement_snapshot on commit drop as
  select count(*) as document_count,
    md5(coalesce(string_agg(id::text||file_path||coalesce(reviewed_by::text,'')||coalesce(reviewed_at::text,''),'|' order by id),'')) as provenance,
    (select count(*) from storage.objects where bucket_id in ('documents','vehicle-photos')) as file_count
  from public.documents;
create temporary table replacement_acl_snapshot on commit drop as
  select oid,proacl,prosecdef from pg_proc where oid in (
    'private.submit_document(text,uuid,text,text,date)'::regprocedure,
    'public.submit_document(text,uuid,text,text,date)'::regprocedure,
    'private.review_document(uuid,text,text,date)'::regprocedure,
    'public.review_document(uuid,text,text,date)'::regprocedure,
    'private.list_pending_documents(timestamptz,uuid)'::regprocedure,
    'public.list_pending_documents(timestamptz,uuid)'::regprocedure);
-- Exercise the old five-pending-file state, then roll back both its fixtures and DDL.
do $upgrade$
declare business uuid:=gen_random_uuid(); driver uuid:=gen_random_uuid(); attempt integer;
begin
  begin
    insert into auth.users(id) values(driver);
    insert into public.distributors(id,name,is_verified,is_demo) values(business,'Replacement upgrade fixture',true,true);
    insert into public.drivers(id,is_verified,is_available,distributor_id,license_class) values(driver,false,false,business,'A4');
    for attempt in 1..5 loop
      insert into public.documents(driver_id,type,file_path,mime_type,size_bytes,license_class,expires_on,submitted_by,created_at)
      values(driver,case when attempt in (1,3,5) then 'driver_license_front' else 'driver_license_back' end,
        business::text||'/driver/'||driver::text||'/'||gen_random_uuid()::text||'.pdf','application/pdf',100,
        case when attempt in (2,4) then 'A4' end,case when attempt in (2,4) then current_date+30 end,
        driver,clock_timestamp()+attempt*interval '1 microsecond');
    end loop;
    execute ${literal(body)};
    if (select count(*) from public.documents where driver_id=driver and status='pending')<>2
      or (select count(*) from public.documents where driver_id=driver and status='replaced')<>3
      or (select count(*) from public.documents where driver_id=driver)<>5 then raise exception 'FAIL: upgrade lost files or retained duplicate tasks'; end if;
    raise exception using errcode='ZD004',message='Rollback upgrade fixtures and trial DDL';
  exception when sqlstate 'ZD004' then raise notice 'PASS: migration repairs three-front/two-back legacy queue without deleting history';
  end;
end;
$upgrade$;
${body}
${suites}
do $preserved$ begin
  if exists(select 1 from replacement_snapshot where document_count<>(select count(*) from public.documents)
    or provenance<>(select md5(coalesce(string_agg(id::text||file_path||coalesce(reviewed_by::text,'')||coalesce(reviewed_at::text,''),'|' order by id),'')) from public.documents)
    or file_count<>(select count(*) from storage.objects where bucket_id in ('documents','vehicle-photos'))) then
    raise exception 'FAIL: persistent documents, file paths or reviews changed unexpectedly'; end if;
  if exists(select 1 from replacement_acl_snapshot b join pg_proc p on p.oid=b.oid where b.proacl is distinct from p.proacl or b.prosecdef is distinct from p.prosecdef) then
    raise exception 'FAIL: document RPC permissions changed'; end if;
end $preserved$;
insert into supabase_migrations.schema_migrations(version,name,statements) values(${literal(version)},${literal(name)},array[${literal(migration)}]);
commit;
select 'PASS: upgrade, replacement, eligibility and ownership suites; original files/reviews/ACL preserved; Test migration committed' as result;`;
const directory = path.join(root, 'supabase/.temp');
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, 'apply-document-replacements-test.sql');
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
    const diagnostic = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
      .split(/\r?\n/)
      .filter((line) => /ERROR:|SQLSTATE|FAIL:|permission denied|error:|Error:/.test(line))
      .slice(-6)
      .join('\n');
    throw new Error(diagnostic || 'Test replacement migration failed; raw CLI output suppressed');
  }
  const resultData = JSON.parse(result.stdout);
  console.log(JSON.stringify(resultData.rows ?? resultData));
} finally {
  fs.unlinkSync(file);
}
