// Keep the original database name so existing preview photos survive the redesign.
export async function openMemories() {
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("ambis-copenhagen", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("memories");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  function request(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("memories", mode);
      const r = action(tx.objectStore("memories"));
      tx.oncomplete = () => resolve(r?.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  return {
    all: async () => {
      const keys = await request("readonly", (s) => s.getAllKeys());
      const values = await request("readonly", (s) => s.getAll());
      return keys.map((key, i) => [key, values[i]]);
    },
    put: (key, value) => request("readwrite", (s) => s.put(value, key)),
    remove: (key) => request("readwrite", (s) => s.delete(key)),
    clear: () => request("readwrite", (s) => s.clear()),
  };
}
export async function optimizePhoto(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error("Pilih foto JPG, PNG, atau WebP maksimal 8 MB.");
  const bitmap = await createImageBitmap(file),
    canvas = document.createElement("canvas");
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Foto belum bisa diolah. Coba foto lain.");
  return blob;
}
