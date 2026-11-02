# Mengisi hadiah dari kode

Foto, nama, tanggal, puisi, surat, dan musik diatur di **`src/content.js`**, dengan berkas media di **`public/`**. Pengunjung hanya menikmati halaman yang sudah jadi. Tidak ada unggahan, editor, atau penggantian foto dari browser. Setelah file dikirim ke repo dan dideploy, semua perangkat membuka hadiah yang sama.

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
| `hero.webp` | Foto surat pertama, diisi sendiri |
| `portrait.jpg` | Potret ucapan ulang tahun |
| `poem0.webp` | Puisi pertama |
| `poem1.webp` | Puisi kedua |
| `poem2.webp` | Puisi ketiga |
| `moment0.webp` | Bingkai personal kedua di Hari lahirmu |
| `moment1.webp` | Foto surat kedua, diisi sendiri |
| `moment2.webp` | Foto surat ketiga, diisi sendiri |
| `moment3.webp` | Foto surat keempat, diisi sendiri |

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

Path manual mengalahkan pemetaan otomatis. Slot kosong memakai file bernama sama di `photos/story/` bila tersedia. Hanya `portrait` dan `moment0` yang meminjam dua foto orbit pertama ketika kosong; bingkai lain tidak meminjam foto atau memakai ilustrasi pengganti.

Path dimulai dari dalam `public/`: file `public/photos/orbit/001.webp` ditulis **`/photos/orbit/001.webp`**, tanpa kata `public`. Foto yang sama boleh dipakai dalam cerita dan Gargantua; sumber dengan URL sama hanya dihitung satu kali oleh renderer.

### Enam foto asli untuk suasana

Masukkan enam file asli ke `public/photos/scenery/`, lalu isi `sceneryPhotos` di bagian atas `src/content.js`:

```js
export const sceneryPhotos = {
  prague: "/photos/scenery/prague-evening.jpg",
  edinburgh: "/photos/scenery/edinburgh-night.jpg",
  street: "/photos/scenery/edinburgh-street.jpg",
  oldTown: "/photos/scenery/prague-old-town.jpg",
  castle: "/photos/scenery/prague-castle.jpg",
  river: "/photos/scenery/prague-river.jpg",
};
```

Nilai kosong tidak menampilkan bingkai pemandangan. Tidak ada ilustrasi generate atau foto pinjaman yang menggantikan foto suasana. Koleksi Gargantua tetap memakai foto orbit.

## Foto per bagian

| Bagian | Foto yang diatur dari kode |
| --- | --- |
| Semestamu / Gargantua | File `public/photos/orbit/`, atau urutan manual `photoConfig.orbit` |
| Hari lahirmu | Dua foto personal `portrait` dan `moment0`, lalu foto suasana `sceneryPhotos.prague`, `river`, dan `street` |
| Bunga & doa | Foto suasana `sceneryPhotos.edinburgh`, `oldTown`, dan `castle` |
| Bait untukmu | Isi sendiri `photoConfig.story.poem0`, `poem1`, dan `poem2` |
| Tiup lilin | Ilustrasi kue dan lilin, tanpa bingkai foto |
| Surat untukmu | Isi sendiri `photoConfig.story.hero`, `moment1`, `moment2`, dan `moment3` |

Foto puisi dan surat sengaja tidak mengikuti `sceneryPhotos`. Selama belum diisi, puisi dan surat tampil sebagai bacaan tanpa kolom foto kosong. Setelah file dimasukkan dan path diisi, foto kembali tampil di samping tulisan (di atas tulisan pada HP).

Untuk foto personal di Hari lahirmu, masukkan `public/photos/story/portrait.jpg` dan `moment0.jpg`, atau isi path-nya langsung di `photoConfig.story`. Jika kosong, kedua slot ini memakai dua foto orbit pertama. Tidak ada formulir foto di website.

## 3. Isi nama, puisi, dan surat

Di `src/content.js`:

- `recipient`: nama panggilan penerima.
- `sender`: pengirim pada tanda tangan surat.
- `birthday`: kosong, atau tanggal ISO lengkap, misalnya `2027-02-14T00:00:00+07:00`.
- `poems`: judul, subjudul, dan isi masing-masing puisi. `\n` membuat baris baru.
- `letter`: paragraf/bait surat.
- `letterPhotos`: nama slot foto yang menemani bait surat. Bawaan: `hero`, `moment1`, `moment2`, `moment3`.

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

