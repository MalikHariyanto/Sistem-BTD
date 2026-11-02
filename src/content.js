// Semua hadiah permanen diatur di file ini. File media disimpan di public/.
import { photoManifest } from "./generated/photo-manifest.js";
import { createPhotoLibrary } from "./media/photo-library.js";
export { ORBIT_PHOTO_COUNT } from "./media/photo-library.js";

export const photoConfig = {
  // Kosong = cari otomatis nama slot yang sama di public/photos/story/.
  // Contoh manual: portrait: "/photos/orbit/001.webp".
  story: {
    hero: "",
    portrait: "",
    poem0: "",
    poem1: "",
    poem2: "",
    moment0: "",
    moment1: "",
    moment2: "",
    moment3: "",
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
  // Opsional: foto scenery asli di public/photos/scenery/; kosong memakai ilustrasi dekoratif orisinal.
  scrapbook: { edinburgh: "", prague: "" },
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
  letterPhotos: ["hero", "moment0", "moment1", "moment3"],
  letter: [
    "Hai, hari ini layak kamu rayakan. Di balik usia yang bertambah, ada keberanian untuk mencoba, keputusan yang tidak mudah, dan banyak hari yang berhasil kamu lewati. Beri dirimu waktu untuk menengok perjalanan itu. Ada yang patut kamu banggakan dari caramu sampai sejauh ini, termasuk usaha kecil yang selama ini luput kamu hargai.",
    "Semoga pengalaman yang sulit perlahan bisa kamu terima tanpa kehilangan lembutnya hati. Ada bagian dari diri sendiri yang memang perlu dikenali pelan-pelan, seperti halaman yang baru terasa maknanya ketika dibaca kembali. Kamu boleh berubah pikiran, belajar lagi, dan tumbuh dengan waktumu sendiri. Mudah-mudahan prosesnya membantumu lebih mengerti apa yang kamu butuhkan.",
    "Semoga Allah melapangkan rezekimu, menjernihkan pertimbanganmu, dan memberi arah bagi usaha-usaha yang sedang kamu rawat. Bila suatu rencana berjalan berbeda dari keinginanmu, mudah-mudahan tersedia jalan lain yang baik untukmu. Tetaplah berprasangka baik kepada-Nya, sambil memberi dirimu waktu untuk memahami hal-hal yang belum terjawab.",
    "Untuk hari-hari mendatang, semoga ada ketenangan dalam keseharianmu dan orang-orang tulus yang turut merayakan kabar baikmu. Semoga tubuhmu sehat, istirahatmu cukup, dan harapan tetap tumbuh di sela kesibukan. Masih banyak tempat yang belum kamu datangi, hal yang belum kamu pelajari, dan kejutan kecil yang kelak membuatmu bersyukur. Selamat menempuh satu musim lagi dalam hidupmu."
],
};
