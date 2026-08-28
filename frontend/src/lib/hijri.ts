/**
 * Tanggal Hijriah.
 *
 * KENAPA ADA OFFSET YANG BISA DISETEL, dan kenapa itu bukan tambal-sulam.
 *
 * Konversi di bawah memakai kalender **Umm al-Qura** lewat `Intl` — kalender sipil yang dihitung
 * dengan hisab, dan itu satu-satunya yang bisa dihitung offline. Tapi awal bulan di Indonesia
 * ditetapkan **sidang isbat** Kemenag, yang mempertimbangkan rukyat. Keduanya bisa berbeda satu
 * hari, dan perbedaan itu normal — bukan bug di salah satunya.
 *
 * Satu hari itu bermakna: dia menentukan hari pertama Ramadan dan hari Idulfitri. Jadi app ini
 * tidak berpura-pura tahu; dia menampilkan hasil hisab dan membiarkan pemiliknya menggeser
 * ±2 hari sesuai pengumuman. Menyembunyikan offset akan membuat app terlihat lebih pintar dan
 * menjadi lebih salah.
 *
 * KENAPA NAMA BULANNYA DARI TABEL SENDIRI UNTUK BAHASA INDONESIA
 *
 * `Intl` dengan `id-ID` sudah memberi "Rabiulawal", dan itu kebetulan benar. Tapi nama bulan dari
 * ICU berubah antar versi dan antar mesin — Node, Chrome, dan WebView Android tidak selalu
 * membawa ICU yang sama, dan sebagian mengembalikan "Rabiʻ I". Sementara ejaan keislaman di app
 * ini WAJIB mengikuti KBBI (docs/GLOSARIUM-ID.md), dan itu keputusan brand, bukan preferensi.
 *
 * Jadi: ANGKANYA dari Intl (hari, bulan, tahun — konversi kalender memang pekerjaannya), NAMANYA
 * dari tabel di bawah untuk bahasa Indonesia. Bahasa lain memakai nama dari Intl, karena di sana
 * kita tidak punya pendapat yang lebih baik dari ICU. Pola yang sama dipakai `localeDateString`
 * di lib/format.ts untuk mengganti "Minggu" jadi "Ahad".
 */

/**
 * Nama bulan Hijriah menurut KBBI, indeks 0 = Muharam.
 *
 * Perhatikan ejaan yang sering ditulis lain: **Muharam** satu 'r', **Syaban** tanpa 'k',
 * **Ramadan** tanpa 'h', **Zulkaidah** dan **Zulhijah**. Semuanya bentuk KBBI, dan sengaja
 * konsisten dengan glosarium: kalau ejaannya diperdebatkan, standar nasional yang menang.
 */
export const HIJRI_MONTHS_ID: readonly string[] = [
  'Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir',
  'Rajab', 'Syaban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah',
]

/**
 * Transliterasi Latin, dipakai HANYA kalau ICU tidak punya nama bulan Hijriah untuk sebuah
 * bahasa.
 *
 * KENAPA CADANGAN INI ADA, DAN BUKAN TEORETIS
 *
 * ICU untuk `zh` mengembalikan `三月` dan `九月` untuk bulan Hijriah ke-3 dan ke-9 — dan itu
 * PERSIS nama bulan Gregorian Maret dan September. Jadi pengguna Mandarin melihat "15 三月
 * 1448 H", yang terbaca sebagai "15 Maret 1448". Bukan cuma jelek: salah, dan salah dengan cara
 * yang cuma terlihat oleh orang yang membaca bahasanya. Kelas yang sama dengan "full body" yang
 * tampil Inggris di 13 bahasa selama berbulan-bulan.
 *
 * Sumber transliterasinya standar dan bukan karangan: bentuk yang dipakai umum di tulisan
 * berbahasa Inggris tentang kalender Hijriah.
 *
 * TERBATAS DENGAN SENGAJA: ini aksara Latin, jadi untuk pembaca Mandarin dia tetap bukan yang
 * ideal — transliterasi Mandarin yang benar (赖比尔·敖外鲁月 dan seterusnya) akan lebih baik, tapi
 * ejaannya butuh diverifikasi penutur asli dan mengarangnya lebih buruk daripada Latin yang
 * jelas asing. Yang penting sudah tercapai: tidak lagi tertukar dengan bulan Gregorian.
 */
export const HIJRI_MONTHS_LATIN: readonly string[] = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
]

/** Batas geseran yang diizinkan. Lebih dari dua hari bukan lagi selisih hisab-rukyat. */
export const HIJRI_OFFSET_MIN = -2
export const HIJRI_OFFSET_MAX = 2

const DAY_MS = 86_400_000

/** Menjepit offset ke rentang yang bermakna — state datang dari localStorage dan berkas cadangan. */
export const clampOffset = (n: unknown): number => {
  const v = Math.round(Number(n) || 0)
  return Math.min(HIJRI_OFFSET_MAX, Math.max(HIJRI_OFFSET_MIN, v))
}

export interface HijriDate {
  day: number
  /** 1..12, 1 = Muharam. */
  month: number
  year: number
}

/**
 * Konversi ke Hijriah (Umm al-Qura), dengan offset hari.
 *
 * Mengembalikan angka, bukan teks: pemanggil yang memutuskan bahasanya, dan pemisahan itu yang
 * membuat mode Ramadan nanti bisa membaca `month === 9` tanpa menyentuh urusan format.
 *
 * `null` kalau lingkungannya tidak punya kalender Islam sama sekali. Itu bukan kasus teoretis
 * murni — ICU yang dipangkas ada di beberapa build Node — dan pemanggil harus bisa menyembunyikan
 * barisnya daripada menampilkan tanggal yang salah.
 */
