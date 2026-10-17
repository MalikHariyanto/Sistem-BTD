import { finishIntro } from "./helpers.js";
import { test, expect } from "@playwright/test";
import {
  cameraAt,
  createOrbit,
  orbitAt,
  projectOrbit,
  PARTICLE_COUNT,
  ease,
  journeyProgress,
  JOURNEY_MS,
  photoShowcaseAt,
  orbitRateAt,
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
    expect(after.radius).toBeLessThan(before.radius);
    expect(before.radius ** 2 - after.radius ** 2).toBeCloseTo(0.007, 7);
    expect(Math.hypot(after.x, after.depth)).toBeCloseTo(after.radius, 7);
    expect(after.seed).toBe(before.seed);
    expect(
      Math.hypot(after.x - before.x, after.depth - before.depth),
    ).toBeGreaterThan(0.03);
    expect(after.angle).toBeGreaterThan(before.angle);
  }
  expect(radii.size).toBeGreaterThan(200);
  expect(phases.size).toBeGreaterThan(200);
  const heights = Array.from(
    { length: PARTICLE_COUNT },
    (_, i) => data[i * 4 + 2],
  );
  // Real height differences, not just rotating a flat grid of photos.
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.05);
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
    [1440, 900],
    [2560, 1080],
  ]) {
    // Preserve the opening's original pull into Gargantua, then approach a
    // closer ending than the wide revision without overshooting or pulling back.
    for (const p of [0, 0.1, 0.2]) {
      expect(cameraAt(p, width, height).zoom).toBeCloseTo(
        Math.exp(Math.log(5 / 0.052) * ease(p)),
        8,
      );
    }
    expect(cameraAt(0.5, width, height).zoom).toBeGreaterThan(7);
    expect(cameraAt(1, width, height).zoom).toBeGreaterThan(40);
    expect(cameraAt(1, width, height).zoom).toBeLessThan(50);
    let previous = cameraAt(0, width, height);
    for (let i = 1; i <= 1000; i++) {
      const camera = cameraAt(i / 1000, width, height);
      expect(camera.zoom).toBeGreaterThanOrEqual(previous.zoom - 1e-9);
      // A perceptual zoom cannot surge in the final second of the flight.
      expect(camera.zoom / previous.zoom).toBeLessThan(1.01);
      // Focal widening must not quietly reverse the apparent zoom even when
      // the underlying camera distance continues to decrease.
      expect(camera.width).toBeGreaterThanOrEqual(previous.width - 1e-7);
      expect(camera.width / previous.width).toBeLessThan(1.012);
      expect(camera.distance).toBeGreaterThan(0.32);
      previous = camera;
    }
    const end = cameraAt(1, width, height);
    const apparent = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const point = projectOrbit(orbitAt(data, i, 10), end, width, height);
      if (point) apparent.push(point);
    }
    // The ending must remain a deep, busy disk instead of a few huge cards.
    expect(apparent.length).toBeGreaterThan(1000);
    expect(apparent.filter((p) => p.size < 16).length).toBeGreaterThan(1000);
    expect(apparent.filter((p) => p.size > 24).length).toBeGreaterThan(15);
    expect(Math.max(...apparent.map((p) => p.size))).toBeLessThanOrEqual(
      Math.min(190, width * 0.36),
    );
    const sizes = apparent.map((p) => p.size);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(8); // depth, not one wall
    expect(cameraAt(0.001, width, height).zoom - 1).toBeLessThan(0.00001);
    expect(end.zoom - cameraAt(0.999, width, height).zoom).toBeLessThan(
      0.00001,
    );
  }
});

