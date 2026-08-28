// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEF, useStore } from '../store/useStore.js'
import Home from './Home.jsx'
import Plan from './Plan.jsx'
import RoutineEdit from './RoutineEdit.jsx'
import Workout from './Workout.jsx'
import Stats from './Stats.jsx'
import History from './History.jsx'
import Library from './Library.jsx'
import Food from './Food.jsx'
import Settings from './Settings.jsx'
import Login from './Login.jsx'

/**
 * Setiap layar harus BISA DIRENDER. Itu saja, dan itu ternyata belum pernah dijamin.
 *
 * KENAPA INI ADA
 *
 * Repo ini sudah pernah mengirim DUA layar yang mati total, dan keduanya lolos seluruh gate:
 *
 *   · Pengaturan melempar `CITIES is not defined` — layarnya kosong, tidak bisa dibuka sama
 *     sekali.
 *   · Statistik melempar `onExercise is not defined` pada ketukan pertama.
 *
 * `check:names` lahir dari keduanya dan menutup kelasnya: nama yang tidak pernah ada. Tapi dia
 * cuma bisa melihat nama — dia tidak bisa melihat properti `undefined` yang dibaca, array yang
 * diakses saat kosong, atau `.map` atas nilai yang belum ada. Semua itu tetap ReferenceError atau
 * TypeError di layar orang, dan tidak ada satu pun tes yang akan menangkapnya.
 *
 * Jadi berkas ini menutup lapis paling dasar yang hilang: mount setiap rute, dua kali.
 *
 * DUA KEADAAN, DAN YANG PERTAMA YANG PALING SERING DILEWAT
 *
 *   1. **Pemasangan baru** — `DEF` apa adanya. Nol latihan, nol rencana, nol berat badan, nol
 *      makanan. Ini keadaan yang dilihat SETIAP pengguna baru, dan justru yang paling jarang
 *      dijalankan saat mengembangkan, karena mesin pengembang selalu punya data.
 *   2. **Terisi** — ada rencana, riwayat, berat badan, makanan, sesi aktif.
 *
 * Tes ini SENGAJA hampir tidak me-mock apa pun. Mock membuat crash yang sebenarnya tidak pernah
 * muncul, dan itu persis bagaimana `Stats.test.js` bisa hijau berbulan-bulan di atas simbol yang
 * tidak ada. Satu-satunya yang dimatikan `PrayerPause`, karena dia membaca jam dinding sungguhan
 * — lihat `lib/no-wallclock-tests.test.ts`.
 */
vi.mock('../components/PrayerPause.jsx', () => ({ default: () => null }))

// Tanpa kredensial Supabase, `supa()` mengembalikan null dan mode tamu yang jalan — itu jalur
// yang didukung, dan itu yang ingin diuji. Distub eksplisit supaya hasilnya tidak bergantung pada
// ada-tidaknya .env.local di mesin yang menjalankannya.
vi.stubEnv('VITE_SUPABASE_URL', '')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
vi.stubEnv('VITE_DEMO', '')

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const clone = o => JSON.parse(JSON.stringify(o))

let container
let root
const errors = []
let realError

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container, {
    // React menangkap error render dan melaporkannya ke console kalau ada ErrorBoundary di
    // atasnya. Di sini tidak ada, jadi error render benar-benar melempar — tapi React tetap
    // menulis ke console.error, dan itu ikut ditangkap supaya kegagalan yang "tertelan" tetap
    // terlihat.
    onUncaughtError: e => errors.push(e),
    onCaughtError: e => errors.push(e),
  })
  errors.length = 0
  realError = console.error
  console.error = (...a) => { errors.push(a[0]) }
})

afterEach(() => {
  console.error = realError
  act(() => root.unmount())
  container.remove()
})

/** Keadaan pemasangan baru: DEF apa adanya. */
const fresh = () => clone(DEF)

/** Keadaan terisi, cukup untuk melewati setiap cabang "kalau ada data". */
function populated() {
  const S = clone(DEF)
  const ex = { id: '0025', n: 'Barbell bench press', sets: [{ w: 60, r: 5, done: true }] }
  // Bentuk rencana yang SUNGGUHAN, dari lib/starter.js: `ex`, bukan `entries`. `entries`
  // adalah bentuk sesi AKTIF, dan memakainya di sini membuat Plan dan RoutineEdit melempar
  // — itu yang terjadi di versi pertama tes ini, dan bedanya cuma terlihat karena tesnya
  // benar-benar me-mount layarnya.
  S.routines = [{
    id: 'r1', name: 'Push', emoji: 'barbell',
    ex: [{ id: '0025', sets: 4, reps: 8, weight: 60 }],
  }]
  S.week = { 1: 'r1' }
  S.dayPlan = {}
  S.bodyweight = [
    { d: '2026-08-01', t: Date.UTC(2026, 7, 1), w: 78 },
    { d: '2026-08-20', t: Date.UTC(2026, 7, 20), w: 77.2 },
  ]
  S.workouts = [{
    id: 'w1', d: '2026-08-20', name: 'Push', start: Date.UTC(2026, 7, 20, 6),
    end: Date.UTC(2026, 7, 20, 7), entries: [ex],
  }]
  S.exWeights = { '0025': 60 }
  S.foods = [{ id: 'f1', name: 'Nasi uduk', basis: 'perServing', serving: 'porsi (250 g)', kcal: 480, protein: 9, carb: 68, fat: 18 }]
  S.meals = [{ id: 'm1', d: new Date().toISOString().slice(0, 10), foodId: 'f1', qty: 1, at: Date.now() }]
  S.nutritionTarget = { kcal: 2200, protein: 150 }
  S.active = {
    id: 'active', name: 'Push', start: Date.now(), cur: 0,
    entries: [{ id: '0025', target: { mode: 'reps', reps: 5, weight: 60 }, sets: [{ w: 60, r: 5, done: false }] }],
  }
  S.exNotes = { '0025': 'seat 4, pin 7' }
  return S
}

