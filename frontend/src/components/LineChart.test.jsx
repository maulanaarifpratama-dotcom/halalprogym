// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LineChart from './LineChart.jsx'
import { fmtDate, isoOf } from '../lib/format.js'

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

const point = (year, month, day, y) => ({
  d: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  t: new Date(year, month - 1, day, 12).getTime(),
  y
})

const firstPoints = [
  { t: Date.UTC(2026, 0, 1), y: 80, d: '2026-01-01' },
  { t: Date.UTC(2026, 0, 15), y: 82, d: '2026-01-15' },
]
const nextPoints = [
  { t: Date.UTC(2026, 1, 1), y: 78, d: '2026-02-01' },
  { t: Date.UTC(2026, 1, 15), y: 79, d: '2026-02-15' },
]

function renderChart(points) {
  act(() => root.render(<LineChart points={points} axes={false} unit="kg" />))
}

function hoverAt(clientX) {
  act(() => {
    container.querySelector('.chart-i').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX }))
  })
  return container.querySelector('.ctip').textContent
}

describe('LineChart hover date', () => {
  it('keeps same-year points in the compact format', () => {
    const first = point(2026, 1, 15, 70)
    renderChart([first, point(2026, 2, 15, 71)])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true)} · 70 kg`)
  })

  it('includes the calendar year at a short cross-year boundary', () => {
    const first = point(2025, 11, 30, 70)
    const last = point(2026, 2, 1, 71)
    renderChart([first, last])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true, true)} · 70 kg`)
    expect(hoverAt(340)).toBe(`${fmtDate(last.d, true, true)} · 71 kg`)
  })

  it('keeps a single point compact', () => {
    const only = point(2026, 7, 4, 70)
    renderChart([only])

    expect(hoverAt(170)).toBe(`${fmtDate(only.d, true)} · 70 kg`)
  })

  it('uses timestamp-only points when deciding whether to show the year', () => {
    const first = point(2025, 12, 31, 70)
    const last = point(2026, 1, 1, 71)
    const timestampOnly = [{ t: first.t, y: first.y }, { t: last.t, y: last.y }]
    renderChart(timestampOnly)

    const lastIso = isoOf(new Date(last.t))
    expect(hoverAt(340)).toBe(`${fmtDate(lastIso, true, true)} · 71 kg`)
  })
})

describe('LineChart hover state', () => {
  it('clears the tooltip and hover markers when points are replaced, then allows hovering again', () => {
    renderChart(firstPoints)
    hoverAt(170)

    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()
    expect(container.querySelector('.chl')).toBeTruthy()

    renderChart(nextPoints)

    expect(container.querySelector('.ctip')).toBeNull()
    expect(container.querySelector('.cvl')).toBeNull()
    expect(container.querySelector('.chl')).toBeNull()

    hoverAt(170)
    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()
  })
})

describe('bands — pita latar penanda periode', () => {
  const pts = [
    { t: new Date(2026, 0, 1, 12).getTime(), y: 80, d: '2026-01-01' },
    { t: new Date(2026, 5, 1, 12).getTime(), y: 76, d: '2026-06-01' },
  ]
  const rects = () => [...container.querySelectorAll('svg rect')]
  const render = bands => act(() => root.render(<LineChart points={pts} axes={false} bands={bands} />))

  it('tanpa bands tidak ada satu pun rect', () => {
    // Grafik lain di app ini tidak mengirim `bands`, dan mereka tidak boleh mendapat node
    // tambahan apa pun. `rect` juga satu-satunya bentuk yang dipakai penanda ini, jadi
    // jumlahnya bisa dipakai sebagai penghitung langsung.
    render(null)
    expect(rects()).toHaveLength(0)
    render([])
    expect(rects()).toHaveLength(0)
  })

  it('satu pita jadi satu rect', () => {
    render([{ from: pts[0].t, to: pts[1].t }])
    expect(rects()).toHaveLength(1)
  })

  it('pita di LUAR rentang data dibuang, bukan digambar di luar area plot', () => {
    // Pita yang sepenuhnya sebelum titik pertama atau setelah titik terakhir tidak punya tempat
    // di grafik. Menggambarnya berarti kotak yang menempel di tepi dan terbaca seperti bug.
    render([{ from: pts[0].t - 60 * 86400000, to: pts[0].t - 30 * 86400000 }])
    expect(rects()).toHaveLength(0)
    render([{ from: pts[1].t + 30 * 86400000, to: pts[1].t + 60 * 86400000 }])
    expect(rects()).toHaveLength(0)
  })

  it('pita yang menjorok keluar DIJEPIT ke area plot', () => {
    const el = (() => { render([{ from: pts[0].t - 999 * 86400000, to: pts[1].t + 999 * 86400000 }]); return rects()[0] })()
    expect(el).toBeTruthy()
    // Kiri tidak boleh lebih kiri dari padding kiri, kanan tidak melewati lebar viewBox.
    const x = Number(el.getAttribute('x'))
    const w = Number(el.getAttribute('width'))
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x + w).toBeLessThanOrEqual(340)
  })

  it('label ditampilkan kalau pitanya lebar', () => {
    render([{ from: pts[0].t, to: pts[1].t, label: 'Ramadan' }])
    const teks = [...container.querySelectorAll('svg text')].map(t => t.textContent)
    expect(teks).toContain('Ramadan')
  })

  it('label DISEMBUNYIKAN kalau pitanya terlalu sempit', () => {
    // Teks yang terpotong setengah lebih buruk daripada tidak ada teks: dia terbaca seperti
    // render yang rusak, bukan seperti anotasi.
    const span = pts[1].t - pts[0].t
    render([{ from: pts[0].t, to: pts[0].t + Math.round(span * 0.01), label: 'Ramadan' }])
    const teks = [...container.querySelectorAll('svg text')].map(t => t.textContent)
    expect(teks).not.toContain('Ramadan')
  })

  it('pita digambar SEBELUM kurvanya di urutan DOM', () => {
    // SVG tidak punya z-index; urutan dokumen yang menentukan. Pita yang digambar setelah
    // polyline akan menutupi datanya sendiri — anotasi tidak boleh bersaing dengan data.
    render([{ from: pts[0].t, to: pts[1].t }])
    const svg = container.querySelector('svg')
    const anak = [...svg.children]
    const iPita = anak.findIndex(n => n.tagName === 'g' && n.querySelector('rect'))
    const iKurva = anak.findIndex(n => n.tagName === 'polyline')
    expect(iPita).toBeGreaterThanOrEqual(0)
    expect(iKurva).toBeGreaterThanOrEqual(0)
    expect(iPita).toBeLessThan(iKurva)
  })

  it('pita tidak melempar untuk masukan yang tidak berbentuk', () => {
    for (const bad of [[{ from: NaN, to: NaN }], [{}], [{ from: pts[0].t }]]) {
      expect(() => render(bad)).not.toThrow()
    }
  })
})
