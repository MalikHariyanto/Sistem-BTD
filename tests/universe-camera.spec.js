import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import {
  middleMotionAt,
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

test("opening and ending keep the exact original camera poses", () => {
  const fixtures = JSON.parse(readFileSync(new URL("./fixtures/original-gargantua-poses.json", import.meta.url), "utf8"));
  for (const { width, height, progress, pose } of fixtures) {
    for (const time of [0, 7, 100]) {
      const current = cameraAt(progress, width, height, ASPECT, time);
      for (const [field, expected] of Object.entries(pose))
        expect(current[field]).toEqual(expected);
      expect(current.middleMotion).toBe(0);
    }
  }
});

test("only the middle camera counter-orbits the photo disk with a coherent basis", () => {
  const orbit = createOrbit();
  const first = cameraAt(.3, 1440, 900, ASPECT, 4);
  const last = cameraAt(.3, 1440, 900, ASPECT, 5);
  const cameraTurn = Math.atan2(last.eye[2], last.eye[0]) - Math.atan2(first.eye[2], first.eye[0]);
  const photoTurn = orbitAt(orbit, 100, 5).angle - orbitAt(orbit, 100, 4).angle;
  expect(cameraTurn).toBeLessThan(0);
  expect(photoTurn).toBeGreaterThan(0);
  expect(cameraTurn * photoTurn).toBeLessThan(0);
  expect(middleMotionAt(.3)).toBe(1);
  for (const p of [0, .1, .18, .62, .8, 1]) expect(middleMotionAt(p)).toBe(0);
  const normal = normalize([-.26 / ASPECT, 1, -.19 / ASPECT]);
  for (let i = 0; i <= 100; i++) {
    const c = cameraAt(i / 100, 1440, 900, ASPECT, 5);
    for (const axis of [c.right, c.down, c.back]) expect(dot(axis, axis)).toBeCloseTo(1, 10);
    expect(dot(c.right, c.down)).toBeCloseTo(0, 10);
    expect(dot(c.right, c.back)).toBeCloseTo(0, 10);
    expect(dot(c.down, c.back)).toBeCloseTo(0, 10);
    expect(dot(c.eye, normal)).toBeLessThan(0);
  }
  // Both edges join the old camera without a position or orientation jump.
  for (const boundary of [.18, .24, .44, .62]) {
    const a = cameraAt(boundary - .000001, 1440, 900, ASPECT, 5);
    const b = cameraAt(boundary + .000001, 1440, 900, ASPECT, 5);
    expect(Math.hypot(...a.eye.map((v, i) => v - b.eye[i]))).toBeLessThan(.001);
    expect(dot(a.back, b.back)).toBeGreaterThan(.999999);
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
