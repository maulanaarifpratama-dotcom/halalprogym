import { describe, expect, it, afterEach } from 'vitest'
import { _setLangState } from './i18n-core.js'
import { DAYN, DAYS, fmtDate, localeDateString, startOfWeek, weekKey, ACCENTS } from './format.js'
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

describe('weekKey — berbasis AHAD', () => {
  // Tes ini dulu memaku semantik ISO-week (berbasis Senin):
  //   weekKey('2026-08-24') === weekKey('2026-08-30')   // Senin 24 .. Ahad 30
  // Itu sekarang SALAH dengan sengaja. App ini memutuskan Ahad hari pertama, dan minggunya
  // ikut: Ahad 30 Agu MEMBUKA minggu baru, bukan menutup minggu Senin 24.
  //
  // 30 Agustus 2026 adalah hari Ahad; 5 September 2026 hari Sabtu.

  it('mengelompokkan Ahad sampai Sabtu sebagai satu minggu', () => {
    expect(weekKey('2026-08-30')).toBe(weekKey('2026-09-05'))
    expect(weekKey('2026-08-31')).toBe(weekKey('2026-08-30'))
  })

  it('Sabtu MENUTUP minggu, Ahad berikutnya MEMBUKA yang baru', () => {
    expect(weekKey('2026-08-29')).not.toBe(weekKey('2026-08-30'))
    expect(weekKey('2026-09-05')).not.toBe(weekKey('2026-09-06'))
  })

  it('Senin TIDAK lagi membuka minggu — ini yang berubah dari ISO-week', () => {
    // Senin 31 Agu ada di minggu yang sama dengan Ahad 30, bukan membuka minggu sendiri.
    expect(weekKey('2026-08-31')).toBe('2026-08-30')
  })

  it('kuncinya adalah tanggal Ahad-nya, jadi bisa dibaca langsung saat debugging', () => {
    expect(weekKey('2026-09-02')).toBe('2026-08-30')
  })

  it('startOfWeek mengembalikan Ahad untuk setiap hari dalam minggu itu', () => {
    for (const iso of ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-05']) {
      const d = startOfWeek(new Date(iso + 'T12:00:00'))
      expect(d.getDay(), iso).toBe(0)          // 0 = Ahad
      expect(d.getDate(), iso).toBe(30)
      expect(d.getMonth(), iso).toBe(7)        // Agustus
    }
  })

  it('tidak ada kasus tepi tahun — kunci Ahad tidak butuh aturan Kamis seperti ISO-week', () => {
    // 3 Januari 2027 adalah hari Ahad, dan minggunya menyeberang tahun.
    expect(weekKey('2026-12-31')).toBe(weekKey('2027-01-02'))
    expect(weekKey('2027-01-03')).toBe('2027-01-03')
  })
})

describe('ACCENTS', () => {
  it('lime adalah lime brand, bukan hijau iOS yang tertinggal dari sebelum rebrand', () => {
    expect(ACCENTS.lime).toBe('#94e900')
  })
})
