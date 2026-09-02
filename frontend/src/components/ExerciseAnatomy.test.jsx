import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Store dimock supaya tes ini tidak menarik localStorage, sync, atau mobile shim.
// Satu-satunya yang dibaca komponennya adalah S.body.
const mocks = vi.hoisted(() => ({ body: 'male' }))
vi.mock('../store/useStore.js', async () => {
  const React = await import('react')
  const useStore = (selector = state => state) => {
    void React
    return selector({ S: { body: mocks.body } })
  }
  return { useStore }
})

const { default: ExerciseAnatomy } = await import('./ExerciseAnatomy.jsx')
const { default: Media, Thumb } = await import('./Media.jsx')
const { EXDB } = await import('../lib/exercises-data.js')
const { demoFrames } = await import('../lib/exercise-media.js')

// Barbell bench press: tg 'pectorals' (primer), sm ['triceps', 'shoulders'] (sekunder).
// Dipilih karena punya SATU primer dan DUA sekunder — jadi pemisahan dua tingkatnya benar-benar
// terbukti, bukan kebetulan lolos karena semuanya satu tingkat.
const BENCH = Object.values(EXDB).find(e => e.id === '0025')

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

const render = async node => { await act(async () => { root.render(node) }) }

/**
 * BodyMap mengimpor geometri MuscleMap (~90 KB) secara dinamis dan menyimpannya di cache
 * tingkat-modul, jadi sampai promise itu selesai yang tergambar cuma placeholder. Satu
 * microtask tidak cukup: impornya harus selesai DULU, lalu setState-nya perlu tick
 * tersendiri untuk masuk. Jadi impornya dipaksa di sini, baru beberapa tick act.
 */
async function settleBodyPaths() {
  await import('../lib/body-paths.js')
  for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve() })
}

beforeEach(() => { mocks.body = 'male'; installDom() })
afterEach(async () => { await act(async () => { root.unmount() }) })

