# Foto suasana untuk slide cerita

Enam foto asli dari ZIP pengguna tersimpan di folder ini. Berkas disalin tanpa
kompresi ulang atau perubahan warna/piksel:

- `prague-evening.jpg`: alun-alun Praha saat senja.
- `edinburgh-night.jpg`: bangunan Edinburgh dengan lampu jalan.
- `edinburgh-street.jpg`: jalan Edinburgh setelah hujan.
- `prague-old-town.jpg`: gang berbatu di kota lama.
- `prague-castle.jpg`: jalan menuju kastel saat malam.
- `prague-river.jpg`: panorama sungai dan jembatan saat senja.

Foto kota lama tetap disimpan, dan tiga di antaranya masih dipakai di puisi.
Untuk mengubah foto setiap bab, edit `sectionPhotos` di `src/content.js`. Ekstensi JPG/JPEG,
PNG, atau WebP didukung. Nilai kosong menyembunyikan bingkai; tidak ada gambar
generate sebagai pengganti foto asli.

Foto baru dipakai menurut urutan di bawah. Foto bab tidak ditambahkan ke koleksi
Gargantua. Foto puisi masih dapat diganti lewat `photoConfig.story`.

## Urutan foto yang dipakai sekarang

Edit `sectionPhotos` di `src/content.js` untuk mengganti urutan:

- Hari lahirmu, kiri ke kanan: `foto1.jpg` → `foto2.jpg` → `foto3.jpg` → `foto4.jpg` → `foto5.jpg`.
- Bunga & doa, kiri ke kanan: `foto11.jpg` → `foto 12.jpg` → `foto13.jpg`.
- Surat, mengikuti bait 1–4: `foto21.jpg` → `foto22.jpg` → `foto23.jpg` → `foto24.jpg`.

Nama `foto 12.jpg` memang memakai spasi. Foto lama tetap disimpan, dan tiga foto
puisi masih memakai foto kota sebelumnya. Foto bab tidak masuk ke Gargantua.
