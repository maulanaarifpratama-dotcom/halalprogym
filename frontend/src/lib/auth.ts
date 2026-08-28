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
 * GOOGLE DI APK: LEWAT BROWSER SISTEM, BUKAN WEBVIEW — TERPASANG 2026-08-28.
 *
 * Google memblokir OAuth di WebView tersemat, jadi di APK tombol Google dulunya mengantar orang
 * ke halaman penolakan Google. Sekarang persetujuannya dibuka di browser sistem dan kembali
 * lewat deep link. Keputusan jalur dan pembacaan URL kembalinya ada di `lib/oauth.ts`, murni dan
 * bertes; berkas ini yang menyentuh Supabase dan plugin.
 *
 * DAN MAGIC LINK DI APK JUGA RUSAK — itu ketemu saat memperbaiki yang di atas. Alamat kembalinya
 * dulu `window.location.origin`, yang di WebView Capacitor berarti `https://localhost`: tautan
 * dari email dibuka di Chrome, dan Chrome tidak menemukan apa pun. Jadi APK tidak punya satu pun
 * jalan masuk yang berfungsi, bukan satu. Lihat `redirectTo` di bawah; satu perbaikan
 * menyembuhkan keduanya, karena keduanya kembali lewat deep link yang sama.
 */
import { SUPABASE_READY, supa } from './supabase.js'
import { MOBILE } from './mobile.js'
import { NATIVE_REDIRECT, oauthRoute, parseCallback } from './oauth.js'

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
 * Di web: origin apa adanya, tanpa path. App ini pakai hash routing, jadi origin sudah membuka
 * layar utama, dan URL redirect yang harus didaftarkan di dashboard jadi satu per lingkungan
 * bukan satu per layar.
 *
 * DI NATIVE: DEEP LINK, dan ini bukan sekadar kerapian — ini memperbaiki MAGIC LINK.
 *
 * Origin WebView Capacitor adalah `https://localhost`. Mengirimnya sebagai `emailRedirectTo`
 * berarti tautan dari email dibuka di Chrome, Chrome mencoba memuat `https://localhost`, dan
 * tidak menemukan apa pun. Orang menatap halaman error, dan app-nya tetap tamu.
 *
 * Jadi klaim lama bahwa "magic link tetap bekerja di WebView" TIDAK benar: yang bekerja adalah
 * pengirimannya, bukan kembalinya. Kedua jalur masuk di APK sama-sama buntu sampai 2026-08-28 —
 * Google karena WebView-nya diblokir, magic link karena alamat kembalinya tidak ada. Satu
 * perbaikan di sini menyembuhkan keduanya, karena keduanya kembali lewat deep link yang sama.
 */
export const redirectTo = (): string => {
  if (oauthRoute(MOBILE) === 'system-browser') return NATIVE_REDIRECT
  return typeof window === 'undefined' ? '' : window.location.origin
}

/**
 * Masuk dengan Google.
 *
 * Di web: redirect biasa, klien Supabase yang mengurusnya.
 *
 * Di native: TIGA langkah yang tidak boleh dipendekkan. `skipBrowserRedirect` menahan klien
 * supaya tidak meredirect WebView-nya sendiri — kalau dia meredirect, WebView-nya yang membuka
 * halaman Google, dan kita kembali ke halaman penolakan yang jadi alasan seluruh jalur ini ada.
 * URL-nya lalu dibuka di browser sistem, dan jalan kembalinya deep link.
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = supa()
  if (!sb) throw new Error('no-supabase')

  const native = oauthRoute(MOBILE) === 'system-browser'

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    // Satu sumber alamat kembali untuk kedua jalur: redirectTo() sudah tahu dia di native.
    options: native
      ? { redirectTo: redirectTo(), skipBrowserRedirect: true }
      : { redirectTo: redirectTo() },
  })
  if (error) throw error
  if (!native) return

  // Sampai sini cuma di native. URL yang tidak ada berarti tidak ada yang bisa dibuka, dan
  // membuka browser kosong lebih buruk daripada mengatakan gagal.
  if (!data?.url) throw new Error('no-oauth-url')
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url })
}

/**
 * Menukar kode PKCE dari deep link jadi sesi, lalu menutup browser sistem.
 *
 * Browser ditutup SETELAH pertukaran, bukan sebelum: kalau ditutup dulu dan pertukarannya gagal,
 * orang menatap app yang tetap tamu tanpa satu pun petunjuk kenapa.
 */
export async function completeOAuth(code: string): Promise<AppUser | null> {
  const sb = supa()
  if (!sb) throw new Error('no-supabase')
  const { data, error } = await sb.auth.exchangeCodeForSession(code)
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch { /* browser sudah tertutup sendiri, atau plugin tidak ada di web */ }
  if (error) throw error
  return toAppUser(data.session?.user)
}

/**
 * Mendengarkan deep link masuk — dari Google MAUPUN dari magic link. Keduanya kembali dengan
 * bentuk yang sama (`?code=`), jadi satu pendengar cukup. Mengembalikan fungsi pelepas.
 *
 * Yang BUKAN callback masuk dilewatkan begitu saja — `parseCallback` yang memutuskan, dan dia
 * menolak skema maupun host yang tidak cocok. Pendengar ini menerima SETIAP deep link yang
 * dibuka ke app, jadi menukar "kode" dari URL sembarang berarti menyerahkan alur masuk ke siapa
 * pun yang bisa membuat tautan.
 *
 * Tidak melakukan apa pun di web: di sana tidak ada deep link, dan `detectSessionInUrl` sudah
 * menangani redirect-nya.
 */
export async function listenForOAuthCallback(
  onError: (reason: string) => void
): Promise<() => void> {
  if (oauthRoute(MOBILE) !== 'system-browser') return () => {}
  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appUrlOpen', event => {
      const hit = parseCallback(event?.url)
      if (!hit) return
      if (hit.error) { onError(hit.errorDescription || hit.error); return }
      if (!hit.code) return
      // TIDAK ada callback sukses di sini, dan itu disengaja: pertukaran yang berhasil memicu
      // SIGNED_IN, dan store sudah mendengarkannya lewat onAuthStateChange. Melaporkan sukses
      // dari sini juga berarti `onSignedIn` jalan DUA KALI, dan itu dua `pullState()` yang
      // berlomba atas state yang sama.
      completeOAuth(hit.code).catch(e => onError(e?.message || 'exchange-failed'))
    })
    return () => { handle.remove() }
  } catch {
    // Plugin tidak ada (build web yang kebetulan menyalakan MOBILE). Bukan alasan menjatuhkan
    // boot — magic link tetap jalan.
    return () => {}
  }
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
