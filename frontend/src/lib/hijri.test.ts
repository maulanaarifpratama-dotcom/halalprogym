import { describe, expect, it } from 'vitest'
import {
  clampOffset,
  fmtHijri,
  HIJRI_MONTHS_ID,
  hijriMonthName,
  HIJRI_MONTHS_LATIN,
  isRamadanByHisab,
  toHijri,
} from './hijri.js'

// Tanggal dipatok. Konversi kalender adalah hal yang paling mudah tampak benar sambil salah satu
// hari, jadi nilai rujukannya ditulis di sini dan bukan dihitung ulang oleh tesnya sendiri.
const AGU_28_2026 = new Date(2026, 7, 28, 12, 0, 0)

describe('toHijri', () => {
  it('mengubah 28 Agustus 2026 ke 15 Rabiulawal 1448', () => {
    // Umm al-Qura. Kalau angka ini berubah, ICU-nya yang berubah — dan itu memang harus
    // GAGAL, bukan diam-diam ikut bergeser.
    expect(toHijri(AGU_28_2026)).toEqual({ day: 15, month: 3, year: 1448 })
  })

  it('offset menggeser tanggalnya, bukan mengubah kalendernya', () => {
    expect(toHijri(AGU_28_2026, 1)).toEqual({ day: 16, month: 3, year: 1448 })
    expect(toHijri(AGU_28_2026, -1)).toEqual({ day: 14, month: 3, year: 1448 })
  })

  it('offset di luar batas dijepit, bukan dipercaya', () => {
    // Selisih hisab-rukyat maksimal sehari; dua hari sudah longgar. Nilai gila datang dari
    // localStorage dan berkas cadangan, dan harus tidak berbahaya.
    expect(toHijri(AGU_28_2026, 99)).toEqual(toHijri(AGU_28_2026, 2))
    expect(toHijri(AGU_28_2026, -99)).toEqual(toHijri(AGU_28_2026, -2))
  })

  it('offset bukan angka dianggap nol', () => {
    for (const bad of [undefined, null, NaN, 'dua']) {
      expect(toHijri(AGU_28_2026, bad as unknown as number), String(bad))
        .toEqual(toHijri(AGU_28_2026, 0))
    }
  })

  it('tidak terpengaruh jam pada tanggal yang sama', () => {
    // Konversinya dipatok ke tengah hari UTC justru untuk ini: sesi latihan jam 5 pagi dan jam
    // 11 malam harus menghasilkan tanggal Hijriah yang sama.
    const pagi = new Date(2026, 7, 28, 5, 0, 0)
    const malam = new Date(2026, 7, 28, 23, 30, 0)
    expect(toHijri(pagi)).toEqual(toHijri(malam))
  })

  it('menyeberang batas bulan Hijriah dengan benar', () => {
    const a = toHijri(new Date(2026, 7, 13, 12, 0, 0))
    const b = toHijri(new Date(2026, 7, 14, 12, 0, 0))
    expect(a).not.toEqual(b)
    // Salah satunya harus akhir Safar dan yang lain awal Rabiulawal.
    expect([a?.month, b?.month]).toEqual([2, 3])
    expect(b?.day).toBe(1)
  })
})

