import { chooseChapter, openEditor } from "./story-helpers.js";
import { test, expect } from '@playwright/test';

async function openLetter(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#begin').click();
  await page.locator('#skip-intro').click();
  await page.locator('#enter-story').click();
  await chooseChapter(page, 4);
  await page.locator('#open-letter').click();
  await expect(page.locator('#letter-title')).toBeFocused();
}

async function scrollToBait(page, index) {
  await page.locator(`[data-letter-stanza="${index}"]`).evaluate(stanza => {
    const scene = stanza.closest('.scene'), bounds = scene.getBoundingClientRect();
    const inset = innerWidth <= 700 ? scene.querySelector('.letter-gallery').getBoundingClientRect().height + 24 : 50;
    scene.scrollTop += stanza.getBoundingClientRect().top - bounds.top - inset;
  });
  await expect(page.locator('#letter-reading')).toHaveAttribute('data-letter-active', String(index));
}

test('a complete letter scrolls in both directions, with the matching photo held beside the words', async ({ page }) => {
  await openLetter(page);
  await expect(page.locator('.letter-verse')).toHaveCount(4);
  await expect(page.locator('#prev-letter, #next-letter')).toHaveCount(0);
  const text = await page.locator('.letter-stanzas').textContent();
  const expected = ['hero', 'moment0', 'moment1', 'moment3'];
  for (const index of [0, 1, 2, 3, 1, 0]) {
    await scrollToBait(page, index);
    const frame = page.locator('.letter-frame.is-current');
    await expect(frame).toHaveCount(1);
    await expect(frame.locator('[data-photo]')).toHaveAttribute('data-photo', expected[index]);
    await expect(frame).toHaveAttribute('aria-hidden', 'false');
    expect(await page.locator('.letter-stanzas').textContent()).toBe(text);
    const geometry = await page.locator('.letter-gallery').evaluate(gallery => {
      const scene = gallery.closest('.scene'), box = gallery.getBoundingClientRect(), viewport = scene.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, start: viewport.top, end: viewport.bottom,
        right: box.left > scene.querySelector('.letter-verse').getBoundingClientRect().right,
        width: innerWidth, overflow: scene.scrollWidth - scene.clientWidth };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.start);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.end);
    expect(geometry.overflow).toBe(0);
    if (geometry.width > 700) expect(geometry.right).toBe(true);
  }
  await scrollToBait(page, 2);
  await chooseChapter(page, 2);
  await chooseChapter(page, 4);
  await expect(page.locator('#letter-reading')).toHaveAttribute('data-letter-active', '2');
  await expect(page.locator('#letter-title')).toBeFocused();
});

test('photo crossfades are smooth, preserve text and focus, and respect reduced motion', async ({ page }) => {
  await openLetter(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const samples = await page.evaluate(async () => {
    const scene = document.querySelector('.letter-scene'), stanza = document.querySelector('[data-letter-stanza="1"]');
    const first = document.querySelector('[data-letter-photo="0"]'), next = document.querySelector('[data-letter-photo="1"]');
    const inset = innerWidth <= 700 ? scene.querySelector('.letter-gallery').getBoundingClientRect().height + 24 : 50;
    scene.scrollTop += stanza.getBoundingClientRect().top - scene.getBoundingClientRect().top - inset;
    const frames = [], start = performance.now();
    await new Promise(resolve => {
      function sample() {
        frames.push([Number(getComputedStyle(first).opacity), Number(getComputedStyle(next).opacity)]);
        if (performance.now() - start > 1200) resolve(); else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    return frames;
  });
  expect(samples.some(([, next]) => next > .1 && next < .9)).toBe(true);
  let old = 1, next = 0;
  for (const frame of samples) {
    expect(frame[0]).toBeLessThanOrEqual(old + .01);
    expect(frame[1]).toBeGreaterThanOrEqual(next - .01);
    [old, next] = frame;
  }
  expect(samples.at(-1)).toEqual([0, 1]);
  await expect(page.locator('#letter-title')).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await scrollToBait(page, 2);
  expect(await page.locator('[data-letter-photo="2"]').evaluate(frame => ({
    opacity: getComputedStyle(frame).opacity,
    transform: getComputedStyle(frame).transform,
  }))).toEqual({ opacity: '1', transform: 'none' });
});

test('long letters stay readable in short windows; keyboard navigation reaches the signature and folding resets the letter', async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === 'mobile' ? { width: 360, height: 640 } : { width: 1280, height: 580 });
  await openLetter(page);
  await page.locator('.letter-verse').nth(1).evaluate(paragraph => {
    paragraph.textContent += '\n' + Array(25).fill('Aku ingin menyimpan hari-hari bersamamu, pelan-pelan.').join('\n');
  });
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.locator('.letter-scene').evaluate(scene => scene.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('#close-letter')).toBeFocused();
  await expect(page.locator('#close-letter')).toBeInViewport();
  await expect(page.locator('#letter-reading')).toHaveAttribute('data-letter-active', '3');
  const chrome = await page.locator('.letter-gallery').evaluate(gallery => {
    const scene = gallery.closest('.scene').getBoundingClientRect(), box = gallery.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, start: scene.top, end: scene.bottom };
  });
  expect(chrome.top).toBeGreaterThanOrEqual(chrome.start);
  expect(chrome.bottom).toBeLessThanOrEqual(chrome.end);
  await page.locator('#close-letter').click();
  await expect(page.locator('#letter-intro')).toBeVisible();
  expect(await page.locator('.letter-scene').evaluate(scene => scene.scrollTop)).toBe(0);
  await page.locator('#open-letter').click();
  await expect(page.locator('#letter-title')).toBeFocused();
  await expect(page.locator('#letter-reading')).toHaveAttribute('data-letter-active', '0');
});

test('existing uploaded photographs populate all four letter scenes and are ready before scrolling', async ({ page }) => {
  await openLetter(page);
  await openEditor(page);
  const colors = ['#9b604d', '#6b8174', '#b89856', '#78668c'];
  const keys = ['hero', 'moment0', 'moment1', 'moment3'];
  for (let i = 0; i < keys.length; i++) {
    const data = await page.evaluate(color => {
      const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 100;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 80, 100);
      return canvas.toDataURL().split(',')[1];
    }, colors[i]);
    await page.locator(`[data-upload="${keys[i]}"]`).setInputFiles({ name: `letter-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
    await expect(page.locator(`[data-letter-photo="${i}"] img`)).toHaveAttribute('src', /^blob:/);
  }
  await page.keyboard.press('Escape');
  const photos = page.locator('.letter-frame .photo-slot img');
  await expect(photos).toHaveCount(4);
  await expect.poll(() => photos.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0 && image.loading === 'eager'))).toBe(true);
  expect(new Set(await photos.evaluateAll(images => images.map(image => image.src))).size).toBe(4);
  await scrollToBait(page, 3);
  await expect(page.locator('.letter-frame.is-current img')).toBeVisible();
});
