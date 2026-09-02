import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * BARIS DAFTAR YANG BISA DIKETUK HARUS BISA DIJANGKAU KEYBOARD.
 *
 * CSS `.item` di `index.css` sudah ditulis untuk tombol sejak awal — `text-align:left` dan
 * `width:100%` cuma berarti apa-apa pada `<button>`. Tapi JSX-nya memakai `<div>` di ke-18 tempat,
 * jadi setiap baris daftar di app ini: tidak masuk urutan tab, tidak merespons Enter atau Space,
 * dan tidak disebut sebagai kontrol oleh pembaca layar.
 *
 * Itu bukan kelalaian satu berkas, itu pola yang disalin 18 kali — dan pola yang disalin tidak
 * pernah diperbaiki dengan memperbaiki satu pemakaian.
 *
 * DUA ATURAN, DAN YANG KEDUA YANG LEBIH MUDAH DILANGGAR
 *
 * 1. Baris dengan `onClick` sendiri harus `<button>`.
 * 2. `<button>` TIDAK BOLEH memuat elemen interaktif lain. Ini HTML yang tidak sah, dan
 *    pelanggarannya sempat terjadi di sesi yang menulis tes ini: baris latihan di Library punya
 *    tombol "Plan" sendiri, dan pemeriksaan pertama saya melewatkannya karena dia mencari
 *    `<button` huruf kecil sementara yang ada `<Button>` — komponen, huruf besar.
 *
 * Baris yang punya DUA aksi bukan satu tombol. Bentuk yang benar: barisnya tetap wadah, aksi
 * utamanya `<button className="imain">` di dalamnya yang mengambil thumbnail plus teks — supaya
 * target ketuk jempol tidak menyusut demi memperbaiki keyboard.
 *
 * Baris TANPA `onClick` sendiri sengaja tidak diwajibkan jadi tombol: di `Food.jsx` ada baris
 * statis yang cuma memuat tombol hapus, dan dia memang bukan kontrol.
 */

const SRC = new URL('../', import.meta.url)

const kumpulkan = (dir: URL): string[] => {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...kumpulkan(new URL(e.name + '/', dir)))
    else if (/\.jsx$/.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(fileURLToPath(new URL(e.name, dir)))
    }
  }
  return out
}

const BERKAS = kumpulkan(SRC)
const nama = (p: string): string => p.split(/[\\/]/).slice(-2).join('/')

/** Indeks tepat setelah `>` yang menutup tag pembuka yang mulai di `i`. */
function akhirTag(s: string, i: number): number {
  let kurung = 0
  let kutip: string | null = null
  for (let j = i; j < s.length; j++) {
    const c = s[j] as string
    if (kutip) { if (c === kutip) kutip = null; continue }
    if (c === '"' || c === "'") { kutip = c; continue }
    if (c === '{') kurung++
    else if (c === '}') kurung--
    else if (c === '>' && kurung === 0) return j + 1
  }
  return s.length
}

/**
 * Isi antara tag pembuka di `i` dan `</button>` pasangannya.
 *
 * `mulai` disimpan di variabel sendiri, dan itu BUKAN kerapian: versi pertama memakai
 * `p.lastIndex` sebagai awal potongan, padahal `exec()` sudah memutasinya di setiap putaran.
 * Isinya terpotong jadi kosong, dan penjaganya hijau sambil tidak memeriksa apa pun — ketangkap
 * cuma karena uji-baliknya menolak merah.
 *
 * Case-insensitive dengan sengaja: `<Button>` dari `ui.jsx` merender `<button>`, dan kedalaman
 * yang mengabaikan huruf besar akan salah menemukan penutupnya.
 */
function isiTombol(s: string, i: number): string {
  const mulai = akhirTag(s, i)
  let d = 1
  const p = /<button\b|<\/button>/gi
  p.lastIndex = mulai
  let m: RegExpExecArray | null
  while ((m = p.exec(s))) {
    if ((m[0] as string).startsWith('</')) {
      d--
      if (d === 0) return s.slice(mulai, m.index)
    } else d++
  }
  return s.slice(mulai)
}

const barisKe = (s: string, i: number): number => s.slice(0, i).split('\n').length

describe('baris daftar yang bisa diketuk harus <button>', () => {
  it('ada berkas .jsx yang dipindai — penjaga yang tidak memindai apa pun bukan penjaga', () => {
    expect(BERKAS.length).toBeGreaterThan(10)
  })

  it('tidak ada <div className="item"> yang punya onClick sendiri', () => {
    const salah: string[] = []
    for (const f of BERKAS) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/<div\b/g)) {
        const tag = s.slice(m.index as number, akhirTag(s, m.index as number))
        if (/className="item"/.test(tag) && /onClick/.test(tag)) {
          salah.push(nama(f) + ':' + barisKe(s, m.index as number))
        }
      }
    }
    expect(
      salah,
      'Baris ini bisa diketuk tapi berupa <div>, jadi tidak bisa dijangkau keyboard. '
      + 'Ganti ke <button type="button" className="item">. Kalau barisnya punya DUA aksi, '
      + 'pakai wadah <div className="item"> dengan <button className="imain"> di dalamnya.'
    ).toEqual([])
  })
})

