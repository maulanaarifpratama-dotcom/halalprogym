/**
 * Bentuk data tersimpan — satu rumah, satu arah.
 *
 * Berkas ini TIDAK mengimpor apa pun dan tidak punya perilaku, jadi modul mana pun boleh
 * mengimpornya tanpa risiko siklus. Semua field opsional dengan sengaja: sumbernya
 * localStorage dan rekaman yang ditulis versi app yang lebih lama, jadi bentuknya memang
 * tidak dijamin. Pembacanya yang bertanggung jawab defensif, bukan tipenya yang berbohong.
 *
 * Fase 2 akan memetakan bentuk-bentuk ini ke tabel Supabase, jadi di sinilah skema itu
 * mulai hidup — bukan di file SQL terpisah yang langsung melenceng.
 */

/**
 * Nilai per slug otot. Fungsi yang mengembalikannya selalu memuat SETIAP otot yang bisa
 * digambar, jadi pemanggil tidak perlu menjaga slug yang hilang.
 */
export type MuscleMap = Record<string, number>

/**
 * Sumber metadata otot: bisa latihan katalog, entri riwayat, atau snapshot yang tertinggal
 * di riwayat setelah latihan buatan user dihapus. Sengaja bertipe rekaman terbuka, karena
 * itulah kenyataannya — muscles.ts membaca belasan nama kunci alternatif (`primaries` /
 * `primaryMuscles` / `primary`, `muscleGroups` / `muscles` / `targetMuscles`) supaya data
 * warisan dan hasil impor tetap terbaca. Toleransi itu fiturnya, bukan kelalaian tipe.
 */
export type MuscleSource = { [k: string]: unknown }

export type SetPhase = 'work' | 'warmup'
export type SetType = 'straight' | 'dropset' | 'restpause'
export type SetMode = 'reps' | 'time' | 'cardio'

/**
 * Satu penurunan beban di dalam baris drop-set.
 *
 * `r` OPSIONAL, dan itu benar: drop yang DIRENCANAKAN mewarisi repetisi dari baris induknya,
 * dan kalau konfigurasinya belum punya angka repetisi maka rencananya memang belum punya.
 * Drop yang ditambahkan LIVE selalu punya (`addDrop` menulis `num(...)`). Memaksanya jadi 0
 * akan menulis `"r": 0` ke JSON di tempat yang sebelumnya tidak punya kunci itu sama sekali —
 * bentuk tersimpan berubah tanpa alasan. `extraVolumeOf` sudah menangani keduanya lewat num().
 */
export interface Drop { w: number; r?: number }

/** Satu burst istirahat-pendek di dalam baris rest-pause. */
export interface Cluster { r: number; restSec: number }

/**
 * Satu baris set. `phase` dan `type` dilebarkan ke `string` karena data tersimpan bisa
 * memuat token apa pun — `phaseForSet` dan `setType` di workout-model yang menyempitkannya.
 */
export interface SetRow {
  w?: number
  r?: number
  done?: boolean
  phase?: SetPhase | string
  /** Boolean warisan, sebelum `phase` ada. Kalah dari `phase` yang eksplisit. */
  warmup?: boolean
  type?: SetType | string
  drops?: Drop[]
  clusters?: Cluster[]
  mode?: string
  unit?: string
  sec?: number
  seconds?: number
  durationSec?: number
  min?: number
  speed?: number
  reps?: number
  actualReps?: number
}

/** Satu latihan di dalam satu sesi. */
export interface WorkoutEntry {
  id?: string
  sets?: SetRow[]
  /**
   * Resep yang berlaku saat sesi ini dijalankan.
   *
   * `null` DIIZINKAN dan berbeda dari `undefined`: buildCompletedWorkout menulis `null`
   * secara eksplisit, jadi rekaman tersimpan benar-benar memuat `"target": null` —
   * `undefined` akan dibuang JSON.stringify dan mengubah bentuk yang ditulis. Riwayat
   * sebelum v1.2.2 tidak punya field ini sama sekali; readSession menangani ketiganya.
   */
  target?: SetRow | null
  /**
   * Beban kerja yang user konfirmasi setelah latihan, TANPA jumlah repetisi.
   * Karena itu dia tidak bisa menghasilkan estimasi 1RM — lihat bestSetOf di onerm.
   * `null` diizinkan dengan alasan yang sama seperti `target`.
   */
  topW?: number | null
}

