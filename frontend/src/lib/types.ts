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

export type SetPhase = 'work' | 'warmup'
export type SetType = 'straight' | 'dropset' | 'restpause'
export type SetMode = 'reps' | 'time' | 'cardio'

/** Satu penurunan beban di dalam baris drop-set. */
export interface Drop { w: number; r: number }

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
  sec?: number
  mode?: string
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
  /**
   * Skala effort yang dicatat: `'none' | 'rir' | 'rpe'`, atau **null** kalau profil belum
   * pernah memilih. null itu bermakna, bukan sama dengan 'none' — profil yang belum memilih
   * jatuh ke boolean `showRir` warisan yang digantikannya, dan dengan begitu tetap menampilkan
   * kolom yang sudah dia punya. Lihat effortOf di history.
   */
  effort?: string | null
  showRir?: boolean
}
