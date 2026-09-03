import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Kartu jadwal salat — khususnya baris JENDELA LATIHAN yang cuma muncul di hari puasa.
 *
 * Kenapa ini butuh tes render dan bukan pemeriksaan di browser: barisnya bergantung pada dua
 * hal yang tidak bisa dipesan sekaligus, yaitu sakelar puasa DAN tanggal. Di hari biasa dengan
 * mode puasa mati — keadaan 95% waktu — barisnya tidak ada, jadi melihat layar tidak membuktikan
 * apa pun tentang cabang yang lain.
 *
 * Dan cabang yang lebih penting justru yang NEGATIF: baris ini tidak boleh muncul di hari biasa.
 * Saran "latihan sebelum berbuka" di hari orang tidak berpuasa bukan cuma tidak berguna, dia
 * salah — dan salah dengan cara yang menyentuh alasan app ini ada.
 */
const mocks = vi.hoisted(() => ({
  S: { city: 'jakarta', ramadan: { on: false, sunnah: false } },
}))

vi.mock('../store/useStore.js', () => ({
  useStore: (selector = s => s) => selector({ S: mocks.S }),
}))

const { default: PrayerCard } = await import('./PrayerCard.jsx')
const { cityById, fmtPrayer, scheduleFor } = await import('../lib/prayer.js')
const { trainingWindows } = await import('../lib/ramadan.js')

const JAKARTA = cityById('jakarta')

// Rabu 4 Maret 2026 — di dalam Ramadan 1447 menurut hisab, tapi yang menentukan di sini SAKELAR,
// bukan kalender. Tanggalnya dipatok supaya tesnya tidak bergantung pada jam sistem.
const RABU = new Date(2026, 2, 4, 10, 0, 0)
// Senin 2 Maret 2026 — hari puasa sunah. Kamis dan Senin yang dipakai mode sunah.
const SENIN = new Date(2026, 2, 2, 10, 0, 0)
// Rabu juga, tapi dipakai sebagai hari NON-puasa saat mode sunah menyala: Rabu bukan Senin/Kamis.
const RABU_BUKAN_SUNAH = RABU
// Jumat 28 Agustus 2026 — Rabiulawal 1448, jauh dari Ramadan. Dipakai untuk cabang NEGATIF
// isyarat kalender, dan tanggalnya dipatok supaya tesnya tidak bergantung pada jam sistem.
const BUKAN_RAMADAN = new Date(2026, 7, 28, 10, 0, 0)

let dom
let root
let container
let RealDate

/** Membekukan jam ke `at`, tanpa merusak Date.UTC / Date.now yang dipakai adhan. */
function freeze(at) {
  RealDate = globalThis.Date
  class Frozen extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(at.getTime())
      else super(...args)
    }
    static now() { return at.getTime() }
  }
  globalThis.Date = Frozen
}

function thaw() {
  if (RealDate) globalThis.Date = RealDate
  RealDate = null
}

function mount() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = dom.document.getElementById('root')
  root = createRoot(container)
  act(() => { root.render(React.createElement(PrayerCard)) })
}

beforeEach(() => {
  mocks.S = { city: 'jakarta', ramadan: { on: false, sunnah: false } }
})

afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  container = null
  thaw()
})

const text = () => container.textContent

describe('jendela latihan — cabang NEGATIF, yang paling penting', () => {
  it('TIDAK muncul saat mode puasa mati', () => {
    // Saran "latihan sebelum berbuka" di hari orang tidak berpuasa bukan cuma tidak berguna,
    // dia salah.
    freeze(RABU)
    mount()
    expect(text()).not.toContain('Good time to train')
    expect(container.querySelector('.prayer-train')).toBe(null)
  })

  it('TIDAK muncul di hari bukan Senin/Kamis saat mode SUNAH menyala', () => {
    // Mode sunah cuma berlaku dua hari. Rabu bukan salah satunya.
    mocks.S = { city: 'jakarta', ramadan: { on: false, sunnah: true } }
    freeze(RABU_BUKAN_SUNAH)
    mount()
    expect(container.querySelector('.prayer-train')).toBe(null)
  })

  it('jadwal salatnya tetap tampil penuh walau barisnya tidak ada', () => {
    // Barisnya opsional; kartunya tidak. Kalau cabang puasa mematahkan kartunya, orang kehilangan
    // jadwal salat — hal yang jadi alasan kartu ini ada.
    freeze(RABU)
    mount()
    expect(text()).toContain(fmtPrayer(scheduleFor(JAKARTA, RABU).times.magrib, JAKARTA))
  })
})

