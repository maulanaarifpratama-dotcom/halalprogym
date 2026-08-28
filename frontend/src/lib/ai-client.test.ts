import { describe, expect, it, vi } from 'vitest'
import { estimateNutrition, TIMEOUT_MS } from './ai-client.js'
import type { AiConfig } from './ai-key.js'

/**
 * Lapis jaringan AI. Yang diuji bukan "apakah bisa memanggil API" — itu urusan provider — tapi
 * apa yang terjadi saat provider berperilaku buruk, dan apakah kredensialnya pergi ke tempat
 * yang benar.
 */
const GEMINI: AiConfig = { provider: 'gemini', apiKey: 'kunci-rahasia' }
const OPENAI: AiConfig = { provider: 'openai', apiKey: 'sk-rahasia' }

const FOOD = { name: 'Nasi uduk', grams: 250, unit: 'porsi', kcal: 480, protein: 9, carb: 68, fat: 18 }

const okGemini = (obj: unknown) => vi.fn((_url: RequestInfo | URL, _init?: RequestInit) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
} as unknown as Response))

const okOpenai = (obj: unknown) => vi.fn((_url: RequestInfo | URL, _init?: RequestInit) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(obj) } }] }),
} as unknown as Response))

const failWith = (status: number) =>
  vi.fn((_url: RequestInfo | URL, _init?: RequestInit) => Promise.resolve({ ok: false, status } as unknown as Response))

describe('estimateNutrition — jalur berhasil', () => {
  it('membaca bentuk response Gemini', async () => {
    const out = await estimateNutrition('nasi uduk', GEMINI, okGemini(FOOD))
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.result.draft.name).toBe('Nasi uduk')
  })

  it('membaca bentuk response OpenAI-compatible', async () => {
    const out = await estimateNutrition('nasi uduk', OPENAI, okOpenai(FOOD))
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.result.draft.kcal).toBe(480)
  })
})

describe('estimateNutrition — ke mana kuncinya pergi', () => {
  it('Gemini: kunci di HEADER, bukan di query string', async () => {
    // Query string berakhir di log server, di riwayat browser, dan di header Referer.
    const f = okGemini(FOOD)
    await estimateNutrition('x', GEMINI, f)
    const [url, init] = f.mock.calls[0]!
    if (!init) throw new Error('fetch dipanggil tanpa init')
    expect(url).not.toContain('kunci-rahasia')
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('kunci-rahasia')
  })

  it('OpenAI: kunci di header Authorization', async () => {
    const f = okOpenai(FOOD)
    await estimateNutrition('x', OPENAI, f)
    const [url, init] = f.mock.calls[0]!
    if (!init) throw new Error('fetch dipanggil tanpa init')
    expect(url).not.toContain('sk-rahasia')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer sk-rahasia')
  })

  it('kredensial same-origin tidak ikut ke request lintas-origin', async () => {
    const f = okGemini(FOOD)
    await estimateNutrition('x', GEMINI, f)
    expect(f.mock.calls[0]![1]!.credentials).toBe('omit')
  })

  it('baseUrl custom dipakai apa adanya, garis miring berlebih dibuang', async () => {
    // Ini yang membuat OpenRouter, Groq, Together, dan Ollama lokal jalan tanpa kode tambahan.
    const f = okOpenai(FOOD)
    await estimateNutrition('x', { ...OPENAI, baseUrl: 'http://localhost:11434/v1///' }, f)
    expect(f.mock.calls[0]![0]).toBe('http://localhost:11434/v1/chat/completions')
  })

  it('suhu nol — ini estimasi angka, bukan tulisan kreatif', async () => {
    // Jawaban yang berbeda-beda untuk makanan yang sama membuat catatan orang tidak bisa
    // dibandingkan antar hari.
    const f = okOpenai(FOOD)
    await estimateNutrition('x', OPENAI, f)
    expect(JSON.parse(String(f.mock.calls[0]![1]!.body)).temperature).toBe(0)
  })
})

