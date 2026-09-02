// Formatting + date helpers (ported from the vanilla app, unit taken from the store where needed).
import { dateLocale, t } from './i18n-core.js'

export const todayISO = (): string => isoOf(new Date())

export const isoOf = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

// Indeks 0 = Ahad. Minggu Islam mulai Ahad, dan array warisan sudah begitu — jadi keputusan
// "Ahad, bukan Minggu" tidak butuh pergeseran indeks sama sekali. Nama terjemahannya hidup di
// locales/*.js dan dibaca lewat t(); di sini yang ada cuma sumber Inggrisnya.
export const DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

/**
 * Sama seperti `toLocaleDateString`, tapi nama hari diambil dari pack bahasa kalau pack itu
 * benar-benar menerjemahkannya.
 *
 * Kenapa perlu: `Intl` dengan `id-ID` mengembalikan **"Minggu"** — satu-satunya nama hari
 * Indonesia yang bukan dari bahasa Arab (dari Portugis *domingo*, "Hari Tuhan"). Pack `id`
 * memetakan `Sunday` -> `Ahad`, tapi pemanggil yang memakai Intl langsung tidak pernah melihat
 * pack itu, jadi tanggal panjang tetap berbunyi "Minggu" sementara sisa app berbunyi "Ahad".
 *
 * Substitusinya lewat `formatToParts`, BUKAN regex atas string hasil: aman untuk kombinasi
 * format apa pun, dan tidak akan ikut mengganti kata "Minggu" yang muncul sebagai bagian teks
 * lain. Dan hanya diganti kalau pack punya kuncinya — kalau `t()` mengembalikan sumber
 * Inggrisnya, nama dari Intl yang dipakai. Jadi bahasa lain tidak tersentuh sama sekali.
 */
export function localeDateString(d: Date, options: Intl.DateTimeFormatOptions): string {
  const loc = dateLocale()
  if (!options.weekday) return d.toLocaleDateString(loc, options)

  const dow = d.getDay()
  const source = options.weekday === 'short' ? DAYS[dow] : DAYN[dow]
  const translated = source ? t(source) : ''
  // Pack tidak punya kuncinya: percayai Intl, jangan turunkan bahasa lain jadi Inggris.
  if (!source || translated === source) return d.toLocaleDateString(loc, options)

  return new Intl.DateTimeFormat(loc, options)
    .formatToParts(d)
    .map(p => (p.type === 'weekday' ? translated : p.value))
    .join('')
}

export function fmtDate(iso: string, long?: boolean, withYear = false): string {
  const d = new Date(iso + 'T12:00:00')
  const options: Intl.DateTimeFormatOptions = long
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short' }
  if (withYear) options.year = 'numeric'
  return localeDateString(d, options)
}

/**
 * Durasi lewat `t()`, memakai kunci yang SAMA dengan hitungan mundur kartu salat.
 *
 * Versi sebelumnya menulis satuannya sendiri (`'h '`, `'m'`, `' min'`), jadi riwayat
 * membaca "2 min" dan "1h 25m" di ketiga belas bahasa. Bentuknya identik dengan
 * `PrayerCard` yang dulu menuliskan `${h} jam ${m} mnt` di template — dan sekali lagi
 * keempat checker tidak bisa melihatnya, karena teks yang tidak pernah lewat `t()`
 * tidak pernah mengaku sebagai teks yang perlu diterjemahkan. Yang menemukan ini
 * mengganti bahasa app ke Indonesia lalu MEMBACA layarnya: Beranda menulis
 * "Zuhur 20 mnt", Riwayat menulis "2 min" — satuan yang sama, dua singkatan.
 *
 * Penjaga `no-untranslated-id.test.ts` sengaja tidak memindai `lib/`, jadi celah ini
 * memang ada di direktori yang paling tidak diawasi untuk urusan teks UI.
 *
 * Kuncinya DIPAKAI ULANG, bukan kunci baru yang lebih ringkas: dua tempat yang
 * menampilkan durasi ke orang yang sama sebaiknya menyebutnya dengan cara yang sama,
 * dan kunci baru berarti tiga belas pack lagi yang bisa menyimpang.
 */