describe('jendela latihan — cabang POSITIF', () => {
  it('muncul saat mode Ramadan menyala', () => {
    mocks.S = { city: 'jakarta', ramadan: { on: true, sunnah: false } }
    freeze(RABU)
    mount()
    expect(container.querySelector('.prayer-train')).toBeTruthy()
  })

  it('muncul di Senin saat mode SUNAH menyala', () => {
    mocks.S = { city: 'jakarta', ramadan: { on: false, sunnah: true } }
    freeze(SENIN)
    mount()
    expect(container.querySelector('.prayer-train')).toBeTruthy()
  })

  it('jamnya sama dengan trainingWindows, bukan dihitung ulang di UI', () => {
    // Kalau UI menghitung sendiri, dia akan menyimpang dari logika yang bertes. Ini yang memaku
    // bahwa angkanya benar-benar datang dari lib/ramadan.ts.
    mocks.S = { city: 'jakarta', ramadan: { on: true, sunnah: false } }
    freeze(RABU)
    mount()
    const w = trainingWindows(JAKARTA, RABU)
    expect(text()).toContain(fmtPrayer(w.beforeIftar.from, JAKARTA))
    expect(text()).toContain(fmtPrayer(w.beforeIftar.to, JAKARTA))
    expect(text()).toContain(fmtPrayer(w.afterTarawih.from, JAKARTA))
  })

  it('jendela sebelum berbuka BERAKHIR tepat di Magrib', () => {
    // Selesai lalu langsung berbuka — itu seluruh gunanya. Jendela yang berakhir setelah Magrib
    // akan menyarankan latihan di waktu berbuka.
    mocks.S = { city: 'jakarta', ramadan: { on: true, sunnah: false } }
    freeze(RABU)
    mount()
    const w = trainingWindows(JAKARTA, RABU)
    expect(+w.beforeIftar.to).toBe(+scheduleFor(JAKARTA, RABU).times.magrib)
    expect(+w.beforeIftar.from).toBeLessThan(+w.beforeIftar.to)
  })

  it('jendela setelah Tarawih dimulai SETELAH Isya', () => {
    const w = trainingWindows(JAKARTA, RABU)
    expect(+w.afterTarawih.from).toBeGreaterThan(+scheduleFor(JAKARTA, RABU).times.isya)
  })
})

describe('kartu tetap utuh untuk state yang belum lengkap', () => {
  it('ramadan yang tidak ada di state tidak melempar', () => {
    // State lama dari cadangan atau dari versi sebelum mode Ramadan tidak punya kunci ini.
    mocks.S = { city: 'jakarta' }
    freeze(RABU)
    expect(() => mount()).not.toThrow()
    expect(container.querySelector('.prayer-train')).toBe(null)
  })

  it('kota yang tidak dikenal tidak melempar', () => {
    mocks.S = { city: 'kota-yang-tidak-ada', ramadan: { on: true, sunnah: false } }
    freeze(RABU)
    expect(() => mount()).not.toThrow()
  })
})

