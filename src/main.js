import "./style.css";
import "./florals.css";
import "./wish-garden.css";
import "./reading-layout.css";
import "./letter-scroll.css";
import "./story-polish.css";
import "./keepsakes.css";
import { flowerSrc } from "./florals.js";
import { keepsakeContent, setKeepsake, liftKeepsake } from "./keepsakes.js";
import { createWishGarden } from "./wish-garden.js";
import { content, ORBIT_PHOTO_COUNT } from "./content.js";
import { quotes } from "./quotes.js";
import { createUniverse } from "./universe.js";
import { openMemories, optimizePhoto } from "./memories.js";
import { createMotion } from "./motion.js";
import { createScrollLetter } from "./letter-scroll.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const photo = (key, label, cls = "") =>
  `<div class="photo-slot ${cls}" data-photo="${key}" role="img" aria-label="${esc(label)}"><span class="aperture" aria-hidden="true">✧</span><span class="photo-label">${esc(label)}</span></div>`;
// Decorative flowers stay outside photo slots so uploads never replace them.
const flowerPlacements = {
  "flower-memory-left": "bouquet",
  "flower-memory-right": "tulip",
  "flower-poem": "anemone",
  "flower-letter": "rose",
  "flower-envelope": "bouquet",
  "flower-garden": "anemone",
  "flower-editor": "tulip",
};
const flowers = (placement) => {
  const kind = flowerPlacements[placement];
  return `<img class="romance-flower ${placement}" data-flower="${kind}" src="${flowerSrc(kind)}" alt="" aria-hidden="true" width="512" height="768" loading="lazy" decoding="async" draggable="false">`;
};
const arrow = '<span aria-hidden="true">→</span>';
let active = 0,
  changing = false,
  poemIndex = 0;
let introRun = 0,
  introPhase = "idle",
  wishState = "waiting";
let store,
  settings = {},
  localTrackUrl,
  audio;
let autoMusicPending = true,
  musicAttempt = 0;
let storyVersion = 0,
  letterRun = 0,
  wishRun = 0;
const urls = new Map(),
  localPhotos = new Map();
const prefetchedPoems = new Set();
const photoKeys = Object.keys(content.photos);
const photoLabel = (key) =>
  ({
    hero: "Foto surat",
    portrait: "Potret ucapan",
    poem0: "Puisi 01",
    poem1: "Puisi 02",
    poem2: "Puisi 03",
    moment0: "Kenangan 01",
    moment1: "Kenangan 02",
    moment2: "Kenangan 03",
    moment3: "Kenangan 04",
  })[key] || `Semesta ${key.replace("orbit", "")}`;
// Scene IDs stay stable for existing photo slots; reading order is explicit.
const chapters = [
  { scene: 0, name: "Semestamu" },
  { scene: 1, name: "Hari lahirmu", keepsake: "flowers" },
  { scene: 3, name: "Bunga & doa", keepsake: "note" },
  { scene: 2, name: "Bait untukmu", keepsake: "candle" },
  { scene: 6, name: "Tiup lilin", keepsake: "envelope" },
  { scene: 4, name: "Surat untukmu" },
];
const readingChapters = chapters.slice(1);
const adjacentScene = (scene, direction) => chapters[chapters.findIndex(chapter => chapter.scene === scene) + direction]?.scene;

