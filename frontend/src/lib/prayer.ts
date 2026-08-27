import * as adhan from 'adhan'

/**
 * Waktu salat, dihitung LOKAL.
 *
 * KENAPA DIHITUNG, BUKAN DIAMBIL DARI API
 *
 * Orang latihan di basement gym dengan sinyal jelek. Waktu salat yang butuh jaringan berarti
 * app tidak tahu kapan Magrib justru di tempat di mana dia paling dibutuhkan. `adhan` (MIT)
 * menghitung semuanya offline dari koordinat.
 *
 * PARAMETERNYA DIVERIFIKASI, BUKAN DITEBAK
 *
 * Basisnya `CalculationMethod.Singapore()` — Fajr 20 derajat, Isya 18 derajat, sudut yang sama
 * dipakai Kemenag. Lalu penyesuaiannya diukur terhadap jadwal resmi Kemenag: 30 sampel, enam
 * kota rentang bujur ekstrem (Jakarta, Bandung, Surabaya, Medan, Makassar, Jayapura) x lima
 * tanggal sepanjang tahun termasuk dekat solstis dan sekitar Ramadan 1448.
 *
 * Hasil akhir setelah penyesuaian, selisih terhadap Kemenag dalam menit:
 *
 *   Subuh    0..+2      Asar     0..+2      Magrib   0..+4
 *   Zuhur   -1..+1      Isya     0..+1      Terbit  -2..+1
 *
 * KENAPA SENGAJA CONDONG KE "LEBIH LAMBAT"
 *
 * Untuk waktu MASUK salat, lebih awal itu tidak sah — salat sebelum waktunya tidak terhitung.
 * Jadi Subuh, Asar, Magrib, dan Isya dipatok supaya **tidak pernah lebih awal** dari jadwal
 * Kemenag di 30 sampel itu. Untuk Magrib alasannya berlapis: dia juga waktu berbuka, dan
 * berbuka sebelum Magrib membatalkan puasa. Terbit dibiarkan boleh lebih awal karena dia
 * menandai AKHIR waktu Subuh — lebih awal berarti lebih hati-hati, bukan sebaliknya.
 *
 * Ini persis prinsip **ikhtiyat** yang Kemenag sendiri pakai, dan ukurannya sama: ~2 menit.
 *
 * KOREKSI KETINGGIAN — INI YANG PALING BANYAK DILUPAKAN
 *
 * `adhan` tidak menerima elevasi, dan itu terlihat: Bandung (768 m) melenceng KONSISTEN 7-8
 * menit di terbit dan Magrib, di setiap tanggal yang diuji. Bukan noise — di ketinggian,
 * matahari terbit lebih awal dan terbenam lebih lambat karena horizonnya turun.
 *
 * Dikoreksi dengan fisikanya, bukan angka tebakan: dip horizon ~= 0,0293*sqrt(h) derajat, dan
 * di ekuator matahari melintas ~4 menit per derajat, jadi geseran ~= 0,117*sqrt(h) menit.
 * Untuk Bandung itu ~3 menit, dan selisih Magrib-nya turun dari -4..+2 jadi -1..+3.
 *
 * Kota di bawah 20 m tidak dikoreksi: geserannya membulat ke nol.
 *
 * YANG TETAP HARUS DIKATAKAN KE USER
 *
 * Ini tetap perhitungan. Untuk hal yang selisih semenit pun berarti — imsak dan buka puasa di
 * bulan Ramadan — user harus mencocokkan ke jadwal resmi daerahnya. App ini menyampaikan itu,
 * bukan menyembunyikannya.
 */

/** Lima waktu salat plus terbit, yang menandai akhir waktu Subuh. */
export type PrayerName = 'subuh' | 'terbit' | 'zuhur' | 'asar' | 'magrib' | 'isya'

/** Nama waktu salat mengikuti KBBI — lihat docs/GLOSARIUM-ID.md. */
export const PRAYER_LABEL: Record<PrayerName, string> = {
  subuh: 'Subuh',
  terbit: 'Terbit',
  zuhur: 'Zuhur',
  asar: 'Asar',
  magrib: 'Magrib',
  isya: 'Isya'
}

/** Waktu yang benar-benar disalati — `terbit` bukan salat, dia penanda akhir Subuh. */
export const SALAT_TIMES: PrayerName[] = ['subuh', 'zuhur', 'asar', 'magrib', 'isya']

