// Explicit manual cleanup of a disposable customer account in Gasway Project.
// Never runs in CI, prints credentials, follows an env URL or sends email.
const { parseArgs } = require('node:util');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const { cliJson } = require('./supabase-cli.cjs');

const projectRef = 'gleltbrvpfvfgggcatpt';
const projectUrl = 'https://gleltbrvpfvfgggcatpt.supabase.co';
const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const literal = (value) => "'" + value.replaceAll("'", "''") + "'";

function parseOptions(args) {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: { email: { type: 'string' }, confirm: { type: 'boolean', default: false } },
  });
  if (!values.confirm) throw new Error('Falta --confirm: no se hizo ninguna operación.');
  const email = z.email().max(254).parse(values.email?.trim().toLowerCase());
  return { email };
}

function inspectionStatements(columns, id, email) {
  const tables = new Map();
  for (const column of columns) {
    if (!['public', 'private', 'auth', 'storage'].includes(column.table_schema))
      throw new Error('Esquema inesperado.');
    const table = `${identifier(column.table_schema)}.${identifier(column.table_name)}`;
    const name = identifier(column.column_name);
    const predicate =
      column.column_name.includes('email') && column.data_type !== 'uuid'
        ? `lower(${name})=${literal(email)}`
        : `${name}::text=${literal(id)}`;
    if (!tables.has(table)) tables.set(table, []);
    tables.get(table).push(predicate);
  }
  return [...tables].map(
    ([table, predicates]) =>
      `select ${literal(table.replaceAll('"', ''))} as reference,count(*)::int as count from ${table} where ${predicates.join(' or ')}`,
  );
}

async function cleanup({ email }, { sql, adminClient, log }) {
  const matches = sql(
    `select u.id,p.role from auth.users u left join public.profiles p on p.id=u.id where lower(u.email)=${literal(email)}`,
  ).rows;
  if (matches?.length === 0) {
    log('SIN CAMBIOS: no existe una cuenta Auth con ese correo en Gasway Project.');
    return;
  }
  if (matches?.length !== 1 || !z.uuid().safeParse(matches[0].id).success)
    throw new Error('No se encontró una única identidad válida.');
  const { id, role } = matches[0];
  if (role !== 'customer')
    throw new Error('Solo se limpian cuentas customer con perfil existente.');

  const columns = sql(
    `select table_schema,table_name,column_name,data_type from information_schema.columns where table_schema in ('public','private','auth','storage') and (data_type='uuid' or (data_type in ('text','character varying') and (column_name in ('user_id','owner','owner_id') or column_name like '%email%'))) order by 1,2,3`,
  ).rows;
  if (!Array.isArray(columns) || !columns.length)
    throw new Error('Inventario de dependencias no disponible.');
  const statements = inspectionStatements(columns, id, email);
  const inspect = () => {
    const rows = [];
    for (let index = 0; index < statements.length; index += 20) {
      const result = sql(
        'select * from (' +
          statements.slice(index, index + 20).join(' union all ') +
          ') matches where count>0',
      );
      if (!Array.isArray(result.rows)) throw new Error('Inspección de dependencias incompleta.');
      rows.push(...result.rows);
    }
    return rows;
  };
  const before = inspect();
  if (
    before.some((row) => !row.reference.startsWith('auth.') && row.reference !== 'public.profiles')
  )
    throw new Error('Hay pedidos, archivos u otras dependencias de aplicación; no se borró nada.');
  if (
    before.find((row) => row.reference === 'auth.users')?.count !== 1 ||
    before.find((row) => row.reference === 'public.profiles')?.count !== 1
  )
    throw new Error('Identidad o perfil inconsistente; no se borró nada.');

  // Administrative credentials are retrieved only after all dependency guards pass.
  const admin = adminClient();
  const target = await admin.auth.admin.getUserById(id);
  if (target.error || target.data.user?.email?.toLowerCase() !== email)
    throw new Error('La cuenta cambió durante la inspección; no se borró nada.');

  // The email may legally contain dollar signs. Never let input terminate the
  // PL/pgSQL block delimiter, even after SQL string literals have been escaped.
  let blockTag;
  do {
    blockTag = '$cleanup_' + randomUUID().replaceAll('-', '') + '$';
  } while (email.includes(blockTag));
  const revoked = sql(`begin;
    do ${blockTag} declare target_id uuid; begin
      select u.id into target_id from auth.users u
        join public.profiles p on p.id=u.id
        where u.id=${literal(id)}::uuid and lower(u.email)=${literal(email)} and p.role='customer'
        for update of u,p;
      if target_id is null then raise exception 'Account changed'; end if;
      if exists(select 1 from public.orders where customer_id=target_id or driver_id=target_id)
        then raise exception 'Unexpected orders'; end if;
      delete from auth.refresh_tokens where user_id::text=target_id::text;
      delete from auth.sessions where user_id=target_id;
      delete from auth.flow_state where user_id=target_id;
    end ${blockTag};
    commit;
    select count(*)::int as sessions from auth.sessions where user_id=${literal(id)}::uuid;`);
  if (revoked.rows?.length !== 1 || revoked.rows[0].sessions !== 0)
    throw new Error('No se pudo comprobar la revocación; no se solicitó borrar Auth.');
  log('Sesiones revocadas. Eliminando únicamente la identidad comprobada…');
  const deleted = await admin.auth.admin.deleteUser(id, false);
  if (deleted.error) throw new Error('Auth no completó el borrado; revisar antes de repetir.');
  const remaining = inspect();
  if (remaining.length) throw new Error('Auth borrado; quedan referencias que requieren revisión.');
  log(
    `ELIMINADA Y VERIFICADA: Auth, perfil y sesiones ausentes en ${statements.length} tablas revisadas.`,
  );
}

