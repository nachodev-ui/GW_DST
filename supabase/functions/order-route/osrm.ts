import { z } from 'zod';
import type { RoutePoint } from './directions.ts';
const responseSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z
            .array(
              z.tuple([
                z.number().finite().min(-180).max(180),
                z.number().finite().min(-90).max(90),
              ]),
            )
            .min(2)
            .max(10000),
        }),
      }),
    )
    .optional(),
});
export async function fetchOsrm(
  origin: RoutePoint,
  destination: RoutePoint,
  fetcher: typeof fetch = fetch,
): Promise<RoutePoint[] | null> {
  const url = new URL(
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
  );
  url.search = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
    alternatives: 'false',
    generate_hints: 'false',
  }).toString();
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'Gasway-private-demo/1.0' },
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (text.length > 2_000_000) return null;
  const body = responseSchema.parse(JSON.parse(text));
  if (body.code !== 'Ok' || !body.routes?.[0]) return null;
  return body.routes[0].geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}
