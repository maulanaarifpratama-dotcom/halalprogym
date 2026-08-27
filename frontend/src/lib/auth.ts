/**
 * Auth — Google OAuth + magic link email, di atas Supabase Auth.
 *
 * KENAPA BUKAN PASSKEY, yang dipakai upstream
 *
 * Passkey terikat ke RP_ID, yaitu domainnya. Di Vercel setiap preview deployment punya domain
 * sendiri, jadi passkey yang dibuat di produksi tidak berlaku di preview dan sebaliknya —
 * artinya alur masuk tidak bisa diuji di tempat yang justru dipakai untuk mengujinya. Dan di
 * WebView APK, origin-nya tidak pernah cocok dengan domain server, jadi passkey memang mustahil
 * dari dalam app. Upstream menyelesaikannya dengan kode pairing sekali-pakai dari tab browser
 * yang sudah masuk; itu butuh server yang sudah kita hapus.
 *
 * Google + magic link tidak punya dua masalah itu: keduanya berbasis redirect, nol biaya
 * per-login, dan Google punya penetrasi tinggi di Android Indonesia.
 *
 * SATU HAL YANG BELUM: Google OAuth diblokir di embedded WebView. Untuk APK nanti sign-in harus
 * lewat browser sistem + deep link. Magic link email tetap bekerja di WebView, jadi APK punya
 * jalan masuk sejak hari pertama.
 */
import { SUPABASE_READY, supa } from './supabase.js'

/** Bentuk pengguna yang dipakai app. Sengaja kecil — cuma yang benar-benar ditampilkan. */
export interface AppUser {
  id: string
  email: string | null
  name: string
}

/**
 * Nama yang layak ditampilkan dari satu akun.
 *
 * Urutannya: nama dari provider, lalu bagian sebelum @ pada email, lalu satu kata sapaan.
 * TIDAK pernah mengembalikan string kosong maupun id UUID — keduanya muncul di sapaan "Hai
 * {nama}" di Home, dan "Hai " atau "Hai 8f3a-..." itu terlihat rusak.
 */
export function displayName(meta: Record<string, unknown> | null | undefined, email: string | null | undefined): string {
  const fromMeta = [meta?.full_name, meta?.name, meta?.user_name]
    .find(v => typeof v === 'string' && v.trim())
  if (typeof fromMeta === 'string') return fromMeta.trim()
  const local = String(email || '').split('@')[0]?.trim()
  if (local) return local
  return 'Atlet'
}

interface SessionUserLike {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

/** Memetakan pengguna Supabase ke bentuk yang dipakai app. */
export const toAppUser = (u: SessionUserLike | null | undefined): AppUser | null =>
  u ? { id: u.id, email: u.email ?? null, name: displayName(u.user_metadata, u.email) } : null

/** Sesi yang tersimpan, atau null. Tidak melempar saat offline maupun tanpa kredensial. */
export async function currentUser(): Promise<AppUser | null> {
  const sb = supa()
  if (!sb) return null
  try {
    const { data } = await sb.auth.getSession()
    return toAppUser(data.session?.user)
  } catch {
    return null
  }
}

/**
 * URL yang dituju setelah masuk.
 *
 * Sengaja origin apa adanya, tanpa path: app ini pakai hash routing, jadi origin sudah membuka
 * layar utama, dan URL redirect yang harus didaftarkan di dashboard jadi satu per lingkungan
 * bukan satu per layar.
 */
export const redirectTo = (): string =>
  typeof window === 'undefined' ? '' : window.location.origin

export async function signInWithGoogle(): Promise<void> {
  const sb = supa()
  if (!sb) throw new Error('no-supabase')
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  })
  if (error) throw error
}

/** Mengirim magic link. Tidak memberi tahu apakah emailnya sudah terdaftar. */
export async function signInWithEmail(email: string): Promise<void> {
  const sb = supa()
  if (!sb) throw new Error('no-supabase')
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo() },
  })
  if (error) throw error
}

/**
 * `scope: 'global'` mengakhiri sesi di semua perangkat, 'local' cuma di perangkat ini.
 * Dipisah karena keduanya benar-benar dua tindakan berbeda di UI, dan yang global tidak boleh
 * dianggap berhasil kalau requestnya gagal — lihat pemanggilnya di store.
 */
export async function signOutHere(): Promise<void> {
  const sb = supa()
  if (!sb) return
  try { await sb.auth.signOut({ scope: 'local' }) } catch { /* sesi lokal tetap dibersihkan pemanggil */ }
}

export async function signOutEverywhere(): Promise<void> {
  const sb = supa()
  if (!sb) throw new Error('no-supabase')
  const { error } = await sb.auth.signOut({ scope: 'global' })
  if (error) throw error
}

/** Apakah masuk-dengan-akun ditawarkan sama sekali di build ini. */
export const authAvailable = (): boolean => SUPABASE_READY

/**
 * Validasi email seadanya — cukup untuk menahan salah tulis yang jelas sebelum satu permintaan
 * jaringan dikirim, tanpa berpura-pura bisa memutuskan email itu ada.
 *
 * Sengaja TIDAK memakai regex panjang yang mengaku mengikuti RFC 5322: yang begitu menolak
 * alamat yang sah, dan biaya salah-tolak jauh lebih besar daripada satu request yang gagal.
 */
export const looksLikeEmail = (s: string): boolean => {
  const v = String(s || '').trim()
  if (v.length < 5 || /\s/.test(v)) return false
  const at = v.indexOf('@')
  if (at < 1 || at !== v.lastIndexOf('@')) return false
  const domain = v.slice(at + 1)
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
}