async function main() {
  let phase = 'validación';
  try {
    if (process.env.CI) throw new Error('Esta herramienta no se ejecuta en CI.');
    const options = parseOptions(process.argv.slice(2));
    console.log(`Proyecto fijo: Gasway Project (${projectRef}).`);
    phase = 'inspección, eliminación o verificación';
    await cleanup(options, {
      sql: (query) =>
        cliJson([
          'db',
          'query',
          '--linked',
          '--project-ref',
          projectRef,
          '--output',
          'json',
          query,
        ]),
      adminClient: () => {
        const keys = cliJson([
          'projects',
          'api-keys',
          '--project-ref',
          projectRef,
          '--output',
          'json',
        ]);
        const key = keys.find((item) => item.name === 'service_role')?.api_key;
        if (typeof key !== 'string' || !key.startsWith('eyJ'))
          throw new Error('Clave administrativa no disponible.');
        return createClient(projectUrl, key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
      },
      log: (message) => console.log(message),
    });
  } catch (error) {
    // Never print Zod/SDK/subprocess errors: they may include input or credentials.
    const safeMessages = new Set([
      'Falta --confirm: no se hizo ninguna operación.',
      'Esta herramienta no se ejecuta en CI.',
      'No se encontró una única identidad válida.',
      'Solo se limpian cuentas customer con perfil existente.',
      'Hay pedidos, archivos u otras dependencias de aplicación; no se borró nada.',
      'Identidad o perfil inconsistente; no se borró nada.',
      'La cuenta cambió durante la inspección; no se borró nada.',
      'No se pudo comprobar la revocación; no se solicitó borrar Auth.',
      'Auth no completó el borrado; revisar antes de repetir.',
      'Auth borrado; quedan referencias que requieren revisión.',
    ]);
    console.error(
      safeMessages.has(error?.message)
        ? error.message
        : `Fallo durante ${phase}; datos y credenciales omitidos. Revisar antes de repetir.`,
    );
    process.exitCode = 1;
  }
}

module.exports = { parseOptions, cleanup };
if (require.main === module) void main();
