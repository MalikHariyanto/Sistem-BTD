# Crystal Pin pada aliran foto Gargantua

Bagian tengah perjalanan memakai arah visual A dari cabang `preview-crystal-orbits`: foto berada dalam kristal putih bersegi dan memiliki titik cahaya pada asal orbitnya. Ini material yang dihitung saat render, bukan gambar bingkai statis yang ditempel di atas canvas.

## Bentuk, cahaya, dan kedalaman

- `src/crystal-pin.js` menyimpan bentuk kristal, ruang komposisi, proyeksi ujung, peredupan belakang, dan material shader. Foto mempertahankan rasio sumber, dengan sedikit pemotongan di sudut bevel.
- Bidang foto memakai yaw/pitch, perspektif, dan gerak halus dari fase orbit. Bingkai naik di atas titik asal; ujung kristal penuh tepat berada pada posisi sumber orbit. Foto tidak diberi koordinat layar yang berputar sendiri.
- Shader menghitung beberapa bidang bevel dengan normal berbeda, pantulan spekular, Fresnel, pembiasan ringan dari gambar lingkungan, garis sambungan facet, serta kilau kecil pada sudut. Facet bawah lebih transparan. Cahaya mengikuti arah Gargantua; area foto utama tetap tajam dan tidak dilapisi bloom putih.
- Titik asal memiliki caustic kecil dan pantulan berbentuk elips. Posisi, kedalaman, dan fade-nya memakai identitas yang sama dengan foto. Tidak ada penanda yang menetap ketika fotonya pergi.
- Foto yang naik ke lengkungan belakang semakin memudar berdasarkan tinggi optiknya. Pada puncak, material hampir kembali menjadi cahaya; foto belakang pada pita bawah juga lebih samar. Bagian depan menjadi fokus yang jelas.

Ini pendekatan artistik dengan bidang foto berperspektif dan facet analitis, bukan simulasi relativitas atau ray tracing kristal.

## Komposisi dan ketajaman

Seleksi memakai orbits dan sumber foto yang sudah ada. Anggaran keseluruhan tetap 90 foto di HP / 160 di laptop, tetapi mayoritas ruang yang jelas diprioritaskan untuk depan. Dua pin paling besar dapat tampil bersama di HP, tujuh di laptop; sisanya memakai ukuran menengah dan kecil sesuai jarak. Angka ini adalah batas pin besar, bukan batas jumlah seluruh foto.

Pengujian koleksi 200 foto berasio campuran selama lima detik menghasilkan rata-rata sekitar 14 foto jelas di HP 320 px, 22 di HP 390 px, dan 32 pada viewport laptop 1280 px. Jumlah berubah bersama fase orbit, kamera, rasio foto, dan ruang yang tersedia. Foto yang lebih samar serta 32.768 filamen tetap mengisi kedalaman. Foto tidak ditambah dengan ukuran seragam atau ditempatkan ulang agar memenuhi grid.

Foto depan biasa dibatasi 64 px di HP / 92 px di laptop, dengan beberapa sumber utama dapat mencapai batas 94 / 138 px. Semua ukuran masih berasal dari proyeksi jarak. Prediksi ruang memperhitungkan bingkai yang terangkat, ujung dan titik cahaya; foto yang sedang memudar juga tetap mendapat ruang.

Atlas unggahan dan cache detail 320 px tetap dipakai. Jalur WebGL menggambar foto yang dipilih sebagai quad instanced agar kualitasnya tidak bergantung pada batas ukuran point sprite perangkat. Filamen kecil tetap memakai buffer sumber yang sama; tidak ada ribuan mesh, elemen DOM, atau library tambahan. Perangkat tanpa ekstensi instancing memakai point sprite yang tersedia; fallback Canvas menggambar facet berproyeksi dan foto melalui dua segitiga. Efek cahaya Canvas disederhanakan.

## Alur dan pemeriksaan

Kristal berbaur masuk/keluar bersama bagian tengah. Pembuka, pusat kamera, durasi perjalanan, arah orbit, playlist, dan isi cerita tetap dipakai. Ending kembali ke komposisi foto intim sebelumnya dan tetap mencegah duplikasi selama fade. Reduced motion tetap melewati perjalanan dan menghentikan orbit.

`tests/crystal-pin.spec.js` memeriksa ujung pada posisi orbit, ruang untuk rasio ekstrem, peredupan tinggi, serta pixel foto/facet/titik cahaya di GPU. Tes komposisi memeriksa jumlah foto jelas, ruang antarbingkai, identitas tetap, dan transisi ke ending. Tes atlas/cache, kedalaman horizon, fallback Canvas, dan ketajaman foto melengkapi pemeriksaan tersebut.
