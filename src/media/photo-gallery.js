import { mediaUrl } from "./asset-url.js";

// The library is fixed by deployed code. Replacing a poem binds its new slot,
// without rebuilding the orbit atlas or loading a browser-local alternative.
export function createPhotoGallery(content, base = "/") {
  const photos = Object.fromEntries(Object.entries(content.photos).map(([key, source]) => [key, mediaUrl(source, base)]));
  const sources = [...new Set(Object.values(photos).filter(Boolean))];
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
    root.querySelectorAll("[data-photo]").forEach(slot => {
      const source = photos[slot.dataset.photo] || "";
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

  return {
    bind,
    warmChapter,
    initialize() {
      bind();
      if (initialized) return;
      initialized = true;
      window.dispatchEvent(new CustomEvent("photoschanged", { detail: sources }));
    },
  };
}