## Scrapbook cerita, scenery dan puisi

Desain cerita memakai kolase kertas, postcard, bunga dan stationery. Bila `portrait`, `hero`, atau `moment0`–`moment3` belum diisi, slot itu dapat meminjam `orbit01`; file cerita milikmu selalu mendapat prioritas. Foto orbit asli tidak diubah.

Untuk foto scenery asli, simpan `edinburgh.webp` dan `prague.webp` di `public/photos/scenery/`, kemudian isi `scrapbook` di `src/content.js`:

```js
scrapbook: {
  edinburgh: "/photos/scenery/edinburgh.webp",
  prague: "/photos/scenery/prague.webp",
},
```

Ekstensi harus mengikuti berkas aslinya. Path scenery diperiksa saat build dan mendukung deployment subpath. Jika kosong, postcard memakai ilustrasi dekoratif orisinal, bukan foto dokumenter.

Untuk gambar pilihan dari film **Bumi Manusia**, isi `public/photos/story/poem0.jpg`, `poem1.jpg`, `poem2.jpg` (atau PNG/WebP). Ketiganya otomatis mengikuti halaman puisi. Default yang terlihat sebelum gambar film ditambahkan adalah ilustrasi veranda Jawa akhir abad19, bukan still film atau potret aktor. Ilustrasi ini tidak menyatakan peristiwa/karakter historis tertentu. Layout bernuansa arsip Hindia, batik dan kertas tua adalah interpretasi artistik.

`public/art/stationery-desk.webp` dan `travel-atelier.webp` merupakan gambar dekoratif hasil image generation. Yang pertama dipakai ulang untuk latar kertas/meja; yang kedua adalah triptych Edinburgh, Praha dan veranda Jawa. Semua dekorasi statis; foto pribadi dan teks asli tetap terpisah dari gambar latar. Keduanya total sekitar568KiB, tanpa video atau library animasi baru.

## Thumbnail orbit dan pembacaan terbaru

Orbit sekarang memakai thumbnail WebP maksimal480px, dibuat otomatis oleh Sharp saat `prepare:media`, dev, atau build. Berkas asli tidak dikompres ulang atau ditimpa; tampilan foto cerita tetap mengacu sumber asli. Thumbnail berada di `public/generated/orbit/` (diabaikan Git), dipetakan melalui `photoManifest.thumbnails`, dan dihasilkan kembali pada Vercel. Setelah menarik pembaruan ini, jalankan `npm ci` sebelum dev/build. Pada193foto yang terunggah, total berkas orbit29.372.519byte menjadi3.864.204byte; ini pengurangan ukuran sumber, bukan pengukuran fps perangkat pengguna.

Panel pengantar doa tetap sticky di desktop walaupun ketiga doa sudah dibuka; desktop pendek memberi panel scroll internal. Di HP panel mengikuti alur baca vertikal. Bab lilin memiliki aset terpisah `candle-scrapbook.webp`, interpretasi dari referensi kolase pasir/linen dan buku antik pengguna, dengan lapisan amber hangat. Blur2px hanya diterapkan pada pseudo-element latar; kue, teks dan tombol tidak diburamkan. Gambar surat tetap `stationery-desk.webp`.

Puisi menahan foto lama sebagai lapisan dekoratif sementara foto berikutnya siap, lalu menukar lembaran memakai opacity dan transform perspektif. Surat memakai transform lembaran dengan foto keluar tetap berlapis selama transisi; teks/fokus tidak diganti. Reduced motion menonaktifkan gerak perspektif. Header/navigasi mempunyai permukaan kontras khusus setiap tema.

Penyempurnaan proporsi: header/footer memakai gradasi transparan dan tinggi56/80px pada desktop,54/78px di HP. Warna tombol tetap kontras tanpa bidang solid tebal. Surat menggunakan kolom teks lebih lebar, margin dalam30–66px desktop/24–34px HP, isi18–20px desktop/16px HP, judul30–42px dan subjudul24–30px. Bingkai galeri diperingan, permukaan kertas dan bayangannya lebih lembut. Navigasi tetap mempunyai target sentuh minimal44px; teks surat dan alur scroll tidak diganti.

Header/footer kini sepenuhnya transparan. Gradasi keterbacaan dibentangkan pada latar seluruh halaman sehingga tidak terputus di batas baris navigasi. Latar lilin dan blur2px juga dibentangkan pada `#app::before`, meneruskan gambar hangat di belakang header/footer tanpa memburamkan isi.
