// Read-only: GET health/verify, invalid random tokens, no redirects followed.
const { randomBytes } = require('node:crypto');
const { cliJson } = require('./supabase-cli.cjs');

const expectedDestination = 'gasway://auth/confirm';
const projects = [
  {
    name: 'App',
    ref: 'gleltbrvpfvfgggcatpt',
    base: 'https://gleltbrvpfvfgggcatpt.supabase.co',
    attempts: 3,
  },
  {
    name: 'Test',
    ref: 'xnrueexpwzvxotgwmamj',
    base: 'https://xnrueexpwzvxotgwmamj.supabase.co',
    attempts: 1,
  },
];
const variants = [
  { name: 'a', redirect: expectedDestination },
  { name: 'b' },
  { name: 'c', redirect: 'https://example.invalid/confirm' },
];
const generated = new Set();

function fresh(bytes) {
  let value;
  do {
    value = randomBytes(bytes).toString('hex');
  } while (generated.has(value));
  generated.add(value);
  return value;
}

function target(project, pathname) {
  const url = new URL(pathname, project.base);
  if (url.origin !== project.base) throw new Error('Unexpected origin');
  url.searchParams.set('cb', fresh(16));
  return url;
}

function locationSummary(response) {
  const raw = response.headers.get('location');
  if (!raw) return { destination: 'ausente', query: [], fragment: [], acceptable: false };
  try {
    const url = new URL(raw);
    const query = [...new Set(url.searchParams.keys())].sort();
    const fragment = [...new Set(new URLSearchParams(url.hash.slice(1)).keys())].sort();
    const destination = `${url.protocol}//${url.host}${url.pathname}`;
    return {
      destination,
      query,
      fragment,
      acceptable:
        destination === expectedDestination &&
        !url.username &&
        !url.password &&
        ![...query, ...fragment].some((name) =>
          ['access_token', 'refresh_token', 'code'].includes(name),
        ),
    };
  } catch {
    return { destination: 'no interpretable; omitida', query: [], fragment: [], acceptable: false };
  }
}

function cell(value) {
  return String(value ?? 'ausente')
    .replace(/[\r\n]/g, ' ')
    .replace(/\|/g, '&#124;')
    .replace(/`/g, '&#96;');
}

function table(headers, rows) {
  console.log(`| ${headers.map(cell).join(' | ')} |`);
  console.log(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) console.log(`| ${row.map(cell).join(' | ')} |`);
}

async function get(url, key) {
  return fetch(url, {
    method: 'GET',
    headers: { apikey: key },
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
}

async function main() {
  const healthRows = [];
  const rows = [];
  let failures = 0;
  const started = new Date().toISOString();

  for (const project of projects) {
    let key;
    try {
      const keys = cliJson([
        'projects',
        'api-keys',
        '--project-ref',
        project.ref,
        '--output',
        'json',
      ]);
      key = keys.find((item) => item.type === 'publishable')?.api_key;
      if (typeof key !== 'string' || !key.startsWith('sb_publishable_'))
        throw new Error('Publishable key unavailable');
    } catch {
      failures += 1;
      healthRows.push([
        project.name,
        new Date().toISOString(),
        'no ejecutado',
        'no disponible: lectura CLI fallida; detalles omitidos',
        null,
        null,
      ]);
      continue;
    }

    const healthStarted = new Date().toISOString();
    try {
      const response = await get(target(project, '/auth/v1/health'), key);
      const body = response.status === 200 ? await response.json() : null;
      if (response.status !== 200) await response.body?.cancel();
      const version =
        typeof body?.version === 'string' &&
        /^v?\d+\.\d+\.\d+(?:[-+.][A-Za-z0-9.-]+)?$/.test(body.version)
          ? body.version
          : 'no disponible';
      healthRows.push([
        project.name,
        healthStarted,
        response.status,
        version,
        response.headers.get('cf-cache-status'),
        response.headers.get('sb-request-id'),
      ]);
      if (response.status !== 200 || version === 'no disponible') failures += 1;
    } catch {
      failures += 1;
      healthRows.push([
        project.name,
        healthStarted,
        'error de petición',
        'no disponible',
        null,
        null,
      ]);
    }

    for (let attempt = 1; attempt <= project.attempts; attempt += 1) {
      for (const variant of variants) {
        const url = target(project, '/auth/v1/verify');
        url.searchParams.set('type', 'signup');
        url.searchParams.set('token', fresh(32));
        if (variant.redirect !== undefined) url.searchParams.set('redirect_to', variant.redirect);
        const utc = new Date().toISOString();
        try {
          const response = await get(url, key);
          const location = locationSummary(response);
          const passed = response.status === 303 && location.acceptable;
          if (!passed) failures += 1;
          rows.push([
            project.name,
            variant.name,
            attempt,
            utc,
            response.status,
            location.destination,
            location.query.join(', ') || 'ninguno',
            location.fragment.join(', ') || 'ninguno',
            response.headers.get('cf-cache-status'),
            response.headers.get('sb-request-id'),
            passed ? 'PASS' : 'FAIL',
          ]);
          await response.body?.cancel();
        } catch {
          failures += 1;
          rows.push([
            project.name,
            variant.name,
            attempt,
            utc,
            'error de petición',
            'no disponible',
            'no disponible',
            'no disponible',
            null,
            null,
            'FAIL',
          ]);
        }
      }
    }
  }

  console.log(`Tanda iniciada: ${started}; finalizada: ${new Date().toISOString()}.`);
  console.log('GET con redirect manual; tokens inválidos y cache-busting distintos en memoria.');
  console.log('a: destino nativo; b: sin redirect_to; c: destino externo.');
  console.log(
    'Bases literales: App https://gleltbrvpfvfgggcatpt.supabase.co; Test https://xnrueexpwzvxotgwmamj.supabase.co.',
  );
  console.log('\nVersiones Auth por GET /auth/v1/health:\n');
  table(['Proyecto', 'Inicio UTC', 'HTTP', 'Auth', 'cf-cache-status', 'sb-request-id'], healthRows);
  console.log('\nSondas por GET /auth/v1/verify (Location sin valores de query/fragmento):\n');
  table(
    [
      'Proyecto',
      'Variante',
      'Intento',
      'Inicio UTC',
      'HTTP',
      'Location: origen + ruta',
      'Query: nombres',
      'Fragmento: nombres',
      'cf-cache-status',
      'sb-request-id',
      'Resultado',
    ],
    rows,
  );
  const passed = failures === 0 && rows.length === 12;
  console.log(
    `\n${passed ? 'PASS' : 'FAIL'}: ${rows.filter((row) => row.at(-1) === 'PASS').length}/12 verificaciones correctas; fallos de lectura/validación: ${failures}. Sin cambios de configuración ni cuentas.`,
  );
  process.exitCode = passed ? 0 : 1;
}

// Never print Error objects: a fetch/CLI error can embed credentials or a request URL.
main().catch(() => {
  console.error('FAIL: sonda interrumpida; detalles y credenciales omitidos.');
  process.exitCode = 1;
});