/** Satu sesi latihan yang sudah dilog. */
export interface Workout {
  id?: string
  /** Tanggal lokal `YYYY-MM-DD`. */
  d?: string
  /** Epoch ms saat sesi dimulai. Dipakai sebagai sumbu waktu grafik. */
  start?: number
  /** Epoch ms saat sesi diselesaikan. */
  end?: number
  routineId?: string | null
  name?: string
  /** Berat badan yang dicatat sebelum sesi. */
  bw?: number | null
  entries?: WorkoutEntry[]
  /** Rekor yang pecah di sesi ini. */
  prs?: unknown[]
  /** Catatan sesi — milik satu hari, beda dari catatan per-latihan. */
  note?: string
}

/**
 * Sesi yang sedang berjalan. Bentuknya nyaris sama dengan Workout, bedanya baris-barisnya
 * masih bisa berubah dan catatan per-latihan belum diringkas ke bentuk tersimpan.
 *
 * Ini SATU-SATUNYA bagian state yang sengaja tinggal di klien saja dan tidak disinkron
 * sampai sesinya selesai — sesi yang menggantung menunggu jaringan di basement gym itu
 * bug yang bikin orang menghapus app. Lihat CLAUDE.md.
 */
export interface ActiveWorkout {
  id?: string
  d?: string
  start?: number
  routineId?: string | null
  name?: string
  bw?: number | null
  note?: string
  entries?: ActiveEntry[]
}

export interface ActiveEntry extends WorkoutEntry {
  /** Catatan yang diketik hari ini untuk latihan ini. */
  note?: string
  /** Minta catatan itu ditampilkan lagi sesi berikutnya. */
  notePin?: boolean
}

/**
 * Satu latihan dari katalog (1.324 bawaan) atau buatan user.
 *
 * `bp` = body part, `tg` = target, `eq` = equipment, `sm` = secondary muscles,
 * `st` = langkah instruksi. Nama sependek itu berasal dari dataset asalnya dan dipertahankan
 * karena dia terulang 1.324 kali di berkas data 888 KB — memanjangkannya menambah ukuran
 * bundle tanpa menambah kejelasan di tempat yang benar-benar dibaca orang.
 */
export interface Exercise {
  id: string
  n: string
  bp: string
  tg: string
  eq: string
  sm: string[]
  st: string[]
  /** Ditandai true untuk id yang tidak ada di katalog — placeholder, bukan latihan. */
  missing?: boolean
}

/**
 * Konfigurasi satu latihan di dalam rutin: apa yang DIRENCANAKAN, bukan apa yang terjadi.
 *
 * Index signature-nya disengaja selama migrasi: cfg dilewatkan lintas belasan berkas yang
 * masih JS dan membawa lebih banyak field daripada yang sudah dideklarasikan di sini. Field
 * ditambahkan ke daftar eksplisit begitu ada berkas TS yang benar-benar membacanya — jadi
 * daftar ini tumbuh mengikuti bukti, bukan tebakan.
 */
