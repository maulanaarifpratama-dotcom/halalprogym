/**
 * Baca/tulis state ke Supabase. Lapis jaringan saja — keputusan siapa yang menang ada di
 * lib/sync.ts, dan itu dipisah supaya keputusannya bisa ditesnya tanpa jaringan.
 *
 * Semua fungsi di sini **tidak melempar karena offline.** Kegagalan jaringan bukan kondisi
 * error di app ini, dia keadaan normal: orang latihan di basement gym dengan sinyal jelek.
 * Yang dilaporkan lewat nilai kembali adalah "berhasil atau tidak", supaya pemanggil bisa
 * menandai state kotor dan mencoba lagi nanti.
 */
import { STATE_TABLE, supa } from './supabase.js'
import { stateForPush } from './sync.js'
import type { AppState } from './types.js'

/** Menarik state pengguna. `{ ok: false }` berarti tidak tahu — BUKAN "server kosong". */
export async function fetchRemoteState(
  userId: string
): Promise<{ ok: true; state: AppState | null } | { ok: false }> {
  const sb = supa()
  if (!sb) return { ok: false }
  try {
    const { data, error } = await sb
      .from(STATE_TABLE)
      .select('state')
      .eq('user_id', userId)
      .maybeSingle()
    // `maybeSingle` mengembalikan data null tanpa error kalau barisnya belum ada, dan bedanya
    // dengan gagal-jaringan itu penting: yang pertama berarti "akun ini belum pernah push"
    // (aman untuk didorongi), yang kedua berarti "tidak tahu" (jangan sentuh apa pun).
    if (error) return { ok: false }
    return { ok: true, state: (data?.state as AppState) ?? null }
  } catch {
    return { ok: false }
  }
}

/** Mendorong state. `false` berarti belum sampai — penanda kotor jadi tanggung jawab pemanggil. */
export async function pushRemoteState(userId: string, local: AppState): Promise<boolean> {
  const sb = supa()
  if (!sb) return false
  const state = stateForPush(local)
  try {
    const { error } = await sb.from(STATE_TABLE).upsert(
      {
        user_id: userId,
        state,
        // Kolom sendiri, bukan dibaca dari dalam jsonb: perbandingan jam terjadi di klien, dan
        // menaruhnya di kolom membuatnya bisa dilihat langsung saat menyelidiki bentrokan.
        client_ts: Number(state._ts) || 0,
      },
      { onConflict: 'user_id' }
    )
    return !error
  } catch {
    return false
  }
}

/**
 * Menghapus baris state pengguna. Dipakai "hapus semua data" agar penghapusan tidak cuma lokal
 * — kalau barisnya ditinggal, boot berikutnya di perangkat lain akan menariknya kembali dan
 * penghapusannya terasa tidak berlaku.
 */
export async function deleteRemoteState(userId: string): Promise<boolean> {
  const sb = supa()
  if (!sb) return false
  try {
    const { error } = await sb.from(STATE_TABLE).delete().eq('user_id', userId)
    return !error
  } catch {
    return false
  }
}
