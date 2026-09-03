import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  LANGS, INSTR_LANGS, EXERCISE_NAME_LANGS, DATE_LOCALES, INSTR_FALLBACK, instrPackFor,
} from './i18n-core.js'

/**
 * DAFTAR BAHASA lawan BERKAS DI DISK — dan kenapa selisihnya SUNYI.
 *
 * Tiga daftar memutuskan pack mana yang dimuat, dan ketiganya ditulis tangan terpisah dari
 * berkasnya. Kalau salah satu menyimpang, `setLang` menangkap error importnya dan **jatuh ke
 * Inggris tanpa satu pun pesan**:
 *
 *   · pack ada di disk tapi TIDAK terdaftar  -> pekerjaan terjemahan yang tidak pernah tampil
 *   · terdaftar tapi TIDAK ada di disk       -> import gagal, tertangkap, Inggris diam-diam
 *
 * Keduanya lolos `check:locales` (dia cuma membandingkan pack lawan pack) dan lolos
 * `check:locale-keys` (dia cuma melihat kunci UI). Instruksi latihan tidak lewat `t()` sama
 * sekali, jadi tidak ada checker yang menyentuhnya.
 *
 * Yang ditemukan audit 2026-09-03: `pt` tidak punya pack instruksi sementara `pt-BR` punya, jadi
 * pengguna Portugal mendapat instruksi INGGRIS padahal pack Portugis ada di repo. Bukan pack
 * yang hilang — fallback yang tidak ada.
 */

const berkas = (dir: string): string[] =>
  readdirSync(fileURLToPath(new URL('../' + dir + '/', import.meta.url)))
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace(/\.js$/, ''))
    .sort()

describe('daftar bahasa cocok dengan berkas di disk', () => {
  it('setiap pack locale terdaftar di LANGS, dan sebaliknya', () => {
    // `en` tidak punya berkas: dia bahasa sumber, dan `t()` melakukan `dict[s] || s`.
    const diDisk = berkas('locales')
    const diDaftar = Object.keys(LANGS).filter(l => l !== 'en').sort()
    expect(diDisk).toEqual(diDaftar)
  })

  it('setiap pack instruksi terdaftar di INSTR_LANGS, dan sebaliknya', () => {
    // `en` ada di INSTR_LANGS tapi tidak punya berkas di `instr/`: instruksi Inggris hidup di
    // `exercises-instructions.js` dan dimuat lewat `loadBaseInstructions`.
    const diDisk = berkas('instr')
    const diDaftar = INSTR_LANGS.filter(l => l !== 'en').sort()
    expect(
      diDisk,
      'pack yang tidak terdaftar tidak pernah dimuat; yang terdaftar tanpa berkas jatuh ke '
      + 'Inggris tanpa pesan apa pun'
    ).toEqual(diDaftar)
  })

  it('setiap pack nama latihan terdaftar di EXERCISE_NAME_LANGS, dan sebaliknya', () => {
    expect(berkas('exercise-names')).toEqual([...EXERCISE_NAME_LANGS].sort())
  })

  it('setiap bahasa punya locale tanggal — kalau tidak, angkanya jatuh ke en-GB diam-diam', () => {
    for (const l of Object.keys(LANGS)) {
      expect((DATE_LOCALES as Record<string, string>)[l], l + ' tidak punya DATE_LOCALES')
        .toBeTruthy()
    }
  })
})

