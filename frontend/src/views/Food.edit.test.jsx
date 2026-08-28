// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import Food from './Food.jsx'
import Modals from '../components/Modals.jsx'

/**
 * MENGEDIT makanan yang sudah tersimpan — jalur yang punya satu bug halus dan nyata.
 *
 * `validateFood`/`clean()` di layar ini menyimpan `undefined` untuk field opsional yang kosong,
 * dan itu keputusan yang benar: makanan cuma membawa apa yang benar-benar diisi, jadi berkas
 * cadangan dan baris Supabase tidak penuh nol yang tidak pernah dimasukkan siapa pun.
 *
 * Tapi lembar editnya merender `value={f.protein}` apa adanya. Untuk makanan tersimpan tanpa
 * protein, itu `value={undefined}` — dan React memperlakukan input itu sebagai TAK TERKENDALI,
 * lalu berpindah jadi terkendali begitu orang mengetik. React menulis error ke konsol untuk itu.
 *
 * Kenapa itu penting di repo ini: `views/smoke.test.jsx` melarang `console.error` sama sekali,
 * karena error yang dibiarkan akan menumpuk sampai tidak ada yang membacanya — dan saat itulah
 * error yang sungguhan lewat. Tapi smoke test cuma me-mount layarnya; dia tidak MEMBUKA lembar
 * edit, jadi dia tidak bisa melihat ini. Berkas ini yang menutup celah itu.
 *
 * Ditemukan dengan mengedit makanan sungguhan di browser dan membaca konsolnya, bukan dari gate.
 */
vi.mock('../lib/mobile.js', () => ({
  MOBILE: false,
  nativeLoad: async () => null,
  nativeSave: () => {},
  syncReminder: async () => true,
  writeAutoBackup: () => {},
  shareExport: async () => {},
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root
const errors = []
let realError

/** Makanan tersimpan per-100-g TANPA makro dan TANPA serving — persis bentuk yang bikin bug. */
const MAKANAN_MINIM = {
  id: 'f1',
  name: 'Nasi goreng',
  basis: 'per100g',
  kcal: 620,
  // protein / carb / fat / serving sengaja TIDAK ADA, sama seperti yang disimpan clean().
}

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  errors.length = 0
  realError = console.error
  console.error = (...a) => { errors.push(String(a[0])) }
  const S = JSON.parse(JSON.stringify(DEF))
  S.foods = [MAKANAN_MINIM]
  useStore.setState({ S, user: null, ready: true })
})

afterEach(() => {
  console.error = realError
  act(() => root.unmount())
  container.remove()
})

/**
 * Membuka lembar edit lewat baris "Your foods", seperti yang dilakukan orang.
 *
 * `<Modals />` HARUS ikut dirender. Lembar dibuka lewat `useUI.openSheet`, dan yang benar-benar
 * merendernya adalah `Modals` — bukan `Food`. Versi pertama tes ini cuma merender `Food`, jadi
 * lembarnya tidak pernah mount dan kedua assertion konsolnya HIJAU tanpa memeriksa apa pun.
 * Itu kegagalan yang sama dengan penjaga yang tidak memindai apa pun; ketangkap karena dua
 * assertion DOM di bawah merah sementara yang konsol hijau.
 */
function bukaLembarEdit() {
  // Food memakai useNavigate, jadi dia butuh Router — sama seperti di smoke test.
  act(() => root.render(<MemoryRouter><Food /><Modals /></MemoryRouter>))
  const baris = [...container.querySelectorAll('.item')].find(e => /Nasi goreng/.test(e.textContent))
  expect(baris, 'baris makanan harus ada di daftar').toBeTruthy()
  const props = Object.keys(baris).find(k => k.startsWith('__reactProps'))
  act(() => {
    baris[props].onClick({ stopPropagation() {}, preventDefault() {}, target: baris, currentTarget: baris })
  })
  // Bukti lembarnya benar-benar mount. Tanpa baris ini, setiap assertion di bawah bisa hijau
  // hampa — dan itu sudah terjadi sekali di berkas ini.
  expect(
    container.querySelectorAll('input').length,
    'lembar edit harus benar-benar terbuka; kalau nol, tes di bawah tidak memeriksa apa pun'
  ).toBeGreaterThan(2)
}

/**
 * Mengetik ke satu kolom, seperti orang yang mau melengkapi makro yang belum diisi.
 *
 * Langkah ini WAJIB dan bukan hiasan: React memperingatkan saat sebuah input BERPINDAH dari
 * tak-terkendali ke terkendali, bukan saat dia dirender pertama kali dengan `value={undefined}`.
 * Versi pertama tes ini cuma membuka lembarnya dan lolos di kedua arah — uji-baliknya tidak
 * pernah merah, dan itu yang mengungkap bahwa tesnya belum memeriksa apa pun.
 */
function ketikDiKolomKosong() {
  const el = [...container.querySelectorAll('input[type="number"]')].find(i => i.value === '')
  expect(el, 'harus ada kolom angka yang kosong untuk diketik').toBeTruthy()
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  act(() => {
    set.call(el, '18')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('mengedit makanan tersimpan tanpa makro', () => {
  it('mengetik di kolom makro yang kosong tidak menulis error React', () => {
    // Ini assertion intinya. "uncontrolled input to be controlled" muncul tepat di sini: kolom
    // itu dirender dari nilai `undefined` yang tersimpan, lalu jadi terkendali begitu diketik.
    bukaLembarEdit()
    ketikDiKolomKosong()
    const reactErr = errors.filter(e => /uncontrolled|controlled/i.test(e))
    expect(reactErr, 'kolom opsional harus dirender sebagai string kosong, bukan undefined')
      .toEqual([])
  })

  it('tidak ada error konsol apa pun sepanjang membuka lalu mengetik', () => {
    bukaLembarEdit()
    ketikDiKolomKosong()
    expect(errors).toEqual([])
  })

  it('kolom opsional yang kosong dirender sebagai string kosong', () => {
    // Diperiksa di DOM, bukan di props: yang menentukan React menganggapnya terkendali atau
    // tidak adalah nilai yang benar-benar sampai ke elemennya.
    bukaLembarEdit()
    const angka = [...container.querySelectorAll('input[type="number"]')]
    expect(angka.length, 'lembar edit harus punya kolom angka').toBeGreaterThan(0)
    for (const el of angka) {
      expect(el.value === '' || el.value === '620', 'nilai kolom: ' + JSON.stringify(el.value))
        .toBe(true)
    }
  })

  it('makanan yang PUNYA makro tetap menampilkan angkanya', () => {
    // Perbaikannya tidak boleh mengosongkan nilai yang memang ada. `?? ''` cuma menangkap
    // undefined, dan 0 harus tetap tampil sebagai 0.
    const S = JSON.parse(JSON.stringify(DEF))
    S.foods = [{ ...MAKANAN_MINIM, protein: 18, carb: 0, fat: 12, basis: 'perServing', serving: '1 porsi' }]
    useStore.setState({ S })
    bukaLembarEdit()
    const nilai = [...container.querySelectorAll('input')].map(i => i.value)
    expect(nilai).toContain('18')
    expect(nilai).toContain('12')
    expect(nilai).toContain('1 porsi')
    // Nol harus tampil sebagai "0", bukan hilang jadi kosong.
    expect(nilai).toContain('0')
  })
})
