import "./style.css";
import { content } from "./content.js";
import { createUniverse } from "./universe.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const photo = (key, label, extra = "") =>
  `<div class="photo-slot ${extra}" data-photo="${key}" role="img" aria-label="${esc(label)}"><span class="photo-mark" aria-hidden="true">✧</span><span class="photo-label">${esc(label)}</span></div>`;
let poemIndex = 0;
let trackIndex = 0;
let audio;
let ambient;
let wishBlown = false;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

$("#app").innerHTML = `
  <header class="site-header"><a class="wordmark" href="#home">AMBIS <span>COPENHAGEN</span></a><nav aria-label="Navigasi utama"><a href="#poems">Puisi</a><a href="#moments">Momen</a><a href="#letter">Surat untukmu <span aria-hidden="true">↗</span></a></nav></header>
  <main id="main">
    <section class="hero" id="home" aria-labelledby="hero-title">
      <canvas id="universe" aria-hidden="true"></canvas>
      <div class="hero-top"><span>SEBUAH SEMESTA KECIL UNTUKMU</span><span>VOL. 01 — WITH LOVE</span></div>
      <div class="hero-copy"><p class="eyebrow">OF ALL THE STARS, I FOUND YOU.</p><h1 id="hero-title">Semesta punya<br>banyak bintang.<br><em>Favoritku, kamu.</em></h1><p class="hero-description">Untuk hari lahirmu, dan semua hari setelahnya.<br>Sebuah tempat untuk hal-hal yang tak habis diucapkan.</p><button class="light-button" id="begin">Buka semesta kita <span aria-hidden="true">↗</span></button><p id="birthday-countdown" class="birthday-countdown" aria-live="off"></p></div>
      <div class="hero-aside"><span class="orbit-symbol" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><path d="M20 0v40M0 20h40M6 6l28 28M6 34L34 6"/></svg></span><p>Some things<br>are written<br><i>in the stars.</i></p></div>
      <div class="hero-bottom"><span>SCROLL PELAN-PELAN. INI TENTANG KITA.</span><a href="#dedication" aria-label="Lanjut ke ucapan">↓</a><span>01 / FOREVER</span></div>
    </section>

    <section class="dedication section-pad" id="dedication"><div class="dedication-portrait">${photo("portrait", "Potret favoritku", "oval-photo")}<span class="handwritten">my favorite person</span></div><div class="dedication-copy"><p class="eyebrow">HARI INI, DUNIA SEDIKIT LEBIH INDAH.</p><h2>Karena pada suatu hari,<br><em>kamu lahir.</em></h2><p>Dan dari semua kebetulan yang indah, bertemu denganmu adalah yang paling ingin kuulang.</p><p>Ini bukan sekadar ucapan ulang tahun. Ini beberapa keping ingatan, sedikit puisi, dan banyak sekali rasa yang kusimpan untukmu, <span data-recipient></span>.</p><a class="text-link" href="#surprises">Ada sesuatu untukmu <span>↘</span></a></div></section>

    <section class="surprises section-pad" id="surprises"><div class="section-heading"><p class="eyebrow">EMPAT CARA UNTUK BILANG SAYANG</p><h2>Choose your <em>little surprise.</em></h2></div><div class="surprise-grid"><a href="#poems"><span class="menu-art" aria-hidden="true">❧</span><span class="menu-number">01 / WORDS</span><h3>Di antara bait</h3><span>Puisi yang menemukanmu ↗</span></a><a href="#moments"><span class="menu-art" aria-hidden="true">◷</span><span class="menu-number">02 / MEMORIES</span><h3>Some moments</h3><span>Yang ingin kuingat lagi ↗</span></a><button id="open-playlist"><span class="menu-art record-mini" aria-hidden="true">◉</span><span class="menu-number">03 / MELODIES</span><h3>Sounds like us</h3><span>Lagu untuk menemanimu ↗</span></button><a href="#letter"><span class="menu-art" aria-hidden="true"><svg width="44" height="38" viewBox="0 0 44 38" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M2 5h40v28H2z M2 5l20 16L42 5 M2 33l14-15 M42 33L28 18"/></svg></span><span class="menu-number">04 / A LITTLE GIFT</span><h3>Dear, you</h3><span>Satu surat, banyak rasa ↗</span></a></div></section>

    <section class="poems section-pad" id="poems" aria-labelledby="poem-heading"><div class="poem-heading"><p class="eyebrow">KUMPULAN KATA YANG BERUJUNG PADAMU</p><h2 id="poem-heading">Things I couldn't say.<br><em>So I wrote.</em></h2></div><div class="poem-layout"><div class="poem-photo-wrap"><div id="poem-photo"></div><span class="poem-photo-caption handwritten">a little piece of you.</span><span class="vertical-label">AN ANTHOLOGY OF US / 01</span></div><article class="poem-paper" aria-live="polite"><div class="poem-meta"><span id="poem-count"></span><span>CATATAN HATI</span></div><h3 id="poem-title"></h3><p class="poem-subtitle" id="poem-subtitle"></p><p class="poem-text" id="poem-text"></p><div class="poem-controls"><button class="circle-button" id="prev-poem" aria-label="Puisi sebelumnya">←</button><span id="poem-position"></span><button class="circle-button" id="next-poem" aria-label="Puisi selanjutnya">→</button></div></article></div></section>

    <section class="moments section-pad" id="moments"><div class="moments-heading"><p class="eyebrow">NO GRAND OCCASION. JUST US.</p><h2>Ordinary days.<br><em>Extraordinary you.</em></h2><p>Kalau waktu bisa dilipat,<br>aku akan menyimpan bagian-bagian ini.</p></div><div class="moments-grid">${content.moments.map((m, i) => `<button class="moment-card moment-${i}" data-moment="${i}"><div class="moment-photo">${photo("moment" + i, "Kenangan " + String(i + 1).padStart(2, "0"))}<span class="expand-photo" aria-hidden="true">↗</span></div><span class="moment-date">${esc(m.date)}</span><h3>${esc(m.title)}</h3><p>${esc(m.note)}</p></button>`).join("")}</div><p class="moment-footnote handwritten">and the best is yet to come.</p></section>

    <section class="letter-section section-pad" id="letter"><p class="eyebrow">SATU PESAN BARU, KHUSUS UNTUKMU</p><h2>A letter, <em>with love.</em></h2><p>Ada yang ingin kusampaikan. Boleh dibuka sekarang.</p><button id="open-letter" class="envelope" aria-label="Buka amplop surat"><span class="envelope-flap"></span><span class="wax-seal">a.</span><span class="envelope-caption">untuk <span data-recipient></span>, dengan seluruh rasa.</span></button><span class="handwritten envelope-hint">press the envelope ↗</span></section>

    <section class="wish-section section-pad"><p class="eyebrow">ONE MORE THING, BEFORE YOU GO.</p><h2>Make a <em>wish.</em></h2><p>Pejamkan mata sebentar.<br>Semoga yang kamu semogakan, menemukan jalannya.</p><button class="candle" id="blow-candle" aria-label="Tiup lilin"><span class="flame"></span><span class="wick"></span><span class="candle-body"></span></button><p id="wish-message" role="status">Ketuk lilinnya, titipkan satu harapan.</p><button class="text-link" id="relight" hidden>Nyalakan lagi ↺</button><div class="closing">Happy birthday,<br><em>my favorite person.</em></div></section>
  </main>
  <footer><a href="#home" class="wordmark">AMBIS COPENHAGEN</a><p>DIBUAT DARI HAL-HAL KECIL, DAN RASA YANG BESAR.</p><div><button id="replay" class="footer-button">Ulangi semesta ↺</button><button id="open-editor" class="footer-button">Isi kenangan ↗</button></div></footer>

  <dialog id="intro-dialog" class="intro-dialog" aria-labelledby="intro-title"><button class="intro-skip" id="skip-intro">Lewati pembuka ↗</button><div class="intro-space"><div class="black-hole"><div class="accretion"></div><div class="hole-core"></div><div class="photo-orbit">${Array.from({ length: 24 }, (_, i) => `<div class="orbit-tile" style="--i:${i}" data-orbit="${i}"><span>✧</span></div>`).join("")}</div></div></div><div class="intro-words"><p class="eyebrow">MENDEKAT KE PUSAT SEMESTAKU</p><h2 id="intro-title">Ternyata, <em>semuanya kamu.</em></h2><p id="intro-count" aria-live="polite">03</p><p class="intro-note">Setiap kepingnya, satu kenangan.</p></div></dialog>
  <dialog id="letter-dialog" class="letter-dialog" aria-labelledby="letter-title"><button class="dialog-back" data-close>Kembali ↗</button><div id="mail-preview"><p class="eyebrow">YOU'VE GOT A LITTLE LOVE NOTE</p><span class="mail-icon" aria-hidden="true">✉</span><h2>Hey, <em>you.</em></h2><dl><div><dt>From</dt><dd>${esc(content.sender)}</dd></div><div><dt>To</dt><dd data-recipient></dd></div><div><dt>Message</dt><dd>A little surprise, just for you.</dd></div></dl><button id="see-letter" class="light-button">Buka lampiran <span>↗</span></button></div><article id="full-letter" hidden><p class="eyebrow">A BIRTHDAY LETTER / WITH ALL MY LOVE</p><h2 id="letter-title" tabindex="-1">Happy birthday,<br><em>my love.</em></h2><div class="letter-photo">${photo("hero", "Senyummu, favoritku")}</div>${content.letter.map((p) => `<p class="letter-paragraph">${esc(p)}</p>`).join("")}<p class="handwritten signature">Always, and a little longer.</p><button class="text-link" id="letter-music">Putar nada lembut ♫</button><p class="music-note">Melodi instrumental sederhana, dibuat untuk halaman ini.</p></article></dialog>
  <dialog id="playlist-dialog" class="playlist-dialog" aria-labelledby="playlist-title"><button class="dialog-back" data-close>Kembali ↗</button><p class="eyebrow">THE SOUNDTRACK OF A LITTLE UNIVERSE</p><h2 id="playlist-title">Sounds <em>like us.</em></h2><div class="vinyl" aria-hidden="true"><div><span>a.</span></div></div><p class="playlist-note" id="track-status" role="status">Pilih lagu. Beberapa rasa lebih mudah dinyanyikan.</p><div class="track-list">${content.tracks.map((t, i) => `<button class="track" data-track="${i}"><span>0${i + 1}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span><span class="track-state">▷</span></button>`).join("")}</div><button class="text-link" id="ambient-toggle">Putar nada lembut ♫</button><p class="music-note">Lagu pribadi bisa ditambahkan lewat “Isi kenangan”.</p></dialog>
  <dialog id="moment-dialog" class="moment-dialog" aria-labelledby="moment-title"><button class="dialog-back" data-close>Kembali ↗</button><div id="moment-detail-photo"></div><p class="eyebrow" id="moment-detail-date"></p><h2 id="moment-title"></h2><p id="moment-detail-note"></p></dialog>
  <dialog id="editor-dialog" class="editor-dialog" aria-labelledby="editor-title"><button class="dialog-back" data-close>Tutup ↗</button><p class="eyebrow">RUANG KECIL DI BALIK CERITA</p><h2 id="editor-title">Isi <em>kenangan.</em></h2><p>Foto dan nama di sini tersimpan di browser ini saja. Untuk dibagikan ke dia, masukkan file ke <code>public/photos/</code> dan atur <code>src/content.js</code>.</p><form id="editor-form"><label>Nama panggilan<input name="recipient" maxlength="60" placeholder="Kamu" /></label><label>Tanggal ulang tahun <small>(opsional, waktu perangkat ini)</small><input name="birthday" type="datetime-local" /></label><div class="editor-photo-grid">${Object.keys(
    content.photos,
  )
    .map(
      (k) =>
        `<label>${esc({ hero: "Foto surat & semesta", portrait: "Potret ucapan", poem0: "Puisi 01", poem1: "Puisi 02", poem2: "Puisi 03", moment0: "Kenangan 01", moment1: "Kenangan 02", moment2: "Kenangan 03", moment3: "Kenangan 04" }[k])}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${k}" /><button type="button" class="remove-photo" data-remove="${k}">Hapus foto lokal</button></label>`,
    )
    .join(
      "",
    )}</div><label>Lagu pilihan 01 <small>(maks. 15 MB, hanya browser ini)</small><input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav" id="audio-upload" /></label><button class="dark-button" type="submit">Simpan nama & tanggal ↗</button><p role="status" id="editor-status"></p><button class="text-link" type="button" id="reset-local">Hapus semua isian lokal</button></form></dialog>
