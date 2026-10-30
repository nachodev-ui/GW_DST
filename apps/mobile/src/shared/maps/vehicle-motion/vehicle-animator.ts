import {
  buildRoute,
  calculateBearing,
  clamp,
  distanceMeters,
  isCoordinate,
  normalizeHeading,
  pointAtRouteDistance,
  projectOntoRoute,
  routeSlice,
  shortestAngleDelta,
  type Coordinate,
  type RouteGeometry,
} from './geometry';

export type VehiclePose = { coordinate: Coordinate; bearing: number };
export type VehicleSample = {
  coordinate: Coordinate;
  timestampMs: number;
  heading?: number;
  headingReliable?: boolean;
};
export type VehicleAnimatorOptions = {
  durationMs?: number;
  defaultIntervalMs?: number;
  maxIntervalMs?: number;
  minMovementMeters?: number;
  lookAheadMeters?: number;
  maxRouteSnapMeters?: number;
  maxAngularSpeed?: number;
  turnSmoothingMs?: number;
};
type Dependencies = {
  onFrame: (pose: VehiclePose) => void;
  now: () => number;
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (id: number) => void;
};
type Motion = { path: RouteGeometry; duration: number; elapsed: number; direction: number };
const defaults = {
  defaultIntervalMs: 5000,
  maxIntervalMs: 15000,
  minMovementMeters: 4,
  lookAheadMeters: 8,
  maxRouteSnapMeters: 35,
  maxAngularSpeed: 180,
  turnSmoothingMs: 180,
};

/** One independent instance per vehicle. No extrapolation, native views, timers or backend writes. */
export class VehicleAnimator {
  private readonly options;
  private pose: VehiclePose | null = null;
  private accepted: VehicleSample | null = null;
  private lastTimestamp = -Infinity;
  private targetBearing = 0;
  private motion: Motion | null = null;
  private route: RouteGeometry | null = null;
  private routeDistance: number | undefined;
  private frame: number | null = null;
  private lastFrameTime = 0;
  private active = true;
  private disposed = false;

  constructor(
    private readonly dependencies: Dependencies,
    options: VehicleAnimatorOptions = {},
  ) {
    for (const [name, value] of Object.entries(options))
      if (value !== undefined && (!Number.isFinite(value) || value <= 0))
        throw new RangeError(`Invalid animation option: ${name}`);
    this.options = { ...defaults, ...options };
  }

  setRoute(polyline?: readonly Coordinate[]) {
    this.route = polyline && polyline.length > 1 ? buildRoute(polyline) : null;
    this.routeDistance = undefined;
  }

  getPose(): VehiclePose | null {
    return this.pose
      ? { coordinate: { ...this.pose.coordinate }, bearing: this.pose.bearing }
      : null;
  }

