import type { DeliveryPoint } from '@/shared/orders/delivery-point';

export type Coordinate = DeliveryPoint;
export const EARTH_RADIUS_METERS = 6_371_008.8;
export const SPRITE_HEADING_OFFSET = 0;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (angle: number) => (angle * 180) / Math.PI;
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export const normalizeHeading = (angle: number) => ((angle % 360) + 360) % 360;
export const shortestAngleDelta = (from: number, to: number) =>
  ((normalizeHeading(to) - normalizeHeading(from) + 540) % 360) - 180;

export function isCoordinate(point: Coordinate) {
  return (
    Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}

export function distanceMeters(a: Coordinate, b: Coordinate) {
  const lat = radians(b.latitude - a.latitude);
  const lon = radians(shortestAngleDelta(a.longitude, b.longitude));
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}

/** Spherical initial bearing, clockwise from true north. Coincident points have bearing zero. */
export function calculateBearing(a: Coordinate, b: Coordinate) {
  const latA = radians(a.latitude);
  const latB = radians(b.latitude);
  const lon = radians(shortestAngleDelta(a.longitude, b.longitude));
  return normalizeHeading(
    degrees(
      Math.atan2(
        Math.sin(lon) * Math.cos(latB),
        Math.cos(latA) * Math.sin(latB) - Math.sin(latA) * Math.cos(latB) * Math.cos(lon),
      ),
    ),
  );
}

export function interpolateLatLng(a: Coordinate, b: Coordinate, progress: number): Coordinate {
  const t = clamp(progress, 0, 1);
  if (t === 0) return { ...a };
  if (t === 1) return { ...b };
  const longitude = a.longitude + shortestAngleDelta(a.longitude, b.longitude) * t;
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: ((longitude + 540) % 360) - 180,
  };
}

export type RouteGeometry = {
  points: readonly Coordinate[];
  offsets: readonly number[];
  lengthMeters: number;
};

export function buildRoute(polyline: readonly Coordinate[]): RouteGeometry {
  if (polyline.length > 10_000 || polyline.some((point) => !isCoordinate(point)))
    throw new RangeError('Invalid route coordinates or route too large');
  const points = polyline
    .filter((point, index) => index === 0 || distanceMeters(polyline[index - 1]!, point) > 0.001)
    .map((point) => ({ ...point }));
  const offsets = [0];
  for (let i = 1; i < points.length; i++)
    offsets.push(offsets[i - 1]! + distanceMeters(points[i - 1]!, points[i]!));
  return { points, offsets, lengthMeters: offsets.at(-1) ?? 0 };
}

export function pointAtRouteDistance(route: RouteGeometry, distance: number): Coordinate | null {
  if (!route.points.length) return null;
  const offset = clamp(distance, 0, route.lengthMeters);
  for (let i = 1; i < route.points.length; i++) {
    if (offset <= route.offsets[i]!) {
      const length = route.offsets[i]! - route.offsets[i - 1]!;
      return interpolateLatLng(
        route.points[i - 1]!,
        route.points[i]!,
        (offset - route.offsets[i - 1]!) / length,
      );
    }
  }
  return { ...route.points.at(-1)! };
}

export type RouteProjection = {
  point: Coordinate;
  distanceAlongMeters: number;
  distanceFromRouteMeters: number;
};

/** Local tangent projection per segment; distances/progress are measured in meters, not degrees. */
export function projectOntoRoute(
  route: RouteGeometry,
  position: Coordinate,
  referenceDistance?: number,
): RouteProjection | null {
  let best: RouteProjection | null = null;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]!;
    const b = route.points[i]!;
    const scale = Math.max(1e-8, Math.cos(radians(position.latitude)));
    const x = radians(shortestAngleDelta(a.longitude, b.longitude)) * scale;
    const y = radians(b.latitude - a.latitude);
    const px = radians(shortestAngleDelta(a.longitude, position.longitude)) * scale;
    const py = radians(position.latitude - a.latitude);
    const t = clamp((px * x + py * y) / (x * x + y * y), 0, 1);
    const point = interpolateLatLng(a, b, t);
    const distance = distanceMeters(point, position);
    const along = route.offsets[i - 1]! + t * (route.offsets[i]! - route.offsets[i - 1]!);
    if (
      !best ||
      distance < best.distanceFromRouteMeters - 0.01 ||
      (referenceDistance !== undefined &&
        Math.abs(distance - best.distanceFromRouteMeters) <= 0.01 &&
        Math.abs(along - referenceDistance) <
          Math.abs(best.distanceAlongMeters - referenceDistance))
    )
      best = { point, distanceAlongMeters: along, distanceFromRouteMeters: distance };
  }
  return best;
}

export function getLookAheadPoint(
  polyline: readonly Coordinate[],
  position: Coordinate,
  distance: number,
): Coordinate | null {
  const route = buildRoute(polyline);
  const projection = projectOntoRoute(route, position);
  if (!projection) return route.points[0] ? { ...route.points[0] } : null;
  return pointAtRouteDistance(route, projection.distanceAlongMeters + Math.max(0, distance));
}

/** Retain intermediate corners so interpolation cannot cut straight across a route bend. */
export function routeSlice(route: RouteGeometry, start: number, end: number): Coordinate[] {
  const from = pointAtRouteDistance(route, start);
  const to = pointAtRouteDistance(route, end);
  if (!from || !to) return [];
  const points = route.points.filter(
    (_, i) => route.offsets[i]! > Math.min(start, end) && route.offsets[i]! < Math.max(start, end),
  );
  return [from, ...(end >= start ? points : [...points].reverse()), to];
}
