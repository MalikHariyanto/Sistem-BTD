# Mengisi hadiah dari kode

Editor unggahan di web telah dihapus. Nama, tanggal, foto, puisi, surat, dan musik diatur permanen di **`src/content.js`**. Setelah file dikirim ke repo dan dideploy, semua perangkat membuka hadiah yang sama.

Kalau mengedit langsung di GitHub: buka folder tujuan, pilih **Add file → Upload files**, masukkan foto, lalu commit. Untuk teks/nama, buka `src/content.js`, pilih ikon pensil, edit, lalu commit. Jika Vercel terhubung ke branch tersebut, commit akan memicu deploy baru.

## 1. Masukkan foto Gargantua

Upload/copy foto milikmu ke folder:

```text
public/photos/orbit/
  001.webp
  002.jpg
  003.png
  ...
  200.webp
```

JPG, JPEG, PNG, dan WebP didukung. Nama file bebas, termasuk spasi. Nomor seperti `001` sampai `200` memudahkan mengatur urutan. Daftar dibaca saat `npm run dev` atau `npm run build`, menggunakan urutan nama alami (`1`, `2`, `10`, bukan `1`, `10`, `2`). Maksimum **200 foto orbit**.

Biarkan `photoConfig.orbit: []` di `src/content.js` untuk memakai semua foto dalam folder secara otomatis. Tidak perlu menulis 200 baris path.

Kalau ingin memilih foto/urutan sendiri, isi array tersebut:

```js
orbit: [
  "/photos/orbit/003.png",
  "/photos/orbit/001.webp",
  "/photos/orbit/002.jpg",
],
```

Array manual yang terisi menggantikan daftar otomatis. Path duplikat, lebih dari 200 foto yang dipilih, dan path file yang hilang akan menghentikan build dengan pesan yang menjelaskan masalahnya. Foto tidak dibuang diam-diam.

## 2. Pilih foto untuk isi cerita

Ada sembilan slot cerita. Cara otomatis: simpan file dengan nama slot berikut di `public/photos/story/`:

| Nama file, ekstensi bebas yang didukung | Tempatnya |
| --- | --- |
| `hero.webp` | Foto pertama surat |
| `portrait.jpg` | Potret ucapan ulang tahun |
| `poem0.webp` | Puisi pertama |
| `poem1.webp` | Puisi kedua |
| `poem2.webp` | Puisi ketiga |
| `moment0.webp` | Kenangan 01 / pilihan foto surat |
| `moment1.webp` | Kenangan 02 / kebun doa / pilihan foto surat |
| `moment2.webp` | Kenangan 03, tersedia untuk dipilih dalam surat |
| `moment3.webp` | Kenangan 04 / pilihan foto surat |

Nama slot memakai huruf kecil. Gunakan satu file per nama, misalnya `portrait.jpg`, bukan sekaligus `portrait.jpg` dan `portrait.png`.

Cara manual: isi `photoConfig.story` di `src/content.js`. Kamu juga bisa menunjuk foto yang sudah ada dalam folder orbit:

```js
story: {
  hero: "/photos/orbit/010.webp",
  portrait: "/photos/orbit/001.webp",
  poem0: "/photos/orbit/020.jpg",
  poem1: "/photos/orbit/025.png",
  poem2: "/photos/orbit/030.webp",
  moment0: "",
  moment1: "",
  moment2: "",
  moment3: "",
},
```

Path manual mengalahkan pemetaan otomatis. Slot kosong memakai file bernama sama di `photos/story/` bila tersedia; jika tidak ada, bingkainya tetap kosong. Foto dekoratif seperti `orbit01`–`orbit05` pada kolase tetap memakai identitas semula.

Path dimulai dari dalam `public/`: file `public/photos/orbit/001.webp` ditulis **`/photos/orbit/001.webp`**, tanpa kata `public`. Foto yang sama boleh dipakai dalam cerita dan Gargantua; sumber dengan URL sama hanya dihitung satu kali oleh renderer.

## 3. Isi nama, puisi, dan surat

Di `src/content.js`:

