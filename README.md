# Ambis Copenhagen

Hadiah ulang tahun dalam tujuh adegan: perjalanan Gargantua → ucapan personal → puisi → tiga doa dari kutipan sastra → surat → musik → perayaan lilin. Warna ivory, cokelat hangat, dan cahaya keemasan. JavaScript/CSS untuk cerita, dengan scene React Three Fiber untuk Gargantua dan fallback Canvas 2D. Tanpa backend atau video animasi besar.

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
- **Aksesibilitas:** fokus keyboard, `inert` pada bab yang tidak aktif, ukuran tombol utama minimal 48 px, reduced motion, audio dimulai pada ketukan pembuka dan dapat dijeda kapan saja. Layar sangat pendek dapat menggulir bab aktif agar isi tetap terbaca. Canvas berhenti ketika tak terlihat/tab tersembunyi; DPR maksimal 1,25 di HP, 1,5 di desktop, dan 30 fps. Reduced motion menghentikan gerak orbit.

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

## Gargantua: satu scene 3D

Komponen lengkapnya ada di **src/GargantuaScene.jsx**: React, `@react-three/fiber`, `@react-three/drei`, `three`, dan `@react-three/postprocessing`. Modul 3D dimuat secara dinamis; cerita dan editor tetap ringan dan tidak perlu dirender ulang setiap frame. Tidak ada gambar/video Gargantua yang ditaruh sebagai latar.

Scene berisi tepat satu bola hitam `MeshBasicMaterial` di `(0, 0, 0)` dan satu `InstancedMesh` dengan **5.000 keping foto**. Jumlah ini adalah keping render, bukan jumlah file yang perlu diunggah. Radius kontinu dan sedikit variasi tinggi membuat satu annulus padat yang tidak berupa barisan. Instancing memakai satu geometry/material untuk semua keping. Atlas dibuat ketika koleksi berubah; rasio asli portrait/landscape dipulihkan saat render, dan seluruh framing foto dipertahankan. Pemilihan id foto mengurangi pengulangan antar tetangga, memakai semua sumber secara seimbang, dan tidak berubah ketika kamera bergerak. Tanpa unggahan, keping memakai bingkai kosong.

Cakram berputar lewat `mesh.rotation.y = time * 0.085`, sehingga azimuth dunia fotonya berkurang. Kamera memakai sin/cos dengan azimuth yang bertambah (`+ time * 0.030`, ditambah gerak perjalanan), jadi arahnya berlawanan. Kamera selalu `lookAt(0, 0, 0)`, tanpa OrbitControls. **src/gargantua-model.js** menyimpan lintasan 12,6 detik, termasuk empat detik tambahan untuk melihat kepadatan foto, lalu mendekat ke aliran depan. Waktu gerak melambat setelah ucapan muncul. Seluruh teks ucapan tetap tersembunyi selama perjalanan. Tombol lewati dan reduced motion dipertahankan.

Lengkungan optik di atas pusat berasal dari proyeksi vertex pada sisi jauh mesh foto yang sama. Tidak ada salinan mesh cakram atau ring torus tambahan. Depth test bola menutup bagian foto di belakangnya. Pass setelah Bloom memeriksa kedalaman permukaan bola agar pusat tetap hitam; foto yang benar-benar di depan pusat tidak ikut ditutup. Lensing postprocessing membelokkan sedikit cahaya di dekat tepi bayangan. Foto kecil pada radius dalam menghasilkan nilai HDR yang panas; Bloom memakai cahaya tersebut, bukan cakram plasma terpisah. Foto yang sudah besar kembali ke warna aslinya. Ini interpretasi artistik yang mengacu pada referensi video, bukan simulasi relativitas atau render film asli.

Satu buffer instance disiapkan ketika material foto berubah. Tiap frame hanya posisi/orientasi kamera, rotasi mesh, dan uniform yang diperbarui. Atlas dibatasi 8 juta pixel; thumbnail berukuran sisi panjang maksimal 320 px didekode empat bersamaan. Bloom memakai setengah resolusi dan enam tingkat mipmap, tanpa MSAA atau normal pass. Render dibatasi 30 fps, DPR maksimal 1,25 pada HP dan 1,5 pada desktop; renderer software memakai DPR 1. Render berhenti saat editor terbuka, adegan/tab tersembunyi, atau reduced motion aktif. Browser tanpa WebGL mendapat proyeksi Canvas 2D yang lebih sederhana dengan 1.800 keping, satu pusat gelap, dan seluruh cerita tetap dapat dibuka.

## Bacaan dan suara

Header, viewport bacaan, dan navigasi mendapat baris layout terpisah. Foto atau tulisan yang digulir tetap terpotong di viewport bacaan dan tidak bisa menimpa logo maupun navigasi. Bunga doa tidak melekat di atas bacaan saat scroll. Setiap narasi doa memakai ukuran minimal 16 px, jarak baris 1,85, dan kontras terang. Doa yang dipilih dibawa ke area baca bila diperlukan; semua doa yang sudah dibuka tetap terkumpul.

**src/soundtrack.js** mempertahankan satu elemen audio dengan `preload="auto"` dan loop. Isian IndexedDB dipulihkan sebelum tombol pembuka aktif, sehingga lagu unggahan sudah disiapkan. `play()` dipanggil langsung dalam gesture tombol pembuka, sebelum menunggu countdown, animasi, atau renderer. Tanpa lagu, oscillator ambient mulai dengan fade sekitar 0,2 detik. Pergantian bab tidak membuat ulang audio atau mereset posisi putar. Mute tetap tersedia selama perjalanan. Audio dijeda saat tab tersembunyi dan dilanjutkan saat kembali jika sebelumnya sedang menyala.

`src/motion.js` menahan frame terakhir sampai opacity/transform disimpan, lalu melepas efek animasi. Bab lama disembunyikan sebelum gayanya dibersihkan agar tidak menyala kembali di sela transisi.

Tes desktop/HP memeriksa jumlah dan jenis objek render yang sebenarnya, putaran kamera/cakram yang berlawanan, target kamera, orbit penuh, warna serta rasio foto pada pixel canvas, fallback, unggah 120 foto dan persistensi, pemisahan header/navigasi ketika scroll, ukuran bacaan doa, playback WAV dari ketukan pertama, mute/resume, serta navigasi, surat, kebun, dan perayaan lilin.
