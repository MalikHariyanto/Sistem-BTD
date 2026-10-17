# Ambis Copenhagen

Hadiah ulang tahun dalam tujuh adegan: perjalanan Gargantua → ucapan personal → puisi → tiga doa dari kutipan sastra → surat → musik → perayaan lilin. Warna ivory, cokelat hangat, dan cahaya keemasan. JavaScript/CSS dan WebGL ringan untuk Gargantua, dengan fallback Canvas 2D. Tanpa backend atau video animasi besar.

## Menjalankan

Node.js 22.12+ atau 24 LTS dan npm:

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan terminal. Build: `npm run build` menghasilkan `dist/`. Uji hasil build: `npm run preview`. Deploy `dist/` ke hosting statis HTTPS. Untuk hosting subpath gunakan `npm run build -- --base=/Sistem-BTD/` dan sesuaikan path media di konten.

## Mengisi hadiah

1. Edit **src/content.js**: nama, pengirim, tanggal ISO lengkap dengan zona waktu, puisi, surat, path foto, dan musik. Tanggal kosong tidak memunculkan tanggal fiktif; countdown tanggal bersifat opsional dan tidak mengunci hadiah.
2. Simpan foto milikmu ke **public/photos/**, lalu isi path, misalnya `hero: '/photos/senyum.webp'`. Ada **129 slot**: 9 slot cerita dan 120 slot semesta `orbit01`–`orbit120`; seluruh kunci lama tetap dipertahankan. Sebaiknya WebP/JPEG, sisi panjang 1400 px, <300 KB per foto. Foto sengaja kosong, tanpa foto orang lain.
3. Slot foto dipakai dalam kolase dan sebagai material cakram akresi. Dari jauh cakram tetap terlihat sebagai plasma; saat kamera masuk, permukaannya terungkap sebagai foto. Mengisi lebih banyak foto menghasilkan lebih banyak variasi. Bila hanya sedikit foto diisi, renderer mengulang foto yang tersedia.
4. Isi `tracks[].src` dengan path audio yang boleh kamu gunakan, misalnya `/music/lagu-kita.mp3`, file di `public/music/`. Tanpa file, tersedia nada lembut Web Audio setelah pengguna mengekliknya. Lagu pertama dipreload, lalu mulai pada ketukan pembuka. Jika belum diisi, nada lembut Web Audio langsung menemani cerita. Browser memerlukan interaksi pertama sebelum mengizinkan suara; tombol mute tetap dapat dipakai selama perjalanan.
5. Kutipan, terjemahan, doa, dan sumber ada di **src/quotes.js**. [Catatan sumber dan keputusan pengalaman](docs/words-and-experience.md) menjelaskan konteks kutipan dan pemisahan dari doa buatan sendiri.
6. Build, periksa, lalu deploy. Jangan commit media pribadi ke repo publik tanpa persetujuan.

### Preview melalui “Isi kenangan”

Tombol kecil di sudut bawah membuka editor. Unggah banyak foto sekaligus untuk mengisi sampai 120 slot semesta kosong, atau atur masing-masing dari 129 slot. Foto JPG/PNG/WebP maksimal 8 MB diperkecil ke 1400 px dan disimpan sebagai WebP di IndexedDB. Lagu pertama maksimal 15 MB. Nama, tanggal, foto, dan audio tersimpan **hanya pada browser/origin ini**, bukan pada tautan yang dibagikan. Untuk hadiah publik, isi file dan `content.js` seperti di atas.

Database lokal dari versi sebelumnya dipertahankan. Kegagalan penyimpanan ditampilkan; isian dapat dihapus per foto atau sekaligus. Tidak ada upload media ke server, analytics, atau akun.

## Alur interaksi

- **Pembuka:** ketuk Buka semesta kita. Countdown singkat, lalu seluruh ucapan hilang selama zoom. Setelah kamera selesai, gerak orbit melambat dan ucapan muncul. Perjalanan dapat dilewati. Tidak ada dialog pembuka.
- **Cerita:** tombol lanjut berlabel tujuan, kembali, dan penanda bab. Adegan bertumpang tindih sejenak untuk transisi yang halus. Puisi dan surat dibaca per halaman. Doa memakai kebun interaktif: sentuh bunga Bahagia, Bertumbuh, atau Dicintai dalam urutan bebas; doanya muncul dan tetap terkumpul bersama. Kutipan sastra, terjemahan, dan sumber bisa dibuka pada lipatan masing-masing doa. Konten tidak berganti otomatis ketika sedang dibaca.
- **Surat:** segel dan lipatan amplop terbuka, surat muncul pada layar cerita yang sama; empat halaman dapat dibaca tanpa modal.
- **Lilin:** layar khusus dengan kue besar → Aku siap buat harapan → Tiup lilinnya → ucapan perayaan. Tidak memerlukan mikrofon atau meniup layar. Bisa diulang.
- **Aksesibilitas:** fokus keyboard, `inert` pada bab yang tidak aktif, ukuran tombol utama minimal 48 px, reduced motion, audio dimulai pada ketukan pembuka dan dapat dijeda kapan saja. Layar sangat pendek dapat menggulir bab aktif agar isi tetap terbaca. Canvas berhenti ketika tak terlihat/tab tersembunyi; DPR maksimal 2 dengan anggaran 3840 × 2160 pixel, dan 30 fps. Reduced motion menghentikan gerak orbit.

Ornamen memakai ilustrasi botani transparan yang berbeda: mawar blush, tulip ivory-peach, dan anemone mauve di `public/art/botanical-{rose,tulip,anemone}.webp`, ditambah rangkaian mawar sebelumnya untuk kolase. Tiga aset baru berukuran 512×768 dengan total sekitar 194 KB, dibuat lewat image generation dan dikompres menjadi WebP ber-alpha. Kebun doa menampilkan tiga spesies yang berbeda, dengan halo tipis, gerak mekar lembut, dan tiga kelopak kecil yang jatuh sekali saat disentuh. Tiap doa memakai penanda bunga yang sama dengan tombolnya. Ornamen kenangan, puisi, surat, dan editor memakai komposisi berbeda. Gambar bunga kebun dimuat dengan prioritas rendah; ilustrasi lain dimuat saat diperlukan. Bunga tidak menangkap klik dan tetap terpisah dari unggahan foto. Reduced motion menghentikan animasi kelopak dan mekar.

## Pengujian

```sh
npx playwright install chromium
npm test
npm run build
```

Cloud dengan Chromium yang sudah terpasang:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=1
```

Tes desktop/mobile memeriksa teks tidak muncul selama zoom, geometri orbit dan kepadatan foto, navigasi adegan/puisi/doa/surat, sumber kutipan, audio berdasarkan tindakan pengguna, tombol tiup yang terlihat, perayaan dan ulang lilin, unggah banyak foto, penyimpanan setelah refresh, reduced motion, fokus keyboard, dan overflow horizontal. Tidak membutuhkan kredensial.

## Gargantua: bentuk semula, gerak sinematik di tengah

Bentuk dan material Gargantua dikembalikan ke versi sebelum perubahan renderer React: lensa referensi HD di `public/art/gargantua.webp`, detail filamen di `gargantua-detail.webp`, serta 32.768 partikel foto pada orbit 3D. Pembuka dan penutup memakai lintasan kamera semula. Foto tetap kosong sampai diisi sendiri; seluruh 129 slot dan penyimpanan lokal dipertahankan.

Perubahan gerak hanya aktif pada bagian tengah perjalanan (`middleMotionAt` pada progress 0,18–0,62). Kamera menyusuri sumbu normal cakram dengan arah azimuth berlawanan dari foto yang mengorbit. Kamera terus bergerak pada jeda peragaan foto empat detik, kemudian bertransisi kembali ke lintasan penutup semula. Jendela gerak memakai easing dengan kecepatan dan percepatan nol pada batasnya. Tidak ada pergantian canvas, render engine, atau tata letak foto di tengah animasi.

`src/universe-camera.js` menyimpan orbit, proyeksi, occlusion horizon, dan lintasan kamera. `src/universe-gpu.js` memakai buffer partikel tetap dan atlas foto dengan batas 8 juta pixel. Foto mempertahankan rasio portrait/landscape dan warna asli ketika cukup dekat. Pemilihan foto mengurangi duplikasi di antara tetangga. `src/orbit-composition.js` menjaga ruang antar foto pada penutup. Seluruh ucapan tersembunyi selama perjalanan 12,6 detik; tombol lewati dan reduced motion tetap tersedia. Render berhenti saat editor terbuka atau adegan/tab tersembunyi. Browser tanpa WebGL memakai Canvas 2D dengan 8.192 partikel. Tidak ada dependency React/Three atau video besar.

## Bacaan dan suara

Header, viewport bacaan, dan navigasi mendapat baris layout terpisah. Foto atau tulisan yang digulir tetap terpotong di viewport bacaan dan tidak bisa menimpa logo maupun navigasi. Bunga doa tidak melekat di atas bacaan saat scroll. Setiap narasi doa memakai ukuran minimal 16 px, jarak baris 1,85, dan kontras terang. Doa yang dipilih dibawa ke area baca bila diperlukan; semua doa yang sudah dibuka tetap terkumpul.

**src/soundtrack.js** mempertahankan satu elemen audio dengan `preload="auto"` dan loop. Isian IndexedDB dipulihkan sebelum tombol pembuka aktif, sehingga lagu unggahan sudah disiapkan. `play()` dipanggil langsung dalam gesture tombol pembuka, sebelum menunggu countdown, animasi, atau renderer. Tanpa lagu, oscillator ambient mulai dengan fade sekitar 0,2 detik. Pergantian bab tidak membuat ulang audio atau mereset posisi putar. Mute tetap tersedia selama perjalanan. Audio dijeda saat tab tersembunyi dan dilanjutkan saat kembali jika sebelumnya sedang menyala.

`src/motion.js` menahan frame terakhir sampai opacity/transform disimpan, lalu melepas efek animasi. Bab lama disembunyikan sebelum gayanya dibersihkan agar tidak menyala kembali di sela transisi.

Tes desktop/HP memeriksa bentuk pembuka/penutup yang dipertahankan, jendela gerak tengah dan arah orbit berlawanan, proyeksi GPU dan occlusion horizon, warna serta rasio foto pada pixel canvas, fallback, unggah 120 foto dan persistensi, pemisahan header/navigasi ketika scroll, ukuran bacaan doa, playback WAV dari ketukan pertama, mute/resume, serta navigasi, surat, kebun, dan perayaan lilin.
