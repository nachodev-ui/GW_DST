const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./testing/load.cjs');
const g = load('apps/mobile/src/shared/maps/vehicle-motion/geometry.ts');
const { VehicleAnimator } = load('apps/mobile/src/shared/maps/vehicle-motion/vehicle-animator.ts');
const p = (latitude, longitude) => ({ latitude, longitude });
const near = (actual, expected, tolerance = 0.00001) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
function harness(options) {
  let clock = 0,
    id = 0;
  const frames = new Map();
  const poses = [];
  const animator = new VehicleAnimator(
    {
      now: () => clock,
      requestFrame: (cb) => {
        frames.set(++id, cb);
        return id;
      },
      cancelFrame: (key) => frames.delete(key),
      onFrame: (pose) => poses.push(pose),
    },
    options,
  );
  return {
    animator,
    poses,
    frames,
    advance(ms) {
      const end = clock + ms;
      while (clock < end) {
        clock = Math.min(end, clock + 16);
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((cb) => cb(clock));
      }
    },
    fix(coordinate, timestampMs, extra = {}) {
      return animator.update({ coordinate, timestampMs, ...extra });
    },
  };
}

test('spherical bearing: cardinals, diagonal, coincidence and antimeridian', () => {
  for (const [point, bearing] of [
    [p(1, 0), 0],
    [p(0, 1), 90],
    [p(-1, 0), 180],
    [p(0, -1), 270],
  ])
    near(g.calculateBearing(p(0, 0), point), bearing);
  near(g.calculateBearing(p(0, 0), p(1, 1)), 44.995636, 0.00001);
  assert.equal(g.calculateBearing(p(0, 0), p(0, 0)), 0);
  near(g.calculateBearing(p(0, 179.9), p(0, -179.9)), 90);
  near(g.shortestAngleDelta(359, 1), 2);
  near(g.shortestAngleDelta(1, 359), -2);
  near(g.shortestAngleDelta(350, 10), 20);
  near(g.shortestAngleDelta(-10, 730), 20);
  assert.equal(g.SPRITE_HEADING_OFFSET, 0);
});
test('interpolation clamps and takes the short path across longitude wrap', () => {
  const a = p(0, 179),
    b = p(2, -179);
  assert.deepEqual(g.interpolateLatLng(a, b, -1), a);
  assert.deepEqual(g.interpolateLatLng(a, b, 2), b);
  assert.deepEqual(g.interpolateLatLng(a, b, 0.5), p(1, -180));
  near(g.distanceMeters(p(0, 0), p(0, 0.001)), 111.19508, 0.001);
});
test('route projection, look-ahead and slices preserve right-angle corners', () => {
  const line = [p(0, 0), p(0.001, 0), p(0.001, 0.001)];
  const route = g.buildRoute(line);
  const projected = g.projectOntoRoute(route, p(0.0005, 0.00001));
  near(projected.point.latitude, 0.0005);
  near(projected.point.longitude, 0);
  assert.ok(projected.distanceFromRouteMeters < 2);
  const ahead = g.getLookAheadPoint(line, p(0.00099, 0), 8);
  near(ahead.latitude, 0.001);
  assert.ok(ahead.longitude > 0);
  assert.deepEqual(g.routeSlice(route, 0, route.lengthMeters), line);
  assert.deepEqual(g.routeSlice(route, route.lengthMeters, 0), [...line].reverse());
  assert.equal(g.getLookAheadPoint([], p(0, 0), 8), null);
  assert.throws(() => g.buildRoute([p(NaN, 0)]), RangeError);
});
test('new fixes retarget from the current visual pose and keep one RAF', () => {
  const h = harness();
  h.fix(p(0, 0), 0);
  h.fix(p(0.001, 0), 5000);
  h.advance(2500);
  near(h.animator.getPose().coordinate.latitude, 0.0005);
  const visual = h.animator.getPose();
  h.fix(p(0.002, 0), 10000);
  assert.deepEqual(h.animator.getPose(), visual);
  assert.equal(h.frames.size, 1);
  h.advance(2500);
  near(h.animator.getPose().coordinate.latitude, 0.00125);
  assert.equal(h.fix(p(1, 1), 10000), false, 'replays ignored');
  h.advance(2500);
  near(h.animator.getPose().coordinate.latitude, 0.002);
});
test('stationary GPS noise freezes pose, slow real motion accumulates, reliable heading can turn', () => {
  const h = harness();
  h.fix(p(0, 0), 0, { heading: 359, headingReliable: true });
  for (let i = 1; i <= 3; i++) assert.equal(h.fix(p(i * 0.000005, 0), i * 5000), false);
  assert.deepEqual(h.animator.getPose(), { coordinate: p(0, 0), bearing: 359 });
  h.fix(p(0, 0), 20000, { heading: 1, headingReliable: true });
  h.advance(1000);
  assert.ok(h.poses.every((pose) => Math.abs(g.shortestAngleDelta(359, pose.bearing)) <= 2.001));
  assert.equal(h.fix(p(0.00004, 0), 25000), true, '4.4m accumulated movement accepted');
});
test('angular speed is capped and foreground cancellation pauses time', () => {
  const h = harness({ maxAngularSpeed: 90 });
  h.fix(p(0, 0), 0);
  h.fix(p(0, 0.001), 5000);
  h.advance(500);
  assert.ok(h.animator.getPose().bearing <= 45.001);
  const before = h.animator.getPose();
  h.animator.setActive(false);
  assert.equal(h.frames.size, 0);
  h.advance(20000);
  assert.deepEqual(h.animator.getPose(), before);
  h.animator.setActive(true);
  h.advance(500);
  near(h.animator.getPose().coordinate.longitude, 0.0002);
  h.animator.destroy();
  assert.equal(h.frames.size, 0);
  assert.equal(h.animator.getPose(), null);
  assert.equal(h.fix(p(1, 1), 50000), false);
});
test('polyline motion follows corners, turns with look-ahead, off-route fixes fall back to GPS', () => {
  const h = harness({ durationMs: 10000 });
  const line = [p(0, 0), p(0.001, 0), p(0.001, 0.001)];
  h.animator.setRoute(line);
  h.fix(line[0], 0);
  h.fix(line[2], 5000);
  h.advance(4500);
  near(h.animator.getPose().coordinate.longitude, 0);
  h.advance(400);
  assert.ok(h.animator.getPose().bearing > 0, 'look-ahead anticipates corner');
  h.advance(2100);
  near(h.animator.getPose().coordinate.latitude, 0.001);
  for (const pose of h.poses)
    assert.ok(
      g.projectOntoRoute(g.buildRoute(line), pose.coordinate).distanceFromRouteMeters < 0.01,
    );
  h.fix(p(0.01, 0.01), 10000);
  h.advance(10000);
  near(h.animator.getPose().coordinate.latitude, 0.01);
  near(h.animator.getPose().coordinate.longitude, 0.01);
});
test('multiple vehicles have independent animations and lifecycles', () => {
  const a = harness(),
    b = harness();
  a.fix(p(0, 0), 0);
  b.fix(p(1, 1), 0);
  a.fix(p(0.001, 0), 5000);
  b.fix(p(1, 1.001), 5000);
  a.advance(1000);
  a.animator.destroy();
  b.advance(2500);
  near(b.animator.getPose().coordinate.longitude, 1.0005);
  assert.equal(b.frames.size, 1);
});

test('smooth curve preserves route position and continuous angular velocity', () => {
  const h = harness({ durationMs: 10000 });
  const line = Array.from({ length: 31 }, (_, i) =>
    p(Math.sin((i * Math.PI) / 60) * 0.001, (1 - Math.cos((i * Math.PI) / 60)) * 0.001),
  );
  h.animator.setRoute(line);
  h.fix(line[0], 0);
  h.fix(line.at(-1), 5000);
  h.advance(12000);
  const shape = g.buildRoute(line);
  for (let i = 1; i < h.poses.length; i++) {
    assert.ok(g.projectOntoRoute(shape, h.poses[i].coordinate).distanceFromRouteMeters < 0.01);
    assert.ok(
      Math.abs(g.shortestAngleDelta(h.poses[i - 1].bearing, h.poses[i].bearing)) <=
        180 * 0.016 + 0.00001,
    );
  }
  assert.ok(h.animator.getPose().bearing > 80 && h.animator.getPose().bearing < 95);
});
