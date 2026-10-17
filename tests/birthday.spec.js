import { finishIntro } from "./helpers.js";
import { test, expect } from "@playwright/test";

async function chapter(page, label) {
  await page.getByRole("button", { name: `Ke ${label}`, exact: true }).click();
  await expect(page.locator(".scene.is-active")).toHaveAttribute(
    "aria-labelledby",
    {
      "Hari lahirmu": "dedication-title",
      "Bait untukmu": "poem-title",
      "Tiga doa": "quote-heading",
      Suratku: "letter-heading",
      "Nada kita": "music-title",
      "Satu harapan": "wish-title",
    }[label],
  );
}
async function enter(page) {
  await page.goto("/");
  await page.locator("#begin").click();
  await finishIntro(page);
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
}

test("camera move contains no greeting or countdown; dense photos settle before words appear", async ({
  page,
}) => {
  test.setTimeout(45000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#universe")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  // Sample inside the browser on every frame. Several protocol round trips can
  // otherwise miss the entire middle interval on a software WebGL renderer.
  await page.evaluate(() => {
    window.__flightSamples = [];
    function sample() {
      const canvas = document.querySelector("#universe"),
        phase = document.querySelector("#semesta").dataset.phase;
      if (phase === "traveling")
        window.__flightSamples.push({
          p: Number(canvas.dataset.progress),
          showcase: Number(canvas.dataset.photoShowcase),
          eye: canvas.dataset.cameraPosition.split(",").map(Number),
          wordsHidden:
            document.querySelector("#cover-copy").hidden &&
            document.querySelector("#reveal-copy").hidden &&
            document.querySelector("#intro-count").hidden,
          fragments: Number(canvas.dataset.fragments),
        });
      if (phase !== "revealed") requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.locator("#begin").click();
  await expect(page.locator("#semesta")).toHaveAttribute(
    "data-phase",
    "revealed",
    { timeout: 22000 },
  );
  const samples = await page.evaluate(() => window.__flightSamples);
  expect(samples.length).toBeGreaterThan(10);
  expect(samples.every((s) => s.wordsHidden && s.fragments === 5000)).toBe(
    true,
  );
  const middle = samples.filter((s) => s.showcase > 0.95);
  expect(middle.length).toBeGreaterThan(2);
  expect(middle.at(-1).p).toBeGreaterThan(middle[0].p);
  expect(
    Math.hypot(...middle.at(-1).eye.map((v, i) => v - middle[0].eye[i])),
  ).toBeGreaterThan(0.01);
  await expect(page.locator("#reveal-title")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});

test("chapters dissolve without content modals; poems and sourced wishes can be read", async ({
  page,
}) => {
  await enter(page);
  await expect(page.locator(".memory-constellation .photo-slot")).toHaveCount(
    5,
  );
  await page.locator("#next-scene").click();
  await expect(page.locator('[data-scene="2"]')).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Puisi selanjutnya" }).click();
  await expect(page.locator("#poem-title")).toHaveText("Hal-hal Kecil");
  await page.getByRole("button", { name: "Puisi sebelumnya" }).click();
  await expect(page.locator("#poem-title")).toHaveText("Gravitasi");
  await chapter(page, "Tiga doa");
  await page
    .getByRole("button", { name: "Mekarkan doa: Bahagia", exact: true })
    .click();
  await expect(page.locator("#garden-wish-0")).toContainText(
    "Semoga usia barumu",
  );
  await page.locator("#garden-wish-0 summary").click();
  await expect(page.locator("#garden-wish-0 a")).toHaveAttribute(
    "href",
    "https://www.gutenberg.org/ebooks/16950",
  );
  await page
    .getByRole("button", { name: "Mekarkan doa: Bertumbuh", exact: true })
    .click();
  await expect(page.locator("#garden-wish-1")).toContainText(
    "Bertambahlah usia",
  );
  await page
    .getByRole("button", { name: "Mekarkan doa: Dicintai", exact: true })
    .click();
  await expect(page.locator("#garden-wish-2")).toContainText("Emily Dickinson");
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  await expect(page.locator("dialog")).toHaveCount(1); // Editor only, never part of the gift.
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("[data-scene]:not([hidden])")).toHaveCount(1);
  await expect(page.locator('[data-scene="2"]')).toHaveAttribute("inert", "");
});

test("letter opens in place and pages; opening music continues into later chapters", async ({
  page,
}) => {
  await enter(page);
  await chapter(page, "Suratku");
  await page
    .getByRole("button", { name: "Buka surat untukmu", exact: true })
    .click();
  await expect(page.locator("#letter-reading")).toBeVisible();
  await expect(page.locator("#letter-paragraph")).toContainText(
    "Selamat ulang tahun",
  );
  await page.getByRole("button", { name: "Halaman surat selanjutnya" }).click();
  await expect(page.locator("#letter-position")).toHaveText("2 / 4");
  await expect(page.locator("#letter-paragraph")).toContainText(
    "Aku tidak bisa menjanjikan",
  );
  await chapter(page, "Nada kita");
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-track="0"]').click();
  await expect(page.locator("#track-status")).toContainText("belum diisi");
  await page.locator("#sound-toggle").click();
  await page.locator("#ambient-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("birthday finale has explicit wish steps and a large working blow button", async ({
  page,
}) => {
  await enter(page);
  await chapter(page, "Satu harapan");
  await expect(page.locator("#cake")).toBeVisible();
  await expect(page.locator("#blow-candle")).toBeHidden();
  await page.getByRole("button", { name: "Aku siap buat harapan" }).click();
  const blow = page.getByRole("button", {
    name: "Tiup lilinnya",
    exact: false,
  });
  await expect(blow).toBeVisible();
  await expect(page.locator("#wish-hint")).toContainText(
    "Tidak perlu meniup layar",
  );
  const box = await blow.boundingBox();
  const cakeWidth = (await page.locator("#cake").boundingBox()).width;
  // Transformed DOM rectangles can report 47.99997 for a 48px target.
  expect(Math.round(box.height * 1000) / 1000).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThanOrEqual(250);
  expect(
    await blow.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom < innerHeight - 90;
    }),
  ).toBe(true);
  await blow.click();
  await expect(page.locator("#cake")).toHaveClass(/blown/);
  await page.waitForTimeout(1400);
  expect((await page.locator("#cake").boundingBox()).width).toBeCloseTo(
    cakeWidth,
    0,
  );
  await expect(page.locator("#wish-result")).toBeVisible({ timeout: 6000 });
  await expect(page.locator("#birthday-title")).toContainText("Happy birthday");
  await expect(page.locator("#birthday-title")).toBeFocused({ timeout: 3000 });
  await page.getByRole("button", { name: "Buat harapan lagi" }).click();
  await expect(page.locator("#cake")).toBeVisible();
  await expect(page.locator("#cake")).not.toHaveClass(/blown/);
  await expect(page.locator("#ready-wish")).toBeVisible();
});

test("replay cancels an unfinished celebration and resets the story", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await chapter(page, "Bait untukmu");
  await page.locator("#next-poem").click();
  await expect(page.locator("#poem-title")).toHaveText("Hal-hal Kecil");
  await chapter(page, "Satu harapan");
  await page.locator("#ready-wish").click();
  await page.locator("#blow-candle").click();
  await page.locator("#home-link").click();
  await expect(page.locator("#cover-copy")).toBeVisible();
  await page.waitForTimeout(250);
  await page.locator("#begin").click();
  await finishIntro(page);
  await page.locator("#enter-story").click();
  await chapter(page, "Bait untukmu");
  await expect(page.locator("#poem-title")).toHaveText("Gravitasi");
  await chapter(page, "Satu harapan");
  await expect(page.locator("#ready-wish")).toBeVisible();
  await expect(page.locator("#cake")).toBeVisible();
  await expect(page.locator("#cake")).not.toHaveClass(/blown/);
  await expect(page.locator("#wish-result")).toBeHidden();
});

