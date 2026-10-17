import { test, expect } from "@playwright/test";
import {
  ASPECT,
  HORIZON,
  cameraAt,
  createOrbit,
  orbitAt,
  projectWorld,
  occludedByHole,
} from "../src/universe-camera.js";

const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const normalize = (v) => v.map((x) => x / Math.hypot(...v));

test("the viewing interval moves a world-space camera around the disk with a coherent orthonormal basis", () => {
  const a = cameraAt(0.26, 1440, 900),
    b = cameraAt(0.35, 1440, 900);
  expect(Math.hypot(...a.eye.map((v, i) => v - b.eye[i]))).toBeGreaterThan(1);
  expect(dot(a.back, b.back)).toBeLessThan(0.8);
  const normal = normalize([-0.26 / ASPECT, 1, -0.19 / ASPECT]);
  // The camera stays above the tilted disk instead of crossing it halfway.
  for (const p of [0.24, 0.28, 0.32, 0.36, 0.4, 0.5, 0.64, 1]) {
    const c = cameraAt(p, 1440, 900);
    for (const axis of [c.right, c.down, c.back])
      expect(dot(axis, axis)).toBeCloseTo(1, 10);
    expect(dot(c.right, c.down)).toBeCloseTo(0, 10);
    expect(dot(c.right, c.back)).toBeCloseTo(0, 10);
    expect(dot(c.down, c.back)).toBeCloseTo(0, 10);
    expect(dot(c.back, normal)).toBeLessThanOrEqual(normal[2] + 1e-10);
    expect(dot(c.eye, normal)).toBeLessThan(0);
  }
  // The middle pass rises to reveal disk depth, then rejoins the close-up.
  expect(dot(cameraAt(0.32, 1440, 900).back, normal)).toBeLessThan(
    normal[2] - 0.05,
  );
  expect(dot(cameraAt(1, 1440, 900).back, normal)).toBeCloseTo(normal[2], 10);
  // With physical time held fixed, camera movement alone produces parallax.
  // A screen-space spin would preserve relative photo depths; this does not.
  const orbit = createOrbit();
  let visible = 0,
    depthChanges = 0,
    displacement = 0;
  for (let i = 0; i < orbit.length / 4; i += 97) {
    const world = orbitAt(orbit, i, 5);
    const pa = projectWorld(world, a, 1440, 900),
      pb = projectWorld(world, b, 1440, 900);
    if (!pa || !pb) continue;
    visible++;
    if (Math.abs(pa.depth - a.distance - (pb.depth - b.distance)) > 0.1)
      depthChanges++;
    displacement += Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }
  expect(visible).toBeGreaterThan(100);
  expect(depthChanges).toBeGreaterThan(50);
  expect(displacement / visible).toBeGreaterThan(100);
  expect(cameraAt(0, 1440, 900).viewAngle).toBeCloseTo(0, 10);
  expect(cameraAt(1, 1440, 900).viewAngle).toBeCloseTo(-1.05, 10);
  // Continue inward on the new heading; never swing back to the old camera.
  let angle = 0;
  for (let i = 0; i <= 1000; i++) {
    const next = cameraAt(i / 1000, 1440, 900).viewAngle;
    expect(next).toBeLessThanOrEqual(angle + 1e-10);
    angle = next;
  }
});

test("the near stream stays in front while the far stream is occluded by the same moving horizon", () => {
  for (const p of [0.24, 0.28, 0.32, 0.36, 0.42, 0.52]) {
    const camera = cameraAt(p, 1440, 900);
    const direction = normalize([
      camera.eye[0] - HORIZON.x,
      camera.eye[1] - HORIZON.y,
      camera.eye[2] - HORIZON.z,
    ]);
    const point = (distance) => ({
      x: HORIZON.x + direction[0] * distance,
      y: (HORIZON.y + direction[1] * distance) * ASPECT,
      depth: HORIZON.z + direction[2] * distance,
    });
    expect(occludedByHole(point(0.25), camera)).toBe(false);
    expect(occludedByHole(point(-0.25), camera)).toBe(true);
    expect(occludedByHole(point(0), camera)).toBe(true);
  }
});

test("inward spirals accelerate, complete orbits, and respawn only beyond invisible edges", () => {
  const data = createOrbit();
  const index = Array.from({ length: data.length / 4 }, (_, i) => i).find(
    (i) => data[i * 4] > 0.245 && data[i * 4] < 0.25,
  );
  const p0 = orbitAt(data, index, 0),
    p20 = orbitAt(data, index, 20);
  expect(p20.radius).toBeLessThan(p0.radius);
  expect(orbitAt(data, index, 21).angle - p20.angle).toBeGreaterThan(
    orbitAt(data, index, 1).angle - p0.angle,
  );
  const beforeFade = (data[index * 4] ** 2 - 0.122 ** 2) / 0.0007;
  expect(orbitAt(data, index, beforeFade).angle - p0.angle).toBeGreaterThan(
    Math.PI * 2,
  );
  const reset = (data[index * 4] ** 2 - 0.075 ** 2) / 0.0007;
  const before = orbitAt(data, index, reset - 0.0001),
    after = orbitAt(data, index, reset + 0.0001);
  expect(before.opacity).toBe(0);
  expect(after.opacity).toBeLessThan(0.00001);
  expect(before.seed).toBe(after.seed);
  expect(Math.abs(before.angle - after.angle)).toBeLessThan(0.001);
});
