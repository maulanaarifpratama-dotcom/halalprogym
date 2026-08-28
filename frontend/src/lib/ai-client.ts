/**
 * Memanggil provider AI milik pengguna. Lapis jaringan saja — penyusunan prompt dan pembacaan
 * jawaban ada di lib/ai-nutrition.ts, dan itu dipisah supaya bagian yang bisa salah bisa dites
 * tanpa satu request pun.
 *
 * REQUEST PERGI LANGSUNG DARI PERANGKAT KE PROVIDER. Tidak lewat server kita — kita memang tidak
 * punya server. Konsekuensinya: kita tidak pernah melihat apa yang orang makan, dan tidak pernah
 * melihat kuncinya.
 *
 * TIMEOUT ADA, DAN ITU BUKAN DETAIL.
 *
 * `fetch()` tidak punya timeout bawaan. Aturan #1 CLAUDE.md — app tidak boleh menunggu jaringan —
 * sudah pernah dilanggar tepat oleh sifat itu: service worker network-first membuat setiap
 * pembukaan menggantung di sinyal buruk. Di sini bentuknya akan lebih buruk: tombol yang
 * berputar selamanya sementara orang menunggu untuk mencatat sarapan.
 */
import { DEFAULT_MODEL, type AiConfig } from './ai-key.js'
import { buildPrompt, parseAiFood, type AiFoodResult } from './ai-nutrition.js'

/** Perkiraan gizi satu kalimat tidak boleh butuh lebih dari ini. */
export const TIMEOUT_MS = 20_000

export type AiError =
  /** Belum ada kunci yang dipasang. */
  | 'no-config'
  /** Jaringan gagal atau tidak ada. */
  | 'offline'
  /** Melewati TIMEOUT_MS. */
  | 'timeout'
  /** Provider menolak kuncinya. */
  | 'auth'
  /** Kuota atau rate limit provider. */
  | 'quota'
  /** Provider menjawab, tapi jawabannya tidak bisa dipakai. */
  | 'unreadable'
  /** Sisanya. */
  | 'failed'

export type AiOutcome =
  | { ok: true; result: AiFoodResult }
  | { ok: false; error: AiError; status?: number }

interface Endpoint {
  url: string
  headers: Record<string, string>
  body: string
  /** Mengambil teks jawaban dari bentuk response provider. */
  readText: (json: unknown) => string
}

const asRecord = (v: unknown): Record<string, unknown> =>
  (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/** Menelusuri jalur properti tanpa melempar di setiap tingkat. */
function dig(root: unknown, path: Array<string | number>): unknown {
  let cur: unknown = root
  for (const step of path) {
    if (cur == null) return undefined
    cur = typeof step === 'number' ? (Array.isArray(cur) ? cur[step] : undefined) : asRecord(cur)[step]
  }
  return cur
}

function endpointFor(cfg: AiConfig, prompt: string): Endpoint {
  const model = cfg.model || DEFAULT_MODEL[cfg.provider]

  if (cfg.provider === 'gemini') {
    return {
      // Kunci di header, BUKAN di query string. Query string berakhir di log server, di riwayat
      // browser, dan di header Referer.
      url: 'https://generativelanguage.googleapis.com/v1beta/models/'
        + encodeURIComponent(model) + ':generateContent',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Suhu nol: ini estimasi angka, bukan tulisan kreatif. Jawaban yang berbeda-beda untuk
        // makanan yang sama membuat catatan orang tidak bisa dibandingkan antar hari.
        generationConfig: { temperature: 0, maxOutputTokens: 400 },
      }),
      readText: j => String(dig(j, ['candidates', 0, 'content', 'parts', 0, 'text']) ?? ''),
    }
  }

  const base = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
  return {
    url: base + '/chat/completions',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
    readText: j => String(dig(j, ['choices', 0, 'message', 'content']) ?? ''),
  }
}

/** Memetakan status HTTP ke sebab yang bisa dijelaskan ke pengguna. */
function errorForStatus(status: number): AiError {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'quota'
  return 'failed'
}

/**
 * Memperkirakan gizi dari deskripsi.
 *
 * TIDAK PERNAH MELEMPAR. Setiap kegagalan kembali sebagai `{ ok: false, error }` dengan sebab
 * yang bisa dijelaskan — "gagal" tanpa sebab membuat orang mencoba ulang hal yang sama sepuluh
 * kali, padahal yang salah kuncinya.
 */
export async function estimateNutrition(
  description: string,
  cfg: AiConfig | null,
  fetchImpl: typeof fetch = fetch
): Promise<AiOutcome> {
  if (!cfg || !cfg.apiKey) return { ok: false, error: 'no-config' }
  if (!String(description || '').trim()) return { ok: false, error: 'unreadable' }

  const ep = endpointFor(cfg, buildPrompt(description))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const res = await fetchImpl(ep.url, {
      method: 'POST',
      headers: ep.headers,
      body: ep.body,
      signal: ctrl.signal,
      // Kredensial same-origin tidak punya urusan di request lintas-origin ini.
      credentials: 'omit',
    })
    if (!res.ok) return { ok: false, error: errorForStatus(res.status), status: res.status }

    const json = await res.json().catch(() => null)
    const result = parseAiFood(ep.readText(json))
    return result ? { ok: true, result } : { ok: false, error: 'unreadable' }
  } catch (e) {
    // AbortError dari timeout kita sendiri, bukan dari pengguna membatalkan.
    if (e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError') {
      return { ok: false, error: 'timeout' }
    }
    return { ok: false, error: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}