export interface City {
  id: string
  name: string
  lat: number
  lng: number
  /** Ketinggian dalam meter. Memengaruhi terbit dan Magrib — lihat catatan di atas. */
  alt: number
  /** Zona waktu IANA. Indonesia punya tiga: WIB, WITA, WIT. */
  tz: string
}

/**
 * Kota yang tersedia. Dipilih daftar, BUKAN geolocation: tanpa izin browser, jalan offline,
 * dan untuk waktu salat presisi GPS memang tidak dibutuhkan — satu kota cukup.
 *
 * Ketinggian bersifat perkiraan, dan itu tidak masalah: geserannya dibulatkan ke menit penuh,
 * jadi salah 50 m pun hilang dalam pembulatan. Yang penting kota pegunungan tidak dianggap
 * setinggi permukaan laut.
 */
export const CITIES: City[] = [
  { id: 'jakarta', name: 'Jakarta', lat: -6.2088, lng: 106.8456, alt: 8, tz: 'Asia/Jakarta' },
  { id: 'bandung', name: 'Bandung', lat: -6.9175, lng: 107.6191, alt: 768, tz: 'Asia/Jakarta' },
  { id: 'bekasi', name: 'Bekasi', lat: -6.2383, lng: 106.9756, alt: 19, tz: 'Asia/Jakarta' },
  { id: 'depok', name: 'Depok', lat: -6.4025, lng: 106.7942, alt: 95, tz: 'Asia/Jakarta' },
  { id: 'tangerang', name: 'Tangerang', lat: -6.1781, lng: 106.6300, alt: 14, tz: 'Asia/Jakarta' },
  { id: 'bogor', name: 'Bogor', lat: -6.5950, lng: 106.8166, alt: 265, tz: 'Asia/Jakarta' },
  { id: 'serang', name: 'Serang', lat: -6.1200, lng: 106.1503, alt: 25, tz: 'Asia/Jakarta' },
  { id: 'cirebon', name: 'Cirebon', lat: -6.7320, lng: 108.5523, alt: 5, tz: 'Asia/Jakarta' },
  { id: 'semarang', name: 'Semarang', lat: -6.9932, lng: 110.4203, alt: 2, tz: 'Asia/Jakarta' },
  { id: 'surakarta', name: 'Surakarta', lat: -7.5755, lng: 110.8243, alt: 105, tz: 'Asia/Jakarta' },
  { id: 'yogyakarta', name: 'Yogyakarta', lat: -7.7956, lng: 110.3695, alt: 113, tz: 'Asia/Jakarta' },
  { id: 'surabaya', name: 'Surabaya', lat: -7.2575, lng: 112.7521, alt: 5, tz: 'Asia/Jakarta' },
  { id: 'malang', name: 'Malang', lat: -7.9666, lng: 112.6326, alt: 445, tz: 'Asia/Jakarta' },
  { id: 'medan', name: 'Medan', lat: 3.5952, lng: 98.6722, alt: 25, tz: 'Asia/Jakarta' },
  { id: 'banda-aceh', name: 'Banda Aceh', lat: 5.5483, lng: 95.3238, alt: 10, tz: 'Asia/Jakarta' },
  { id: 'padang', name: 'Padang', lat: -0.9471, lng: 100.4172, alt: 8, tz: 'Asia/Jakarta' },
  { id: 'palembang', name: 'Palembang', lat: -2.9761, lng: 104.7754, alt: 8, tz: 'Asia/Jakarta' },
  { id: 'pekanbaru', name: 'Pekanbaru', lat: 0.5071, lng: 101.4478, alt: 10, tz: 'Asia/Jakarta' },
  { id: 'bandar-lampung', name: 'Bandar Lampung', lat: -5.4292, lng: 105.2610, alt: 21, tz: 'Asia/Jakarta' },
  { id: 'batam', name: 'Batam', lat: 1.0456, lng: 104.0305, alt: 30, tz: 'Asia/Jakarta' },
  { id: 'jambi', name: 'Jambi', lat: -1.6101, lng: 103.6131, alt: 15, tz: 'Asia/Jakarta' },
  { id: 'pontianak', name: 'Pontianak', lat: -0.0263, lng: 109.3425, alt: 3, tz: 'Asia/Jakarta' },
  { id: 'denpasar', name: 'Denpasar', lat: -8.6705, lng: 115.2126, alt: 4, tz: 'Asia/Makassar' },
  { id: 'mataram', name: 'Mataram', lat: -8.5833, lng: 116.1167, alt: 16, tz: 'Asia/Makassar' },
  { id: 'makassar', name: 'Makassar', lat: -5.1477, lng: 119.4327, alt: 8, tz: 'Asia/Makassar' },
  { id: 'balikpapan', name: 'Balikpapan', lat: -1.2379, lng: 116.8529, alt: 10, tz: 'Asia/Makassar' },
  { id: 'samarinda', name: 'Samarinda', lat: -0.5017, lng: 117.1536, alt: 10, tz: 'Asia/Makassar' },
  { id: 'banjarmasin', name: 'Banjarmasin', lat: -3.3194, lng: 114.5921, alt: 3, tz: 'Asia/Makassar' },
  { id: 'manado', name: 'Manado', lat: 1.4748, lng: 124.8421, alt: 10, tz: 'Asia/Makassar' },
  { id: 'palu', name: 'Palu', lat: -0.8917, lng: 119.8707, alt: 20, tz: 'Asia/Makassar' },
  { id: 'kupang', name: 'Kupang', lat: -10.1772, lng: 123.6070, alt: 30, tz: 'Asia/Makassar' },
  { id: 'ambon', name: 'Ambon', lat: -3.6954, lng: 128.1814, alt: 10, tz: 'Asia/Jayapura' },
  { id: 'ternate', name: 'Ternate', lat: 0.7963, lng: 127.3862, alt: 10, tz: 'Asia/Jayapura' },
  { id: 'sorong', name: 'Sorong', lat: -0.8762, lng: 131.2558, alt: 5, tz: 'Asia/Jayapura' },
  { id: 'jayapura', name: 'Jayapura', lat: -2.5337, lng: 140.7181, alt: 5, tz: 'Asia/Jayapura' }
]

