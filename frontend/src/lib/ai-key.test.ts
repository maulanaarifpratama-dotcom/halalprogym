import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  clearAiConfig, DEFAULT_MODEL, loadAiConfig, maskKey, saveAiConfig,
  type AiConfig,
} from './ai-key.js'

/**
 * Kunci API pengguna. Yang dijaga di sini bukan fiturnya, tapi dua janji yang kalau dilanggar
 * tidak menghasilkan bug — menghasilkan kebocoran kredensial.
 */
const CFG: AiConfig = { provider: 'gemini', apiKey: 'AIzaSyRAHASIABANGET1234' }

/** localStorage palsu. Environment tesnya node, jadi memang tidak ada yang asli. */
function fakeStore(): Record<string, string> {
  const mem: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (k in mem ? mem[k]! : null),
      setItem: (k: string, v: string) => { mem[k] = String(v) },
      removeItem: (k: string) => { delete mem[k] },
    },
  })
  return mem
}

const dropStore = () => {
  Reflect.deleteProperty(globalThis as object, 'localStorage')
}

afterEach(dropStore)

describe('penyimpanan kunci — TIDAK PERNAH melempar', () => {
  it('tanpa localStorage sama sekali, load mengembalikan null', () => {
    // Mode privat sebagian browser mematikan localStorage. Itu bukan alasan untuk menjatuhkan
    // layar Pengaturan — dan di lingkungan tes ini localStorage memang tidak ada, jadi kasus
    // ini nyata, bukan simulasi.
    dropStore()
    expect(loadAiConfig()).toBe(null)
  })

  it('tanpa localStorage, save mengembalikan false bukan melempar', () => {
    dropStore()
    expect(saveAiConfig(CFG)).toBe(false)
  })

  it('tanpa localStorage, clear tidak melempar', () => {
    dropStore()
    expect(() => clearAiConfig()).not.toThrow()
  })

  it('localStorage yang melempar di setiap operasi tetap tidak menjatuhkan app', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('SecurityError') },
        setItem: () => { throw new Error('QuotaExceeded') },
        removeItem: () => { throw new Error('nope') },
      },
    })
    expect(loadAiConfig()).toBe(null)
    expect(saveAiConfig(CFG)).toBe(false)
    expect(() => clearAiConfig()).not.toThrow()
  })
})

describe('penyimpanan kunci — simpan lalu baca', () => {
  beforeEach(() => { fakeStore() })

  it('bolak-balik utuh', () => {
    expect(saveAiConfig(CFG)).toBe(true)
    expect(loadAiConfig()).toEqual({
      provider: 'gemini', apiKey: CFG.apiKey, model: undefined, baseUrl: undefined,
    })
  })

  it('spasi di ujung kunci dibuang', () => {
    // Kunci di-paste dari halaman provider, dan paste sering membawa spasi atau newline.
    // Tanpa trim, provider menolaknya dan pesannya jadi "auth" yang membingungkan.
    saveAiConfig({ provider: 'gemini', apiKey: '  abc123  ' })
    expect(loadAiConfig()?.apiKey).toBe('abc123')
  })

  it('model dan baseUrl ikut tersimpan', () => {
    saveAiConfig({
      provider: 'openai', apiKey: 'k', model: 'llama3', baseUrl: 'http://localhost:11434/v1',
    })
    expect(loadAiConfig()).toMatchObject({ model: 'llama3', baseUrl: 'http://localhost:11434/v1' })
  })

  it('clear benar-benar menghapus, bukan mengosongkan sebagian', () => {
    const mem = fakeStore()
    saveAiConfig(CFG)
    clearAiConfig()
    expect(loadAiConfig()).toBe(null)
    expect(JSON.stringify(mem)).not.toContain(CFG.apiKey)
  })

  it('isi tersimpan yang rusak diperlakukan sebagai tidak ada', () => {
    const mem = fakeStore()
    for (const bad of ['', 'bukan json', '[]', 'null', '{}', '{"provider":"gemini"}',
      '{"apiKey":"x"}', '{"provider":"anthropic","apiKey":"x"}', '{"provider":"gemini","apiKey":""}']) {
      mem['gym_ai_key_v1'] = bad
      expect(loadAiConfig(), bad).toBe(null)
    }
  })

  it('provider asing ditolak, tidak dipakai membangun URL', () => {
    // Provider yang tidak dikenal berarti endpoint yang tidak dikenal. Menerimanya berarti
    // mengirim kunci pengguna ke host yang datang dari isi localStorage.
    const mem = fakeStore()
    mem['gym_ai_key_v1'] = JSON.stringify({ provider: 'evil.example', apiKey: 'k' })
    expect(loadAiConfig()).toBe(null)
  })
})

describe('kunci TIDAK PERNAH masuk state yang disinkronkan', () => {
  // Ini invarian struktural, bukan perilaku, jadi yang diperiksa sumbernya. Kalau nanti
  // seseorang menaruh kunci di `DEF`, dia ikut ter-push ke Supabase — dan kredensial pengguna
  // tidak punya urusan apa pun di database kita. Menyaringnya di `stateForPush` bukan jawaban:
  // itu bergantung pada seseorang mengingat saringan setiap kali jalur push berubah.
  const store = readFileSync(new URL('../store/useStore.js', import.meta.url), 'utf8')

  it('useStore.js tidak menyebut kunci API sama sekali', () => {
    expect(store).not.toMatch(/apiKey|aiKey|ai_key/i)
  })

  it('entri localStorage-nya berbeda dari entri state', () => {
    const src = readFileSync(new URL('./ai-key.ts', import.meta.url), 'utf8')
    expect(src).toContain("'gym_ai_key_v1'")
    expect(src).not.toContain("'gym_state_v1'")
    expect(store).toContain("'gym_state_v1'")
  })

  it('ai-key.ts tidak mengimpor apa pun yang menyentuh Supabase', () => {
    const src = readFileSync(new URL('./ai-key.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/^import .*(supabase|remote-state|sync)/m)
  })
})

describe('maskKey', () => {
  it('menampilkan empat karakter terakhir saja', () => {
    expect(maskKey('AIzaSyRAHASIABANGET1234')).toBe('••••1234')
  })

  it('tidak pernah membocorkan lebih dari empat karakter, panjang berapa pun', () => {
    // Layar Pengaturan bisa difoto orang atau muncul di screen sharing.
    for (const len of [0, 1, 4, 5, 8, 40, 200]) {
      const key = 'k'.repeat(len)
      const masked = maskKey(key)
      const shown = masked.replace(/•/g, '')
      expect(shown.length, String(len)).toBeLessThanOrEqual(4)
      if (len > 4) expect(masked).not.toBe(key)
    }
  })

  it('kunci pendek disembunyikan seluruhnya', () => {
    expect(maskKey('abcd')).toBe('••••')
    expect(maskKey('')).toBe('••••')
  })
})

describe('default provider', () => {
  it('Gemini default ke Flash, bukan Pro', () => {
    // Perkiraan gizi dari satu kalimat tidak butuh model termahal, dan kuota gratis Google AI
    // Studio jauh lebih longgar di Flash. Ini yang membuat fitur ini bisa dipakai tanpa
    // pengguna memasang kartu kredit.
    expect(DEFAULT_MODEL.gemini).toContain('flash')
  })

  it('kedua bentuk punya default', () => {
    expect(DEFAULT_MODEL.gemini).toBeTruthy()
    expect(DEFAULT_MODEL.openai).toBeTruthy()
  })
})
