// Scene IDs stay stable for existing photo slots; reading order is explicit.
export const chapters = [
  { scene: 0, name: "Semestamu" },
  { scene: 1, name: "Hari lahirmu", keepsake: "flowers" },
  { scene: 3, name: "Bunga & doa", keepsake: "note" },
  { scene: 2, name: "Bait untukmu", keepsake: "candle" },
  { scene: 6, name: "Tiup lilin", keepsake: "envelope" },
  { scene: 4, name: "Surat untukmu" },
];
export const readingChapters = chapters.slice(1);
export const adjacentScene = (scene, direction) => chapters[chapters.findIndex(chapter => chapter.scene === scene) + direction]?.scene;
