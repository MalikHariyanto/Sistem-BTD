import { test, expect } from "@playwright/test";
import { installGift, photoData } from "./gift-fixtures.js";

test("deployed content ignores legacy browser overrides without deleting the old memories", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installGift(page, { recipient: "Dari kode", photos: { hero: photoData("#8e7051") } });
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open("ambis-copenhagen", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("memories");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction("memories", "readwrite"), store = tx.objectStore("memories");
        store.put({ recipient: "Nama browser lama", birthday: "2099-01-01T00:00:00+07:00" }, "settings");
        store.put(new Blob(["old personal photo"], { type: "image/png" }), "hero");
        store.put(new Blob(["old music"], { type: "audio/mpeg" }), "track");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    window.databaseReads = 0;
    indexedDB.open = (...args) => { window.databaseReads++; return open(...args); };
  });
  await page.reload();
  await expect(page.locator('#universe')).toHaveAttribute('data-photo-sources', '1');
  await expect(page.locator('#birthday-countdown')).not.toContainText('Menuju hari spesialmu');
  await page.locator('#begin').click();
  await page.locator('#skip-intro').click();
  await page.locator('#enter-story').click();
  await expect(page.locator('.dedication-copy [data-recipient]')).toHaveText('Dari kode');
  expect(await page.evaluate(() => window.databaseReads)).toBe(0);
  expect(await page.locator('#story-audio').evaluate(audio => audio.src)).toContain('/music/koshun-nakao-country-intro-cut.mp3');
  const legacy = await page.evaluate(async () => new Promise(resolve => {
    const open = indexedDB.open("ambis-copenhagen", 1);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction("memories", "readonly"), store = tx.objectStore("memories");
      const settings = store.get("settings"), photo = store.get("hero"), track = store.get("track");
      tx.oncomplete = () => { resolve({ name: settings.result.recipient, photo: photo.result.size, track: track.result.size }); db.close(); };
    };
  }));
  expect(legacy).toEqual({ name: "Nama browser lama", photo: 18, track: 9 });
});

test("fresh browser sessions show the same configured gift without uploads", async ({ browser }) => {
  const config = { recipient: "Hadiah yang sama", photos: { portrait: photoData(7) } };
  const contexts = [];
  try {
    for (let i = 0; i < 2; i++) {
      const context = await browser.newContext({ reducedMotion: "reduce" }); contexts.push(context);
      const page = await context.newPage();
      await installGift(page, config);
      await page.goto('http://127.0.0.1:5173/');
      await expect(page.locator('#universe')).toHaveAttribute('data-photo-sources', '1');
      await page.locator('#begin').click(); await page.locator('#skip-intro').click(); await page.locator('#enter-story').click();
      await expect(page.locator('.dedication-copy [data-recipient]')).toHaveText(config.recipient);
      await expect(page.locator('[data-photo="portrait"] img')).toHaveAttribute('src', config.photos.portrait);
      await expect(page.locator('input[type="file"], #editor-dialog, #edit-from-chapters')).toHaveCount(0);
    }
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test("a failed image download leaves other photos and navigation working", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGift(page, { photos: { portrait: '/photos/unavailable.jpg', hero: photoData(1) } });
  await page.route('**/photos/unavailable.jpg', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#universe')).toHaveAttribute('data-photo-sources', '1');
  await expect(page.locator('#media-status')).toContainText('1 foto belum terbaca');
  await page.locator('#begin').click(); await page.locator('#skip-intro').click(); await page.locator('#enter-story').click();
  await expect(page.locator('[data-photo="portrait"]')).not.toHaveClass(/has-photo/);
  await page.locator('#next-scene').click();
  await expect(page.locator('.scene.is-active')).toHaveAttribute('data-scene', '3');
});
