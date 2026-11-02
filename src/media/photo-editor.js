import { photoLabel } from './photo-library.js';
import { escapeHtml as esc } from '../story-ui.js';

// A separate database leaves earlier personal uploads untouched.
export function createPhotoEditor(gallery, activeScene) {
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-editor';
  dialog.innerHTML = `<button type="button" class="photo-editor-close" aria-label="Tutup pengaturan foto">×</button><h2>Foto tiap halaman</h2><p>Ganti foto sesuai bagiannya. Tersimpan di browser ini; unduh salinan untuk menyimpan atau memindahkannya.</p><label>Bagian <select id="photo-section"><option value="0">Semestamu</option><option value="1">Hari lahirmu</option><option value="3">Bunga & doa</option><option value="2">Bait untukmu</option><option value="6">Tiup lilin</option><option value="4">Surat untukmu</option></select></label><div class="photo-editor-slots"></div><p class="photo-editor-status" role="status"></p><button type="button" id="export-photos">Unduh salinan foto</button><label class="photo-restore">Pulihkan salinan <input id="import-photos" type="file" accept="application/json,.json"></label>`;
  document.body.append(dialog);
  const status = dialog.querySelector('[role="status"]');
  const select = dialog.querySelector('select');
  const groups = {
    0: Object.keys(gallery.photos).filter(key => key.startsWith('orbit')),
    1: ['portrait', 'moment0', 'orbit03', 'scenery-edinburgh', 'scenery-prague'],
    3: ['moment1', 'scenery-edinburgh'],
    2: ['poem0', 'poem1', 'poem2', 'orbit04'],
    6: [],
    4: ['hero', 'moment0', 'moment1', 'moment3'],
  };
  const overrides = new Map();
  const urls = new Map();
  let db;
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open('birthday-section-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onerror = () => reject(request.error);
  });
  async function store(key, blob) {
    const connection = await database;
    await new Promise((resolve, reject) => {
      const transaction = connection.transaction('photos', 'readwrite');
      const store = transaction.objectStore('photos');
      if (blob) store.put(blob, key); else store.delete(key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  function apply(key, blob, quiet = false) {
    const old = urls.get(key);
    if (blob) {
      const url = URL.createObjectURL(blob);
      urls.set(key, url); overrides.set(key, blob);
      gallery.replace(key, url, quiet);
    } else {
      urls.delete(key); overrides.delete(key); gallery.replace(key, undefined, quiet);
    }
    if (old) URL.revokeObjectURL(old);
  }
  async function validate(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Pilih foto JPG, PNG, atau WebP.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran foto maksimal 15 MB.');
    try { const bitmap = await createImageBitmap(file); bitmap.close(); }
    catch { throw new Error("Foto tidak dapat dibaca. Pilih file gambar lain."); }
    return file;
  }
  function render() {
    const keys = groups[select.value];
    const slots = dialog.querySelector('.photo-editor-slots');
    if (!keys.length) {
      slots.innerHTML = '<p>Bagian ini memakai ilustrasi kue dan lilin, tanpa bingkai foto.</p>'; return;
    }
    slots.innerHTML = keys.map(key => `<div class="photo-edit-slot" data-edit-slot="${key}">${gallery.photos[key] ? `<img loading="lazy" decoding="async" src="${esc(gallery.photos[key])}" alt="${esc(photoLabel(key))}">` : '<span class="photo-edit-empty">Belum ada foto</span>'}<label>${esc(photoLabel(key))}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label><button type="button" data-reset="${key}" ${overrides.has(key) ? '' : 'disabled'}>Pakai foto bawaan</button></div>`).join('');
  }
  const ready = database.then(connection => new Promise((resolve, reject) => {
    const request = connection.transaction('photos').objectStore('photos').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { gallery.refresh(); resolve(); return; }
      if (cursor.key in gallery.photos && cursor.value instanceof Blob) apply(cursor.key, cursor.value, true);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  })).catch(() => { status.textContent = 'Penyimpanan browser tidak tersedia. Coba izinkan penyimpanan situs ini.'; });
  document.querySelector('#edit-photos').onclick = async () => {
    await ready; select.value = String(activeScene()); render(); dialog.showModal();
  };
  dialog.querySelector('.photo-editor-close').onclick = () => dialog.close();
  select.onchange = render;
  dialog.addEventListener('change', async event => {
    const key = event.target.dataset.upload;
    if (!key || !event.target.files[0]) return;
    try {
      const blob = await validate(event.target.files[0]);
      await store(key, blob); apply(key, blob); render();
      status.textContent = 'Foto tersimpan di browser ini. Slot yang sama di bagian lain ikut diperbarui.';
    } catch (error) { status.textContent = error.message || 'Foto belum dapat disimpan.'; }
  });
  dialog.addEventListener('click', async event => {
    const key = event.target.dataset.reset;
    if (!key) return;
    try { await store(key); apply(key); render(); status.textContent = 'Foto bawaan dipakai kembali.'; }
    catch { status.textContent = 'Perubahan belum dapat disimpan.'; }
  });
  const dataURL = blob => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  });
  dialog.querySelector('#export-photos').onclick = async () => {
    const photos = Object.fromEntries(await Promise.all([...overrides].map(async ([key, blob]) => [key, await dataURL(blob)])));
    const url = URL.createObjectURL(new Blob([JSON.stringify({version:1, photos})], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'foto-hari-lahirmu.json'; dialog.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Salinan berisi foto yang kamu unggah. Pulihkan di browser lain lewat panel ini.';
  };
  dialog.querySelector('#import-photos').onchange = async event => {
    try {
      const file = event.target.files[0]; if (!file) return;
      const backup = JSON.parse(await file.text());
      if (backup.version !== 1 || !backup.photos || typeof backup.photos !== 'object') throw new Error('Format salinan tidak dikenal.');
      const items = [];
      for (const [key, value] of Object.entries(backup.photos)) {
        if (!(key in gallery.photos) || typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(value)) throw new Error('Isi salinan foto tidak valid.');
        const blob = await (await fetch(value)).blob(); await validate(blob); items.push([key, blob]);
      }
      // Validate the entire backup before writing it in one atomic transaction.
      const connection = await database;
      await new Promise((resolve, reject) => {
        const transaction = connection.transaction('photos', 'readwrite');
        for (const [key, blob] of items) transaction.objectStore('photos').put(blob, key);
        transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
      });
      items.forEach(([key, blob]) => apply(key, blob, true)); gallery.refresh(); render(); status.textContent = 'Salinan foto berhasil dipulihkan.';
    } catch (error) { status.textContent = error.message || 'Salinan belum dapat dipulihkan.'; }
    event.target.value = '';
  };
}
