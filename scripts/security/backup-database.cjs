// Native pg_dump -> age. Plaintext never goes to files, logs or CI artifacts.
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable, Transform, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { parseArgs } = require('node:util');

const projects = new Set(['gleltbrvpfvfgggcatpt', 'xnrueexpwzvxotgwmamj']);
const schemas = ['public', 'private', 'auth', 'storage', 'supabase_migrations'];

function connectionFromPlan(plan, ref) {
  assert.ok(projects.has(ref), 'Explicit Gasway project required');
  const connection = {};
  for (const name of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']) {
    // Parse only literal quoted assignments. Never execute the generated shell plan.
    const matches = [...plan.matchAll(new RegExp(`^export ${name}="([^"\\\\\r\n]*)"\\r?$`, 'gm'))];
    assert.equal(matches.length, 1, 'Unexpected CLI connection format');
    connection[name] = matches[0][1];
  }
  assert.match(connection.PGHOST, /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/);
  assert.equal(connection.PGPORT, '5432');
  assert.equal(connection.PGUSER, `cli_login_postgres.${ref}`);
  assert.equal(connection.PGDATABASE, 'postgres');
  assert.match(connection.PGPASSWORD, /^[A-Za-z0-9_+=/.-]{8,}$/);
  return {
    ...connection,
    PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '20',
    PGAPPNAME: 'gasway-backup',
  };
}

function cli(args) {
  try {
    return execFileSync(process.execPath, [require.resolve('supabase/dist/supabase.js'), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    throw new Error('Supabase CLI failed; sensitive output suppressed');
  }
}

function childDone(child) {
  child.stderr.resume(); // Errors can contain names or credentials. Never forward them.
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('Backup subprocess could not start')));
    child.once('close', (code) =>
      code === 0 ? resolve() : reject(new Error('Backup subprocess failed')),
    );
  });
}

async function encryptStream({ source, completed, producer, ageBin, recipient, output }) {
  let fd;
  try {
    fd = fs.openSync(output, 'wx', 0o600);
  } catch {
    producer?.kill();
    source.destroy();
    await completed.catch(() => {});
    throw new Error('Output already exists or cannot be created; existing file preserved');
  }
  const encrypted = spawn(ageBin, ['--encrypt', '--recipient', recipient], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 15 * 60_000,
  });
  const hash = createHash('sha256');
  let plainBytes = 0;
  let prefix = Buffer.alloc(0);
  const digest = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      plainBytes += chunk.length;
      if (prefix.length < 5) prefix = Buffer.concat([prefix, chunk]).subarray(0, 5);
      callback(null, chunk);
    },
  });
  const jobs = [
    completed,
    childDone(encrypted),
    pipeline(source, digest, encrypted.stdin),
    pipeline(encrypted.stdout, fs.createWriteStream(output, { fd })),
  ];
  try {
    await Promise.all(jobs);
    assert.ok(plainBytes > 0, 'Empty export');
    return { plainSha256: hash.digest('hex'), plainBytes, prefix: prefix.toString('ascii') };
  } catch {
    producer?.kill();
    encrypted.kill();
    source.destroy();
    await Promise.allSettled(jobs);
    fs.rmSync(output, { force: true });
    throw new Error('Encrypted export incomplete; partial ciphertext removed');
  }
}

function encryptCommand({ command, args, env, ...options }) {
  const producer = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 15 * 60_000,
  });
  return encryptStream({
    ...options,
    source: producer.stdout,
    completed: childDone(producer),
    producer,
  });
}

async function verifyEncrypted({ ageBin, identity, output, expectedHash }) {
  const child = spawn(ageBin, ['--decrypt', '--identity', identity, output], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 15 * 60_000,
  });
  const hash = createHash('sha256');
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      hash.update(chunk);
      callback();
    },
  });
  const jobs = [childDone(child), pipeline(child.stdout, sink)];
  try {
    await Promise.all(jobs);
    assert.equal(hash.digest('hex'), expectedHash, 'Round-trip mismatch');
  } catch {
    child.kill();
    await Promise.allSettled(jobs);
    throw new Error('Authenticated decryption verification failed');
  }
}

