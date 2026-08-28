/**
 * API key milik pengguna sendiri, untuk perkiraan gizi.
 *
 * DUA KEPUTUSAN YANG MENENTUKAN SELURUH BERKAS INI.
 *
 * 1. **Kuncinya TIDAK PERNAH masuk `S`.**
 *
 *    `S` adalah state yang disinkronkan ke Supabase. Kalau kunci ini ada di dalamnya, dia ikut
 *    terkirim ke database kita — dan kredensial pengguna tidak punya urusan apa pun di sana.
 *
 *    Dia disimpan di entri localStorage-nya SENDIRI, di luar `S`. Itu bukan kehati-hatian
 *    tambahan; itu membuat kebocorannya mustahil secara struktur. Alternatifnya — menaruhnya di
 *    `S` lalu menyaringnya di `stateForPush` — bergantung pada seseorang mengingat saringan itu
 *    setiap kali jalur push berubah. `active` sudah membuktikan pola itu berhasil, tapi `active`
 *    bukan kredensial: lupa menyaringnya bikin bug, lupa menyaring ini bikin kebocoran.
 *
 * 2. **Ini localStorage, dan localStorage TIDAK TERENKRIPSI.**
 *
 *    fud-ai (iOS/Android) menyimpan kuncinya di Keychain dan EncryptedSharedPreferences. Di web
 *    tidak ada padanannya — tidak ada penyimpanan yang bisa diakses halaman tapi tidak bisa
 *    diakses skrip yang jalan di halaman itu. Mengenkripsinya dengan kunci yang juga ada di
 *    halaman cuma teater.
 *
 *    Jadi yang kita lakukan bukan berpura-pura aman, tapi: (a) mengatakannya di UI, (b) tidak
 *    pernah mengirimnya ke mana pun selain provider yang dipilih pengguna, dan (c) app ini tidak
 *    memuat satu pun skrip pihak ketiga, jadi permukaan yang bisa membacanya cuma kode kita
 *    sendiri.
 *
 *    Yang juga penting dikatakan: kunci ini punya kuota dan tagihan milik pengguna. Menyarankan
 *    kunci gratis (Google AI Studio) bukan kenyamanan — dia yang membuat fitur ini bisa dipakai
 *    orang tanpa memberi app ini akses ke kartu kreditnya.
 */

/** Entri localStorage sendiri, di luar `gym_state_v1`. Namanya sengaja jelas. */
const STORE_KEY = 'gym_ai_key_v1'

/**
 * Bentuk API yang didukung, bukan daftar merek.
 *
 * fud-ai mendukung 13 provider. Kita mulai dari DUA BENTUK, dan itu menutup sebagian besar
 * daftar itu: `openai` cocok untuk OpenRouter, Groq, Together, DeepInfra, Fireworks, Mistral,
 * Ollama lokal, dan endpoint custom apa pun yang OpenAI-compatible. Menambah merek berarti
 * menambah permukaan yang harus dijaga; menambah BENTUK cuma dilakukan kalau ada yang
 * benar-benar berbeda.
 */
export type AiProvider = 'gemini' | 'openai'

export interface AiConfig {
  provider: AiProvider
  apiKey: string
  /** Nama model. Kosong berarti pakai default provider-nya. */
  model?: string
  /** Untuk `openai`: base URL endpoint. Kosong berarti api.openai.com. */
  baseUrl?: string
}

export const DEFAULT_MODEL: Record<AiProvider, string> = {
  // Flash, bukan Pro: perkiraan gizi dari satu kalimat tidak butuh model termahal, dan kuota
  // gratis Google AI Studio jauh lebih longgar di Flash.
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI-compatible',
}

/** Di mana orang mendapat kunci gratis. Ditampilkan di UI, bukan disembunyikan di dokumentasi. */
export const FREE_KEY_URL = 'https://aistudio.google.com/apikey'

const isProvider = (v: unknown): v is AiProvider => v === 'gemini' || v === 'openai'

/**
 * Konfigurasi tersimpan, atau null.
 *
 * Tidak pernah melempar: localStorage bisa dimatikan (mode privat sebagian browser), dan itu
 * bukan alasan untuk menjatuhkan layar Pengaturan.
 */
export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return null
    if (!isProvider(o.provider)) return null
    const apiKey = String(o.apiKey || '')
    if (!apiKey) return null
    return {
      provider: o.provider,
      apiKey,
      model: o.model ? String(o.model) : undefined,
      baseUrl: o.baseUrl ? String(o.baseUrl) : undefined,
    }
  } catch {
    return null
  }
}

export function saveAiConfig(cfg: AiConfig): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      provider: cfg.provider,
      apiKey: String(cfg.apiKey || '').trim(),
      model: cfg.model ? String(cfg.model).trim() : undefined,
      baseUrl: cfg.baseUrl ? String(cfg.baseUrl).trim() : undefined,
    }))
    return true
  } catch {
    return false
  }
}

export function clearAiConfig(): void {
  try { localStorage.removeItem(STORE_KEY) } catch { /* tidak ada yang bisa dilakukan */ }
}

/**
 * Bentuk kunci untuk ditampilkan — empat karakter terakhir saja.
 *
 * Cukup untuk menjawab "kunci mana yang terpasang?", tanpa menaruh kredensial utuh di layar
 * yang bisa difoto orang atau muncul di screen sharing.
 */
export function maskKey(key: string): string {
  const s = String(key || '')
  if (s.length <= 4) return '••••'
  return '••••' + s.slice(-4)
}
