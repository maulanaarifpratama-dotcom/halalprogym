import { describe, expect, it, afterEach } from 'vitest'
import { _setLangState } from './i18n-core.js'
import { DAYN, DAYS, fmtDate, localeDateString, weekKey, ACCENTS } from './format.js'
import id from '../locales/id.js'

// 30 Agustus 2026 adalah hari Ahad. Tanggal dipatok, bukan diambil dari jam sistem — tes yang
// bergantung pada "hari ini" cuma gagal seminggu sekali, dan itu jenis kegagalan terburuk.
const AHAD = new Date(2026, 7, 30, 12, 0, 0)
const SENIN = new Date(2026, 7, 31, 12, 0, 0)

const resetLang = () => _setLangState('en', {}, null, null)
afterEach(resetLang)

describe('urutan hari', () => {
  it('mulai dari Ahad di indeks 0, jadi minggu Islam tidak butuh pergeseran indeks', () => {
    expect(DAYN[0]).toBe('Sunday')
    expect(DAYS[0]).toBe('Su')
    expect(AHAD.getDay()).toBe(0)
  })
})

describe('localeDateString', () => {
  it('menulis Ahad, bukan Minggu, saat pack id aktif', () => {
    // Ini inti keputusannya: Intl dengan id-ID mengembalikan "Minggu" apa adanya.
    expect(AHAD.toLocaleDateString('id-ID', { weekday: 'long' })).toBe('Minggu')

    _setLangState('id', id, null, null)
    const out = localeDateString(AHAD, { weekday: 'long', day: 'numeric', month: 'long' })
    expect(out).toContain('Ahad')
    expect(out).not.toContain('Minggu')
    expect(out).toContain('Agustus')
    expect(out).toContain('30')
  })

  it('memakai bentuk pendek pack untuk weekday: short', () => {
    _setLangState('id', id, null, null)
    expect(fmtDate('2026-08-30', true)).toContain('Ahd')
    expect(fmtDate('2026-08-30', true)).not.toContain('Min')
  })

  it('tidak menyentuh hari lain — Senin sampai Sabtu sudah dari bahasa Arab', () => {
    _setLangState('id', id, null, null)
    expect(localeDateString(SENIN, { weekday: 'long' })).toBe('Senin')
  })

  it('membiarkan Intl yang bekerja kalau pack tidak menerjemahkan nama hari', () => {
    // Bahasa lain tidak boleh turun jadi Inggris hanya karena helper ini ada. Pack kosong
    // membuat t() mengembalikan sumbernya, dan di situ nama dari Intl yang harus dipakai.
    _setLangState('de', {}, null, null)
    const out = localeDateString(AHAD, { weekday: 'long' })
    expect(out).toBe(AHAD.toLocaleDateString('de-DE', { weekday: 'long' }))
    expect(out).not.toBe('Sunday')
  })

  it('melewatkan Intl apa adanya kalau format tidak minta weekday', () => {
    _setLangState('id', id, null, null)
    expect(localeDateString(AHAD, { day: 'numeric', month: 'long' }))
      .toBe(AHAD.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }))
  })
})

describe('weekKey', () => {
  it('memberi kunci ISO-week yang sama untuk setiap hari dalam satu minggu', () => {
    // Ahad 30 Agu 2026 menutup minggu ISO yang dimulai Senin 24 Agu.
    expect(weekKey('2026-08-24')).toBe(weekKey('2026-08-30'))
    expect(weekKey('2026-08-31')).not.toBe(weekKey('2026-08-30'))
  })
})

describe('ACCENTS', () => {
  it('lime adalah lime brand, bukan hijau iOS yang tertinggal dari sebelum rebrand', () => {
    expect(ACCENTS.lime).toBe('#94e900')
  })
})
