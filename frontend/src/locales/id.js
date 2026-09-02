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
  // --- nama kontrol ikon (aria-label) ---
  // Semuanya dulu ditulis langsung dalam bahasa Inggris di JSX, jadi pembaca layar
  // menyebut "Increase" tiap kali beban ditambah, di ke-13 bahasa.
  'Clear': 'Kosongkan',
  'Decrease': 'Kurangi',
  'Increase': 'Tambahkan',
  'Move down': 'Turunkan',
  'Move up': 'Naikkan',
  'Next month': 'Bulan berikutnya',
  'Next week': 'Pekan berikutnya',
  'Previous month': 'Bulan sebelumnya',
  'Previous week': 'Pekan sebelumnya',
  'Save': 'Simpan',
  'Import': 'Impor',
  'Done': 'Selesai',
  'Skip': 'Lewati',
  'Remove': 'Hapus',
  'Edit': 'Ubah',
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
    'Latihan mana dalam superset ini yang mau dihapus?',

  /* ================= Fase 4: sisa layar, sheet, dan dialog ================= */
  '"{0}" and its equipment list will be removed.': '"{0}" beserta daftar alatnya akan dihapus.',
  'A clean one-page-per-plan printout — no exercise ever splits across a page.':
    'Cetakan bersih satu halaman per rencana — tidak ada latihan yang terpotong antar halaman.',
  'A fuller dot means less left in the tank — the same weight at a lower {0} is progress the line alone does not show.':
    'Titik yang lebih penuh berarti sisa tenaganya lebih sedikit — beban yang sama di {0} lebih rendah itu progres yang tidak terlihat dari garisnya saja.',
  'A small file a friend imports into their own Halal Pro Gym — routines only, none of your workouts or weigh-ins.':
    'Berkas kecil yang bisa diimpor teman ke Halal Pro Gym miliknya — cuma rutinnya, bukan sesi atau penimbangan badanmu.',
  'A timer runs while you hold the set. Leave the weight at 0 for bodyweight holds.':
    'Timer berjalan selama kamu menahan setnya. Biarkan bebannya 0 untuk tahanan berat badan.',
  'Accent color': 'Warna aksen',
  'Account': 'Akun',
  'Active profile': 'Profil aktif',
  'Activity — last 12 months': 'Aktivitas — 12 bulan terakhir',
  'Add an exercise to a routine first — an empty plan has nothing to share.':
    'Tambahkan latihan ke rutin dulu — rencana kosong tidak ada yang bisa dibagikan.',
  'Add equipment profile': 'Tambah profil alat',
  'Add exercise': 'Tambah latihan',
  'Add session note': 'Tambah catatan sesi',
  'Add set': 'Tambah set',
  'Add to my plan': 'Tambahkan ke rencanaku',
  'Add to routine': 'Tambahkan ke rutin',
  'Add warm-up set': 'Tambah set warm-up',
  'Warm-up set {0}': 'Set warm-up {0}',
  'Add “{0}”': 'Tambahkan “{0}”',
  'Added ({0})': 'Ditambahkan ({0})',
  'Added as your own': 'Ditambahkan sebagai milikmu',
  'Added before your work sets and left out of volume, records and progression. Each one closes half the gap to the work weight — you can still change any of them mid-session.':
    'Ditambahkan sebelum set kerja, dan tidak dihitung ke volume, rekor, maupun progresi. Masing-masing menutup separuh jarak ke beban kerja — semuanya masih bisa kamu ubah di tengah sesi.',
  'Added {0} routines to your plan': '{0} rutin ditambahkan ke rencanamu',
  'Additional muscle groups': 'Kelompok otot tambahan',
  'All data reset': 'Semua data direset',
  'Always for this exercise': 'Selalu untuk latihan ini',
  'Any equipment': 'Semua alat',
  'Appearance': 'Tampilan',
  'Applies to every exercise in this routine that does not set its own rule.':
    'Berlaku untuk setiap latihan di rutin ini yang tidak punya aturannya sendiri.',
  'Ask for a weight on every set.': 'Tanyakan beban di setiap set.',
  'Auto-backup on changes': 'Cadangkan otomatis saat ada perubahan',
  'Average effort per workout': 'Rata-rata effort per sesi',
  'Back to weekly plan': 'Kembali ke rencana pekanan',
  'Backup exported': 'Cadangan diekspor',
  'Backup imported': 'Cadangan diimpor',
  'Best estimate from {0} on {1} — an estimate, not a tested max.':
    'Estimasi terbaik dari {0} pada {1} — estimasi, bukan maksimum yang benar-benar diuji.',
  'Best estimated 1RM:': 'Estimasi 1RM terbaik:',
  'Best set weight per workout': 'Beban set terbaik per sesi',
  'Best:': 'Terbaik:',
  'Body diagram': 'Diagram tubuh',
  'Body-weight exercises are always available, in every profile.':
    'Latihan berat badan selalu tersedia, di profil mana pun.',
  'Bodyweight': 'Berat badan',
  'Brings it up again the next time you train this exercise.':
    'Ditampilkan lagi waktu kamu melatih latihan ini berikutnya.',
  'Build a plan first': 'Susun rencananya dulu',
  'Build my own plan': 'Susun rencana sendiri',
  'Cardio': 'Kardio',
  'Cardio exercises log time + speed instead of weight × reps.':
    'Latihan kardio mencatat waktu + kecepatan, bukan beban × reps.',
  'Cardio logged': 'Kardio dicatat',
  'Choose a different workout': 'Pilih sesi lain',
  'Chosen': 'Dipilih',
  'Confirm the weight you worked with — your highest becomes the default next time.':
    'Konfirmasi beban yang kamu pakai — yang tertinggi jadi default berikutnya.',
  'Continue without account': 'Lanjut tanpa akun',
  'Continue workout': 'Lanjutkan sesi',
  'Could not change notification settings': 'Gagal mengubah pengaturan notifikasi',
  'Could not read that file': 'Berkas itu tidak bisa dibaca',
  'Could not sign out everywhere — you are still signed in.':
    'Gagal keluar dari semua perangkat — kamu masih masuk.',
  'Create exercise': 'Buat latihan',
  'Create one and start with this exercise': 'Buat satu dan mulai dengan latihan ini',
  'Create one or load the starter plan.': 'Buat satu, atau muat rencana awal.',
  'Create your own exercise': 'Buat latihan sendiri',
  'Delete everything': 'Hapus semuanya',
  'Delete exercise': 'Hapus latihan',
  'Delete profile?': 'Hapus profil?',
  'Delete routine': 'Hapus rutin',
  'Delete routine?': 'Hapus rutin?',
  'Delete workout': 'Hapus sesi',
  'Delete workout?': 'Hapus sesi?',
  'Delete “{0}”?': 'Hapus “{0}”?',
  'Deletes your plan, workouts and body weight on this device. This cannot be undone.':
    'Menghapus rencana, sesi, dan berat badanmu di perangkat ini. Tidak bisa dibatalkan.',
  'Demo data reset': 'Data demo direset',
  'Description (optional) — setup, cues, anything you want to remember':
    'Keterangan (opsional) — setelan alat, patokan gerakan, apa pun yang mau kamu ingat',
  'Details': 'Detail',
  'Discard': 'Buang',
  'Discard the running workout': 'Buang sesi yang sedang jalan',
  'Discard workout?': 'Buang sesi ini?',
  'Duration': 'Durasi',
  'Duration (min)': 'Durasi (menit)',
  'During a workout': 'Saat sesi berjalan',
  'Edit custom exercise': 'Ubah latihan buatan sendiri',
  'Edit or delete this exercise': 'Ubah atau hapus latihan ini',
  'Edit profile': 'Ubah profil',
  'Edit session note': 'Ubah catatan sesi',
  'Effort per set is switched off — turn it on in Settings to keep rating.':
    'Effort per set sedang mati — nyalakan di Pengaturan kalau mau terus merating.',
  'Ends this profile’s sessions on all your devices.':
    'Mengakhiri sesi profil ini di semua perangkatmu.',
  'Enter a valid weight': 'Isi beban yang valid',
  'Enter a weight and 1–{0} reps — beyond that an estimate is guesswork.':
    'Isi beban dan 1–{0} reps — lebih dari itu estimasinya jadi tebakan.',
  'Epley formula — a calculation from one set, not a tested max.':
    'Rumus Epley — hitungan dari satu set, bukan maksimum yang diuji.',
  'Equipment': 'Alat',
  'Estimate': 'Estimasi',
  'Estimated 1RM': 'Estimasi 1RM',
  'Estimated 1RM per workout': 'Estimasi 1RM per sesi',
  'Every exercise done — great work. Finish up, or keep going and add another exercise.':
    'Semua latihan beres — kerja bagus. Selesaikan, atau lanjut dan tambah latihan lagi.',
  'Every muscle group got at least one hard set in this period.':
    'Setiap kelompok otot dapat minimal satu set berat di periode ini.',
  'Every muscle group got some work in this period.':
    'Setiap kelompok otot dapat porsi kerja di periode ini.',
  'Every set becomes a drop-set: after the main set, {0} drop(s) with no rest, each about {1}% lighter.':
    'Setiap set jadi drop-set: setelah set utama, {0} drop tanpa istirahat, masing-masing sekitar {1}% lebih ringan.',
  'Every set becomes rest-pause: {0} reps to start, then {1} more split into short bursts, {2}s rest before each, roughly halving each time.':
    'Setiap set jadi rest-pause: {0} reps di awal, lalu {1} lagi dipecah jadi burst pendek, istirahat {2}s sebelum tiap burst, tiap kali kira-kira separuhnya.',
  'Example data, stored only in this browser — change anything you like.':
    'Data contoh, cuma tersimpan di browser ini — ubah apa pun sesukamu.',
  'Exercise': 'Latihan',
  'Exercise deleted': 'Latihan dihapus',
  'Exercise instructions aren\'t available in this language yet — they stay in English.':
    'Instruksi latihan belum tersedia di bahasa ini — jadi tetap Inggris.',
  'Exercise name': 'Nama latihan',
  'Exercise progress': 'Progres per latihan',
  'Exercise {0} / {1}': 'Latihan {0} / {1}',
  'Exercises': 'Latihan',
  'Exercises matched': 'Latihan yang cocok',
  'Expand': 'Perbesar',
  'Export backup (JSON)': 'Ekspor cadangan (JSON)',
  'Export plan file': 'Ekspor berkas rencana',
  'Fatigue': 'Kelelahan',
  'Fatigue shows how recently each muscle was trained. High means rest.':
    'Kelelahan menunjukkan seberapa baru tiap otot dilatih. Tinggi berarti istirahat.',
  'Fatigued': 'Lelah',
  'Filter by "{0}"': 'Saring "{0}"',
  'Filter by equipment': 'Saring berdasarkan alat',
  'Filters the exercise library and picker, and flags routine exercises that need something you don’t have in the active profile.':
    'Menyaring daftar dan pemilih latihan, serta menandai latihan di rutin yang butuh alat yang tidak ada di profil aktifmu.',
  'Finish': 'Selesaikan',
  'Finish anyway': 'Selesaikan saja',
  'Finish early?': 'Selesaikan lebih awal?',
  'Finish workout': 'Selesaikan sesi',
  'Finish workout early · {0} exercises': 'Selesaikan sesi lebih awal · {0} latihan',
  'Finish your current workout first': 'Selesaikan dulu sesi yang sedang jalan',
  'Finish your first workout to see progress curves here.':
    'Selesaikan sesi pertamamu untuk melihat kurva progres di sini.',
  'FitNotes, Strong, Hevy — or body weight from Apple Health':
    'FitNotes, Strong, Hevy — atau berat badan dari Apple Health',
  'Follow the routine ({0})': 'Ikuti rutinnya ({0})',
  'For dips or pull-ups with a belt. Progression then follows the weight.':
    'Untuk dip atau pull-up pakai belt. Progresinya lalu mengikuti bebannya.',
  'For lunges, single-arm rows and the like.': 'Untuk lunge, row satu tangan, dan sejenisnya.',
  'Freestyle workout (pick as you go)': 'Sesi freestyle (pilih sambil jalan)',
  'Freestyle workout — add your first exercise.': 'Sesi freestyle — tambahkan latihan pertamamu.',
  'Fri': 'Jum',
  'From your log:': 'Dari catatanmu:',
  'From {0}:': 'Dari {0}:',
  'General': 'Umum',
  'Give it a name': 'Beri nama',
  'Goal': 'Target',
  'Goal removed': 'Target dihapus',
  'Goal set: {0}': 'Target disetel: {0}',
  'Got a plan from a friend?': 'Dapat rencana dari teman?',
  'Guest data stays on this device — export a backup now and then!':
    'Data tamu tinggal di perangkat ini — sesekali ekspor cadangannya!',
  'Guest mode — data lives only in this browser.': 'Mode tamu — data cuma ada di browser ini.',
  'Hard': 'Berat',
  'Hi {0}': 'Hai {0}',
  'Hold logged': 'Tahanan dicatat',
  'How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.':
    'Seberapa berat satu set, dicatat di sebelah beban dan reps. Dua skala untuk penilaian yang sama, dihitung dari ujung yang berlawanan.',
  'How it felt': 'Terasa seberapa berat',
  'How it went, what to change — kept with today’s workout.':
    'Bagaimana jalannya, apa yang mau diubah — disimpan bersama sesi hari ini.',
  'How the session went as a whole.': 'Bagaimana sesinya secara keseluruhan.',
  'How to': 'Cara melakukannya',
  'Import a plan file': 'Impor berkas rencana',
  'Import backup': 'Impor cadangan',
  'Import backup?': 'Impor cadangan?',
  'Import failed: {0}': 'Impor gagal: {0}',
  'Import from another app': 'Impor dari app lain',
  'Import from {0}': 'Impor dari {0}',
  'Import history': 'Impor riwayat',
  'Import this plan': 'Impor rencana ini',
  'Import “{0}”': 'Impor “{0}”',
  'In Chrome: ⋮ menu → Add to Home screen': 'Di Chrome: menu ⋮ → Tambahkan ke layar utama',
  'In Safari: Share → Add to Home Screen': 'Di Safari: Bagikan → Tambahkan ke Layar Utama',
  'Intervals': 'Interval',
  'It will be removed from your routines. Already-logged workouts keep their sets.':
    'Latihan itu akan dihapus dari rutinmu. Sesi yang sudah dicatat tetap menyimpan setnya.',
  'Just close': 'Tutup saja',
  'Keep going — tap “+ Add exercise” below': 'Lanjut — ketuk “+ Tambah latihan” di bawah',
  'Keep screen awake': 'Biarkan layar menyala',
  'Last time': 'Terakhir',
  'Less': 'Kurang',
  'Less time': 'Kurangi waktu',
  'Live demo — everything stays in this browser.':
    'Demo langsung — semuanya tinggal di browser ini.',
  'Load starter plan (PPL)': 'Muat rencana awal (PPL)',
  'Load starter plan (Push / Pull / Legs)': 'Muat rencana awal (Push / Pull / Legs)',
  'Log': 'Catat',
  'Log body weight': 'Catat berat badan',
  'Longest hold per workout': 'Tahanan terlama per sesi',
  'Made with Halal Pro Gym': 'Dibuat dengan Halal Pro Gym',
  'Make superset with next': 'Jadikan superset dengan berikutnya',
  'Make superset with previous': 'Jadikan superset dengan sebelumnya',
  'Minimize': 'Perkecil',
  'Minutes': 'Menit',
  'Mon': 'Sen',
  'More': 'Lebih',
  'More time': 'Tambah waktu',
  'Most reps in a set per workout': 'Reps terbanyak dalam satu set per sesi',
  'Most working sets belong close to failure without living there — half at the floor and half at the top average out to a healthy-looking middle.':
    'Sebagian besar set kerja seharusnya dekat failure tanpa selalu di sana — separuh di dasar dan separuh di puncak menghasilkan rata-rata yang tampak sehat padahal bukan.',
  'Muscle balance': 'Keseimbangan otot',
  'Name it after where you train — e.g. "Home" or "Gym" — then check what you have there.':
    'Namai sesuai tempat kamu latihan — misalnya "Rumah" atau "Gym" — lalu centang alat yang ada di sana.',
  'Name it and pick a body part — it behaves like any other exercise, just without a demo photo.': 'Beri nama dan pilih bagian tubuhnya — dia berlaku seperti latihan lain, cuma tanpa foto demo.',
  'Needs {0} — not in your active profile': 'Butuh {0} — tidak ada di profil aktifmu',
  'New': 'Baru',
  'New PR:': 'PR baru:',
  'New equipment profile': 'Profil alat baru',
  'New routine': 'Rutin baru',
  'Next': 'Berikutnya',
  'Nice!': 'Mantap!',
  'No data yet': 'Belum ada data',
  'No entries yet — log your weight to start the curve. It\'s also asked before every workout.':
    'Belum ada catatan — catat beratmu untuk memulai kurvanya. Ini juga ditanyakan sebelum tiap sesi.',
  'No exercises with an estimated 1RM yet.': 'Belum ada latihan yang punya estimasi 1RM.',
  'No exercises yet — add your first one.': 'Belum ada latihan — tambahkan yang pertama.',
  'No exercises yet.': 'Belum ada latihan.',
  'No explicit muscle group': 'Tidak ada kelompok otot eksplisit',
  'No hard sets in this period': 'Tidak ada set berat di periode ini',
  'No match': 'Tidak ada yang cocok',
  'No rated sets in this period.': 'Tidak ada set yang dirating di periode ini.',
  'No routines yet.': 'Belum ada rutin.',
  'No weight to enter — just log the reps.':
    'Tidak ada beban yang perlu diisi — cukup catat reps-nya.',
  'No workouts in this period yet.': 'Belum ada sesi di periode ini.',
  'No workouts this month': 'Tidak ada sesi bulan ini',
  'No workouts yet.': 'Belum ada sesi latihan.',
  'None': 'Tidak ada',
  'Not in the library — added as your own exercises':
    'Tidak ada di daftar — ditambahkan sebagai latihan milikmu',
  'Not supported in this browser.': 'Tidak didukung di browser ini.',
  'Not trained in this period': 'Tidak dilatih di periode ini',
  'Note (optional) — loading cues, "bar only then +1 plate/side each set", anything worth remembering here':
    'Catatan (opsional) — patokan beban, "bar dulu lalu +1 plate per sisi tiap set", apa pun yang layak diingat di sini',
  'Note: switching units only changes the label — logged numbers are not converted.':
    'Catatan: mengganti satuan cuma mengubah labelnya — angka yang sudah dicatat tidak dikonversi.',
  'Nothing chosen yet — add exercises and they’ll show up here.':
    'Belum ada yang dipilih — tambahkan latihan dan mereka akan muncul di sini.',
  'Nothing logged yet': 'Belum ada yang dicatat',
  'Nothing new to import': 'Tidak ada yang baru untuk diimpor',
  'Nothing to import from that file': 'Tidak ada yang bisa diimpor dari berkas itu',
  'Notifications': 'Notifikasi',
  'Other routines': 'Rutin lain',
  'PRs': 'PR',
  'Pick a body part': 'Pilih bagian tubuh',
  'Pick a routine — sets, reps & weight come next.': 'Pilih rutin — set, reps, dan beban menyusul.',
  'Pick an icon': 'Pilih ikon',
  'Plan file saved — send it to a friend': 'Berkas rencana disimpan — kirim ke temanmu',
  'Planned': 'Direncanakan',
  'Press back again to exit': 'Tekan kembali sekali lagi untuk keluar',
  'Prev': 'Sebelumnya',
  'Previous best:': 'Terbaik sebelumnya:',
  'Primary muscle groups': 'Kelompok otot utama',
  'Print / Save as PDF': 'Cetak / Simpan sebagai PDF',
  'Profile name': 'Nama profil',
  'Progress & history': 'Progres & riwayat',
  'Progression': 'Progresi',
  'Puts the example plan, workouts and weigh-ins back the way they started.':
    'Mengembalikan rencana, sesi, dan penimbangan contoh ke keadaan awalnya.',
  'Quick check-in': 'Cek cepat',
  'RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.':
    'RIR menghitung reps yang kamu sisakan; RPE membaca effort yang sama dari skala 10 — jadi RPE ≈ 10 − RIR. Pilih yang sudah biasa kamu pakai.',
  'Ramp-up sets added before the work sets, so you do not have to add them by hand each session.':
    'Set pemanasan bertahap yang ditambahkan sebelum set kerja, jadi kamu tidak perlu menambahkannya sendiri tiap sesi.',
  'Ready': 'Siap',
  'Recent weigh-ins': 'Penimbangan terakhir',
  'Recent workouts': 'Sesi terakhir',
  'Recovering': 'Pulih',
  'Reload Halal Pro Gym': 'Muat ulang Halal Pro Gym',
  'Reminder time': 'Waktu pengingat',
  'Reminds you at this time on days that have a routine planned.':
    'Mengingatkanmu di jam ini pada hari yang ada rutinnya.',
  'Remove burst': 'Hapus burst',
  'Remove drop': 'Hapus drop',
  'Remove exercise': 'Hapus latihan',
  'Remove from routine': 'Hapus dari rutin',
  'Remove goal': 'Hapus target',
  'Remove set': 'Hapus set',
  'Replaces your current Sunday–Saturday assignments.':
    'Menggantikan penempatan Ahad–Sabtu yang sekarang.',
  'Reps climb by one whenever every set was clean. Set a ceiling to add sets instead of reps forever.':
    'Reps naik satu setiap kali semua set bersih. Setel batas atas supaya set yang ditambah, bukan reps terus-menerus.',
  'Reps climb to {0}, then a set is added and the reps start over. At {1} sets it asks you to add weight instead.':
    'Reps naik sampai {0}, lalu satu set ditambahkan dan reps-nya mulai lagi dari bawah. Di {1} set, dia minta kamu menambah beban.',
  'Reps from': 'Reps dari',
  'Reps per side': 'Reps per sisi',
  'Rescheduled': 'Dijadwalkan ulang',
  'Reset demo data': 'Reset data demo',
  'Reset demo data?': 'Reset data demo?',
  'Reset everything': 'Reset semuanya',
  'Reset everything?': 'Reset semuanya?',
  'Rest (s)': 'Istirahat (s)',
  'Rest / skip this day': 'Istirahat / lewati hari ini',
  'Rest over — next set!': 'Istirahat habis — set berikutnya!',
  'Rest timer': 'Timer istirahat',
  'Rest-pause always trains as one warm-up set at this rep count, then one rest-pause work set — "Sets" is not used.':
    'Rest-pause selalu dijalankan sebagai satu set warm-up di jumlah reps ini, lalu satu set kerja rest-pause — "Set" tidak dipakai.',
  'Rest-pause reps': 'Reps rest-pause',
  'Rest-pause rest': 'Istirahat rest-pause',
  'Resume': 'Lanjutkan',
  'Routine': 'Rutin',
  'Routines': 'Rutin',
  'Rule': 'Aturan',
  'Save & next exercise': 'Simpan & latihan berikutnya',
  'Save & start workout': 'Simpan & mulai sesi',
  'Save goal': 'Simpan target',
  'Save weight': 'Simpan beban',
  'Saved': 'Tersimpan',
  'Saves a dated copy to the Documents folder after finishing a workout or editing a routine — point a sync app at it, or copy it out by hand.':
    'Menyimpan salinan bertanggal ke folder Documents setelah sesi selesai atau rutin diubah — arahkan app sinkron ke situ, atau salin sendiri.',
  'Search {0} exercises…': 'Cari di {0} latihan…',
  'Search…': 'Cari…',
  'Seat height, pin position, a form cue — shown every session.':
    'Tinggi kursi, posisi pin, patokan gerakan — ditampilkan tiap sesi.',
  'Seconds': 'Detik',
  'Send your routines to a friend, or put your week on paper.':
    'Kirim rutinmu ke teman, atau cetak pekanmu di kertas.',
  'Session note': 'Catatan sesi',
  'Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.':
    'Susun rutin pekananmu untuk mulai — atau muat rencana Push / Pull / Legs yang sudah jadi.',
  'Share your plan': 'Bagikan rencanamu',
  'Shared routine': 'Rutin yang dibagikan',
  'Show all equipment': 'Tampilkan semua alat',
  'Show more': 'Tampilkan lagi',
  'Show this next time': 'Tampilkan ini lagi nanti',
  'Showing all equipment': 'Menampilkan semua alat',
  'Showing what you have in "{0}"': 'Menampilkan yang kamu punya di "{0}"',
  'Sick, missed a day or want a different session? Pick what to train instead.':
    'Sakit, bolong sehari, atau mau sesi lain? Pilih mau melatih apa sebagai gantinya.',
  'Sign out': 'Keluar',
  'Sign out everywhere': 'Keluar dari semua perangkat',
  'Sign out everywhere?': 'Keluar dari semua perangkat?',
  'Sign out?': 'Keluar?',
  'Sign-in failed': 'Gagal masuk',
  'Signed out on all devices': 'Keluar dari semua perangkat',
  'Signs this profile out on every device, including this one. You can sign in again anytime.':
    'Mengakhiri sesi profil ini di setiap perangkat, termasuk yang ini. Kamu bisa masuk lagi kapan pun.',
  'Slide or tap to set your weight — tracked before every workout so your curve stays honest.':
    'Geser atau ketuk untuk menyetel berat badanmu — dicatat sebelum tiap sesi supaya kurvanya jujur.',
  'Something went wrong': 'Ada yang tidak beres',
  'Sounds': 'Suara',
  'Speed (km/h)': 'Kecepatan (km/jam)',
  'Start': 'Mulai',
  'Start set': 'Mulai set',
  'Start the demo': 'Mulai demonya',
  'Start without weighing in': 'Mulai tanpa menimbang badan',
  'Start {0}': 'Mulai {0}',
  'Starter plan loaded — Mon Push · Wed Pull · Fri Legs':
    'Rencana awal dimuat — Senin Push · Rabu Pull · Jumat Legs',
  'Step (seconds)': 'Langkah (detik)',
  'Step ({0})': 'Langkah ({0})',
  'Strength': 'Kekuatan',
  'Strength shows retained muscle strength. Train again to reset it.':
    'Kekuatan menunjukkan kekuatan otot yang masih tersimpan. Latih lagi untuk meresetnya.',
  'Superset with exercise above': 'Superset dengan latihan di atas',
  'Superset · do these back-to-back, rest when done':
    'Superset · kerjakan berurutan tanpa jeda, istirahat setelah beres',
  'System': 'Sistem',
  'Tap a muscle to see its exercises.': 'Ketuk satu otot untuk melihat latihannya.',
  'Tap a trained day for details · tap any other day to plan a session':
    'Ketuk hari yang sudah dilatih untuk detailnya · ketuk hari lain untuk merencanakan sesi',
  'Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.':
    'Ketuk tombol tautan di sebuah latihan untuk men-superset-nya dengan latihan di atasnya — keduanya dikerjakan berurutan tanpa jeda.',
  'Target weight': 'Beban target',
  'That file is empty': 'Berkas itu kosong',
  'That file\'s columns aren\'t recognised — see the docs for supported apps.':
    'Kolom di berkas itu tidak dikenali — lihat dokumentasinya untuk app yang didukung.',
  'That\'s the whole workout!': 'Itu seluruh sesinya!',
  'The file does not say which unit it uses — numbers are imported as they are.':
    'Berkasnya tidak menyebut satuan yang dipakai — angkanya diimpor apa adanya.',
  'The file is in {0} and your profile is in {1} — weights will be converted.':
    'Berkasnya dalam {0} dan profilmu dalam {1} — bebannya akan dikonversi.',
  'The file mixes kg and lb — each set is converted to {0}.':
    'Berkasnya mencampur kg dan lb — tiap set dikonversi ke {0}.',
  'The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.':
    'Baris yang disorot adalah tempat sebagian besar set kerja jatuh. Set yang sudah kamu catat tetap memakai skalanya sendiri, dan tidak ada bagian lain yang membaca nilai ini — progresi dan estimasi 1RM tidak terpengaruh.',
  'The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.':
    'Layar tetap menyala selama sesi berjalan, jadi kamu tidak perlu membuka kunci HP di antara set.',
  'The sets you logged in this session will be lost.':
    'Set yang kamu catat di sesi ini akan hilang.',
  'Then finish the superset partner.': 'Lalu selesaikan pasangan superset-nya.',
  'These are added as new routines — nothing you already have is changed.':
    'Ini ditambahkan sebagai rutin baru — yang sudah kamu punya tidak diubah.',
  'This month': 'Bulan ini',
  'This removes it from your history for good.': 'Ini menghapusnya dari riwayatmu untuk selamanya.',
  'This replaces all current data with the backup file.':
    'Ini menggantikan seluruh data sekarang dengan berkas cadangan.',
  'This screen could not be drawn. Your data is safe on this device.':
    'Layar ini gagal digambar. Datamu aman di perangkat ini.',
  'This session': 'Sesi ini',
  'This week': 'Pekan ini',
  'Time': 'Waktu',
  'Today\'s plan': 'Rencana hari ini',
  'Top of the range': 'Ujung atas rentang',
  'Top set': 'Set terberat',
  'Top speed per workout': 'Kecepatan tertinggi per sesi',
  'Tracked — next time starts at {0}': 'Tercatat — berikutnya mulai dari {0}',
  'Trained': 'Dilatih',
  'Unknown exercise': 'Latihan tak dikenal',
  'Unpair': 'Lepas sambungan',
  'Use this weekly schedule': 'Pakai jadwal pekanan ini',
  'Warm-up sets': 'Set warm-up',
  'Wed': 'Rab',
  'Week': 'Pekan',
  'Week by week': 'Pekan demi pekan',
  'Week schedule': 'Jadwal pekan',
  'Week streak': 'Rentetan pekan',
  'Weekly Training Plan': 'Rencana Latihan Pekanan',
  'Weekly plan:': 'Rencana pekanan:',
  'Weeks since training: {0}': 'Pekan sejak terakhir dilatih: {0}',
  'Weigh-ins': 'Penimbangan',
  'Weight ({0})': 'Beban ({0})',
  'Weight 30d': 'Berat 30h',
  'Weight drop (%)': 'Penurunan beban (%)',
  'Weight saved': 'Beban tersimpan',
  'Weight unit': 'Satuan beban',
  'Welcome!': 'Selamat datang!',
  'What are RIR and RPE?': 'Apa itu RIR dan RPE?',
  'What this session hits': 'Yang dikerjakan sesi ini',
  'What you just trained': 'Yang baru saja kamu latih',
  'Where the sets land': 'Di mana set-setnya jatuh',
  'Workout complete!': 'Sesi selesai!',
  'Workout day': 'Hari latihan',
  'Workout day reminder': 'Pengingat hari latihan',
  'Workout deleted': 'Sesi dihapus',
  'Workout done': 'Sesi beres',
  'Workouts': 'Sesi',
  'You haven’t checked off any sets. Finish the workout anyway?':
    'Kamu belum menandai satu set pun. Selesaikan sesinya saja?',
  'You still log the total: {0} is {1} per side.':
    'Yang dicatat tetap totalnya: {0} berarti {1} per sisi.',
  'Your data is synced to your profile first, then cleared from this device.':
    'Datamu disinkronkan ke profilmu dulu, lalu dihapus dari perangkat ini.',
  'Your data syncs with your profile — sign in anywhere to see it.':
    'Datamu tersinkron dengan profilmu — masuk dari mana saja untuk melihatnya.',
  'Your goal is drawn as a line through the weight charts, and gains/losses are colored by whether they move toward it.':
    'Targetmu digambar sebagai garis di grafik berat badan, dan naik/turunnya diberi warna sesuai apakah bergerak ke arah target itu.',
  'Your weekly routine': 'Rutin pekananmu',
  'Your workouts. Your weights. Your profile.': 'Sesimu. Bebanmu. Profilmu.',
  'You’re in the demo': 'Kamu sedang di demo',
  'already in': 'sudah ada',
  'at {0} {1} or harder': 'di {0} {1} atau lebih berat',
  'average effort': 'rata-rata effort',
  'by hard sets': 'menurut set berat',
  'by sets worked': 'menurut set yang dikerjakan',
  'by time trained': 'menurut lama dilatih',
  'changed for this day': 'diubah untuk hari ini',
  'floor': 'dasar',
  'free & open source (AGPL v3)': 'gratis & sumber terbuka (AGPL v3)',
  'full': 'penuh',
  'how close to failure': 'seberapa dekat ke gagal angkat',
  'instructions in English': 'instruksi dalam bahasa Inggris',
  'last': 'terakhir',
  'name + body part, no demo photo': 'nama + bagian tubuh, tanpa foto demo',
  'new record!': 'rekor baru!',
  'no hard sets': 'tidak ada set berat',
  'no sets': 'tidak ada set',
  'not trained': 'tidak dilatih',
  'primary': 'utama',
  'reached!': 'tercapai!',
  'rescheduled': 'dijadwalkan ulang',
  'rest day, but no one’s stopping you': 'hari istirahat, tapi tidak ada yang melarangmu',
  'routine': 'rutin',
  'secondary': 'sekunder',
  'synced with your profile': 'tersinkron dengan profilmu',
  'this isn’t a Halal Pro Gym plan file': 'ini bukan berkas rencana Halal Pro Gym',
  'this week': 'pekan ini',
  'to install Halal Pro Gym as a full-screen app.':
    'untuk memasang Halal Pro Gym sebagai app layar penuh.',
  'today is {0}': 'hari ini {0}',
  '{0} days already have data here and will be left alone.':
    '{0} hari sudah punya data di sini dan tidak akan disentuh.',
  '{0} done': '{0} beres',
  '{0} equipment types': '{0} jenis alat',
  '{0} equipment type': '{0} jenis alat',
  '{0} exercises · {1} with demos':
    '{0} latihan · {1} berdemo',
  '{0} is on the plan today — let’s go!': '{0} ada di rencana hari ini — gas!',
  '{0} of {1} exercises need equipment outside "{2}"':
    '{0} dari {1} latihan butuh alat di luar "{2}"',
  '{0} of {1} finished sets rated': '{0} dari {1} set yang beres sudah dirating',
  '{0} per side': '{0} per sisi',
  '{0} planned for {1}': '{0} direncanakan untuk {1}',
  '{0} set to rest': '{0} disetel jadi hari istirahat',
  '{0} sets': '{0} set',
  '{0} sets · {1} work': '{0} set · {1} kerja',
  '{0} set · {1} work': '{0} set · {1} kerja',
  '{0} to go': 'sisa {0}',
  '{0} week streak': 'rentetan {0} pekan',
  '{0} weigh-ins imported': '{0} penimbangan diimpor',
  '{0} workouts': '{0} sesi',
  '{0} workouts imported': '{0} sesi diimpor',
  '{0} × {1} on {2}': '{0} × {1} pada {2}',
  '{0} — done': '{0} — beres',
  '{0} — in progress': '{0} — sedang jalan',
  '{0}/side': '{0}/sisi',
  '{0}’s plan': 'rencana {0}',
  '“{0}” added to {1}': '“{0}” ditambahkan ke {1}',
  '“{0}” already exists': '“{0}” sudah ada',
  '“{0}” and its exercises will be removed.': '“{0}” beserta latihannya akan dihapus.',
  '“{0}” created': '“{0}” dibuat',

  /* ================= Fase 4b: kunci lewat t(variabel) - bulan, bagian tubuh, otot, alat, progresi ================= */
  'Add time': 'Tambah waktu',
  'Adductors': 'Adduktor',
  'Aug': 'Agu',
  'Biceps': 'Bisep',
  'Bodyweight — every rep last time, so go for {0} this time.':
    'Berat badan — semua reps kena terakhir, jadi incar {0} kali ini.',
  'Bodyweight — same target again until every set is clean.':
    'Berat badan — target yang sama lagi sampai semua set bersih.',
  'Dec': 'Des',
  'Double progression': 'Progresi ganda',
  'Easy — warm-up territory': 'Ringan — wilayah warm-up',
  'Every rep last time — {0} {1} more.': 'Semua reps kena terakhir — tambah {0} {1}.',
  'Glutes': 'Gluteus',
  'Held every set for the full time — target up by {0}s.':
    'Semua set tertahan penuh — target naik {0}s.',
  'Hit every rep in every set and the weight goes up. Repeated misses trigger a deload.':
    'Dapat semua reps di semua set, bebannya naik. Gagal berulang memicu deload.',
  'Hold every set for the full duration and the target goes up.':
    'Tahan semua set sepanjang durasinya dan targetnya naik.',
  'Last set hit {0} reps — twice the target, so take a double jump of {1} {2}.':
    'Set terakhir dapat {0} reps — dua kali targetnya, jadi lompat dobel {1} {2}.',
  'Last time came up short — same target again.': 'Terakhir belum sampai — target yang sama lagi.',
  'Linear progression': 'Progresi linear',
  'Missed reps last time — same weight again ({0} of {1} to go).':
    'Reps gagal terakhir — beban yang sama lagi (sisa {0} dari {1}).',
  'Missed reps {0} sessions running — reset to {1} {2} and work back up.':
    'Reps gagal {0} sesi berturut-turut — reset ke {1} {2} dan naik lagi dari situ.',
  'Missed reps — reset to {0} {1} and work back up.':
    'Reps gagal — reset ke {0} {1} dan naik lagi dari situ.',
  'No automatic progression': 'Tanpa progresi otomatis',
  'Nothing left — went to failure': 'Tidak ada sisa — sampai gagal angkat',
  'Nothing logged yet — this session sets the baseline.':
    'Belum ada catatan — sesi ini yang jadi patokan awal.',
  'Oct': 'Okt',
  'One more rep in the tank': 'Sisa satu reps lagi',
  'Quads': 'Kuadrisep',
  'Recovery': 'Pemulihan',
  'Same weight — aim for {0} reps this time.': 'Beban sama — incar {0} reps kali ini.',
  'Serratus': 'Seratus',
  'Short {0} sessions in a row — back off to {1}s and build up again.':
    'Kurang dari target {0} sesi berturut-turut — turun ke {1}s dan bangun lagi dari situ.',
  'Stalled {0} sessions — deload to {1} {2}.': 'Mandek {0} sesi — deload ke {1} {2}.',
  'Targets stay where you set them.': 'Target tetap di angka yang kamu setel.',
  'Three more reps': 'Sisa tiga reps',
  'Top of the rep range in every set — {0} {1} more, back to {2} reps.':
    'Ujung atas rentang reps di semua set — tambah {0} {1}, reps balik ke {2}.',
  'Triceps': 'Trisep',
  'Two more reps': 'Sisa dua reps',
  'Two straight sets plus a final set taken to failure. Beat the target on that set and the weight goes up — double if you double the reps. One failure resets 10 %.':
    'Dua set lurus plus satu set terakhir sampai gagal angkat. Lewati target di set itu dan bebannya naik — dua kali lipat kalau repsnya kamu dobel. Sekali gagal, turun 10 %.',
  'Work up through a rep range at the same weight. Reach the top of the range in every set and the weight goes up, reps back to the bottom.':
    'Naik lewat rentang reps di beban yang sama. Capai ujung atas rentangnya di semua set dan bebannya naik, repsnya kembali ke bawah.',
  'abdominals': 'otot perut',
  'abductors': 'abduktor',
  'abs': 'perut',
  'adductors': 'adduktor',
  'ankle stabilizers': 'penstabil pergelangan kaki',
  'ankles': 'pergelangan kaki',
  'assisted': 'dibantu',
  'back': 'punggung',
  'biceps': 'bisep',
  'body weight': 'berat badan',
  'bosu ball': 'bola bosu',
  'brachialis': 'brakialis',
  'calves': 'betis',
  'cardio': 'kardio',
  'cardiovascular system': 'sistem kardiovaskular',
  'chest': 'dada', 'full body': 'seluruh tubuh',
  'custom': 'kustom',
  'deltoids': 'deltoid',
  'delts': 'deltoid',
  'elliptical machine': 'mesin eliptik',
  'feet': 'kaki',
  'forearms': 'lengan bawah',
  'glutes': 'gluteus',
  'grip muscles': 'otot cengkeraman',
  'groin': 'selangkangan',
  'hands': 'tangan',
  'hip flexors': 'fleksor panggul',
  'inner thighs': 'paha dalam',
  'levator scapulae': 'levator skapula',
  'leverage machine': 'mesin leverage',
  'lower abs': 'perut bawah',
  'lower arms': 'lengan bawah',
  'lower back': 'punggung bawah',
  'lower legs': 'tungkai bawah',
  'medicine ball': 'bola medis',
  'neck': 'leher',
  'obliques': 'oblik',
  'pectorals': 'pektoral',
  'quadriceps': 'kuadrisep',
  'quads': 'kuadrisep',
  'rear deltoids': 'deltoid belakang',
  'resistance band': 'karet resistensi',
  'rhomboids': 'romboid',
  'rope': 'tali',
  'scheduled on {0} day': 'dijadwalkan {0} hari',
  'scheduled on {0} days': 'dijadwalkan {0} hari',
  'serratus anterior': 'seratus anterior',
  'shins': 'tulang kering',
  'shoulders': 'bahu',
  'skierg machine': 'mesin skierg',
  'sled machine': 'mesin sled',
  'spine': 'tulang belakang',
  'stability ball': 'bola keseimbangan',
  'stationary bike': 'sepeda statis',
  'stepmill machine': 'mesin stepmill',
  'sternocleidomastoid': 'sternokleidomastoid',
  'tire': 'ban',
  'trapezius': 'trapesius',
  'traps': 'trapesius',
  'triceps': 'trisep',
  'upper arms': 'lengan atas',
  'upper back': 'punggung atas',
  'upper body ergometer': 'ergometer tubuh atas',
  'upper chest': 'dada atas',
  'upper legs': 'tungkai atas',
  'waist': 'perut',
  'weighted': 'diberi beban',
  'wheel roller': 'roda roller',
  'wrist extensors': 'ekstensor pergelangan tangan',
  'wrist flexors': 'fleksor pergelangan tangan',
  'wrists': 'pergelangan tangan',
  '{0} exercise': '{0} latihan',
  '{0} exercise in the file isn’t in your library and was left out.':
    '{0} latihan di berkas itu tidak ada di daftarmu dan dilewatkan.',
  '{0} exercises': '{0} latihan',
  '{0} exercises in the file aren’t in your library and were left out.':
    '{0} latihan di berkas itu tidak ada di daftarmu dan dilewatkan.',
  '{0} reps in every set — add a set and go back to {1}.':
    '{0} reps di semua set — tambah satu set dan kembali ke {1}.',
  '{0} routine': '{0} rutin',
  '{0} routines': '{0} rutin',
  '{0} set still unchecked. Finish the workout now?':
    '{0} set belum ditandai. Selesaikan sesinya sekarang?',
  '{0} sets bring an {1} with them — switch on Effort per set in Settings to see it.':
    'Set {0} membawa {1} — nyalakan Effort per set di Pengaturan untuk melihatnya.',
  '{0} sets bring an {1} with them.': 'Set {0} membawa {1}.',
  '{0} sets of {1} — time to add weight or move to a harder variation.':
    '{0} set berisi {1} — waktunya menambah beban atau pindah ke variasi yang lebih berat.',
  '{0} sets still unchecked. Finish the workout now?':
    '{0} set belum ditandai. Selesaikan sesinya sekarang?',
  '{0} to gain': 'tambah {0}',
  '{0} to lose': 'turun {0}',
  '{0} workout': '{0} sesi',
  '{0} workout total': 'total {0} sesi',
  '{0} workouts total': 'total {0} sesi',

  /* --- auth Supabase + notifikasi (2026-08-28) --- */
  'A sign-in link is on its way to {0}. Open it on this device — the link signs you in here.':
    'Tautan masuk sedang dikirim ke {0}. Buka di perangkat ini — tautannya yang memasukkanmu di sini.',
  'All data stays on this device': 'Semua data tinggal di perangkat ini',
  'Blocked in your browser settings.': 'Diblokir di pengaturan browser-mu.',
  'Check your email': 'Cek emailmu',
  'Continue with Google': 'Lanjut dengan Google',
  'Could not send the link': 'Gagal mengirim tautan',
  'Deletes your plan, workouts and body weight — on this device and in your account. This cannot be undone.':
    'Menghapus rencana, sesi, dan berat badanmu — di perangkat ini dan di akunmu. Tidak bisa dibatalkan.',
  'Enter a valid email address': 'Isi alamat email yang valid',
  'No account sync is set up in this build — everything stays on this device.':
    'Sinkronisasi akun tidak disetel di build ini — semuanya tinggal di perangkat ini.',
  'No password. We send a link — opening it signs you in.':
    'Tanpa password. Kami kirim tautan — membukanya memasukkanmu.',
  'Off — a beep still plays while the app is open.':
    'Mati — bunyi bip tetap ada selama app terbuka.',
  'On — shown when a rest finishes.': 'Nyala — ditampilkan waktu istirahat habis.',
  'Rest timer alert': 'Alarm timer istirahat',
  'Send the link': 'Kirim tautannya',
  'Sending…': 'Mengirim…',
  'Sign in with email': 'Masuk dengan email',
  'Signing in only syncs your data — your workouts stay yours.':
    'Masuk cuma menyinkronkan datamu — sesimu tetap milikmu.',
  'Source code': 'Kode sumber',
  'Syncs your plan and history across your devices.':
    'Menyinkronkan rencana dan riwayatmu antar-perangkat.',
  'This demo runs entirely in your browser on example data — nothing is sent anywhere.':
    'Demo ini jalan sepenuhnya di browser-mu dengan data contoh — tidak ada yang dikirim ke mana pun.',
  'Workout-day reminders come from the Android app for now.':
    'Pengingat hari latihan untuk sekarang datang dari app Android.',

  /* --- mode Ramadan & puasa sunah (2026-08-28) --- */
  'Every day: hold the weight, trim the volume.': 'Setiap hari: beban ditahan, volume dipangkas.',
  'Fasting': 'Puasa',
  'Fasting lowers performance, and the progression engine reads that as failure. These switches stop it from deloading you for a month.':
    'Puasa menurunkan performa, dan mesin progresi membacanya sebagai kegagalan. Sakelar ini yang menahannya supaya tidak men-deload kamu sebulan penuh.',
  'Fasting today': 'Puasa hari ini',
  'On a fasting day the weight holds — no increase, no deload — and work sets are trimmed. Warm-ups are left alone.':
    'Di hari puasa beban ditahan — tidak naik, tidak turun — dan set kerja dipangkas. Warm-up tidak disentuh.',
  'Ramadan mode': 'Mode Ramadan',
  'Ramadan mode — the weight holds. Fasting is not a reason to deload.':
    'Mode Ramadan — beban ditahan. Puasa bukan alasan untuk deload.',
  'Same treatment, only on those two days — and a way to test all this before Ramadan.':
    'Perlakuan sama, hanya di dua hari itu — sekaligus cara menguji semua ini sebelum Ramadan.',
  'Sunnah fasting (Mon & Thu)': 'Puasa sunah (Senin & Kamis)',
  'Work sets kept': 'Set kerja dipertahankan',
  '{0} to {1} in {2}': '{0} sampai {1} di {2}',

  /* --- jeda salat (2026-08-28) --- */
  'Dismiss': 'Tutup',
  'Pause for prayer': 'Jeda saat waktu salat',
  'Until {0}. Your sets are saved — pick up where you left off.':
    'Sampai {0}. Set-setmu tersimpan — lanjut dari tempat kamu berhenti.',
  'When a prayer time arrives mid-session, the rest timer stops and the app says so.':
    'Waktu salat masuk di tengah sesi: timer istirahat dihentikan, dan app mengatakannya.',
  '{0} — session paused': '{0} — sesi dijeda',

  /* --- tanggal Hijriah (2026-08-28) --- */
  'Hijri date offset': 'Geseran tanggal Hijriah',
  'Today: {0}': 'Hari ini: {0}',

  /* --- catatan makan (2026-08-28) --- */
  'Add a food': 'Tambah makanan',
  'After iftar': 'Setelah berbuka',
  'Calories (kcal)': 'Kalori (kkal)',
  'Carbs': 'Karbo',
  'Carbs (g)': 'Karbo (g)',
  'Daily target': 'Target harian',
  'Delete food': 'Hapus makanan',
  'Delete food?': 'Hapus makanan?',
  'Edit food': 'Ubah makanan',
  'Enter a valid amount': 'Isi jumlah yang valid',
  'Enter a valid calorie number': 'Isi angka kalori yang valid',
  'Fasting day': 'Hari puasa',
  'Fat': 'Lemak',
  'Fat (g)': 'Lemak (g)',
  'Food': 'Makanan',
  'How many grams?': 'Berapa gram?',
  'How many {0}?': 'Berapa {0}?',
  'Leave a field empty to track it without a target.':
    'Kosongkan salah satu kalau mau mencatatnya tanpa target.',
  'Log food': 'Catat makanan',
  'Log it': 'Catat',
  'Logged today': 'Tercatat hari ini',
  'Name': 'Nama',
  'No foods yet. Add the things you eat often — you only enter them once.':
    'Belum ada makanan. Tambahkan yang sering kamu makan — cukup sekali diisi.',
  'Nothing logged today.': 'Belum ada yang dicatat hari ini.',
  'Other meals': 'Makan lain',
  'Past entries stay in your log, but they will no longer count toward totals.':
    'Entri yang sudah tercatat tetap ada di riwayat, tapi tidak lagi dihitung ke total.',
  'Serving, e.g. 1 plate': 'Porsi, misal 1 piring',
  'Suhoor': 'Sahur',
  'Today\'s intake': 'Asupan hari ini',
  'Unknown food': 'Makanan tak dikenal',
  'Your foods': 'Makananmu',
  'kcal': 'kkal',
  'over': 'lewat',
  'per serving': 'per porsi',
  'serving': 'porsi',
  'servings': 'porsi',
  '{0} kcal today': '{0} kkal hari ini',
  '{0} left today': 'sisa {0} hari ini',
  '{0} of {1} kcal': '{0} dari {1} kkal',
  '{0} over your target': '{0} lewat dari targetmu',
  // --- perkiraan gizi AI (kunci milik pengguna) ---
  'A free key from Google AI Studio is enough for everyday use.': 'Kunci gratis dari Google AI Studio sudah cukup untuk pemakaian harian.',
  'AI estimates': 'Perkiraan AI',
  'Add your own API key in Settings first.': 'Pasang dulu API key milikmu sendiri di Pengaturan.',
  'Check before saving': 'Periksa sebelum disimpan',
  'Describe it again': 'Tulis ulang deskripsinya',
  'Describe it the way you would say it out loud, including how much.': 'Tulis seperti kamu mengucapkannya, termasuk berapa banyaknya.',
  'Describe what you ate first.': 'Tulis dulu apa yang kamu makan.',
  'Editing on — your numbers win.': 'Bisa diubah — angkamu yang dipakai.',
  'Endpoint (optional) — default api.openai.com': 'Endpoint (opsional) — bawaan api.openai.com',
  'Estimate with AI': 'Perkirakan dengan AI',
  'Estimating…': 'Memperkirakan…',
  'Get a free key': 'Ambil kunci gratis',
  'Grams per serving': 'Gram per porsi',
  'If you log this': 'Kalau ini dicatat',
  'Locked. Turn the switch on to correct anything.': 'Terkunci. Nyalakan sakelarnya kalau ada yang perlu dibetulkan.',
  'Logged': 'Tercatat',
  'Model (optional) — default {0}': 'Model (opsional) — bawaan {0}',
  'No connection. You can still add the food by hand.': 'Tidak ada koneksi. Makanannya masih bisa ditambahkan manual.',
  'No serving weight was given, so 100 g is assumed.': 'Berat porsinya tidak diberikan, jadi dianggap 100 g.',
  'Not set up': 'Belum disiapkan',
  'Nutrition estimates': 'Perkiraan gizi',
  'Nutrition per serving': 'Gizi per porsi',
  'Optional. With your own API key, the app can estimate calories and macros from a description like "nasi uduk satu porsi" — which is exactly what no free, commercially usable Indonesian food database gives us.': 'Opsional. Dengan API key milikmu sendiri, app bisa memperkirakan kalori dan makro dari deskripsi seperti "nasi uduk satu porsi" — dan justru itu yang tidak diberikan satu pun database makanan Indonesia yang gratis dan boleh dipakai komersial.',
  'Paste your API key first.': 'Tempel dulu API key-nya.',
  'Requests go straight from this device to {0} with your key. Your quota, your bill — and we never see either.': 'Request pergi langsung dari perangkat ini ke {0} dengan kuncimu. Kuotamu, tagihanmu — dan kami tidak pernah melihat keduanya.',
  'Save and log it': 'Simpan dan catat',
  'Save to my foods only': 'Simpan saja ke daftar makananku',
  'Saved to your foods': 'Tersimpan ke daftar makananmu',
  'Sent to your own provider with your own key. We never see it.': 'Dikirim ke provider milikmu dengan kuncimu sendiri. Kami tidak pernah melihatnya.',
  'Set it up in Settings': 'Siapkan di Pengaturan',
  'Some numbers were out of physical range and were capped.': 'Ada angka di luar batas yang mungkin secara fisik, jadi dijepit.',
  'That did not work. You can still add the food by hand.': 'Tidak berhasil. Makanannya masih bisa ditambahkan manual.',
  'The answer could not be read. Try describing the food differently.': 'Jawabannya tidak bisa dibaca. Coba tulis deskripsinya dengan cara lain.',
  'The calories and the macros disagree — check them before saving.': 'Kalori dan makronya tidak cocok — periksa dulu sebelum disimpan.',
  'The key is stored on this device only, unencrypted, and is never synced or sent to us. Anyone with access to this browser profile can read it.': 'Kuncinya disimpan hanya di perangkat ini, tanpa enkripsi, dan tidak pernah disinkronkan atau dikirim ke kami. Siapa pun yang bisa membuka profil browser ini bisa membacanya.',
  'The provider rejected that API key. Check it in Settings.': 'Provider menolak API key itu. Periksa di Pengaturan.',
  'The provider took too long. Try again, or enter the numbers by hand.': 'Provider terlalu lama menjawab. Coba lagi, atau masukkan angkanya manual.',
  'These numbers are an estimate, not a measurement.': 'Angka ini perkiraan, bukan hasil pengukuran.',
  'This browser will not let the app store anything.': 'Browser ini tidak mengizinkan app menyimpan apa pun.',
  'This uses your own API key, so the request goes straight from this device to the provider — never through us. A free key from Google AI Studio is enough.': 'Ini memakai API key milikmu sendiri, jadi request pergi langsung dari perangkat ini ke provider — tidak lewat kami. Kunci gratis dari Google AI Studio sudah cukup.',
  'What did you eat?': 'Kamu makan apa?',
  'Your provider says you are out of quota for now.': 'Provider bilang kuotamu sedang habis.',
  // --- jendela latihan di hari puasa ---
  'Good time to train': 'Waktu bagus untuk latihan',
  'before iftar': 'sebelum berbuka',
  'after Tarawih': 'setelah Tarawih',
  // --- hitungan mundur waktu salat ---
  '{0} hr {1} min': '{0} jam {1} mnt',
  '{0} min': '{0} mnt',

  // --- katalog makanan bawaan (Open Food Facts + USDA) ---
  '{0} min @ {1} km/h': '{0} mnt @ {1} km/jam',
  'Food database': 'Database makanan',
  'Database': 'Database',
  'Search a product or ingredient': 'Cari produk atau bahan',
  'Nothing matches that': 'Tidak ada yang cocok',
  'Ingredient': 'Bahan',
  'Already in your foods': 'Sudah ada di daftarmu',
  'Data: Open Food Facts (ODbL 1.0) and USDA FoodData Central (public domain).': 'Data: Open Food Facts (ODbL 1.0) dan USDA FoodData Central (domain publik).',
  'Search the built-in database for packaged products and staples, let AI estimate a cooked dish, or enter the numbers yourself from the label.': 'Cari produk kemasan dan bahan pokok di database bawaan, minta AI memperkirakan masakan matang, atau isi sendiri angkanya dari label.',

  // --- satuan porsi katalog makanan ---
  'per 100 {0}': 'per 100 {0}',
  'How many ml?': 'Berapa ml?',
  'Pack': 'Kemasan',
  'Search {0} packaged products and {1} Indonesian staples.':
    'Cari {0} produk kemasan dan {1} bahan pokok Indonesia.',
}
