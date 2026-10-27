# Serah terima ke chat baru

Ini **ringkasan kerja berdasarkan pesan pengguna dan kode/commit**, bukan kutipan balasan asisten yang hilang. Tanggal snapshot: 28 Oktober 2026, Asia/Bangkok. Implementasi terakhir sebelum pengarsipan: [`4f607ac`](https://github.com/MalikHariyanto/Sistem-BTD/commit/4f607ac). Perubahan pengarsipan hanya dokumen; tidak mengubah aplikasi.

## Tujuan dan cara bekerja dengan pemilik

Pemilik membuat web ulang tahun romantis untuk seseorang, awalnya dinamai **Ambis Copenhagen**, di repo **MalikHariyanto/Sistem-BTD**, branch publikasi `main`. Ia ingin pengalaman personal, sinematik, ringan, tajam di HP/laptop, dan jauh dari pola landing page produk. Nama paket `ambis-copenhagen` dan teks merek lama masih ada; pernah ada pertanyaan soal nama deploy “ucapan ultah”, tetapi jangan menganggap nama domain/proyek sudah diganti tanpa bukti.

Komunikasi yang cocok: bahasa Indonesia santai, langsung melakukan perubahan yang diminta, jelaskan hasil dan cara mengakses. Pemilik memberi izin kontribusi/commit ke repo. Untuk perubahan visual besar, ia sering meminta beberapa preview lebih dulu. Preview gambar di chat berulang kali blank; ia lebih suka preview/ZIP yang bisa dibuka atau diunduh lewat GitHub. Jangan mengulang proposal yang sudah ditolak sebagai pilihan final.

## Keputusan terakhir yang berlaku

1. **Semua konten dari kode.** Pesan “MIGRASI BESAR” diklarifikasi secara eksplisit: **“Ya, semuanya lewat kode; hapus editor web.”** Editor “Isi kenangan”, input file, pengaturan nama/tanggal lokal, dan pembacaan IndexedDB sudah dihapus. Jangan mengembalikan editor atau menjadikan pengaturan browser sumber konten.
2. **Tampilan dan musik dipertahankan.** Migrasi memecah kode, bukan mendesain ulang website. Data browser lama tidak dibaca dan tidak dihapus. Foto yang pernah diunggah di satu browser tidak otomatis menjadi aset deploy; pemilik perlu memasukkan file asli ke repo.
3. **Urutan cerita:** Pembuka Gargantua → Hari lahirmu → Bunga & doa → Bait untukmu → Tiup lilin → Surat untukmu. Surat merupakan bab terakhir. Scene ID teknis tetap `0, 1, 3, 2, 6, 4`; jangan diurutkan ulang hanya agar angkanya berurutan.
4. **Benda pengantar** adalah navigasi yang sudah dipilih/diimplementasikan: bunga menuju doa, catatan kertas menuju puisi, lilin menuju harapan, amplop menuju surat, bintang kristal di akhir surat untuk mengulang. Header tetap punya indeks “Halaman”; akses keyboard/Escape tetap tersedia.
5. **Surat tidak berupa carousel.** Amplop terbuka lalu surat dibaca sebagai bait-bait yang digulir; foto berganti dengan dissolve/zoom lembut sesuai posisi baca. Laptop: teks di kiri, foto menetap di kanan. HP: foto pengiring kecil di atas teks. Tipografi surat HP disamakan dengan bab sebelumnya.
6. **Doa berbeda dari puisi.** Kebun tiga bunga, mawar/tulip/anemone, membuka doa yang terkumpul. Setelah doa pertama, pilihan bunga kecil tetap dekat bacaan sehingga tidak perlu bolak-balik scroll ke atas. Jangan mengubahnya kembali menjadi tiga slide puisi yang sama.
7. **Header/footer tidak menutupi bacaan.** Grid baris khusus, dissolve serempak, tanpa salinan chrome halaman sebelumnya atau jeda hilang yang mengganggu. Layout laptop pendek dan HP kecil tetap harus terbaca.
8. **Lagu Country — Koshun Nakao** tetap dipakai. Tidak ada halaman pilihan lagu atau tombol musik on/off. Hening pengantar/penutup sudah dipotong. Autoplay dicoba saat masuk; jika browser melarang, ketukan awal memulai audio langsung, sebelum menunggu foto/countdown/animasi. Volume awal 0.6, loop, pause/resume visibility dipertahankan.

## Gargantua dan hal yang jangan dirusak

Riwayat berulang menunjukkan pemilik tidak menyukai dua black hole/dua cakram, ring Saturnus terpisah, foto menembus pusat, foto berputar hanya dalam layar, atau gambar background statis dengan lapisan foto yang terasa tidak berhubungan. Prompt React/Three yang pernah dikirim adalah arah percobaan lama; pengguna kemudian meminta bentuk awal dikembalikan. **Stack akhir tetap Vanilla JS + Vite + custom WebGL/Canvas**, bukan React/Three.

Pembuka dan ending disukai; perubahan kamera tengah telah dipusatkan lurus pada HP/laptop. Cakram harus terasa terdiri dari banyak foto: populasi padat sebagai filamen/plasma jauh, foto semakin terbaca saat mendekat, perspektif dan kedalaman tetap ada. Jangan memecahkan kepadatan dengan sekadar mengurangi foto hingga tampak kosong. Hindari foto menumpuk, kehilangan rasio, blur berlebihan, pinggir atlas terkorupsi, dan duplikasi foto utama pada ending/fade.

Pilihan final **Crystal Pin A** sudah dieksekusi: foto jelas terutama pada cakram horizontal depan, dibingkai material kristal putih bersegi dengan cahaya/caustic; ujungnya menempel pada permukaan terang cakram. Foto yang naik ke lengkungan atas semakin memudar. Bentuk dan posisi dihitung dari orbit/perspektif, bukan marker DOM yang diputar mengelilingi layar. Ada banyak ukuran foto sesuai jarak. Ini pendekatan artistik, bukan simulasi relativitas penuh.

Renderer mempertahankan 32.768 filamen, instanced quads untuk foto terpilih, atlas dengan padding/UV aman, cache detail terbatas, horizon occlusion dan inward fade, fallback Canvas, reduced motion, serta batas resolusi/FPS. Optimasi `a89038e` mempertahankan keluaran visual dan mengurangi pekerjaan CPU/upload sinkronisasi. Baca [crystal-pin.md](project-docs/crystal-pin.md) dan [render-performance.md](project-docs/render-performance.md) sebelum mengubahnya.

## Tema

Referensi awal memakai cream, cokelat hangat, serif/script editorial. Pemilik meminta preview tiga tema, lalu implementasi Midnight Universe, mengeluhkan kontras, sempat meminta rollback, kemudian secara eksplisit memulihkan `7ad904d` sebelum opsi foto A. **Jangan berasumsi seluruh cerita harus navy sekarang hanya karena pernah ada permintaan Midnight Universe.** CSS pada snapshot `4f607ac` adalah sumber tampilan yang berlaku: pembuka angkasa gelap, bacaan cream/cokelat hangat sesuai bab. Jangan otomatis menerapkan ulang tema lama.

## Peta kode dan pengisian foto

Panduan lengkap pada snapshot: [content-from-code.md](project-docs/content-from-code.md).

| Tempat | Kegunaan |
| --- | --- |
| `src/content.js` | Nama, pengirim, tanggal, puisi, surat, pemetaan foto, metadata musik |
| `public/photos/orbit/` | Sampai 200 foto JPG/JPEG/PNG/WebP; otomatis didaftar saat dev/build dengan urutan alami |
| `public/photos/story/` | Sembilan file sesuai nama slot: `hero`, `portrait`, `poem0`, `poem1`, `poem2`, `moment0`–`moment3` |
| `photoConfig.orbit` | Array kosong memakai folder; array berisi path memberi pilihan/urutan manual |
| `photoConfig.story` | Override manual setiap foto cerita; boleh memakai ulang file orbit |
| `src/quotes.js` | Doa, kutipan, terjemahan, sumber |
| `scripts/prepare-media.mjs` | Temukan foto, buat manifest, validasi sumber konten |
| `vite.config.js` | Menjalankan persiapan pada dev/build, termasuk `vite build` langsung |
| `src/generated/photo-manifest.js` | Hasil generasi; jangan diisi manual |
| `src/media/` | Normalisasi URL/base path, library 209 identitas, DOM/prefetch, audio |
| `src/story-view.js`, `src/story-ui.js` | Markup dan elemen visual |
| `src/story-chapters.js`, `src/main.js` | Urutan bab dan interaksi/transisi |
| `src/universe*.js`, `src/disk-stream.js`, `src/accretion-lens.js` | Render dan gerak Gargantua |
| `src/crystal-pin.js`, `src/orbit-composition.js` | Material/pijakan pin, komposisi/identitas foto |
| `src/photo-textures.js`, `src/portrait-textures.js` | Atlas dan detail foto dekat |
| `src/space-background.js`, `src/frame-clock.js` | Latar angkasa dan penjadwalan render |
| `src/letter-scroll.js`, `src/wish-garden.js`, `src/keepsakes.js` | Interaksi surat, kebun, dan benda pengantar |

Snapshot masih memakai `recipient: "Kamu"`, pengirim placeholder, tanggal kosong, tiga puisi contoh, empat bait surat, dan folder foto kosong. Jangan mengatakan ratusan foto pribadi sudah ada di repo: ratusan unggahan lama hanya disebutkan pengguna, sedangkan build 200+9 foto pada migrasi adalah **fixture pengujian terpisah**, tidak masuk repo.

Identitas stabil: sembilan slot cerita + `orbit01` sampai `orbit200`, total 209. Foto kosong tetap placeholder; file hilang/duplikat/jumlah pilihan >200 dilaporkan sebelum build. Penambahan file saat server dev berjalan memerlukan `npm run prepare:media` + refresh atau restart dev.

## Musik

File aktif: [`public/music/koshun-nakao-country-intro-cut.mp3`](https://github.com/MalikHariyanto/Sistem-BTD/blob/4f607ac/public/music/koshun-nakao-country-intro-cut.mp3).

SHA-256 versi website: `ac7cb208c4da069d1e2419ce120f2087302d7408a44d0e3d5a55c5f40f9515de`. File asli pengguna bernama `Koshun Nakao - Country (Performance Video).mp3`; metadata asal masih tercatat pada `content.tracks[0].originalUpload`. Jangan memotong ulang, mengganti lagu, menambah pilihan musik, atau menunggu animasi selesai sebelum audio dimulai tanpa permintaan baru. Autoplay sebelum interaksi tetap mengikuti browser.

## Menjalankan dan memverifikasi

```sh
npm ci
npm run dev
npm run prepare:media
npm run test:media
npm run build
```

`dist/` adalah hasil deploy statis. Vercel menggunakan preset Vite, root `./`, output `dist`; konfigurasi nama/domain milik pengguna belum diverifikasi dari akun hosting. Push ke branch produksi yang terhubung biasanya memicu deployment; jangan mengklaim deployment sukses hanya karena push sukses.

Untuk cloud dengan Chromium sistem:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=2
```

Untuk mesin lain, pasang browser Playwright terlebih dahulu (`npx playwright install chromium`). Jangan menganggap browser tidak tersedia berarti aplikasi gagal.

Verifikasi migrasi yang sudah dilakukan, bukan janji semua tes hijau:

- Build berhasil; lima unit media lulus.
- 24 tangkapan layar bacaan pada empat viewport sama persis dengan `65884d5`.
- Build produksi terpisah dengan 200 foto orbit + sembilan cerita, base subfolder, musik dan decode foto berhasil.
- Rangkaian lengkap: **168 lulus, 4 skip, 2 gagal**. Dua probe WebGL `middle-disk-flow.spec.js` punya centroid sekitar 8.0049 px terhadap toleransi 4 px, dengan hasil **identik pada versi sebelum migrasi**. Jangan mengubah shader/menurunkan ambang tes diam-diam untuk menghilangkan kegagalan baseline ini.
- Sepuluh tes konten/library yang dijalankan ulang sesudah perapian fixture lulus.

Lihat [code-migration-validation.md](project-docs/code-migration-validation.md). Pengarsipan ini tidak membutuhkan perubahan aplikasi atau menjalankan ulang seluruh suite browser.

## Riwayat penting

| Commit | Makna |
| --- | --- |
| `a00520c` | Salah satu versi tengah yang pernah diminta kembali |
| `df2d92d` | Versi yang pernah diminta sebagai rollback cakram tengah |
| `7ad904d` | Basis yang kemudian diminta sebelum foto opsi A |
| `9ca9a01` | Penerapan Midnight Universe historis, bukan instruksi tema terbaru |
| `cdf68fc`, `67aaa1a`, `7f83337` | Foto bersih/padat, lengkungan, perspektif dan detail |
| `c04d970` | Duplikasi ending/fade |
| `50825cb`, `6316a41` | Crystal Pin dan pijakannya pada cakram |
| `a89038e` | Optimasi dengan visual dipertahankan |
| `ff11dae` | Urutan bab dan surat penutup |
| `65884d5` | Navigasi benda pengantar |
| `4f607ac` | Migrasi seluruh konten/media ke kode; editor dihapus |

Daftar lengkap dengan judul/tanggal ada di [repository-history.md](repository-history.md). Commit lama adalah konteks historis; jangan menjalankan rollback lagi hanya karena membaca pesan lama di arsip.

## Percakapan AES yang ikut tersimpan

Di tengah chat ada topik skripsi AES, hasil CV S1/S2/S3, keluhan RMSE fusion, permintaan concat, pertanyaan overfitting, dan permintaan memeriksa Colab terbaru. Ini **topik terpisah dari website ulang tahun**. Pesan-pesan serta kode ekspor evaluasi disimpan utuh pada nomor 057–060 transkrip; log juga tersedia di `extras/aes-training-log.txt`, sel kode di `extras/aes-export-cell.txt`.

Potongan kode yang ditempel berisi ekspor/jurnal evaluasi dan pemanggilan `train_all`; tidak menampilkan kelas model/forward fusion. Jangan mengaku sudah memverifikasi concat atau mengakses Colab dari potongan itu. Log S3 fold 5 yang tersedia berhenti di epoch 4, jadi jangan mengarang epoch 5/final test. Tidak ada bukti bahwa notebook AES tersebut berada di repo Sistem-BTD atau tersambung lewat tool pada chat pengarsipan.

## Tugas setelah pindah chat

Permintaan terakhir adalah **arsip percakapan ke GitHub**. Implementasi web terakhir sudah selesai/dipush di `4f607ac`. Tidak ada fitur web baru yang diam-diam harus dikerjakan dari arsip ini. Baca konteks, cek repo terkini karena dapat berubah setelah snapshot, lalu tangani instruksi baru pemilik.
