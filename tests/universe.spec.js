import { finishIntro } from "./helpers.js";
import { test, expect } from "@playwright/test";

test("the gift uses only the instanced scene, loads no photographic black-hole backdrops and opens normally", async ({
  page,
}) => {
  const plateRequests = [],
    errors = [];
  page.on("request", (request) => {
    if (/art\/gargantua/.test(request.url())) plateRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-renderer",
    "three-instanced",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-fragments",
    "5000",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-horizon-count",
    "1",
  );
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-disk-count",
    "1",
  );
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#reveal-title")).toBeVisible();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  expect(plateRequests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const renderer of ["three-instanced", "canvas2d"])
  test(`${renderer}: uploaded photos retain native portrait/landscape shapes and distinct colors`, async ({
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
      "data-ready",
      "true",
      { timeout: 20000 },
    );
    await page.evaluate(() => {
      const sources = Array.from({ length: 2 }, (_, i) => {
        const c = document.createElement("canvas");
        c.width = i ? 100 : 300;
        c.height = i ? 300 : 100;
        const ctx = c.getContext("2d");
        ctx.fillStyle = i ? "#ff00ff" : "#00ffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(0, 0, 8, c.height);
        ctx.fillRect(c.width - 8, 0, 8, c.height);
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
        gl = ctx ? null : c.getContext("webgl2");
      let pixels;
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
      }
      const width = c.width,
        height = c.height,
        labels = new Uint8Array(width * height);
      let cyan = 0,
        magenta = 0,
        green = 0;
      for (let i = 0; i < labels.length; i++) {
        const r = pixels[i * 4],
          g = pixels[i * 4 + 1],
          b = pixels[i * 4 + 2];
        if (g > r + 50 && b > r + 50 && g > 80) {
          labels[i] = 1;
          cyan++;
        } else if (r > g + 50 && b > g + 50 && r > 80) {
          labels[i] = 2;
          magenta++;
        }
        if (g > r + 70 && g > b + 70) green++;
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
          const at = queue[head++],
            x = at % width,
            y = Math.floor(at / width);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          const neighbors = [];
          if (x) neighbors.push(at - 1);
          if (x < width - 1) neighbors.push(at + 1);
          if (y) neighbors.push(at - width);
          if (y < height - 1) neighbors.push(at + width);
          for (const next of neighbors)
            if (labels[next] === color) {
              labels[next] = 0;
              queue[tail++] = next;
            }
        }
        if (tail > 50)
          shapes.push({ color, ratio: (maxX - minX + 1) / (maxY - minY + 1) });
      }
      return { cyan, magenta, green, shapes, error: gl?.getError() || 0 };
    });
    expect(result.error).toBe(0);
    expect(result.cyan).toBeGreaterThan(300);
    expect(result.magenta).toBeGreaterThan(300);
    expect(result.green).toBeGreaterThan(50);
    expect(result.shapes.some((s) => s.color === 1 && s.ratio > 1.5)).toBe(
      true,
    );
    expect(result.shapes.some((s) => s.color === 2 && s.ratio < 1 / 1.5)).toBe(
      true,
    );
  });

test("the Canvas fallback uses the full collection when it contains 37 photos", async ({
  page,
}) => {
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
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await page.evaluate(() => {
    const images = Array.from({ length: 37 }, (_, i) => {
      const c = document.createElement("canvas");
      c.width = 80;
      c.height = 100;
      const ctx = c.getContext("2d");
      ctx.fillStyle = `hsl(${(i * 137.5) % 360} 100% 50%)`;
      ctx.fillRect(0, 0, 80, 100);
      return c.toDataURL();
    });
    window.dispatchEvent(new CustomEvent("photoschanged", { detail: images }));
  });
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-sources",
    "37",
  );
  await page.locator("#begin").click();
  await finishIntro(page);
  const bins = await page.locator("#universe").evaluate((canvas) => {
    const data = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data,
      bins = new Set();
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        max = Math.max(r, g, b),
        d = max - Math.min(r, g, b);
      if (d < 60 || max < 100) continue;
      const h =
        max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d;
      bins.add(Math.floor(((h * 60 + 360) % 360) / 30));
    }
    return bins.size;
  });
  expect(bins).toBeGreaterThanOrEqual(7);
});

test("skipping while the lazy 3D module is loading preserves the story and a valid renderer on replay", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/src/GargantuaScene.jsx", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/");
  await page.locator("#begin").click();
  await finishIntro(page);
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  release();
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await page.locator("#home-link").click();
  await expect(page.locator("#cover-copy")).toBeVisible();
  await expect
    .poll(
      () =>
        page.locator("#universe").evaluate((canvas) => {
          const gl = canvas.getContext("webgl2");
          if (!gl || canvas.width < 1 || canvas.height < 1) return false;
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          let light = false;
          for (let i = 0; i < pixels.length; i += 16)
            if (pixels[i] > 80) {
              light = true;
              break;
            }
          return gl.getError() === 0 && light;
        }),
      { timeout: 15000 },
    )
    .toBe(true);
});