test("129 photo slots and bulk uploads persist, with old photo keys preserved", async ({
  page,
}) => {
  test.setTimeout(45000); // Multiple uploads, reloads, and scene transitions on software GPU.
  await page.goto("/");
  await page.locator("#open-editor").click();
  await expect(page.locator("[data-upload]")).toHaveCount(129);
  await page.getByRole("textbox", { name: "Nama panggilan" }).fill("Sayang");
  await page.locator('input[name="birthday"]').fill("2099-02-14T00:00");
  await page.getByRole("button", { name: "Simpan nama & tanggal" }).click();
  await expect(page.locator("#editor-status")).toContainText(
    "Nama & tanggal tersimpan",
  );
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 160;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#9b7253";
    ctx.fillRect(0, 0, 120, 160);
    return c.toDataURL().split(",")[1];
  });
  const fixture = {
    name: "memory.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
  await page
    .locator("#bulk-photos")
    .setInputFiles([fixture, { ...fixture, name: "memory2.png" }]);
  await expect(page.locator("#editor-status")).toHaveText("2 foto tersimpan.");
  await page.getByText("Atur masing-masing foto", { exact: true }).click();
  await page.locator('[data-upload="hero"]').setInputFiles(fixture);
  await expect(page.locator("#editor-status")).toContainText("Foto tersimpan");
  await page.reload();
  await expect(page.locator("#birthday-countdown")).toContainText(
    "Menuju hari spesialmu",
  );
  await page.locator("#begin").click();
  await finishIntro(page);
  await page.locator("#enter-story").click();
  await expect(page.locator(".dedication-copy [data-recipient]")).toHaveText(
    "Sayang",
  );
  await expect(page.locator('[data-photo="orbit01"]')).toHaveClass(/has-photo/);
  await chapter(page, "Suratku");
  await page.locator("#open-letter").click();
  await expect(page.locator('[data-photo="hero"] img')).toBeVisible();
  await page.locator("#open-editor").click();
  await page.locator("#reset-local").click();
  await expect(page.locator("#editor-status")).toContainText(
    "Semua isian lokal dihapus",
  );
  await page.reload();
  await expect(page.locator("#birthday-countdown")).not.toContainText(
    "Menuju hari spesialmu",
  );
});

test("reduced motion, keyboard focus and responsive scenes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  for (const name of [
    "Bait untukmu",
    "Tiga doa",
    "Suratku",
    "Nada kita",
    "Satu harapan",
  ]) {
    await chapter(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".scene.is-active")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
  }
  await page.locator("#open-editor").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#editor-dialog")).not.toBeVisible();
  await expect(page.locator("#open-editor")).toBeFocused();
});
