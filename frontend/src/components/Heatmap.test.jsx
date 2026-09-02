// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Heatmap from './Heatmap.jsx'

/**
 * ROVING TABINDEX di heatmap 12 bulan.
 *
 * Sebelum 2026-09-02 setiap sel berisi adalah `<div onClick>`, jadi grafik ini tidak bisa
 * dijangkau keyboard sama sekali — dan itu tercatat sebagai pengecualian di
 * `list-rows.test.ts` dengan alasan "roving tabindex belum dikerjakan". Pengecualian yang
 * alasannya "belum dikerjakan" adalah utang, bukan keputusan.
 *
 * YANG DIJAGA DI SINI, dan kenapa masing-masing bisa rusak sendiri:
 *
 * 1. TEPAT SATU tab stop. Itu seluruh alasan pola ini ada: 371 sel yang semuanya `tabindex=0`
 *    memaksa orang menekan Tab ratusan kali untuk melewati satu grafik — memperburuk keyboard,
 *    bukan memperbaikinya. Kalau `tabIndex` salah tulis jadi `0` untuk semua, tesnya merah.
 * 2. Sel KOSONG bukan tombol. Tombol yang tidak melakukan apa-apa lebih buruk daripada bukan
 *    tombol, dan jumlah tombol harus sama dengan jumlah hari yang benar-benar dilatih.
 * 3. Panah bergerak, dan urutannya KRONOLOGIS. Bukan spasial — lihat catatan `role="grid"` di
 *    kepala `Heatmap.jsx`.
 * 4. Ujungnya berhenti, tidak melingkar. Melingkar di daftar linier membuat orang kehilangan
 *    tempat: dari sesi terakhir, Kanan harus diam.
 * 5. Setiap tombol punya NAMA. Selnya kotak 11px tanpa teks, jadi tanpa `aria-label` pembaca
 *    layar mendapat 371 "button" telanjang — kelas yang sama dengan checkbox set yang dulu
 *    tidak punya nama.
 */

const hariISO = n => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Tiga sesi, urut waktu: 20 hari lalu, 10 hari lalu, hari ini. */
const S = {
  unit: 'kg',
  workouts: [
    { id: 'a', d: hariISO(20), start: 0, end: 30 * 60000, vol: 1000 },
    { id: 'b', d: hariISO(10), start: 0, end: 45 * 60000, vol: 2000 },
    { id: 'c', d: hariISO(0), start: 0, end: 60 * 60000, vol: 3000 },
  ],
}

let host, root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (onDay = () => {}) => {
  act(() => root.render(<Heatmap S={S} onDay={onDay} />))
  // `.hm-legend` juga memakai `.hm-c`, jadi selnya diambil dari gridnya saja.
  const grid = host.querySelector('.hm-grid')
  return {
    grid,
    tombol: [...grid.querySelectorAll('button.hm-c')],
    div: [...grid.querySelectorAll('div.hm-c')],
  }
}

const tekan = (el, key) => act(() => {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }))
})

describe('heatmap bisa dijangkau keyboard', () => {
  it('tepat satu sel yang masuk urutan tab', () => {
    const { tombol } = render()
    const masuk = tombol.filter(b => b.tabIndex === 0)
    expect(
      masuk.length,
      'roving tabindex berarti SATU tab stop; ' + masuk.length + ' membuat orang menekan Tab '
      + 'ratusan kali untuk melewati grafik ini'
    ).toBe(1)
    expect(tombol.filter(b => b.tabIndex === -1).length).toBe(tombol.length - 1)
  })

  it('tab stop-nya jatuh ke sesi TERAKHIR, tempat grafiknya sudah di-scroll', () => {
    const { tombol } = render()
    const aktif = tombol.find(b => b.tabIndex === 0)
    expect(aktif).toBe(tombol[tombol.length - 1])
  })

  it('cuma hari yang dilatih yang jadi tombol', () => {
    const { tombol, div } = render()
    expect(tombol.length, 'satu tombol per hari yang punya sesi').toBe(3)
    // Sisanya tetap div, dan div TANPA handler — itu yang membuat penjaga di
    // `list-rows.test.ts` tidak lagi butuh pengecualian untuk berkas ini.
    expect(div.length).toBeGreaterThan(300)
  })

  it('setiap tombol punya nama, dan namanya membawa tanggal plus ringkasannya', () => {
    const { tombol } = render()
    for (const b of tombol) {
      const nama = b.getAttribute('aria-label')
      expect(nama, 'sel 11px tanpa teks butuh aria-label').toBeTruthy()
      expect(nama).toMatch(/\d/)
      // Judulnya sama dengan namanya: tooltip dan pembaca layar tidak boleh bercerita beda.
      expect(b.getAttribute('title')).toBe(nama)
    }
    // Dan tanggalnya BUKAN ISO mentah — itu yang dulu tampil di tooltip.
    expect(tombol[0].getAttribute('aria-label')).not.toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('panah bergerak kronologis, bukan spasial', () => {
    const { tombol } = render()
    const akhir = tombol[2]
    expect(akhir.tabIndex).toBe(0)

    tekan(akhir, 'ArrowLeft')
    let t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[1].tabIndex, 'Kiri = sesi sebelumnya').toBe(0)

    tekan(t[1], 'ArrowUp')
    t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[0].tabIndex, 'Atas dipetakan ke langkah yang sama dengan Kiri').toBe(0)

    tekan(t[0], 'ArrowRight')
    t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[1].tabIndex).toBe(0)
  })

  it('Home dan End melompat ke ujung', () => {
    const { tombol } = render()
    tekan(tombol[2], 'Home')
    let t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[0].tabIndex).toBe(0)
    tekan(t[0], 'End')
    t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[2].tabIndex).toBe(0)
  })

  it('ujungnya berhenti, tidak melingkar', () => {
    const { tombol } = render()
    // Kursor sudah di sesi terakhir; Kanan harus diam.
    tekan(tombol[2], 'ArrowRight')
    let t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[2].tabIndex, 'melingkar membuat orang kehilangan tempat di daftar linier').toBe(0)

    tekan(t[2], 'Home')
    t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    tekan(t[0], 'ArrowLeft')
    t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[0].tabIndex).toBe(0)
  })

  it('mengetuk sel membuka harinya, dan memindahkan kursor ke sana', () => {
    const onDay = vi.fn()
    const { tombol } = render(onDay)
    act(() => tombol[0].click())
    expect(onDay).toHaveBeenCalledTimes(1)
    expect(onDay.mock.calls[0][0]).toBe(hariISO(20))
    const t = [...host.querySelectorAll('.hm-grid button.hm-c')]
    expect(t[0].tabIndex, 'kursor menyusul ketukan, supaya Tab berikutnya kembali ke situ').toBe(0)
  })

  it('nol sesi: nol tombol, dan tidak melempar', () => {
    // Keadaan pemasangan baru. Ini yang dilihat setiap pengguna baru, dan yang paling jarang
    // dijalankan saat mengembangkan karena mesin pengembang selalu punya data.
    act(() => root.render(<Heatmap S={{ unit: 'kg', workouts: [] }} onDay={() => {}} />))
    const grid = host.querySelector('.hm-grid')
    expect(grid.querySelectorAll('button.hm-c').length).toBe(0)
    expect(grid.querySelectorAll('div.hm-c').length).toBeGreaterThan(300)
  })

  it('gridnya punya nama, jadi pembaca layar tahu dia masuk ke apa', () => {
    const { grid } = render()
    expect(grid.getAttribute('role')).toBe('group')
    expect(grid.getAttribute('aria-label')).toBeTruthy()
  })
})