/** Mount satu view di dalam router, dan laporkan error apa pun yang muncul. */
function mount(element, path = '/x', routePath = '/x') {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={routePath} element={element} /></Routes>
      </MemoryRouter>
    )
  })
}

const VIEWS = [
  { name: 'Home', el: <Home /> },
  { name: 'Plan', el: <Plan /> },
  { name: 'Workout', el: <Workout /> },
  { name: 'Stats', el: <Stats /> },
  { name: 'History', el: <History /> },
  { name: 'Library', el: <Library /> },
  { name: 'Food', el: <Food /> },
  { name: 'Settings', el: <Settings /> },
  { name: 'Login', el: <Login /> },
]

describe('setiap layar bisa dirender — pemasangan BARU', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ S: fresh(), user: null, ready: true })
  })

  for (const { name, el } of VIEWS) {
    it(`${name} tidak melempar dengan state kosong`, () => {
      // Keadaan yang dilihat setiap pengguna baru, dan yang paling jarang dijalankan saat
      // mengembangkan karena mesin pengembang selalu punya data.
      expect(() => mount(el)).not.toThrow()
      expect(errors, `${name} menulis ke console.error`).toEqual([])
      expect(container.textContent.trim().length, `${name} merender kosong`).toBeGreaterThan(0)
    })
  }
})

describe('setiap layar bisa dirender — state TERISI', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({ S: populated(), user: { id: 'u1', email: 'a@b.c', name: 'Arif' }, ready: true })
  })

  for (const { name, el } of VIEWS) {
    it(`${name} tidak melempar dengan data`, () => {
      expect(() => mount(el)).not.toThrow()
      expect(errors, `${name} menulis ke console.error`).toEqual([])
      expect(container.textContent.trim().length, `${name} merender kosong`).toBeGreaterThan(0)
    })
  }

  it('RoutineEdit tidak melempar untuk rencana yang ada', () => {
    expect(() => mount(<RoutineEdit />, '/plan/r/r1', '/plan/r/:id')).not.toThrow()
    expect(errors).toEqual([])
  })

  it('RoutineEdit tidak melempar untuk id yang TIDAK ada', () => {
    // Ini bisa terjadi sungguhan: tautan lama, rencana yang dihapus dari perangkat lain lalu
    // disinkronkan, atau URL yang diketik tangan. Layarnya boleh kosong, tapi tidak boleh
    // melempar.
    expect(() => mount(<RoutineEdit />, '/plan/r/tidak-ada', '/plan/r/:id')).not.toThrow()
    expect(errors).toEqual([])
  })
})

describe('daftar view tidak boleh tertinggal dari daftar rute', () => {
  it('setiap rute di App.jsx punya view yang diuji di sini', async () => {
    // Tanpa ini, layar BARU tidak akan pernah masuk smoke test — dan layar baru justru yang
    // paling mungkin melempar. Dibaca dari sumbernya, bukan dari ingatan.
    // Path relatif cwd, BUKAN import.meta.url: di lingkungan happy-dom `import.meta.url`
    // adalah URL http, dan readFileSync menolaknya ("The URL must be of scheme file").
    const { readFileSync } = await import('node:fs')
    const src = readFileSync('src/App.jsx', 'utf8')
    const dirender = [...src.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)]
      .map(m => ({ path: m[1], komponen: m[2] }))
      .filter(r => r.komponen !== 'Navigate')

    const diuji = new Set([...VIEWS.map(v => v.name), 'RoutineEdit'])
    const tertinggal = dirender.filter(r => !diuji.has(r.komponen))
    expect(
      tertinggal.map(r => r.komponen + ' (' + r.path + ')'),
      'Rute ini punya view yang tidak pernah di-mount di smoke test. Tambahkan ke VIEWS.'
    ).toEqual([])
    expect(dirender.length).toBeGreaterThan(5)
  })
})
