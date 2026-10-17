import "./style.css";
import "./florals.css";
import "./wish-garden.css";
import "./reading-layout.css";
import { flowerSrc } from "./florals.js";
import { createWishGarden } from "./wish-garden.js";
import { content, ORBIT_PHOTO_COUNT } from "./content.js";
import { quotes } from "./quotes.js";
import { createUniverse } from "./universe.js";
import { openMemories, optimizePhoto } from "./memories.js";
import { createMotion } from "./motion.js";
import { captureChapterChrome } from "./chapter-chrome.js";

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
  poemIndex = 0,
  letterIndex = 0;
let introRun = 0,
  introPhase = "idle",
  wishState = "waiting";
let store,
  settings = {},
  localTrackUrl,
  audio,
  ambient;
let storyVersion = 0,
  letterRun = 0,
  wishRun = 0;
const urls = new Map(),
  localPhotos = new Map();
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
const chapters = [
  "Semestamu",
  "Hari lahirmu",
  "Bait untukmu",
  "Tiga doa",
  "Suratku",
  "Nada kita",
  "Satu harapan",
];
const nextLabels = [
  "Masuk ke ceritanya",
  "Ada kata untukmu",
  "Titip tiga doa",
  "Ada surat untukmu",
  "Dengarkan sebentar",
  "Saatnya buat harapan",
  "",
];

