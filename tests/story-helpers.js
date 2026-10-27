export async function chooseChapter(page, sceneOrName) {
  if (!await page.locator("#chapter-dialog").isVisible())
    await page.locator("#chapter-index").click();
  const target = typeof sceneOrName === "number"
    ? page.locator(`#chapter-dialog [data-chapter="${sceneOrName}"]`)
    : page.getByRole("button", { name: `Ke ${sceneOrName}`, exact: true });
  await target.click();
}
