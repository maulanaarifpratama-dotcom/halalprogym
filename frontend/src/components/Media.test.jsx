// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Media from './Media.jsx'
import MAP from '../lib/exercise-media.json'
import { EXIDX } from '../lib/exercises.js'
import { hasAnatomy } from './ExerciseAnatomy.jsx'

/**
 * Penurunan bertingkat demo gerakan, dan kenapa dia butuh dipaku.
 *
 * Berkas ini lahir dari komentar saya sendiri yang SALAH. Saat menambahkan bundel foto ke APK,
 * skrip pengunduhnya diberi alasan "bingkai hilang tampil sebagai gambar rusak, bukan sebagai
 * diagram otot, karena hasDemo sudah bilang fotonya ada". Itu keliru: `Media.jsx` menangkap
 * `onError` pada <img> dan memang jatuh ke diagram otot.
 *
 * Alasan sebenarnya kenapa bingkai hilang tetap tidak boleh dibiarkan justru lebih halus — orang
 * kehilangan foto yang seharusnya dia punya dan TIDAK BISA membedakannya dari latihan yang belum
 * terpetakan, jadi lubangnya tidak pernah dilaporkan siapa pun. Dan seluruh argumen itu berdiri
 * di atas satu perilaku yang sampai sekarang tidak punya satu pun tes: fallback `onError`.
 *
 * Jadi berkas ini memaku perilaku yang dokumentasinya sudah bersandar padanya. Komentar yang
 * benar tapi tidak dijaga akan jadi komentar yang salah pada perubahan berikutnya.
 */
vi.mock('../store/useStore.js', () => {
  // `body` ikut: ExerciseAnatomy memilih siluet dari sana, dan tanpa itu diagramnya tidak
  // pernah muncul — yang akan membuat tes fallback di bawah gagal karena alasan yang salah.
  const snap = { S: { gifSize: 'full', body: 'male' }, update: () => {} }
  const useStore = selector => (selector ? selector(snap) : snap)
  useStore.getState = () => snap
  return { useStore }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

/** Latihan katalog yang PUNYA foto demo, diambil dari petanya sendiri. */
const withDemo = () => {
  const id = Object.keys(MAP).find(k => EXIDX[k])
  expect(id, 'peta media harus punya minimal satu latihan yang ada di katalog').toBeTruthy()
  return EXIDX[id]
}

/**
 * Latihan yang punya foto DAN metadata otot.
 *
 * Dua syarat, karena penurunannya berlapis: foto gagal jatuh ke diagram otot HANYA kalau otot
 * primernya diketahui. Tanpa itu dia jatuh satu tingkat lebih jauh, ke ikon bagian tubuh — juga
 * bukan kotak kosong, tapi bukan yang diuji di sini.
 */
const withDemoAndAnatomy = () => {
  const id = Object.keys(MAP).find(k => EXIDX[k] && hasAnatomy(EXIDX[k]))
  expect(id, 'harus ada latihan yang punya foto DAN metadata otot').toBeTruthy()
  return EXIDX[id]
}

const render = ex => act(() => root.render(<Media ex={ex} />))
const img = () => container.querySelector('img')

describe('Media — tingkat 1: foto demo', () => {
  it('menampilkan <img> untuk latihan yang punya foto', () => {
    render(withDemo())
    expect(img()).toBeTruthy()
    expect(img().getAttribute('src')).toContain('/')
  })

  it('alt-nya nama latihan, bukan kosong', () => {
    // <img> dengan alt kosong di dalam kartu latihan berarti pembaca layar tidak menyebut apa
    // yang sedang ditampilkan sama sekali.
    render(withDemo())
    expect(img().getAttribute('alt')).toBeTruthy()
  })
})

describe('Media — GAGAL MUAT jatuh ke tingkat berikutnya, bukan kotak rusak', () => {
  it('setelah onError, <img> hilang dan diagram otot yang muncul', () => {
    // INI perilaku yang seluruh argumen "bingkai hilang tidak terlihat rusak" bersandar padanya.
    const ex = withDemoAndAnatomy()
    render(ex)
    expect(img()).toBeTruthy()

    act(() => { img().dispatchEvent(new Event('error', { bubbles: true })) })

    expect(img(), 'foto harus dilepas setelah gagal muat').toBe(null)
    // Yang penting bukan bentuk persisnya, tapi bahwa ada sesuatu yang menggantikannya —
    // bukan lubang kosong, dan bukan ikon gambar-rusak bawaan browser.
    // Yang diperiksa blok diagramnya, BUKAN <svg>-nya: peta tubuh dimuat lazy dari chunk
    // body-paths (93 KB), jadi di dalam tes yang hadir dulu placeholder plus nama ototnya.
    // Memaku <svg> berarti memaku detail pemuatan, dan tesnya akan merah karena alasan yang
    // tidak ada hubungannya dengan fallback.
    expect(container.querySelector('.exmedia.anat'), 'blok diagram otot harus menggantikannya')
      .toBeTruthy()
    expect(container.textContent.trim().length, 'nama otot harus terbaca').toBeGreaterThan(0)
  })

  it('kegagalan TIDAK terbawa ke latihan berikutnya', () => {
    // Kegagalan disimpan sebagai id latihan, bukan boolean, justru karena satu komponen Media
    // dipakai ulang saat latihan berganti di dalam sesi. Boolean akan membuat satu foto yang
    // gagal menyembunyikan foto SEMUA latihan sesudahnya.
    const ids = Object.keys(MAP).filter(k => EXIDX[k])
    expect(ids.length).toBeGreaterThan(1)
    const [a, b] = [EXIDX[ids[0]], EXIDX[ids[1]]]

    render(a)
    act(() => { img().dispatchEvent(new Event('error', { bubbles: true })) })
    expect(img()).toBe(null)

    render(b)
    expect(img(), 'latihan berikutnya harus tetap mencoba fotonya').toBeTruthy()
  })
})

describe('Media — slot demo TIDAK PERNAH kosong', () => {
  it('setelah gagal muat, selalu ada isi yang terlihat', () => {
    // Properti yang benar-benar penting, dan yang lebih umum daripada "diagram otot muncul":
    // latihan tanpa metadata otot jatuh satu tingkat lebih jauh ke ikon bagian tubuh, dan itu
    // juga bukan kekosongan. Yang dilarang cuma satu: slot yang kosong.
    for (const id of Object.keys(MAP).filter(k => EXIDX[k]).slice(0, 12)) {
      render(EXIDX[id])
      const el = img()
      if (el) act(() => { el.dispatchEvent(new Event('error', { bubbles: true })) })
      const isi = container.textContent.trim().length
        + container.querySelectorAll('.exanat, .blank-i, svg').length
      expect(isi, id).toBeGreaterThan(0)
    }
  })
})

describe('Media — tanpa foto sama sekali', () => {
  it('latihan yang tidak terpetakan langsung ke diagram otot, tanpa <img>', () => {
    // Ini yang membuat 75% katalog tanpa foto tetap informatif, bukan kotak kosong. Dan ini juga
    // yang membuat bingkai HILANG tidak bisa dibedakan dari latihan yang belum terpetakan —
    // alasan sebenarnya kenapa scripts/fetch-demo-media.mjs gagal keras.
    const noDemo = Object.values(EXIDX).find(e => e && !MAP[e.id] && (e.bp || e.tgt))
    expect(noDemo, 'katalog harus punya latihan tanpa foto demo').toBeTruthy()
    render(noDemo)
    expect(img()).toBe(null)
  })
})
