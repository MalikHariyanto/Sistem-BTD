# Ambis Copenhagen

Hadiah ulang tahun dalam tujuh adegan: perjalanan Gargantua → ucapan personal → puisi → tiga doa dari kutipan sastra → surat → musik → perayaan lilin. Warna ivory, cokelat hangat, dan cahaya keemasan. Vanilla JavaScript, CSS, dan WebGL dengan fallback Canvas 2D; tanpa framework runtime, backend, atau video animasi besar.

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

- **Pembuka:** ketuk Buka semesta kita. Countdown singkat, lalu seluruh ucapan hilang selama zoom. Setelah kamera selesai, gerak orbit melambat dan ucapan muncul. Perjalanan dapat dilewati. Tidak ada dialog pembuka.
- **Cerita:** tombol lanjut berlabel tujuan, kembali, dan penanda bab. Adegan bertumpang tindih sejenak untuk transisi yang halus. Puisi, doa, dan surat punya navigasi halaman sendiri. Konten tidak berganti otomatis ketika sedang dibaca.
- **Surat:** segel dan lipatan amplop terbuka, surat muncul pada layar cerita yang sama; empat halaman dapat dibaca tanpa modal.
- **Lilin:** layar khusus dengan kue besar → Aku siap buat harapan → Tiup lilinnya → ucapan perayaan. Tidak memerlukan mikrofon atau meniup layar. Bisa diulang.
- **Aksesibilitas:** fokus keyboard, `inert` pada bab yang tidak aktif, ukuran tombol utama minimal 48 px, reduced motion, audio berdasarkan tindakan pengguna. Layar sangat pendek dapat menggulir bab aktif agar isi tetap terbaca. Canvas berhenti ketika tak terlihat/tab tersembunyi; DPR maksimal 2 (dibatasi 3840×2160 pixel) dan 30 fps. Reduced motion menghentikan gerak orbit.

Ornamen mawar dusty rose, mawar ivory, dan baby’s breath memakai satu ilustrasi transparan hasil image generation di `public/art/romantic-roses.webp` (512×768, sekitar 90 KB). Aset ini dipakai ulang pada kolase kenangan, puisi, surat, dan header editor. Bunga dimuat saat diperlukan, mengikuti transisi adegan, dan tidak menangkap klik atau ikut terganti ketika foto diunggah.

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

Tes desktop/mobile memeriksa teks tidak muncul selama zoom, geometri orbit dan kepadatan foto, navigasi adegan/puisi/doa/surat, sumber kutipan, audio berdasarkan tindakan pengguna, tombol tiup yang terlihat, perayaan dan ulang lilin, unggah banyak foto, penyimpanan setelah refresh, reduced motion, fokus keyboard, dan overflow horizontal. Tidak membutuhkan kredensial.

## Gargantua: gambar detail dan kamera

`public/art/gargantua.webp` adalah rekonstruksi gambar 1672×941 berdasarkan referensi Gargantua yang dikirim pengguna. `gargantua-detail.webp` adalah rekonstruksi close-up dari bagian kanan cakram untuk detail saat mendekat. Keduanya disiapkan dengan image generation/editing dari referensi, bukan diklaim sebagai still film asli atau hasil simulasi relativitas. Encoding WebP mempertahankan dimensi, total sekitar 756 KB. Tidak ada video atau engine WebGL tambahan.

`src/universe-camera.js` menyimpan **32.768 keping foto**, radius, fase awal, ketebalan cakram, dan lintasan kamera 8,6 detik. Foto yang diunggah diulang pada keping-keping tersebut; angka ini bukan jumlah file foto yang perlu disediakan. Orbit bagian dalam bergerak lebih cepat daripada bagian luar. Kamera mendekati sisi depan annulus dengan perspektif dan parallax, dengan pembesaran yang bertahap dan kecepatan nol di kedua ujung. Posisi keping tidak pernah dipindahkan ke susunan lain. Ucapan tetap tersembunyi sepanjang gerakan.

`src/universe-gpu.js` menggunakan shader WebGL kecil dan satu buffer orbit yang tetap. Dari jauh, keping tampak seperti filamen cahaya keemasan. Seiring ukuran proyeksinya membesar, foto menjadi terlihat; kemunculannya mengikuti ukuran masing-masing keping, bukan pergantian latar pada waktu tertentu. Salinan optik sisi jauh membentuk lengkungan di sekitar bayangan hitam. Foto saling menutupi berdasarkan kedalaman dan tetap mengorbit pelan setelah kamera sampai. Gambar referensi menyediakan detail halo, dengan aliran tekstur terbatas pada daerah bercahaya agar pusat gelap tidak ikut berputar atau berubah bentuk. Ini pendekatan artistik, bukan simulasi relativitas.

Atlas foto dibuat sekali ketika unggahan berubah, maksimal 2048×1600 untuk 33 slot. Tidak ada ribuan elemen DOM atau ribuan file gambar. Thumbnail didekode maksimal empat bersamaan dan dipakai ulang. Tanpa foto pribadi, keping berisi bingkai kosong. Browser tanpa WebGL menggunakan 8.192 keping Canvas 2D dan tetap dapat membuka seluruh cerita. Detail close-up dimuat setelah gambar utama; kegagalan aset tidak mengunci hadiah. Render berhenti saat editor foto terbuka, adegan/tab tersembunyi, atau reduced motion aktif, dengan batas 30 fps dan resolusi retina sesuai anggaran pixel.

`src/motion.js` menahan frame terakhir sampai opacity/transform disimpan, lalu melepas efek animasi. Bab lama disembunyikan sebelum gayanya dibersihkan. Ini mencegah tampilan lama menyala kembali di sela transisi; tombol bab juga terkunci selama perpindahan. Puisi mengganti foto dan teks bersamaan saat transparan.

Tes tambahan membaca frame transisi untuk mendeteksi kilatan halaman lama, memeriksa gerak idle dan bayangan pusat yang stabil, pembekuan reduced motion, orbit dengan radius yang tetap dan kedalaman yang berbeda, pembesaran kamera tanpa sentakan di akhir, foto unggahan yang benar-benar terlihat pada pixel canvas, serta fallback tanpa WebGL/aset gambar.
