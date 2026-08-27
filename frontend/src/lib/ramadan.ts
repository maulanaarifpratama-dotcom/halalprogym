/**
 * Mode Ramadan — dan mode puasa sunah Senin–Kamis, karena mesinnya sama.
 *
 * KENAPA MODE INI ADA, dan kenapa dia bukan sekadar sakelar kosmetik.
 *
 * Mesin progresi (lib/progression.ts) membaca sesi dengan jujur: set yang tidak tercentang atau
 * kurang reps = miss. Itu benar sepanjang tahun — kecuali saat puasa. Performa turun saat puasa
 * adalah hal normal dan sudah diperkirakan, tapi mesin itu tidak tahu bulan apa sekarang. Yang
 * dia lihat cuma `ok === false` berulang, lalu dia memicu deload. Sebulan begitu dan beban orang
 * mundur jauh dari kemampuan aslinya — bukan karena dia melemah, tapi karena alat ukurnya salah
 * menafsirkan sebabnya.
 *
 * Jadi mode Ramadan menyetel keputusan ke HOLD: jangan naik, jangan turun. Beban ditahan di
 * angka sebelum puasa, dan sebulan kemudian program dilanjutkan dari tempat dia berhenti.
 *
 * TIGA HAL DIPISAH DI SINI, karena tiga-tiganya bisa salah secara terpisah:
 *
 *   1. HARI INI puasa atau tidak     -> isFastingDay
 *   2. SEKARANG di dalam jam puasa   -> isFastingNow (butuh waktu salat kota)
 *   3. apa yang dilakukan atas itu   -> holdFor, workSetsFor, notificationAllowed
 *
 * Semuanya fungsi murni dengan tanggal/jam sebagai argumen. Itu bukan gaya: aturan tes repo ini
 * mewajibkan apa pun yang memutuskan beban berikutnya jadi pure helper dengan unit test, dan
 * fungsi yang membaca `new Date()` sendiri cuma bisa dites satu kali sehari.
 */
import { scheduleFor, type City } from './prayer.js'

export interface RamadanSettings {
  /** Mode Ramadan menyala: setiap hari puasa, progresi ditahan, volume dipangkas. */
  on?: boolean
  /**
   * Mode puasa sunah Senin–Kamis. Perlakuannya sama dengan Ramadan, tapi hanya pada dua hari
   * itu — dan itu yang membuatnya jadi JALUR UJI: mode Ramadan tidak bisa divalidasi tanpa
   * benar-benar berpuasa, dan kalau baru diuji saat Ramadan tiba sudah terlambat diperbaiki.
   * Puasa sunah memberi belasan siklus uji sebelum Ramadan.
   */
  sunnah?: boolean
  /**
   * Berapa persen volume kerja yang DIPERTAHANKAN, bukan yang dipangkas.
   *
   * Dinamai "keep" dengan sengaja: `volumePct: 35` bisa dibaca dua arah, dan salah baca berarti
   * memangkas 65% volume orang. Rentang yang dimaksud CLAUDE.md adalah pangkas 30–40%, jadi
   * default-nya menahan 65%.
   */
  volumeKeepPct?: number
}

export const DEFAULT_RAMADAN: RamadanSettings = { on: false, sunnah: false, volumeKeepPct: 65 }

/** Batas aman: memangkas volume tidak boleh berarti menghapus latihannya. */
const MIN_WORK_SETS = 1
const KEEP_MIN = 40
const KEEP_MAX = 100

/** Senin dan Kamis. `getDay()` 0 = Ahad, jadi 1 dan 4. */
const SUNNAH_DAYS = [1, 4]

/**
 * Apakah hari ini hari puasa menurut setelan?
 *
 * Mode Ramadan TIDAK dideteksi dari tanggal Hijriah secara otomatis. Itu keputusan sadar:
 * awal Ramadan di Indonesia ditetapkan sidang isbat Kemenag, dan hisab bisa berbeda sehari.
 * Menyalakan mode ini otomatis sehari lebih awal berarti menahan progresi orang di hari yang
 * dia belum berpuasa; sehari lebih lambat berarti satu hari puasa yang dibaca mesin sebagai
 * kegagalan. Sakelar manual selalu benar, dan pemiliknya yang tahu.
 */
export function isFastingDay(s: RamadanSettings | null | undefined, date: Date): boolean {
  if (!s) return false
  if (s.on) return true
  if (s.sunnah) return SUNNAH_DAYS.includes(date.getDay())
  return false
}

export interface FastingWindow {
  /** Berhenti makan — Subuh dikurangi ikhtiyat imsak. */
  from: Date
  /** Berbuka — Magrib. */
  to: Date
}

/**
 * Jam puasa hari itu di kota itu.
 *
 * Dihitung dari jadwal salat yang sudah terverifikasi ke Kemenag, bukan dari jam tetap: panjang
 * puasa di Jayapura dan di Medan berbeda puluhan menit, dan itu bukan detail yang bisa
 * dibulatkan.
 */
export function fastingWindow(city: City, date: Date): FastingWindow {
  const sched = scheduleFor(city, date)
  return { from: sched.imsak, to: sched.times.magrib }
}

/**
 * Apakah SEKARANG di dalam jam puasa?
 *
 * false kalau hari ini bukan hari puasa, dan juga false sebelum imsak maupun setelah magrib —
 * dua-duanya waktu makan yang sah, dan memperlakukannya sebagai jam puasa akan menahan
 * notifikasi yang justru paling berguna saat itu.
 */
export function isFastingNow(
  s: RamadanSettings | null | undefined,
  city: City,
  now: Date
): boolean {
  if (!isFastingDay(s, now)) return false
  const w = fastingWindow(city, now)
  const t = now.getTime()
  return t >= w.from.getTime() && t < w.to.getTime()
}

