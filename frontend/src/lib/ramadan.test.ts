import { describe, expect, it } from 'vitest'
import { cityById } from './prayer.js'
import {
  DEFAULT_RAMADAN,
  fastingWindow,
  holdFor,
  isFastingDay,
  isFastingNow,
  msUntilIftar,
  notificationAllowed,
  trainingWindows,
  workSetsFor,
  type RamadanSettings,
} from './ramadan.js'

const JAKARTA = cityById('jakarta')
const JAYAPURA = cityById('jayapura')

// Tanggal dipatok, tidak diambil dari jam sistem. Mode ini seluruhnya soal tanggal dan jam, dan
// tes yang memakai "hari ini" cuma gagal seminggu sekali — jenis kegagalan yang paling buruk.
const AHAD = new Date(2026, 7, 30, 12, 0, 0)     // 30 Agu 2026 = Ahad
const SENIN = new Date(2026, 7, 31, 12, 0, 0)
const SELASA = new Date(2026, 8, 1, 12, 0, 0)
const KAMIS = new Date(2026, 8, 3, 12, 0, 0)
const JUMAT = new Date(2026, 8, 4, 12, 0, 0)

const ON: RamadanSettings = { on: true, volumeKeepPct: 65 }
const SUNNAH: RamadanSettings = { sunnah: true, volumeKeepPct: 65 }

describe('isFastingDay', () => {
  it('mode Ramadan: setiap hari', () => {
    for (const d of [AHAD, SENIN, SELASA, KAMIS, JUMAT]) {
      expect(isFastingDay(ON, d), d.toDateString()).toBe(true)
    }
  })

  it('mode sunah: HANYA Senin dan Kamis', () => {
    expect(isFastingDay(SUNNAH, SENIN)).toBe(true)
    expect(isFastingDay(SUNNAH, KAMIS)).toBe(true)
    for (const d of [AHAD, SELASA, JUMAT]) {
      expect(isFastingDay(SUNNAH, d), d.toDateString()).toBe(false)
    }
  })

  it('mati berarti mati, dan setelan yang tidak ada tidak pernah dianggap puasa', () => {
    expect(isFastingDay({ on: false, sunnah: false }, SENIN)).toBe(false)
    expect(isFastingDay(null, SENIN)).toBe(false)
    expect(isFastingDay(undefined, SENIN)).toBe(false)
    expect(isFastingDay(DEFAULT_RAMADAN, SENIN)).toBe(false)
  })

  it('mode Ramadan menang atas mode sunah, bukan dijumlahkan', () => {
    // Kalau keduanya nyala, Ramadan yang berlaku — setiap hari, bukan cuma Senin/Kamis.
    expect(isFastingDay({ on: true, sunnah: true }, SELASA)).toBe(true)
  })
})

describe('fastingWindow', () => {
  it('mulai dari imsak dan berakhir di magrib', () => {
    const w = fastingWindow(JAKARTA, AHAD)
    expect(w.from.getTime()).toBeLessThan(w.to.getTime())
    // Puasa di Indonesia sekitar 12–14 jam; di luar rentang itu berarti ada yang salah.
    const jam = (w.to.getTime() - w.from.getTime()) / 3_600_000
    expect(jam).toBeGreaterThan(11.5)
    expect(jam).toBeLessThan(14.5)
  })

  it('panjang puasa berbeda antar kota — bukan jam tetap', () => {
    // Ini yang membuat jendelanya harus dihitung dari jadwal salat, bukan dibulatkan: Jayapura
    // dan Jakarta berbeda 40 derajat bujur dan 6 derajat lintang.
    const a = fastingWindow(JAKARTA, AHAD)
    const b = fastingWindow(JAYAPURA, AHAD)
    expect(a.from.getTime()).not.toBe(b.from.getTime())
    expect(a.to.getTime()).not.toBe(b.to.getTime())
  })
})

describe('isFastingNow', () => {
  const w = fastingWindow(JAKARTA, AHAD)

  it('true di tengah jam puasa', () => {
    const tengah = new Date((w.from.getTime() + w.to.getTime()) / 2)
    expect(isFastingNow(ON, JAKARTA, tengah)).toBe(true)
  })

  it('false SEBELUM imsak — itu masih waktu sahur', () => {
    expect(isFastingNow(ON, JAKARTA, new Date(w.from.getTime() - 60_000))).toBe(false)
  })

  it('false TEPAT di magrib dan sesudahnya — itu sudah berbuka', () => {
    expect(isFastingNow(ON, JAKARTA, w.to)).toBe(false)
    expect(isFastingNow(ON, JAKARTA, new Date(w.to.getTime() + 60_000))).toBe(false)
  })

  it('true tepat di imsak — batasnya inklusif di awal', () => {
    expect(isFastingNow(ON, JAKARTA, w.from)).toBe(true)
  })

  it('false di hari yang bukan hari puasa, walau jamnya di tengah', () => {
    const tengah = new Date((w.from.getTime() + w.to.getTime()) / 2)
    expect(isFastingNow(SUNNAH, JAKARTA, tengah)).toBe(false)   // Ahad, bukan Senin/Kamis
  })
})