describe('SETIAP <div> yang bisa diketuk, bukan cuma yang berkelas .item', () => {
  /**
   * Aturan `.item` di atas menutup 18 baris daftar, lalu berhenti di situ — dan empat kontrol
   * lain lolos justru karena kelasnya berbeda:
   *
   *   Home.jsx  `.wday`       tujuh sel hari, membuka lembar penjadwalan
   *   Home.jsx  `.today-row`  AKSI UTAMA app ini: mulai / lanjutkan latihan hari ini
   *   Home.jsx  `.card`       kartu rentetan, membuka kalender
   *   Stats.jsx `.mrow`       baris latihan per otot, membuka progres latihan itu
   *
   * Terukur di DOM hidup sebelum diperbaiki: **sembilan elemen bisa-diketuk di Beranda, dan
   * nol yang masuk urutan tab.** Jadi satu-satunya cara memulai latihan lewat keyboard adalah
   * tab bar di bawah — aksi utama layarnya sendiri tidak bisa dijangkau.
   *
   * Dan seperti `.item`, CSS-nya sudah lebih dulu ditulis untuk tombol: `.wday` membawa
   * `background:none;border:none` dan `.today-row` membawa `width:100%;text-align:left`.
   * Deklarasi itu cuma berarti apa-apa pada `<button>`.
   *
   * PENGECUALIANNYA PER-BARIS, BUKAN PELONGGARAN ATURAN — pola `HAND_REJECTS` yang sama dengan
   * skrip media: aturan yang cukup longgar untuk memaklumi kasus sah akan memaklumi juga yang
   * tidak sah, jadi yang sah didaftar satu-satu bersama alasannya.
   */
  /**
   * Kuncinya PENANDA HARFIAH dari tag itu, bukan nama kelas — dan itu bukan pilihan gaya:
   * `Media.jsx` menulis `className={cls('')}`, jadi nama kelas `.exmedia` yang sebenarnya
   * dirender tidak pernah muncul di sumbernya. Daftar berbasis nama kelas akan melewatkannya,
   * lalu tampak seolah tidak ada pengecualian yang dibutuhkan.
   */
  const BOLEH_DIV: Record<string, string> = {
    // Latar lembar. Menutup lembar dengan mengetuk luar adalah kenyamanan penunjuk; padanan
    // keyboard-nya Escape, bukan tab stop. Latar yang bisa di-tab justru menambah satu
    // perhentian membingungkan di depan setiap lembar.
    'className="mback"': 'latar lembar — padanannya Escape, bukan tab stop',
    // Gambar demo: mengetuk gambarnya memajukan bingkai, dan target sebesar gambar itu yang
    // benar untuk jempol. Padanan keyboard-nya ADA dan berupa tombol sungguhan — petunjuk
    // `.gifhint` di sudut, yang memang sudah mengatakan keadaannya. Jadi ini target penunjuk
    // TAMBAHAN di atas kontrol yang sudah bisa dijangkau, bukan satu-satunya jalan.
    "className={cls('')}": 'target jempol tambahan; kontrol keyboard-nya tombol .gifhint di dalamnya',
    // Heatmap 12 bulan: setiap hari BERISI bisa diketuk untuk membuka sesinya. Menjadikan
    // ratusan sel jadi tab stop akan memperburuk keyboard, bukan memperbaikinya — pemakainya
    // harus menekan Tab ratusan kali untuk melewati satu grafik. Dan datanya TIDAK terkunci di
    // sini: layar Riwayat memuat setiap sesi sebagai baris tombol yang sudah bisa dijangkau.
    // Perbaikan yang benar adalah roving tabindex (satu tab stop, panah untuk bergerak di
    // dalam grid), dan itu belum dikerjakan — jadi ini pengecualian yang jujur, bukan selesai.
    // Penanda tanpa spasi: sumbernya memasang baris baru antara className dan title.
    'className={cls}': 'grid ratusan sel; datanya sama dengan layar Riwayat yang sudah bisa dijangkau',
  }

  it('nol <div onClick> di luar daftar pengecualian', () => {
    const salah: string[] = []
    for (const f of BERKAS) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/<div\b/g)) {
        const i = m.index as number
        const tag = s.slice(i, akhirTag(s, i))
        if (!/\bonClick=/.test(tag)) continue
        if (Object.keys(BOLEH_DIV).some(penanda => tag.includes(penanda))) continue
        salah.push(nama(f) + ':' + barisKe(s, i) + '  ' + tag.replace(/\s+/g, ' ').slice(0, 90))
      }
    }
    expect(
      salah,
      'Elemen ini bisa diketuk tapi berupa <div>, jadi tidak masuk urutan tab dan tidak '
      + 'merespons Enter/Space. Ganti ke <button type="button">, atau — kalau dia memang '
      + 'target penunjuk tambahan di atas kontrol yang sudah bisa dijangkau — daftarkan '
      + 'kelasnya di BOLEH_DIV beserta alasannya.\n' + salah.join('\n')
    ).toEqual([])
  })

  it('daftar pengecualiannya tidak menumpuk diam-diam', () => {
    // Dua sekarang. Angkanya dipaku supaya pengecualian ketiga adalah keputusan yang terlihat
    // di diff, bukan baris yang menyelip.
    expect(Object.keys(BOLEH_DIV)).toHaveLength(3)
    for (const alasan of Object.values(BOLEH_DIV)) expect(alasan.length).toBeGreaterThan(20)
  })

  it('kontrol yang diperbaiki benar-benar tombol sekarang', () => {
    const home = readFileSync(
      fileURLToPath(new URL('../views/Home.jsx', import.meta.url)), 'utf8')
    const stats = readFileSync(
      fileURLToPath(new URL('../views/Stats.jsx', import.meta.url)), 'utf8')
    // Dipaku ke SUMBER, bukan cuma "tidak ada div onClick": tanpa ini, menghapus kontrolnya
    // sama sekali juga membuat tes di atas hijau.
    expect(home).toContain('<button type="button" className="today-row"')
    expect(home).toMatch(/<button type="button" key=\{i\} className=\{'wday'/)
    expect(home).toContain('<button type="button" className="card tappable"')
    expect(stats).toContain('<button type="button" key={row.id} className="mrow"')
  })

  it('CSS membawa reset yang <button> tidak wariskan', () => {
    const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
    // `<button>` tidak mewarisi font-family maupun color, dan anak-anak keempat kelas ini cuma
    // menyetel UKURAN — jadi tanpa `font:inherit` nama harinya dirender dengan font bawaan
    // browser. Terlihat langsung di layar.
    expect(css).toMatch(/button\.wday[^{]*\{[^}]*font:inherit/)
    expect(css).toMatch(/button\.wday[^{]*\{[^}]*color:inherit/)
    // Dan resetnya TIDAK boleh menyentuh display atau background: `button.card` (0,1,1)
    // mengalahkan `.row` (0,1,0) dan `.card`, jadi versi pertama menjatuhkan chevron kartu
    // Makanan ke baris sendiri DAN menghapus permukaan kartunya.
    const blok = (css.match(/button\.wday[^}]*\}/) || [''])[0]
    expect(blok).not.toContain('display:')
    expect(blok).not.toContain('background:')
  })
})

