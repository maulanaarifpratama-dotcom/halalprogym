import { describe, expect, it, vi } from 'vitest'
import { mayPrefetch, mediaUrlsFor, prefetchMedia, PREFETCH_MAX } from './prefetch.js'
import { demoFrames } from './exercise-media.js'
import { CATALOGUE } from './exercises.js'

// Latihan yang benar-benar punya foto di peta media — diambil dari katalog, bukan ditulis
// tangan, supaya tesnya tidak busuk saat commit free-exercise-db dinaikkan.
const WITH_PHOTOS = (CATALOGUE as Array<{ id: string }>)
  .filter(e => demoFrames(e).length > 0)
  .slice(0, 6)
const WITHOUT = (CATALOGUE as Array<{ id: string }>).find(e => demoFrames(e).length === 0)

describe('mayPrefetch', () => {
  it('menolak koneksi hemat data', () => {
    // Data seluler di Indonesia itu biaya nyata, dan ini permintaan yang TIDAK diminta orang.
    expect(mayPrefetch({ saveData: true })).toBe(false)
    expect(mayPrefetch({ saveData: true, effectiveType: '4g' })).toBe(false)
  })

  it('menolak 2g dan slow-2g', () => {
    expect(mayPrefetch({ effectiveType: '2g' })).toBe(false)
    expect(mayPrefetch({ effectiveType: 'slow-2g' })).toBe(false)
  })

  it('mengizinkan 3g ke atas', () => {
    for (const t of ['3g', '4g']) expect(mayPrefetch({ effectiveType: t }), t).toBe(true)
  })

  it('koneksi yang TIDAK DIKETAHUI diizinkan', () => {
    // navigator.connection tidak ada di Safari maupun Firefox. Menolak di sana berarti
    // mematikan fiturnya untuk sebagian besar pengguna demi kehati-hatian tanpa bukti.
    expect(mayPrefetch(null)).toBe(true)
    expect(mayPrefetch(undefined)).toBe(true)
    expect(mayPrefetch({})).toBe(true)
  })
})

describe('mediaUrlsFor', () => {
  it('mengumpulkan foto seluruh latihan di rutin', () => {
    const routine = { ex: WITH_PHOTOS.map(e => ({ id: e.id })) }
    const urls = mediaUrlsFor(routine)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.length).toBe(WITH_PHOTOS.reduce((n, e) => n + demoFrames(e).length, 0))
  })

  it('membuang duplikat', () => {
    // Rutin bisa memuat latihan yang sama dua kali (mis. superset dipecah).
    const one = WITH_PHOTOS[0]!
    const urls = mediaUrlsFor({ ex: [{ id: one.id }, { id: one.id }] })
    expect(urls).toEqual(demoFrames(one))
  })

  it('melewati latihan tanpa foto tanpa mengeluh', () => {
    // Yang tanpa foto mendapat diagram otot, dan geometrinya sudah ikut di bundel — jadi dia
    // memang sudah offline sejak awal dan tidak ada yang perlu disiapkan.
    expect(WITHOUT).toBeTruthy()
    expect(mediaUrlsFor({ ex: [{ id: WITHOUT!.id }] })).toEqual([])
  })

  it('rutin kosong atau tidak ada menghasilkan daftar kosong', () => {
    expect(mediaUrlsFor(null)).toEqual([])
    expect(mediaUrlsFor(undefined)).toEqual([])
    expect(mediaUrlsFor({})).toEqual([])
    expect(mediaUrlsFor({ ex: [] })).toEqual([])
  })

  it('dibatasi — satu rutin tidak boleh menarik ratusan berkas', () => {
    const many = { ex: Array.from({ length: 200 }, (_, i) => ({ id: WITH_PHOTOS[i % WITH_PHOTOS.length]!.id })) }
    expect(mediaUrlsFor(many).length).toBeLessThanOrEqual(PREFETCH_MAX)
  })
})

describe('prefetchMedia', () => {
  const withController = () => {
    const postMessage = vi.fn()
    return { sw: { controller: { postMessage } } as unknown as ServiceWorkerContainer, postMessage }
  }

  it('mengirim URL-nya ke service worker', () => {
    const { sw, postMessage } = withController()
    const n = prefetchMedia(['a', 'b'], sw, null)
    expect(n).toBe(2)
    expect(postMessage).toHaveBeenCalledWith({ type: 'prefetch-media', urls: ['a', 'b'] })
  })

  it('nol kalau tidak ada service worker yang mengendalikan halaman', () => {
    // Normal di dev (http, jadi SW tidak didaftarkan) dan di build mobile. Bukan kegagalan.
    expect(prefetchMedia(['a'], null, null)).toBe(0)
    expect(prefetchMedia(['a'], {} as ServiceWorkerContainer, null)).toBe(0)
  })

  it('nol di koneksi hemat data, tanpa mengirim apa pun', () => {
    const { sw, postMessage } = withController()
    expect(prefetchMedia(['a'], sw, { saveData: true })).toBe(0)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('daftar kosong tidak mengirim pesan', () => {
    const { sw, postMessage } = withController()
    expect(prefetchMedia([], sw, null)).toBe(0)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('postMessage yang melempar tidak merambat ke pemanggil', () => {
    // Ini dipanggil dari efek render. Satu exception di sini akan menjatuhkan layar Beranda
    // demi hal yang seluruhnya opsional.
    const sw = { controller: { postMessage: () => { throw new Error('x') } } } as unknown as ServiceWorkerContainer
    expect(prefetchMedia(['a'], sw, null)).toBe(0)
  })
})