`;

// Persist blobs in IndexedDB rather than filling synchronous localStorage with photos.
let db;
const localPhotos = new Map();
let localTrackUrl;
let settings = {};
const urls = new Map();
function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ambis-copenhagen", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("memories");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function storeRequest(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("memories", mode);
    const result = action(tx.objectStore("memories"));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function setBlob(key, blob) {
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  if (key === "track") localTrackUrl = url;
  else localPhotos.set(key, url);
}
function applyPhotos() {
  document.querySelectorAll("[data-photo]").forEach((el) => {
    const src =
      localPhotos.get(el.dataset.photo) || content.photos[el.dataset.photo];
    el.querySelector("img")?.remove();
    el.classList.toggle("has-photo", !!src);
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
  document.querySelectorAll("[data-orbit]").forEach((el, i) => {
    el.querySelector("img")?.remove();
    const key = Object.keys(content.photos)[
      i % Object.keys(content.photos).length
    ];
    const src =
      localPhotos.get(key) ||
      content.photos[key] ||
      localPhotos.get("hero") ||
      content.photos.hero;
    if (src) {
      const img = new Image();
      img.src = src;
      img.alt = "";
      el.prepend(img);
    }
  });
  window.dispatchEvent(
    new CustomEvent("photoschanged", {
      detail: [
        ...new Set([
          ...localPhotos.values(),
          ...Object.values(content.photos).filter(Boolean),
        ]),
      ],
    }),
  );
}
function applySettings() {
  document
    .querySelectorAll("[data-recipient]")
    .forEach((e) => (e.textContent = settings.recipient || content.recipient));
  $("#editor-form").elements.recipient.value =
    settings.recipient || content.recipient;
  const date = settings.birthday || content.birthday;
  if (date && !Number.isNaN(Date.parse(date))) {
    const d = new Date(date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    $("#editor-form").elements.birthday.value = local;
  } else $("#editor-form").elements.birthday.value = "";
  updateCountdown();
}
function updateCountdown() {
  const date = settings.birthday || content.birthday;
  const el = $("#birthday-countdown");
  if (!date || Number.isNaN(Date.parse(date))) {
    el.textContent = "A LITTLE BIRTHDAY UNIVERSE, JUST FOR YOU.";
    return;
  }
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(date) - Date.now()) / 1000),
  );
  if (!seconds) {
    el.textContent = "Hari spesialmu sudah tiba. Selamat ulang tahun ♡";
    return;
  }
  el.textContent = `MENUJU HARI SPESIALMU — ${Math.floor(seconds / 86400)} HARI : ${String(Math.floor(seconds / 3600) % 24).padStart(2, "0")} JAM : ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")} MENIT : ${String(seconds % 60).padStart(2, "0")} DETIK`;
}
function renderPoem() {
  const p = content.poems[poemIndex];
  $("#poem-count").textContent =
    String(poemIndex + 1).padStart(2, "0") +
    " / " +
    String(content.poems.length).padStart(2, "0");
  $("#poem-title").textContent = p.title;
  $("#poem-subtitle").textContent = p.subtitle;
  $("#poem-text").textContent = p.text;
  $("#poem-position").textContent =
    `${poemIndex + 1} dari ${content.poems.length}`;
  $("#poem-photo").innerHTML = photo(
    "poem" + poemIndex,
    "Sepotong cerita " + String(poemIndex + 1).padStart(2, "0"),
    "poem-photo",
  );
  $(".vertical-label").textContent = "AN ANTHOLOGY OF US / 0" + (poemIndex + 1);
  applyPhotos();
}
$("#prev-poem").onclick = () => {
  poemIndex = (poemIndex - 1 + content.poems.length) % content.poems.length;
  renderPoem();
};
$("#next-poem").onclick = () => {
  poemIndex = (poemIndex + 1) % content.poems.length;
  renderPoem();
};