describe('estimateNutrition — kegagalan punya SEBAB', () => {
  it('tanpa konfigurasi: no-config, tanpa menyentuh jaringan', async () => {
    const f = vi.fn()
    expect(await estimateNutrition('x', null, f as unknown as typeof fetch))
      .toEqual({ ok: false, error: 'no-config' })
    expect(f).not.toHaveBeenCalled()
  })

  it('deskripsi kosong tidak dikirim ke provider', async () => {
    // Membayar token untuk pertanyaan kosong, dan mendapat jawaban karangan.
    const f = okGemini(FOOD)
    expect((await estimateNutrition('   ', GEMINI, f)).ok).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  it('401/403 jadi "auth" — kuncinya yang salah, bukan jaringannya', async () => {
    // Sebab yang tepat itu penting: "gagal" tanpa sebab membuat orang mencoba ulang hal yang
    // sama sepuluh kali, padahal yang salah kuncinya.
    for (const s of [401, 403]) {
      const out = await estimateNutrition('x', GEMINI, failWith(s))
      expect(out).toMatchObject({ ok: false, error: 'auth', status: s })
    }
  })

  it('429 jadi "quota"', async () => {
    expect(await estimateNutrition('x', GEMINI, failWith(429)))
      .toMatchObject({ ok: false, error: 'quota' })
  })

  it('500 jadi "failed", bukan "auth"', async () => {
    expect(await estimateNutrition('x', GEMINI, failWith(500)))
      .toMatchObject({ ok: false, error: 'failed' })
  })

  it('jaringan mati jadi "offline"', async () => {
    const f = vi.fn(() => Promise.reject(new Error('network')))
    expect(await estimateNutrition('x', GEMINI, f as unknown as typeof fetch))
      .toMatchObject({ ok: false, error: 'offline' })
  })

  it('jawaban yang tidak bisa dibaca jadi "unreadable", BUKAN angka tebakan', async () => {
    const f = vi.fn(() => Promise.resolve({
      ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'maaf' }] } }] }),
    } as unknown as Response))
    expect(await estimateNutrition('x', GEMINI, f as unknown as typeof fetch))
      .toMatchObject({ ok: false, error: 'unreadable' })
  })

  it('JSON response yang rusak tidak melempar', async () => {
    const f = vi.fn(() => Promise.resolve({
      ok: true, json: () => Promise.reject(new Error('bad json')),
    } as unknown as Response))
    expect((await estimateNutrition('x', GEMINI, f as unknown as typeof fetch)).ok).toBe(false)
  })

  it('bentuk response yang sama sekali asing tidak melempar', async () => {
    for (const body of [null, {}, { candidates: [] }, { choices: [{}] }, { candidates: 'x' }]) {
      const f = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as unknown as Response))
      const out = await estimateNutrition('x', GEMINI, f as unknown as typeof fetch)
      expect(out.ok, JSON.stringify(body)).toBe(false)
    }
  })
})

describe('estimateNutrition — TIMEOUT', () => {
  it('request yang menggantung dibatalkan, tidak ditunggu selamanya', async () => {
    // `fetch()` tidak punya timeout bawaan, dan aturan #1 sudah pernah dilanggar tepat oleh
    // sifat itu. Di sini bentuknya: tombol yang berputar selamanya sementara orang menunggu
    // untuk mencatat sarapan.
    vi.useFakeTimers()
    const f = vi.fn((_u: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_res, rej) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('aborted')
        err.name = 'AbortError'
        rej(err)
      })
    }))
    const p = estimateNutrition('x', GEMINI, f as unknown as typeof fetch)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS + 100)
    expect(await p).toMatchObject({ ok: false, error: 'timeout' })
    vi.useRealTimers()
  })

  it('signal abort benar-benar dikirim ke fetch', async () => {
    const f = okGemini(FOOD)
    await estimateNutrition('x', GEMINI, f)
    expect(f.mock.calls[0]![1]!.signal).toBeTruthy()
  })
})
