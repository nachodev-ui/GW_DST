const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { race, rows, guarded, until, uuid } = require('./testing/concurrency.cjs');
const { expectedEvents, names } = require('./run-concurrency-tests.cjs');
const { projectRef, protectedProjectRefs } = require('../supabase/test-environment.json');

async function main() {
  const run = randomUUID();
  const first = { actor: randomUUID(), expression: 'public.accept_order(null)' };
  const second = { actor: randomUUID(), expression: 'public.accept_order(null)' };
  let released = false;
  let releaseFirst;
  let releaseSecond;
  let started = 0;
  const calls = [];
  const query = async (sql) => {
    calls.push(sql);
    if (sql.includes('create temporary table dt03_result')) {
      started++;
      return new Promise((resolve) => {
        if (started === 1)
          releaseFirst = () => resolve([{ pid: 101, code: '00000', payload: 'winner' }]);
        else releaseSecond = () => resolve({ rows: [{ pid: 202, code: '55000' }] });
      });
    }
    if (sql.includes('set released=true')) {
      released = true;
      releaseFirst?.();
      releaseSecond?.();
      return [];
    }
    if (sql.includes('pg_blocking_pids')) {
      assert.equal(started, 2);
      assert.equal(released, false, 'observer must see blocking before release');
      return [{ first_pid: 101, second_pid: 202 }];
    }
    return [{ pid: 101 }];
  };
  const result = await race({ query, ref: projectRef, run, first, second });
  assert.equal(result.b.code, '55000');
  assert.equal(released, true);
  assert.ok(calls.every((sql) => sql.includes('private.test_environment')));
  assert.ok(calls[0].includes('set local role authenticated'));
  assert.ok(calls[0].includes('exception when others'));
  assert.ok(calls[0].indexOf('commit;') < calls[0].indexOf('select * from dt03_result'));

  // An HTTP success with two sequential outcomes is not proof of a race. A
  // missing blocking pair must release both requests and fail the scenario.
  let freed = false;
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  let observed = 0;
  await assert.rejects(
    race({
      ref: projectRef,
      run,
      first,
      second,
      query: async (sql) => {
        if (sql.includes('create temporary table')) return pending;
        if (sql.includes('set released=true')) {
          freed = true;
          finish([]);
        }
        return [];
      },
      wait: async () => {
        if (++observed === 1) return { pid: 101 };
        throw new Error('No blocking pair');
      },
    }),
    /No blocking pair/,
  );
  assert.equal(freed, true);
  let releasedAfterFailure = false;
  await assert.rejects(
    race({
      ref: projectRef,
      run,
      first,
      second,
      query: async (sql) => {
        if (sql.includes('create temporary table')) throw new Error('Contender transport failed');
        if (sql.includes('set released=true')) releasedAfterFailure = true;
        return [];
      },
    }),
    /Contender transport failed/,
  );
  assert.equal(releasedAfterFailure, true, 'a failed contender must release the barrier');
  let attempts = 0;
  await assert.rejects(
    until(
      async () => {
        attempts++;
        return false;
      },
      { timeout: 0, pause: async () => {} },
    ),
    /required PostgreSQL/,
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    race({
      query: async () => {
        throw new Error('should not query');
      },
      ref: protectedProjectRefs[0],
      run,
      first,
      second,
    }),
    /dedicated Gasway Test/,
  );
  assert.throws(() => uuid("'; drop table public.orders; --"), /UUID/);
  assert.throws(() => rows({ data: [] }), /did not return rows/);
  assert.throws(() => guarded(protectedProjectRefs[0], ''), /dedicated Gasway Test/);

  const id = randomUUID();
  const customer = randomUUID();
  const good = {
    orders: [{ id }],
    events: [
      { order: id, actor: customer, from: null, to: 'requested' },
      { order: id, actor: customer, from: 'requested', to: 'offered' },
    ],
  };
  expectedEvents(good, { customer }, {});
  assert.throws(() =>
    expectedEvents({ ...good, events: [...good.events, good.events[1]] }, { customer }, {}),
  );
  assert.throws(() =>
    expectedEvents(
      { ...good, events: good.events.map((e) => ({ ...e, actor: randomUUID() })) },
      { customer },
      {},
    ),
  );
  assert.equal(names.length, 9);
  console.log(
    'PASS: concurrency coordinator, missing contention, cleanup, guards and event assertions',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
