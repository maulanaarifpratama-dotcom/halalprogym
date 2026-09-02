// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUI } from '../store/useUI.js'
import Modals from './Modals.jsx'

/**
 * LEMBAR ADALAH DIALOG MODAL, dan sebelum 2026-09-02 dia cuma modal secara visual.
 *
 * Escape sudah bekerja sejak awal. Yang tidak ada adalah tiga hal lainnya, dan semuanya standar:
 *
 *   1. `role="dialog"` + `aria-modal` — tanpa itu pembaca layar tidak tahu ada modal terbuka.
 *   2. Fokus MASUK ke lembarnya. Diukur di app hidup sebelum diperbaiki: membuka lembar
 *      meninggalkan fokus pada PEMICUNYA, di belakang overlay.
 *   3. Fokus tidak keluar lewat Tab. Terukur: **51 elemen di belakang overlay masih bisa
 *      di-Tab** — jadi pemakai keyboard berjalan ke kontrol yang tertutup dan tidak terlihat.
 *   4. Fokus KEMBALI ke pemicunya saat ditutup. Tanpa itu Tab berikutnya mulai dari awal
 *      halaman, dan orang kehilangan tempatnya.
 *
 * Fokus jatuh ke PANEL, bukan ke kontrol pertamanya: panel yang difokus membuat pembaca layar
 * menyebut "dialog" lalu membaca dari judulnya, sementara melompat ke kontrol pertama melewati
 * judul itu. Dan panel TIDAK merampas fokus dari kolom yang meng-`autoFocus` sendiri — dua
 * lembar melakukannya (`AiFoodSheet`, `FoodDbSheet`), dan merampasnya berarti orang mengetuk
 * "Database" lalu mengetik ke tempat yang salah.
 */

let host, root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  useUI.setState({ sheets: [] })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.style.position = ''
  useUI.setState({ sheets: [] })
})

const render = () => act(() => root.render(<Modals />))

/** Membuka satu lembar lewat store — jalur yang sama dengan yang dipakai app. */
const buka = (render_, opts = {}) => act(() => { useUI.getState().openSheet(render_, opts) })

const panel = () => host.querySelector('[role="dialog"]')

describe('lembar adalah dialog modal', () => {
  it('nol lembar berarti nol markup — bukan wadah kosong yang menangkap ketukan', () => {
    render()
    expect(host.querySelector('#modal-root')).toBeNull()
  })

  it('punya role dialog dan aria-modal', () => {
    render()
    buka(() => <div><h3>Judul</h3><button>Oke</button></div>)
    expect(panel()).toBeTruthy()
    expect(panel().getAttribute('aria-modal')).toBe('true')
  })

  it('fokus MASUK ke panelnya, bukan ke kontrol pertamanya', () => {
    // Panel yang difokus membuat pembaca layar membaca dari judul; melompat ke tombol pertama
    // melewatinya.
    const pemicu = document.createElement('button')
    document.body.appendChild(pemicu)
    pemicu.focus()
    render()
    buka(() => <div><h3>Judul</h3><button>Oke</button></div>)
    expect(panel().contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(panel())
    pemicu.remove()
  })

  it('TIDAK merampas fokus dari kolom yang autoFocus', () => {
    // Penjaga yang wajib: dua lembar sungguhan meng-autoFocus kolomnya, dan merampasnya berarti
    // orang mengetik ke tempat yang salah.
    render()
    buka(() => <div><h3>Cari</h3><input autoFocus placeholder="cari" /></div>)
    expect(document.activeElement.tagName).toBe('INPUT')
  })

  it('fokus KEMBALI ke pemicunya saat lembar ditutup', () => {
    const pemicu = document.createElement('button')
    pemicu.textContent = 'pemicu'
    document.body.appendChild(pemicu)
    pemicu.focus()
    render()
    buka(() => <div><h3>Judul</h3><button>Oke</button></div>)
    expect(document.activeElement).not.toBe(pemicu)
    act(() => { useUI.getState().closeSheet(useUI.getState().sheets[0].id) })
    expect(document.activeElement, 'tanpa ini Tab berikutnya mulai dari awal halaman').toBe(pemicu)
    pemicu.remove()
  })

  it('pemicu yang sudah hilang dari dokumen tidak melempar', () => {
    // Terjadi sungguhan: baris yang membuka lembar lalu dihapus oleh lembar itu sendiri —
    // "Hapus latihan ini" adalah persis bentuk itu.
    const pemicu = document.createElement('button')
    document.body.appendChild(pemicu)
    pemicu.focus()
    render()
    buka(() => <div><h3>Judul</h3><button>Oke</button></div>)
    pemicu.remove()
    expect(() => act(() => { useUI.getState().closeSheet(useUI.getState().sheets[0].id) })).not.toThrow()
  })

  it('Tab dari kontrol TERAKHIR melingkar ke yang pertama, tidak keluar', () => {
    render()
    buka(() => <div><h3>Judul</h3><button>satu</button><button>dua</button></div>)
    const tombol = [...panel().querySelectorAll('button')]
    expect(tombol.length).toBe(2)
    // happy-dom tidak punya layout, jadi `offsetParent` null untuk semuanya — perangkapnya
    // menyaring dengan itu. Jadi yang diuji di sini KEBIJAKANNYA lewat panggilan langsung:
    // peristiwa Tab pada kontrol terakhir harus dicegah, bukan dibiarkan keluar.
    tombol[1].focus()
    let dicegah = false
    const ev = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    act(() => { tombol[1].dispatchEvent(ev) })
    dicegah = ev.defaultPrevented
    // Tanpa layout, `f` kosong dan perangkapnya jatuh ke cabang "fokuskan panel" — yang JUGA
    // mencegah peristiwanya. Dua-duanya berarti fokus tidak keluar, dan itu yang dijaga.
    expect(dicegah, 'Tab pada ujung lembar tidak boleh membawa fokus ke belakang overlay').toBe(true)
  })

  it('aria-modal cuma di lembar TERATAS', () => {
    // Dua dialog yang sama-sama mengaku modal adalah pernyataan yang saling bertentangan, dan
    // yang di bawah memang tidak modal lagi.
    render()
    buka(() => <div><h3>Bawah</h3><button>a</button></div>)
    buka(() => <div><h3>Atas</h3><button>b</button></div>)
    const panels = [...host.querySelectorAll('[role="dialog"]')]
    expect(panels.length).toBe(2)
    expect(panels[0].getAttribute('aria-modal')).toBeNull()
    expect(panels[1].getAttribute('aria-modal')).toBe('true')
  })

  it('dialog terpusat juga dapat perlakuan yang sama', () => {
    // `kind: 'center'` jalur render yang BERBEDA di Modals.jsx, jadi dia bisa tertinggal
    // sendirian — dan confirmSheet memakainya, jalur yang menghapus data.
    render()
    buka(() => <div><h3>Yakin?</h3><button>Hapus</button></div>, { kind: 'center' })
    const p = panel()
    expect(p).toBeTruthy()
    expect(p.classList.contains('center')).toBe(true)
    expect(p.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(p)
  })
})