  update(sample: VehicleSample) {
    if (
      this.disposed ||
      !isCoordinate(sample.coordinate) ||
      !Number.isFinite(sample.timestampMs) ||
      sample.timestampMs <= this.lastTimestamp
    )
      return false;
    const previousTimestamp = this.lastTimestamp;
    this.lastTimestamp = sample.timestampMs;
    const reliableHeading =
      sample.headingReliable === true &&
      sample.heading !== undefined &&
      Number.isFinite(sample.heading) &&
      sample.heading >= 0 &&
      sample.heading < 360
        ? sample.heading
        : null;
    if (!this.pose) {
      const projection = this.route && projectOntoRoute(this.route, sample.coordinate);
      const coordinate =
        projection && projection.distanceFromRouteMeters <= this.options.maxRouteSnapMeters
          ? projection.point
          : sample.coordinate;
      this.pose = { coordinate: { ...coordinate }, bearing: reliableHeading ?? 0 };
      this.accepted = { ...sample, coordinate: { ...sample.coordinate } };
      this.targetBearing = this.pose.bearing;
      this.emit();
      return true;
    }
    if (
      this.accepted &&
      distanceMeters(this.accepted.coordinate, sample.coordinate) < this.options.minMovementMeters
    ) {
      // Keep both position and direction steady at rest; a trusted heading may turn the sprite only.
      if (reliableHeading !== null) {
        this.targetBearing = reliableHeading;
        this.schedule();
      }
      return false;
    }
    const interval = Number.isFinite(previousTimestamp)
      ? sample.timestampMs - previousTimestamp
      : this.options.defaultIntervalMs;
    const start = this.pose.coordinate;
    let target = sample.coordinate;
    let points = [start, target];
    let direction = 1;
    const from = this.route && projectOntoRoute(this.route, start, this.routeDistance);
    const to = this.route && projectOntoRoute(this.route, target, from?.distanceAlongMeters);
    if (
      this.route &&
      from &&
      to &&
      from.distanceFromRouteMeters <= this.options.maxRouteSnapMeters &&
      to.distanceFromRouteMeters <= this.options.maxRouteSnapMeters
    ) {
      target = to.point;
      direction = to.distanceAlongMeters >= from.distanceAlongMeters ? 1 : -1;
      points = [start, ...routeSlice(this.route, from.distanceAlongMeters, to.distanceAlongMeters)];
      this.routeDistance = from.distanceAlongMeters;
    } else this.routeDistance = undefined;
    this.targetBearing = calculateBearing(this.accepted?.coordinate ?? start, target);
    this.motion = {
      path: buildRoute(points),
      elapsed: 0,
      direction,
      duration: clamp(this.options.durationMs ?? interval, 100, this.options.maxIntervalMs),
    };
    this.accepted = { ...sample, coordinate: { ...sample.coordinate } };
    this.lastFrameTime = this.dependencies.now();
    this.schedule();
    return true;
  }

  setActive(active: boolean) {
    if (this.disposed || active === this.active) return;
    this.active = active;
    if (!active) this.cancel();
    else {
      this.lastFrameTime = this.dependencies.now();
      this.schedule();
    }
  }

  destroy() {
    this.disposed = true;
    this.cancel();
    this.pose = null;
    this.accepted = null;
    this.motion = null;
    this.route = null;
    this.routeDistance = undefined;
  }

  private cancel() {
    if (this.frame !== null) this.dependencies.cancelFrame(this.frame);
    this.frame = null;
  }

  private schedule() {
    if (this.frame === null && this.active && !this.disposed && this.pose) {
      this.lastFrameTime = this.dependencies.now();
      this.frame = this.dependencies.requestFrame(this.tick);
    }
  }

  private emit() {
    const pose = this.getPose();
    if (pose && this.active && !this.disposed) this.dependencies.onFrame(pose);
  }

  private tick = (time: number) => {
    this.frame = null;
    if (!this.active || this.disposed || !this.pose) return;
    const elapsed = Math.max(0, time - this.lastFrameTime);
    this.lastFrameTime = time;
    if (this.motion) {
      this.motion.elapsed += elapsed;
      this.pose.coordinate =
        pointAtRouteDistance(
          this.motion.path,
          this.motion.path.lengthMeters * clamp(this.motion.elapsed / this.motion.duration, 0, 1),
        ) ?? this.pose.coordinate;
      if (this.route && this.routeDistance !== undefined) {
        const projection = projectOntoRoute(this.route, this.pose.coordinate, this.routeDistance);
        if (projection) {
          this.routeDistance = projection.distanceAlongMeters;
          const ahead = pointAtRouteDistance(
            this.route,
            this.routeDistance + this.motion.direction * this.options.lookAheadMeters,
          );
          if (ahead && distanceMeters(this.pose.coordinate, ahead) > 0.1)
            this.targetBearing = calculateBearing(this.pose.coordinate, ahead);
        }
      }
      if (this.motion.elapsed >= this.motion.duration) this.motion = null;
    }
    const delta = shortestAngleDelta(this.pose.bearing, this.targetBearing);
    const limit = (this.options.maxAngularSpeed * elapsed) / 1000;
    const step = delta * Math.min(1, elapsed / this.options.turnSmoothingMs);
    this.pose.bearing = normalizeHeading(
      this.pose.bearing + clamp(Math.abs(delta) < 0.05 ? delta : step, -limit, limit),
    );
    this.emit();
    if (this.motion || Math.abs(shortestAngleDelta(this.pose.bearing, this.targetBearing)) > 0.001)
      this.frame = this.dependencies.requestFrame(this.tick);
  };
}
