import { test, expect } from '@playwright/test';
import { chooseChapter, finishIntro } from './story-helpers.js';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { installGift, photoData } from './gift-fixtures.js';

test.use({ reducedMotion: 'reduce' });
test.setTimeout(60000);

async function enter(page) {
  await page.goto('/');
  await page.locator('#begin').click();
  await finishIntro(page);
  await page.locator('#enter-story').click();
  await expect(page.locator('[data-scene="1"]')).toHaveClass(/is-active/);
}

test('birthday copy, chapters, prayer and short celebration remain usable', async ({page}) => {
  await enter(page);
  await expect(page.locator('#dedication-title')).toContainText('di usia yang baru.');
  await expect(page.locator('#birthday-countdown')).toBeEmpty();
  await chooseChapter(page, 3);
  await page.locator('[data-bloom="2"]').click();
  await expect(page.locator('#garden-wish-2')).toContainText('semoga cinta Tuhan turun');
  await page.locator('[data-pick="1"]').click();
  await expect(page.locator('#garden-wish-1')).toContainText('kutemukan');
  await chooseChapter(page, 2);
  await expect(page.locator('#poem-title')).toHaveText('Gargantua');
  await page.locator('#next-poem').click();
  await expect(page.locator('#poem-title')).toHaveText('hari hari');
  await page.locator('#next-poem').click();
  await expect(page.locator('#poem-text')).toContainText('dalam sebaik baiknya bentuk');
  await chooseChapter(page, 6);
  await page.locator('#ready-wish').click();
  await page.locator('#blow-candle').click();
  await expect(page.locator('#wish-result')).toBeVisible();
  await expect(page.locator('#wish-result')).not.toContainText('Aku bahagia kamu ada');
  await page.locator('#continue-letter').click();
  await page.locator('#open-letter-text').click();
  await expect(page.locator('#letter-reading')).toBeVisible();
  await expect(page.locator('.letter-signoff')).not.toContainText('Sayangku');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('section photo upload persists, exports, restores and resets', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await installGift(page, {photos:{portrait:photoData(2), orbit01:photoData(1)}});
  await enter(page);
  const original = await page.locator('[data-photo="portrait"]').getAttribute('data-src');
  await page.locator('#edit-photos').click();
  await expect(page.locator('#photo-section')).toHaveValue('1');
  await page.locator('[data-upload="portrait"]').setInputFiles({name:'portrait.png', mimeType:'image/png', buffer:await sharp({create:{width:40,height:60,channels:3,background:'#7594ab'}}).png().toBuffer()});
  await expect(page.locator('.photo-editor-status')).toContainText('Foto tersimpan');
  const download = page.waitForEvent('download');
  await page.locator('#export-photos').click();
  const backup = await download;
  const data = await readFile(await backup.path());
  expect(JSON.parse(data).photos.portrait).toMatch(/^data:image\/png/);
  await page.reload();
  await page.locator('#edit-photos').click();
  await page.locator('#photo-section').selectOption('1');
  await expect(page.locator('[data-photo="portrait"]')).toHaveAttribute('data-src', /^blob:/);
  await page.locator('[data-reset="portrait"]').click();
  await expect(page.locator('[data-photo="portrait"]')).toHaveAttribute('data-src', original);
  await page.locator('#import-photos').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:data});
  await expect(page.locator('.photo-editor-status')).toContainText('berhasil dipulihkan');
  await expect(page.locator('[data-photo="portrait"]')).toHaveAttribute('data-src', /^blob:/);
  await page.locator('[data-reset="portrait"]').click();
  await page.reload();
  await page.locator('#edit-photos').click();
  await expect(page.locator('[data-photo="portrait"]')).toHaveAttribute('data-src', original);
  expect(errors).toEqual([]);
});