function openDialog(id) {
  $(id).showModal();
  document.body.classList.add("modal-open");
}
function closeDialog(dialog) {
  dialog.close();
  if (!document.querySelector("dialog[open]"))
    document.body.classList.remove("modal-open");
}
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      document.body.classList.remove("modal-open");
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog(d);
    }
  });
});
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => closeDialog(b.closest("dialog"))));
$("#open-letter").onclick = () => {
  $("#mail-preview").hidden = false;
  $("#full-letter").hidden = true;
  openDialog("#letter-dialog");
};
$("#see-letter").onclick = () => {
  $("#mail-preview").hidden = true;
  $("#full-letter").hidden = false;
  $("#letter-dialog").scrollTop = 0;
  $("#letter-title").focus();
};
$("#open-playlist").onclick = () => openDialog("#playlist-dialog");
$("#open-editor").onclick = () => openDialog("#editor-dialog");
document.querySelectorAll("[data-moment]").forEach(
  (b) =>
    (b.onclick = () => {
      const i = Number(b.dataset.moment),
        m = content.moments[i];
      $("#moment-detail-photo").innerHTML = photo(
        "moment" + i,
        "Kenangan " + String(i + 1).padStart(2, "0"),
      );
      $("#moment-title").textContent = m.title;
      $("#moment-detail-date").textContent = m.date;
      $("#moment-detail-note").textContent = m.note;
      applyPhotos();
      openDialog("#moment-dialog");
    }),
);

