/**
 * Klien Supabase — satu-satunya tempat di app ini yang membuatnya.
 *
 * ATURAN YANG MEMBENTUK BERKAS INI: app harus jalan PENUH tanpa Supabase.
 *
 * Itu bukan kelonggaran untuk dev. localStorage adalah sumber kebenaran (aturan #1 CLAUDE.md),
 * dan mode tamu adalah jalur yang didukung, bukan mode darurat. Jadi kalau env-nya tidak ada,
 * `supa()` mengembalikan null dan setiap pemanggil sudah harus menanganinya — bukan melempar,
 * bukan menampilkan layar error, dan terutama bukan memblokir boot.
 *
 * Konsekuensi yang disengaja: `npm run dev` tanpa `.env.local` tetap membuka app yang berfungsi.
 * Kalau berkas ini pernah melempar saat env kosong, itu regresi.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// import.meta.env dibungkus supaya berkas ini tetap bisa diimpor dari Node biasa (tes, skrip),
// tempat import.meta.env tidak ada.
const ENV: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env) || {}

const URL_ = ENV.VITE_SUPABASE_URL
const KEY = ENV.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Apakah sinkronisasi ke akun mungkin di build ini?
 *
 * Dipakai UI untuk memutuskan menampilkan pilihan masuk atau tidak. Menawarkan "Masuk dengan
 * Google" di build yang tidak punya kredensial adalah persis kesalahan yang app ini sudah
 * pernah lakukan — UI menawarkan jalan yang mustahil, dan orang mengetuknya.
 */
export const SUPABASE_READY = !!(URL_ && KEY)

let client: SupabaseClient | null = null

/** Klien Supabase, atau null kalau build ini tidak punya kredensialnya. */
export function supa(): SupabaseClient | null {
  if (!SUPABASE_READY) return null
  if (!client) {
    client = createClient(URL_ as string, KEY as string, {
      auth: {
        // Sesi disimpan di localStorage dan diperbarui sendiri: orang tidak boleh diminta masuk
        // ulang di tengah program latihan berbulan-bulan.
        persistSession: true,
        autoRefreshToken: true,
        // Token OAuth datang sebagai fragmen URL setelah redirect; ini yang menukarnya jadi sesi.
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

/** Nama tabel sinkronisasi. Satu tempat, supaya tidak ada string yang menyimpang. */
export const STATE_TABLE = 'user_state'