$("#app").innerHTML = `
<header class="story-header"><a href="#semesta" id="home-link" aria-label="Kembali ke awal">a little universe <i>for you.</i></a><span class="story-dedication" aria-hidden="true">a birthday, held close.</span><button id="chapter-index" class="chapter-index" aria-label="Buka daftar bab" aria-haspopup="dialog" aria-controls="chapter-dialog" aria-expanded="false" hidden><span>Halaman</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M9 15h11"/></svg></button></header>
<main id="main" tabindex="-1"><div class="stage" id="stage">
  <section class="scene universe-scene is-active" id="semesta" aria-labelledby="cover-title" data-scene="0" data-phase="idle">
    <canvas id="universe" aria-hidden="true"></canvas>
    <div class="cover-copy" id="cover-copy"><p class="eyebrow">UNTUK HARI KETIKA DUNIA MENGENALMU</p><h1 id="cover-title">Ada semesta.<br><em>Di dalamnya, kamu.</em></h1><p>Beberapa kenangan. Banyak sekali rasa.<br>Semuanya berawal dari satu tarikan kecil.</p><button class="primary light" id="begin">Buka semesta kita ${arrow}</button><p id="birthday-countdown" class="birthday-countdown"></p></div>
    <p class="intro-count" id="intro-count" aria-live="polite" hidden></p>
    <button class="skip-intro" id="skip-intro" hidden>Lewati perjalanan →</button>
    <div class="reveal-copy" id="reveal-copy" hidden><p class="eyebrow">SETELAH SEMUA JARAK DAN CAHAYA</p><h2 id="reveal-title" tabindex="-1">Ternyata,<br><em>semuanya kamu.</em></h2><p>Setiap kepingnya, satu alasan untuk bersyukur kamu ada.</p><button class="primary light" id="enter-story">Ini cerita untukmu ${arrow}</button></div>
    <p class="cover-footnote" id="cover-footnote">Bukan tentang luasnya semesta. Tentang siapa yang membuatnya berarti.</p>
  </section>
  <section class="scene dedication-scene" data-scene="1" aria-labelledby="dedication-title" hidden inert><div class="scene-inner dedication-layout">
    <div class="memory-constellation" aria-label="Lima bingkai kenangan">${["portrait", "orbit01", "orbit02", "moment0", "orbit03"].map((key, i) => `<div class="memory memory-${i}">${photo(key, photoLabel(key))}</div>`).join("")}${flowers("flower-memory-left")}${flowers("flower-memory-right")}<span class="handwritten">the universe got lucky.</span></div>
    <div class="dedication-copy"><p class="eyebrow">PADA HARI INI, SUATU WAKTU LALU</p><h2 id="dedication-title" tabindex="-1">Dunia mendapatmu.<br><em>Aku mendapat<br>alasan tersenyum.</em></h2><p>Selamat ulang tahun, <span data-recipient></span>.</p><p>Terima kasih sudah lahir. Sudah tumbuh. Sudah menjadi kamu, bahkan di hari-hari ketika menjadi diri sendiri terasa tidak mudah.</p><p>Aku ingin merayakan semuanya. Pelan-pelan, satu halaman pada satu waktu.</p><span class="handwritten">stay a little. this is all for you.</span></div>
  </div></section>
  <section class="scene quotes-scene garden-scene" data-scene="3" aria-labelledby="quote-heading" hidden inert><div class="scene-inner garden-layout">
    <div class="garden-intro"><p class="eyebrow">SEBUAH KEBUN KECIL UNTUKMU</p><h2 id="quote-heading" tabindex="-1">Untukmu,<br> <em>semoga selalu<br> ada yang mekar.</em></h2><p>Tiga bunga, tiga harapan.<br>Sentuh bunganya satu per satu.<br>Biarkan doa-doa baik ini mekar untukmu.</p><div class="garden-photos">${photo("moment1", "Satu hari yang indah")}${photo("orbit05", "Yang ingin kusimpan")}${flowers("flower-garden")}</div><span class="handwritten">may good things find you.</span></div>
    <div class="garden-experience" id="wish-garden"></div>
  </div></section>
  <section class="scene poems-scene" data-scene="2" aria-labelledby="poem-title" hidden inert><div class="scene-inner poem-layout">
    <div class="poem-visual">${flowers("flower-poem")}<div id="poem-photo"></div><div class="poem-small-photo">${photo("orbit04", "Sebuah detail kecil")}</div><span class="handwritten">some feelings become poems.</span></div>
    <article class="poem-paper"><p class="eyebrow">KATA-KATA YANG SELALU PULANG PADAMU</p><div id="poem-page"><h2 id="poem-title" tabindex="-1"></h2><p id="poem-subtitle" class="poem-subtitle"></p><p id="poem-text" class="poem-text"></p></div><div class="page-controls"><button id="prev-poem" class="round" aria-label="Puisi sebelumnya">←</button><div class="poem-pagination"><span id="poem-position" aria-live="polite"></span><div class="poem-bookmarks" role="group" aria-label="Pilih puisi">${content.poems.map((poem, i) => `<button type="button" data-poem="${i}" aria-label="Baca puisi: ${esc(poem.title)}"><span></span></button>`).join("")}</div></div><button id="next-poem" class="round" aria-label="Puisi selanjutnya">→</button></div></article>
  </div></section>
  <section class="scene wish-scene" data-scene="6" aria-labelledby="wish-title" hidden inert><div class="wish-halo"></div><div class="celebration-particles" aria-hidden="true">${Array.from({ length: 32 }, (_, i) => `<span style="--i:${i};--x:${(i * 37) % 100}%;--delay:${(i % 8) * 0.08}s"></span>`).join("")}</div><div class="scene-inner wish-layout">
    <div class="wish-copy"><p class="eyebrow" id="wish-step">SEBELUM KUTITIPKAN KATA-KATA TERAKHIR.</p><h2 id="wish-title" tabindex="-1">Hari ini,<br><em>milikmu.</em></h2><p id="wish-instruction">Semua cahaya ini untukmu.<br>Sudah siap membuat satu harapan?</p><div class="wish-steps" aria-label="Langkah perayaan"><span class="current" data-wish-step="0">01 <i>Buat harapan</i></span><span data-wish-step="1">02 <i>Tiup lilin</i></span><span data-wish-step="2">03 <i>Rayakan</i></span></div><button class="primary light" id="ready-wish">Aku siap buat harapan ${arrow}</button><button class="primary light blow-button" id="blow-candle" hidden>Tiup lilinnya <span aria-hidden="true">♡</span></button><p class="wish-hint" id="wish-hint">Ambil waktu sebanyak yang kamu butuhkan.</p></div>
    <div class="cake-composition" id="cake" aria-hidden="true"><div class="candle-glow"></div><div class="cake-candle"><div class="flame"></div><span class="smoke"></span><div class="wick"></div><div class="candle-body"></div></div><div class="cake-top"></div><div class="cake-body"><span class="cake-ribbon">for you, always.</span></div><div class="cake-bottom"></div><div class="cake-plate"></div><div class="cake-stand"></div><div class="cake-foot"></div><div class="cake-spark spark-one">✧</div><div class="cake-spark spark-two">✧</div></div>
    <div class="wish-result" id="wish-result" hidden><p class="eyebrow">SEMOGA SEMESTA MENGAMINKAN</p><h2 id="birthday-title" tabindex="-1">Happy birthday,<br><em data-recipient></em>.</h2><p>Semoga hidup memelukmu selembut doa-doa baik hari ini.<br>Aku bahagia kamu ada.</p><span class="handwritten">always, and a little longer.</span><div><button class="keepsake-button celebration-keepsake" id="continue-letter" data-keepsake="envelope" aria-label="Masih ada surat untukmu">${keepsakeContent("envelope")}</button><button class="text-button" id="relight">Buat harapan lagi ♡</button></div></div>
  </div></section>
  <section class="scene letter-scene" data-scene="4" aria-labelledby="letter-heading" hidden inert><div class="scene-inner letter-layout">
    <div class="letter-intro" id="letter-intro"><p class="eyebrow">TERAKHIR, DARI SELURUH HATIKU</p><h2 id="letter-heading" tabindex="-1">Tidak semua rasa<br>muat dalam puisi.<br><em>Jadi, ini suratku.</em></h2><button id="open-letter" class="envelope" aria-label="Buka surat untukmu"><span class="envelope-back"></span><span class="envelope-paper">dear, you.</span><span class="envelope-front"></span><span class="envelope-flap"></span><span class="wax-seal">a.</span>${flowers("flower-envelope")}</button><button id="open-letter-text" class="text-button">Ketuk untuk membuka surat ${arrow}</button></div>
    <article id="letter-reading" class="letter-scroll" aria-label="Surat untukmu" hidden></article>
  </div></section>
</div></main>
<nav class="story-nav" id="story-nav" aria-label="Halaman cerita" hidden><button id="previous-scene" class="nav-back" aria-label="Bagian sebelumnya">← <span>Sebelumnya</span></button><div class="chapter-progress"><span id="chapter-name"></span><span id="chapter-count" aria-hidden="true"></span></div><button id="next-scene" class="nav-next keepsake-button"></button>
<dialog id="chapter-dialog" class="chapter-dialog" aria-labelledby="chapter-dialog-title"><button id="close-chapters" class="chapter-close" aria-label="Tutup daftar bab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button><h2 id="chapter-dialog-title">Halaman-halaman kecil.</h2><p>Buka yang ingin kamu baca kembali.</p><ol>${readingChapters.map((chapter,i) => `<li><button data-chapter="${chapter.scene}" aria-label="Ke ${chapter.name}"><span>0${i+1}</span>${chapter.name}</button></li>`).join("")}</ol><button id="edit-from-chapters" class="chapter-edit">Isi kenangan →</button></dialog></nav>
<button class="edit-trigger" id="open-editor">Isi kenangan →</button><p class="sr-only" id="scene-announcement" role="status"></p><p class="sr-only" id="track-status" role="status"></p>
<dialog id="editor-dialog" aria-labelledby="editor-title"><button class="editor-close" id="close-editor">Tutup ×</button><div class="editor-heading"><div><p class="eyebrow">DI BALIK CERITA INI</p><h2 id="editor-title">Isi <em>kenangan.</em></h2></div>${flowers("flower-editor")}</div><p>${photoKeys.length} tempat untuk foto milikmu. Unggahan di sini hanya tersimpan di browser ini. Untuk dibagikan, isi <code>src/content.js</code> dan simpan file di <code>public/photos/</code>.</p><form id="editor-form"><label>Nama panggilan<input name="recipient" maxlength="60" placeholder="Kamu"></label><label>Tanggal ulang tahun <small>(opsional, waktu perangkat)</small><input name="birthday" type="datetime-local"></label><button class="primary" type="submit">Simpan nama & tanggal →</button><div class="bulk-upload"><label>Isi banyak foto sekaligus<small>Foto akan mengisi tempat kosong di semesta, sampai ${ORBIT_PHOTO_COUNT} foto.</small><input id="bulk-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p id="photo-count"></p></div><details><summary>Atur masing-masing foto</summary><div class="editor-photo-grid">${photoKeys.map((k) => `<label>${photoLabel(k)}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${k}"><button class="remove-photo" type="button" data-remove="${k}">Hapus foto lokal</button></label>`).join("")}</div></details><label>Musik latar cerita <small>(maks. 15 MB, hanya untuk mengisi hadiah)</small><input type="file" id="audio-upload" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"></label><p id="editor-status" role="status"></p><button class="text-button" type="button" id="reset-local">Hapus semua isian lokal</button></form></dialog>`;

const universe = createUniverse($("#universe"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const effects = createMotion(motion);
const animate = effects.play;
const letterStory = createScrollLetter($("#letter-reading"), {
  content, photo, flowers, escapeHtml: esc,
});
const wishGarden = createWishGarden($("#wish-garden"), quotes, {
  effects,
  motion,
  escapeHtml: esc,
});
async function goTo(index, keepsakeButton) {
  if (changing || !chapters.some(chapter => chapter.scene === index) || index === active)
    return;
  changing = true;
  if ($("#chapter-dialog").open) $("#chapter-dialog").close();
  const chrome = [$(".story-header"), $("#story-nav"), $("#open-editor")];
  const surface = $("#app"), oldSurface = getComputedStyle(surface).backgroundColor;
  const before = $(`[data-scene="${active}"]`),
    after = $(`[data-scene="${index}"]`);
  before.inert = true;
  document.body.classList.add("chapter-changing");
  chrome.forEach(element => { element.inert = true; });
  $("#stage").setAttribute("aria-busy", "true");
  const releaseKeepsake = keepsakeButton
    ? await liftKeepsake(keepsakeButton, motion.matches)
    : () => {};
  updateNav(index);
  if (active === 0) {
    introRun++;
    universe.settle();
  }
  effects.reset(after);
  before.style.zIndex = "1";
  after.style.zIndex = "2";
  after.style.opacity = "0";
  after.hidden = false;
  warmChapter(index);
  after.inert = true;
  // One surface and one dissolve: no frozen copies of the old control bars,
  // and no scaled page edges extending across the reading viewport.
  await Promise.all([
    animate(surface, [
      { backgroundColor: oldSurface },
      { backgroundColor: getComputedStyle(surface).backgroundColor },
    ], 520),
    ...chrome.filter(element => !element.hidden).map(element =>
      animate(element, [{ opacity: 0 }, { opacity: Number(getComputedStyle(element).opacity) }], 520)),
    animate(
      before,
      [
        { opacity: 1 },
        { opacity: 0 },
      ],
      520,
    ),
    animate(
      after,
      [
        { opacity: 0 },
        { opacity: 1 },
      ],
      520,
    ),
  ]);
  before.hidden = true;
  releaseKeepsake();
  before.classList.remove("is-active");
  effects.reset(before);
  before.style.removeProperty("z-index");
  after.inert = false;
  after.classList.add("is-active");
  effects.reset(after);
  after.style.removeProperty("z-index");
  chrome.forEach(element => { effects.reset(element); element.inert = false; });
  effects.reset(surface);
  document.body.classList.remove("chapter-changing");
  active = index;
  changing = false;
  $("#stage").removeAttribute("aria-busy");
  document.body.dataset.chapter = String(index);
  const title = [...after.querySelectorAll('[tabindex="-1"]')].find(element => element.getClientRects().length);
  title?.focus({ preventScroll: true });
  $("#scene-announcement").textContent = chapters.find(chapter => chapter.scene === index).name;
  updateNav();
  warmChapter(adjacentScene(index, 1));
  if (index === 4) letterStory.refresh();
}
function updateNav(index = active) {
  document.body.dataset.chapter = String(index);
  $("#story-nav").hidden = index === 0;
  $("#chapter-index").hidden = index === 0;
  $("#open-editor").hidden = index !== 0;
  $("#story-nav").classList.toggle("is-celebrating", index === 6 && !$("#wish-result").hidden);
  const position = chapters.findIndex(chapter => chapter.scene === index);
  const chapter = chapters[position];
  $("#chapter-name").textContent = chapter.name;
  $("#chapter-count").textContent = `${String(position).padStart(2, "0")} / ${String(readingChapters.length).padStart(2, "0")}`;
  if (chapter.keepsake) setKeepsake($("#next-scene"), chapter.keepsake);
  $("#next-scene").hidden = index === 0 || position === chapters.length - 1;
  $$("#story-nav [data-chapter]").forEach(b => {
    const scene = Number(b.dataset.chapter);
    if (scene === index) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
    b.classList.toggle("passed", chapters.findIndex(chapter => chapter.scene === scene) < position);
  });
  const dark = [0, 3, 6].includes(index);
  document.body.classList.toggle("dark-scene", dark);
}
$("#previous-scene").onclick = () => goTo(adjacentScene(active, -1));
$("#next-scene").onclick = e => goTo(adjacentScene(active, 1), e.currentTarget);
$("#continue-letter").onclick = e => goTo(4, e.currentTarget);
$("#chapter-index").onclick = () => {
  if (changing) return;
  $("#chapter-dialog").showModal();
  $("#chapter-index").setAttribute("aria-expanded", "true");
};
$("#close-chapters").onclick = () => $("#chapter-dialog").close();
$("#chapter-dialog").addEventListener("close", () => {
  $("#chapter-index").setAttribute("aria-expanded", "false");
});
$("#chapter-dialog").addEventListener("click", e => {
  if (e.target !== e.currentTarget) return;
  const box = e.currentTarget.getBoundingClientRect();
  if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)
    e.currentTarget.close();
});
$$("#story-nav [data-chapter]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#chapter-dialog").close();
      if (Number(b.dataset.chapter) === active) {
        const title = [...$(`[data-scene="${active}"]`).querySelectorAll('[tabindex="-1"]')]
          .find(element => element.getClientRects().length);
        title?.focus({ preventScroll: true });
        return;
      }
      if (Number(b.dataset.chapter) === 0) replay();
      else goTo(Number(b.dataset.chapter));
    }),
);
$("#home-link").onclick = (e) => {
  e.preventDefault();
  replay();
};
// Arrow keys change scenes only when focus is on the stage, never inside forms or controls.
window.addEventListener("keydown", (e) => {
  if (
    $("#editor-dialog").open ||
    $("#chapter-dialog").open ||
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    changing
  )
    return;
  if (e.target.closest("button,a,input,textarea,select,summary")) return;
  if (e.key === "ArrowRight" && active > 0 && adjacentScene(active, 1) !== undefined) {
    e.preventDefault();
    goTo(adjacentScene(active, 1));
  }
  if (e.key === "ArrowLeft" && active > 0) {
    e.preventDefault();
    goTo(adjacentScene(active, -1));
  }
});
function phase(value) {
  introPhase = value;
  const inTravel = ["countdown", "traveling"].includes(value);
  $(".story-header").inert = inTravel;
  $("#open-editor").inert = inTravel;
  document.body.classList.toggle(
    "intro-running",
    ["countdown", "traveling"].includes(value),
  );
  $("#semesta").dataset.phase = value;
}
function revealIntro() {
  universe.settle();
  phase("revealed");
  $("#intro-count").hidden = true;
  $("#skip-intro").hidden = true;
  $("#cover-copy").hidden = true;
  $("#cover-footnote").hidden = true;
  $("#reveal-copy").hidden = false;
  animate(
    $("#reveal-copy"),
    [
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    1300,
  );
  $("#reveal-title").focus({ preventScroll: true });
}
async function beginIntro() {
  if (introPhase !== "idle") return;
  const token = ++introRun;
  phase("countdown");
  universe.prepare();
  $("#cover-copy").inert = true;
  $("#skip-intro").hidden = false;
  await animate($("#cover-copy"), [{ opacity: 1 }, { opacity: 0 }], 450);
  if (token !== introRun) return;
  $("#cover-copy").hidden = true;
  $("#cover-footnote").hidden = true;
  $("#intro-count").hidden = false;
  for (const n of ["03", "02", "01"]) {
    if (token !== introRun) return;
    $("#intro-count").textContent = n;
    await sleep(motion.matches ? 200 : 700);
  }
  if (token !== introRun) return;
  await universe.ready;
  if (token !== introRun) return;
  $("#intro-count").hidden = true;
  phase("traveling");
  await universe.travel();
  if (token !== introRun) return;
  // No headings, captions, countdown, or birthday text during the camera move.
  await sleep(motion.matches ? 0 : 400);
  if (token !== introRun) return;
  revealIntro();
}
$("#begin").onclick = beginIntro;
$("#skip-intro").onclick = () => {
  introRun++;
  revealIntro();
};
$("#enter-story").onclick = () => goTo(1);
async function replay() {
  if (changing) return;
  introRun++;
  effects.resetTree($("#stage"));
  phase("idle");
  $("#cover-copy").hidden = false;
  $("#cover-copy").inert = false;
  $("#cover-footnote").hidden = false;
  $("#reveal-copy").hidden = true;
  $("#intro-count").hidden = true;
  $("#skip-intro").hidden = true;
  storyVersion++;
  letterRun++;
  openingLetter = false;
  poemIndex = 0;
  renderPoem();
  wishGarden.reset();
  letterStory.reset();
  $(".letter-layout").classList.remove("is-reading");
  $("#letter-reading").hidden = true;
  $(".letter-scene").setAttribute("aria-labelledby", "letter-heading");
  $("#letter-intro").hidden = false;
  $("#open-letter").classList.remove("opened");
  resetWish(false);
  universe.reset();
  if (active !== 0) await goTo(0);
  $("#begin").focus({ preventScroll: true });
}
$("#replay").onclick = replay;
let poemChanging = false;
async function changePage(elements, render) {
  const version = storyVersion;
  await Promise.all(elements.map(el => animate(el, [{ opacity: 1 }, { opacity: 0 }], 220)));
  if (version !== storyVersion) return;
  render();
  await Promise.all(elements.map(el => animate(el, [{ opacity: 0 }, { opacity: 1 }], 550)));
}
function renderPoem() {
  const p = content.poems[poemIndex];
  $("#poem-title").textContent = p.title;
  $("#poem-subtitle").textContent = p.subtitle;
  $("#poem-text").textContent = p.text;
  $("#poem-position").textContent =
    `${poemIndex + 1} / ${content.poems.length}`;
  $("#poem-photo").innerHTML = photo(
    "poem" + poemIndex,
    `Puisi ${poemIndex + 1}`,
  );
  $$("[data-poem]").forEach(button => {
    if (Number(button.dataset.poem) === poemIndex) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  applyPhotos();
}
async function turnPoem(dir, destination) {
  if (poemChanging) return;
  poemChanging = true;
  $("#prev-poem").disabled = true;
  $("#next-poem").disabled = true;
  await changePage([$("#poem-page"), $("#poem-photo")], () => {
    poemIndex = destination ?? (poemIndex + dir + content.poems.length) % content.poems.length;
    renderPoem();
  });
  poemChanging = false;
  $("#prev-poem").disabled = false;
  $("#next-poem").disabled = false;
}
$("#prev-poem").onclick = () => turnPoem(-1);
$("#next-poem").onclick = () => turnPoem(1);
$$("[data-poem]").forEach(button => {
  button.onclick = () => {
    const destination = Number(button.dataset.poem);
    if (destination !== poemIndex) void turnPoem(0, destination);
  };
});
let openingLetter = false;
async function openLetter() {
  if (openingLetter) return;
  openingLetter = true;
  const token = ++letterRun;
  $("#open-letter").classList.add("opened");
  await sleep(motion.matches ? 0 : 850);
  if (token !== letterRun) return;
  await animate($("#letter-intro"), [{ opacity: 1 }, { opacity: 0 }], 300);
  if (token !== letterRun) return;
  $("#letter-intro").hidden = true;
  $(".letter-layout").classList.add("is-reading");
  $("#letter-reading").hidden = false;
  $(".letter-scene").setAttribute("aria-labelledby", "letter-title");
  letterStory.reset();
  await animate(
    $("#letter-reading"),
    [
      { opacity: 0, transform: "translateY(30px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    900,
  );
  if (token !== letterRun) return;
  if (active === 4) $("#letter-title").focus({ preventScroll: true });
  openingLetter = false;
}
$("#open-letter").onclick = openLetter;
$("#open-letter-text").onclick = openLetter;
$("#close-letter").onclick = async () => {
  if (openingLetter) return;
  openingLetter = true;
  const token = ++letterRun;
  await animate($("#letter-reading"), [{ opacity: 1 }, { opacity: 0 }], 350);
  if (token !== letterRun) return;
  $("#letter-reading").hidden = true;
  $(".letter-scene").setAttribute("aria-labelledby", "letter-heading");
  $(".letter-layout").classList.remove("is-reading");
  $("#letter-intro").hidden = false;
  letterStory.reset();
  $("#open-letter").classList.remove("opened");
  await animate($("#letter-intro"), [{ opacity: 0 }, { opacity: 1 }], 500);
  if (token !== letterRun) return;
  if (active === 4) $("#open-letter").focus({ preventScroll: true });
  openingLetter = false;
};

function setWishStep(i) {
  $$("[data-wish-step]").forEach((e, n) =>
    e.classList.toggle("current", n === i),
  );
}
$("#ready-wish").onclick = async () => {
  if (wishState !== "waiting") return;
  wishState = "ready";
  const token = wishRun;
  $(".wish-scene").dataset.wish = "ready";
  setWishStep(1);
  $("#ready-wish").hidden = true;
  $("#wish-step").textContent = "PEJAMKAN MATA. SIMPAN SATU HARAPAN.";
  $("#wish-title").innerHTML = "Buat harapan.<br><em>Lalu, tiup lilinnya.</em>";
  $("#wish-instruction").textContent =
    "Kalau sudah, ketuk tombol di bawah. Aku ikut mengaminkan.";
  $("#wish-hint").textContent =
    "Cukup ketuk tombolnya. Tidak perlu meniup layar.";
  $("#blow-candle").hidden = false;
  $("#cake").classList.add("awaiting-wish");
  await animate(
    $("#blow-candle"),
    [
      { opacity: 0, transform: "translateY(12px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    550,
  );
  if (token === wishRun && active === 6 && wishState === "ready")
    $("#blow-candle").focus({ preventScroll: true });
};
$("#blow-candle").onclick = async () => {
  if (wishState !== "ready") return;
  wishState = "blown";
  const token = ++wishRun;
  setWishStep(2);
  $("#blow-candle").disabled = true;
  $("#cake").classList.add("blown");
  $("#cake").classList.remove("awaiting-wish");
  $("#wish-hint").textContent = "Semoga semesta mengaminkan.";
  $(".wish-scene").classList.add("celebrating");
  await sleep(motion.matches ? 100 : 1100);
  if (token !== wishRun) return;
  await Promise.all([
    animate($(".wish-copy"), [{ opacity: 1 }, { opacity: 0 }], 600),
    animate($("#cake"), [{ opacity: 1 }, { opacity: 0 }], 800),
  ]);
  if (token !== wishRun) return;
  $(".wish-copy").hidden = true;
  $("#cake").hidden = true;
  $("#wish-result").hidden = false;
  $(".wish-scene").scrollTop = 0;
  $("#story-nav").classList.toggle("is-celebrating", active === 6);
  await animate(
    $("#wish-result"),
    [
      { opacity: 0, transform: "translateY(20px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    1300,
  );
  if (token === wishRun && active === 6)
    $("#birthday-title").focus({ preventScroll: true });
};
function resetWish(focus = true) {
  wishRun++;
  [".wish-copy", "#cake", "#wish-result", "#blow-candle"].forEach((selector) =>
    effects.reset($(selector)),
  );
  wishState = "waiting";
  $(".wish-scene").dataset.wish = "waiting";
  $(".wish-scene").classList.remove("celebrating");
  $("#wish-result").hidden = true;
  $("#story-nav").classList.remove("is-celebrating");
  $(".wish-copy").hidden = false;
  $("#cake").hidden = false;
  $("#cake").classList.remove("blown", "awaiting-wish");
  $("#blow-candle").hidden = true;
  $("#blow-candle").disabled = false;
  $("#ready-wish").hidden = false;
  setWishStep(0);
  $("#wish-step").textContent = "SEBELUM KUTITIPKAN KATA-KATA TERAKHIR.";
  $("#wish-title").innerHTML = "Hari ini,<br><em>milikmu.</em>";
  $("#wish-instruction").innerHTML =
    "Semua cahaya ini untukmu.<br>Sudah siap membuat satu harapan?";
  $("#wish-hint").textContent = "Ambil waktu sebanyak yang kamu butuhkan.";
  if (focus) $("#ready-wish").focus({ preventScroll: true });
}
$("#relight").onclick = () => resetWish();

function pauseTrack() {
  musicAttempt++;
  audio?.pause();
  syncMusic();
}
function syncMusic() {
  if (audio) audio.dataset.playback = audio.error ? "error"
    : audio.paused ? "paused" : audio.readyState >= 3 ? "playing" : "loading";
}
function prepareTrack() {
  const src = localTrackUrl || content.tracks[0].src;
  if (!src) return null;
  if (!audio) {
    audio = new Audio();
    audio.id = "story-audio";
    audio.preload = "auto";
    audio.volume = 0.6;
    audio.loop = true;
    document.body.append(audio);
    ["play", "pause", "waiting", "canplay", "ended"].forEach(name => audio.addEventListener(name, syncMusic));
    audio.addEventListener("playing", () => {
      autoMusicPending = false;
      $("#track-status").textContent = "";
      syncMusic();
    });
    audio.addEventListener("error", () => {
      autoMusicPending = true;
      pauseTrack();
      $("#track-status").textContent = "Lagu belum bisa dimuat. Coba muat ulang halaman.";
      syncMusic();
    });
  }
  if (audio.src !== new URL(src, location.href).href || audio.error) {
    pauseTrack();
    audio.src = src;
    audio.load();
    syncMusic();
  }
  return audio;
}
async function playTrack() {
  const current = prepareTrack();
  if (!current || !current.paused) return;
  const attempt = ++musicAttempt;
  // Play stays inside the tap, before countdown, animation or other awaits.
  try {
    const playback = current.play();
    // Clear a previous load error immediately while this retry is pending.
    syncMusic();
    await playback;
    if (attempt !== musicAttempt) return;
    autoMusicPending = false;
    $("#track-status").textContent = "";
  } catch (error) {
    if (attempt !== musicAttempt || error.name === "AbortError") return;
    // A rejected play() can leave paused=false even though no audio exists.
    // Settle the media element as well as its reported playback status.
    current.pause();
    autoMusicPending = true;
    $("#track-status").textContent = error.name === "NotAllowedError"
      ? "Musik akan menemani setelah ketukan pertamamu."
      : "Lagu belum bisa diputar. Coba muat ulang halaman.";
  }
  syncMusic();
}
// One background song accompanies the opening and every chapter. A real tap
// retries playback if the browser blocked the initial page-load attempt.
document.addEventListener("click", event => {
  if (autoMusicPending && event.isTrusted) void playTrack();
}, true);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    autoMusicPending = true;
    pauseTrack();
  } else if (autoMusicPending) void playTrack();
});

function setBlob(key, blob) {
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  if (key === "track") localTrackUrl = url;
  else localPhotos.set(key, url);
}
async function applyLocalTrack(blob) {
  const original = content.tracks[0].originalUpload;
  if (original && blob.size === original.bytes && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    if (hash === original.sha256) {
      localTrackUrl = undefined;
      return;
    }
  }
  setBlob("track", blob);
}
function warmChapter(scene) {
  const root = $(`[data-scene="${scene}"]`);
  if (!root) return;
  // Prepare all three poem photographs while the preceding garden is read.
  // Keep only source identities, allowing the browser to manage decoded memory.
  if (scene === 2) content.poems.forEach((_, index) => {
    const src = localPhotos.get(`poem${index}`) || content.photos[`poem${index}`];
    if (!src || prefetchedPoems.has(src)) return;
    prefetchedPoems.add(src);
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    void image.decode?.().catch(() => prefetchedPoems.delete(src));
  });
  root.querySelectorAll(".photo-slot img, .romance-flower, .garden-flower-art").forEach(image => {
    image.loading = "eager";
    image.decoding = "async";
    // A completed download may still await asynchronous decoding offscreen.
    void image.decode?.().catch(() => {});
  });
}
function applyPhotos() {
  $$("[data-photo]").forEach((el) => {
    const key = el.dataset.photo,
      src = localPhotos.get(key) || content.photos[key];
    if (el.dataset.src === src) return;
    el.querySelector("img")?.remove();
    el.classList.toggle("has-photo", !!src);
    el.dataset.src = src || "";
    if (src) {
      const img = new Image();
      img.alt = el.getAttribute("aria-label");
      img.decoding = "async";
      img.src = src;
      img.loading = el.closest('.letter-frame') && !$("#letter-reading").hidden ? "eager" : "lazy";
      img.onerror = () => {
        img.remove();
        el.classList.remove("has-photo");
      };
      el.prepend(img);
    }
  });
  const photos = [
    ...new Set(
      photoKeys
        .map((key) => localPhotos.get(key) || content.photos[key])
        .filter(Boolean),
    ),
  ];
  warmChapter(active);
  warmChapter(adjacentScene(active, 1));
  for (const src of prefetchedPoems) if (!photos.includes(src)) prefetchedPoems.delete(src);
  window.dispatchEvent(new CustomEvent("photoschanged", { detail: photos }));
  $("#photo-count").textContent =
    `${photos.length} foto terisi · ${photoKeys.filter((key) => !localPhotos.has(key) && !content.photos[key]).length} tempat kosong`;
}
function applySettings() {
  $$("[data-recipient]").forEach(
    (el) => (el.textContent = settings.recipient || content.recipient),
  );
  $("#editor-form").elements.recipient.value =
    settings.recipient || content.recipient;
  const date = settings.birthday || content.birthday;
  if (date && !Number.isNaN(Date.parse(date))) {
    const d = new Date(date);
    $("#editor-form").elements.birthday.value = new Date(
      d.getTime() - d.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  } else $("#editor-form").elements.birthday.value = "";
  updateCountdown();
}
function updateCountdown() {
  const date = settings.birthday || content.birthday,
    el = $("#birthday-countdown");
  if (!date || Number.isNaN(Date.parse(date))) {
    el.textContent = "Ambis Copenhagen · dibuat dengan seluruh rasa.";
    return;
  }
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(date) - Date.now()) / 1000),
  );
  el.textContent = seconds
    ? `Menuju hari spesialmu · ${Math.floor(seconds / 86400)} hari ${String(Math.floor(seconds / 3600) % 24).padStart(2, "0")} jam ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")} menit ${String(seconds % 60).padStart(2, "0")} detik`
    : "Hari spesialmu sudah tiba. Selamat ulang tahun ♡";
}
const status = (message) => ($("#editor-status").textContent = message);
window.addEventListener("photosrendererror", (event) => status(event.detail));
$("#edit-from-chapters").onclick = () => {
  $("#chapter-dialog").close();
  $("#open-editor").click();
};
$("#open-editor").onclick = () => {
  $("#editor-dialog").showModal();
  universe.setPaused(true);
};
$("#editor-dialog").addEventListener("close", () => {
  universe.setPaused(false);
  (active === 0 ? $("#open-editor") : $("#chapter-index")).focus({ preventScroll: true });
});
$("#close-editor").onclick = () => $("#editor-dialog").close();
const storageReady = openMemories()
  .then(async (s) => {
    store = s;
    for (const [key, value] of await s.all()) {
      if (key === "settings") settings = value;
      else if (key === "track" && value instanceof Blob) await applyLocalTrack(value);
      else if (value instanceof Blob) setBlob(key, value);
    }
    applySettings();
    applyPhotos();
  })
  .catch(() => {
    status(
      "Penyimpanan browser tidak tersedia. Edit src/content.js untuk perubahan permanen.",
    );
  });
