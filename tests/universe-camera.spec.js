import { test, expect } from "@playwright/test";
import {
  PHOTO_COUNT,
  DISK,
  BLACK_HOLE_RADIUS,
  createPhotoOrbits,
  photoPosition,
  cameraPose,
  JOURNEY_MS,
  journeyProgress,
  photoShowcaseAt,
} from "../src/gargantua-model.js";

test("one dense annulus has continuous radii, varied height and full stable orbits outside the horizon", () => {
  const data = createPhotoOrbits(),
    period = (2 * Math.PI) / DISK.speed;
  expect(data.length / 4).toBe(PHOTO_COUNT);
  let minRadius = Infinity,
    maxRadius = 0,
    minY = Infinity,
    maxY = -Infinity;
  const radii = new Set(),
    angles = new Set();
  for (let i = 0; i < PHOTO_COUNT; i += 17) {
    const before = photoPosition(data, i, 0),
      after = photoPosition(data, i, period);
    minRadius = Math.min(minRadius, before.radius);
    maxRadius = Math.max(maxRadius, before.radius);
    minY = Math.min(minY, before.y);
    maxY = Math.max(maxY, before.y);
    radii.add(before.radius);
    angles.add(before.angle);
    expect(after.x).toBeCloseTo(before.x, 7);
    expect(after.z).toBeCloseTo(before.z, 7);
    expect(after.seed).toBe(before.seed);
  }
  expect(minRadius).toBeGreaterThan(BLACK_HOLE_RADIUS);
  expect(maxRadius).toBeGreaterThan(DISK.outer - 0.1);
  expect(maxY - minY).toBeGreaterThan(0.08);
  expect(radii.size).toBeGreaterThan(250);
  expect(angles.size).toBeGreaterThan(250);
});

test("the first-person camera counter-orbits the disk, always targets the origin and approaches without reversals", () => {
  const data = createPhotoOrbits();
  const cameraA = cameraPose(0.3, 3),
    cameraB = cameraPose(0.3, 4);
  const photoA = photoPosition(data, 0, 3),
    photoB = photoPosition(data, 0, 4);
  expect(
    (cameraB.azimuth - cameraA.azimuth) * (photoB.angle - photoA.angle),
  ).toBeLessThan(0);
  expect(cameraA.target).toEqual([0, 0, 0]);
  let radius = Infinity,
    maxStep = 0,
    previous;
  for (let elapsed = 0; elapsed <= JOURNEY_MS; elapsed += 20) {
    const p = journeyProgress(elapsed),
      pose = cameraPose(p, elapsed / 1000);
    expect(pose.radius).toBeLessThanOrEqual(radius + 1e-8);
    radius = pose.radius;
    expect(pose.height).toBeGreaterThan(0.6);
    if (previous)
      maxStep = Math.max(
        maxStep,
        Math.hypot(...pose.eye.map((v, i) => v - previous.eye[i])),
      );
    previous = pose;
  }
  expect(maxStep).toBeLessThan(0.25);
  expect(journeyProgress(0)).toBe(0);
  expect(journeyProgress(JOURNEY_MS)).toBe(1);
  let highlighted = 0;
  for (let ms = 0; ms < JOURNEY_MS; ms += 20)
    if (photoShowcaseAt(journeyProgress(ms)) > 0.9) highlighted += 20;
  expect(highlighted).toBeGreaterThan(4000);
});
