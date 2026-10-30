// Synthetic checks of encryption integrity and fail-closed streaming, never cloud data.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  realpathSync,
  rmSync,
} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const {
  connectionFromPlan,
  encryptCommand,
  encryptStream,
  verifyEncrypted,
} = require('./backup-database.cjs');

async function main() {
  const ref = 'gleltbrvpfvfgggcatpt';
  const fields = {
    PGHOST: 'aws-0-us-east-2.pooler.supabase.com',
    PGPORT: '5432',
    PGUSER: `cli_login_postgres.${ref}`,
    PGPASSWORD: 'synthetic-not-a-credential',
    PGDATABASE: 'postgres',
  };
  const plan = Object.entries(fields)
    .map(([key, value]) => `export ${key}="${value}"`)
    .join('\n');
  assert.equal(connectionFromPlan(plan, ref).PGSSLMODE, 'require');
  assert.throws(() => connectionFromPlan(plan, 'xnrueexpwzvxotgwmamj'));
  assert.throws(() => connectionFromPlan(plan.replace(fields.PGHOST, 'attacker.invalid'), ref));
  assert.throws(() => connectionFromPlan(`${plan}\nexport PGPASSWORD="duplicate-secret"`, ref));
  assert.throws(() =>
    connectionFromPlan(plan.replace(fields.PGPASSWORD, '$(injected-command)'), ref),
  );
  const root = mkdtempSync(path.join(os.tmpdir(), 'gasway-backup-test-'));
  try {
    const toolRoot = path.join(process.env.LOCALAPPDATA, 'Gasway/Backups/tools/age-v1.3.2/age');
    const ageBin = path.join(toolRoot, 'age.exe');
    const keygen = path.join(toolRoot, 'age-keygen.exe');
    const identity = path.join(root, 'synthetic.agekey');
    const wrongIdentity = path.join(root, 'other.agekey');
    for (const key of [identity, wrongIdentity])
      execFileSync(keygen, ['-o', key], { stdio: ['ignore', 'pipe', 'pipe'] });
    const recipient = execFileSync(keygen, ['-y', identity], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const plaintext = Buffer.from('PGDMP-synthetic-private-data\0\xff'.repeat(4096));
    const output = path.join(root, 'synthetic.dump.age');
    const result = await encryptStream({
      source: Readable.from([plaintext]),
      completed: Promise.resolve(),
      ageBin,
      recipient,
      output,
    });
    assert.equal(result.prefix, 'PGDMP');
    assert.ok(!readFileSync(output).includes(Buffer.from('synthetic-private-data')));
    await verifyEncrypted({ ageBin, identity, output, expectedHash: result.plainSha256 });
    await assert.rejects(
      verifyEncrypted({
        ageBin,
        identity: wrongIdentity,
        output,
        expectedHash: result.plainSha256,
      }),
    );
    const altered = readFileSync(output);
    altered[altered.length - 1] ^= 1;
    writeFileSync(output, altered);
    await assert.rejects(
      verifyEncrypted({ ageBin, identity, output, expectedHash: result.plainSha256 }),
    );
    const before = readFileSync(output);
    await assert.rejects(
      encryptStream({
        source: Readable.from(['must not overwrite']),
        completed: Promise.resolve(),
        ageBin,
        recipient,
        output,
      }),
    );
    assert.deepEqual(readFileSync(output), before);
    const partial = path.join(root, 'failed.dump.age');
    await assert.rejects(
      encryptCommand({
        command: process.execPath,
        args: ['-e', 'process.stdout.write("partial fixture"); process.exitCode=7'],
        env: process.env,
        ageBin,
        recipient,
        output: partial,
      }),
    );
    assert.equal(existsSync(partial), false);
    console.log(
      'PASS: target/TLS guards, binary round-trip, wrong key, tampering, no overwrite, producer failure cleanup',
    );
  } finally {
    const resolved = realpathSync(root);
    assert.ok(resolved.startsWith(`${realpathSync(os.tmpdir())}${path.sep}gasway-backup-test-`));
    rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch(() => {
  console.error('Backup synthetic checks failed; test keys and subprocess output suppressed');
  process.exitCode = 1;
});
