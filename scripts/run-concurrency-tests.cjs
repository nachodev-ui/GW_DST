const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { targetProject } = require('./testing/sql-suites.cjs');
const { queryCloud } = require('./testing/cloud-query.cjs');
const { uuid, guarded, operation, rows, race } = require('./testing/concurrency.cjs');
const { fixture, createOrder, snapshot, cleanup } = require('./testing/concurrency-fixture.cjs');

const names = [
  'two-drivers-one-order',
  'two-orders-one-driver',
  'last-stock',
  'cancel-before-accept',
  'accept-before-cancel',
  'cancel-before-progress',
  'progress-before-cancel',
  'same-request-concurrently',
  'retry-after-commit',
];

function cliQuery(ref) {
  targetProject(ref);
  const cli = require.resolve('supabase/dist/supabase.js');
  return async (sql) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gasway-dt03-'));
    const file = path.join(dir, 'query.sql');
    fs.writeFileSync(file, sql);
    try {
      return await new Promise((resolve, reject) => {
        execFile(
          process.execPath,
          [
            cli,
            'db',
            'query',
            '--linked',
            '--project-ref',
            ref,
            '--output',
            'json',
            '--file',
            file,
          ],
          { timeout: 90_000, maxBuffer: 1024 * 1024 },
          (error, stdout, stderr) => {
            // Never print CLI stderr/debug data, which may include connection details.
            if (error)
              return reject(
                new Error(
                  `Supabase CLI query failed (${error.code ?? 'timeout'}, SQLSTATE ${stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] ?? 'unknown'}); not retried`,
                ),
              );
            try {
              resolve(JSON.parse(stdout));
            } catch {
              reject(new Error('Supabase CLI did not return JSON rows'));
            }
          },
        );
      });
    } finally {
      fs.unlinkSync(file);
      fs.rmdirSync(dir);
    }
  };
}

function expectedEvents(state, ids, expected) {
  // Creation must yield requested + offered, in order, with the customer actor.
  for (const order of state.orders) {
    const events = state.events.filter((event) => event.order === order.id);
    const extras = expected[order.id] ?? [];
    assert.deepEqual(
      events.map((e) => [e.from, e.to, e.actor]),
      [[null, 'requested', ids.customer], ['requested', 'offered', ids.customer], ...extras],
    );
  }
}

