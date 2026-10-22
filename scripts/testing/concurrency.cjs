const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { targetProject } = require('./sql-suites.cjs');

function uuid(value) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value))
    throw new Error('Expected a generated UUID');
  return `'${value}'`;
}

function guarded(ref, sql, result = 'select true as ok;') {
  targetProject(ref);
  return `begin;
set local statement_timeout = '55s';
set local lock_timeout = '40s';
do $marker$ begin
  if not exists(select 1 from private.test_environment where project_ref='${ref}') then
    raise exception 'Dedicated test environment marker missing';
  end if;
end $marker$;
${sql}
commit;
${result}`;
}

function asActor(actor, expression) {
  return `perform set_config('request.jwt.claims',json_build_object('sub',${uuid(actor)},'role','authenticated')::text,true);
    set local role authenticated;
    payload := to_jsonb(${expression});
    reset role;`;
}

function operation(ref, run, name, actor, expression, hold = false) {
  // The returned row is read only after COMMIT. RPC exceptions roll back their
  // subtransaction and are data here; the caller must assert their SQLSTATE.
  return guarded(
    ref,
    `
set local application_name = '${name}';
create temporary table dt03_result(payload jsonb, code text, pid integer);
do $operation$
declare payload jsonb; code text := '00000'; deadline timestamptz;
begin
  begin
    ${asActor(actor, expression)}
  exception when others then
    code := sqlstate;
    reset role;
  end;
  insert into dt03_result values(payload,code,pg_backend_pid());
  ${
    hold
      ? `
  if code <> '00000' then raise exception 'First contender failed: %',code; end if;
  perform set_config('application_name','${name}-holding',true);
  deadline := clock_timestamp() + interval '45 seconds';
  loop
    exit when (select released from private.concurrency_test_run where run_id=${uuid(run)});
    if clock_timestamp() > deadline then raise exception 'Concurrency barrier timed out'; end if;
    perform pg_sleep(0.1);
  end loop;`
      : ''
  }
end $operation$;`,
    'select * from dt03_result;',
  );
}

function rows(payload) {
  const result = Array.isArray(payload) ? payload : payload?.rows;
  if (!Array.isArray(result)) throw new Error('SQL transport did not return rows');
  return result;
}

async function until(check, { timeout = 30_000, pause = () => delay(250) } = {}) {
  const deadline = Date.now() + timeout;
  do {
    const value = await check();
    if (value) return value;
    await pause();
  } while (Date.now() < deadline);
  throw new Error('Did not observe the required PostgreSQL concurrency state');
}

async function race({
  query,
  ref,
  run,
  first,
  second,
  wait = until,
  report = () => {},
  beforeObserve = async () => {},
}) {
  uuid(run);
  const prefix = `dt03-${run}`;
  const pending = [];
  let contenderFailure;
  // Attach rejection handlers immediately, including before the observer runs.
  const start = (sql) => {
    const promise = query(sql);
    promise.catch((error) => {
      contenderFailure ??= error;
    });
    pending.push(promise);
    return promise;
  };
  let evidence;
  let failure;
  let phase = 'first contender holding its locks';
  const observe = async (sql) => {
    if (contenderFailure) throw contenderFailure;
    const result = rows(await query(sql))[0];
    if (contenderFailure) throw contenderFailure;
    return result;
  };
  try {
    start(operation(ref, run, `${prefix}-a`, first.actor, first.expression, true));
    await beforeObserve();
    await wait(async () =>
      observe(
        guarded(
          ref,
          '',
          `
      select pid from pg_stat_activity
      where application_name='${prefix}-a-holding' and state='active';`,
        ),
      ),
    );
    report('first contender holds its locks');
    start(operation(ref, run, `${prefix}-b`, second.actor, second.expression));
    await beforeObserve();
    phase = 'second contender blocked by the first';
    evidence = await wait(async () =>
      observe(
        guarded(
          ref,
          '',
          `
      select a.pid as first_pid,b.pid as second_pid
      from pg_stat_activity a cross join pg_stat_activity b
      where a.application_name='${prefix}-a-holding' and b.application_name='${prefix}-b'
        and a.pid<>b.pid and a.pid=any(pg_blocking_pids(b.pid));`,
        ),
      ),
    );
  } catch (error) {
    failure = new Error(`${phase}: ${error.message}`);
  } finally {
    try {
      await query(
        guarded(
          ref,
          `update private.concurrency_test_run set released=true where run_id=${uuid(run)};`,
        ),
      );
    } catch (error) {
      failure ??= error;
    }
  }
  const outcomes = await Promise.allSettled(pending);
  if (failure) throw failure;
  for (const outcome of outcomes) if (outcome.status === 'rejected') throw outcome.reason;
  const [a, b] = outcomes.map((outcome) => rows(outcome.value)[0]);
  assert.ok(a && b && evidence, 'both committed outcomes and a blocking pair are required');
  assert.equal(a.pid, evidence.first_pid);
  assert.equal(b.pid, evidence.second_pid);
  assert.notEqual(a.pid, b.pid);
  assert.equal(a.code, '00000');
  return { a, b, evidence };
}

module.exports = { uuid, guarded, asActor, operation, rows, until, race };