let introTimer;
function finishIntro() {
  clearInterval(introTimer);
  closeDialog($("#intro-dialog"));
  $("#intro-dialog").classList.remove("zooming");
  $("#dedication").scrollIntoView({
    behavior: reducedMotion.matches ? "instant" : "smooth",
  });
}
function runIntro() {
  $("#intro-dialog").classList.remove("zooming");
  $("#intro-count").textContent = "03";
  openDialog("#intro-dialog");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => $("#intro-dialog").classList.add("zooming")),
  );
  let remaining = 3;
  introTimer = setInterval(() => {
    remaining--;
    $("#intro-count").textContent =
      remaining > 0 ? "0" + remaining : "Happy birthday.";
    if (remaining < -2) finishIntro();
  }, 1000);
}
$("#begin").onclick = runIntro;
$("#replay").onclick = runIntro;
$("#skip-intro").onclick = finishIntro;
$("#intro-dialog").addEventListener("close", () => clearInterval(introTimer));
$("#blow-candle").onclick = () => {
  if (wishBlown) return;
  wishBlown = true;
  $(".candle").classList.add("blown");
  $("#wish-message").textContent =
    "Semoga semesta mengaminkan. Selamat ulang tahun ♡";
  $("#relight").hidden = false;
  $("#blow-candle").setAttribute("aria-label", "Lilin sudah ditiup");
};
$("#relight").onclick = () => {
  wishBlown = false;
  $(".candle").classList.remove("blown");
  $("#wish-message").textContent = "Ketuk lilinnya, titipkan satu harapan.";
  $("#relight").hidden = true;
  $("#blow-candle").setAttribute("aria-label", "Tiup lilin");
};

