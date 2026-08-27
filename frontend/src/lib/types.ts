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
  target?: SetRow
  /**
   * Beban kerja yang user konfirmasi setelah latihan, TANPA jumlah repetisi.
   * Karena itu dia tidak bisa menghasilkan estimasi 1RM — lihat bestSetOf di onerm.
   */
  topW?: number
}

/** Satu sesi latihan yang sudah dilog. */
export interface Workout {
  /** Tanggal lokal `YYYY-MM-DD`. */
  d?: string
  /** Epoch ms saat sesi dimulai. Dipakai sebagai sumbu waktu grafik. */
  start?: number
  entries?: WorkoutEntry[]
}

/**
 * Irisan state app yang dibaca helper domain. Sengaja BUKAN seluruh state:
 * tiap modul menambah field yang benar-benar dia baca, supaya jelas siapa
 * bergantung pada apa.
 */
export interface AppState {
  workouts?: Workout[]
}