describe('msUntilIftar', () => {
  it('null kalau sekarang bukan jam puasa', () => {
    expect(msUntilIftar(ON, JAKARTA, new Date(fastingWindow(JAKARTA, AHAD).to.getTime() + 1000))).toBe(null)
    expect(msUntilIftar(null, JAKARTA, AHAD)).toBe(null)
  })

  it('menghitung sisa waktu ke magrib', () => {
    const w = fastingWindow(JAKARTA, AHAD)
    const t = new Date(w.to.getTime() - 30 * 60_000)
    expect(msUntilIftar(ON, JAKARTA, t)).toBe(30 * 60_000)
  })
})

describe('holdFor — inti mode Ramadan', () => {
  const CURRENT = { weight: 100, reps: 8 }

  it('deload jadi hold, dan bebannya kembali ke beban SEBELUM puasa', () => {
    // Ini kegagalan yang mode ini ada untuk mencegahnya: reps gagal beberapa sesi karena puasa,
    // mesin memicu deload, dan sebulan begitu program mundur jauh.
    const p = { kind: 'deload', weight: 90, reps: 8, why: ['Stalled {0} sessions — deload to {1} {2}.', 3, 90, 'kg'] as [string, ...(string | number)[]] }
    const out = holdFor(p, true, CURRENT)
    expect(out.kind).toBe('hold')
    expect(out.weight).toBe(100)
  })

  it('naik juga jadi hold — jangan naik, jangan turun', () => {
    const p = { kind: 'up', weight: 102.5, reps: 8 }
    const out = holdFor(p, true, CURRENT)
    expect(out.kind).toBe('hold')
    expect(out.weight).toBe(100)
  })

  it('alasannya DIGANTI, bukan ditambahi', () => {
    // App menampilkan alasan di sebelah angkanya. Alasan lama akan berbohong tentang apa yang
    // baru saja terjadi.
    const p = { kind: 'deload', weight: 90, why: ['Stalled {0} sessions — deload to {1} {2}.', 3, 90, 'kg'] as [string, ...(string | number)[]] }
    const out = holdFor(p, true, CURRENT)
    expect(out.why?.[0]).toContain('Ramadan')
    // Yang harus hilang adalah TEMPLATE lamanya, bukan kata "deload" — pesan barunya memang
    // memuat kata itu ("bukan alasan untuk deload"), dan itu justru kalimat intinya.
    expect(out.why?.[0]).not.toBe(p.why[0])
    expect(out.why).toHaveLength(1)          // argumen resep lama tidak ikut terbawa
  })

  it('tidak menyentuh apa pun kalau tidak sedang puasa', () => {
    const p = { kind: 'deload', weight: 90, reps: 8 }
    expect(holdFor(p, false, CURRENT)).toBe(p)
  })

  it("'first' dilewatkan — belum ada catatan, jadi tidak ada yang bisa ditahan", () => {
    const p = { kind: 'first', why: ['Nothing logged yet — this session sets the baseline.'] as [string, ...(string | number)[]] }
    expect(holdFor(p, true, CURRENT)).toBe(p)
  })

  it("'off' dilewatkan — mode Ramadan tidak berhak menghidupkan progresi yang dimatikan orang", () => {
    const p = { kind: 'off' }
    expect(holdFor(p, true, CURRENT)).toBe(p)
  })

  it('mode waktu ikut ditahan di detik sebelum puasa', () => {
    const p = { kind: 'deload', sec: 40 }
    expect(holdFor(p, true, { sec: 60 }).sec).toBe(60)
  })

  it('kalau angka sekarang tidak diketahui, angka dari resepnya dipertahankan', () => {
    // Jangan pernah mengembalikan undefined di posisi beban: pemanggil menampilkannya.
    const p = { kind: 'up', weight: 102.5, reps: 8 }
    const out = holdFor(p, true, {})
    expect(out.weight).toBe(102.5)
    expect(out.reps).toBe(8)
  })
})

