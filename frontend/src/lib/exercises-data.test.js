import { describe, expect, it } from 'vitest'
import { CATALOGUE } from './exercises.js'

// Katalog 1.324 latihan ini berbahasa Inggris, satu-satunya alfabet yang sah di dalamnya Latin.
// Jadi huruf Kiril, Yunani, atau Arab di situ bukan pilihan penulisan — itu selalu kerusakan
// encoding, dan bentuknya khas: satu byte UTF-8 dibaca sebagai satu byte cp1251/cp1252.
//
// Ini nyata dan sempat lolos ke layar: empat nama tertulis "sled 45в° leg press", dengan huruf
// Kiril 'в' (U+0432) menempel di depan tanda derajat. Tampil apa adanya di kartu Progres per
// latihan di Statistik, di judul sheet, dan di ekspor rencana.
//
// Kenapa tidak ada yang menangkapnya lebih dulu: berkasnya UTF-8 yang sah, jadi tidak ada parser
// yang keberatan; namanya cuma ditampilkan, tidak pernah dicocokkan ke daftar tetap; dan tesnya
// membandingkan id, bukan huruf. Yang bisa melihatnya adalah aturan tentang alfabet apa yang
// boleh ada di data ini, dan itu isi tes ini.
//
// Tanda derajat (U+00B0) sendiri SAH — "45° side bend" memang menulisnya. Yang dilarang huruf
// dari aksara lain.
describe('kebersihan encoding data latihan', () => {
  const FIELDS = ['n', 'bp', 'eq', 'tg', 'mg']

  // Rentang yang paling mungkin muncul dari mis-decode byte tunggal, plus dua penanda mojibake
  // klasik: 'Â' dan '�' (REPLACEMENT CHARACTER).
  const FOREIGN = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿÂ�]/

  it('tidak ada aksara non-Latin di nama, bagian tubuh, alat, atau otot', () => {
    const bad = []
    for (const ex of CATALOGUE) {
      for (const f of FIELDS) {
        const v = ex[f]
        if (typeof v === 'string' && FOREIGN.test(v)) bad.push(ex.id + '.' + f + ' = ' + JSON.stringify(v))
      }
      for (const m of ex.sm || []) {
        if (typeof m === 'string' && FOREIGN.test(m)) bad.push(ex.id + '.sm = ' + JSON.stringify(m))
      }
    }
    expect(bad, 'nama latihan rusak encoding-nya').toEqual([])
  })

  it('empat nama sled memakai tanda derajat telanjang, bukan sisa mojibake', () => {
    // Kalau salah satu id ini hilang dari katalog, tes ini harus GAGAL, bukan lolos sunyi —
    // patokan yang menunjuk baris yang tidak ada tidak memeriksa apa pun.
    const ids = ['0738', '0739', '1464', '0740']
    const names = ids.map(id => CATALOGUE.find(e => e.id === id)?.n)
    expect(names).toEqual([
      'sled 45° calf press',
      'sled 45° leg press',
      'sled 45° leg press (back pov)',
      'sled 45° leg wide press',
    ])
  })

  it('tanda derajat yang sah tidak ikut dilarang', () => {
    const sideBend = CATALOGUE.find(e => e.id === '0002')
    expect(sideBend?.n).toBe('45° side bend')
    expect(FOREIGN.test(sideBend.n)).toBe(false)
  })
})
