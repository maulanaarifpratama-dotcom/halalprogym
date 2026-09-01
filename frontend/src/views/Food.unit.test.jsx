// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import Food from './Food.jsx'

/**
 * SATUAN YANG DITAMPILKAN, dan kenapa bug ini butuh tes yang MERENDER.
 *
 * Lembar katalog benar sepanjang jalan: dia menulis "Kemasan · 350 ml", bertanya "Berapa ml?", dan
 * menghitung 24 × 3,5 = 84 kkal dengan tepat. Lalu begitu tercatat, layar makan berbunyi
 * **"350 g"** dan "24 kcal per 100 g".
 *
 * Tidak ada satu pun tes unit yang bisa melihat itu, dan itu bukan kebetulan: `macrosOf` menghitung
 * `qty/100` yang benar untuk gram MAUPUN mililiter, jadi tidak ada angka yang salah dan tidak ada
 * yang melempar. Yang salah cuma tiga string di JSX yang menulis 'g' apa adanya.
 *
 * Jadi yang dipaku di sini TEKS YANG TAMPIL, di ketiga tempat sekaligus — karena memperbaiki satu
 * tempat lalu lupa dua lainnya adalah bentuk kegagalan yang sama persisnya.
 */

const iso = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0')
}

let wadah = null
let root = null

const pasang = (foods, meals) => {
  useStore.setState({ S: { ...DEF, foods, meals } })
  wadah = document.createElement('div')
  document.body.appendChild(wadah)
  root = createRoot(wadah)
  act(() => { root.render(<MemoryRouter><Food /></MemoryRouter>) })
  return wadah.textContent
}

afterEach(() => {
  if (root) act(() => root.unmount())
  if (wadah) wadah.remove()
  root = null
  wadah = null
})

describe('makanan cair tampil ml, bukan g', () => {
  let teks = ''
  beforeEach(() => {
    teks = pasang(
      [{ id: 'off:1', name: 'Pocari Sweat', basis: 'per100g', kcal: 24, unit: 'ml' }],
      [{ id: 'm1', d: iso(), foodId: 'off:1', qty: 350, at: Date.now() }]
    )
  })

  it('baris "Logged today" menulis 350 ml', () => {
    expect(teks).toMatch(/350\s*ml/)
  })

  it('dan TIDAK menulis 350 g', () => {
    // Penjaga arah sebaliknya: teks yang memuat KEDUANYA akan lolos tes di atas.
    expect(/350\s*g(?![a-z])/.test(teks), teks.slice(0, 200)).toBe(false)
  })

  it('baris "Your foods" menulis per 100 ml, bukan per 100 g', () => {
    expect(teks).toMatch(/per 100 ml/)
    expect(/per 100 g(?![a-z])/.test(teks)).toBe(false)
  })

  it('kalorinya tetap benar — yang salah satuannya, bukan hitungannya', () => {
    // 24 kkal per 100 ml x 350 ml = 84. Kalau angka ini bergeser, yang rusak `macrosOf` bukan
    // tampilan satuan, dan bedanya penting saat mendiagnosis.
    expect(teks).toMatch(/\b84\b/)
  })
})

describe('makanan padat tetap gram', () => {
  let teks = ''
  beforeEach(() => {
    teks = pasang(
      [{ id: 'off:2', name: 'Indomie Goreng', basis: 'per100g', kcal: 462 }],
      [{ id: 'm2', d: iso(), foodId: 'off:2', qty: 91, at: Date.now() }]
    )
  })

  it('makanan TANPA field satuan tampil gram, bukan "undefined"', () => {
    // Makanan yang sudah tersimpan di perangkat orang tidak punya field `unit`. Kalau defaultnya
    // tidak ditangani, barisnya berbunyi "91 undefined" — dan itu tampil ke semua pengguna lama.
    expect(teks).toMatch(/91\s*g/)
    expect(teks).not.toMatch(/undefined/)
  })

  it('baris "Your foods" menulis per 100 g', () => {
    expect(teks).toMatch(/per 100 g/)
  })
})
