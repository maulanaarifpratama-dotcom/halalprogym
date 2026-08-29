import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `ramadanBands` memindai hari demi hari, dan berkas ini menjaga agar pemindaian itu tetap
 * SEKALI PER HARI.
 *
 * KENAPA BERKAS TERPISAH, DAN KENAPA BUKAN STOPWATCH
 *
 * Versi pertama penjaga ini mengukur `Date.now()` dan menuntut di bawah 3 detik. Dia HIJAU saat
 * berkasnya dijalankan sendirian — 816 ms — dan MERAH di suite penuh: 10.893 ms di bawah beban
 * worker paralel. Itu persis kelas kegagalan yang `no-wallclock-tests.test.ts` larang, cuma
 * variabelnya beban mesin alih-alih waktu salat. Akibatnya sama dan itu yang paling mahal: orang
 * menekan re-run, hijau, dan pelajarannya hilang.
 *
 * Yang sebenarnya layak dijaga bukan "berapa milidetik" — itu milik mesin — tapi "berapa kali
 * kerja per hari", yang milik kode. `toHijri` adalah satu-satunya kerja mahal di dalam
 * pemindaian, jadi menghitung panggilannya menjawab pertanyaannya langsung dan sama sekali tidak
 * bergantung pada mesin.
 *
 * `vi.mock` dengan `importOriginal` dipakai karena mengganti `Intl.DateTimeFormat` global TIDAK
 * BEKERJA di sini — dicoba lebih dulu, dan pembungkusnya tidak pernah terpanggil sama sekali.
 * Modulnya di-mock utuh, jadi berkas ini berdiri sendiri: `ramadan-bands.test.ts` memakai
 * `toHijri` ASLI untuk memverifikasi tanggalnya, dan mock di sini tidak boleh menyentuhnya.
 */

let panggilan = 0

vi.mock('./hijri.js', async importOriginal => {
  const asli = await importOriginal<typeof import('./hijri.js')>()
  return {
    ...asli,
    // Membungkus, bukan mengganti: nilainya tetap benar, cuma dihitung. Penjaga yang memalsukan
    // hasilnya akan menguji pemindaian atas kalender yang bukan kalender.
    toHijri: (...args: Parameters<typeof asli.toHijri>) => {
      panggilan++
      return asli.toHijri(...args)
    },
  }
})

const { ramadanBands } = await import('./ramadan-bands.js')

const DAY = 86400000
const ms = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()

describe('ramadanBands — kerjanya linear terhadap jumlah hari', () => {
  beforeEach(() => { panggilan = 0 })

  it('mock-nya benar-benar terpasang', () => {
    // Tanpa ini, mock yang gagal terpasang membuat seluruh berkas hijau tanpa mengukur apa pun —
    // kegagalan yang sudah pernah terjadi di repo ini dua kali sesi ini.
    ramadanBands(ms(2026, 1, 1), ms(2026, 1, 1) + 10 * DAY)
    expect(panggilan, 'toHijri tidak pernah terpanggil — mock tidak terpasang').toBeGreaterThan(0)
  })

  it('satu panggilan per hari, dengan kelonggaran konstan', () => {
    const HARI = 400
    ramadanBands(ms(2026, 1, 1), ms(2026, 1, 1) + HARI * DAY)
    // Longgar dengan sengaja: yang dicegah pertumbuhan KELAS, bukan penghematan satu-dua
    // panggilan. Kuadratik atas 400 hari berarti puluhan ribu, bukan ratusan.
    expect(panggilan, `${panggilan} panggilan untuk ${HARI} hari`).toBeLessThan(HARI + 5)
    expect(panggilan).toBeGreaterThanOrEqual(HARI)
  })

  it('menggandakan rentang menggandakan kerja, bukan mengkuadratkannya', () => {
    // Pemeriksaan bentuk, bukan angka mutlak: ini yang membedakan O(n) dari O(n²) tanpa perlu
    // tahu konstantanya.
    ramadanBands(ms(2026, 1, 1), ms(2026, 1, 1) + 200 * DAY)
    const kecil = panggilan
    panggilan = 0
    ramadanBands(ms(2026, 1, 1), ms(2026, 1, 1) + 400 * DAY)
    const besar = panggilan
    expect(besar / kecil, `${kecil} -> ${besar}`).toBeLessThan(2.5)
  })

  it('rentang yang ditolak guard TIDAK dipindai sama sekali', () => {
    // Inilah yang dulu diukur dengan stopwatch 100 ms di berkas sebelah. Nol panggilan adalah
    // pernyataan yang lebih kuat DAN tidak bisa merah karena mesinnya sedang sibuk.
    expect(ramadanBands(0, ms(9999, 1, 1))).toEqual([])
    expect(panggilan, 'guard-nya jebol — rentang absurd benar-benar dipindai').toBe(0)
  })
})
