import "./style.css";
import "./florals.css";
import "./wish-garden.css";
import "./reading-layout.css";
import "./letter-scroll.css";
import "./story-polish.css";
import "./keepsakes.css";
import { setKeepsake, liftKeepsake } from "./keepsakes.js";
import { createWishGarden } from "./wish-garden.js";
import { content } from "./content.js";
import { quotes } from "./quotes.js";
import { createUniverse } from "./universe.js";
import { createMotion } from "./motion.js";
import { createScrollLetter } from "./letter-scroll.js";
import { escapeHtml as esc, photo, flowers } from "./story-ui.js";
import { renderStory } from "./story-view.js";
import { chapters, readingChapters, adjacentScene } from "./story-chapters.js";
import { createPhotoGallery } from "./media/photo-gallery.js";
import { startSoundtrack } from "./media/soundtrack.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let active = 0,
  changing = false,
  poemIndex = 0;
let introRun = 0,
  introPhase = "idle",
  wishState = "waiting";
let storyVersion = 0,
  letterRun = 0,
  wishRun = 0;
$("#app").innerHTML = renderStory(content);
startSoundtrack(content.tracks[0], import.meta.env.BASE_URL);
const gallery = createPhotoGallery(content, import.meta.env.BASE_URL);
const warmChapter = gallery.warmChapter;
const applyPhotos = gallery.bind;

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
  const chrome = [$(".story-header"), $("#story-nav")];
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

function applySettings() {
  $$("[data-recipient]").forEach(element => { element.textContent = content.recipient; });
  updateCountdown();
}
function updateCountdown() {
  const date = content.birthday,
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
window.addEventListener("photosrendererror", event => {
  $("#media-status").textContent = event.detail;
});
renderPoem();
applySettings();
updateNav();
gallery.initialize();
warmChapter(active);
warmChapter(adjacentScene(active, 1));
setInterval(updateCountdown, 1000);
