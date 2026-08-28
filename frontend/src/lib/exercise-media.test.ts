import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { DEMO_COUNT, demoFrames, FEDB_COMMIT, hasDemo, normalizeBase } from './exercise-media.js'
import MAP from './exercise-media.json'

/**
 * Foto demo gerakan. Yang dijaga di sini bukan pemetaannya — itu dibangun skrip dan diperiksa
 * mata — tapi tiga hal yang kalau salah menghasilkan NOL FOTO TANPA SATU PUN ERROR.
 */
describe('normalizeBase — garis miring yang hilang', () => {
  it('menambahkan garis miring kalau tidak ada', () => {
    // Satu garis miring yang hilang di VITE_DEMO_BASE menghasilkan `demoBench_Press/0.jpg`.
    // Tidak ada error, tidak ada peringatan build — cuma app yang menampilkan nol foto gerakan
    // sementara hasDemo tetap bilang fotonya ada.
    expect(normalizeBase('demo')).toBe('demo/')
    expect(normalizeBase('/img/exercises')).toBe('/img/exercises/')
    expect(normalizeBase('https://cdn.example/x')).toBe('https://cdn.example/x/')
  })

  it('tidak menggandakan garis miring yang sudah ada', () => {
    expect(normalizeBase('demo/')).toBe('demo/')
    expect(normalizeBase('https://cdn.example/x/')).toBe('https://cdn.example/x/')
  })

  it('basis kosong dibiarkan kosong, bukan jadi "/"', () => {
    // Basis kosong berarti jalur relatif apa adanya. Mengubahnya jadi "/" akan memindahkan
    // seluruh foto ke akar domain, yang bukan tempatnya di build dengan base './'.
    expect(normalizeBase('')).toBe('')
  })
})

describe('demoFrames', () => {
  const withDemo = Object.keys(MAP)[0]!

  it('menyusun URL dari basis dan jalur bingkai', () => {
    const frames = demoFrames({ id: withDemo })
    expect(frames.length).toBeGreaterThan(0)
    for (const f of frames) expect(f).toContain(FEDB_COMMIT)
  })

  it('TIDAK ada garis miring ganda di URL yang tersusun', () => {
    // Ini yang benar-benar tampil di <img src>. Garis miring ganda di jsDelivr masih jalan,
    // tapi di jalur lokal `demo//Bench/0.jpg` bisa gagal tergantung server.
    for (const f of demoFrames({ id: withDemo })) {
      expect(f.replace('https://', '')).not.toContain('//')
    }
  })

  it('latihan tanpa foto mengembalikan array kosong, bukan URL rusak', () => {
    // Array kosong yang menjadikan hasDemo false itu penting: layar latihan lalu menampilkan
    // diagram otot, bukan kotak gambar yang gagal dimuat.
    expect(demoFrames({ id: 'latihan-yang-tidak-ada' })).toEqual([])
    expect(hasDemo({ id: 'latihan-yang-tidak-ada' })).toBe(false)
  })

  it('masukan yang tidak berbentuk tidak melempar', () => {
    for (const bad of [null, undefined, {} as { id?: string }]) {
      expect(demoFrames(bad as never)).toEqual([])
    }
  })
})

describe('commit di-pin di tiga tempat, satu nilai', () => {
  // CLAUDE.md sudah mewajibkan commit ini sama di `lib/exercise-media.ts` dan
  // `scripts/build-exercise-media.mjs`. Sejak APK membundel fotonya sendiri ada tempat KETIGA:
  // `scripts/fetch-demo-media.mjs`. Kalau satu menyimpang, peta menunjuk satu commit dan foto
  // datang dari commit lain — yang muncul di layar adalah GERAKAN YANG SALAH, tanpa error.
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')

  it('skrip pembangun peta memakai commit yang sama', () => {
    // Perhatikan path-nya: pembangun peta ada di `scripts/` AKAR REPO, bukan di
    // `frontend/scripts/`. Yang di frontend adalah yang dipanggil npm script dari sana.
    expect(read('../../../scripts/build-exercise-media.mjs')).toContain(FEDB_COMMIT)
  })

  it('skrip pengunduh MEMBACA commit dari sumber, tidak menuliskannya sendiri', () => {
    // Cara terbaik menjaga tiga tempat tetap satu nilai adalah membuat salah satunya bukan
    // tempat penyimpanan. Skrip pengunduh mengambilnya dari lib/exercise-media.ts.
    const fetcher = read('../../scripts/fetch-demo-media.mjs')
    expect(fetcher).toContain("FEDB_COMMIT = '([0-9a-f]{40})'")
    expect(fetcher).not.toContain(FEDB_COMMIT)
  })
})