describe('hijriMonthName', () => {
  it('bahasa Indonesia memakai ejaan KBBI, bukan nama dari ICU', () => {
    // Ini alasan tabelnya ada. ICU bisa mengembalikan "Rabiʻ I" tergantung versinya, dan ejaan
    // keislaman di app ini wajib mengikuti KBBI.
    expect(hijriMonthName(1, 'id')).toBe('Muharam')      // satu 'r'
    expect(hijriMonthName(3, 'id')).toBe('Rabiulawal')
    expect(hijriMonthName(8, 'id')).toBe('Syaban')       // tanpa 'k'
    expect(hijriMonthName(9, 'id')).toBe('Ramadan')      // tanpa 'h'
    expect(hijriMonthName(11, 'id')).toBe('Zulkaidah')
    expect(hijriMonthName(12, 'id')).toBe('Zulhijah')
  })

  it('dua belas nama, tidak ada yang kosong dan tidak ada yang kembar', () => {
    expect(HIJRI_MONTHS_ID).toHaveLength(12)
    expect(new Set(HIJRI_MONTHS_ID).size).toBe(12)
    for (const n of HIJRI_MONTHS_ID) expect(n.trim().length).toBeGreaterThan(3)
  })

  it('ejaan yang sering salah TIDAK ada di tabel', () => {
    const teks = HIJRI_MONTHS_ID.join(' ')
    for (const salah of ['Muharram', 'Ramadhan', 'Sya’ban', 'Syakban', 'Zulhijjah']) {
      expect(teks, salah).not.toContain(salah)
    }
  })

  it('bahasa lain memakai nama dari Intl selama Intl punya nama Hijriah', () => {
    const en = hijriMonthName(9, 'en')
    expect(en.length).toBeGreaterThan(2)
    // Yang penting: dia TIDAK jatuh ke tabel Indonesia untuk bahasa lain. Diperiksa lewat
    // bulan yang ejaan Indonesianya BERBEDA dari Inggris — 'Ramadan' sama di keduanya, jadi
    // bulan 3 yang membedakan: 'Rabiulawal' (KBBI) vs apa pun yang ICU berikan.
    expect(hijriMonthName(3, 'en')).not.toBe('Rabiulawal')
    expect(typeof en).toBe('string')
  })

  it('bahasa yang ICU-nya memakai ulang nama bulan GREGORIAN tidak dipakai apa adanya', () => {
    // Bug nyata, ditemukan dengan mengukur bukan menduga: ICU untuk `zh` mengembalikan `三月`
    // untuk bulan Hijriah ke-3 — dan itu PERSIS nama bulan Maret. Jadi pengguna Mandarin
    // melihat "15 三月 1448 H", yang terbaca "15 Maret 1448". Salah dengan cara yang cuma
    // terlihat oleh orang yang membaca bahasanya, sama seperti "full body" yang tampil Inggris
    // di 13 bahasa selama berbulan-bulan.
    const gregorianZh = (m: number) => new Intl.DateTimeFormat('zh', { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2026, m - 1, 15)))
    for (const m of [1, 3, 9, 12]) {
      expect(hijriMonthName(m, 'zh'), 'bulan ' + m).not.toBe(gregorianZh(m))
    }
  })

  it('cadangannya transliterasi Latin, BUKAN ejaan Indonesia', () => {
    // Ejaan KBBI adalah keputusan untuk pengguna Indonesia. Menyodorkannya ke bahasa lain
    // adalah menebak, dan menebak dalam urusan ejaan keislaman bukan pilihan yang netral.
    expect(hijriMonthName(9, 'zh')).toBe(HIJRI_MONTHS_LATIN[8])
    expect(hijriMonthName(3, 'zh')).not.toBe('Rabiulawal')
  })

  it('bahasa yang ICU-nya BENAR tetap memakai ICU, bukan dipaksa ke Latin', () => {
    // Pemeriksaannya harus dua arah. Kalau tidak, satu perbaikan untuk zh akan menghapus nama
    // Turki "Rebiülevvel" dan Rusia "раби-уль-авваль" yang justru sudah benar.
    for (const lang of ['tr', 'ru', 'fr', 'ko', 'hi']) {
      const out = hijriMonthName(3, lang)
      expect(out, lang).not.toBe(HIJRI_MONTHS_LATIN[2])
      expect(out.length, lang).toBeGreaterThan(2)
    }
  })

  it('tabel Latin lengkap, tanpa kembar, tanpa yang kosong', () => {
    expect(HIJRI_MONTHS_LATIN).toHaveLength(12)
    expect(new Set(HIJRI_MONTHS_LATIN).size).toBe(12)
    for (const n of HIJRI_MONTHS_LATIN) expect(n.trim().length).toBeGreaterThan(4)
  })

  it('bulan di luar 1..12 dijepit, bukan mengembalikan undefined', () => {
    // Nilainya masuk ke string yang dilihat orang; "undefined 1448 H" itu bocornya kode.
    for (const m of [0, -3, 13, 99, NaN]) {
      const out = hijriMonthName(m as number, 'id')
      expect(out, String(m)).toBeTruthy()
      expect(out).not.toContain('undefined')
    }
  })
})

describe('fmtHijri', () => {
  it('bentuk lengkapnya: hari, bulan, tahun, penanda', () => {
    expect(fmtHijri(AGU_28_2026, 'id')).toBe('15 Rabiulawal 1448 H')
  })

  it('offset ikut terbaca di hasilnya', () => {
    expect(fmtHijri(AGU_28_2026, 'id', -1)).toBe('14 Rabiulawal 1448 H')
    expect(fmtHijri(AGU_28_2026, 'id', 1)).toBe('16 Rabiulawal 1448 H')
  })

  it('penandanya bisa diganti — bahasa lain tidak memakai "H"', () => {
    expect(fmtHijri(AGU_28_2026, 'en', 0, 'AH')).toContain('1448 AH')
  })

  it('tidak pernah mengandung "undefined" atau "NaN"', () => {
    for (const off of [-2, -1, 0, 1, 2]) {
      const out = fmtHijri(AGU_28_2026, 'id', off) as string
      expect(out).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('isRamadanByHisab', () => {
  it('false di Rabiulawal', () => {
    expect(isRamadanByHisab(AGU_28_2026)).toBe(false)
  })

  it('true di dalam Ramadan 1448 menurut hisab', () => {
    // 1 Ramadan 1448 menurut Umm al-Qura jatuh di sekitar 18 Februari 2027. Yang dipatok di sini
    // bukan tanggal awalnya — itu urusan sidang isbat — tapi bahwa fungsinya MENEMUKAN bulan
    // kesembilan sama sekali.
    let ketemu = false
    for (let i = 0; i < 400; i++) {
      const d = new Date(2026, 7, 28 + i, 12, 0, 0)
      if (isRamadanByHisab(d)) { ketemu = true; break }
    }
    expect(ketemu).toBe(true)
  })

  it('SENGAJA tidak dipakai sebagai gerbang mode Ramadan', () => {
    // Catatan yang dipaku di tes supaya keputusannya tidak hilang: mode Ramadan disetel MANUAL
    // (lihat lib/ramadan.ts). Fungsi ini cuma memberi konteks di layar. Kalau suatu saat dia
    // dipakai untuk menyalakan mode otomatis, itu keputusan baru yang harus disadari — bukan
    // perbaikan kecil.
    expect(isRamadanByHisab(AGU_28_2026, 2)).toBe(false)
  })
})

describe('clampOffset', () => {
  it('membulatkan dan menjepit', () => {
    expect(clampOffset(1.4)).toBe(1)
    expect(clampOffset(-1.6)).toBe(-2)
    expect(clampOffset(5)).toBe(2)
    expect(clampOffset('x')).toBe(0)
    expect(clampOffset(undefined)).toBe(0)
  })
})
