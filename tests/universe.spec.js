import { test, expect } from "@playwright/test";
import { cameraAt, DISK, diskY } from "../src/universe-camera.js";

// Physical continuity matters here: the photographs are coordinates on the disk,
// not detached sprites whose positions are interpolated into a new wall.
test("camera ends inside the same accretion plane without revealing distant photo tiles", () => {
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
    [1440, 900],
    [2560, 1080],
  ]) {
    let previous = 1;
    for (let i = 0; i <= 1000; i++) {
      const camera = cameraAt(i / 1000, width, height);
      expect(camera.zoom).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(camera.photoMix).toBeGreaterThanOrEqual(0);
      expect(camera.photoMix).toBeLessThanOrEqual(1);
      if (camera.zoom <= 3.2) expect(camera.photoMix).toBe(0);
      previous = camera.zoom;
    }
    const end = cameraAt(1, width, height);
    expect(end.photoMix).toBe(1);
    for (const x of [0, width / 2, width])
      for (const y of [0, height / 2, height]) {
        const u = (x - end.x) / end.width,
          v = (y - end.y) / end.height;
        expect(Math.abs(v - diskY(u))).toBeLessThan(DISK.halfWidth);
      }
    // No camera velocity kick at the start or sudden stop at the greeting.
    expect(cameraAt(0.001, width, height).zoom - 1).toBeLessThan(0.00001);
    expect(16 - cameraAt(0.999, width, height).zoom).toBeLessThan(0.00001);
  }
});

test("HD plate stays photograph-only from a distance, uploaded photos resolve on approach", async ({
  page,
}) => {
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
    "data-visible-photos",
    "0",
  );
  const fingerprint = () =>
    page.locator("#universe").evaluate((c) => {
      const data = c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height).data;
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += 16)
        hash = Math.imul(hash ^ data[i], 16777619);
      return hash;
    });
  const before = await fingerprint();
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
  await page
    .locator('[data-upload="hero"]')
    .setInputFiles({
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
  expect(await fingerprint()).toBe(before);
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-photo-mix",
    "1.0000",
  );
  const cyan = await page.locator("#universe").evaluate((c) => {
    const p = c.getContext("2d");
    let matching = 0;
    for (const x of [0.2, 0.4, 0.6, 0.8])
      for (const y of [0.2, 0.4, 0.6, 0.8]) {
        const [r, g, b] = p.getImageData(
          Math.round(c.width * x),
          Math.round(c.height * y),
          1,
          1,
        ).data;
        if (g > r + 35 && b > r + 35) matching++;
      }
    return matching;
  });
  expect(cyan).toBeGreaterThanOrEqual(12);
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