// Gentle, user-triggered original tones; never autoplay or fetch third-party audio.
function pauseTrack() {
  audio?.pause();
  document.querySelectorAll(".track").forEach((track) => {
    track.classList.remove("playing");
    track.querySelector(".track-state").textContent = "▷";
  });
  $(".vinyl").classList.remove("playing");
}
async function toggleAmbient() {
  if (ambient) {
    await ambient.close();
    ambient = null;
    updateAmbientLabels();
    return;
  }
  pauseTrack();
  try {
    const ctx = new AudioContext();
    await ctx.resume();
    ambient = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.035;
    master.connect(ctx.destination);
    [130.81, 164.81, 196, 261.63, 329.63].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.17, ctx.currentTime + 2 + i * 0.3);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
    });
  } catch {
    $("#track-status").textContent = "Audio belum bisa diputar di browser ini.";
  }
  updateAmbientLabels();
}
function updateAmbientLabels() {
  ["#ambient-toggle", "#letter-music"].forEach((id) => {
    $(id).textContent = ambient ? "Jeda nada lembut Ⅱ" : "Putar nada lembut ♫";
    $(id).setAttribute("aria-pressed", String(!!ambient));
  });
}
$("#ambient-toggle").onclick = toggleAmbient;
$("#letter-music").onclick = toggleAmbient;
document.querySelectorAll("[data-track]").forEach(
  (b) =>
    (b.onclick = async () => {
      const i = Number(b.dataset.track),
        t = content.tracks[i],
        src = i === 0 ? localTrackUrl || t.src : t.src;
      if (!src) {
        $("#track-status").textContent =
          "Lagu ini belum diisi. Tambahkan lagu lewat “Isi kenangan”, atau nikmati nada lembut di bawah.";
        return;
      }
      if (audio && trackIndex === i && !audio.paused) {
        audio.pause();
        b.classList.remove("playing");
        b.querySelector(".track-state").textContent = "▷";
        $(".vinyl").classList.remove("playing");
        return;
      }
      if (ambient) {
        await ambient.close();
        ambient = null;
        updateAmbientLabels();
      }
      audio?.pause();
      document.querySelectorAll(".track").forEach((e) => {
        e.classList.remove("playing");
        e.querySelector(".track-state").textContent = "▷";
      });
      audio = new Audio(src);
      trackIndex = i;
      try {
        await audio.play();
        b.classList.add("playing");
        b.querySelector(".track-state").textContent = "Ⅱ";
        $(".vinyl").classList.add("playing");
        $("#track-status").textContent = t.title;
      } catch {
        $("#track-status").textContent =
          "Lagu belum bisa diputar. Periksa format dan lokasi file audio.";
      }
      audio.onended = () => {
        b.classList.remove("playing");
        b.querySelector(".track-state").textContent = "▷";
        $(".vinyl").classList.remove("playing");
      };
    }),
);

