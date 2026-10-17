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
  expect(ORBIT_PHOTO_COUNT).toBe(120);
  expect(Object.keys(content.photos)).toHaveLength(129);
  expect(content.photos).toHaveProperty("orbit24");
  expect(content.photos).toHaveProperty("orbit120");
  const orbit = createOrbit(),
    assigned = assignOrbitPhotos(orbit, 129);
  const old = Float32Array.from({ length: assigned.length }, (_, i) =>
    Math.floor(orbit[i * 4 + 3] * 129),
  );
  const uses = new Array(129).fill(0);
  for (const id of assigned) uses[id]++;
  expect(Math.min(...uses)).toBeGreaterThan(0);
  expect(Math.max(...uses) - Math.min(...uses)).toBeLessThan(40);
  for (const time of [0, 10, 25]) {
    const baseline = neighborRepeats(orbit, old, time),
      current = neighborRepeats(orbit, assigned, time);
    expect(baseline.repeats).toBeGreaterThan(100);
    expect(current.repeats).toBeLessThan(baseline.repeats * 0.35);
  }
  expect(assignOrbitPhotos(orbit, 129)).toEqual(assigned);
  expect([...assignOrbitPhotos(createOrbit(32), 1)]).toEqual(
    new Array(32).fill(0),
  );
  for (const maxSize of [1024, 2048, 4096, 8192]) {
    const atlas = planPhotoAtlas(129, maxSize);
    expect(atlas.width).toBeLessThanOrEqual(maxSize);
    expect(atlas.height).toBeLessThanOrEqual(maxSize);
    expect(atlas.width * atlas.height).toBeLessThanOrEqual(8_000_000);
    expect(atlas.columns * atlas.rows).toBeGreaterThanOrEqual(129);
  }
});

test("all 120 orbit inputs upload in a batch, persist and fit a valid WebGL atlas", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#open-editor").click();
  await expect(page.locator("[data-upload]")).toHaveCount(129);
  const photos = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 100;
    const p = c.getContext("2d");
    return Array.from({ length: 120 }, (_, i) => {
      p.fillStyle = `hsl(${(i * 137.5) % 360} 100% 50%)`;
      p.fillRect(0, 0, 80, 100);
      return c.toDataURL().split(",")[1];
    });
  });
  const buffer = Buffer.from(photos[0], "base64");
  await page.locator("#bulk-photos").setInputFiles(
    Array.from({ length: 120 }, (_, i) => ({
      name: `memory-${i + 1}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(photos[i], "base64"),
    })),
  );
  await expect(page.locator("#editor-status")).toHaveText(
    "120 foto tersimpan.",
    { timeout: 40000 },
  );
  await expect(page.locator("#photo-count")).toHaveText(
    "120 foto terisi · 9 tempat kosong",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-sources",
    "120",
    { timeout: 15000 },
  );
  await page.reload();
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-sources",
    "120",
    { timeout: 15000 },
  );
  expect(
    await page.locator("#universe").evaluate((c) => {
      const gl = c.getContext("webgl");
      return {
        error: gl.getError(),
        size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        width: Number(c.dataset.atlasWidth),
        height: Number(c.dataset.atlasHeight),
      };
    }),
  ).toMatchObject({ error: 0 });
  await page.locator("#open-editor").click();
  await page.getByText("Atur masing-masing foto", { exact: true }).click();
  await page
    .locator('[data-upload="hero"]')
    .setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer });
  await expect(page.locator("#editor-status")).toContainText("Foto tersimpan");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-sources",
    "121",
  );
  await page.keyboard.press("Escape");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#reveal-title")).toBeVisible();
  expect(
    await page
      .locator("#universe")
      .evaluate((c) => c.getContext("webgl").getError()),
  ).toBe(0);
  const hueBins = await page.locator("#universe").evaluate((c) => {
    const gl = c.getContext("webgl"),
      pixels = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const bins = new Set();
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min;
      if (d < 45 || max < 70) continue;
      const h =
        max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d;
      bins.add(Math.floor(((h * 60 + 360) % 360) / 30));
    }
    return bins.size;
  });
  // Distinct uploaded colors must reach the screen, not just the atlas count.
  expect(hueBins).toBeGreaterThanOrEqual(6);
});