async function scenario(query, ref, name, { beforeObserve } = {}) {
  const generated = {
    run: randomUUID(),
    business: randomUUID(),
    customer: randomUUID(),
    customer2: randomUUID(),
    driver: randomUUID(),
    driver2: randomUUID(),
    requests: [randomUUID(), randomUUID()],
  };
  let ids = generated;
  let ready = false;
  const empty = ['last-stock', 'same-request-concurrently', 'retry-after-commit'].includes(name);
  const count = empty ? 0 : name === 'two-orders-one-driver' ? 2 : 1;
  const stock = empty ? 1 : 3;
  try {
    const result = rows(await query(fixture(ref, ids, stock, count, name.includes('progress'))));
    ids = result[0].data;
    ready = true;
    const accept = (driver, order = ids.orders[0]) => ({
      actor: driver,
      expression: `public.accept_order(${uuid(order)})`,
    });
    const cancel = {
      actor: ids.customer,
      expression: `public.cancel_order(${uuid(ids.orders[0] ?? ids.run)})`,
    };
    const progress = {
      actor: ids.driver,
      expression: `public.advance_driver_order(${uuid(ids.orders[0] ?? ids.run)},'on_the_way')`,
    };
    const purchase = createOrder(ids, ids.customer, ids.requests[0]);
    let contenders;
    if (name === 'two-drivers-one-order') contenders = [accept(ids.driver), accept(ids.driver2)];
    if (name === 'two-orders-one-driver')
      contenders = [accept(ids.driver), accept(ids.driver, ids.orders[1])];
    if (name === 'last-stock')
      contenders = [purchase, createOrder(ids, ids.customer2, ids.requests[1])];
    if (name === 'cancel-before-accept') contenders = [cancel, accept(ids.driver)];
    if (name === 'accept-before-cancel') contenders = [accept(ids.driver), cancel];
    if (name === 'cancel-before-progress') contenders = [cancel, progress];
    if (name === 'progress-before-cancel') contenders = [progress, cancel];
    if (name === 'same-request-concurrently') contenders = [purchase, purchase];
    let outcomes;
    if (contenders) {
      outcomes = await race({
        query,
        ref,
        run: ids.run,
        first: contenders[0],
        second: contenders[1],
        report: (message) => console.log(`READY: ${name}: ${message}`),
        beforeObserve,
      });
      const expectedCode = {
        'two-drivers-one-order': '55000',
        'two-orders-one-driver': '42501',
        'last-stock': '55000',
        'cancel-before-accept': '55000',
        'accept-before-cancel': '00000',
        'cancel-before-progress': '55000',
        'progress-before-cancel': '55000',
        'same-request-concurrently': '00000',
      }[name];
      assert.equal(outcomes.b.code, expectedCode, `${name}: second SQLSTATE`);
      if (name === 'same-request-concurrently')
        assert.deepEqual(outcomes.a.payload, outcomes.b.payload);
      console.log(
        `BLOCKED: ${name} pid ${outcomes.evidence.second_pid} waited for ${outcomes.evidence.first_pid}`,
      );
    } else {
      // Receive and deliberately discard the committed purchase response. Inspect
      // durable state, then retry exactly the same request (no transport retries).
      await query(
        operation(ref, ids.run, `dt03-${ids.run}-lost`, purchase.actor, purchase.expression),
      );
      const before = rows(await query(snapshot(ref, ids)))[0];
      assert.equal(before.orders.length, 1, 'first call must have committed');
      assert.equal(before.stock, 0);
      const retry = rows(
        await query(
          operation(ref, ids.run, `dt03-${ids.run}-retry`, purchase.actor, purchase.expression),
        ),
      )[0];
      assert.equal(retry.code, '00000');
      assert.equal(retry.payload.id, before.orders[0].id);
      assert.deepEqual(
        rows(await query(snapshot(ref, ids)))[0],
        before,
        'retry must not change events, stock or reservations',
      );
    }
    const state = rows(await query(snapshot(ref, ids)))[0];
    assert.equal(state.orders.length, count || 1);
    const cancelled = name.startsWith('cancel-') || name === 'accept-before-cancel';
    assert.equal(state.stock, stock - state.orders.length + (cancelled ? 1 : 0));
    assert.equal(state.reservations.length, state.orders.length);
    assert.equal(state.reservations.filter((r) => r.released).length, cancelled ? 1 : 0);
    const extra = {};
    const firstId = ids.orders[0] ?? state.orders[0].id;
    let status = 'offered';
    if (['two-drivers-one-order', 'two-orders-one-driver', 'accept-before-cancel'].includes(name)) {
      extra[firstId] = [['offered', 'accepted', ids.driver]];
      status = 'accepted';
    }
    if (name.includes('progress')) extra[firstId] = [['offered', 'accepted', ids.driver]];
    if (cancelled) {
      extra[firstId] = [
        ...(extra[firstId] ?? []),
        [
          name.includes('progress') || name === 'accept-before-cancel' ? 'accepted' : 'offered',
          'cancelled',
          ids.customer,
        ],
      ];
      status = 'cancelled';
    }
    if (name === 'progress-before-cancel') {
      extra[firstId].push(['accepted', 'on_the_way', ids.driver]);
      status = 'on_the_way';
    }
    assert.equal(state.orders.find((o) => o.id === firstId).status, status);
    if (['accepted', 'on_the_way'].includes(status))
      assert.equal(state.orders.find((o) => o.id === firstId).driver, ids.driver);
    if (name === 'two-orders-one-driver')
      assert.equal(state.orders.find((o) => o.id === ids.orders[1]).status, 'offered');
    expectedEvents(state, ids, extra);
    console.log(`PASS: ${name} (winner, events, stock, reservations)`);
  } finally {
    if (ready) {
      await query(cleanup(ref, ids));
      console.log(`CLEAN: ${ids.run}`);
    } else {
      // Setup can have committed even if its response was lost. Inspect this
      // run's UUID before touching fixtures; never claim success after ambiguity.
      const existing = rows(
        await query(
          guarded(
            ref,
            '',
            `select data from private.concurrency_test_run where run_id=${uuid(ids.run)};`,
          ),
        ),
      );
      if (existing[0]) await query(cleanup(ref, existing[0].data));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args[0] &&
      args[0] !== '--list' &&
      !args[0].startsWith('--case=') &&
      !args[0].startsWith('--cleanup-run='))
  )
    throw new Error('Use --list, --case=<name> or --cleanup-run=<UUID>');
  if (args[0] === '--list') return console.log(names.join('\n'));
  const recovery = args[0]?.startsWith('--cleanup-run=')
    ? args[0].slice('--cleanup-run='.length)
    : undefined;
  if (recovery) uuid(recovery);
  const selected = args[0] && !recovery ? [args[0].slice('--case='.length)] : names;
  if (selected.some((name) => !names.includes(name))) throw new Error('Unknown concurrency case');
  const ref = targetProject(process.env.GASWAY_TEST_PROJECT_REF);
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (process.env.CI && !token) throw new Error('CI requires SUPABASE_ACCESS_TOKEN');
  const query = token ? (query) => queryCloud({ ref, token, query }) : cliQuery(ref);
  console.log(`Concurrency transport: ${token ? 'HTTPS' : 'local CLI session'}; target ${ref}`);
  if (recovery) {
    const saved = rows(
      await query(
        guarded(
          ref,
          '',
          `select data from private.concurrency_test_run where run_id=${uuid(recovery)};`,
        ),
      ),
    );
    if (!saved[0]) throw new Error('Run not found; nothing was deleted');
    await query(cleanup(ref, saved[0].data));
    return console.log(`CLEAN: ${recovery}`);
  }
  // CLI commands rotate a shared temporary login role during startup. Give a
  // contender time to connect before another CLI starts. This grace is never
  // evidence: the PostgreSQL PID/blocking assertions remain mandatory.
  const beforeObserve = token ? async () => {} : () => delay(5000);
  for (const name of selected) await scenario(query, ref, name, { beforeObserve });
}

if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { expectedEvents, scenario, names, cliQuery };