describe('fallback instruksi antar saudara regional', () => {
  it('pt meminjam pack pt-BR, bukan jatuh ke Inggris', () => {
    // Untuk teks PANJANG seperti langkah gerakan, jarak Brasil-Portugal jauh lebih kecil
    // daripada jarak Portugis-Inggris.
    expect(instrPackFor('pt')).toBe('pt-BR')
  })

  it('bahasa yang punya packnya sendiri tidak meminjam', () => {
    for (const l of INSTR_LANGS) {
      if (l === 'en') continue
      expect(instrPackFor(l), l + ' harus memakai packnya sendiri').toBe(l)
    }
  })

  it('en tetap null — dia bahasa sumber, bukan pack', () => {
    expect(instrPackFor('en')).toBe(null)
  })

  it('bahasa tanpa pack DAN tanpa saudara tetap null', () => {
    // `de` dan `id` memang belum punya instruksi. Untuk `id` itu keputusan yang sudah tercatat
    // (~106 ribu kata, ditunda) — dan yang penting di sini: fallback ini TIDAK boleh diam-diam
    // memberi orang Indonesia instruksi berbahasa Portugis.
    expect(instrPackFor('de')).toBe(null)
    expect(instrPackFor('id')).toBe(null)
  })

  it('setiap sasaran fallback benar-benar ada packnya', () => {
    // Fallback yang menunjuk pack tidak ada lebih buruk daripada tidak ada fallback: dia
    // terbaca seperti sudah tertangani.
    for (const [dari, ke] of Object.entries(INSTR_FALLBACK)) {
      expect(INSTR_LANGS, dari + ' -> ' + ke + ': sasarannya tidak terdaftar').toContain(ke)
      expect(berkas('instr'), dari + ' -> ' + ke + ': berkasnya tidak ada').toContain(ke)
      expect((LANGS as Record<string, string>)[dari], dari + ' bukan bahasa yang bisa dipilih')
        .toBeTruthy()
    }
  })

  it('keputusan "pack mana" hidup di SATU tempat', () => {
    // Empat tempat pernah mengulang gerbang yang sama — pemuat, penyetel state, label detail,
    // dan label pemilih bahasa — dan salinan KEEMPAT yang terlewat membuang pack `pt-BR` yang
    // baru saja diunduh: browser mengambil berkasnya, lalu `_setLangState` menyetelnya ke null.
    // Labelnya sudah benar, isinya masih Inggris, nol error di mana pun. Cuma terlihat di layar.
    //
    // Jadi `INSTR_LANGS.includes(` cuma boleh ada di dalam `instrPackFor` sendiri.
    const berkasSumber = [
      'lib/i18n-core.js', 'lib/i18n.js', 'sheets.jsx',
      'views/Settings.jsx', 'views/Library.jsx', 'App.jsx',
    ]
    const salah: string[] = []
    for (const f of berkasSumber) {
      let src = ''
      try { src = readFileSync(fileURLToPath(new URL('../' + f, import.meta.url)), 'utf8') } catch { continue }
      src.split('\n').forEach((baris, i) => {
        if (/^\s*(\/\/|\*)/.test(baris)) return          // komentar boleh menyebutnya
        if (!baris.includes('INSTR_LANGS.includes(')) return
        if (f === 'lib/i18n-core.js' && /return (lang|pinjam)/.test(baris)) return  // di dalam instrPackFor
        salah.push(f + ':' + (i + 1) + '  ' + baris.trim().slice(0, 90))
      })
    }
    expect(
      salah,
      'pakai instrPackFor(). Gerbang yang disalin akan menyimpang, dan salinan yang menyimpang '
      + 'membuang pack yang sudah diunduh tanpa satu pun error:\n' + salah.join('\n')
    ).toEqual([])
  })

  it('nol bahasa yang PUNYA saudara berpack tapi tidak meminjamnya', () => {
    // Penjaga arah sebaliknya: kalau nanti `es-MX` masuk sementara `es` punya pack, atau
    // sebaliknya, ini yang menagih keputusannya. Saudara = prefix sebelum tanda hubung.
    const terlewat: string[] = []
    for (const l of Object.keys(LANGS)) {
      if (l === 'en' || instrPackFor(l)) continue
      const akar = l.split('-')[0]
      const saudara = INSTR_LANGS.filter(x => x !== l && x.split('-')[0] === akar)
      if (saudara.length) terlewat.push(l + ' bisa meminjam ' + saudara.join('/'))
    }
    expect(terlewat, 'daftarkan di INSTR_FALLBACK, atau tulis kenapa tidak:\n' + terlewat.join('\n'))
      .toEqual([])
  })
})
