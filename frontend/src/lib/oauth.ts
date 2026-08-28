/**
 * Masuk dengan Google dari APK — dan kenapa ini butuh berkas sendiri.
 *
 * MASALAHNYA BUKAN KENYAMANAN, TAPI JALAN YANG MUSTAHIL.
 *
 * Google MEMBLOKIR OAuth di WebView tersemat (`disallowed_useragent`, kebijakan sejak 2016).
 * Jadi di APK, tombol "Lanjut dengan Google" mengantar orang ke halaman penolakan Google —
 * bukan gagal karena jaringan, bukan gagal karena kredensial, tapi gagal karena memang tidak
 * pernah bisa. Itu persis kesalahan yang sudah tercatat di `lib/supabase.ts`: UI menawarkan
 * jalan yang mustahil, dan orang mengetuknya.
 *
 * JALAN KELUARNYA: BROWSER SISTEM + DEEP LINK.
 *
 * Di build native, alur masuk dipecah jadi tiga langkah, dan tidak ada satu pun yang jalan di
 * WebView:
 *
 *   1. Minta URL persetujuan Google ke Supabase, TANPA membiarkan klien meredirect
 *      (`skipBrowserRedirect`) — kalau dia meredirect, WebView-nya yang jalan, dan kita kembali
 *      ke masalah semula.
 *   2. Buka URL itu di browser SISTEM (Chrome/Custom Tab). Di sana user agent-nya asli, jadi
 *      Google menerimanya.
 *   3. Google mengembalikan ke `id.halalpro.gym://auth-callback?code=...`, Android mengantarnya
 *      ke app lewat intent-filter, dan kodenya ditukar jadi sesi.
 *
 * Langkah 3 tidak akan pernah sampai tanpa intent-filter di `AndroidManifest.xml`, dan manifest
 * repo ini memang TIDAK punya satu pun sampai 2026-08-28 — `custom_url_scheme` ada di
 * `strings.xml`, tapi tidak ada yang membacanya. Jadi deep link-nya bukan "belum dipakai", dia
 * memang tidak berfungsi. `android-identity.test.js` sekarang memakukannya.
 *
 * BERKAS INI MURNI. Nol impor Capacitor, nol impor Supabase.
 *
 * Yang benar-benar bisa salah di sini adalah dua hal, dan keduanya bisa dites tanpa perangkat:
 * KEPUTUSAN jalur mana yang dipakai, dan PEMBACAAN URL yang kembali. Sisanya cuma memanggil
 * plugin. Deep link datang dari luar app — dari Android, atas nama browser — jadi isinya DATA
 * YANG TIDAK DIPERCAYA, dan berkas ini yang menolaknya kalau bukan callback kita.
 */

/**
 * Skema deep link. HARUS sama dengan `custom_url_scheme` di `android/app/src/main/res/values/
 * strings.xml`, yang sama dengan `appId` di `capacitor.config.json`.
 *
 * Tiga tempat, satu nilai — dan itu dijaga tes, bukan ingatan. Kalau salah satunya menyimpang,
 * Android mengantar deep link ke skema yang tidak ada penerimanya, dan alur masuk berhenti tanpa
 * pesan apa pun: browser menampilkan halaman kosong, app tidak pernah tahu ada yang terjadi.
 */
export const DEEP_LINK_SCHEME = 'id.halalpro.gym'

/** Host deep link untuk callback masuk. Sengaja spesifik, bukan root. */
export const CALLBACK_HOST = 'auth-callback'

/**
 * URL yang didaftarkan ke Supabase dan Google sebagai tujuan redirect di build native.
 *
 * Ini HARUS terdaftar di Supabase Dashboard → Authentication → URL Configuration → Redirect
 * URLs. Kalau tidak, Supabase menolak redirect-nya dan mengembalikan ke Site URL — yang berarti
 * orang berakhir di versi web, sudah masuk di sana, sementara app-nya tetap tamu.
 */
export const NATIVE_REDIRECT = DEEP_LINK_SCHEME + '://' + CALLBACK_HOST

/**
 * Jalur masuk yang harus dipakai build ini.
 *
 * `system-browser` untuk native, `redirect` untuk web. Sengaja fungsi dari satu boolean dan
 * bukan membaca `MOBILE` sendiri: itu yang membuatnya bisa dites di kedua arah, dan yang membuat
 * berkas ini tidak mengimpor apa pun.
 */
export type OAuthRoute = 'redirect' | 'system-browser'

export const oauthRoute = (native: boolean): OAuthRoute =>
  (native ? 'system-browser' : 'redirect')

/** Hasil pembacaan satu deep link. */
export interface CallbackResult {
  /** Kode PKCE yang siap ditukar jadi sesi. */
  code?: string
  /** Sebab penolakan dari Google/Supabase, kalau ada. */
  error?: string
  /** Penjelasan sebab, apa adanya dari provider. Ditampilkan, tidak ditebak. */
  errorDescription?: string
}

/**
 * Membaca deep link yang masuk.
 *
 * Mengembalikan `null` untuk apa pun yang BUKAN callback masuk kita — dan itu bagian penting,
 * bukan kehati-hatian berlebih: pendengar `appUrlOpen` menerima setiap deep link yang dibuka ke
 * app, termasuk nanti dari fitur lain, dari notifikasi, dan dari tautan yang dikirim orang lain.
 * Menukar "kode" dari URL sembarang berarti menyerahkan alur masuk ke siapa pun yang bisa
 * membuat tautan.
 *
 * Tidak pernah melempar: `new URL` melempar untuk teks yang bukan URL, dan satu deep link aneh
 * tidak boleh menjatuhkan app.
 */
export function parseCallback(raw: unknown): CallbackResult | null {
  if (typeof raw !== 'string' || !raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  // Skema DAN host harus cocok. Host saja tidak cukup — https://auth-callback juga punya host
  // itu, dan dia bisa datang dari tautan web mana pun.
  if (url.protocol !== DEEP_LINK_SCHEME + ':') return null
  if (url.hostname !== CALLBACK_HOST) return null

  // Supabase memakai alur PKCE, jadi kodenya di query. Fragmen tetap dibaca karena alur implicit
  // menaruh error di sana, dan error yang hilang berarti orang menatap layar yang tidak berubah.
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const pick = (key: string): string | undefined =>
    url.searchParams.get(key) || hash.get(key) || undefined

  const error = pick('error')
  if (error) {
    return { error, errorDescription: pick('error_description') }
  }

  const code = pick('code')
  if (code) return { code }

  // Callback kita, tapi tanpa kode dan tanpa error. Tidak ada yang bisa dilakukan, dan menebak
  // di sini akan menghasilkan pertukaran token yang gagal dengan pesan yang menyesatkan.
  return null
}
