// Semua hadiah permanen diatur di file ini. File media disimpan di public/.
import { photoManifest } from "./generated/photo-manifest.js";
import { createPhotoLibrary } from "./media/photo-library.js";
export { ORBIT_PHOTO_COUNT } from "./media/photo-library.js";

// Urutan foto slide: kiri ke kanan; surat mengikuti urutan bait saat digulir.
// Koleksi Gargantua tetap di photoConfig.orbit, terpisah dari foto-foto ini.
export const sectionPhotos = {
  birthday: [
    "/photos/scenery/foto1.jpg",
    "/photos/scenery/foto2.jpg",
    "/photos/scenery/foto3.jpg",
    "/photos/scenery/foto4.jpg",
    "/photos/scenery/foto5.jpg",
  ],
  garden: [
    "/photos/scenery/foto11.jpg",
    "/photos/scenery/foto 12.jpg", // Nama file asli memakai spasi.
    "/photos/scenery/foto13.jpg",
  ],
  letter: [
    "/photos/scenery/foto21.jpg",
    "/photos/scenery/foto22.jpg",
    "/photos/scenery/foto23.jpg",
    "/photos/scenery/foto24.jpg",
  ],
};

// Alias identitas bingkai lama; urutan foto cukup diedit di sectionPhotos.
export const sceneryPhotos = {
  prague: sectionPhotos.birthday[0],
  edinburgh: sectionPhotos.garden[0],
  street: sectionPhotos.birthday[4],
  oldTown: sectionPhotos.garden[1],
  castle: sectionPhotos.garden[2],
  river: sectionPhotos.birthday[2],
};

export const photoConfig = {
  // Kosong = cari otomatis nama slot yang sama di public/photos/story/.
  // Contoh manual: portrait: "/photos/orbit/001.webp".
  story: {
    hero: sectionPhotos.letter[0], // Surat: foto21.
    portrait: sectionPhotos.birthday[1], // Hari lahirmu: foto2.
    poem0: "/photos/scenery/prague-evening.jpg", // Foto puisi tetap.
    poem1: "/photos/scenery/edinburgh-night.jpg",
    poem2: "/photos/scenery/prague-river.jpg",
    moment0: sectionPhotos.birthday[3], // Hari lahirmu: foto4.
    moment1: sectionPhotos.letter[1], // Surat: foto22.
    moment2: sectionPhotos.letter[2], // Surat: foto23.
    moment3: sectionPhotos.letter[3], // Surat: foto24.
  },
  // Kosong = baca semua JPG/PNG/WebP di public/photos/orbit/ saat build.
  // Urutan alami: 1.jpg, 2.jpg, ... 200.jpg. Nama file bebas, maksimal 200.
  // Untuk memilih urutan sendiri, isi path secara manual:
  // orbit: ["/photos/orbit/001.webp", "/photos/orbit/002.webp"],
  orbit: [],
};

