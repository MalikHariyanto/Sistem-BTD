import { test, expect } from '@playwright/test';
import { chooseChapter, finishIntro } from './story-helpers.js';
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

test('opening stays centered with the original serif and an unboxed label', async ({page, isMobile}) => {
  await installGift(page, { photos: { orbit01: photoData(1) } });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const opening = await page.evaluate(() => {
    const label = getComputedStyle(document.querySelector('.cover-copy > .eyebrow'));
    const dedication = document.querySelector('.story-dedication').getBoundingClientRect();
    const header = document.querySelector('.story-header').getBoundingClientRect();
    return { background: label.backgroundColor, border: label.borderTopWidth,
      padding: label.padding, dedicationRight: dedication.right, headerRight: header.right,
      headerPadding: parseFloat(getComputedStyle(document.querySelector('.story-header')).paddingRight) };
  });
  expect(opening.background).toBe('rgba(0, 0, 0, 0)');
  expect(opening.border).toBe('0px');
  expect(opening.padding).toBe('0px');
  if (!isMobile) expect(opening.dedicationRight).toBeCloseTo(opening.headerRight - opening.headerPadding, 0);
  await expect(page.locator('input[type="file"], #edit-photos, .photo-editor')).toHaveCount(0);
  await page.locator('#begin').click();
  await finishIntro(page);
  const reveal = await page.locator('#reveal-copy').evaluate(root => {
    const title = root.querySelector('h2'), text = root.querySelector('.reveal-message');
    const center = el => { const b = el.getBoundingClientRect(); return b.x + b.width / 2; };
    return { viewport: innerWidth / 2, title: center(title), text: center(text), button: center(root.querySelector('button')),
      titleFont: getComputedStyle(title).fontFamily, textFont: getComputedStyle(text).fontFamily };
  });
  for (const center of [reveal.title, reveal.text, reveal.button]) expect(center).toBeCloseTo(reveal.viewport, 0);
  expect(reveal.titleFont).toContain('Cormorant Garamond');
  expect(reveal.textFont).toContain('Cormorant Garamond');
});

test('garden stays seamless and the longer poems have room to read', async ({page, isMobile}) => {
  await installGift(page, { photos: { portrait: photoData(1), poem0: photoData(2) } });
  await enter(page);
  await chooseChapter(page, 3);
  const garden = await page.locator('.garden-intro').evaluate(root => {
    const style = getComputedStyle(root);
    return { background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow };
  });
  expect(garden).toEqual({background:'rgba(0, 0, 0, 0)', border:'0px', shadow:'none'});
  await chooseChapter(page, 2);
  for (let index = 0; index < 3; index++) {
    await page.locator(`[data-poem="${index}"]`).click();
    const poem = await page.locator('#poem-text').evaluate(root => {
      const style = getComputedStyle(root), bounds = root.getBoundingClientRect();
      const scene = root.closest('.scene');
      return { family:style.fontFamily, font:parseFloat(style.fontSize), leading:parseFloat(style.lineHeight),
        breaks:style.wordBreak, wrapping:style.overflowWrap, width:bounds.width, viewport:innerWidth,
        overflow:scene.scrollWidth > scene.clientWidth };
    });
    expect(poem.family).toContain('Cormorant Garamond');
    expect(poem.font).toBeGreaterThanOrEqual(21);
    expect(poem.leading / poem.font).toBeGreaterThanOrEqual(1.5);
    expect(poem.breaks).toBe('normal');
    expect(poem.wrapping).toBe('normal');
    expect(poem.width / poem.viewport).toBeGreaterThan(isMobile ? .8 : .48);
    expect(poem.overflow).toBe(false);
  }
});


test('scenery fills story frames from code without entering the Gargantua collection', async ({page}) => {
  const orbit = photoData(1), portrait = photoData(2), city = photoData(3);
  await installGift(page, { photos: { orbit01:orbit, portrait, poem0:city, moment1:city }, scrapbook: { prague:city } });
  await page.addInitScript(() => {
    indexedDB.open = () => { throw new Error('The visitor experience must not open a photo database.'); };
    window.addEventListener('photoschanged', event => { window.orbitSources = event.detail; });
  });
  await enter(page);
  const sources = await page.evaluate(() => window.orbitSources);
  expect(sources).toContain(orbit);
  expect(sources).not.toContain(city);
  await expect(page.locator('[data-photo="portrait"] img')).toHaveAttribute('src', portrait);
  // The empty scenery frame never borrows the recipient portrait.
  await expect(page.locator('[data-photo="moment3"] img').first()).toHaveCount(0);
  await chooseChapter(page, 3);
  await expect(page.locator('[data-photo="moment1"] img').first()).toHaveAttribute('src', city);
  await chooseChapter(page, 2);
  await expect(page.locator('#poem-photo img')).toHaveAttribute('src', city);
  await expect(page.locator('input[type="file"], #edit-photos, .photo-editor')).toHaveCount(0);
});
