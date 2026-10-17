import { expect } from "@playwright/test";

// Reduced motion may finish before Playwright's actionability checks complete.
// Test setup can finish the intro atomically, or accept its completed state.
// The normal opening and its real skip button are covered separately.
export async function finishIntro(page) {
  await page.evaluate(() => {
    const skip = document.querySelector("#skip-intro");
    if (skip && !skip.hidden) skip.click();
  });
  await expect(page.locator("#reveal-title")).toBeVisible({ timeout: 20000 });
}