function privatePaths() {
  assert.ok(process.env.LOCALAPPDATA, 'Windows local storage required');
  const root = fs.realpathSync(path.join(process.env.LOCALAPPDATA, 'Gasway/Backups'));
  const repo = fs.realpathSync(path.join(__dirname, '../..'));
  assert.ok(!root.toLowerCase().startsWith(`${repo.toLowerCase()}${path.sep}`));
  const resolve = (relative) => {
    const target = fs.realpathSync(path.join(root, relative));
    assert.ok(target.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`));
    return target;
  };
  return {
    root,
    archives: resolve('archives'),
    ageBin: resolve('tools/age-v1.3.2/age/age.exe'),
    identity: resolve('keys/identity.agekey'),
    recipient: fs.readFileSync(resolve('keys/recipient.txt'), 'utf8').trim(),
  };
}

async function main() {
  assert.ok(!process.env.CI, 'Local backups only');
  const { values } = parseArgs({ options: { 'project-ref': { type: 'string' } } });
  const ref = values['project-ref'];
  assert.ok(projects.has(ref), 'Explicit Gasway project required');
  const locations = privatePaths();
  assert.match(locations.recipient, /^age1[0-9a-z]{58}$/);
  const lock = path.join(locations.root, 'backup.lock');
  const lockFd = fs.openSync(lock, 'wx');
  const started = new Date().toISOString();
  const stem = `${ref}-${started.replace(/[-:]/g, '').replace(/\.\d+/, '')}`;
  const options = { ageBin: locations.ageBin, recipient: locations.recipient };
  const files = [];
  let stage = 'metadata';
  try {
    const metadata = JSON.parse(
      cli([
        'db',
        'query',
        '--linked',
        '--project-ref',
        ref,
        '--output',
        'json',
        "begin read only; select current_setting('server_version') as server_version, pg_database_size(current_database()) as database_bytes, (select count(*) from auth.users) as auth_users, (select count(*) from storage.objects) as storage_objects; commit;",
      ]),
    ).rows;
    assert.equal(metadata?.length, 1, 'Unexpected database metadata');
    const env = {
      ...process.env,
      ...connectionFromPlan(
        cli(['db', 'dump', '--linked', '--project-ref', ref, '--dry-run']),
        ref,
      ),
    };
    const pgBin = path.join(process.env.ProgramFiles, 'PostgreSQL/18/bin');
    const exports = [
      {
        suffix: '.dump.age',
        command: path.join(pgBin, 'pg_dump.exe'),
        args: [
          '--format=custom',
          '--compress=6',
          '--no-password',
          '--lock-wait-timeout=10000',
          '--role=postgres',
          ...schemas.map((schema) => `--schema=${schema}`),
        ],
      },
      {
        suffix: '.roles.sql.age',
        command: path.join(pgBin, 'pg_dumpall.exe'),
        args: ['--roles-only', '--no-role-passwords', '--no-password', '--role=postgres'],
      },
    ];
    for (const item of exports) {
      stage = item.suffix;
      const output = path.join(locations.archives, stem + item.suffix);
      const result = await encryptCommand({ ...options, ...item, env, output });
      files.push(output);
      if (item.suffix === '.dump.age') assert.equal(result.prefix, 'PGDMP');
      await verifyEncrypted({ ...locations, output, expectedHash: result.plainSha256 });
    }
    // Do not retain credentials beyond the native export subprocesses.
    delete env.PGPASSWORD;
    const manifest = {
      format: 'gasway-logical-backup-v1',
      projectRef: ref,
      startedAt: started,
      completedAt: new Date().toISOString(),
      schemas,
      database: metadata[0],
      metadataTiming: 'Before export; counts are not tied to the pg_dump snapshot',
      dumpClient: 'PostgreSQL 18.4; source version recorded separately',
      encryption: 'age v1.3.2 X25519; authenticated round-trip verified without plaintext files',
      excluded: [
        'Storage file bytes',
        'Cloud Auth/SMTP/redirect configuration',
        'API/signing keys',
        'Custom role passwords',
        'Other managed schemas, Vault and encryption root keys',
      ],
      restoreStatus: 'Not rehearsed; DT-07 condition 5 remains pending',
    };
    const output = path.join(locations.archives, `${stem}.manifest.json.age`);
    stage = 'manifest';
    const result = await encryptStream({
      ...options,
      output,
      source: Readable.from([Buffer.from(JSON.stringify(manifest, null, 2))]),
      completed: Promise.resolve(),
    });
    files.push(output);
    await verifyEncrypted({ ...locations, output, expectedHash: result.plainSha256 });
    const receipt = {
      projectRef: ref,
      startedAt: started,
      completedAt: new Date().toISOString(),
      authenticatedDecryptionVerified: true,
      uploaded: false,
      files: files.map((file) => ({
        path: file,
        bytes: fs.statSync(file).size,
        sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        md5: createHash('md5').update(fs.readFileSync(file)).digest('hex'),
      })),
    };
    fs.writeFileSync(
      path.join(locations.archives, `${stem}.receipt.json`),
      JSON.stringify(receipt, null, 2),
      { flag: 'wx', mode: 0o600 },
    );
    console.log(JSON.stringify(receipt, null, 2));
  } catch {
    for (const file of files) fs.rmSync(file, { force: true });
    console.error(`Failed backup stage: ${stage}; subprocess details suppressed`);
    throw new Error('Backup failed; no valid backup receipt was issued');
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lock);
  }
}

module.exports = { connectionFromPlan, encryptCommand, encryptStream, verifyEncrypted };
if (require.main === module) {
  main().catch(() => {
    console.error(
      'Backup incomplete; credentials, database contents and subprocess errors suppressed.',
    );
    process.exitCode = 1;
  });
}
