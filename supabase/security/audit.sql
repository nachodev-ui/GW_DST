-- Read-only metadata inventory. Safe for the app project: no user rows or secrets.
begin read only;
set local statement_timeout = '30s';
with relations as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.reloptions
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm')
    and not exists (select 1 from pg_depend d where d.objid = c.oid
      and d.classid = 'pg_class'::regclass and d.deptype = 'e')
), routines as (
  select p.*, n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (select 1 from pg_depend d where d.objid = p.oid
      and d.classid = 'pg_proc'::regclass and d.deptype = 'e')
)
select jsonb_build_object(
  'database', current_database(),
  'tables', (select jsonb_agg(jsonb_build_object('schema', nspname, 'name', relname,
    'rls', relrowsecurity) order by nspname, relname) from relations where relkind in ('r', 'p')),
  'views', (select jsonb_agg(jsonb_build_object('schema', nspname, 'name', relname,
    'options', reloptions) order by nspname, relname) from relations where relkind in ('v', 'm')),
  'table_grants', (select jsonb_agg(jsonb_build_object('schema', nspname, 'name', relname,
    'role', actor, 'privilege', privilege) order by nspname, relname, actor, privilege)
    from relations cross join unnest(array['anon','authenticated']) actor
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
    where has_table_privilege(actor, oid, privilege)),
  'column_writes', (select jsonb_agg(jsonb_build_object('table', r.relname,
    'column', a.attname, 'role', actor, 'privilege', privilege) order by r.relname, a.attname, actor, privilege)
    from relations r join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
    cross join unnest(array['anon','authenticated']) actor
    cross join unnest(array['INSERT','UPDATE']) privilege
    where has_column_privilege(actor, r.oid, a.attnum, privilege)),
  'routines', (select jsonb_agg(jsonb_build_object('schema', nspname,
    'signature', oid::regprocedure::text, 'definer', prosecdef, 'config', proconfig,
    'anon', has_function_privilege('anon', oid, 'EXECUTE'),
    'authenticated', has_function_privilege('authenticated', oid, 'EXECUTE'))
    order by nspname, proname) from routines),
  'policies', (select jsonb_agg(to_jsonb(p) order by schemaname, tablename, policyname)
    from pg_policies p where schemaname in ('public','private')),
  'default_acl', (select jsonb_agg(jsonb_build_object('owner', pg_get_userbyid(d.defaclrole),
    'schema', n.nspname, 'type', d.defaclobjtype, 'acl', d.defaclacl::text))
    from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname in ('public','private') or d.defaclnamespace = 0),
  'api_schemas_setting', current_setting('pgrst.db_schemas', true)
) as security_inventory;
rollback;
