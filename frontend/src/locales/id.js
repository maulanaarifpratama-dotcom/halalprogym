// Bahasa Indonesia. Kunci adalah string sumber Inggris (lihat lib/i18n.js).
//
// PACK INI SENGAJA BELUM LENGKAP. `t()` melakukan `dict[s] || s`, jadi kunci yang belum ada
// jatuh ke Inggris per-kunci — bukan pack-nya yang gagal. Yang diisi lebih dulu adalah yang
// membawa keputusan brand: nama hari, istilah keislaman, dan navigasi utama. Sisanya menyusul
// di Fase 4 lewat scripts/translate-*.mjs.
//
// Dua prinsip yang dipakai, tertulis supaya tidak melenceng waktu pack ini tumbuh:
//
// 1. AHAD, BUKAN MINGGU. Nama hari Indonesia sudah Arab semuanya — Itsnain>Senin,
//    Tsalatsa>Selasa, Arbi'a>Rabu, Khamis>Kamis, Jumu'ah>Jumat, Sabt>Sabtu — kecuali
//    "Minggu", yang dari Portugis *domingo* ("Hari Tuhan"). Ganti satu kata itu dan
//    minggunya konsisten penuh. Perhatikan: `Intl` dengan `id-ID` MENGEMBALIKAN "Minggu",
//    jadi tempat yang memakai toLocaleDateString langsung (fmtDate di lib/format.js) masih
//    bocor dan harus disubstitusi lewat formatToParts. Kunci di bawah menutup semua tempat
//    yang lewat `t(DAYN[..])` / `t(DAYS[..])`, yaitu Home, Plan, Workout, dan ekspor rencana.
//
// 2. ISTILAH GYM TETAP INGGRIS. Deadlift, bench press, squat, reps — itu yang benar-benar
//    dipakai orang di gym Indonesia. Kalau istilah Inggrisnya justru yang natural, kuncinya
//    TIDAK DIISI sama sekali; fallback yang mengerjakannya. Menerjemahkan "reps" jadi
//    "repetisi" bikin app terasa seperti buku pelajaran, bukan seperti gym.
export default {
  /* ---- hari: satu-satunya keputusan brand di kalender ---- */
  'Sunday': 'Ahad',
  'Monday': 'Senin',
  'Tuesday': 'Selasa',
  'Wednesday': 'Rabu',
  'Thursday': 'Kamis',
  'Friday': 'Jumat',
  'Saturday': 'Sabtu',
  'Su': 'Ahd',
  'Mo': 'Sen',
  'Tu': 'Sel',
  'We': 'Rab',
  'Th': 'Kam',
  'Fr': 'Jum',
  'Sa': 'Sab',

  /* ---- bulan ---- */
  'January': 'Januari',
  'February': 'Februari',
  'March': 'Maret',
  'April': 'April',
  'May': 'Mei',
  'June': 'Juni',
  'July': 'Juli',
  'August': 'Agustus',
  'September': 'September',
  'October': 'Oktober',
  'November': 'November',
  'December': 'Desember',

  /* ---- Ikhwan / Akhwat.
     Ini melabeli diagram tubuh (BodyMap), BUKAN demo gerakan — demo gerakannya satu set
     netral untuk semua. Nilai tersimpannya tetap 'male'/'female', jadi nol migrasi data. ---- */
  'Male': 'Ikhwan',
  'Female': 'Akhwat',

  /* ---- navigasi ---- */
  'Home': 'Beranda',
  'Plan': 'Rencana',
  'Stats': 'Statistik',
  'History': 'Riwayat',
  'Settings': 'Pengaturan',

  /* ---- aksi ---- */
  'Confirm': 'Konfirmasi',
  'Cancel': 'Batal',
  'Delete': 'Hapus',
  'Save': 'Simpan',
  'Import': 'Impor',
  'Done': 'Selesai',
  'Skip': 'Lewati',
  'Remove': 'Hapus',
  'Edit': 'Ubah',
  'On': 'Nyala',
  'Off': 'Mati',
  'All': 'Semua',

  /* ---- latihan ---- */
  'Rest': 'Istirahat',
  'Rest day': 'Hari istirahat',
  'Today': 'Hari ini',
  'Start workout': 'Mulai latihan',
  'Body weight': 'Berat badan',
  'Sets': 'Set',
  'Note': 'Catatan',
  // 'Reps' sengaja TIDAK diisi — lihat prinsip 2 di atas.

  /* ---- nama otot: label peta anatomi, sekarang visual utama SETIAP latihan.
     Yang tidak diisi (Biceps, Triceps, Quads, Hamstrings, Glutes, Adductors, Serratus)
     memang istilah yang dipakai orang di gym apa adanya — aturan induk 1 di glosarium. ---- */
  'Chest': 'Dada',
  'Shoulders': 'Bahu',
  'Upper back': 'Punggung atas',
  'Lower back': 'Punggung bawah',
  'Abs': 'Perut',
  'Obliques': 'Perut samping',
  'Forearms': 'Lengan bawah',
  'Calves': 'Betis',
  'Shins': 'Tulang kering',
  'Hip flexors': 'Fleksor pinggul',
  'Traps': 'Trapezius',
  /** Penghubung di keterangan peta otot: "Dada · juga Bahu, Triceps". */
  'also': 'juga',

  /* ---- label dua bingkai demo gerakan ---- */
  'start position': 'posisi awal',
  'end position': 'posisi akhir',

  /** Tingkat terakhir slot demo: tidak ada foto dan tidak ada metadata otot. */
  'Set a body part to see which muscles this works':
    'Isi bagian tubuhnya untuk melihat otot yang dikerjakan',

  /* ---- waktu salat. Ejaan mengikuti KBBI: Magrib tanpa h, Asar tanpa h, Zuhur dengan Z.
     Lihat docs/GLOSARIUM-ID.md — itu keputusan, bukan salah tulis. ---- */
  'Prayer times': 'Waktu salat',
  'Prayer city': 'Kota untuk waktu salat',
  'Imsak': 'Imsak',
  'tomorrow': 'besok',
  '{0} now': 'Waktu {0}',
  'Calculated times. For Ramadan, check your local official schedule.':
    'Hasil perhitungan. Untuk Ramadan, cocokkan ke jadwal resmi daerahmu.',

  /* ---- tampilan ---- */
  'Language': 'Bahasa',
  'Theme': 'Tema',
  'Dark': 'Gelap',
  'Light': 'Terang',

  /* ---- lima kunci yang diwajibkan Workout.remove.test.jsx ada di SETIAP pack ---- */
  'Remove {0}?': 'Hapus {0}?',
  'This removes the exercise from your current session.':
    'Latihan ini dikeluarkan dari sesi yang sedang berjalan.',
  'The sets you logged for this exercise in this session will be lost.':
    'Set yang sudah kamu catat untuk latihan ini di sesi ini akan hilang.',
  'Which exercise in this superset do you want to remove?':
    'Latihan mana dalam superset ini yang mau dihapus?'
}