export function toHijri(date: Date, offsetDays = 0): HijriDate | null {
  const shifted = new Date(date.getTime() + clampOffset(offsetDays) * DAY_MS)
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).formatToParts(Date.UTC(
      shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 12, 0, 0
    ))
    const get = (type: string): number => Number(parts.find(p => p.type === type)?.value)
    const day = get('day')
    const month = get('month')
    const year = get('year')
    if (!day || !month || !year) return null
    return { day, month, year }
  } catch {
    return null
  }
}

/**
 * Apakah ICU benar-benar punya nama bulan Hijriah untuk bahasa ini?
 *
 * Diperiksa dengan MEMBANDINGKANNYA ke nama bulan Gregorian pada ordinal yang sama. Kalau
 * keduanya identik, ICU tidak punya data Hijriah untuk bahasa itu dan cuma memakai ulang nama
 * bulan biasa — itu yang terjadi pada `zh`, di mana bulan Hijriah ke-3 keluar sebagai `三月`,
 * nama Maret.
 *
 * Pemeriksaan ini lebih baik daripada daftar bahasa yang di-hardcode karena dia MEMPERBAIKI
 * DIRI SENDIRI: kalau versi ICU berikutnya menambahkan nama Hijriah untuk sebuah bahasa,
 * app langsung memakainya tanpa satu baris pun diubah. Dan kalau ICU MENGHILANGKAN data untuk
 * bahasa lain, cadangannya langsung berlaku.
 */
function icuHasHijriNames(lang: string, month: number, hijriName: string): boolean {
  try {
    const gregorian = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2026, month - 1, 15)))
    return hijriName !== gregorian
  } catch {
    // Tidak bisa memeriksa berarti tidak bisa memastikan. Memakai nama ICU apa adanya di sini
    // lebih aman daripada memaksa cadangan Latin ke bahasa yang mungkin punya nama yang benar.
    return true
  }
}

/**
 * Nama bulan Hijriah dalam bahasa tertentu.
 *
 * `lang` diterima sebagai argumen, bukan dibaca dari state i18n, supaya fungsinya murni dan bisa
 * ditesnya untuk setiap bahasa tanpa memasang state global.
 */
export function hijriMonthName(month: number, lang: string): string {
  // `Number(month) || 1` MENDAHULUI penjepitan, bukan sesudahnya. Math.round(NaN) tetap NaN, dan
  // Math.min/max terhadap NaN juga NaN — jadi indeksnya jadi NaN dan tabelnya mengembalikan
  // undefined, yang lalu tampil sebagai "undefined 1448 H" di layar.
  const idx = Math.min(12, Math.max(1, Math.round(Number(month)) || 1)) - 1
  if (lang === 'id') return HIJRI_MONTHS_ID[idx] as string
  try {
    // Tanggal 15 dipilih dengan sengaja: dia selalu di tengah bulan Hijriah mana pun, jadi
    // pembulatan zona waktu tidak bisa menggeser namanya ke bulan sebelah.
    const probe = hijriToApproxGregorian(month)
    const name = new Intl.DateTimeFormat(lang + '-u-ca-islamic-umalqura', { month: 'long', timeZone: 'UTC' })
      .format(probe)
    if (!name) return HIJRI_MONTHS_LATIN[idx] as string
    // Nama Gregorian yang dipakai ulang bukan nama Hijriah — lihat icuHasHijriNames.
    if (!icuHasHijriNames(lang, idx + 1, name)) return HIJRI_MONTHS_LATIN[idx] as string
    return name
  } catch {
    // Lingkungan tanpa kalender Islam. Cadangannya Latin, BUKAN Indonesia: ejaan KBBI adalah
    // keputusan untuk pengguna Indonesia, dan menyodorkannya ke bahasa lain adalah menebak.
    return HIJRI_MONTHS_LATIN[idx] as string
  }
}

/**
 * Satu hari Gregorian yang jatuh di bulan Hijriah `month` mana pun tahun ini.
 *
 * Dipakai HANYA untuk mengambil nama bulan dari Intl. Dicari dengan melangkah 15 hari sekali dari
 * hari ini — bukan dengan rumus konversi balik, karena satu-satunya yang dibutuhkan adalah
 * "tanggal apa saja di bulan itu", dan menulis konversi balik sendiri berarti menulis kalender
 * kedua yang harus dijaga sinkron dengan yang pertama.
 */
function hijriToApproxGregorian(month: number): Date {
  const today = new Date()
  for (let i = 0; i < 26; i++) {
    const probe = new Date(today.getTime() + i * 15 * DAY_MS)
    const h = toHijri(probe)
    if (h && h.month === month) return probe
  }
  return today
}

/** `15 Rabiulawal 1448 H` — bentuk yang dipakai di layar. */
export function fmtHijri(
  date: Date,
  lang: string,
  offsetDays = 0,
  suffix = 'H'
): string | null {
  const h = toHijri(date, offsetDays)
  if (!h) return null
  return h.day + ' ' + hijriMonthName(h.month, lang) + ' ' + h.year + ' ' + suffix
}

/** Bulan Ramadan menurut hisab + offset. Dipakai kartu Home untuk memberi konteks, bukan gerbang. */
export const isRamadanByHisab = (date: Date, offsetDays = 0): boolean =>
  toHijri(date, offsetDays)?.month === 9
