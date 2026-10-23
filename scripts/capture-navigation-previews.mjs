// Run from the repository root: node scripts/capture-navigation-previews.mjs
// Produces screenshots of the working preview, not AI-generated mockups.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/navigation-preview');
const pictures = path.join(root, 'images');
await mkdir(pictures, { recursive: true });
const types = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${relative === '/' ? '/index.html' : relative}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox'],
  });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const option of ['a', 'b', 'c']) {
      await page.goto(`${base}/?capture=1&option=${option}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
        await new Promise(requestAnimationFrame);
      });
      // C's phone image includes the complete scrollable chapter so its bottom
      // invitation and heading can both be assessed. It is explicitly labelled
      // as a full chapter in the comparison and documentation.
      if (option === 'c' && viewport.width === 390) {
        await page.evaluate(() => {
          const story = document.querySelector('#story');
          const scroll = document.querySelector('#story-scroll');
          story.style.height = `${scroll.scrollHeight + document.querySelector('.story-header').offsetHeight + 4}px`;
        });
      }
      await page.screenshot({ path: path.join(pictures, `${option}-${viewport.width === 390 ? 'hp' : 'laptop'}.png`), fullPage: true });
    }
    if (viewport.width === 390) {
      await page.goto(`${base}/?capture=1&option=a`);
      await page.locator('#header-menu').click();
      await page.screenshot({ path: path.join(pictures, 'a-daftar-isi.png') });
    }
    await page.close();
  }
  const captions = [
    ['A', 'Penanda cerita', 'Rekomendasi utama', 'Satu tombol lanjut yang jelas. Bilah bawah ringkas, daftar isi tersedia saat dibutuhkan.'],
    ['B', 'Pita lima bab', 'Bebas memilih bab', 'Semua tujuan langsung terlihat. Mudah kembali ke bagian favorit, sedikit lebih ramai.'],
    ['C', 'Undangan di akhir', 'Seperti membaca surat', 'Lanjut setelah selesai membaca. Gambar menampilkan satu bab penuh yang digulir.'],
  ];
  const comparison = `<!doctype html><html lang="id"><meta charset="utf-8"><style>
    @font-face{font-family:Serif;src:url('../assets/cormorant-garamond-latin-400-normal.woff2')}
    @font-face{font-family:Sans;src:url('../assets/dm-sans-latin-400-normal.woff2')}
    *{box-sizing:border-box}body{margin:0;padding:58px 58px 38px;background:#e7ddcc;color:#3f3327;font-family:Sans,Arial,sans-serif}
    .overline{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#886b4e}h1{font:62px/1.05 Serif,Georgia,serif;margin:12px 0 14px;font-weight:400}
    .intro{font-size:15px;line-height:1.7;max-width:1030px;margin:0 0 40px;color:#796854}
    .columns{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}.card{padding:20px 19px 22px;border:1px solid #cdbba1;border-radius:16px;background:#f3eee5;align-self:start}.card:first-child{border-color:#8c6d4d;box-shadow:0 12px 36px #71552b12}
    h2{font:33px/1 Serif,Georgia,serif;font-weight:400;margin:10px 0 9px}.tag{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#92714d}.description{font-size:12px;line-height:1.65;min-height:60px;margin:0 0 18px;color:#796a59}.shot{display:block;width:100%;height:auto;border:1px solid #d2c5b3;border-radius:9px;box-shadow:0 6px 20px #58401c0a}.foot{font-size:11px;color:#8f785c;line-height:1.7;margin-top:25px}a{color:inherit}
    </style><body><div class="overline">Tiga arah navigasi · preview yang dapat diklik tersedia dalam paket</div><h1>Biar ceritanya mengalir.</h1><p class="intro">Urutan tetap: Hari lahirmu → Bunga & doa → Bait untukmu → Tiup lilin → Surat untukmu.<br>Yang berbeda adalah cara melanjutkan cerita. Foto pribadi, musik, dan web utama tidak diubah.</p><div class="columns">${captions.map(([code,title,tag,description])=>`<section class="card"><span class="tag">${code} · ${tag}</span><h2>${title}</h2><p class="description">${description}</p><img class="shot" src="${code.toLowerCase()}-hp.png" alt="Preview ${title}"></section>`).join('')}</div><p class="foot">A & B: contoh satu layar HP. C: satu bab penuh, termasuk undangan di akhir bacaan.<br>Ini tangkapan layar prototipe HTML yang benar-benar berjalan. Pilihan ini belum diterapkan ke website utama.</p></body></html>`;
  await writeFile(path.join(pictures, 'perbandingan.html'), comparison);
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
  await page.goto(`${base}/images/perbandingan.html`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({ path: path.join(pictures, 'perbandingan.png'), fullPage: true });
  console.log('Comparison and seven individual screenshots generated.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
