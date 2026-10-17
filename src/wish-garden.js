import { flowerTypes } from "./florals.js";

// A small, cumulative ritual: each flower reveals its own wish. Nothing pages
// away, and every literary excerpt keeps its own translation and source.
export function createWishGarden(
  root,
  quotes,
  { effects, motion, escapeHtml },
) {
  const esc = escapeHtml;
  root.innerHTML = `
    <div class="garden-flowers" role="group" aria-label="Bunga harapan">
      ${quotes
        .map((q, i) => {
          const flower = flowerTypes[i % flowerTypes.length];
          return `<button type="button" class="garden-bloom bloom-${i}" data-bloom="${i}" data-flower="${flower.key}" aria-label="Mekarkan doa: ${esc(q.bloom)}" aria-expanded="false" aria-controls="garden-wish-${i}">
          <span class="garden-flower" aria-hidden="true"><span class="garden-halo"></span><img class="garden-flower-art" src="${flower.src}" alt="" width="512" height="768" loading="eager" fetchpriority="low" decoding="async" draggable="false"><span class="garden-petals">${Array.from({ length: 3 }, (_, p) => `<span style="--i:${p};--drift:${[-34, 28, 12][p]}px"></span>`).join("")}</span></span>
          <span class="garden-species">${flower.name}</span><strong>${esc(q.bloom)}</strong><small>Sentuh untuk mekar</small>
        </button>`;
        })
        .join("")}
    </div>
    <p class="garden-status" role="status">Tiga bunga kecil. Tiga doa baik.</p>
    <div class="garden-picks" role="group" aria-label="Pilih doa berikutnya" hidden>
      ${quotes.map((q, i) => `<button type="button" data-pick="${i}" aria-label="Buka doa: ${esc(q.bloom)}" aria-expanded="false" aria-controls="garden-wish-${i}"><img src="${flowerTypes[i % flowerTypes.length].src}" alt="" width="24" height="36"><span>${esc(q.bloom)}</span><span class="pick-check" aria-hidden="true">✓</span></button>`).join("")}
    </div>
    <div class="garden-notes" aria-label="Doa yang sudah mekar">
      <p class="garden-empty">Ada hal-hal baik<br><em>yang ingin kutitipkan pada hidupmu.</em></p>
      ${quotes
        .map(
          (
            q,
            i,
          ) => `<article class="garden-note" id="garden-wish-${i}" tabindex="-1" aria-labelledby="garden-theme-${i}" hidden>
        <div class="garden-note-heading"><img src="${flowerTypes[i % flowerTypes.length].src}" alt="" aria-hidden="true" width="34" height="51" loading="lazy"><h3 id="garden-theme-${i}">${esc(q.theme)}</h3></div>
        <p class="garden-wish">${esc(q.wish)}</p>
        <details class="garden-source"><summary>Kata ${esc(q.author)}</summary><div class="garden-source-body"><blockquote>${esc(q.original)}</blockquote><p class="garden-author">${esc(q.author)} — ${esc(q.work)}</p><p class="garden-translation-label">TERJEMAHAN BEBAS</p><p class="garden-translation">${esc(q.translation)}</p><a href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">Baca karya aslinya →</a></div></details>
      </article>`,
        )
        .join("")}
    </div>
    <p class="garden-complete" hidden>Semoga semuanya tumbuh di hidupmu.<br><em>Hari ini, dan hari-hari setelahnya.</em></p>`;
  const buttons = [...root.querySelectorAll("[data-bloom]")];
  const notes = [...root.querySelectorAll(".garden-note")];
  const picks = root.querySelector(".garden-picks");
  const pickButtons = [...picks.querySelectorAll("button")];
  const opened = new Set();
  const empty = root.querySelector(".garden-empty");
  const complete = root.querySelector(".garden-complete");
  const status = root.querySelector(".garden-status");
  function scrollToNote(note) {
    const scene = root.closest(".scene");
    const bounds = note.getBoundingClientRect();
    const viewport = scene.getBoundingClientRect();
    const clearance = picks.getBoundingClientRect().height + 18;
    if (bounds.top >= viewport.top + clearance && bounds.bottom <= viewport.bottom - 24)
      return;
    // Scroll only the chapter, never the page or the header/navigation rows.
    scene.scrollTo({
      top: scene.scrollTop + bounds.top - viewport.top - clearance,
      behavior: motion.matches ? "instant" : "smooth",
    });
  }

  function bloom(i, event) {
    const button = buttons[i];
    const note = notes[i];
    if (opened.has(i)) {
      note.focus({ preventScroll: true });
      scrollToNote(note);
      return;
    }
    opened.add(i);
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", `Baca lagi doa: ${quotes[i].bloom}`);
    button.querySelector("small").textContent = "Sudah mekar · baca lagi";
    pickButtons[i].setAttribute("aria-expanded", "true");
    pickButtons[i].setAttribute("aria-label", `Baca kembali: ${quotes[i].bloom}`);
    picks.hidden = false;
    empty.hidden = true;
    // Append in the order chosen: an earlier wish never jumps below a new one.
    root.querySelector(".garden-notes").append(note);
    note.hidden = false;
    // Keep the next choices above the reading area, instead of returning to
    // the full-size flowers after every wish. Measure before animating text.
    if (event.detail > 0 || event.currentTarget.hasAttribute("data-pick"))
      scrollToNote(note);
    effects.play(
      note,
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      650,
    );
    status.textContent =
      opened.size === quotes.length
        ? "Semua doaku, untukmu."
        : `Doa untuk ${quotes[i].bloom.toLowerCase()} telah mekar.`;
    if (opened.size === quotes.length) {
      complete.hidden = false;
      effects.play(complete, [{ opacity: 0 }, { opacity: 1 }], 900);
    }
  }
  buttons.forEach((button, i) => { button.onclick = event => bloom(i, event); });
  pickButtons.forEach((button, i) => { button.onclick = event => bloom(i, event); });
  return {
    reset() {
      opened.clear();
      picks.hidden = true;
      buttons.forEach((button, i) => {
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", `Mekarkan doa: ${quotes[i].bloom}`);
        button.querySelector("small").textContent = "Sentuh untuk mekar";
        pickButtons[i].setAttribute("aria-expanded", "false");
        pickButtons[i].setAttribute("aria-label", `Buka doa: ${quotes[i].bloom}`);
        effects.reset(notes[i]);
        notes[i].hidden = true;
        notes[i].querySelector("details").open = false;
      });
      effects.reset(complete);
      complete.hidden = true;
      empty.hidden = false;
      status.textContent = "Tiga bunga kecil. Tiga doa baik.";
    },
  };
}
