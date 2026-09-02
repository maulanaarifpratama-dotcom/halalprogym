import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * LAYAR SEMPIT — 320dp dan 360dp, dan kenapa keduanya bukan kasus tepi di sini.
 *
 * Pasar sasaran app ini Android Indonesia, dan 360dp adalah lebar paling umum di sana; 320dp
 * masih hidup di perangkat murah. Dua cacat ditemukan dengan benar-benar menyetel viewport ke
 * lebar itu, dan keduanya SUNYI — nol error, nol tes merah, nilai yang benar di DOM:
 *
 * 1. `.actrow` (tiga aksi di layar Makanan) butuh 370px sebagai `.row` biasa, jadi tombol
 *    KETIGA terpotong di 360px. Dan `overflow-x` body tidak menggeser, jadi tombol "AI" —
 *    seluruh jalur perkiraan gizi AI — TIDAK BISA DIJANGKAU. Itu fitur yang hilang, bukan
 *    kosmetik.
 *
 * 2. `.setrow .stp .num` membawa `min-width:0`, jadi di baris set tiga kolom tombol -/+ memakan
 *    hampir semuanya: kolom reps tersisa 8px dan "10" tampil sebagai "1". `input.value` tetap
 *    "10", jadi satu-satunya jejaknya `scrollWidth` 15px lawan lebar render 8px.
 *
 * KENAPA TESNYA MEMBACA CSS, BUKAN MERENDER
 *
 * jsdom tidak punya layout: `getBoundingClientRect()` mengembalikan nol, `scrollWidth` nol, dan
 * media query tidak pernah cocok. Jadi tes render di sini akan hijau apa pun yang terjadi —
 * bentuk penjaga yang paling berbahaya. Yang bisa dipaku adalah invariannya, dan angka-angkanya
 * datang dari pengukuran di browser sungguhan yang tercatat di komentar `index.css`.
 */

const CSS = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('baris tiga aksi tidak terpotong di layar sempit', () => {
  it('.actrow membungkus secara baku — sempit dulu, bukan lebar dulu', () => {
    const m = CSS.match(/\.actrow\{([^}]*)\}/)
    expect(m, '.actrow harus ada di index.css').toBeTruthy()
    expect((m as RegExpMatchArray)[1]).toContain('flex-wrap:wrap')
  })

  it('flex-basis auto selalu dipasangkan width:auto', () => {
    // `.btn` membawa `width:100%`, jadi basis `auto` resolve ke lebar baris PENUH dan setiap
    // tombol pindah ke barisnya sendiri. Terukur: ketiganya 398px di viewport 430px, tiga baris
    // di layar yang jelas cukup untuk satu. Itu bug versi pertama saya, dan cuma terlihat di
    // layar — `flex:0 1 auto` terbaca sangat wajar.
    //
    // Jadi yang dijaga bukan "jangan pakai auto", tapi PASANGANNYA: `auto` boleh justru ketika
    // `width:auto` ikut menetralkan `.btn`. Aturan yang lebih sempit dari itu akan menolak
    // cabang lebar yang benar, dan penjaga yang menolak kode benar akan dilonggarkan orang.
    const aturan = [...CSS.matchAll(/\.actrow>[^{]*\{([^}]*)\}/g)].map(x => x[1] as string)
    expect(aturan.length, 'harus ada aturan anak .actrow').toBeGreaterThanOrEqual(2)
    for (const a of aturan) {
      if (!/flex:\s*[\d.]+\s+[\d.]+\s+auto/.test(a)) continue
      expect(a, 'flex-basis auto tanpa width:auto memaksa satu tombol per baris: ' + a)
        .toMatch(/width:\s*auto/)
    }
  })

  it('baris tunggal cuma dipakai kalau ruangnya memang ada', () => {
    // 400px dipilih dengan margin di atas 370px yang terukur, karena label ini diterjemahkan
    // ke 13 bahasa: "Catat makanan" jauh lebih pendek dari "Essen protokollieren".
    expect(CSS).toMatch(/@media \(min-width:400px\)\{[\s\S]{0,400}?\.actrow/)
  })

  it('layar Makanan memakainya, bukan `.row` biasa', () => {
    const food = readFileSync(new URL('../views/Food.jsx', import.meta.url), 'utf8')
    expect(food).toContain('className="actrow"')
    // Dan penjaga di atas menjaga sesuatu: kalau barisnya kembali ke `.row`, ini merah.
    const i = food.indexOf('className="actrow"')
    const blok = food.slice(i, i + 700)
    expect((blok.match(/<Button/g) || []).length, 'baris ini memang tiga aksi').toBe(3)
  })
})

describe('angka di baris set tidak terpotong di layar sempit', () => {
  it('.stp .num punya lebar minimum, bukan min-width:0', () => {
    const m = CSS.match(/\.stp \.num\{([^}]*)\}/)
    expect(m, '.stp .num harus ada').toBeTruthy()
    const blok = (m as RegExpMatchArray)[1] as string
    expect(blok, 'min-width:0 adalah bug aslinya — angkanya menyusut sampai terpotong')
      .not.toMatch(/min-width:\s*0(?![.\d])/)
    expect(blok).toMatch(/min-width:\s*[\d.]+em/)
  })

  it('tiga kolom di layar sempit dapat alokasi terukur', () => {
    const mq = CSS.match(/@media \(max-width:379px\)\{([\s\S]*?)\n\}/)
    expect(mq, 'media query layar sempit harus ada').toBeTruthy()
    const blok = (mq as RegExpMatchArray)[1] as string
    // Beban memuat DESIMAL ("127.5" butuh 33px), jadi dia yang paling butuh lebar.
    expect(blok).toMatch(/\.setrow\.eff3 \.stp\.w\{flex:1\.5\}/)
    // Effort satu karakter, jadi dia yang paling bisa menyusut.
    expect(blok).toMatch(/\.setrow\.eff3 \.stp\.eff\{flex:\.7\}/)
    // Tombol menyusut dengan sengaja: angka yang tidak terbaca lebih buruk dari yang sulit
    // diketuk, dan barisnya masih bisa diisi dengan mengetik.
    expect(blok).toMatch(/\.setrow\.eff3 \.stp button\{width:20px\}/)
    // Dan kasus DUA kolom, yang ketemu setelah yang tiga kolom diperbaiki.
    expect(blok).toMatch(/\.setrow:not\(\.eff3\) \.stp button\{width:26px\}/)
  })

  it('kolom effort memang ada dan memang menambah kolom ketiga', () => {
    // Tanpa ini, seseorang bisa menghapus mode effort dan penjaga di atas jadi hijau sambil
    // menjaga aturan untuk layout yang sudah tidak ada.
    expect(CSS).toMatch(/\.setrow\.eff3/)
    const workout = readFileSync(new URL('../views/Workout.jsx', import.meta.url), 'utf8')
    expect(workout).toContain("' eff3'")
  })
})
