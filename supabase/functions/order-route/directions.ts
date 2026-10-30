import { z } from 'zod';

export const routePointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export type RoutePoint = z.infer<typeof routePointSchema>;
export function decodePolyline(encoded: string): RoutePoint[] {
  let cursor = 0;
  let latitude = 0;
  let longitude = 0;
  const points: RoutePoint[] = [];
  const read = () => {
    let result = 0;
    let shift = 0;
    let part: number;
    do {
      if (cursor >= encoded.length || shift > 30) throw new Error('Malformed polyline');
      part = encoded.charCodeAt(cursor++) - 63;
      if (part < 0 || part > 63) throw new Error('Malformed polyline');
      result += (part & 31) * 2 ** shift;
      shift += 5;
    } while (part >= 32);
    return result % 2 ? -(Math.floor(result / 2) + 1) : result / 2;
  };
  while (cursor < encoded.length) {
    latitude += read();
    longitude += read();
    points.push(routePointSchema.parse({ latitude: latitude / 1e5, longitude: longitude / 1e5 }));
    if (points.length > 10000) throw new Error('Route too large');
  }
  return points;
}
const responseSchema = z.object({
  status: z.string(),
  routes: z
    .array(
      z.object({
        overview_polyline: z.object({ points: z.string().max(200000) }).optional(),
        legs: z
          .array(
            z.object({
              steps: z.array(z.object({ polyline: z.object({ points: z.string().max(200000) }) })),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export async function fetchDirections(
  origin: RoutePoint,
  destination: RoutePoint,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<RoutePoint[] | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.search = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
    region: 'cl',
    language: 'es',
    units: 'metric',
    alternatives: 'false',
    key,
  }).toString();
  // Never log this URL: it contains both the server key and private locations.
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const text = await response.text();
  if (text.length > 2_000_000) return null;
  const body = responseSchema.parse(JSON.parse(text));
  if (body.status !== 'OK' || !body.routes?.[0]) return null;
  const route = body.routes[0];
  const encoded =
    route.legs?.flatMap((leg) => leg.steps.map((step) => step.polyline.points)) ??
    (route.overview_polyline ? [route.overview_polyline.points] : []);
  const points: RoutePoint[] = [];
  for (const piece of encoded)
    for (const point of decodePolyline(piece)) {
      const previous = points.at(-1);
      if (
        !previous ||
        previous.latitude !== point.latitude ||
        previous.longitude !== point.longitude
      )
        points.push(point);
      if (points.length > 10000) return null;
    }
  return points.length >= 2 ? points : null;
}
