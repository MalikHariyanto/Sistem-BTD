// Semua konten permanen dapat diganti di sini. Path foto/audio relatif ke public/.
// Contoh: photo: '/photos/portrait.webp'. Kosong = bingkai tanpa foto.
export const ORBIT_PHOTO_COUNT = 120;

export const content = {
  recipient: "Kamu",
  sender: "Seseorang yang selalu memilihmu",
  birthday: "", // ISO lengkap dengan zona, misalnya 2027-02-14T00:00:00+07:00
  photos: {
    hero: "",
    portrait: "",
    poem0: "",
    poem1: "",
    poem2: "",
    moment0: "",
    moment1: "",
    moment2: "",
    moment3: "",
    // 120 foto untuk Gargantua. Slot lama orbit01–orbit24 tetap dipertahankan.
    ...Object.fromEntries(
      Array.from({ length: ORBIT_PHOTO_COUNT }, (_, i) => [
        `orbit${String(i + 1).padStart(2, "0")}`,
        "",
      ]),
    ),
  },
  poems: [
    {
      title: "Gravitasi",
      subtitle: "Tentang segala yang selalu kembali",
      text: "Di antara miliaran arah\nyang ditawarkan semesta,\naku selalu menemukan\njalan pulang yang sama.\n\nBukan utara.\nBukan sebuah kota.\nMelainkan kamu,\ndan caramu menyebut namaku.",
    },
    {
      title: "Hal-hal Kecil",
      subtitle: "Yang diam-diam menjadi segalanya",
      text: "Aku ingin menyimpan\ntawa yang jatuh di sela cerita,\ncara matamu menyala,\ndan hening yang tak perlu diterjemahkan.\n\nSebab bahagia tak selalu\ndatang sebagai peristiwa besar.\nKadang ia hanya duduk di sebelahku,\ndan kebetulan, itu kamu.",
    },
    {
      title: "Pada Hari Lahirmu",
      subtitle: "Sebuah doa yang pelan-pelan",
      text: "Semoga hari-hari memelukmu\nselembut pagi menyentuh jendela.\nSemoga yang kamu tunggu\nmenemukan jalan menuju rumah.\n\nDan bila dunia terasa terlalu riuh,\nsemoga kamu selalu ingat:\nada hati yang menyediakan sunyi,\nagar kamu bisa beristirahat.",
    },
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
      title: "Untuk perjalanan pulang",
      artist: "Satu lagu, seribu ingatan",
      src: "",
    },
    {
      title: "Saat dunia melambat",
      artist: "Putar ketika kamu rindu",
      src: "",
    },
    {
      title: "Tentang kita",
      artist: "Simpan satu tempat untuk lagu kita",
      src: "",
    },
  ],
  // Foto menemani setiap bait surat saat di-scroll, memakai slot unggahan yang ada.
  letterPhotos: ["hero", "moment0", "moment1", "moment3"],
  letter: [
    "Selamat ulang tahun, manusia kesayanganku. Di hari ketika dunia pertama kali mengenalmu, aku ingin mengucapkan terima kasih. Untuk hadirmu, untuk tawamu, untuk semua hal kecil yang mungkin tak kamu sadari telah membuat hidupku lebih hangat.",
    "Aku tidak bisa menjanjikan hari-hari yang selalu mudah. Tapi aku ingin ada: mendengarkan cerita yang sama untuk kesekian kalinya, merayakan langkah kecilmu, dan mengingatkan betapa berharganya kamu ketika kamu sendiri lupa.",
    "Di usia yang baru ini, semoga kamu tumbuh tanpa kehilangan lembutmu. Semoga mimpi-mimpimu punya ruang, dan hatimu punya tempat pulang. Jangan terburu-buru; bahkan bintang pun membutuhkan waktu untuk sampai pada cahayanya.",
    "Hari ini milikmu. Pejamkan mata, buat satu harapan. Aku akan menyimpan doaku di antara harapan-harapanmu. Selamat bertambah cerita. Aku bahagia bisa menjadi bagian kecil di dalamnya.",
  ],
};