export interface ExerciseConfig {
  id?: string
  /** Kebijakan progresi: 'off' | 'linear' | 'greyskull' | 'double' | 'time'. */
  prog?: string
  /** Kenaikan beban per langkah, meng-override default per-latihan. */
  inc?: number
  sets?: number
  reps?: number
  repsMin?: number
  repsMax?: number
  /** Detik per set untuk latihan berbasis waktu (plank, hang, loaded carry). */
  sec?: number
  /** Menit dan kecepatan untuk kardio. */
  min?: number
  speed?: number
  /** Beban yang direncanakan. Untuk latihan berat-badan ini beban TAMBAHAN, bukan total. */
  weight?: number
  mode?: string
  /** Berapa baris warm-up yang direncanakan; dibatasi MAX_PLANNED_WARMUPS. */
  warmupSets?: number
  /** Latihan unilateral: repetisi yang dilog tetap TOTAL kedua sisi, bukan per sisi. */
  side?: boolean
  /**
   * Latihan tidak membawa beban sendiri, jadi `w` berarti beban TAMBAHAN. Ditulis lengkap,
   * bukan `bw`, karena satu sesi sudah memakai `bw` untuk penimbangan badan — dua hal beda
   * yang cuma selisih satu huruf itu bug yang menunggu.
   */
  bodyweight?: boolean
  /** Id grup superset. Anggota yang bersebelahan dan ber-`sg` sama dikerjakan bergiliran. */
  sg?: string
  /** Catatan yang menempel pada latihan ini di dalam rutin ini. */
  note?: string
  /** Intensifier yang direncanakan — lihat docs/upstream/DOMAIN-NOTES-dropset-restpause.md. */
  intensifier?: {
    type?: string
    count?: number
    pct?: number
    totalReps?: number
    restSec?: number
  }
  [k: string]: unknown
}

/** Satu rutin: nama, daftar latihan, dan kebijakan progresi default untuk semuanya. */
export interface Routine {
  id?: string
  name?: string
  prog?: string
  ex?: ExerciseConfig[]
  [k: string]: unknown
}

/**
 * Irisan state app yang dibaca helper domain. Sengaja BUKAN seluruh state:
 * tiap modul menambah field yang benar-benar dia baca, supaya jelas siapa
 * bergantung pada apa.
 */
export interface AppState {
  workouts?: Workout[]
  /** 'kg' atau 'lb'. Menentukan besar langkah beban default. */
  unit?: string
  /** Id kota untuk waktu salat — lihat CITIES di lib/prayer.ts. */
  city?: string
  routines?: Routine[]
  /** Rutin per hari dalam seminggu, dikunci indeks 0 = Ahad. */
  week?: Record<string, string | null>
  /** Penjadwalan ulang per tanggal ISO — menang atas `week` untuk hari itu. */
  dayPlan?: Record<string, string | null>
  /**
   * Berat kerja terakhir per id latihan. Nilainya OBJEK, bukan angka — pemanggil membaca
   * `(S.exWeights[id] || {}).w`, jadi bungkusnya yang membuat "belum ada" bisa dibedakan
   * dari "nol".
   */
  exWeights?: Record<string, { w?: number } | undefined>
  /** Catatan tetap per latihan: fakta yang benar setiap kali gerakan itu dilakukan. */
  exNotes?: Record<string, string>
  bodyweight?: Array<{ d?: string; t?: number; w?: number }>
  /**
   * Skala effort yang dicatat: `'none' | 'rir' | 'rpe'`, atau **null** kalau profil belum
   * pernah memilih. null itu bermakna, bukan sama dengan 'none' — profil yang belum memilih
   * jatuh ke boolean `showRir` warisan yang digantikannya, dan dengan begitu tetap menampilkan
   * kolom yang sudah dia punya. Lihat effortOf di history.
   */
  effort?: string | null
  showRir?: boolean
  /**
   * Jam KLIEN saat state ini terakhir dipersist, dari `Date.now()`. Dipakai lib/sync.ts untuk
   * memutuskan lokal atau server yang lebih baru.
   *
   * Sengaja jam klien, bukan jam server: perangkat bisa offline berjam-jam sebelum push, jadi
   * jam server cuma bercerita kapan datanya SAMPAI, bukan kapan orangnya latihan. Konsekuensinya
   * dua perangkat bisa beda jam, dan sync.ts menanganinya dengan ambang toleransi — bukan
   * dengan berpura-pura jamnya tepat.
   */
  _ts?: number
  /**
   * Sesi yang sedang berjalan, atau null. **Tidak pernah disinkronkan** — lihat stateForPush di
   * lib/sync.ts untuk alasannya.
   */
  active?: unknown
}
