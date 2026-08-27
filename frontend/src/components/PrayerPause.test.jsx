import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Jeda salat: apakah banner-nya muncul TEPAT saat jendela salat berjalan, dan apakah dia
 * menghentikan timer istirahat sekali saja.
 *
 * Kenapa ini butuh tes render, bukan pemeriksaan di browser: banner-nya hanya ada di dalam
 * jendela salat, yang totalnya beberapa puluh menit sehari. Memverifikasinya dengan melihat
 * layar berarti menunggu jam yang tepat, dan sesi berikutnya yang mengubah komponen ini tidak
 * akan menunggu.
 */
const mocks = vi.hoisted(() => ({
  S: { city: 'jakarta', prayerPause: true },
  stopRest: null,
}))

vi.mock('../store/useStore.js', () => ({
  useStore: (selector = s => s) => selector({ S: mocks.S }),
}))
vi.mock('../store/useUI.js', () => ({
  useUI: (selector = s => s) => selector({ stopRest: mocks.stopRest }),
}))

const { default: PrayerPause } = await import('./PrayerPause.jsx')
const { cityById, scheduleFor, fmtPrayer, PRAYER_WINDOW_MIN } = await import('../lib/prayer.js')

const JAKARTA = cityById('jakarta')

// Kamis 3 September 2026 — hari biasa, bukan Jumat, jadi jendela Zuhur memakai 25 menit dan
// bukan 75 menit jendela salat Jumat. Tanggalnya dipatok, bukan diambil dari jam sistem.
const KAMIS = new Date(2026, 8, 3, 12, 0, 0)
const SCHED = scheduleFor(JAKARTA, KAMIS)

let dom, root, container

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

/**
 * Menetapkan "sekarang" — komponennya memanggil `new Date()` tanpa argumen.
 *
 * `vi.setSystemTime`, bukan subclass Date bikinan sendiri. Percobaan pertama saya menukar
 * `globalThis.Date` dengan subclass, dan itu pecah dua kali: `adhan` memakai `Date.UTC` di
 * internalnya, dan pemulihan antar-tes menyisakan Date yang undefined. Timer palsu vitest sudah
 * menangani keduanya, plus setInterval yang memang perlu dimajukan di salah satu tes.
 */
const freezeAt = instant => vi.setSystemTime(instant)

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  installDom()
  mocks.S = { city: 'jakarta', prayerPause: true }
  mocks.stopRest = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

const render = async () => { await act(async () => { root.render(<PrayerPause />) }) }

describe('PrayerPause', () => {
  it('tidak menampilkan apa pun di luar jendela salat', async () => {
    // Satu jam sebelum Zuhur: tidak ada jendela yang berjalan.
    freezeAt(new Date(SCHED.times.zuhur.getTime() - 3_600_000))
    await render()
    expect(container.textContent.trim()).toBe('')
    expect(mocks.stopRest).not.toHaveBeenCalled()
  })

  it('muncul di dalam jendela Zuhur, dengan nama waktunya dan jam berakhirnya', async () => {
    freezeAt(new Date(SCHED.times.zuhur.getTime() + 5 * 60_000))
    await render()
    const teks = container.textContent
    expect(teks).toContain('Zuhur')
    // Jam berakhirnya harus tampil, dan dibandingkan lewat fmtPrayer — bukan lewat
    // `until.getHours()`. Yang kedua memakai zona waktu PERANGKAT sementara banner-nya memakai
    // zona waktu KOTA, jadi tesnya akan lulus di mesin WIB dan gagal di mesin lain.
    const until = new Date(SCHED.times.zuhur.getTime() + PRAYER_WINDOW_MIN.zuhur * 60_000)
    expect(teks).toContain(fmtPrayer(until, JAKARTA))
  })

  it('MENGHENTIKAN timer istirahat saat jendelanya dibuka', async () => {
    // Ini alasan utama komponen ini ada: timer yang berbunyi saat orang sedang salat adalah
    // gangguan di momen yang paling tidak boleh diganggu.
    freezeAt(new Date(SCHED.times.asar.getTime() + 60_000))
    await render()
    expect(mocks.stopRest).toHaveBeenCalledTimes(1)
  })

  it('menghentikan timer SEKALI per jendela, bukan tiap pemeriksaan', async () => {
    // Tanpa penanda per-jendela, tiap tick 20 detik akan mematikan timer baru yang mungkin
    // sengaja dijalankan orang setelah dia kembali dari salat.
    freezeAt(new Date(SCHED.times.asar.getTime() + 60_000))
    await render()
    for (let i = 0; i < 5; i++) {
      await act(async () => { vi.advanceTimersByTime(20_000) })
    }
    expect(mocks.stopRest).toHaveBeenCalledTimes(1)
  })

  it('sakelar mati berarti tidak ada banner dan tidak ada timer yang dihentikan', async () => {
    mocks.S = { city: 'jakarta', prayerPause: false }
    freezeAt(new Date(SCHED.times.zuhur.getTime() + 5 * 60_000))
    await render()
    expect(container.textContent.trim()).toBe('')
    expect(mocks.stopRest).not.toHaveBeenCalled()
  })

  it('sakelar yang belum pernah disetel dianggap NYALA', async () => {
    // Ini salah satu alasan app ini ada; default-nya tidak boleh mati cuma karena state lama
    // belum punya field-nya.
    mocks.S = { city: 'jakarta' }
    freezeAt(new Date(SCHED.times.zuhur.getTime() + 5 * 60_000))
    await render()
    expect(container.textContent).toContain('Zuhur')
  })

  it('tombol tutup menyembunyikan banner-nya', async () => {
    freezeAt(new Date(SCHED.times.zuhur.getTime() + 5 * 60_000))
    await render()
    const btn = container.querySelector('button')
    expect(btn).toBeTruthy()
    await act(async () => { btn.dispatchEvent(new dom.Event('click', { bubbles: true })) })
    expect(container.textContent.trim()).toBe('')
  })

  it('memakai kota yang dipilih, bukan kota default', async () => {
    // Jayapura 40 derajat lebih timur: Zuhur-nya jatuh pada instan yang berbeda, jadi jam yang
    // menampilkan banner untuk Jakarta tidak boleh menampilkannya untuk Jayapura.
    const jayapura = cityById('jayapura')
    const sJaya = scheduleFor(jayapura, KAMIS)
    expect(Math.abs(sJaya.times.zuhur - SCHED.times.zuhur)).toBeGreaterThan(30 * 60_000)

    mocks.S = { city: 'jayapura', prayerPause: true }
    freezeAt(new Date(SCHED.times.zuhur.getTime() + 5 * 60_000))
    await render()
    expect(container.textContent.trim()).toBe('')
  })
})
