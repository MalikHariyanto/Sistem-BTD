// Browser fixtures emulate editing the deployed content module. They do not
// introduce an editor, storage dependency, or a test-only production API.
export async function installGift(page, overrides = {}) {
  await page.unroute("**/src/content.js*");
  await page.route("**/src/content.js*", async route => {
    const response = await route.fetch();
    const source = await response.text();
    const { photos = {}, ...settings } = overrides;
    await route.fulfill({ response, body: source
      + `\nObject.assign(content, ${JSON.stringify(settings)});`
      + `\n${Object.hasOwn(overrides, "photos") ? "for (const key of Object.keys(content.photos)) content.photos[key] = \"\";" : ""}\nObject.assign(content.photos, ${JSON.stringify(photos)});\n` });
  });
}

export function photoData(source = 0, width = 80, height = 100) {
  const color = typeof source === "number" ? `hsl(${source * 137.5 % 360} 100% 50%)` : source;
  // A repeated hue still represents a different photograph/file identity.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-fixture="${source}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

export const orbitFixtures = count => Object.fromEntries(
  Array.from({ length: count }, (_, i) => [`orbit${String(i + 1).padStart(2, "0")}`, photoData(i)]),
);

export async function pauseUniverse(page) {
  // Direct renderer tests use their own WebGL canvas; the application canvas
  // follows its normal offscreen lifecycle instead of opening a retired editor.
  await page.locator("#universe").evaluate(canvas => { canvas.style.display = "none"; });
  await page.waitForTimeout(100);
}