/**
 * ISYARAT KALENDER RAMADAN — dan kenapa dia ada meski sakelarnya sengaja manual.
 *
 * `isRamadanByHisab` sudah ada dan bertes sejak mode Ramadan dipasang, dan docstring-nya
 * menyatakan "dipakai kartu Home untuk memberi konteks". Pemanggilnya **NOL** sampai
 * 2026-09-02 — klaim tentang pemanggilan yang tidak pernah ada, kelas `trainingWindows` yang
 * sama persis.
 *
 * Yang menutupnya bukan menghapus fungsinya. Dua hal benar sekaligus di repo ini:
 *
 *   · mode Ramadan ADA karena mesin progresi tidak tahu itu Ramadan dan akan MEREGRESI beban;
 *   · sakelarnya MANUAL karena awal Ramadan ditetapkan sidang isbat, dan menyala sehari lebih
 *     awal berarti menahan beban di hari orang belum berpuasa.
 *
 * Di antara keduanya ada lubang: orang yang tidak tahu setelan itu ada berpuasa sebulan penuh
 * sementara bebannya diregresi. Baris ini menutupnya tanpa menyentuh sakelarnya — beda
 * kepentingan yang sama dengan pita Ramadan di grafik berat badan, yang juga dihitung dari
 * kalender justru karena dia bukan gerbang.
 */
describe('isyarat kalender Ramadan', () => {
  it('TIDAK muncul di luar Ramadan — cabang yang paling penting', () => {
    // 95% waktu app dipakai di luar Ramadan. Isyarat yang salah muncul di sini menyuruh orang
    // menyalakan mode yang akan MENAHAN bebannya tanpa alasan — kerugian yang sama arah dengan
    // yang mau dicegah, cuma kebalikannya.
    freeze(BUKAN_RAMADAN)
    mount()
    expect(container.querySelector('.prayer-hint')).toBe(null)
  })

  it('muncul saat kalender Ramadan dan modenya MATI', () => {
    freeze(RABU)   // 4 Maret 2026, di dalam Ramadan 1447 menurut hisab
    mount()
    expect(container.querySelector('.prayer-hint')).toBeTruthy()
  })

  it('TIDAK muncul saat modenya sudah menyala — tidak ada yang perlu diberitahu', () => {
    mocks.S = { city: 'jakarta', ramadan: { on: true, sunnah: false } }
    freeze(RABU)
    mount()
    expect(container.querySelector('.prayer-hint')).toBe(null)
  })

  it('TETAP muncul saat cuma mode SUNAH yang menyala', () => {
    // Di bulan Ramadan SETIAP hari puasa, jadi mode Senin-Kamis memang tidak cukup — dan orang
    // yang menyalakannya justru orang yang paling mungkin belum tahu ada mode penuhnya.
    mocks.S = { city: 'jakarta', ramadan: { on: false, sunnah: true } }
    freeze(RABU)
    mount()
    expect(container.querySelector('.prayer-hint')).toBeTruthy()
  })

  it('`ramadan` yang tidak ada di state tidak melempar, dan isyaratnya tetap muncul', () => {
    // State dari versi sebelum mode Ramadan ada. Boot berikutnya menambal dari DEF, tapi sesi
    // ini tidak boleh mati — dan orang itu justru yang paling butuh isyaratnya.
    mocks.S = { city: 'jakarta' }
    freeze(RABU)
    expect(() => mount()).not.toThrow()
    expect(container.querySelector('.prayer-hint')).toBeTruthy()
  })

  it('kelasnya BEDA dari jendela latihan, bukan berbagi satu kelas', () => {
    // Versi pertama memakai `.prayer-train` untuk keduanya, dan tiga tes di atas langsung
    // merah — tanggal yang mereka pakai memang di dalam Ramadan menurut hisab. Kalau kelasnya
    // digabung lagi, asersi "jendela latihan tidak muncul" berhenti berarti apa pun.
    mocks.S = { city: 'jakarta', ramadan: { on: false, sunnah: false } }
    freeze(RABU)
    mount()
    expect(container.querySelector('.prayer-hint')).toBeTruthy()
    expect(container.querySelector('.prayer-train'), 'modenya mati, jadi tidak ada jendela latihan')
      .toBe(null)
  })
})
