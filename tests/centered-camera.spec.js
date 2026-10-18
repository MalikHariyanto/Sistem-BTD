import { test, expect } from '@playwright/test';
import { cameraAt, ORBIT, ASPECT, photoShowcaseAt } from '../src/universe-camera.js';

test('the entire slow middle pass looks straight at the same centered Gargantua on phones and laptops', () => {
  for (const [width, height] of [[360, 640], [390, 844], [430, 932], [1280, 580], [1440, 900], [2560, 1080]]) {
    for (let i = 160; i <= 420; i++) {
      const progress = i / 1000, camera = cameraAt(progress, width, height);
      expect(camera.x + camera.width * .5).toBeCloseTo(width / 2, 7);
      expect(camera.y + camera.height * .445).toBeCloseTo(height / 2, 7);
      expect(camera.cx).toBe(0);
      if (photoShowcaseAt(progress) > .9) {
        expect(camera.centerX).toBe(width / 2);
        expect(camera.centerY).toBe(height / 2);
      }
    }
    // Both camera seams have zero added velocity: no snap entering the lock,
    // leaving slow motion or settling into the established final portraits.
    for (const progress of [.16, .42, .82]) {
      const before = cameraAt(progress - .00001, width, height), after = cameraAt(progress + .00001, width, height);
      expect(Math.abs(after.cx - before.cx)).toBeLessThan(.0001);
      expect(Math.abs(after.cy - before.cy)).toBeLessThan(.0001);
      expect(Math.abs(after.centerY - before.centerY)).toBeLessThan(.1);
    }
    const ending = cameraAt(1, width, height);
    expect(ending.cx).toBe(.24);
    expect(ending.cy).toBeCloseTo(.26 * .24 + ORBIT.tilt * .32 - .033);
    expect(ending.centerY).toBe(height / 2);
    // Arrival, magnification and photo identities retain the original timing.
    expect(ending.zoom).toBeCloseTo(5 / .115);
    expect(ending.height).toBeCloseTo(ending.width / ASPECT);
  }
});
