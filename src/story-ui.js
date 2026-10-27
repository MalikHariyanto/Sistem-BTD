import { flowerSrc } from "./florals.js";

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
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
};
const flowers = (placement) => {
  const kind = flowerPlacements[placement];
  return `<img class="romance-flower ${placement}" data-flower="${kind}" src="${flowerSrc(kind)}" alt="" aria-hidden="true" width="512" height="768" loading="lazy" decoding="async" draggable="false">`;
};
const arrow = '<span aria-hidden="true">→</span>';

export { esc as escapeHtml, photo, flowers, arrow };
