import { test, expect } from "@playwright/test";
import { photoSurfaceAt, projectPhotoSurface } from "../src/photo-surface.js";
import { createOrbit, orbitAt } from "../src/universe-camera.js";
import { planPhotoAtlas } from "../src/photo-textures.js";
import { selectPortraitIds, PORTRAIT_CAPACITY } from "../src/portrait-textures.js";

test("tilted prints have perspective and remain inside their reserved orbit footprint", () => {
  const orbit = createOrbit(24);
  let tilted = 0, perspective = 0, maxStep = 0;
  for (const ratio of [.25, .6, .8, 1, 1.8, 4]) {
    for (let i = 0; i < 24; i++) {
      for (const time of [2, 6, 12]) {
        const point = orbitAt(orbit, i, time), pose = photoSurfaceAt(point, time, 1, ratio);
        const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]
          .map(([u, v]) => projectPhotoSurface(u, v, ratio, pose));
        const maxX = Math.max(...corners.map(p => Math.abs(p.x)));
        const maxY = Math.max(...corners.map(p => Math.abs(p.y)));
        expect(maxX).toBeLessThanOrEqual(.54 * Math.min(ratio, 1) + .000001);
        expect(maxY).toBeLessThanOrEqual(.54 * Math.min(1 / ratio, 1) + .000001);
        if (Math.abs(pose.yaw) > .15 && Math.abs(pose.pitch) > .1) tilted++;
        const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        if (Math.abs(length(corners[0], corners[1]) - length(corners[3], corners[2])) > .001) perspective++;
        const next = photoSurfaceAt(orbitAt(orbit, i, time + 1 / 30), time + 1 / 30, 1, ratio);
        maxStep = Math.max(maxStep, Math.abs(next.yaw - pose.yaw), Math.abs(next.pitch - pose.pitch), Math.abs(next.roll - pose.roll));
        expect(pose.light).toBeGreaterThan(.8);
        expect(pose.light).toBeLessThan(1.05);
        const ending = photoSurfaceAt(point, time, 0, ratio);
        expect(ending.yaw).toBeCloseTo(0);
        expect(ending.pitch).toBeCloseTo(0);
        expect(ending.perspective).toBe(0);
        expect(ending.fit).toBe(1);
      }
    }
  }
  expect(tilted).toBeGreaterThan(100);
  expect(perspective).toBeGreaterThan(300);
  expect(maxStep).toBeLessThan(.01);
});

test("a full collection gets finer photo textures inside the existing memory and device limits", () => {
  for (const count of [120, 200, 209]) {
    const plan = planPhotoAtlas(count, 4096);
    expect(plan.tileWidth).toBeGreaterThanOrEqual(160);
    expect(plan.width * plan.height).toBeLessThanOrEqual(8_000_000);
    const mobile = planPhotoAtlas(count, 1024);
    expect(mobile.width).toBeLessThanOrEqual(1024);
    expect(mobile.height).toBeLessThanOrEqual(1024);
  }
});

test("a newly approaching large photo gets HD before older small cards", () => {
  const ids = Float32Array.from({ length: 200 }, (_, id) => id);
  const older = Array.from({ length: 16 }, (_, index) => ({ index, alpha: 1, projected: { size: 42 } }));
  const approaching = { index: 199, alpha: .75, projected: { size: 100 } };
  const hidden = { index: 198, alpha: .01, projected: { size: 108 } };
  const detail = selectPortraitIds([...older, approaching, hidden, approaching], ids);
  expect(detail[0]).toBe(199);
  expect(detail).not.toContain(198);
  expect(detail.length).toBe(PORTRAIT_CAPACITY);
  expect(new Set(detail).size).toBe(detail.length);
  expect(older[0].index).toBe(0);
});