export const content = {
  recipient: "Kamu",
  sender: "Yang turut mengaminkan",
  birthday: "", // ISO lengkap dengan zona, misalnya 2027-02-14T00:00:00+07:00
  photos: createPhotoLibrary(photoConfig, photoManifest),
  orbitThumbnails: photoManifest.thumbnails || {},
  // Foto bab tidak dimasukkan ke atlas Gargantua.
  storyOnlyPhotos: [...Object.values(sectionPhotos).flat(), ...Object.values(photoConfig.story).filter(Boolean)],
  // Pemetaan foto bingkai Hari lahirmu dan Bunga & doa.
  scrapbook: sceneryPhotos,
  poems: [
    {
        "title": "Gargantua",
        "subtitle": "",
        "text": "eksistensinya buat jutaan cakram akresi runtuh ke gargantua itu\ndan semua keluh kesah tentram ku pada singularity terasa begitu lamanya\nmaka biarkan aku mati didalamnya, tertinggal digusur oleh waktu\nbiarkan bait bait ini saja semua cerita ku tuturkan padamu\nlewat baris baris puisi yang ku tulis untukmu\nkau akan menemukan namamu yang kusamarkan metafora"
    },
    {
        "title": "hari hari",
        "subtitle": "",
        "text": "hanya detik waktu yang tak berarti mungkin\nBERGERAK tanpa henti\ntanpa peduli\nbagai api yang melahap kamu\nbagai hujan yang menghilangkan awan\nkalau nanti habis tubuhmu diperas sibuk\nbarangkali itulah cara semesta berkenalan denganmu\nmengajakmu berdamai dengan waktu\nwahai putri kecil riang yang kini menjadi wanita cantik nan jelita"
    },
    {
        "title": "pada hari lahirmu",
        "subtitle": "",
        "text": "aku mendengar dari sapardi\nbahwa cinta yang sederhana pun tidak dilakukan dengan sederhana\nhari hari yang indah juga tidak didapatkan dengan mudah\nmaka dihari lahirmu ini, janganlah menuntut untuk mengubah apa apa\ntapi berdoalah agar bisa memainkan peranmu dengan sebaik baiknya\ndan doa yang telah dilangitkan pada muara itu\naku harap kembali kepada jiwa yang memintanya\ndalam sebaik baiknya bentuk"
    }
],
  // Catatan lama tetap disimpan agar konten personal tidak hilang.
  moments: [
    {
      title: "Awal sebuah cerita",
      note: "Hari biasa, yang setelahnya tak pernah lagi biasa.",
      date: "BAB 01",
    },
    {
      title: "Tawa yang tinggal",
      note: "Ada detik yang sebentar. Ada rasanya yang selamanya.",
      date: "BAB 02",
    },
    {
      title: "Di antara perjalanan",
      note: "Tempatnya boleh berganti. Teman perjalanannya tetap kamu.",
      date: "BAB 03",
    },
    {
      title: "Masih, dan selalu",
      note: "Untuk semua kenangan yang belum sempat kita buat.",
      date: "BERSAMBUNG",
    },
  ],
  tracks: [
    {
      title: "Country",
      artist: "Koshun Nakao",
      src: "/music/koshun-nakao-country-intro-cut.mp3",
      // Metadata file asal disimpan sebagai catatan; musik memakai src di atas.
      originalUpload: {
        bytes: 2230113,
        sha256: "3a3c4750f6cb0a68ab5948c1fa12def73ee5902c01bb51a1616548691e58cab7",
      },
    },
  ],
  // Foto menemani setiap bait surat saat di-scroll, memakai slot foto di atas.
  letterPhotos: ["hero", "moment1", "moment2", "moment3"],
  letter: [
    "Hai, sudah sampai di hari lahirmu lagi. Semoga hari ini ada waktu buat makan yang kamu suka, ketemu orang-orang terdekat, dan tertawa tanpa buru-buru. Urusan yang bisa menunggu, biar menunggu sebentar.",
    "Kalau masih ada rencana yang belum kesampaian, sisakan saja untuk diusahakan lagi. Ulang tahun boleh dirayakan sebelum semua urusan beres. Hitung juga hal-hal kecil yang berhasil kamu selesaikan tahun kemarin. Sering kali, justru itu yang paling gampang terlupakan.",
    "Aku ikut mendoakan yang sedang kamu usahakan. Semoga Allah memberi jalan yang baik, juga rezeki yang cukup untuk kebutuhanmu dan sedikit lebih untuk hal-hal yang kamu sukai. Kalau mesti menunggu, mudah-mudahan kamu tetap punya tenaga untuk berusaha dan tidak kehilangan prasangka baik kepada-Nya.",
    "Selamat bertambah usia. Semoga tahun ini kamu lebih sering pulang dengan hati lapang, punya waktu untuk beristirahat, dan dikelilingi orang-orang yang tulus. Kalau nanti ada kabar gembira, rayakan sekecil apa pun itu. Untuk sekarang, nikmati dulu hari lahirmu."
],
};