describe('workSetsFor — pangkas volume', () => {
  it('tidak menyentuh apa pun di hari bukan puasa', () => {
    expect(workSetsFor(4, ON, AHAD)).toBe(3)         // Ramadan: setiap hari
    expect(workSetsFor(4, SUNNAH, AHAD)).toBe(4)     // sunah: Ahad bukan hari puasa
    expect(workSetsFor(4, null, AHAD)).toBe(4)
  })

  it('menahan ~65% dan MEMBULATKAN KE ATAS', () => {
    // Ke bawah akan membuat latihan 2 set jadi 1 set — pangkasan 50%, jauh lebih dalam dari
    // yang diminta.
    expect(workSetsFor(2, ON, AHAD)).toBe(2)   // ceil(1.3)
    expect(workSetsFor(3, ON, AHAD)).toBe(2)   // ceil(1.95)
    expect(workSetsFor(4, ON, AHAD)).toBe(3)   // ceil(2.6)
    expect(workSetsFor(5, ON, AHAD)).toBe(4)   // ceil(3.25)
  })

  it('lantainya satu set — nol set berarti latihan yang DIHAPUS, bukan volume yang dipangkas', () => {
    expect(workSetsFor(1, ON, AHAD)).toBe(1)
    expect(workSetsFor(1, { on: true, volumeKeepPct: 40 }, AHAD)).toBe(1)
  })

  it('persentase di luar rentang dijepit, bukan dipercaya', () => {
    // State datang dari localStorage dan dari berkas cadangan; nilai gila harus tidak berbahaya.
    expect(workSetsFor(4, { on: true, volumeKeepPct: 0 }, AHAD)).toBe(2)      // dijepit ke 40
    expect(workSetsFor(4, { on: true, volumeKeepPct: 999 }, AHAD)).toBe(4)    // dijepit ke 100
    expect(workSetsFor(4, { on: true, volumeKeepPct: -50 }, AHAD)).toBe(2)
  })

  it('volumeKeepPct yang tidak ada jatuh ke default, bukan ke NaN', () => {
    expect(workSetsFor(4, { on: true }, AHAD)).toBe(3)
  })

  it('jumlah set yang tidak masuk akal tidak pernah mengembalikan nol', () => {
    for (const n of [0, -3, Number.NaN]) {
      expect(workSetsFor(n as number, ON, AHAD), String(n)).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('notificationAllowed', () => {
  const w = fastingWindow(JAKARTA, SENIN)
  const siang = new Date((w.from.getTime() + w.to.getTime()) / 2)
  const malam = new Date(w.to.getTime() + 60 * 60_000)

  it('MENAHAN "minum air" dan "waktunya makan" di jam puasa', () => {
    // Push "minum air" jam 2 siang saat orang berpuasa bukan cuma tidak berguna — dia
    // menyodorkan hal yang sedang dihindari dengan sengaja.
    expect(notificationAllowed('hydration', ON, JAKARTA, siang)).toBe(false)
    expect(notificationAllowed('meal', ON, JAKARTA, siang)).toBe(false)
  })

  it('MEMBIARKAN alarm rest timer dan pengingat hari latihan', () => {
    // Orang memang latihan saat puasa, dan menahan alarm rest timer merusak sesinya.
    expect(notificationAllowed('rest', ON, JAKARTA, siang)).toBe(true)
    expect(notificationAllowed('workout', ON, JAKARTA, siang)).toBe(true)
  })

  it('setelah berbuka semuanya boleh lagi', () => {
    expect(notificationAllowed('hydration', ON, JAKARTA, malam)).toBe(true)
    expect(notificationAllowed('meal', ON, JAKARTA, malam)).toBe(true)
  })

  it('tanpa mode puasa, tidak ada yang ditahan', () => {
    expect(notificationAllowed('hydration', null, JAKARTA, siang)).toBe(true)
    expect(notificationAllowed('hydration', SUNNAH, JAKARTA, new Date(2026, 7, 30, 14, 0, 0))).toBe(true)
  })
})

describe('trainingWindows', () => {
  it('jendela sebelum berbuka berakhir TEPAT di magrib', () => {
    const w = trainingWindows(JAKARTA, AHAD)
    const sched = fastingWindow(JAKARTA, AHAD)
    expect(w.beforeIftar.to.getTime()).toBe(sched.to.getTime())
    expect(w.beforeIftar.from.getTime()).toBe(sched.to.getTime() - 75 * 60_000)
  })

  it('jendela setelah Tarawih mulai setelah Isya, bukan di Isya', () => {
    const w = trainingWindows(JAKARTA, AHAD)
    expect(w.afterTarawih.from.getTime()).toBeGreaterThan(w.beforeIftar.to.getTime())
  })
})
