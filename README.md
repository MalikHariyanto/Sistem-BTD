# Ambis Copenhagen

Hadiah ulang tahun dalam tujuh adegan: perjalanan Gargantua → ucapan personal → puisi → tiga doa dari kutipan sastra → surat → musik → perayaan lilin. Warna ivory, cokelat hangat, dan cahaya keemasan. Vanilla JavaScript, CSS, dan Canvas 2D; tanpa framework runtime, backend, atau video animasi besar.

## Menjalankan

Node.js 22.12+ atau 24 LTS dan npm:

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan terminal. Build: `npm run build` menghasilkan `dist/`. Uji hasil build: `npm run preview`. Deploy `dist/` ke hosting statis HTTPS. Untuk hosting subpath gunakan `npm run build -- --base=/Sistem-BTD/` dan sesuaikan path media di konten.

## Mengisi hadiah

1. Edit **src/content.js**: nama, pengirim, tanggal ISO lengkap dengan zona waktu, puisi, surat, path foto, dan musik. Tanggal kosong tidak memunculkan tanggal fiktif; countdown tanggal bersifat opsional dan tidak mengunci hadiah.
2. Simpan foto milikmu ke **public/photos/**, lalu isi path, misalnya `hero: '/photos/senyum.webp'`. Ada **33 slot**: 9 slot lama tetap dipertahankan dan 24 tambahan `orbit01`–`orbit24`. Sebaiknya WebP/JPEG, sisi panjang 1400 px, <300 KB per foto. Foto sengaja kosong, tanpa foto orang lain.
3. Slot foto dipakai dalam kolase dan sebagai material cakram akresi. Dari jauh cakram tetap terlihat sebagai plasma; saat kamera masuk, permukaannya terungkap sebagai foto. Mengisi lebih banyak foto menghasilkan lebih banyak variasi. Bila hanya sedikit foto diisi, renderer mengulang foto yang tersedia.
4. Isi `tracks[].src` dengan path audio yang boleh kamu gunakan, misalnya `/music/lagu-kita.mp3`, file di `public/music/`. Tanpa file, tersedia nada lembut Web Audio setelah pengguna mengekliknya. Audio tidak diputar otomatis.
5. Kutipan, terjemahan, doa, dan sumber ada di **src/quotes.js**. [Catatan sumber dan keputusan pengalaman](docs/words-and-experience.md) menjelaskan konteks kutipan dan pemisahan dari doa buatan sendiri.
6. Build, periksa, lalu deploy. Jangan commit media pribadi ke repo publik tanpa persetujuan.

### Preview melalui “Isi kenangan”

Tombol kecil di sudut bawah membuka editor. Unggah banyak foto sekaligus untuk mengisi 24 slot semesta kosong, atau atur masing-masing dari 33 slot. Foto JPG/PNG/WebP maksimal 8 MB diperkecil ke 1400 px dan disimpan sebagai WebP di IndexedDB. Lagu pertama maksimal 15 MB. Nama, tanggal, foto, dan audio tersimpan **hanya pada browser/origin ini**, bukan pada tautan yang dibagikan. Untuk hadiah publik, isi file dan `content.js` seperti di atas.

Database lokal dari versi sebelumnya dipertahankan. Kegagalan penyimpanan ditampilkan; isian dapat dihapus per foto atau sekaligus. Tidak ada upload media ke server, analytics, atau akun.

## Alur interaksi

- **Pembuka:** ketuk Buka semesta kita. Countdown singkat, lalu seluruh ucapan hilang selama zoom. Setelah kamera selesai, mozaik foto menetap dan ucapan muncul. Perjalanan dapat dilewati. Tidak ada dialog pembuka.
- **Cerita:** tombol lanjut berlabel tujuan, kembali, dan penanda bab. Adegan bertumpang tindih sejenak untuk transisi yang halus. Puisi, doa, dan surat punya navigasi halaman sendiri. Konten tidak berganti otomatis ketika sedang dibaca.
- **Surat:** segel dan lipatan amplop terbuka, surat muncul pada layar cerita yang sama; empat halaman dapat dibaca tanpa modal.
- **Lilin:** layar khusus dengan kue besar → Aku siap buat harapan → Tiup lilinnya → ucapan perayaan. Tidak memerlukan mikrofon atau meniup layar. Bisa diulang.
- **Aksesibilitas:** fokus keyboard, `inert` pada bab yang tidak aktif, ukuran tombol utama minimal 48 px, reduced motion, audio berdasarkan tindakan pengguna. Layar sangat pendek dapat menggulir bab aktif agar isi tetap terbaca. Canvas berhenti ketika tak terlihat/tab tersembunyi; DPR maksimal 2 (dibatasi 3840×2160 pixel) dan 30 fps. Tidak ada loop render saat gambar diam.

## Pengujian

```sh
npx playwright install chromium
npm test
npm run build
```

Cloud dengan Chromium yang sudah terpasang:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=2
```

Tes desktop/mobile memeriksa teks tidak muncul selama zoom, kepadatan foto, navigasi adegan/puisi/doa/surat, sumber kutipan, audio berdasarkan tindakan pengguna, tombol tiup yang terlihat, perayaan dan ulang lilin, unggah banyak foto, penyimpanan setelah refresh, reduced motion, fokus keyboard, dan overflow horizontal. Tidak membutuhkan kredensial.

## Gargantua: gambar detail dan kamera

`public/art/gargantua.webp` adalah rekonstruksi gambar 1672×941 berdasarkan referensi Gargantua yang dikirim pengguna. `gargantua-detail.webp` adalah rekonstruksi close-up dari bagian kanan cakram untuk detail saat mendekat. Keduanya disiapkan dengan image generation/editing dari referensi, bukan diklaim sebagai still film asli atau hasil simulasi relativitas. Encoding WebP mempertahankan dimensi, total sekitar 756 KB. Tidak ada video atau engine WebGL tambahan.

`src/universe-camera.js` menyimpan lintasan kamera 7,6 detik dan bidang cakram. Kamera mendekati titik pada cakram dari 1× ke 16× dengan kecepatan/percepatan nol di awal dan akhir. Foto melekat di koordinat bidang yang sama; tidak ada foto mengambang dari jauh atau perpindahan ke grid baru. Mulai zoom 3,2×, tekstur cahaya beralih secara halus ke foto. Ucapan tetap tersembunyi sepanjang gerakan.

Untuk menjaga ketajaman, renderer menggambar foto yang terlihat dari thumbnail 384×480, bukan memperbesar atlas kecil. Maksimal empat foto didekode bersamaan, hanya sel yang masuk viewport digambar. Close-up detail dimuat setelah gambar utama; kegagalannya tidak mengunci hadiah. Gambar utama memiliki fallback bila gagal dimuat. Gerak berhenti ketika tab tersembunyi, saat selesai, dan pada reduced motion.

Tes tambahan memeriksa kontinuitas kamera, akhir pandangan tetap berada di cakram, foto unggahan benar-benar terlihat pada pixel canvas, gambar jauh tetap identik setelah foto diunggah, dan kegagalan aset tidak memblokir cerita.