describe('<button> tidak boleh memuat elemen interaktif lain', () => {
  /**
   * Daftarnya memuat KOMPONEN berhuruf besar, bukan cuma tag HTML. `<Button>` dari `ui.jsx`
   * merender `<button>`, dan pemeriksaan yang cuma mencari `<button` huruf kecil akan
   * melewatkannya — itu tepat yang terjadi sebelum tes ini ada.
   */
  const INTERAKTIF = [
    '<Button', '<Switch', '<Check', '<Stepper', '<Slider', '<Segmented',
    '<SearchField', '<TextField', '<NumberField', '<TextArea',
    '<button', '<input', '<select', '<textarea', '<a ',
  ]

  it('nol elemen interaktif di dalam baris daftar mana pun', () => {
    const salah: string[] = []
    for (const f of BERKAS) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/<button\b/g)) {
        const i = m.index as number
        const tag = s.slice(i, akhirTag(s, i))
        if (!/className="(item|imain)"/.test(tag)) continue
        const isi = isiTombol(s, i)
        const nested = INTERAKTIF.filter(k => isi.includes(k))
        if (nested.length) salah.push(nama(f) + ':' + barisKe(s, i) + ' -> ' + nested.join(' '))
      }
    }
    expect(
      salah,
      '<button> di dalam <button> itu HTML yang tidak sah. Baris dengan dua aksi bukan satu '
      + 'tombol: pakai wadah <div className="item"> dan <button className="imain"> untuk aksi '
      + 'utamanya, lalu taruh aksi keduanya sebagai saudara di luar tombol itu.'
    ).toEqual([])
  })
})

describe('CSS-nya memang mendukung bentuk itu', () => {
  const CSS = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

  it('`.item` ditulis untuk tombol', () => {
    // Kalau ini hilang, `<button className="item">` akan mewarisi gaya tombol bawaan browser dan
    // seluruh daftar berubah bentuk. Dua properti ini yang membuat konversinya aman.
    const blok = (CSS.match(/\.item\{[^}]*\}/) || [])[0] || ''
    expect(blok, 'blok .item tidak ketemu').toBeTruthy()
    expect(blok).toContain('text-align:left')
    expect(blok).toContain('width:100%')
  })

  it('`.imain` ada dan menetralkan gaya tombol bawaan', () => {
    const blok = (CSS.match(/\.item \.imain\{[^}]*\}/) || [])[0] || ''
    expect(blok, 'blok .item .imain tidak ketemu').toBeTruthy()
    for (const perlu of ['background:none', 'border:0', 'font:inherit', 'text-align:left']) {
      expect(blok, 'perlu ' + perlu).toContain(perlu)
    }
  })
})