/** Sisa waktu sampai berbuka, milidetik. null kalau sekarang bukan jam puasa. */
export function msUntilIftar(
  s: RamadanSettings | null | undefined,
  city: City,
  now: Date
): number | null {
  if (!isFastingNow(s, city, now)) return null
  return fastingWindow(city, now).to.getTime() - now.getTime()
}

/** Bentuk minimum resep yang mode ini sentuh — sengaja tidak mengimpor progression.ts. */
export interface HoldablePrescription {
  kind: string
  weight?: number
  reps?: number
  sec?: number
  sets?: number
  why?: [string, ...(string | number)[]]
}

/**
 * Menahan resep di angka sekarang.
 *
 * Yang diubah CUMA arah keputusannya, bukan angkanya: `up` dan `deload` sama-sama jadi `hold`,
 * dan beban/reps/detik yang dikembalikan adalah yang TERAKHIR DIPAKAI, bukan yang dihitung
 * mesin. Itu inti mode ini — angka yang dipertahankan harus angka sebelum puasa.
 *
 * `kind: 'first'` dan `'off'` dilewatkan apa adanya. 'first' berarti belum ada catatan sama
 * sekali, jadi tidak ada yang bisa ditahan; 'off' berarti pemiliknya memang tidak mau progresi
 * otomatis, dan mode Ramadan tidak berhak mengubah itu.
 *
 * `why`-nya DIGANTI, tidak ditambahi. App ini menampilkan alasan di sebelah angkanya, dan
 * alasan lama ("Reps gagal, deload ke ...") akan berbohong tentang apa yang baru saja terjadi.
 */
export function holdFor<T extends HoldablePrescription>(
  p: T,
  fasting: boolean,
  current: { weight?: number; reps?: number; sec?: number }
): T {
  if (!fasting) return p
  if (p.kind === 'first' || p.kind === 'off') return p
  return {
    ...p,
    kind: 'hold',
    weight: current.weight ?? p.weight,
    reps: current.reps ?? p.reps,
    sec: current.sec ?? p.sec,
    why: ['Ramadan mode — the weight holds. Fasting is not a reason to deload.'],
  }
}

/**
 * Berapa set kerja untuk latihan ini hari ini.
 *
 * Pembulatan ke ATAS, dan lantainya satu set. Membulatkan ke bawah membuat latihan 2 set jadi
 * 1 set pada 65%, dan itu memangkas jauh lebih dalam dari yang diminta. Lantai satu set ada
 * karena "nol set" bukan volume yang dipangkas — itu latihan yang dihapus, dan menghapus
 * latihan diam-diam dari rencana orang bukan wewenang sakelar volume.
 */
export function workSetsFor(
  n: number,
  s: RamadanSettings | null | undefined,
  date: Date
): number {
  const base = Math.max(MIN_WORK_SETS, Math.round(n) || MIN_WORK_SETS)
  if (!isFastingDay(s, date)) return base
  const keepRaw = typeof s?.volumeKeepPct === 'number' ? s.volumeKeepPct : DEFAULT_RAMADAN.volumeKeepPct as number
  const keep = Math.min(KEEP_MAX, Math.max(KEEP_MIN, keepRaw))
  return Math.max(MIN_WORK_SETS, Math.ceil(base * keep / 100))
}

/**
 * Kategori notifikasi, karena tidak semuanya salah di jam puasa.
 *
 * 'hydration' dan 'meal' — "minum air", "waktunya makan" — SALAH jam 2 siang saat orang
 * berpuasa. Bukan cuma tidak berguna: dia menyodorkan hal yang sedang dihindari orang dengan
 * sengaja, dan itu app yang tidak memahami penggunanya.
 *
 * 'rest' (timer istirahat) dan 'workout' (pengingat hari latihan) tetap jalan: orang memang
 * latihan saat puasa, dan menahan alarm rest timer justru merusak sesinya.
 */
export type NotificationKind = 'rest' | 'workout' | 'hydration' | 'meal'

const SUPPRESSED_WHILE_FASTING: NotificationKind[] = ['hydration', 'meal']

export function notificationAllowed(
  kind: NotificationKind,
  s: RamadanSettings | null | undefined,
  city: City,
  now: Date
): boolean {
  if (!SUPPRESSED_WHILE_FASTING.includes(kind)) return true
  return !isFastingNow(s, city, now)
}

/**
 * Jendela latihan yang masuk akal di hari puasa.
 *
 * Dua yang benar-benar dipakai orang: tepat sebelum Magrib (selesai lalu langsung berbuka) dan
 * setelah Tarawih. Dikembalikan sebagai saran, bukan paksaan — ini app latihan pribadi, bukan
 * pelatih yang menolak membuka layar di luar jam.
 *
 * `beforeIftar` mundur PRE_IFTAR_MIN menit dari Magrib. Angkanya sengaja 75, bukan 60: sesi
 * tipikal di app ini 45–60 menit, plus waktu membereskan alat dan pulang.
 */
const PRE_IFTAR_MIN = 75
/** Tarawih biasanya selesai ~90 menit setelah Isya. */
const POST_TARAWIH_MIN = 90

export interface TrainingWindows {
  beforeIftar: { from: Date; to: Date }
  afterTarawih: { from: Date }
}

export function trainingWindows(city: City, date: Date): TrainingWindows {
  const sched = scheduleFor(city, date)
  const magrib = sched.times.magrib
  return {
    beforeIftar: { from: new Date(magrib.getTime() - PRE_IFTAR_MIN * 60000), to: magrib },
    afterTarawih: { from: new Date(sched.times.isya.getTime() + POST_TARAWIH_MIN * 60000) },
  }
}