$("#app").innerHTML = `
<header class="story-header"><a href="#semesta" id="home-link" aria-label="Kembali ke awal">a little universe <i>for you.</i></a><button id="sound-toggle" aria-pressed="false" aria-label="Putar nada lembut"><span aria-hidden="true">♫</span><span id="sound-label">Suara mati</span></button></header>
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
  <section class="scene poems-scene" data-scene="2" aria-labelledby="poem-title" hidden inert><div class="scene-inner poem-layout">
    <div class="poem-visual">${flowers("flower-poem")}<div id="poem-photo"></div><div class="poem-small-photo">${photo("orbit04", "Sebuah detail kecil")}</div><span class="handwritten">some feelings become poems.</span></div>
    <article class="poem-paper"><p class="eyebrow">KATA-KATA YANG SELALU PULANG PADAMU</p><div id="poem-page"><h2 id="poem-title" tabindex="-1"></h2><p id="poem-subtitle" class="poem-subtitle"></p><p id="poem-text" class="poem-text"></p></div><div class="page-controls"><button id="prev-poem" class="round" aria-label="Puisi sebelumnya">←</button><span id="poem-position" aria-live="polite"></span><button id="next-poem" class="round" aria-label="Puisi selanjutnya">→</button></div></article>
  </div></section>
  <section class="scene quotes-scene garden-scene" data-scene="3" aria-labelledby="quote-heading" hidden inert><div class="scene-inner garden-layout">
    <div class="garden-intro"><p class="eyebrow">SEBUAH KEBUN KECIL UNTUKMU</p><h2 id="quote-heading" tabindex="-1">Untukmu,<br> <em>semoga selalu<br> ada yang mekar.</em></h2><p>Tiga bunga, tiga harapan.<br>Sentuh bunganya satu per satu.<br>Biarkan doa-doa baik ini mekar untukmu.</p><div class="garden-photos">${photo("moment1", "Satu hari yang indah")}${photo("orbit05", "Yang ingin kusimpan")}${flowers("flower-garden")}</div><span class="handwritten">may good things find you.</span></div>
    <div class="garden-experience" id="wish-garden"></div>
  </div></section>
  <section class="scene letter-scene" data-scene="4" aria-labelledby="letter-heading" hidden inert><div class="scene-inner letter-layout">
    <div class="letter-intro" id="letter-intro"><p class="eyebrow">YANG INI, KUTULIS SENDIRI</p><h2 id="letter-heading" tabindex="-1">Tidak semua rasa<br>muat dalam puisi.<br><em>Jadi, ini suratku.</em></h2><button id="open-letter" class="envelope" aria-label="Buka surat untukmu"><span class="envelope-back"></span><span class="envelope-paper">dear, you.</span><span class="envelope-front"></span><span class="envelope-flap"></span><span class="wax-seal">a.</span></button><button id="open-letter-text" class="text-button">Ketuk untuk membuka surat ${arrow}</button></div>
    <article id="letter-reading" class="letter-reading" hidden><div class="letter-image">${photo("hero", "Senyummu, favoritku")}${flowers("flower-letter")}<span class="handwritten">my favorite person.</span></div><div class="letter-paper"><p class="eyebrow">UNTUK <span data-recipient></span>, DENGAN SELURUH RASA</p><div id="letter-page"><h2 id="letter-title" tabindex="-1">Happy birthday,<br><em>my love.</em></h2><p id="letter-paragraph"></p><p class="handwritten signature">${esc(content.sender)}</p></div><div class="page-controls"><button id="prev-letter" class="round" aria-label="Halaman surat sebelumnya">←</button><span id="letter-position" aria-live="polite"></span><button id="next-letter" class="round" aria-label="Halaman surat selanjutnya">→</button></div><button id="close-letter" class="text-button">Lipat kembali suratnya</button></div></article>
  </div></section>
  <section class="scene music-scene" data-scene="5" aria-labelledby="music-title" hidden inert><div class="scene-inner music-layout"><div class="record-composition"><div class="record-sleeve">${photo("moment2", "Tentang kita")}</div><div class="vinyl" aria-hidden="true"><div>a.</div></div><span class="handwritten">if this feeling had a sound.</span></div><div class="music-copy"><p class="eyebrow">BERHENTI SEBENTAR DI SINI</p><h2 id="music-title" tabindex="-1">Some songs<br><em>sound like you.</em></h2><p>Kalau ingin, biarkan satu lagu menemani sisa cerita ini.</p><div class="track-list">${content.tracks.map((t, i) => `<button class="track" data-track="${i}"><span class="track-state">▷</span><span><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span></button>`).join("")}</div><p id="track-status" role="status">Atau nikmati nada lembut yang sudah kusiapkan.</p><button class="text-button" id="ambient-toggle" aria-pressed="false">Putar nada lembut ♫</button></div></div></section>
  <section class="scene wish-scene" data-scene="6" aria-labelledby="wish-title" hidden inert><div class="wish-halo"></div><div class="celebration-particles" aria-hidden="true">${Array.from({ length: 32 }, (_, i) => `<span style="--i:${i};--x:${(i * 37) % 100}%;--delay:${(i % 8) * 0.08}s"></span>`).join("")}</div><div class="scene-inner wish-layout">
    <div class="wish-copy"><p class="eyebrow" id="wish-step">SATU HAL TERAKHIR. YANG PALING PENTING.</p><h2 id="wish-title" tabindex="-1">Hari ini,<br><em>milikmu.</em></h2><p id="wish-instruction">Semua cahaya ini untukmu.<br>Sudah siap membuat satu harapan?</p><div class="wish-steps" aria-label="Langkah perayaan"><span class="current" data-wish-step="0">01 <i>Buat harapan</i></span><span data-wish-step="1">02 <i>Tiup lilin</i></span><span data-wish-step="2">03 <i>Rayakan</i></span></div><button class="primary light" id="ready-wish">Aku siap buat harapan ${arrow}</button><button class="primary light blow-button" id="blow-candle" hidden>Tiup lilinnya <span aria-hidden="true">♡</span></button><p class="wish-hint" id="wish-hint">Ambil waktu sebanyak yang kamu butuhkan.</p></div>
    <div class="cake-composition" id="cake" aria-hidden="true"><div class="candle-glow"></div><div class="cake-candle"><div class="flame"></div><span class="smoke"></span><div class="wick"></div><div class="candle-body"></div></div><div class="cake-top"></div><div class="cake-body"><span class="cake-ribbon">for you, always.</span></div><div class="cake-bottom"></div><div class="cake-plate"></div><div class="cake-stand"></div><div class="cake-foot"></div><div class="cake-spark spark-one">✧</div><div class="cake-spark spark-two">✧</div></div>
    <div class="wish-result" id="wish-result" hidden><p class="eyebrow">SEMOGA SEMESTA MENGAMINKAN</p><h2 id="birthday-title" tabindex="-1">Happy birthday,<br><em data-recipient></em>.</h2><p>Semoga hidup memelukmu selembut doa-doa baik hari ini.<br>Aku bahagia kamu ada.</p><span class="handwritten">always, and a little longer.</span><div><button class="primary light" id="relight">Buat harapan lagi ♡</button><button class="text-button" id="replay">Putar cerita dari awal ↺</button></div></div>
  </div></section>
</div></main>
<nav class="story-nav" id="story-nav" aria-label="Halaman cerita" hidden><button id="previous-scene" class="nav-back">← <span>Sebelumnya</span></button><div class="chapter-progress"><span id="chapter-name"></span><div class="progress-lines">${chapters.map((name, i) => `<button data-chapter="${i}" aria-label="Ke ${name}" ${i === 0 ? 'aria-current="step"' : ""}><span></span></button>`).join("")}</div></div><button id="next-scene" class="nav-next"></button></nav>
<button class="edit-trigger" id="open-editor">Isi kenangan →</button><p class="sr-only" id="scene-announcement" role="status"></p>
<dialog id="editor-dialog" aria-labelledby="editor-title"><button class="editor-close" id="close-editor">Tutup ×</button><div class="editor-heading"><div><p class="eyebrow">DI BALIK CERITA INI</p><h2 id="editor-title">Isi <em>kenangan.</em></h2></div>${flowers("flower-editor")}</div><p>${photoKeys.length} tempat untuk foto milikmu. Unggahan di sini hanya tersimpan di browser ini. Untuk dibagikan, isi <code>src/content.js</code> dan simpan file di <code>public/photos/</code>.</p><form id="editor-form"><label>Nama panggilan<input name="recipient" maxlength="60" placeholder="Kamu"></label><label>Tanggal ulang tahun <small>(opsional, waktu perangkat)</small><input name="birthday" type="datetime-local"></label><button class="primary" type="submit">Simpan nama & tanggal →</button><div class="bulk-upload"><label>Isi banyak foto sekaligus<small>Foto akan mengisi tempat kosong di semesta, sampai ${ORBIT_PHOTO_COUNT} foto.</small><input id="bulk-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p id="photo-count"></p></div><details><summary>Atur masing-masing foto</summary><div class="editor-photo-grid">${photoKeys.map((k) => `<label>${photoLabel(k)}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${k}"><button class="remove-photo" type="button" data-remove="${k}">Hapus foto lokal</button></label>`).join("")}</div></details><label>Lagu pilihan pertama <small>(maks. 15 MB)</small><input type="file" id="audio-upload" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"></label><p id="editor-status" role="status"></p><button class="text-button" type="button" id="reset-local">Hapus semua isian lokal</button></form></dialog>`;

const universe = createUniverse($("#universe"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const effects = createMotion(motion);
const animate = effects.play;
const wishGarden = createWishGarden($("#wish-garden"), quotes, {
  effects,
  motion,
  escapeHtml: esc,
});
async function goTo(index) {
  if (changing || index < 0 || index >= chapters.length || index === active)
    return;
  changing = true;
  const chrome = [$(".story-header"), $("#story-nav"), $("#open-editor")];
  const snapshots = motion.matches ? [] : captureChapterChrome(chrome);
  document.body.classList.add("chapter-changing");
  chrome.forEach(element => { element.inert = true; });
  updateNav(index);
  $("#stage").setAttribute("aria-busy", "true");
  $$("#story-nav button").forEach((button) => (button.disabled = true));
  const before = $(`[data-scene="${active}"]`),
    after = $(`[data-scene="${index}"]`),
    dir = index > active ? 1 : -1;
  if (active === 0) {
    introRun++;
    universe.settle();
  }
  before.inert = true;
  effects.reset(after);
  before.style.zIndex = "1";
  after.style.zIndex = "2";
  after.style.opacity = "0";
  after.hidden = false;
  after.inert = true;
  // Incoming and outgoing pages overlap for a single continuous dissolve.
  const shift = motion.matches ? 0 : 36 * dir;
  await Promise.all([
    ...chrome.filter(element => !element.hidden).map(element =>
      animate(element, [{ opacity: 0 }, { opacity: Number(getComputedStyle(element).opacity) }], 820)),
    ...snapshots.map(element =>
      animate(element, [{ opacity: Number(getComputedStyle(element).opacity) }, { opacity: 0 }], 820)),
    animate(
      before,
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: `translateY(${-shift / 2}px) scale(.985)` },
      ],
      820,
    ),
    animate(
      after,
      [
        { opacity: 0, transform: `translateY(${shift}px) scale(1.018)` },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      820,
    ),
  ]);
  before.hidden = true;
  before.classList.remove("is-active");
  effects.reset(before);
  before.style.removeProperty("z-index");
  after.inert = false;
  after.classList.add("is-active");
  effects.reset(after);
  after.style.removeProperty("z-index");
  chrome.forEach(element => { effects.reset(element); element.inert = false; });
  snapshots.forEach(element => { effects.reset(element); element.remove(); });
  document.body.classList.remove("chapter-changing");
  active = index;
  changing = false;
  $("#stage").removeAttribute("aria-busy");
  $$("#story-nav button").forEach((button) => (button.disabled = false));
  document.body.dataset.chapter = String(index);
  const title = after.querySelector('[tabindex="-1"]');
  title?.focus({ preventScroll: true });
  $("#scene-announcement").textContent = chapters[index];
  updateNav();
}
function updateNav(index = active) {
  document.body.dataset.chapter = String(index);
  $("#story-nav").hidden = index === 0;
  $("#chapter-name").textContent = chapters[index];
  $("#next-scene").innerHTML = esc(nextLabels[index]) + arrow;
  $("#next-scene").hidden = index === 6;
  $$("#story-nav [data-chapter]").forEach((b, i) => {
    if (i === index) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
    b.classList.toggle("passed", i < index);
  });
  const dark = [0, 3, 6].includes(index);
  document.body.classList.toggle("dark-scene", dark);
}
$("#previous-scene").onclick = () => goTo(active - 1);
$("#next-scene").onclick = () => goTo(active + 1);
$$("#story-nav [data-chapter]").forEach(
  (b) =>
    (b.onclick = () => {
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
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    changing
  )
    return;
  if (e.target.closest("button,a,input,textarea,select,summary")) return;
  if (e.key === "ArrowRight" && active > 0 && active < 6) {
    e.preventDefault();
    goTo(active + 1);
  }
  if (e.key === "ArrowLeft" && active > 0) {
    e.preventDefault();
    goTo(active - 1);
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
  poemIndex = letterIndex = 0;
  renderPoem();
  wishGarden.reset();
  renderLetter();
  $("#letter-reading").hidden = true;
  $("#letter-intro").hidden = false;
  $("#open-letter").classList.remove("opened");
  resetWish(false);
  universe.reset();
  if (active !== 0) await goTo(0);
  $("#begin").focus({ preventScroll: true });
}
$("#replay").onclick = replay;
let poemChanging = false,
  letterChanging = false;
async function changePage(el, render) {
  const version = storyVersion;
  await animate(
    el,
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-12px)" },
    ],
    220,
  );
  if (version !== storyVersion) return;
  render();
  await animate(
    el,
    [
      { opacity: 0, transform: "translateY(15px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    550,
  );
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
  applyPhotos();
}
async function turnPoem(dir) {
  if (poemChanging) return;
  poemChanging = true;
  $("#prev-poem").disabled = true;
  $("#next-poem").disabled = true;
  await changePage($(".poem-layout"), () => {
    poemIndex = (poemIndex + dir + content.poems.length) % content.poems.length;
    renderPoem();
  });
  poemChanging = false;
  $("#prev-poem").disabled = false;
  $("#next-poem").disabled = false;
}
$("#prev-poem").onclick = () => turnPoem(-1);
$("#next-poem").onclick = () => turnPoem(1);
function renderLetter() {
  $("#letter-paragraph").textContent = content.letter[letterIndex];
  $("#letter-position").textContent =
    `${letterIndex + 1} / ${content.letter.length}`;
  $("#prev-letter").disabled = letterIndex === 0;
  $("#next-letter").disabled = letterIndex === content.letter.length - 1;
}
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
  $("#letter-reading").hidden = false;
  renderLetter();
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
  $("#letter-intro").hidden = false;
  $("#open-letter").classList.remove("opened");
  await animate($("#letter-intro"), [{ opacity: 0 }, { opacity: 1 }], 500);
  if (token !== letterRun) return;
  if (active === 4) $("#open-letter").focus({ preventScroll: true });
  openingLetter = false;
};
async function turnLetter(dir) {
  if (
    letterChanging ||
    letterIndex + dir < 0 ||
    letterIndex + dir >= content.letter.length
  )
    return;
  letterChanging = true;
  await changePage($("#letter-page"), () => {
    letterIndex += dir;
    renderLetter();
  });
  letterChanging = false;
}
$("#prev-letter").onclick = () => turnLetter(-1);
$("#next-letter").onclick = () => turnLetter(1);

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
  $(".wish-copy").hidden = false;
  $("#cake").hidden = false;
  $("#cake").classList.remove("blown", "awaiting-wish");
  $("#blow-candle").hidden = true;
  $("#blow-candle").disabled = false;
  $("#ready-wish").hidden = false;
  setWishStep(0);
  $("#wish-step").textContent = "SATU HAL TERAKHIR. YANG PALING PENTING.";
  $("#wish-title").innerHTML = "Hari ini,<br><em>milikmu.</em>";
  $("#wish-instruction").innerHTML =
    "Semua cahaya ini untukmu.<br>Sudah siap membuat satu harapan?";
  $("#wish-hint").textContent = "Ambil waktu sebanyak yang kamu butuhkan.";
  if (focus) $("#ready-wish").focus({ preventScroll: true });
}
$("#relight").onclick = () => resetWish();

function pauseTrack() {
  audio?.pause();
  $$(".track").forEach((t) => {
    t.classList.remove("playing");
    t.querySelector(".track-state").textContent = "▷";
  });
  $(".vinyl").classList.remove("playing");
}
function soundLabels() {
  const playing = !!ambient || !!(audio && !audio.paused);
  $("#sound-toggle").setAttribute("aria-pressed", String(playing));
  $("#sound-toggle").setAttribute(
    "aria-label",
    playing ? "Jeda musik" : "Putar nada lembut",
  );
  $("#sound-label").textContent = playing ? "Suara menyala" : "Suara mati";
  $("#ambient-toggle").textContent = ambient
    ? "Jeda nada lembut Ⅱ"
    : "Putar nada lembut ♫";
  $("#ambient-toggle").setAttribute("aria-pressed", String(!!ambient));
}
async function stopAmbient() {
  if (ambient) {
    const current = ambient;
    ambient = undefined;
    await current.close();
  }
}
async function toggleAmbient() {
  if (ambient) {
    await stopAmbient();
    soundLabels();
    return;
  }
  pauseTrack();
  try {
    const context = new AudioContext();
    await context.resume();
    ambient = context;
    const master = context.createGain();
    master.gain.value = 0.04;
    master.connect(context.destination);
    [130.81, 164.81, 196, 261.63, 329.63].forEach((frequency, i) => {
      const osc = context.createOscillator(),
        gain = context.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.17,
        context.currentTime + 2 + i * 0.3,
      );
      osc.connect(gain);
      gain.connect(master);
      osc.start();
    });
  } catch {
    $("#track-status").textContent = "Audio belum bisa diputar di browser ini.";
  }
  soundLabels();
}
$("#ambient-toggle").onclick = toggleAmbient;
$("#sound-toggle").onclick = async () => {
  if (audio && !audio.paused) {
    pauseTrack();
    soundLabels();
  } else await toggleAmbient();
};
$$("[data-track]").forEach(
  (b) =>
    (b.onclick = async () => {
      const i = Number(b.dataset.track),
        t = content.tracks[i],
        src = i === 0 ? localTrackUrl || t.src : t.src;
      if (!src) {
        $("#track-status").textContent =
          "Lagu ini belum diisi. Kamu tetap bisa menikmati nada lembut di bawah.";
        return;
      }
      if (audio && !audio.paused && audio.datasetIndex === i) {
        pauseTrack();
        soundLabels();
        return;
      }
      await stopAmbient();
      pauseTrack();
      audio = new Audio(src);
      audio.datasetIndex = i;
      try {
        await audio.play();
        b.classList.add("playing");
        b.querySelector(".track-state").textContent = "Ⅱ";
        $(".vinyl").classList.add("playing");
        $("#track-status").textContent = t.title;
      } catch {
        $("#track-status").textContent =
          "Lagu belum bisa diputar. Periksa format atau lokasi filenya.";
      }
      audio.onended = () => {
        pauseTrack();
        soundLabels();
      };
      soundLabels();
    }),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseTrack();
    stopAmbient().then(soundLabels);
  }
});

function setBlob(key, blob) {
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  if (key === "track") localTrackUrl = url;
  else localPhotos.set(key, url);
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
      img.src = src;
      img.loading = "lazy";
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
$("#open-editor").onclick = () => {
  $("#editor-dialog").showModal();
  universe.setPaused(true);
};
$("#editor-dialog").addEventListener("close", () => universe.setPaused(false));
$("#close-editor").onclick = () => $("#editor-dialog").close();
const storageReady = openMemories()
  .then(async (s) => {
    store = s;
    for (const [key, value] of await s.all()) {
      if (key === "settings") settings = value;
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
    setBlob("track", file);
    soundLabels();
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
    soundLabels();
    status("Semua isian lokal dihapus. Konten bawaan dipulihkan.");
  } catch {
    status("Isian lokal belum bisa dihapus.");
  }
};
renderPoem();
renderLetter();
applySettings();
updateNav();
setInterval(updateCountdown, 1000);