- `recipient`: nama panggilan penerima.
- `sender`: pengirim pada tanda tangan surat.
- `birthday`: kosong, atau tanggal ISO lengkap, misalnya `2027-02-14T00:00:00+07:00`.
- `poems`: judul, subjudul, dan isi masing-masing puisi. `\n` membuat baris baru.
- `letter`: paragraf/bait surat.
- `letterPhotos`: nama slot foto yang menemani bait surat. Bawaan: `hero`, `moment0`, `moment1`, `moment3`.

Doa, kutipan, terjemahan, dan sumber tetap berada di `src/quotes.js`. Data dan tulisan bawaan yang sudah ada tetap dipertahankan.

## 4. Musik tetap sama

Lagu bawaan tetap **Country — Koshun Nakao**, dari file MP3 yang sama:

```js
tracks: [{
  title: "Country",
  artist: "Koshun Nakao",
  src: "/music/koshun-nakao-country-intro-cut.mp3",
  // Metadata lain yang sudah ada boleh tetap disimpan.
}],
```

File tidak dipotong ulang atau diturunkan kualitasnya. Volume awal, loop, autoplay, dan fallback ketukan pertama tetap sama. Browser tetap menentukan apakah musik bersuara boleh diputar sebelum interaksi. Untuk mengganti lagu nanti, masukkan file ke `public/music/` dan ubah `tracks[0].src`.

## 5. Periksa dan deploy

```sh
npm run prepare:media
npm run test:media
npm run build
```

`prepare:media` menghasilkan **`src/generated/photo-manifest.js`** dan memeriksa file yang dirujuk. Jangan edit file hasil generasi tersebut. Plugin di `vite.config.js` menjalankan persiapan ini sebelum dev/build, termasuk saat Vercel memanggil `vite build` langsung, sehingga foto baru ikut dalam deploy.

Saat menambah foto ketika dev server sudah berjalan, jalankan `npm run prepare:media`, lalu refresh; atau mulai ulang `npm run dev`. Mengubah isi teks/urutan manual di `src/content.js` mengikuti pembaruan Vite biasa.

Gunakan WebP/JPEG sekitar 1400 px pada sisi panjang sebagai pilihan praktis; usahakan ukuran file wajar untuk koneksi HP. Migrasi ini tidak mengubah atau mengompres ulang file yang kamu masukkan. Cache thumbnail dan detail dekat Gargantua tetap memakai pengaturan yang sudah ada.

## Tentang foto yang dahulu diunggah lewat browser

Versi baru **tidak membaca atau menghapus IndexedDB lama**. Data lokal itu tidak dapat berubah menjadi file GitHub secara otomatis, karena hanya ada di perangkat/browser tempat mengunggahnya. Masukkan file foto asli ke folder repo di atas untuk hadiah permanen. Setelah deploy, nama, foto, dan musik dari kode tidak akan ditimpa isian browser lama.

## Struktur pengembang

| File | Tanggung jawab |
| --- | --- |
| `src/content.js` | Satu titik pengisian hadiah dan pemetaan foto manual |
| `scripts/prepare-media.mjs` | Pemindaian folder dan validasi aset sebelum dev/build |
| `vite.config.js` | Memastikan persiapan media berjalan otomatis pada dev/build |
| `src/generated/photo-manifest.js` | Daftar file hasil generasi |
| `src/media/photo-library.js` | Identitas 9 slot cerita + 200 orbit |
| `src/media/photo-gallery.js` | Binding gambar, decoding, dan prefetch bab |
| `src/media/soundtrack.js` | Siklus audio, autoplay, fallback, dan visibility |
| `src/story-view.js`, `src/story-ui.js` | Markup dan elemen visual |
| `src/story-chapters.js` | Urutan bab dan tujuan benda pengantar |
| `src/main.js` | Interaksi dan perpindahan cerita |

Renderer, kamera Gargantua, komposisi Crystal Pin, urutan lima bab, dan gaya bacaan tidak diganti. Penghapusan editor hanya menghilangkan kontrol pemilik dan formulirnya.

[Catatan pemeriksaan migrasi](code-migration-validation.md) mencatat perbandingan tampilan, pengujian media, dan batas hasil tes.
