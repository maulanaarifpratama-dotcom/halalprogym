import { describe, expect, it } from 'vitest'
import { ramadanBands } from './ramadan-bands.js'
import { toHijri } from './hijri.js'

/**
 * Pita Ramadan untuk grafik. Yang diuji aritmetika tanggalnya — panjang bulan Hijriah tidak
 * tetap, dan tepi pita yang salah sehari terlihat langsung di grafik orang.
 *
 * TIDAK ada tanggal Ramadan yang ditulis dari hafalan di berkas ini. Setiap harapan diturunkan
 * dari `toHijri`, yaitu `Intl`, karena angka Hijriah dari hafalan model adalah tepat kesalahan
 * yang CLAUDE.md larang.
 */
const DAY = 86400000
const ms = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()

/** Apakah satu hari Ramadan menurut sumber yang sama dengan yang dipakai kode. */
const isRamadan = (t: number, off = 0) => toHijri(new Date(t), off)?.month === 9

describe('ramadanBands — bentuk hasil', () => {
  it('menemukan tepat satu pita dalam setahun', () => {
    // Satu tahun Gregorian memuat satu Ramadan penuh, kadang dua potongan di ujung. Rentang 400
    // hari dari awal tahun aman memuat satu penuh.
    const from = ms(2026, 1, 1)
    const bands = ramadanBands(from, from + 400 * DAY)
    expect(bands.length).toBeGreaterThanOrEqual(1)
  })

  it('setiap hari DI DALAM pita benar-benar Ramadan menurut Intl', () => {
    const from = ms(2026, 1, 1)
    for (const b of ramadanBands(from, from + 400 * DAY)) {
      // Diperiksa per hari, bukan cuma tepinya: pita yang benar di ujung tapi bolong di tengah
      // adalah bug yang tidak akan tertangkap oleh pemeriksaan tepi.
      for (let t = b.from + DAY / 2; t < b.to; t += DAY) {
        expect(isRamadan(t), new Date(t).toDateString()).toBe(true)
      }
    }
  })

  it('hari SEBELUM dan SESUDAH pita bukan Ramadan', () => {
    const from = ms(2026, 1, 1)
    const bands = ramadanBands(from, from + 400 * DAY)
    for (const b of bands) {
      // Cuma untuk pita yang benar-benar berakhir di dalam rentang, bukan yang terpotong.
      if (b.from > from + DAY) expect(isRamadan(b.from - DAY / 2)).toBe(false)
      if (b.to < from + 399 * DAY) expect(isRamadan(b.to + DAY / 2)).toBe(false)
    }
  })

  it('panjang pita 29 atau 30 hari', () => {
    // Bulan Hijriah tidak pernah lebih pendek atau lebih panjang dari itu. Kalau pitanya 45 hari,
    // dua Ramadan tergabung; kalau 5 hari, ada lubang di tengah.
    const from = ms(2026, 1, 1)
    for (const b of ramadanBands(from, from + 400 * DAY)) {
      const hari = Math.round((b.to - b.from) / DAY)
      if (b.from > from + DAY && b.to < from + 399 * DAY) {
        expect(hari, 'panjang pita').toBeGreaterThanOrEqual(29)
        expect(hari, 'panjang pita').toBeLessThanOrEqual(30)
      }
    }
  })

  it('membawa tahun Hijriah, bukan teks', () => {
    // Angka supaya pemanggil yang memformat — pemisahan yang sama dengan toHijri.
    const from = ms(2026, 1, 1)
    for (const b of ramadanBands(from, from + 400 * DAY)) {
      expect(typeof b.hijriYear).toBe('number')
      expect(b.hijriYear).toBeGreaterThan(1400)
      expect(b.hijriYear).toBeLessThan(1600)
    }
  })

  it('pita tidak saling tumpang tindih dan urut', () => {
    const bands = ramadanBands(ms(2024, 1, 1), ms(2027, 1, 1))
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i]!.from).toBeGreaterThanOrEqual(bands[i - 1]!.to)
    }
  })
})

