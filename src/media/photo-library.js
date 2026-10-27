import { normalizeMediaPath } from "./asset-url.js";

export const ORBIT_PHOTO_COUNT = 200;
export const STORY_PHOTO_LABELS = {
  hero: "Foto surat",
  portrait: "Potret ucapan",
  poem0: "Puisi 01",
  poem1: "Puisi 02",
  poem2: "Puisi 03",
  moment0: "Kenangan 01",
  moment1: "Kenangan 02",
  moment2: "Kenangan 03",
  moment3: "Kenangan 04",
};

export const photoLabel = key => STORY_PHOTO_LABELS[key]
  || `Semesta ${key.replace("orbit", "")}`;

// Preserve the existing 209 identities, independent of filenames or folders.
export function createPhotoLibrary(config, manifest = { story: {}, orbit: [] }) {
  if (!Array.isArray(config.orbit)) throw new Error("photoConfig.orbit harus berupa array.");
  const selected = config.orbit.length ? config.orbit : manifest.orbit;
  if (selected.length > ORBIT_PHOTO_COUNT)
    throw new Error(`Ada ${selected.length} foto orbit; maksimum ${ORBIT_PHOTO_COUNT}. Pilih fotonya di photoConfig.orbit.`);
  const orbit = selected.map(normalizeMediaPath);
  if (orbit.some(source => !source)) throw new Error("Daftar foto orbit tidak boleh berisi path kosong.");
  if (new Set(orbit).size !== orbit.length) throw new Error("Daftar foto orbit berisi path duplikat.");
  const photos = {};
  for (const key of Object.keys(STORY_PHOTO_LABELS))
    photos[key] = normalizeMediaPath(config.story[key] || manifest.story[key] || "");
  for (let i = 0; i < ORBIT_PHOTO_COUNT; i++)
    photos[`orbit${String(i + 1).padStart(2, "0")}`] = orbit[i] || "";
  return photos;
}
