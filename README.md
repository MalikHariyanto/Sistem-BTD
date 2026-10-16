# Ambis Copenhagen

Sebuah semesta kecil untuk ulang tahun seseorang: Gargantua berisi kenangan, kumpulan puisi, galeri momen, surat kejutan, playlist, dan lilin harapan. Vanilla JavaScript + CSS + satu Canvas 2D, tanpa framework runtime atau backend.

## Menjalankan

Node.js 22.12+ atau 24 LTS, npm.

```sh
npm ci
npm run dev
```

Server pengembangan memakai port 5173. Build statis: `npm run build` (hasil di `dist/`). Uji build: `npm run preview`. Deploy isi `dist/` ke hosting statis HTTPS seperti Netlify, Vercel, atau Cloudflare Pages. Untuk hosting di subpath, gunakan `npm run build -- --base=/Sistem-BTD/` dan sesuaikan path aset di konten. Tidak ada analytics, akun, atau pengiriman foto ke server.

## Mengisi hadiah sebelum dibagikan

1. Edit `src/content.js`: nama penerima/pengirim, judul & isi puisi, catatan momen, surat, dan daftar lagu.
2. Masukkan foto milikmu ke `public/photos/`, gunakan nama file tanpa spasi. Sebaiknya WebP/JPEG, sisi panjang maksimal 1400 px dan <300 KB per foto. Atur path seperti `photos: { hero: '/photos/senyum.webp', ... }`. Semua slot sengaja kosong; tidak ada foto orang lain. Foto-foto yang diisi juga muncul dalam orbit Gargantua.
3. Isi `birthday` dengan tanggal ISO beserta zona waktu: `2027-02-14T00:00:00+07:00`. Kalau kosong, tidak ada tanggal fiktif. Countdown tanggal yang asli terpisah dari countdown sinematik tiga detik; hadiah tetap bisa dibuka sebelum tanggalnya.
4. Masukkan audio yang berhak kamu gunakan ke `public/music/`, isi `tracks[].src`, misalnya `/music/lagu-kita.mp3`. Tidak ada YouTube/Spotify yang dimuat otomatis. Tanpa file audio, tombol nada lembut memainkan nada instrumental sederhana dengan Web Audio setelah pengguna mengekliknya.
5. Jalankan build, periksa hasilnya, lalu deploy. Foto dan puisi yang disimpan di repo publik dapat dibaca publik; jangan commit media pribadi tanpa persetujuan.

### Preview tanpa mengedit kode

Klik **Isi kenangan** di footer untuk mengganti nama, tanggal, foto, dan lagu pertama secara lokal. Foto diperkecil maksimal 1400 px lalu disimpan sebagai WebP di IndexedDB browser (maksimal file masukan 8 MB; audio 15 MB). Pengaturan lokal bertahan setelah refresh pada origin dan browser yang sama, tetapi **tidak ikut tautan yang dibagikan**. Untuk hadiah yang bisa dibuka orang lain, gunakan langkah `content.js` di atas. Gunakan tombol hapus untuk menghapus foto/isian lokal. Mode privat atau penyimpanan penuh bisa menolak penyimpanan; UI menampilkan kegagalannya.

## Pengalaman & aksesibilitas

- Pembuka opsional 6 detik: countdown 03 → 00 sambil mendekat ke black hole, lalu orbit bingkai foto terlihat. Bisa dilewati atau diulang.
- Tiga puisi dengan tombol sebelumnya/selanjutnya; empat momen bisa diperbesar.
- Amplop → pratinjau inbox → surat panjang. Dialog mendukung Escape, fokus keyboard, dan tombol kembali.
- Lilin ditiup dengan ketukan, tanpa izin mikrofon.
- Canvas dibatasi DPR 1.5 dan 30 fps, berhenti saat di luar layar/tab tersembunyi. `prefers-reduced-motion` menonaktifkan gerakan.
- Font Google bersifat opsional; font Georgia/Arial tersedia sebagai fallback. Tidak ada aset video/3D besar.

## Pengujian

```sh
npx playwright install chromium
npm test
npm run build
```

Tes Chromium desktop dan mobile memeriksa alur pembuka, puisi, surat, momen, lilin, unggah foto & persistensi, countdown, dan overflow. Tidak membutuhkan layanan eksternal atau kredensial.

Jika Chromium sudah tersedia di cloud, gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test -- --workers=2` agar tidak perlu mengunduh browser lain.