const status = (message) => ($("#editor-status").textContent = message);
$("#editor-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const next = {
    recipient: f.elements.recipient.value.trim(),
    birthday: f.elements.birthday.value
      ? new Date(f.elements.birthday.value).toISOString()
      : "",
  };
  try {
    if (!db) throw Error();
    await storeRequest("readwrite", (s) => s.put(next, "settings"));
    settings = next;
    applySettings();
    status("Nama & tanggal tersimpan di browser ini.");
  } catch {
    status(
      "Penyimpanan browser tidak tersedia. Ubah src/content.js untuk menyimpan permanen.",
    );
  }
};
document.querySelectorAll("[data-upload]").forEach(
  (input) =>
    (input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      ) {
        status("Pilih foto JPG, PNG, atau WebP maksimal 8 MB.");
        input.value = "";
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext("2d")
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise((r) =>
          canvas.toBlob(r, "image/webp", 0.85),
        );
        if (!blob || !db) throw Error();
        await storeRequest("readwrite", (s) =>
          s.put(blob, input.dataset.upload),
        );
        setBlob(input.dataset.upload, blob);
        applyPhotos();
        status("Foto tersimpan. Ukuran dioptimalkan agar tetap ringan.");
      } catch {
        status(
          "Foto gagal disimpan. Coba file lain atau periksa ruang penyimpanan browser.",
        );
      }
      input.value = "";
    }),
);
document.querySelectorAll("[data-remove]").forEach(
  (b) =>
    (b.onclick = async () => {
      try {
        if (!db) throw Error();
        const key = b.dataset.remove;
        await storeRequest("readwrite", (s) => s.delete(key));
        localPhotos.delete(key);
        if (urls.has(key)) {
          URL.revokeObjectURL(urls.get(key));
          urls.delete(key);
        }
        applyPhotos();
        status(
          "Foto lokal dihapus. Foto dari content.js, bila ada, tetap digunakan.",
        );
      } catch {
        status("Foto lokal belum berhasil dihapus.");
      }
    }),
);
$("#audio-upload").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("audio/") || file.size > 15 * 1024 * 1024) {
    status("Pilih file audio maksimal 15 MB.");
    return;
  }
  try {
    if (!db) throw Error();
    pauseTrack();
    await storeRequest("readwrite", (s) => s.put(file, "track"));
    setBlob("track", file);
    status("Lagu 01 tersimpan di browser ini.");
  } catch {
    status("Lagu gagal disimpan. Periksa ruang penyimpanan browser.");
  }
  e.target.value = "";
};
$("#reset-local").onclick = async () => {
  try {
    if (!db) throw Error();
    await storeRequest("readwrite", (s) => s.clear());
    pauseTrack();
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
    localPhotos.clear();
    localTrackUrl = undefined;
    settings = {};
    applySettings();
    applyPhotos();
    status("Semua isian lokal dihapus. Konten bawaan dipulihkan.");
  } catch {
    status("Isian lokal belum berhasil dihapus.");
  }
};

createUniverse($("#universe"));
renderPoem();
applySettings();
setInterval(updateCountdown, 1000);
try {
  db = await openStore();
  const keys = await storeRequest("readonly", (s) => s.getAllKeys());
  for (const key of keys) {
    const value = await storeRequest("readonly", (s) => s.get(key));
    if (key === "settings") settings = value;
    else if (value instanceof Blob) setBlob(key, value);
  }
  applyPhotos();
  applySettings();
} catch {
  status(
    "Penyimpanan browser tidak tersedia. Preview tetap bisa dibuka; edit src/content.js untuk perubahan permanen.",
  );
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio?.pause();
    document
      .querySelectorAll(".playing")
      .forEach((e) => e.classList.remove("playing"));
    document
      .querySelectorAll(".track-state")
      .forEach((e) => (e.textContent = "▷"));
    if (ambient) {
      ambient.close();
      ambient = null;
      updateAmbientLabels();
    }
  }
});
