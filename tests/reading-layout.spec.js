import { test, expect } from "@playwright/test";

async function enter(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#begin").click();
  await page.evaluate(() => {
    const skip = document.querySelector("#skip-intro");
    if (skip && !skip.hidden) skip.click();
  });
  await page.locator("#enter-story").click();
}
test("scrolling poems and prayers keeps both control rows clear, and prayers remain readable", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Ke Bait untukmu", exact: true })
    .click();
  const checkRows = async () => {
    const chapter = await page.locator(".scene.is-active").getAttribute("data-scene");
    await expect(page.locator(`#story-nav [data-chapter="${chapter}"]`)).toHaveAttribute("aria-current", "step");
    const boxes = await page.evaluate(() => {
      const header = document
        .querySelector(".story-header")
        .getBoundingClientRect();
      const scene = document
        .querySelector(".scene.is-active")
        .getBoundingClientRect();
      const nav = document.querySelector("#story-nav").getBoundingClientRect();
      const logo = document.querySelector("#home-link").getBoundingClientRect();
      const hit = document.elementFromPoint(
        logo.x + 10,
        logo.y + logo.height / 2,
      );
      return {
        headerBottom: header.bottom,
        sceneTop: scene.top,
        sceneBottom: scene.bottom,
        navTop: nav.top,
        logoOnTop: !!hit.closest("#home-link"),
        background: getComputedStyle(document.querySelector("#app"))
          .backgroundColor,
      };
    });
    expect(boxes.sceneTop).toBeGreaterThanOrEqual(boxes.headerBottom);
    expect(boxes.sceneBottom).toBeLessThanOrEqual(boxes.navTop);
    expect(boxes.logoOnTop).toBe(true);
    expect(boxes.background).not.toBe("rgba(0, 0, 0, 0)");
  };
  await page
    .locator("#poem-text")
    .evaluate(
      (p) =>
        (p.textContent +=
          "\n" +
          Array(35)
            .fill("Aku ingin menyimpan hari-hari bersamamu.")
            .join("\n")),
    );
  await page
    .locator('[data-scene="2"]')
    .evaluate((scene) => (scene.scrollTop = scene.scrollHeight / 2));
  await checkRows();
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  for (const label of ["Bahagia", "Bertumbuh", "Dicintai"])
    await page
      .getByRole("button", { name: `Mekarkan doa: ${label}`, exact: true })
      .click();
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  await expect(page.locator("#garden-wish-2 .garden-wish")).toBeInViewport();
  const typography = await page
    .locator("#garden-wish-2 .garden-wish")
    .evaluate((p) => {
      const s = getComputedStyle(p),
        box = p.getBoundingClientRect(),
        viewport = p.closest(".scene").getBoundingClientRect();
      return {
        font: parseFloat(s.fontSize),
        leading: parseFloat(s.lineHeight),
        top: box.top,
        bottom: box.bottom,
        viewportTop: viewport.top,
        viewportBottom: viewport.bottom,
      };
    });
  expect(typography.font).toBeGreaterThanOrEqual(16);
  expect(typography.leading).toBeGreaterThanOrEqual(26);
  expect(typography.top).toBeGreaterThanOrEqual(typography.viewportTop);
  expect(typography.bottom).toBeLessThanOrEqual(typography.viewportBottom);
  await page.locator("#garden-wish-2 summary").click();
  await page
    .locator('[data-scene="3"]')
    .evaluate((scene) => (scene.scrollTop = scene.scrollHeight));
  await checkRows();
  await expect(page.locator("#garden-wish-2 a")).toBeInViewport();
});


test("botanical flowers have distinct, loaded artwork and decorative flowers leave photo slots clear", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  const artwork = page.locator(".garden-flower-art");
  await expect(artwork).toHaveCount(3);
  await expect.poll(() => artwork.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const flowers = await page.locator(".garden-bloom").evaluateAll(buttons => buttons.map(button => ({
    species: button.dataset.flower,
    src: button.querySelector("img").getAttribute("src"),
    width: button.getBoundingClientRect().width,
  })));
  expect(new Set(flowers.map(flower => flower.species)).size).toBe(3);
  expect(new Set(flowers.map(flower => flower.src)).size).toBe(3);
  expect(flowers.every(flower => flower.width >= 44)).toBe(true);
  expect(await page.locator(".romance-flower").evaluateAll(images => images.every(image =>
    !image.closest("[data-photo]") && getComputedStyle(image).pointerEvents === "none"
  ))).toBe(true);
  await page.locator('[data-bloom="0"]').click();
  expect(await page.locator('.bloom-0 .garden-petals > span').first().evaluate(petal => getComputedStyle(petal).animationName)).toBe("none");
});
