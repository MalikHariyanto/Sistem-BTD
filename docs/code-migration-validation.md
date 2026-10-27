# Pemeriksaan migrasi konten dari kode

Versi pembanding: `65884d5` (sebelum migrasi). Migrasi menghapus editor web dan pembacaan IndexedDB, memisahkan tampilan/interaksi/media, serta menyiapkan daftar foto dari folder sebelum Vite dev/build.

## Tampilan dan isi

- 24 tangkapan layar isi cerita dibandingkan dengan versi pembanding pada viewport 1440×900, 1280×580, 390×844, dan 320×568. Seluruhnya identik per piksel setelah font/gambar siap dan pointer ditempatkan netral. Kontrol editor yang memang dihapus tidak termasuk area perbandingan.
- Objek konten bawaan dibandingkan secara mendalam: nama, tanggal, puisi, surat, pemetaan sembilan foto cerita, 200 identitas foto orbit, dan metadata lagu tetap sama sebelum foto pribadi dimasukkan.
- Perhitungan/render Gargantua, kamera, shader, komposisi Crystal Pin, dan tekstur detail tidak diubah. Perubahan di `src/universe.js` hanya menyesuaikan kalimat kegagalan foto karena editor unggahan sudah tidak ada.
- SHA-256 MP3 tetap `ac7cb208c4da069d1e2419ce120f2087302d7408a44d0e3d5a55c5f40f9515de`.

## Build dan media

- `npm run build`: berhasil.
- `npm run test:media`: 5 pengujian lulus, mencakup identitas slot, penemuan folder/urutan alami, pemetaan manual, batas 200, duplikat, path, serta validasi file hilang/kosong.
- Salinan produksi terpisah diisi 200 PNG orbit dan sembilan PNG cerita untuk pengujian; tidak ada gambar uji dimasukkan ke repo. `vite build --base=/gift-check/` langsung berhasil tanpa bergantung pada hook npm, termasuk saat manifest belum ada.
- Pemeriksaan browser hasil produksi: 209 sumber foto tersedia, foto cerita berhasil didekode, musik berputar setelah ketukan pembuka, tidak ada editor, dan tidak ada request gagal atau exception halaman. Path media pada subfolder deploy juga terverifikasi.
- Browser lama dengan isian IndexedDB diuji: aplikasi memakai konten dari kode, tidak membaca database, dan tidak menghapus rekaman lama. Dua sesi browser baru menampilkan konfigurasi hadiah yang sama.

## Rangkaian tes browser

Rangkaian lengkap: **168 lulus, 4 dilewati, 2 gagal** dari 174 kasus desktop/HP. Autoplay/fallback musik, navigasi, geometri bacaan, surat scroll, koleksi 200 foto, dan tes GPU lainnya lulus. Pengujian ulang 10 kasus konten/koleksi sesudah perapian fixture juga lulus.

Dua kegagalan berada di probe WebGL `tests/middle-disk-flow.spec.js`: centroid tekstur pada kasus `wide`, kamera `0.3`, bergeser sekitar **8.0049 px** terhadap toleransi 4 px. Probe yang sama dijalankan pada versi pembanding `65884d5` dan menghasilkan kegagalan serta angka yang identik. Ini kegagalan baseline yang sudah ada; renderer dan toleransi tes tidak diubah dalam migrasi.

Untuk cloud dengan Chromium sistem:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=2
```
