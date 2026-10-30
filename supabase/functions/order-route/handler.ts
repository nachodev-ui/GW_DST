import { z } from 'zod';
import { routePointSchema, type RoutePoint } from './directions.ts';

const requestSchema = z
  .object({ order_id: z.uuid(), provider: z.enum(['google', 'osrm']).default('google') })
  .strict();
const readySchema = z.object({
  state: z.literal('ready'),
  points: z.array(routePointSchema).min(2).max(10000),
});
const claimSchema = z.discriminatedUnion('state', [
  readySchema,
  z.object({ state: z.enum(['waiting', 'pending', 'unavailable', 'ended']) }),
  z.object({
    state: z.literal('compute'),
    lease: z.uuid(),
    origin: routePointSchema,
    destination: routePointSchema,
  }),
]);
export class RouteHttpError extends Error {
  constructor(readonly status: number) {
    super('Route request failed');
  }
}
type Dependencies = {
  key?: string;
  osrmEnabled?: boolean;
  authenticate: (token: string) => Promise<boolean>;
  begin: (orderId: string, token: string, provider: 'google' | 'osrm') => Promise<unknown>;
  finish: (
    orderId: string,
    lease: string,
    points: RoutePoint[] | null,
    provider: 'google' | 'osrm',
  ) => Promise<boolean>;
  osrm?: (origin: RoutePoint, destination: RoutePoint) => Promise<RoutePoint[] | null>;
  directions: (
    origin: RoutePoint,
    destination: RoutePoint,
    key: string,
  ) => Promise<RoutePoint[] | null>;
};
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,x-client-info,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

export function makeRouteHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);
    try {
      const match = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/);
      if (!match || !(await dependencies.authenticate(match[1]!)))
        return respond({ error: 'unauthorized' }, 401);
      const text = await request.text();
      if (text.length > 500) return respond({ error: 'invalid_request' }, 400);
      const input = requestSchema.safeParse(JSON.parse(text));
      if (!input.success) return respond({ error: 'invalid_request' }, 400);
      const provider = input.data.provider;
      const reply = (body: object) => respond({ ...body, order_id: input.data.order_id, provider });
      if (
        provider === 'google' ? !dependencies.key : !dependencies.osrmEnabled || !dependencies.osrm
      )
        return reply({ state: 'unavailable' });
      const claim = claimSchema.parse(
        await dependencies.begin(input.data.order_id, match[1]!, provider),
      );
      if (claim.state !== 'compute') return reply(claim);
      let points: RoutePoint[] | null = null;
      try {
        points =
          provider === 'google'
            ? await dependencies.directions(claim.origin, claim.destination, dependencies.key!)
            : await dependencies.osrm!(claim.origin, claim.destination);
      } catch {
        /* Provider failures must preserve GPS fallback and never leak credentials. */
      }
      const committed = await dependencies.finish(
        input.data.order_id,
        claim.lease,
        points,
        provider,
      );
      if (!committed || !points) return reply({ state: 'unavailable' });
      // Reauthorize after the provider call: cancellation/revocation can race an HTTP request.
      const result = claimSchema.parse(
        await dependencies.begin(input.data.order_id, match[1]!, provider),
      );
      return result.state === 'ready'
        ? reply(result)
        : reply({
            state: result.state === 'ended' ? 'ended' : 'waiting',
            order_id: input.data.order_id,
          });
    } catch (error) {
      if (error instanceof RouteHttpError)
        return respond({ error: 'route_access_failed' }, error.status);
      if (error instanceof SyntaxError) return respond({ error: 'invalid_request' }, 400);
      return respond({ state: 'unavailable' });
    }
  };
}
