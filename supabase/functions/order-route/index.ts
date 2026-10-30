import { makeRouteHandler, RouteHttpError } from './handler.ts';
import { fetchDirections } from './directions.ts';
import { fetchOsrm } from './osrm.ts';

const base = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rpc(name: string, body: unknown, token: string, apikey: string) {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new RouteHttpError(response.status === 401 || response.status === 403 ? 403 : 503);
  return response.json();
}
Deno.serve(
  makeRouteHandler({
    key: Deno.env.get('GOOGLE_DIRECTIONS_API_KEY'),
    osrmEnabled: Deno.env.get('OSRM_DEMO_ENABLED') === 'true',
    osrm: fetchOsrm,
    authenticate: async (token) => {
      const response = await fetch(`${base}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anon },
        signal: AbortSignal.timeout(8000),
      });
      return response.ok;
    },
    begin: (orderId, token, provider) =>
      rpc(
        provider === 'google' ? 'begin_order_route' : 'begin_osrm_order_route',
        { p_order_id: orderId },
        token,
        anon,
      ),
    finish: (orderId, lease, points, provider) =>
      rpc(
        provider === 'google' ? 'finish_order_route' : 'finish_osrm_order_route',
        {
          p_order_id: orderId,
          p_lease: lease,
          p_points: points,
        },
        service,
        service,
      ),
    directions: fetchDirections,
  }),
);
