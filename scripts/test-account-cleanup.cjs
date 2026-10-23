const assert = require('node:assert/strict');
require('./testing/offline.cjs');
const { parseOptions, cleanup } = require('./security/delete-pilot-account.cjs');

const id = '0c7eab62-c07a-4d5a-9231-a0e68155a5fd';
// Dollar signs are legal in an email local part and must not end the SQL block.
const email = 'pilot$$@example.invalid';
function boundary({ absent = false, role = 'customer', dependency, mismatch = false } = {}) {
  const operations = [];
  let deleted = false;
  let revoked = false;
  let adminReads = 0;
  const columns = ['auth.users', 'public.profiles', 'auth.sessions'].map((name) => {
    const [table_schema, table_name] = name.split('.');
    return { table_schema, table_name, column_name: 'id', data_type: 'uuid' };
  });
  return {
    operations,
    adminReads: () => adminReads,
    sql(query) {
      if (query.startsWith('select u.id,p.role')) return { rows: absent ? [] : [{ id, role }] };
      if (query.includes('information_schema.columns')) return { rows: columns };
      if (query.startsWith('select * from ('))
        return {
          rows: deleted
            ? []
            : [
                { reference: 'auth.users', count: 1 },
                { reference: 'public.profiles', count: 1 },
                ...(dependency ? [{ reference: dependency, count: 1 }] : []),
              ],
        };
      assert.ok(query.startsWith('begin;'), 'Unexpected SQL operation');
      const tag = query.match(/do (\$cleanup_[a-f0-9]+\$)/)?.[1];
      assert.ok(tag && !email.includes(tag), 'Input cannot terminate the SQL block');
      assert.ok(query.includes(`u.id='${id}'::uuid`));
      assert.ok(query.includes(`lower(u.email)='${email}'`));
      assert.ok(query.includes("p.role='customer'"));
      operations.push('revoke');
      revoked = true;
      return { rows: [{ sessions: 0 }] };
    },
    adminClient() {
      adminReads += 1;
      return {
        auth: {
          admin: {
            getUserById: async (userId) => {
              assert.equal(userId, id);
              return { data: { user: { email: mismatch ? 'different@example.invalid' : email } } };
            },
            deleteUser: async (userId, softDelete) => {
              assert.equal(userId, id);
              assert.equal(softDelete, false);
              assert.ok(revoked, 'Sessions must be revoked first');
              operations.push('delete');
              deleted = true;
              return { error: null };
            },
          },
        },
      };
    },
    log() {},
  };
}

async function main() {
  assert.throws(() => parseOptions(['--email', email]), /--confirm/);
  assert.throws(() => parseOptions(['--email', 'invalid', '--confirm']));
  assert.throws(() => parseOptions(['--email', email, '--confirm', '--project-ref', 'other']));
  assert.throws(() => parseOptions(['--email', email, '--confirm']));
  assert.deepEqual(parseOptions(['--email', ' PILOT@EXAMPLE.INVALID ', '--confirm']), {
    email: 'pilot@example.invalid',
  });
  const missing = boundary({ absent: true });
  await cleanup({ email }, missing);
  assert.equal(missing.adminReads(), 0);
  for (const dependency of ['public.orders', 'private.driver_invitations', 'storage.objects']) {
    const blocked = boundary({ dependency });
    await assert.rejects(cleanup({ email }, blocked), /dependencias/);
    assert.equal(blocked.adminReads(), 0);
    assert.deepEqual(blocked.operations, []);
  }
  const driver = boundary({ role: 'driver' });
  await assert.rejects(cleanup({ email }, driver), /customer/);
  assert.deepEqual(driver.operations, []);
  const changed = boundary({ mismatch: true });
  await assert.rejects(cleanup({ email }, changed), /cuenta cambió/);
  assert.deepEqual(changed.operations, []);
  const success = boundary();
  await cleanup({ email }, success);
  assert.deepEqual(success.operations, ['revoke', 'delete']);
  console.log(
    'PASS: explicit confirmation, fixed target, dependency/role/identity guards, SQL delimiter safety, revocation before deletion and absence verification',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
