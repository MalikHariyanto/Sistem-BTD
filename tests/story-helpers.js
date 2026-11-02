// Exercise the normal completion path using the browser's reduced-motion
// preference. There is no skip control or test hook in the application.
export async function finishIntro(page) {
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#enter-story').waitFor({ state: 'visible', timeout: 30000 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
}

export async function chooseChapter(page, sceneOrName) {
  if (!await page.locator("#chapter-dialog").isVisible())
    await page.locator("#chapter-index").click();
  const target = typeof sceneOrName === "number"
    ? page.locator(`#chapter-dialog [data-chapter="${sceneOrName}"]`)
    : page.getByRole("button", { name: `Ke ${sceneOrName}`, exact: true });
  await target.click();
}
