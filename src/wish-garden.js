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
  const opened = new Set();
  const empty = root.querySelector(".garden-empty");
  const complete = root.querySelector(".garden-complete");
  const status = root.querySelector(".garden-status");
  function scrollToNote(note) {
    const bounds = note.getBoundingClientRect();
    const flowers = root
      .querySelector(".garden-flowers")
      .getBoundingClientRect();
    const viewport = root.closest(".scene").getBoundingClientRect();
    if (
      bounds.top < flowers.bottom + 12 ||
      bounds.bottom > viewport.bottom - 145
    )
      note.scrollIntoView({
        block: "start",
        behavior: motion.matches ? "instant" : "smooth",
      });
  }
  buttons.forEach((button, i) => {
    button.onclick = (event) => {
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
      empty.hidden = true;
      // Append in the order chosen: an earlier wish never jumps below a new one.
      root.querySelector(".garden-notes").append(note);
      note.hidden = false;
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
      if (event.detail > 0) scrollToNote(note);
    };
  });
  return {
    reset() {
      opened.clear();
      buttons.forEach((button, i) => {
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", `Mekarkan doa: ${quotes[i].bloom}`);
        button.querySelector("small").textContent = "Sentuh untuk mekar";
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
