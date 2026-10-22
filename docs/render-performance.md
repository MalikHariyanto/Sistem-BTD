# Optimasi perjalanan Gargantua

Referensi tampilan: commit `6316a41`. Optimasi mempertahankan 32.768 filamen, seleksi foto, rasio, posisi pin, ketajaman, resolusi canvas, atlas HD, material kristal, lintasan kamera, durasi dan arah rotasi. Target render tetap 30 fps untuk WebGL dan 24 fps untuk fallback Canvas.

## Pekerjaan yang dikurangi

- Konstanta proyeksi dihitung sekali untuk setiap kamera dalam satu frame.
- Foto yang pasti lebih kecil dari ambang tampil ditolak sebelum perhitungan lensa dan horizon. Ambang ukurannya tetap sama.
- Prediksi tabrakan di tengah/depan waktu tetap dipakai, tetapi hanya dihitung setelah kandidat lolos pemeriksaan ruang saat ini. Sumber yang sudah ditolak tidak menghitung dua orbit tambahan.
- Pemeriksaan ray/sphere memakai skalar; tidak membuat array, `map`, dan `reduce` untuk setiap partikel.
- Persiapan foto HD dipindahkan sebelum perintah menggambar frame. Validasi upload dilakukan sekali per kelompok perubahan. Slot cache baru dipakai setelah kelompok upload dinyatakan berhasil; upload gagal tetap kembali ke atlas dasar dan bisa dicoba ulang.
- Penjadwal frame menoleransi pembulatan timestamp RAF. Pada layar 60/90/120 Hz, target 30 fps mendapat jarak render yang konsisten, tanpa sengaja melewatkan refresh lalu mengejarnya pada refresh berikutnya.

## Benchmark CPU

Jalankan `npm run benchmark:orbits`. Untuk membandingkan checkout lain: `node scripts/benchmark-orbits.mjs /path/checkout/src`.

Benchmark memakai 200 foto berasio campuran dan seluruh populasi orbit: satu pemanasan, lalu 360 frame pengukuran per viewport. Hasil satu pengujian Node pada lingkungan yang sama, dijalankan berurutan:

| Viewport | Rata-rata sebelum | Sesudah | P95 sebelum | Sesudah |
| --- | ---: | ---: | ---: | ---: |
| 390 × 844 | 5,188 ms | 2,669 ms | 7,748 ms | 3,445 ms |
| 1440 × 900 | 8,349 ms | 4,192 ms | 14,460 ms | 6,137 ms |

Ini biaya seleksi/proyeksi di CPU, bukan pengukuran FPS atau GPU pada HP fisik. Pengujian browser tambahan menemukan jeda pada `getError()` setelah upload foto; pemindahan persiapan dan validasi batch mengurangi titik sinkronisasi tersebut.

## Kesetaraan tampilan dan pemeriksaan

`tests/render-optimization.spec.js` membandingkan hasil dengan rekaman referensi: 2.160 frame dan 80.694 foto terproyeksi, termasuk library 6/120/200 foto, rasio ekstrem, HP sempit, HP tinggi, laptop, perjalanan dan ending. Identitas, koordinat, ukuran, kedalaman, kekuatan pin dan transparansi sama persis.

Perbandingan GPU sebelum/sesudah pada 18 frame menghasilkan piksel identik, termasuk viewport HP dengan DPR 2. Tes cache memastikan identitas tetap benar, bingkai stabil tidak mengulang upload/validasi, dan kegagalan satu kelompok upload tidak mengekspos foto yang belum tervalidasi. Tes clock mencakup pembulatan timestamp, refresh berbeda dan jeda panjang.
