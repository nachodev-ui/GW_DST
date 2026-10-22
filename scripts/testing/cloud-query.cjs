const { targetProject } = require('./sql-suites.cjs');

async function queryCloud({ ref, query, token, request = globalThis.fetch }) {
  targetProject(ref);
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required for HTTPS SQL tests');
  }
  let response;
  try {
    response = await request(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, read_only: false }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error('Supabase HTTPS connection failed or timed out; query was not retried');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Supabase HTTPS returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok || (payload && !Array.isArray(payload) && payload.error)) {
    const detail =
      typeof payload?.message === 'string'
        ? payload.message
        : typeof payload?.error === 'string'
          ? payload.error
          : 'SQL request rejected';
    throw new Error(
      `Supabase HTTPS (HTTP ${response.status}): ${detail.replaceAll(token, '[REDACTED]').slice(0, 1500)}`,
    );
  }
  return payload;
}

module.exports = { queryCloud };
