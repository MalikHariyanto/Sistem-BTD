import { test, expect } from "@playwright/test";

async function enterGarden(page) {
  await page.goto("/");
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  await expect(page.locator('[data-scene="3"]')).toHaveClass(/is-active/);
}

test("garden wishes bloom in any order and accumulate without replacing the earlier wish", async ({
  page,
}) => {
  test.setTimeout(60000);
  await enterGarden(page);
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(0);
  await expect(
    page.locator("#next-quote, #prev-quote, #quote-position"),
  ).toHaveCount(0);
  for (const i of [2, 0, 1]) {
    await page.locator(`[data-bloom="${i}"]`).click();
    await expect(page.locator(`[data-bloom="${i}"]`)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  }
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  expect(
    await page
      .locator(".garden-note:not([hidden])")
      .evaluateAll((els) => els.map((el) => el.id)),
  ).toEqual(["garden-wish-2", "garden-wish-0", "garden-wish-1"]);
  await expect(page.locator(".garden-complete")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.locator('[data-bloom="2"]').click();
  await expect(page.locator("#garden-wish-2")).toBeFocused();
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Ke Bait untukmu", exact: true })
    .click();
  await expect(page.locator('[data-scene="2"]')).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Puisi selanjutnya" }).click();
  await expect(page.locator("#poem-title")).toHaveText("Hal-hal Kecil");
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  await expect(page.locator('[data-scene="3"]')).toHaveClass(/is-active/);
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(3);
  await page.locator("#home-link").click();
  await expect(page.locator('[data-scene="0"]')).toHaveClass(/is-active/);
  await page.locator("#begin").click();
  await page.locator("#skip-intro").click();
  await page.locator("#enter-story").click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Ke Tiga doa", exact: true }).click();
  await expect(page.locator(".garden-note:not([hidden])")).toHaveCount(0);
  await expect(page.locator('.garden-bloom[aria-expanded="true"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".garden-complete")).toBeHidden();
});

test("garden works with keyboard and reduced motion, with sourced quotes and no horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterGarden(page);
  const sources = ["16950", "1041", "12242"];
  for (let i = 0; i < 3; i++) {
    const button = page.locator(`[data-bloom="${i}"]`);
    await button.focus();
    await page.keyboard.press(i === 1 ? "Space" : "Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const note = page.locator(`#garden-wish-${i}`);
    await note.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(note.locator("blockquote")).toBeVisible();
    await expect(note.locator("a")).toHaveAttribute(
      "href",
      `https://www.gutenberg.org/ebooks/${sources[i]}`,
    );
    await expect(note).toContainText("TERJEMAHAN BEBAS");
    expect(
      await page
        .locator('[data-scene="3"]')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
  }
  expect(
    await page
      .locator(".garden-petals > span")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  await expect(page.locator(".garden-complete")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});
