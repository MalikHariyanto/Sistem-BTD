// Generate screenshots and source videos of the working second-round preview.
// Requires project dependencies and Chromium. No external page requests are made.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../docs/navigation-atelier');
const out=path.join(root,'images');
const videoDir=process.env.ATELIER_VIDEO_DIR||'/tmp/navigation-atelier/videos';
await mkdir(out,{recursive:true});
await mkdir(videoDir,{recursive:true});
const source=await readFile(path.join(root,'preview-siap-buka.html'),'utf8');
const html=source.replace('<html lang="id">','<html lang="id" class="capture">');
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),
  args:['--no-sandbox'],
});
const ready=async(page,concept)=>{
  // Supply the same query parameters as a real preview URL, without requiring
  // a server or external network. Initialize the page once; no hidden control
  // receives focus before the first screenshot.
  await page.setContent(html.replace('new URLSearchParams(location.search)',`new URLSearchParams('?capture=1&concept=${concept}')`));
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].map(image=>image.decode()));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await page.waitForTimeout(200);
};
try {
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
    for(const concept of ['d','e','f']){
      // A fresh page prevents stale font/compositor frames across captures.
      const page=await browser.newPage({viewport,deviceScaleFactor:2});
      await page.emulateMedia({reducedMotion:'reduce'});
      await ready(page,concept);
      await page.screenshot({path:path.join(out,`${concept}-${viewport.width===390?'hp':'laptop'}.png`)});
      if(viewport.width===1440){
        const clips={d:{x:1115,y:0,width:285,height:315},e:{x:1085,y:635,width:355,height:265},f:{x:965,y:630,width:405,height:230}};
        await page.screenshot({path:path.join(out,`${concept}-detail.png`),clip:clips[concept]});
      }
      await page.close();
    }
  }
  // The letter transition is F's second destination; show its alternate object.
  const letter=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  await letter.emulateMedia({reducedMotion:'reduce'});
  await ready(letter,'f');
  await letter.locator('#keepsake-nav [data-next]').click();
  await letter.screenshot({path:path.join(out,'f-amplop-hp.png')});
  await letter.close();

  for(const concept of ['d','e','f']){
    const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:videoDir,size:{width:1280,height:800}}});
    const page=await context.newPage();
    await ready(page,concept);
    await page.evaluate(concept=>{
      const labels={d:'D · Pita kenangan',e:'E · Balik lembar',f:'F · Benda pengantar'};
      const label=document.createElement('div');
      label.textContent=labels[concept];
      label.style.cssText='position:absolute;top:29px;left:50%;transform:translateX(-50%);z-index:30;font:10px Body,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#987d5a;pointer-events:none';
      document.querySelector('#story').append(label);
    },concept);
    await page.waitForTimeout(1000);
    await page.locator('[data-next]:visible').click();
    await page.waitForFunction(()=>document.querySelector('#story').dataset.chapter==='3');
    await page.waitForTimeout(1800);
    const video=page.video();
    await context.close();
    await video.saveAs(path.join(videoDir,`${concept}.webm`));
    console.log(`Captured real ${concept.toUpperCase()} transition`);
  }

  const panels=[
    ['d','Pita kenangan','Sentuh atau tarik pita.','Selanjutnya tertulis di pita yang menggantung di tepi buku.'],
    ['e','Balik lembar','Buka sudut kertas.','Lembar terangkat dan berbalik untuk membuka bab berikutnya.'],
    ['f','Benda pengantar','Sentuh benda kecilnya.','Lilin, amplop, bunga, dan catatan mengantar ke bab yang berbeda.'],
  ];
  const pictures={};
  for(const [key] of panels){
    for(const kind of ['detail','hp'])pictures[`${key}-${kind}`]='data:image/png;base64,'+(await readFile(path.join(out,`${key}-${kind}.png`))).toString('base64');
  }
  const serif='data:font/woff2;base64,'+(await readFile(path.join(root,'assets/cormorant-garamond-latin-400-normal.woff2'))).toString('base64');
  const sans='data:font/woff2;base64,'+(await readFile(path.join(root,'assets/dm-sans-latin-400-normal.woff2'))).toString('base64');
  const board=`<!doctype html><html lang="id"><meta charset="utf-8"><style>
  @font-face{font-family:Book;src:url('${serif}')}@font-face{font-family:Body;src:url('${sans}')}
  *{box-sizing:border-box}body{margin:0;padding:48px 46px 32px;background:#e5d8c3;color:#554331;font-family:Body,Arial,sans-serif}.overline{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#977b56}h1{font:62px/1 Book,Georgia,serif;font-weight:400;letter-spacing:-.02em;margin:13px 0 17px}.intro{font-size:13px;line-height:1.75;color:#8d7659;max-width:1000px;margin:0 0 30px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:23px}.panel{background:#f1e9dc;border:1px solid #bfaa89;border-radius:6px;padding:22px 19px;align-self:start}.code{font-size:9px;letter-spacing:.16em;color:#aa8b60;text-transform:uppercase}h2{font:35px/1 Book,Georgia,serif;font-weight:400;margin:10px 0 13px}.description{font-size:11px;line-height:1.7;color:#968061;min-height:54px;margin:0}.detail{width:100%;height:225px;object-fit:contain;display:block;border-bottom:1px solid #c8b38f55;margin:14px 0 18px;padding-bottom:12px}.phone{display:block;width:100%;height:auto;border:1px solid #d6c5aa;box-shadow:0 12px 22px #6e4f2512;border-radius:5px}.note{font-size:10px;line-height:1.7;color:#a28c6c;margin:25px 0 0}
  </style><body><span class="overline">Putaran kedua · navigasi menjadi bagian dari cerita</span><h1>Cara lain membuka cerita.</h1><p class="intro">Tiga ide yang bisa disentuh: penanda buku, lipatan kertas, dan benda pengantar bab.<br>Gambar diambil dari prototipe yang berjalan. Rekaman gerakan dan versi yang bisa dicoba tersedia di folder GitHub ini.</p><div class="grid">${panels.map(([code,title,hint,description])=>`<section class="panel"><span class="code">${code.toUpperCase()} · ${hint}</span><h2>${title}</h2><p class="description">${description}</p><img class="detail" src="${pictures[`${code}-detail`]}" alt="Detail navigasi ${title}"><img class="phone" src="${pictures[`${code}-hp`]}" alt="Tampilan HP ${title}"></section>`).join('')}</div><p class="note">Urutan tetap: Hari lahirmu → Bunga & doa → Bait untukmu → Tiup lilin → Surat untukmu.<br>Ini hanya preview navigasi. Foto diwakili bingkai kosong. Web utama, musik, dan isi kenangan tidak diubah.</p></body></html>`;
  const comparison=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
  await comparison.setContent(board);
  await comparison.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));await new Promise(requestAnimationFrame);});
  await comparison.screenshot({path:path.join(out,'perbandingan-baru.png'),fullPage:true});
  console.log('New comparison, ten screenshots, and three source videos generated.');
} finally {await browser.close();}
