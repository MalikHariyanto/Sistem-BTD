import { installGift, orbitFixtures } from "./gift-fixtures.js";
import { test, expect } from "@playwright/test";
import { content, ORBIT_PHOTO_COUNT } from "../src/content.js";
import { createOrbit, orbitAt } from "../src/universe-camera.js";
import { assignOrbitPhotos, planPhotoAtlas } from "../src/photo-textures.js";

// The old renderer sampled with replacement, producing duplicates side by side.
function neighborRepeats(orbit, ids, time) {
  const buckets = new Map(),
    cell = 0.012;
  let pairs = 0,
    repeats = 0;
  for (let i = 0; i < ids.length; i++) {
    const { x, depth: z } = orbitAt(orbit, i, time),
      cx = Math.floor((x + 1) / cell),
      cz = Math.floor((z + 1) / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        for (const p of buckets.get((cx + dx) * 256 + cz + dz) || [])
          if ((x - p.x) ** 2 + (z - p.z) ** 2 < cell * cell) {
            pairs++;
            if (ids[i] === ids[p.i]) repeats++;
          }
      }
    const key = cx * 256 + cz;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ x, z, i });
  }
  return { pairs, repeats };
}

test("photo assignment reduces close duplicates, balances the full library and stays stable", () => {
  expect(ORBIT_PHOTO_COUNT).toBe(200);
  expect(Object.keys(content.photos)).toHaveLength(209);
  expect(content.photos).toHaveProperty("orbit24");
  expect(content.photos).toHaveProperty("orbit120");
  expect(content.photos).toHaveProperty("orbit200");
  const orbit = createOrbit(),
    assigned = assignOrbitPhotos(orbit, 209);
  const old = Float32Array.from({ length: assigned.length }, (_, i) =>
    Math.floor(orbit[i * 4 + 3] * 209),
  );
  const uses = new Array(209).fill(0);
  for (const id of assigned) uses[id]++;
  expect(Math.min(...uses)).toBeGreaterThan(0);
  expect(Math.max(...uses) - Math.min(...uses)).toBeLessThan(40);
  for (const time of [0, 10, 25]) {
    const baseline = neighborRepeats(orbit, old, time),
      current = neighborRepeats(orbit, assigned, time);
    expect(baseline.repeats).toBeGreaterThan(100);
    expect(current.repeats).toBeLessThan(baseline.repeats * 0.35);
  }
  expect(assignOrbitPhotos(orbit, 209)).toEqual(assigned);
  expect([...assignOrbitPhotos(createOrbit(32), 1)]).toEqual(
    new Array(32).fill(0),
  );
  for (const maxSize of [1024, 2048, 4096, 8192]) {
    const atlas = planPhotoAtlas(209, maxSize);
    expect(atlas.width).toBeLessThanOrEqual(maxSize);
    expect(atlas.height).toBeLessThanOrEqual(maxSize);
    expect(atlas.width * atlas.height).toBeLessThanOrEqual(8_000_000);
    expect(atlas.columns * atlas.rows).toBeGreaterThanOrEqual(209);
  }
});

test("all 200 code-configured orbit photos survive reload and fit a valid WebGL atlas", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installGift(page, { photos: orbitFixtures(200) });
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute("data-photo-sources", "200", { timeout: 20000 });
  await page.reload();
  await expect(page.locator("#universe")).toHaveAttribute("data-photo-sources", "200", { timeout: 20000 });
  const atlas = await page.locator("#universe").evaluate(canvas => {
    const gl = canvas.getContext("webgl");
    return { error: gl.getError(), size: gl.getParameter(gl.MAX_TEXTURE_SIZE), width: Number(canvas.dataset.atlasWidth), height: Number(canvas.dataset.atlasHeight) };
  });
  expect(atlas.error).toBe(0);
  expect(atlas.width).toBeLessThanOrEqual(atlas.size);
  expect(atlas.height).toBeLessThanOrEqual(atlas.size);
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#reveal-title")).toBeVisible();
  const bins = await page.locator("#universe").evaluate(canvas => {
    const gl = canvas.getContext("webgl"), pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const hues = new Set();
    for (let i = 0; i < pixels.length; i += 16) {
      const [r,g,b] = pixels.slice(i,i+3), max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
      if (d < 45 || max < 70) continue;
      const hue = max === r ? (g-b)/d : max === g ? 2+(b-r)/d : 4+(r-g)/d;
      hues.add(Math.floor(((hue*60+360)%360)/30));
    }
    return hues.size;
  });
  expect(bins).toBeGreaterThanOrEqual(6);
  await expect(page.locator('input[type="file"], #editor-dialog, #open-editor')).toHaveCount(0);
});