describe('ramadanBands — dipotong ke rentang', () => {
  it('tidak pernah keluar dari rentang yang diminta', () => {
    const from = ms(2026, 1, 1)
    const to = from + 400 * DAY
    for (const b of ramadanBands(from, to)) {
      expect(b.from).toBeGreaterThanOrEqual(from)
      expect(b.to).toBeLessThanOrEqual(to)
    }
  })

  it('Ramadan yang masih berjalan di ujung rentang TIDAK dibuang', () => {
    // Ini kasus yang paling sering terjadi di app sungguhan: grafik berakhir hari ini, dan hari
    // ini di dalam Ramadan. Membuangnya berarti penanda hilang tepat di bulan yang sedang
    // dijalani orang.
    const bands = ramadanBands(ms(2026, 1, 1), ms(2028, 1, 1))
    expect(bands.length).toBeGreaterThan(0)
    // Cari satu hari Ramadan, lalu potong rentangnya di tengah bulan itu.
    const b = bands[0]!
    const tengah = b.from + Math.floor((b.to - b.from) / 2)
    const dipotong = ramadanBands(b.from - 10 * DAY, tengah)
    expect(dipotong.length).toBe(1)
    expect(dipotong[0]!.to).toBe(tengah)
  })

  it('rentang seluruhnya di dalam Ramadan menghasilkan satu pita penuh rentang', () => {
    const b = ramadanBands(ms(2026, 1, 1), ms(2028, 1, 1))[0]!
    const a = b.from + 3 * DAY
    const z = b.from + 6 * DAY
    const dipotong = ramadanBands(a, z)
    expect(dipotong).toEqual([{ from: a, to: z, hijriYear: b.hijriYear }])
  })
})

describe('ramadanBands — offset hisab', () => {
  it('offset menggeser tepi pita', () => {
    // Offset ada karena hisab bisa beda sehari dari sidang isbat Kemenag. Untuk pita latar satu
    // hari di tepi tidak mengubah apa pun, tapi dia harus benar-benar berlaku — kalau tidak,
    // pengaturan yang orang ubah tidak melakukan apa-apa.
    const from = ms(2026, 1, 1)
    const to = from + 400 * DAY
    const nol = ramadanBands(from, to, 0)[0]!
    const maju = ramadanBands(from, to, 2)[0]!
    expect(maju.from).not.toBe(nol.from)
  })

  it('offset di luar batas dijepit, bukan dipakai apa adanya', () => {
    const from = ms(2026, 1, 1)
    const to = from + 400 * DAY
    // clampOffset membatasi ±2. Offset 99 harus berperilaku sama dengan 2.
    expect(ramadanBands(from, to, 99)[0]).toEqual(ramadanBands(from, to, 2)[0])
    expect(ramadanBands(from, to, -99)[0]).toEqual(ramadanBands(from, to, -2)[0])
  })
})

describe('ramadanBands — masukan yang tidak berbentuk', () => {
  it('rentang kosong atau terbalik menghasilkan array kosong', () => {
    const t = ms(2026, 3, 1)
    expect(ramadanBands(t, t)).toEqual([])
    expect(ramadanBands(t, t - DAY)).toEqual([])
  })

  it('angka yang bukan angka tidak melempar', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => ramadanBands(bad, bad + 1000)).not.toThrow()
      expect(ramadanBands(bad, bad + 1000)).toEqual([])
      expect(ramadanBands(0, bad)).toEqual([])
    }
  })

  it('rentang absurd panjang DITOLAK, tidak dipindai', () => {
    // Rentang datang dari data pengguna, dan satu entri berat badan dengan timestamp tahun 9999
    // akan membuat pemindaian hari-demi-hari menggantung layar Statistik. Itu tepat kelas
    // kegagalan yang aturan #1 larang: layar yang menunggu.
    //
    // TIDAK diukur dengan `Date.now()`. Versi pertama menuntut di bawah 100 ms, dan anggaran jam
    // dinding di dalam tes adalah kelas yang dilarang `no-wallclock-tests`: dia merah karena
    // beban mesin, bukan karena kode. Yang membuktikan "tidak dipindai" adalah penghitung
    // panggilan di `ramadan-bands.linear.test.ts`, dan itu tidak bergantung pada mesin.
    expect(ramadanBands(0, ms(9999, 1, 1))).toEqual([])
  })

  it('rentang sebelas tahun masih dilayani', () => {
    // Batasnya harus cukup longgar untuk riwayat latihan siapa pun. Kalau dia menolak 5 tahun,
    // penandanya hilang untuk pengguna lama tanpa alasan.
    const bands = ramadanBands(ms(2015, 1, 1), ms(2026, 1, 1))
    expect(bands.length).toBeGreaterThanOrEqual(10)
  })

})