$("#editor-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  await storageReady;
  const next = {
    recipient: f.elements.recipient.value.trim(),
    birthday: f.elements.birthday.value
      ? new Date(f.elements.birthday.value).toISOString()
      : "",
  };
  try {
    if (!store) throw Error();
    await store.put("settings", next);
    settings = next;
    applySettings();
    status("Nama & tanggal tersimpan di browser ini.");
  } catch {
    status("Pengaturan belum bisa disimpan. Periksa penyimpanan browser.");
  }
};
async function savePhoto(key, file) {
  await storageReady;
  if (!store) throw new Error("Penyimpanan browser tidak tersedia.");
  const blob = await optimizePhoto(file);
  await store.put(key, blob);
  setBlob(key, blob);
}
$$("[data-upload]").forEach(
  (input) =>
    (input.onchange = async () => {
      if (!input.files[0]) return;
      try {
        await savePhoto(input.dataset.upload, input.files[0]);
        applyPhotos();
        status("Foto tersimpan dan dioptimalkan.");
      } catch (e) {
        status(e.message || "Foto belum bisa disimpan.");
      }
      input.value = "";
    }),
);
$("#bulk-photos").onchange = async (e) => {
  await storageReady;
  const available = photoKeys.filter(
    (k) => k.startsWith("orbit") && !localPhotos.has(k) && !content.photos[k],
  );
  const files = [...e.target.files];
  if (!files.length) return;
  let saved = 0,
    failed = 0;
  for (let i = 0; i < Math.min(files.length, available.length); i++) {
    status(
      `Menyimpan foto ${i + 1} dari ${Math.min(files.length, available.length)}…`,
    );
    try {
      await savePhoto(available[i], files[i]);
      saved++;
    } catch {
      failed++;
    }
  }
  applyPhotos();
  status(
    `${saved} foto tersimpan.${failed ? " " + failed + " foto gagal; gunakan JPG, PNG, atau WebP maksimal 8 MB." : ""}${files.length > available.length ? " Sisa file tidak dimasukkan karena tempat sudah penuh." : ""}`,
  );
  e.target.value = "";
};
$$("[data-remove]").forEach(
  (b) =>
    (b.onclick = async () => {
      await storageReady;
      try {
        if (!store) throw Error();
        await store.remove(b.dataset.remove);
        localPhotos.delete(b.dataset.remove);
        if (urls.has(b.dataset.remove)) {
          URL.revokeObjectURL(urls.get(b.dataset.remove));
          urls.delete(b.dataset.remove);
        }
        applyPhotos();
        status("Foto lokal dihapus.");
      } catch {
        status("Foto belum bisa dihapus.");
      }
    }),
);
$("#audio-upload").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await storageReady;
  if (!file.type.startsWith("audio/") || file.size > 15 * 1024 * 1024) {
    status("Pilih audio maksimal 15 MB.");
    return;
  }
  try {
    if (!store) throw Error();
    pauseTrack();
    await store.put("track", file);
    await applyLocalTrack(file);
    autoMusicPending = true;
    void playTrack();
    status("Lagu pertama tersimpan di browser ini.");
  } catch {
    status("Lagu belum bisa disimpan.");
  }
  e.target.value = "";
};
$("#reset-local").onclick = async () => {
  await storageReady;
  try {
    if (!store) throw Error();
    await store.clear();
    pauseTrack();
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
    localPhotos.clear();
    localTrackUrl = undefined;
    settings = {};
    applySettings();
    applyPhotos();
    autoMusicPending = true;
    void playTrack();
    status("Semua isian lokal dihapus. Konten bawaan dipulihkan.");
  } catch {
    status("Isian lokal belum bisa dihapus.");
  }
};
renderPoem();
applySettings();
updateNav();
setInterval(updateCountdown, 1000);

// Preload immediately; neither the Gargantua assets nor a chapter transition
// gates the music. Existing locally selected music still takes precedence.
prepareTrack();
if (!document.hidden) void playTrack();
void storageReady.then(() => {
  if (localTrackUrl) {
    prepareTrack();
    autoMusicPending = true;
  }
  if (autoMusicPending && !document.hidden) void playTrack();
});