test("the crowded middle has a moving viewing interval while opening and ending keep their pacing", () => {
  expect(journeyProgress(0)).toBe(0);
  expect(journeyProgress(JOURNEY_MS)).toBe(1);
  let previous = 0,
    highlightedMs = 0;
  for (let elapsed = 10; elapsed < JOURNEY_MS; elapsed += 10) {
    const p = journeyProgress(elapsed);
    if (p <= previous)
      throw Error("The camera stopped or reversed during the flight");
    if (photoShowcaseAt(p) > 0.9) highlightedMs += 10;
    previous = p;
  }
  // The opening clock is unchanged; after the viewing interval, the same final
  // camera path and idle rotation are reached without a cut or a hard pause.
  expect(journeyProgress(1720)).toBeCloseTo(0.2, 6);
  expect(highlightedMs).toBeGreaterThan(4000);
  expect(highlightedMs).toBeLessThan(5000);
  expect(journeyProgress(5500) - journeyProgress(3500)).toBeGreaterThan(0.02);
  expect(journeyProgress(5500) - journeyProgress(3500)).toBeLessThan(0.04);
  expect(photoShowcaseAt(0)).toBe(0);
  expect(photoShowcaseAt(1)).toBe(0);
  expect(orbitRateAt(0)).toBe(1);
  expect(orbitRateAt(0.3)).toBe(1);
  expect(orbitRateAt(1)).toBeCloseTo(0.025, 8);
  for (const [width, height] of [
    [390, 664],
    [1440, 900],
  ]) {
    for (const p of [0.26, 0.3, 0.34, 0.36]) {
      const camera = cameraAt(p, width, height);
      expect(camera.x + camera.width * 0.5).toBeGreaterThan(0);
      expect(camera.x + camera.width * 0.5).toBeLessThan(width);
      expect(camera.y + camera.height * 0.43).toBeGreaterThan(0);
      expect(camera.y + camera.height * 0.43).toBeLessThan(height);
    }
    expect(
      cameraAt(0.36, width, height).viewAngle -
        cameraAt(0.24, width, height).viewAngle,
    ).toBeGreaterThan(0.5);
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
  await finishIntro(page);
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
  await finishIntro(page);
  await expect(page.locator("#reveal-copy")).toBeVisible();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
});

for (const renderer of ["webgl", "canvas2d"]) {
  test(`${renderer}: original photo edges, orientation and distinct colors survive the close-up`, async ({
    page,
  }) => {
    if (renderer === "canvas2d")
      await page.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === "webgl" || kind === "webgl2"
            ? null
            : get.call(this, kind, ...args);
        };
      });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#universe")).toHaveAttribute(
      "data-renderer",
      renderer,
    );
    await expect(page.locator("#universe")).toHaveAttribute(
      "data-photo-sources",
      "0",
    );
    await page.evaluate(() => {
      const sources = [
        [300, 100, "#00ffff"],
        [100, 300, "#ff00ff"],
      ].map(([width, height, color]) => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        // These outer edges disappeared entirely under the old centered crop.
        ctx.fillStyle = "#00ff00";
        if (width > height) {
          ctx.fillRect(0, 0, 24, height);
          ctx.fillRect(width - 24, 0, 24, height);
        } else {
          ctx.fillRect(0, 0, width, 24);
          ctx.fillRect(0, height - 24, width, 24);
        }
        return c.toDataURL();
      });
      window.dispatchEvent(
        new CustomEvent("photoschanged", { detail: sources }),
      );
    });
    await expect(page.locator("#universe")).toHaveAttribute(
      "data-photo-sources",
      "2",
    );
    await page.locator("#begin").click();
    await finishIntro(page);
    await expect(page.locator("#reveal-title")).toBeVisible();
    const result = await page.locator("#universe").evaluate((c) => {
      const ctx = c.getContext("2d"),
        gl = ctx ? null : c.getContext("webgl");
      let pixels,
        edgeSamples = [];
      if (ctx) pixels = ctx.getImageData(0, 0, c.width, c.height).data;
      else {
        pixels = new Uint8Array(c.width * c.height * 4);
        gl.readPixels(
          0,
          0,
          c.width,
          c.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );
        const binding = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          gl.getParameter(gl.TEXTURE_BINDING_2D),
          0,
        );
        const tile = Number(c.dataset.atlasTile),
          tileHeight = tile * 1.25;
        for (const [x, y] of [
          [tile * 0.04, tileHeight * 0.5],
          [tile * 0.96, tileHeight * 0.5],
          [tile * 1.5, tileHeight * 0.04],
          [tile * 1.5, tileHeight * 0.96],
        ]) {
          const sample = new Uint8Array(4);
          gl.readPixels(
            Math.floor(x),
            Math.floor(y),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            sample,
          );
          edgeSamples.push([...sample]);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, binding);
        gl.deleteFramebuffer(framebuffer);
      }
      const width = c.width,
        height = c.height,
        labels = new Uint8Array(width * height);
      for (let i = 0; i < labels.length; i++) {
        const [r, g, b] = pixels.subarray(i * 4, i * 4 + 3);
        if (g > r + 50 && b > r + 50 && g > 80) labels[i] = 1;
        else if (r > g + 50 && b > g + 50 && r > 80) labels[i] = 2;
      }
      const queue = new Uint32Array(labels.length),
        shapes = [];
      for (let i = 0; i < labels.length; i++) {
        const color = labels[i];
        if (!color) continue;
        let head = 0,
          tail = 1,
          minX = width,
          maxX = 0,
          minY = height,
          maxY = 0;
        queue[0] = i;
        labels[i] = 0;
        while (head < tail) {
          const index = queue[head++],
            x = index % width,
            y = Math.floor(index / width);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          const neighbors = [];
          if (x) neighbors.push(index - 1);
          if (x < width - 1) neighbors.push(index + 1);
          if (y) neighbors.push(index - width);
          if (y < height - 1) neighbors.push(index + width);
          for (const next of neighbors)
            if (labels[next] === color) {
              labels[next] = 0;
              queue[tail++] = next;
            }
        }
        if (tail > 30)
          shapes.push({ color, ratio: (maxX - minX + 1) / (maxY - minY + 1) });
      }
      return { shapes, edgeSamples, error: gl?.getError() };
    });
    // Sparse portraits must preserve both original shapes and colors, without
    // requiring repeated copies of the same photo to fill the screen.
    expect(
      result.shapes.filter((s) => s.color === 1 && s.ratio > 1.5).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      result.shapes.filter((s) => s.color === 2 && s.ratio < 1 / 1.5).length,
    ).toBeGreaterThanOrEqual(1);
    if (renderer === "webgl") {
      expect(result.error).toBe(0);
      for (const [r, g, b] of result.edgeSamples) {
        expect(g).toBeGreaterThan(200);
        expect(r).toBeLessThan(30);
        expect(b).toBeLessThan(30);
      }
    }
  });
}
