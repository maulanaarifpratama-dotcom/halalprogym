/**
 * Keputusan sinkronisasi — murni, tanpa jaringan, tanpa Supabase, tanpa React.
 *
 * Berkas ini menjawab dua pertanyaan yang keduanya bisa menghapus data orang kalau salah:
 *
 *   1. Saat boot, mana yang dipakai: state lokal atau state server?
 *   2. Apa yang dikirim ke server?
 *
 * Keduanya dipisah dari lapis jaringannya dengan sengaja. Aturan tes repo ini: apa pun yang
 * memutuskan beban berikutnya ATAU membaca balik sesi yang sudah dilog = pure helper dengan
 * unit test di sebelahnya, bukan diverifikasi dengan klik-klik. Keputusan "state siapa yang
 * menang" lebih berat dari keduanya — dia bisa membuang seluruh riwayat.
 *
 * SEMANTIKNYA: last-write-wins, sama seperti yang diwarisi dari server upstream.
 *
 * Itu keputusan sadar, bukan kelalaian. Merge per-field (menggabungkan sesi dari HP dan laptop
 * yang dicatat terpisah) adalah kontrak domain baru: dia harus memutuskan apa artinya dua sesi
 * di hari yang sama, dua berat badan di jam yang sama, dan rutin yang sama diubah di dua
 * tempat. Itu bukan pekerjaan yang boleh diputuskan diam-diam di lapis sync.
 *
 * Yang DIPERBAIKI dari warisannya: penanda kotor tidak lagi cuma boolean di localStorage yang
 * dibaca di tempat lain. Semua input keputusan masuk sebagai argumen, jadi setiap kombinasi
 * bisa diuji.
 */
import type { AppState } from './types.js'

/** Ambang toleransi jam antar-perangkat, milidetik. */
const CLOCK_SKEW_MS = 60_000

export interface SyncInputs {
  /** State di perangkat ini. */
  local: AppState
  /** State dari server, atau null kalau pengguna ini belum pernah push. */
  remote: AppState | null
  /**
   * Ada perubahan lokal yang belum pernah sampai ke server (push gagal karena offline).
   * Ini bukan turunan dari `_ts`: sebuah push yang gagal meninggalkan `_ts` lokal yang lebih
   * baru DAN state server yang lebih tua, dan tanpa penanda ini keduanya tidak bisa dibedakan
   * dari kasus "perangkat lain menulis lebih dulu".
   */
  dirty: boolean
}

export type SyncAction =
  /** Pakai state server, timpa yang lokal. */
  | { use: 'remote'; why: string }
  /** Pertahankan state lokal, dan dorong ke server. */
  | { use: 'local'; push: true; why: string }
  /** Pertahankan state lokal, jangan dorong apa pun. */
  | { use: 'local'; push: false; why: string }

const ts = (s: AppState | null | undefined): number => Number(s?._ts) || 0

/** Apakah state ini memuat sesuatu yang layak dipertahankan? */
export const hasContent = (s: AppState | null | undefined): boolean =>
  !!((s?.workouts?.length) || (s?.routines?.length) || (s?.bodyweight?.length))

/**
 * Memutuskan apa yang terjadi saat boot, setelah state server berhasil dibaca.
 *
 * Urutan cabangnya penting, dan setiap cabang ada karena satu kasus nyata:
 */
export function decideSync({ local, remote, dirty }: SyncInputs): SyncAction {
  // Pengguna baru, atau akun yang belum pernah push. Tidak ada yang bisa dibandingkan.
  if (!remote) {
    return hasContent(local)
      ? { use: 'local', push: true, why: 'server kosong, lokal punya data' }
      : { use: 'local', push: false, why: 'dua-duanya kosong' }
  }

  // Perangkat baru (baru install, atau localStorage kena evict). Server yang benar, dan ini
  // satu-satunya cabang yang boleh menimpa lokal tanpa membandingkan jam — karena tidak ada
  // apa pun untuk dibandingkan.
  if (!hasContent(local)) {
    return { use: 'remote', why: 'lokal kosong, ambil dari server' }
  }

  // Ada perubahan lokal yang belum sampai ke server. JANGAN ambil server, apa pun jam-nya:
  // mengambil server di sini berarti membuang sesi yang baru dicatat di basement gym tanpa
  // sinyal — persis situasi yang jadi alasan app ini offline-first.
  if (dirty) {
    return { use: 'local', push: true, why: 'ada perubahan lokal yang belum terkirim' }
  }

  const dt = ts(remote) - ts(local)

  // Server lebih baru dan lokal bersih: perangkat lain menulis, dan tulisan itu memang yang
  // terakhir. Ambil.
  if (dt > CLOCK_SKEW_MS) {
    return { use: 'remote', why: 'server lebih baru dan lokal bersih' }
  }

  // Lokal lebih baru dari server padahal tidak ditandai kotor. Bisa terjadi: penanda kotor
  // hilang bersama localStorage yang sebagian ter-evict, atau push terakhir gagal setelah
  // penanda dihapus. Dorong — lokal yang lebih baru.
  if (dt < -CLOCK_SKEW_MS) {
    return { use: 'local', push: true, why: 'lokal lebih baru dari server' }
  }

  // Selisihnya di dalam ambang toleransi jam. Dua perangkat bisa beda menit tanpa ada yang
  // salah, jadi "lebih baru 3 detik" bukan bukti apa pun. Diamkan: tidak menimpa, tidak
  // mendorong. Perubahan berikutnya yang akan mendorong sendiri.
  return { use: 'local', push: false, why: 'selisih jam dalam ambang toleransi' }
}

/**
 * Apa yang benar-benar dikirim ke server.
 *
 * `active` DIBUANG. Aturan #1 CLAUDE.md: sesi yang sedang berjalan cuma milik klien,
 * disinkronkan waktu selesai. Kalau dia ikut terkirim, membuka app di perangkat kedua akan
 * menarik sesi setengah jalan dari perangkat pertama, dan dua-duanya saling menimpa tiap set.
 *
 * Dibuang di SINI, bukan di pemanggilnya, supaya tidak ada jalur push yang bisa lupa.
 */
export function stateForPush(local: AppState): AppState {
  const { active: _active, ...rest } = local
  return { ...rest, active: null } as AppState
}

/**
 * Menggabungkan state server ke perangkat ini.
 *
 * Sesi yang sedang berjalan di perangkat INI dipertahankan, walau state server yang dipakai.
 * Kalau tidak, menarik dari server di tengah latihan akan menghapus sesi yang sedang
 * dikerjakan orang — dan itu terjadi tepat di saat paling tidak boleh.
 */
export function applyRemote(remote: AppState, local: AppState, defaults: AppState): AppState {
  const next = Object.assign({}, defaults, remote) as AppState
  if (local.active) next.active = local.active
  return next
}