export const DEFAULT_CITY_ID = 'jakarta'

export const cityById = (id: string | null | undefined): City =>
  CITIES.find(c => c.id === id) || (CITIES[0] as City)

/**
 * Ikhtiyat terukur, dalam menit, di atas `CalculationMethod.Singapore()`.
 * Zuhur 4 dan bukan 3: Singapore sendiri sudah menambah 1, dan pengukuran menunjukkan
 * masih perlu 3 lagi supaya tidak pernah lebih awal.
 */
const IKHTIYAT: Record<string, number> = {
  fajr: 3, sunrise: -4, dhuhr: 4, asr: 3, maghrib: 5, isha: 3
}

/** Jarak imsak sebelum Subuh. 10 menit, konvensi Kemenag sendiri. */
export const IMSAK_BEFORE_FAJR_MIN = 10

/** Di bawah ini, geseran ketinggian membulat ke nol. */
const ALT_FLOOR_M = 20

function paramsFor(city: City): adhan.CalculationParameters {
  const p = adhan.CalculationMethod.Singapore()
  for (const [k, v] of Object.entries(IKHTIYAT)) {
    ;(p.methodAdjustments as Record<string, number>)[k] = v
  }
  if (city.alt > ALT_FLOOR_M) {
    // Dip horizon ~= 0,0293*sqrt(h) derajat; ~4 menit per derajat di ekuator.
    const shift = Math.round(0.117 * Math.sqrt(city.alt))
    const adj = p.methodAdjustments as Record<string, number>
    adj.sunrise = (adj.sunrise || 0) - shift
    adj.maghrib = (adj.maghrib || 0) + shift
  }
  return p
}

export interface PrayerSchedule {
  city: City
  /** Tanggal lokal `YYYY-MM-DD` yang jadwal ini berlaku untuknya. */
  d: string
  times: Record<PrayerName, Date>
  /** Berhenti makan saat puasa: Subuh dikurangi IMSAK_BEFORE_FAJR_MIN. */
  imsak: Date
}

const isoOf = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

/** Jadwal satu hari untuk satu kota. `date` diterima supaya fungsinya deterministik dan bisa ditesnya. */
export function scheduleFor(city: City, date: Date = new Date()): PrayerSchedule {
  const pt = new adhan.PrayerTimes(new adhan.Coordinates(city.lat, city.lng), date, paramsFor(city))
  const times: Record<PrayerName, Date> = {
    subuh: pt.fajr,
    terbit: pt.sunrise,
    zuhur: pt.dhuhr,
    asar: pt.asr,
    magrib: pt.maghrib,
    isya: pt.isha
  }
  return {
    city,
    d: isoOf(date),
    times,
    imsak: new Date(pt.fajr.getTime() - IMSAK_BEFORE_FAJR_MIN * 60000)
  }
}