describe('build mobile membundel fotonya, build WEB tidak', () => {
  // Pintu `VITE_DEMO_BASE` sudah ada sejak awal dan komentarnya menyebut APK yang membundel
  // fotonya sendiri — tapi tidak pernah ada yang lewat: build:mobile tidak menyetelnya dan tidak
  // ada yang mengunduh berkasnya. Tes ini yang memastikan pintunya dipakai, bukan cuma ada.
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  const mobile: string = pkg.scripts['build:mobile']

  it('build:mobile menyiapkan foto lalu menunjuk ke sana', () => {
    expect(mobile).toContain('media:demo')
    expect(mobile).toContain('VITE_DEMO_BASE=demo/')
    expect(mobile).toContain('VITE_MOBILE=1')
  })

  it('unduh SEBELUM build, salin SESUDAH build, cap sync terakhir', () => {
    // Urutannya bukan selera. `vite build` mengosongkan `dist/`, jadi menyalin sebelum build
    // berarti salinannya terhapus; `cap sync` sebelum salin berarti APK dibangun dari dist yang
    // belum ada fotonya. Dua-duanya menghasilkan APK tanpa satu pun foto, tanpa satu pun error.
    const iUnduh = mobile.indexOf('run media:demo &&')
    const iBuild = mobile.indexOf('vite build')
    const iSalin = mobile.indexOf('media:demo:emit')
    const iSync = mobile.indexOf('cap sync')
    expect(iUnduh).toBeGreaterThanOrEqual(0)
    expect(iUnduh).toBeLessThan(iBuild)
    expect(iBuild).toBeLessThan(iSalin)
    expect(iSalin).toBeLessThan(iSync)
  })

  it('kedua langkah media ada sebagai skrip sendiri', () => {
    expect(pkg.scripts['media:demo']).toContain('fetch-demo-media.mjs')
    expect(pkg.scripts['media:demo:emit']).toContain('--emit')
  })

  it('cache foto TIDAK boleh ada di public/', () => {
    // Vite menyalin seluruh `public/` ke `dist/` di SETIAP build, jadi cache di sana membuat
    // build WEB ikut membawa 39 MB yang tidak dipakai sama sekali — terukur: dist jadi 49 MB
    // alih-alih 11 MB, dan itu terkirim ke Vercel tiap deploy. Ini pernah terjadi selama
    // pengerjaannya, dan cuma ketangkap karena ukurannya diukur.
    expect(existsSync(new URL('../../public/demo', import.meta.url))).toBe(false)
  })

  it('skrip pengunduh menyimpan ke media-cache, bukan ke public', () => {
    const fetcher = readFileSync(new URL('../../scripts/fetch-demo-media.mjs', import.meta.url), 'utf8')
    expect(fetcher).toContain("'media-cache', 'demo'")
    expect(fetcher).not.toContain("'public', 'demo'")
  })

  it('build WEB tidak menyebut VITE_DEMO_BASE sama sekali', () => {
    // Kalau dia menyebutnya, deploy web menunjuk ke berkas yang tidak dia bawa: nol foto, tanpa
    // error, sementara hasDemo tetap bilang fotonya ada.
    expect(pkg.scripts.build).not.toContain('VITE_DEMO_BASE')
  })
})

describe('DEMO_COUNT', () => {
  it('cocok dengan jumlah kunci peta', () => {
    // Angka ini tampil di header layar Latihan. Dia harus dihitung, bukan ditulis.
    expect(DEMO_COUNT).toBe(Object.keys(MAP).length)
  })
})
