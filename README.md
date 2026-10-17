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
2. Simpan foto milikmu ke **public/photos/**, lalu isi path, misalnya `hero: '/photos/senyum.webp'`. Ada **129 slot**: 9 slot cerita dan 120 slot semesta `orbit01`–`orbit120`; seluruh kunci lama tetap dipertahankan. Sebaiknya WebP/JPEG, sisi panjang 1400 px, <300 KB per foto. Foto sengaja kosong, tanpa foto orang lain.
3. Slot foto dipakai dalam kolase dan sebagai material cakram akresi. Dari jauh cakram tetap terlihat sebagai plasma; saat kamera masuk, permukaannya terungkap sebagai foto. Mengisi lebih banyak foto menghasilkan lebih banyak variasi. Bila hanya sedikit foto diisi, renderer mengulang foto yang tersedia.
4. Isi `tracks[].src` dengan path audio yang boleh kamu gunakan, misalnya `/music/lagu-kita.mp3`, file di `public/music/`. Tanpa file, tersedia nada lembut Web Audio setelah pengguna mengekliknya. Audio tidak diputar otomatis.
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
- **Aksesibilitas:** fokus keyboard, `inert` pada bab yang tidak aktif, ukuran tombol utama minimal 48 px, reduced motion, audio berdasarkan tindakan pengguna. Layar sangat pendek dapat menggulir bab aktif agar isi tetap terbaca. Canvas berhenti ketika tak terlihat/tab tersembunyi; DPR maksimal 2 (dibatasi 3840×2160 pixel) dan 30 fps. Reduced motion menghentikan gerak orbit.

Ornamen memakai ilustrasi botani transparan yang berbeda: mawar blush, tulip ivory-peach, dan anemone mauve di `public/art/botanical-{rose,tulip,anemone}.webp`, ditambah rangkaian mawar sebelumnya untuk kolase. Tiga aset baru berukuran 512×768 dengan total sekitar 194 KB, dibuat lewat image generation dan dikompres menjadi WebP ber-alpha. Kebun doa menampilkan tiga spesies yang berbeda, dengan halo tipis, gerak mekar lembut, dan tiga kelopak kecil yang jatuh sekali saat disentuh. Tiap doa memakai penanda bunga yang sama dengan tombolnya. Ornamen kenangan, puisi, surat, dan editor memakai komposisi berbeda. Gambar bunga kebun dimuat dengan prioritas rendah; ilustrasi lain dimuat saat diperlukan. Bunga tidak menangkap klik dan tetap terpisah dari unggahan foto. Reduced motion menghentikan animasi kelopak dan mekar.

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

`src/universe-camera.js` menyimpan **32.768 keping foto**, radius, fase awal, ketebalan cakram, dan lintasan kamera 12,6 detik. Foto yang diunggah diulang pada keping-keping tersebut; angka ini bukan jumlah file foto yang perlu disediakan. Orbit bagian dalam bergerak lebih cepat daripada bagian luar. Radius keping perlahan berkurang; kecepatan sudut yang terintegrasi meningkat saat mendekat. Keping dapat menyelesaikan orbit sebelum memudar pada batas dalam. Siklus baru dimulai pada tepi luar yang transparan, sehingga tidak ada perpindahan kiri-ke-kanan yang terlihat. Kamera mendekati sisi depan annulus dengan perspektif dan parallax, dengan pembesaran yang bertahap dan kecepatan nol di kedua ujung. Pembuka mengikuti lintasan zoom semula; setelah 35% perjalanan, pembesaran berangsur menyesuaikan sampai close-up yang lebih intim. Kamera berakhir lebih dekat daripada tampilan lebar sebelumnya, sedikit di atas aliran sisi depan supaya lapisan keping kecil tetap terlihat di belakang foto dekat. Radius tidak dibagi menjadi barisan, dan variasi ketinggian membuat keping tersebar naik-turun. Mayoritas keping berukuran kecil; foto besar lebih jarang dan dibatasi maksimal 190 px atau 36% lebar layar agar tidak menutup kedalaman cakram. Posisi keping tidak pernah dipindahkan ke susunan lain. Ucapan tetap tersembunyi sepanjang gerakan. Fase tambahan empat detik ditempatkan saat pusat Gargantua masih terlihat: kamera berpindah mengelilingi pusat sekitar 60° pada sumbu normal cakram sambil tetap mendekat. Posisi kamera dan ketiga sumbu pandangnya berubah bersama, menghasilkan parallax pada keping dunia yang sama di GPU dan Canvas. Kamera naik perlahan di atas cakram untuk memperlihatkan kedalamannya, lalu turun menuju aliran depan dan melanjutkan dolly pada arah baru, tanpa berbalik ke arah awal. Sudut kamera tidak ditambahkan ke fase rotasi foto. Warna foto kecil lebih jelas dan beberapa foto medium sedikit membesar agar kepadatan cakram terbaca sebelum kamera mendekat. Peralihan ke beberapa foto utama tetap dilakukan setelah fase ini. Pembuka dan jarak akhir mempertahankan tampilannya. Reduced motion melewati fase ini, dan tombol lewati tetap tersedia.

`src/universe-gpu.js` menggunakan shader WebGL kecil dan satu buffer orbit yang tetap. Dari jauh, keping tampak seperti filamen cahaya keemasan. Seiring ukuran proyeksinya membesar, foto menjadi terlihat; kemunculannya mengikuti ukuran masing-masing keping, bukan pergantian latar pada waktu tertentu. Saat kamera mengorbit, ray kamera dipotongkan dengan bidang cakram yang miring untuk memproyeksikan tekstur filamennya. Halo memakai detail fotografis referensi yang ditambatkan ke pusat terproyeksi. Bayangan memakai perpotongan ray dengan bola dalam koordinat dunia; tiap fragmen foto ditutup jika berada di belakangnya, sedangkan aliran depan tetap terlihat. Salinan optik sisi jauh memberi lengkungan tambahan pada pembuka. Foto tetap mengorbit pelan setelah kamera sampai. `src/orbit-composition.js` mengatur close-up tanpa memindahkan posisi orbit: ribuan keping kecil mengisi kedalaman, sementara maksimal 8 foto utama di HP atau 16 di desktop diberi jarak, variasi rasio asli, dan ruang di sekitar ucapan. Foto utama dipilih dari sisi orbit yang menghadap kamera. Saat memasuki lengkungan belakang, foto memudar sebelum arah proyeksinya berbalik; koordinatnya tidak dibungkus dari tepi kiri ke kanan. Seleksi memperhitungkan gerakan berikutnya dan mempertahankan foto yang sudah terlihat, dengan fade lembut untuk kedatangan/kepergian. Ucapan baru mendapat lapisan kontras lembut setelah perjalanan selesai. Gambar referensi menyediakan detail halo, dengan aliran tekstur terbatas pada daerah bercahaya agar pusat gelap tidak ikut berputar atau berubah bentuk. Ini pendekatan artistik, bukan simulasi relativitas.

Atlas foto dibuat sekali ketika unggahan berubah. Ukuran menyesuaikan jumlah foto dan batas tekstur perangkat, dengan anggaran maksimal 8 juta pixel (sekitar 32 MB RGBA). Untuk 129 foto pada perangkat dengan batas tekstur 4096, atlas memakai 2496×2400 pixel. Tidak ada ribuan elemen DOM atau ribuan file gambar. Thumbnail dengan sisi panjang maksimal 320 px didekode maksimal empat bersamaan dan dipakai ulang. Seluruh framing asli dipertahankan; rasio portrait, landscape, dan persegi disimpan bersama identitas foto lalu dipulihkan saat menggambar keping. Warna asli muncul bertahap pada ukuran sekitar 2–28 px, sehingga foto yang mulai terbaca tidak terus tertutup warna plasma keemasan. Penempatan foto memilih gambar berbeda untuk keping yang berdekatan pada beberapa posisi orbit, sekaligus menyeimbangkan pemakaian seluruh koleksi. Pilihan disimpan selama animasi agar foto tidak berganti saat zoom. Jumlah foto unik tetap bergantung pada unggahan; pengulangan masih mungkin ketika banyak keping terlihat. Kamera menunggu penyiapan koleksi sebelum perjalanan. Tanpa foto pribadi, keping berisi bingkai kosong. Browser tanpa WebGL menggunakan 8.192 keping Canvas 2D dan tetap dapat membuka seluruh cerita. Detail close-up dimuat setelah gambar utama; kegagalan aset tidak mengunci hadiah. Render berhenti saat editor foto terbuka, adegan/tab tersembunyi, atau reduced motion aktif, dengan batas 30 fps dan resolusi retina sesuai anggaran pixel.

`src/motion.js` menahan frame terakhir sampai opacity/transform disimpan, lalu melepas efek animasi. Bab lama disembunyikan sebelum gayanya dibersihkan. Ini mencegah tampilan lama menyala kembali di sela transisi; tombol bab juga terkunci selama perpindahan. Puisi mengganti foto dan teks bersamaan saat transparan.

Tes tambahan membaca frame transisi untuk mendeteksi kilatan halaman lama, memeriksa gerak idle dan bayangan pusat yang stabil, pembekuan reduced motion, orbit spiral yang mempercepat saat mendekat, kelanjutan orbit penuh dan pergantian siklus hanya saat transparan, posisi serta basis kamera yang benar-benar berpindah, penutupan sisi belakang oleh horizon, kesesuaian ribuan posisi CPU dengan pixel WebGL saat kamera bergerak, pembesaran kamera tanpa sentakan di akhir, foto unggahan yang benar-benar terlihat pada pixel canvas, orientasi portrait/landscape dan pinggir foto yang tetap utuh, kepadatan latar saat close-up, jarak antar foto utama dan lintasannya selama 450 frame sampai keluar tepi kiri tanpa berbalik, serta fallback tanpa WebGL/aset gambar.