describe('ExerciseAnatomy', () => {
  it('memakai latihan katalog yang bentuknya memang diuji', () => {
    expect(BENCH).toBeTruthy()
    expect(BENCH.tg).toBe('pectorals')
    expect(BENCH.sm).toEqual(['triceps', 'shoulders'])
  })

  it('menyebut otot primer terpisah dari sekunder', async () => {
    await render(<ExerciseAnatomy ex={BENCH} />)
    const primary = container.querySelector('.exanat-p')
    const secondary = container.querySelector('.exanat-s')
    // 'pectorals' -> slug 'chest' -> nama 'Chest'; 'shoulders' -> 'deltoids' -> 'Shoulders'.
    expect(primary.textContent).toBe('Chest')
    expect(secondary.textContent).toContain('Shoulders')
    expect(secondary.textContent).toContain('Triceps')
    // Yang primer tidak boleh ikut muncul di daftar sekunder.
    expect(secondary.textContent).not.toContain('Chest')
  })

  it('memberi primer dan sekunder tingkat naungan yang BEDA, dan tingkatnya absolut', async () => {
    await render(<ExerciseAnatomy ex={BENCH} />)
    // Geometri MuscleMap diimpor dinamis; sampai dia mendarat yang tergambar cuma placeholder.
    // Yang diuji di sini keputusan tingkatnya, jadi tunggu path-nya ada dulu.
    await settleBodyPaths()

    const l4 = container.querySelectorAll('.bm-m.l4')
    const l2 = container.querySelectorAll('.bm-m.l2')
    expect(l4.length).toBeGreaterThan(0)
    expect(l2.length).toBeGreaterThan(0)

    // Ini inti kenapa THRESHOLDS dipatok dan bukan relatif: latihan satu-otot dan
    // multi-otot harus terbaca dengan aturan yang sama. Naungan relatif akan membuat
    // keduanya punya l4 di maksimumnya masing-masing, jadi tidak bisa dibandingkan.
    const soleTarget = { id: 'x', n: 'test', bp: 'chest', tg: 'pectorals', sm: [], st: [] }
    await render(<ExerciseAnatomy ex={soleTarget} />)
    await settleBodyPaths()
    expect(container.querySelectorAll('.bm-m.l4').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.bm-m.l2').length).toBe(0)
  })

  it('menghormati pilihan Ikhwan/Akhwat untuk bentuk tubuhnya', async () => {
    mocks.body = 'female'
    await render(<ExerciseAnatomy ex={BENCH} />)
    await settleBodyPaths()
    expect(container.querySelectorAll('svg.bm-v').length).toBe(2)   // depan + belakang
  })
})

describe('Media — tiga tingkat demo gerakan', () => {
  // Foto free-exercise-db (Unlicense). '0025' = barbell bench press, ada di petanya.
  const WITH_DEMO = Object.values(EXDB).find(e => e.id === '0025')
  // '0002' = 45° side bend — sengaja TIDAK ada di peta: nama tidak cocok aman ke dataset
  // mana pun, dan itu justru kasus yang harus jatuh ke diagram otot.
  const NO_DEMO = Object.values(EXDB).find(e => e.id === '0002')

  it('memakai fixture yang bentuknya memang diuji', () => {
    expect(demoFrames(WITH_DEMO).length).toBe(2)
    expect(demoFrames(NO_DEMO).length).toBe(0)
  })

  it('menampilkan foto demo dari CDN terpin kalau latihannya terpetakan', async () => {
    await render(<Media ex={WITH_DEMO} />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    /**
     * Commit terpin, bukan `main`: peta dan gambarnya dibangun terhadap commit yang sama, jadi
     * `main` yang bergerak bisa memisahkan keduanya tanpa suara.
     *
     * Yang dipaku SUMBERNYA-BOLEH-DUA. Tes ini dulu menuntut `free-exercise-db@`, dan itu jadi
     * salah begitu ilustrasi RepDB masuk: `demoFrames` memilih ilustrasi lebih dulu, jadi latihan
     * yang tercakup keduanya kini menyajikan `.webp` dari RepDB. Yang tetap wajib adalah commit
     * 40-heksa yang di-pin — itu invarian sebenarnya, dan nama CDN-nya cuma detail sumber.
     */
    expect(img.getAttribute('src')).toMatch(/@[0-9a-f]{40}\//)
    expect(img.getAttribute('src')).toMatch(/free-exercise-db|exercise-dataset/)
    expect(container.querySelector('.exanat')).toBeNull()
  })

  it('tap membolak-balik posisi awal dan posisi akhir', async () => {
    await render(<Media ex={WITH_DEMO} />)
    const first = container.querySelector('img').getAttribute('src')
    expect(container.querySelector('.gifhint').textContent).toContain('start position')

    await act(async () => { container.querySelector('.exmedia').click() })
    const second = container.querySelector('img').getAttribute('src')
    expect(second).not.toBe(first)
    expect(container.querySelector('.gifhint').textContent).toContain('end position')

    // Dan berputar kembali ke bingkai pertama.
    await act(async () => { container.querySelector('.exmedia').click() })
    expect(container.querySelector('img').getAttribute('src')).toBe(first)
  })

  it('jatuh ke peta otot, BUKAN kotak kosong, kalau tidak ada foto yang terpetakan', async () => {
    // Regresi yang dijaga: jalur lama mengembalikan null di sini. Itu benar waktu cuma latihan
    // buatan user yang tanpa media — tapi gambar Gym visual sudah dicabut karena lisensi, jadi
    // null berarti ribuan latihan kehilangan visualnya.
    await render(<Media ex={NO_DEMO} />)
    expect(container.querySelector('.exmedia.anat')).toBeTruthy()
    expect(container.querySelector('.exanat')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('gagal muat pun jatuh ke peta otot, bukan ikon gambar-rusak browser', async () => {
    await render(<Media ex={WITH_DEMO} />)
    expect(container.querySelector('img')).toBeTruthy()
    await act(async () => {
      container.querySelector('img').dispatchEvent(new dom.Event('error', { bubbles: false }))
    })
    expect(container.querySelector('.exmedia.anat')).toBeTruthy()
  })

  it('tingkat 4: latihan buatan user tanpa bagian tubuh TIDAK PERNAH kosong', async () => {
    // Ini yang ditemukan audit. Latihan buatan user melewati foto (tidak terpetakan) DAN
    // diagram otot (tidak ada bp/tg/sm untuk digambar), dan jalur lama mengembalikan null —
    // slot demo benar-benar kosong tanpa penjelasan. Dan itu kasus yang sering: orang membuat
    // latihan sendiri untuk mesin di gym-nya yang tidak ada di katalog.
    const custom = { id: 'buatan-user-1', n: 'Mesin aneh di gym gue', bp: '', tg: '', eq: '', sm: [], st: [] }
    await render(<Media ex={custom} />)
    const blank = container.querySelector('.exmedia.blank')
    expect(blank).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    // ACTIONABLE, bukan hiasan: mengisi bagian tubuhnya menaikkan latihan itu ke tingkat 3.
    expect(blank.textContent).toContain('body part')
  })

  it('tingkat 4 naik ke diagram otot begitu bagian tubuhnya diisi', async () => {
    const withBp = { id: 'buatan-user-2', n: 'Mesin aneh', bp: 'chest', tg: '', eq: '', sm: [], st: [] }
    await render(<Media ex={withBp} />)
    expect(container.querySelector('.exmedia.anat')).toBeTruthy()
    expect(container.querySelector('.exmedia.blank')).toBeNull()
  })

  it('AUDIT: setiap latihan katalog mendapat foto ATAU diagram otot — nol yang nihil', async () => {
    // Audit permanen. Kalau seseorang mengubah musclesOf atau BY_BODYPART dan sebuah kelompok
    // latihan kehilangan metadata ototnya, tes ini yang menangkapnya — bukan user yang
    // menemukan slot kosong di tengah sesi.
    const { musclesOf } = await import('../lib/muscles.js')
    const all = Object.values(EXDB)
    const nihil = all.filter(e =>
      demoFrames(e).length === 0 && Object.keys(musclesOf(e)).length === 0)
    expect(nihil.map(e => e.id + ' ' + e.n)).toEqual([])
    // Dan cakupan fotonya tidak boleh turun TANPA DISADARI — kata terakhir itu yang penting.
    // Angka ini pernah turun dengan sengaja (340 -> 338, tujuh foto beralat salah dibuang, lima
    // yang benar masuk), dan tes ini memang harus merah waktu itu supaya keputusannya dilihat
    // orang. Alasan lengkapnya di `catalogue-integrity.test.js`.
    const berfoto = all.filter(e => demoFrames(e).length > 0).length
    expect(berfoto).toBeGreaterThanOrEqual(376)
  })

  it('Thumb memakai bingkai pertama kalau ada, ikon kalau tidak — 50px terlalu kecil untuk peta otot', async () => {
    await render(<Thumb ex={WITH_DEMO} />)
    // Sumbernya boleh foto ATAU ilustrasi — lihat catatan di tes CDN terpin di atas.
    expect(container.querySelector('img.thumb')?.getAttribute('src')).toMatch(/@[0-9a-f]{40}\//)

    await render(<Thumb ex={NO_DEMO} />)
    expect(container.querySelector('.thumb-x')).toBeTruthy()
    expect(container.querySelector('.exanat')).toBeNull()
  })
})
