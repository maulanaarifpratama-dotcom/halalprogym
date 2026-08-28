import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Kontras aksen SEBAGAI TEKS di tema terang.
 *
 * BUG YANG MELAHIRKAN BERKAS INI, dan kenapa dia bertahan lama
 *
 * Lime `#94e900` di atas putih memberi **1.5:1**. WCAG AA menuntut 4.5:1 untuk teks biasa dan
 * 3:1 untuk teks besar. Jadi di tema terang, label tombol ("Log", "New"), label tab yang aktif,
 * angka kalori hari ini, dan delta berat badan semuanya praktis tidak terbaca.
 *
 * Kesadarannya sebenarnya SUDAH ADA di `index.css`: catatan di blok tema terang menulis "di atas
 * paper, lime .12 nyaris hilang — garis terang pakai tinta, bukan aksen". Tapi itu cuma
 * diterapkan ke GARIS. Teks tidak ikut, dan tidak ada yang mengukurnya.
 *
 * Ini kelas kegagalan yang sama dengan "full body" yang tampil Inggris di 13 bahasa: cuma
 * terlihat kalau kamu benar-benar memakai mode yang bukan default. Pengembangnya memakai tema
 * gelap, dan di tema gelap lime di atas #101c13 sudah 11:1.
 *
 * KENAPA TES ANGKA, BUKAN TES RENDER
 *
 * Kontras itu aritmetika atas dua warna, dan aritmetika bisa dipaku persis. Tes render akan
 * menghitung warna yang sama lewat jalan yang jauh lebih panjang, dan di lingkungan tes dia juga
 * tidak bisa dipercaya: pengukuran pertama di browser sempat melaporkan 1.26:1 untuk teks yang
 * sebenarnya baik-baik saja, karena transisi CSS `background` MACET di currentTime 0 selama pane
 * tidak meng-komposit frame. Angka yang dibaca dari token tidak punya masalah itu.
 */

const CSS = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

/** Luminansi relatif WCAG dari #rrggbb. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(v[0] as number) + 0.7152 * f(v[1] as number) + 0.0722 * f(v[2] as number)
}

const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Membaca satu nilai token dari sebuah blok selektor di index.css. */
function token(selector: string, name: string): string {
  const i = CSS.indexOf(selector)
  expect(i, 'selektor ' + selector + ' harus ada di index.css').toBeGreaterThan(-1)
  const blok = CSS.slice(i, CSS.indexOf('}', i))
  const m = blok.match(new RegExp('--' + name + '\\s*:\\s*([^;\\n]+)'))
  expect(m, 'token --' + name + ' harus ada di ' + selector).toBeTruthy()
  return (m as RegExpMatchArray)[1]!.trim()
}

/** Permukaan tema terang, dari token yang sama yang dipakai app. */
const PAPER = token(':root[data-theme="light"]', 'surface')       // #ffffff
const PAPER_2 = token(':root[data-theme="light"]', 'surface-2')   // #e8efe1

/**
 * Tinta aksen per aksen di tema terang, dibaca dari `index.css`.
 *
 * Nilainya ditulis di sini sebagai HARAPAN, bukan diambil dari CSS: kalau diambil dari CSS,
 * tesnya akan setuju dengan apa pun yang ada di sana dan tidak menjaga apa pun. Yang diambil
 * dari CSS adalah PERMUKAANNYA, karena itu yang tidak boleh menyimpang dari app.
 */
const TINTA_TERANG: Record<string, string> = {
  lime: '#008140',    // --deep brand; --acc-2 (#0a9a00) cuma 3.4:1 dan gagal untuk teks biasa
  sky: '#0060df',
  orange: '#a35800',  // --acc-2 (#c76b00) cuma 3.8:1
  violet: '#8944ab',
  pink: '#d70036',
  red: '#d70015',
  teal: '#0071a4',
}

describe('aksen sebagai teks di tema terang lolos WCAG AA', () => {
  it('setiap aksen ≥ 4.5:1 di atas kartu putih', () => {
    for (const [nama, tinta] of Object.entries(TINTA_TERANG)) {
      expect(contrast(tinta, PAPER), nama + ' (' + tinta + ') di atas ' + PAPER)
        .toBeGreaterThanOrEqual(4.5)
    }
  })

  it('setiap aksen ≥ 3:1 di atas permukaan kedua', () => {
    // --surface-2 lebih gelap dari putih, jadi rasionya turun. 3:1 adalah ambang untuk teks
    // besar dan untuk objek grafis; teks kecil di atas permukaan ini jarang berwarna aksen.
    for (const [nama, tinta] of Object.entries(TINTA_TERANG)) {
      expect(contrast(tinta, PAPER_2), nama + ' di atas ' + PAPER_2).toBeGreaterThanOrEqual(3)
    }
  })

  it('lime MENTAH gagal — ini bug aslinya, dan angkanya dipaku supaya tidak dilupakan', () => {
    // Kalau suatu saat seseorang mengembalikan --acc-ink jadi var(--acc) di tema terang,
    // inilah yang dia dapatkan.
    expect(contrast('#94e900', '#ffffff')).toBeLessThan(1.6)
  })

  it('di tema GELAP lime memang sudah baik — jadi tidak ada alasan mengubahnya di sana', () => {
    const bgGelap = token(':root {', 'surface')
    expect(contrast('#94e900', bgGelap)).toBeGreaterThan(8)
  })
})

describe('token --acc-ink terpasang di kedua tema', () => {
  it('tema gelap memakai --acc apa adanya', () => {
    expect(token(':root {', 'acc-ink')).toBe('var(--acc)')
  })

  it('tema terang menurunkannya', () => {
    expect(token(':root[data-theme="light"]', 'acc-ink')).toBe('var(--acc-2)')
  })

  it('lime dan oranye punya penurunan sendiri, karena --acc-2 mereka tidak cukup', () => {
    expect(CSS).toContain('[data-accent="lime"]')
    expect(CSS).toMatch(/data-accent="lime"[\s\S]{0,120}--acc-ink/)
    expect(CSS).toMatch(/data-accent="orange"\]\s*\{\s*--acc-ink:\s*#a35800/)
  })

  it('NOL sisa `color:var(--acc)` di CSS — semuanya harus lewat --acc-ink', () => {
    // Penukaran mekanis selalu meninggalkan sisa. Ini yang memastikan tidak ada.
    const sisa = [...CSS.matchAll(/color:\s*var\(--acc\)/g)]
    expect(sisa.length, 'pakai var(--acc-ink) untuk warna teks').toBe(0)
  })

  it('kuning sebagai teks juga punya tintanya sendiri', () => {
    // #ffcc00 di atas putih 1.5:1 — persis masalah yang sama.
    expect(contrast('#ffcc00', '#ffffff')).toBeLessThan(1.6)
    const tinta = token(':root[data-theme="light"]', 'yellow-ink')
    expect(contrast(tinta, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect([...CSS.matchAll(/color:\s*var\(--yellow\)/g)].length).toBe(0)
  })
})
