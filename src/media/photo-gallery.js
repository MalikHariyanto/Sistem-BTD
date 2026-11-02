import { mediaUrl } from "./asset-url.js";

// Deployed files provide defaults; the photo editor can override individual slots.
export function createPhotoGallery(content, base = "/") {
  const photos = Object.fromEntries(Object.entries(content.photos).map(([key, source]) => [key, mediaUrl(source, base)]));
  for (const place of ["edinburgh", "prague"]) photos[`scenery-${place}`] = mediaUrl(content.scrapbook?.[place] || "", base);
  const defaults = { ...photos };
  const orbitSources = new Map(Object.entries(content.orbitThumbnails || {}).map(([src, thumb]) => [mediaUrl(src, base), mediaUrl(thumb, base)]));
  const prefetchedPoems = new Set();
  let initialized = false;

  function warmChapter(scene) {
    const root = document.querySelector(`[data-scene="${scene}"]`);
    if (!root) return;
    if (scene === 2) content.poems.forEach((_, index) => {
      const source = photos[`poem${index}`];
      if (!source || prefetchedPoems.has(source)) return;
      prefetchedPoems.add(source);
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      void image.decode?.().catch(() => prefetchedPoems.delete(source));
    });
    root.querySelectorAll(".photo-slot img, .romance-flower, .garden-flower-art").forEach(image => {
      image.loading = "eager";
      image.decoding = "async";
      void image.decode?.().catch(() => {});
    });
  }

  function bind(root = document) {
    root.querySelectorAll("[data-scenery]").forEach(card => {
      const source = photos[card.dataset.scenery];
      if (card.dataset.src === source) return;
      card.dataset.src = source;
      card.querySelector("img")?.remove();
      let art = card.querySelector(".travel-art");
      if (!art) { art = document.createElement("div"); art.className = "travel-art"; card.prepend(art); }
      art.hidden = !!source;
      if (source) {
        const image = new Image(); image.alt = card.getAttribute("aria-label");
        image.src = source; image.decoding = "async"; card.prepend(image);
      }
    });
    root.querySelectorAll("[data-photo]").forEach(slot => {
      const key = slot.dataset.photo;
      // A personal story slot can borrow an existing orbit photo until its own file is added.
      const source = photos[key] || (["portrait", "hero", "moment0", "moment1", "moment2", "moment3"].includes(key) ? photos.orbit01 || "" : "");
      if (slot.dataset.src === source) return;
      slot.querySelector("img")?.remove();
      slot.dataset.src = source;
      slot.classList.toggle("has-photo", !!source);
      if (!source) return;
      const image = new Image();
      image.alt = slot.getAttribute("aria-label");
      image.decoding = "async";
      image.loading = slot.closest(".letter-frame") && !document.querySelector("#letter-reading").hidden ? "eager" : "lazy";
      image.onerror = () => {
        image.remove();
        slot.classList.remove("has-photo");
      };
      image.src = source;
      slot.prepend(image);
    });
  }

  function publish() {
    const sources = [...new Set(Object.values(photos).filter(Boolean))];
    window.dispatchEvent(new CustomEvent("photoschanged", { detail: sources.map(source => orbitSources.get(source) || source) }));
  }

  return {
    photos,
    refresh() { bind(); publish(); },
    replace(key, source = defaults[key], quiet = false) {
      photos[key] = source;
      if (!quiet) { bind(); publish(); }
    },
    bind,
    warmChapter,
    initialize() {
      bind();
      if (initialized) return;
      initialized = true;
      publish();
    },
  };
}
