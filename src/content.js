// Semua hadiah permanen diatur di file ini. File media disimpan di public/.
import { photoManifest } from "./generated/photo-manifest.js";
import { createPhotoLibrary } from "./media/photo-library.js";
export { ORBIT_PHOTO_COUNT } from "./media/photo-library.js";

// Hanya untuk slide cerita; tidak ditambahkan ke koleksi Gargantua.
// Simpan enam foto asli di public/photos/scenery/, lalu isi path di bawah.
// Slot yang kosong disembunyikan; tidak ada gambar generate sebagai pengganti.
export const sceneryPhotos = {
  prague: "/photos/scenery/prague-evening.jpg",
  edinburgh: "/photos/scenery/edinburgh-night.jpg",
  street: "/photos/scenery/edinburgh-street.jpg",
  oldTown: "/photos/scenery/prague-old-town.jpg",
  castle: "/photos/scenery/prague-castle.jpg",
  river: "/photos/scenery/prague-river.jpg",
};

export const photoConfig = {
  // Kosong = cari otomatis nama slot yang sama di public/photos/story/.
  // Contoh manual: portrait: "/photos/orbit/001.webp".
  story: {
    hero: sceneryPhotos.castle, // Surat: foto pertama; ganti path ini nanti.
    portrait: "", // Hari lahirmu: potret utama.
    poem0: sceneryPhotos.prague, // Puisi Gargantua; ganti path ini nanti.
    poem1: sceneryPhotos.edinburgh, // Puisi hari hari; ganti path ini nanti.
    poem2: sceneryPhotos.river, // Puisi pada hari lahirmu; ganti path ini nanti.
    moment0: "", // Hari lahirmu: bingkai personal kedua.
    moment1: sceneryPhotos.oldTown, // Surat: foto kedua; ganti path ini nanti.
    moment2: sceneryPhotos.street, // Surat: foto ketiga; ganti path ini nanti.
    moment3: sceneryPhotos.river, // Surat: foto keempat; ganti path ini nanti.
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
  // Foto asli untuk Hari lahirmu dan Bunga & doa. Slot kosong tidak ditampilkan.
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