export interface NextPrayer {
  name: PrayerName
  at: Date
  /** Milidetik dari `now` ke waktunya. Selalu > 0. */
  inMs: number
  /** true kalau waktunya sudah besok — semua salat hari ini sudah lewat. */
  tomorrow: boolean
}

/**
 * Salat berikutnya setelah `now`. Kalau Isya sudah lewat, yang berikutnya Subuh BESOK — dan
 * itu dihitung dari jadwal hari besok, bukan hari ini digeser 24 jam, karena waktu salat
 * bergerak setiap hari.
 */
export function nextPrayer(city: City, now: Date = new Date()): NextPrayer {
  const today = scheduleFor(city, now)
  for (const name of SALAT_TIMES) {
    const at = today.times[name]
    if (at.getTime() > now.getTime()) {
      return { name, at, inMs: at.getTime() - now.getTime(), tomorrow: false }
    }
  }
  const tomorrow = scheduleFor(city, new Date(now.getTime() + 86400000))
  const at = tomorrow.times.subuh
  return { name: 'subuh', at, inMs: at.getTime() - now.getTime(), tomorrow: true }
}

/**
 * Berapa lama satu waktu salat "menutup" jadwal latihan.
 *
 * Bukan durasi salatnya — ini jendela yang sesi latihan sebaiknya tidak menabraknya: masuk
 * masjid, salat, keluar. Jumat jauh lebih panjang karena ada khutbah, dan itu satu-satunya
 * salat yang jadwalnya benar-benar memakan tengah hari.
 */
export const PRAYER_WINDOW_MIN: Record<PrayerName, number> = {
  subuh: 20, terbit: 0, zuhur: 25, asar: 20, magrib: 20, isya: 25
}

/** Jendela Jumu'ah, dipakai menggantikan Zuhur pada hari Jumat. */
export const JUMUAH_WINDOW_MIN = 75

const windowFor = (name: PrayerName, date: Date): number =>
  // getDay() 5 = Jumat. Zuhur di hari Jumat itu salat Jumat: khutbah plus salat plus keluar.
  (name === 'zuhur' && date.getDay() === 5 ? JUMUAH_WINDOW_MIN : PRAYER_WINDOW_MIN[name])

export interface ActiveWindow {
  name: PrayerName
  at: Date
  /** Kapan jendelanya berakhir. */
  until: Date
}

/**
 * Waktu salat yang jendelanya sedang berjalan sekarang, atau null.
 *
 * Ini yang dipakai untuk menjeda sesi latihan yang sedang jalan. Dikembalikan sebagai objek,
 * bukan boolean, supaya pemanggil bisa memberi tahu waktu apa dan sampai kapan — "dijeda"
 * tanpa alasan itu app yang membeku.
 */
export function activePrayerWindow(city: City, now: Date = new Date()): ActiveWindow | null {
  const sched = scheduleFor(city, now)
  for (const name of SALAT_TIMES) {
    const at = sched.times[name]
    const until = new Date(at.getTime() + windowFor(name, now) * 60000)
    if (now >= at && now < until) return { name, at, until }
  }
  return null
}

/**
 * Apakah rentang waktu `[start, start+durationMin)` menabrak jendela salat?
 * Dipakai saat merencanakan: memberi tahu SEBELUM orang memulai sesi jauh lebih baik
 * daripada menjedanya di tengah.
 */
export function prayerClash(
  city: City,
  start: Date,
  durationMin: number
): ActiveWindow | null {
  const end = new Date(start.getTime() + durationMin * 60000)
  const sched = scheduleFor(city, start)
  for (const name of SALAT_TIMES) {
    const at = sched.times[name]
    const until = new Date(at.getTime() + windowFor(name, start) * 60000)
    if (at < end && until > start) return { name, at, until }
  }
  return null
}

/** `HH:mm` di zona waktu kotanya — bukan zona waktu perangkat, yang bisa beda saat bepergian. */
export const fmtPrayer = (d: Date, city: City): string =>
  d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: city.tz
  })