export function fmtDur(ms: number): string {
  const m = Math.floor(ms / 60000)
  return m >= 60 ? t('{0} hr {1} min', Math.floor(m / 60), m % 60) : t('{0} min', m)
}

// Imported history has no clock — an unknown duration is left out rather than shown as "0 min".
export const durPart = (ms: number): string[] => (ms >= 60000 ? [fmtDur(ms)] : [])

// Numbers follow the UI language, like the dates above — a hardcoded locale put Swiss
// apostrophes ("7'535 kg") in front of every user, in every language.
export const fmtNum = (n: number): string => (Math.round(n * 10) / 10).toLocaleString(dateLocale())

// Volume stays in the profile's unit throughout: the old shorthand turned anything over
// 10 000 into "t", which is wrong for a pound profile and made one list mix "18.8t" with
// "7'535 kg" — two numbers you can't compare at a glance.
export const fmtVol = (v: number, unit: string): string => fmtNum(v) + ' ' + unit

// Plural forms are not automatic when the English string is the key.
export const exCount = (n: number): string => t(n === 1 ? '{0} exercise' : '{0} exercises', n)

/**
 * Pasangan `exCount` untuk set, dan alasan dia ada bentuknya bukan kerapian.
 *
 * Lima tempat memanggil `t('{0} sets', n)` dengan hitungan mentah, jadi satu set membaca
 * "1 sets" — di Statistik, di baris riwayat, dan di ringkasan selesai. Helper ini yang
 * membuat keputusannya hidup di SATU tempat: pemanggil keenam tidak bisa lupa.
 *
 * Yang dibiarkan memakai `t('{0} sets', ...)` langsung cuma yang mengoper PECAHAN
 * ("1/17 sets") — di situ nominanya memang milik penyebutnya, dan bentuk tunggal justru salah.
 */
export const setCount = (n: number): string => t(n === 1 ? '{0} set' : '{0} sets', n)

/**
 * Awal minggu: **Ahad**, bukan Senin.
 *
 * Ini satu-satunya tempat aturan itu hidup. Sebelumnya lima tempat menghitungnya sendiri
 * (`weekKey`, `mondayOf` di effort, strip di Home, Heatmap, demoSeed) dan semuanya berbasis
 * Senin — jadi app-nya memutuskan "Ahad hari pertama" di nama harinya, lalu tetap menggambar
 * minggunya mulai Senin. Melihat layarnya yang menemukan itu, bukan tesnya.
 *
 * `getDay()` mengembalikan 0 untuk Ahad, jadi mundurnya persis sebanyak itu.
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(12, 0, 0, 0)
  return d
}

/**
 * Kunci pengelompokan mingguan: tanggal ISO hari Ahad-nya minggu itu.
 *
 * Dulu ini nomor ISO-week (`'2026-35'`), yang berbasis Senin DAN punya aturan Kamis untuk
 * batas tahun. Tanggal Ahad-nya lebih sederhana, tidak punya kasus tepi tahun, dan langsung
 * bisa dibaca saat debugging.
 *
 * Formatnya bebas diubah karena tidak pernah di-parse: dia cuma dipakai sebagai kunci Set/Map
 * dan dibandingkan kesamaannya. `streakWeeks` melangkah tujuh hari lalu memanggil fungsi ini
 * lagi, bukan menghitung dari kuncinya. Dan kunci ini TIDAK PERNAH disimpan — selalu dihitung
 * dari tanggal, jadi tidak ada data yang perlu dimigrasi.
 */
export function weekKey(d: string): string {
  return isoOf(startOfWeek(new Date(d + 'T12:00:00')))
}

export const localTZ = (): string => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Swatch pemilih aksen di Settings. Harus cocok dengan nilai --acc yang benar-benar dirender
// index.css per [data-accent], kalau tidak titik yang dipilih user beda warna dari app-nya.
// `lime` sebelumnya #30d158 — hijau iOS, sisa dari sebelum rebrand.
export const ACCENTS: Record<string, string> = {
  lime: '#94e900', sky: '#0a84ff', orange: '#ff9f0a', violet: '#bf5af2',
  pink: '#ff375f', red: '#ff453a', teal: '#40c8e0', gold: '#ffd60a'
}
