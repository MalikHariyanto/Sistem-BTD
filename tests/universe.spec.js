import { test, expect } from "@playwright/test";
import {
  cameraAt,
  createOrbit,
  orbitAt,
  projectOrbit,
  PARTICLE_COUNT,
} from "../src/universe-camera.js";

test("a dense physical annulus rotates differentially, retaining its identities through a smooth camera flight", () => {
  const data = createOrbit();
  expect(data.length / 4).toBe(32768);
  const radii = new Set(),
    phases = new Set();
  for (let i = 0; i < PARTICLE_COUNT; i += 137) {
    const before = orbitAt(data, i, 0),
      after = orbitAt(data, i, 10);
    radii.add(before.radius);
    phases.add(before.angle);
    expect(Math.hypot(after.x, after.depth)).toBeCloseTo(before.radius, 7);
    expect(after.seed).toBe(before.seed);
    expect(
      Math.hypot(after.x - before.x, after.depth - before.depth),
    ).toBeGreaterThan(0.03);
    expect(after.angle).toBeGreaterThan(before.angle);
  }
  expect(radii.size).toBeGreaterThan(200);
  expect(phases.size).toBeGreaterThan(200);
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
    [1440, 900],
    [2560, 1080],
  ]) {
    let previous = cameraAt(0, width, height);
    for (let i = 1; i <= 1000; i++) {
      const camera = cameraAt(i / 1000, width, height);
      expect(camera.zoom).toBeGreaterThanOrEqual(previous.zoom - 1e-9);
      // A perceptual zoom cannot surge in the final second of the flight.
      expect(camera.zoom / previous.zoom).toBeLessThan(1.01);
      expect(camera.distance).toBeGreaterThan(0.32);
      previous = camera;
    }
    const end = cameraAt(1, width, height);
    const apparent = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const point = projectOrbit(orbitAt(data, i, 10), end, width, height);
      if (point) apparent.push(point);
    }
    expect(apparent.length).toBeGreaterThan(30);
    expect(apparent.some((p) => p.size > 75)).toBe(true);
    const sizes = apparent.map((p) => p.size);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(2); // depth, not one wall
    expect(cameraAt(0.001, width, height).zoom - 1).toBeLessThan(0.00001);
    expect(end.zoom - cameraAt(0.999, width, height).zoom).toBeLessThan(
      0.00001,
    );
  }
});

test("uploaded photos form the live accretion disk and resolve through perspective on approach", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-plate",
    "ready",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-detail",
    "ready",
  );
  expect(
    Number(await page.locator("#universe").getAttribute("data-plate-width")),
  ).toBeGreaterThanOrEqual(1600);
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-mix",
    "0.0000",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-fragments",
    "32768",
  );
  const fingerprint = () =>
    page.locator("#universe").evaluate((c) => {
      const ctx = c.getContext("2d");
      let data;
      if (ctx) data = ctx.getImageData(0, 0, c.width, c.height).data;
      else {
        const gl = c.getContext("webgl");
        data = new Uint8Array(c.width * c.height * 4);
        gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      }
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += 16)
        hash = Math.imul(hash ^ data[i], 16777619);
      return hash;
    });

  await page.locator("#open-editor").click();
  const photo = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 400;
    const p = c.getContext("2d");
    p.fillStyle = "#00ffff";
    p.fillRect(0, 0, 300, 400);
    return c.toDataURL().split(",")[1];
  });
  await page.getByText("Atur masing-masing foto", { exact: true }).click();
  await page.locator('[data-upload="hero"]').setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(photo, "base64"),
  });
  await expect(page.locator("#editor-status")).toContainText("Foto tersimpan");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-sources",
    "1",
  );
  await page.keyboard.press("Escape");
  expect(await fingerprint()).toEqual(expect.any(Number));
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-mix",
    "1.0000",
  );
  const cyan = await page.locator("#universe").evaluate((c) => {
    const p = c.getContext("2d"),
      gl = p ? null : c.getContext("webgl");
    let data;
    if (p) data = p.getImageData(0, 0, c.width, c.height).data;
    else {
      data = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    let matching = 0;
    for (let i = 0; i < data.length; i += 16)
      if (data[i + 1] > data[i] + 35 && data[i + 2] > data[i] + 35) matching++;
    return matching / (data.length / 16);
  });
  expect(cyan).toBeGreaterThan(0.08);
  expect(
    await page.locator("#universe").evaluate((c) => c.width / c.clientWidth),
  ).toBeGreaterThanOrEqual(1);
});

test("missing art has a non-blocking fallback, and the gift still opens", async ({
  page,
}) => {
  await page.route("**/art/gargantua*.webp", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-plate",
    "fallback",
  );
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#reveal-copy")).toBeVisible();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
});
