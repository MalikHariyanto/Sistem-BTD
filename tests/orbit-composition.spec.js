import { test, expect } from "@playwright/test";
import { cameraAt, createOrbit, orbitRateAt } from "../src/universe-camera.js";
import { assignOrbitPhotos } from "../src/photo-textures.js";
import { createOrbitComposition } from "../src/orbit-composition.js";

function intersects(a, b, ratios, ids) {
  const aa = ratios[ids[a.index]],
    bb = ratios[ids[b.index]];
  return (
    Math.abs(a.projected.x - b.projected.x) <
      (a.projected.size * Math.min(aa, 1) +
        b.projected.size * Math.min(bb, 1)) /
        2 &&
    Math.abs(a.projected.y - b.projected.y) <
      (a.projected.size * Math.min(1 / aa, 1) +
        b.projected.size * Math.min(1 / bb, 1)) /
        2
  );
}

test("portraits have breathing room and follow the near orbit off the left edge without turning back", () => {
  const orbit = createOrbit(),
    photoIds = assignOrbitPhotos(orbit, 120);
  const ratios = Array.from({ length: 120 }, (_, i) =>
    i % 3 === 0 ? 320 / 180 : 180 / 260,
  );
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [390, 844],
    [1440, 900],
  ]) {
    const camera = cameraAt(1, width, height),
      composition = createOrbitComposition(orbit);
    let previous = new Map(),
      exits = 0,
      tracked = 0,
      reversals = 0,
      collisions = 0,
      duplicates = 0,
      minVisible = Infinity,
      maxVisible = 0,
      maxAlphaStep = 0;
    // Observe the actual responsive ending speed for 15 seconds at 30 fps,
    // including admission, continuous movement, fade and complete departures.
    for (let frame = 0; frame < 450; frame++) {
      const portraits = composition.update({
        camera,
        width,
        height,
        time: 7 + (frame / 30) * orbitRateAt(1, width),
        photoIds,
        ratios,
        now: 1000 + (frame / 30) * 1000,
        reduced: frame === 0,
      });
      const visible = portraits.filter((p) => p.alpha > 0.5);
      minVisible = Math.min(minVisible, visible.length);
      maxVisible = Math.max(maxVisible, visible.length);
      duplicates +=
        visible.length - new Set(visible.map((p) => photoIds[p.index])).size;
      for (let i = 0; i < visible.length; i++) {
        const photo = visible[i],
          before = previous.get(photo.index);
        if (before && before.alpha > 0.5) {
          if (photo.projected.x >= before.projected.x) reversals++;
          if (before.projected.x >= 0 && photo.projected.x < 0) exits++;
          maxAlphaStep = Math.max(
            maxAlphaStep,
            Math.abs(photo.alpha - before.alpha),
          );
          tracked++;
        }
        for (let j = i + 1; j < visible.length; j++)
          if (intersects(photo, visible[j], ratios, photoIds)) collisions++;
      }
      previous = new Map(portraits.map((p) => [p.index, p]));
    }
    expect(minVisible).toBeGreaterThanOrEqual(4);
    expect(maxVisible).toBeLessThanOrEqual(width < 700 ? 10 : 16);
    expect(duplicates).toBe(0);
    expect(collisions).toBe(0);
    expect(reversals).toBe(0);
    expect(maxAlphaStep).toBeLessThan(0.1);
    expect(tracked).toBeGreaterThan(1000);
    expect(exits).toBeGreaterThanOrEqual(1);
  }
});

test('phone endings show a modestly fuller selection while the middle keeps its original slow rotation', () => {
  for (const width of [320, 360, 390, 430]) {
    for (const progress of [0, .16, .3, .42, .7, .78])
      expect(orbitRateAt(progress, width)).toBe(orbitRateAt(progress, 1440));
    expect(orbitRateAt(1, width) / orbitRateAt(1, 1440)).toBeCloseTo(1.8);
    expect(orbitRateAt(1, width)).toBeLessThan(.05);
  }
  const orbit = createOrbit(), photoIds = assignOrbitPhotos(orbit, 120);
  const ratios = Array.from({ length: 120 }, (_, i) => i % 3 === 0 ? 320 / 180 : 180 / 260);
  for (const [width, height, average] of [[360, 640, 6], [390, 844, 8]]) {
    const camera = cameraAt(1, width, height), composition = createOrbitComposition(orbit);
    let total = 0;
    for (let frame = 0; frame < 150; frame++) {
      const visible = composition.update({ camera, width, height,
        time: 7 + frame / 30 * orbitRateAt(1, width), photoIds, ratios,
        now: 1000 + frame / 30 * 1000, reduced: frame === 0,
      }).filter(photo => photo.alpha > .5);
      expect(visible.length).toBeLessThanOrEqual(10);
      expect(new Set(visible.map(photo => photoIds[photo.index])).size).toBe(visible.length);
      total += visible.length;
    }
    expect(total / 150).toBeGreaterThan(average);
  }
  // Even skipping straight to the ending with the six default photo mounts
  // should leave a fuller selection, rather than just four oversized cards.
  const initial = createOrbitComposition(orbit).update({
    camera: cameraAt(1, 390, 844), width: 390, height: 844, time: 0,
    photoIds: assignOrbitPhotos(orbit, 6), ratios: Array(6).fill(.8), now: 1000, reduced: true,
  }).filter(photo => photo.alpha > .5);
  expect(initial.length).toBeGreaterThanOrEqual(5);
  expect(initial.length).toBeLessThanOrEqual(10);
});
