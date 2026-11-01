import {test,expect} from '@playwright/test';
import {installGift,photoData} from './gift-fixtures.js';
import {chooseChapter} from './story-helpers.js';
test('scrapbook keeps personal photos, all poem pages, flowers and letter readable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await installGift(page,{photos:{orbit01:photoData(1),orbit03:photoData(3),portrait:photoData(2),poem0:photoData(4),poem1:photoData(5),poem2:photoData(6),hero:photoData(7)}});
 await page.goto('/');await page.locator('#begin').click();await page.locator('#skip-intro').click();await page.locator('#enter-story').click();
 await expect(page.locator('.memory .travel-postcard')).toHaveCount(2);
 await expect(page.locator('[data-photo="portrait"] img')).toBeVisible();
 await chooseChapter(page,3);await page.getByRole('button',{name:'Mekarkan doa: Bahagia',exact:true}).click();
 await expect(page.locator('.garden-note:not([hidden])')).toHaveCount(1);
 expect(await page.locator('.garden-intro > p:not(.eyebrow)').first().evaluate(e=>getComputedStyle(e).color)).toBe('rgb(115, 88, 63)');
 await chooseChapter(page,2);
 for(let i=0;i<3;i++){await page.locator(`[data-poem="${i}"]`).click();await expect(page.locator(`#poem-photo [data-photo="poem${i}"] img`)).toBeVisible();}
 await chooseChapter(page,4);await page.locator('#open-letter').click();await expect(page.locator('.letter-verse')).toHaveCount(4);
 await page.locator('.letter-signoff').scrollIntoViewIfNeeded();await expect(page.locator('#close-letter')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#close-letter').click();await expect(page.locator('#letter-intro')).toBeVisible();
});
