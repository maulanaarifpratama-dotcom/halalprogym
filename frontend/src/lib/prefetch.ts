/**
 * Menyiapkan foto gerakan SEBELUM orang berangkat ke gym.
 *
 * KENAPA INI ADA. Service worker sudah men-cache foto yang pernah dilihat, dan itu menyelesaikan
 * kunjungan kedua. Tapi urutan yang sebenarnya terjadi bukan begitu: orang membuka app di rumah
 * pakai wifi untuk melihat rencana hari ini, lalu berangkat ke gym — dan justru DI SANA sinyalnya
 * jelek dan justru di sana fotonya dibutuhkan. Cache yang diisi saat dibutuhkan selalu terlambat
 * satu langkah.
 *
 * Jadi foto untuk rencana HARI INI disiapkan lebih dulu, saat masih di jaringan yang baik.
 *
 * DUA HAL YANG DITAHAN, karena data seluler di Indonesia itu biaya nyata:
 *
 *   1. Hanya rencana HARI INI, bukan seluruh rutin. Enam latihan, dua foto masing-masing.
 *   2. TIDAK di koneksi hemat-data atau lambat. `navigator.connection` memberi tahu keduanya,
 *      dan mengabaikannya berarti menghabiskan kuota orang untuk keperluan kita sendiri.
 *
 * Yang mengambilnya service worker, bukan halaman ini: dia yang punya cache-nya, dan
 * pengambilannya harus selamat kalau tab-nya ditutup di tengah jalan.
 */
import { demoFrames } from './exercise-media.js'
import type { Routine } from './types.js'

/** Batas atas, dijaga sama dengan batas di public/sw.js. */
export const PREFETCH_MAX = 40

interface NetworkInfo {
  saveData?: boolean
  effectiveType?: string
}

/** Koneksi yang tidak boleh dipakai untuk mengambil sesuatu yang belum diminta orang. */
const STINGY_TYPES = ['slow-2g', '2g']

/**
 * Boleh mengambil di muka pada koneksi ini?
 *
 * Koneksi yang TIDAK DIKETAHUI dijawab `true`. Itu disengaja: `navigator.connection` tidak ada
 * di Safari maupun Firefox, dan menolak prefetch di sana berarti mematikan fiturnya untuk
 * sebagian besar pengguna demi kehati-hatian yang tidak punya bukti.
 */
export function mayPrefetch(net: NetworkInfo | null | undefined): boolean {
  if (!net) return true
  if (net.saveData) return false
  return !STINGY_TYPES.includes(String(net.effectiveType || ''))
}

/**
 * URL foto untuk satu rutin, tanpa duplikat.
 *
 * Latihan yang tidak punya foto dilewati begitu saja — dia mendapat diagram otot, yang digambar
 * dari geometri yang sudah ikut di bundel dan karenanya sudah offline sejak awal.
 */
export function mediaUrlsFor(routine: Routine | null | undefined, max = PREFETCH_MAX): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const cfg of routine?.ex || []) {
    // Latihan tanpa id tidak bisa dicari fotonya. Disaring di sini, bukan di-cast: cast cuma
    // menyembunyikan pertanyaannya dari compiler, dan pertanyaannya sah.
    if (!cfg || typeof cfg.id !== 'string') continue
    for (const url of demoFrames({ id: cfg.id })) {
      if (seen.has(url)) continue
      seen.add(url)
      out.push(url)
      if (out.length >= max) return out
    }
  }
  return out
}

/**
 * Menyuruh service worker menyiapkan URL-URL ini.
 *
 * Mengembalikan berapa banyak yang DIKIRIM, bukan berapa yang berhasil diambil: pengambilannya
 * terjadi di service worker dan sengaja tidak ditunggu — halaman tidak boleh menunggu apa pun
 * untuk ini.
 *
 * Nol berarti tidak ada yang dikirim, dan itu bukan kegagalan: tidak ada service worker (dev di
 * http, atau build mobile), koneksi hemat data, atau memang tidak ada foto untuk rencana hari
 * ini. Ketiganya keadaan normal.
 */
export function prefetchMedia(urls: string[], sw?: ServiceWorkerContainer | null, net?: NetworkInfo | null): number {
  if (!urls.length) return 0
  if (!mayPrefetch(net)) return 0
  const container = sw === undefined
    ? (typeof navigator !== 'undefined' ? navigator.serviceWorker : null)
    : sw
  const active = container?.controller
  if (!active) return 0
  try {
    active.postMessage({ type: 'prefetch-media', urls })
    return urls.length
  } catch {
    return 0
  }
}

/** Jalur yang dipakai UI: rencana hari ini, dengan gerbang koneksi bawaan. */
export function prefetchRoutine(routine: Routine | null | undefined): number {
  const net = (typeof navigator !== 'undefined'
    ? (navigator as unknown as { connection?: NetworkInfo }).connection
    : null) || null
  return prefetchMedia(mediaUrlsFor(routine), undefined, net)
}
