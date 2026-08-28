/**
 * Jendela Ramadan yang bersinggungan dengan satu rentang waktu, untuk ditandai di grafik.
 *
 * MASALAH YANG DIJAWAB: GRAFIK BERAT BADAN YANG TERBACA SEBAGAI KEGAGALAN.
 *
 * Puasa sebulan menurunkan berat badan, dan itu wajar. Tapi grafik berat badan tidak tahu apa-apa
 * soal kalender: yang terlihat adalah penurunan tajam sebulan lalu naik lagi, dan setahun kemudian
 * orang yang menatapnya tidak punya cara tahu itu Ramadan, bukan program yang gagal. Penandanya
 * mengubah "ada yang salah di bulan itu" menjadi "itu Ramadan" tanpa satu kalimat penjelasan.
 *
 * KENAPA DARI KALENDER, BUKAN DARI SAKELAR PENGGUNA
 *
 * `S.ramadan` cuma menyimpan keadaan SEKARANG (`{ on, sunnah, volumeKeepPct }`) — tidak ada
 * riwayat kapan sakelarnya menyala. Jadi menandai grafik dari sakelar itu mustahil untuk masa
 * lalu, dan menambah riwayat berarti menambah state yang harus disinkronkan hanya demi anotasi.
 *
 * Ramadan adalah FAKTA KALENDER, dan itu bisa dihitung untuk tanggal mana pun. Sakelar di
 * Pengaturan menjawab pertanyaan yang berbeda — apakah mesin progresi ditahan — dan pertanyaan itu
 * memang harus manual, karena awal Ramadan ditetapkan sidang isbat.
 *
 * Konsekuensinya jujur dan harus disebut: penandanya memakai hisab Umm al-Qura + offset yang
 * dipilih pengguna, jadi tepinya bisa bergeser sehari dari ketetapan Kemenag. Untuk sebuah pita
 * latar di grafik, satu hari di tepi tidak mengubah apa pun — berbeda dari keputusan menahan
 * progresi, di mana satu hari berarti menahan beban di hari orang belum berpuasa. Perbedaan
 * kepentingan itulah alasan yang satu boleh otomatis dan yang lain tidak.
 *
 * BERKAS INI MURNI. Nol React, nol SVG. Yang bisa salah di sini adalah aritmetika tanggal, dan
 * itu bisa dites tanpa merender apa pun.
 */
import { clampOffset, toHijri } from './hijri.js'

const DAY_MS = 86400000

/** Satu pita untuk ditandai. `from`/`to` milidetik, `to` eksklusif di akhir hari terakhir. */
export interface RamadanBand {
  from: number
  to: number
  /** Tahun Hijriah pita ini, untuk label. Angka, bukan teks — pemanggil yang memformat. */
  hijriYear: number
}

/**
 * Batas aman jumlah hari yang dipindai.
 *
 * Rentang grafik datang dari data pengguna, dan data yang rusak bisa membawa tanggal tahun 1970
 * atau tahun 9999. Memindai hari demi hari tanpa batas berarti satu entri berat badan dengan
 * timestamp aneh menggantung layar Statistik — dan itu tepat kelas kegagalan yang aturan #1
 * larang. 20 tahun jauh melebihi riwayat latihan siapa pun di app ini.
 */
const MAX_DAYS = 366 * 20

/**
 * Pita Ramadan di dalam `[from, to]`.
 *
 * Dipindai per hari, bukan dihitung dengan rumus. Alasannya bukan kemalasan: panjang bulan
 * Hijriah tidak tetap, dan `Intl` adalah satu-satunya sumber yang benar di lingkungan ini.
 * Membuat rumus sendiri berarti membuat kalender sendiri, dan kalender buatan sendiri adalah
 * bagaimana app salah menentukan hari pertama Ramadan.
 *
 * Mengembalikan array kosong — bukan melempar — untuk rentang yang tidak berbentuk, dan untuk
 * lingkungan tanpa kalender Islam sama sekali (`toHijri` mengembalikan null di ICU yang
 * dipangkas). Grafik tanpa penanda tetap grafik yang benar; grafik yang gagal render tidak.
 */
export function ramadanBands(from: number, to: number, offsetDays = 0): RamadanBand[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
  if ((to - from) / DAY_MS > MAX_DAYS) return []

  const off = clampOffset(offsetDays)
  const bands: RamadanBand[] = []

  // Mulai dari tengah hari, supaya pergeseran zona waktu dan DST tidak melewatkan atau
  // menggandakan satu hari. Menambah 24 jam ke tengah hari selalu mendarat di hari berikutnya;
  // menambahnya ke tengah malam tidak, di hari peralihan DST.
  const start = new Date(from)
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0)

  let open: RamadanBand | null = null

  while (cursor.getTime() <= to + DAY_MS) {
    const h = toHijri(cursor, off)
    const isRamadan = h?.month === 9

    if (isRamadan && !open) {
      // Awal hari, bukan tengah hari: pita harus menutupi hari itu penuh di grafik.
      open = {
        from: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime(),
        to: 0,
        hijriYear: h.year,
      }
    } else if (!isRamadan && open) {
      // Akhir hari SEBELUMNYA. `cursor` sudah bukan Ramadan, jadi pitanya berhenti di awal
      // hari ini — yang sama dengan akhir hari terakhir Ramadan.
      open.to = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime()
      bands.push(open)
      open = null
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  // Ramadan yang masih berjalan di ujung rentang: ditutup di ujung rentang, bukan dibuang.
  // Membuangnya berarti penanda hilang tepat di bulan yang sedang dijalani orang.
  if (open) {
    open.to = to
    bands.push(open)
  }

  // Dipotong ke rentang yang diminta, supaya pemanggil tidak perlu menjepitnya sendiri saat
  // memetakan ke koordinat.
  return bands
    .map(b => ({ ...b, from: Math.max(b.from, from), to: Math.min(b.to, to) }))
    .filter(b => b.to > b.from)
}
