import { afterEach, describe, expect, it, vi } from 'vitest'
import { displayName, looksLikeEmail, redirectTo, toAppUser } from './auth.js'
import { NATIVE_REDIRECT } from './oauth.js'

describe('displayName', () => {
  it('memakai nama dari provider kalau ada', () => {
    expect(displayName({ full_name: 'Maulana Arif' }, 'a@b.com')).toBe('Maulana Arif')
    expect(displayName({ name: 'Arif' }, 'a@b.com')).toBe('Arif')
  })

  it('jatuh ke bagian sebelum @ kalau provider tidak mengirim nama', () => {
    // Magic link email tidak membawa nama sama sekali — ini jalur normal, bukan kasus tepi.
    expect(displayName(null, 'arif@bisabaik.or.id')).toBe('arif')
    expect(displayName({}, 'arif@bisabaik.or.id')).toBe('arif')
  })

  it('TIDAK PERNAH mengembalikan string kosong', () => {
    // Nilai ini masuk ke sapaan "Hai {0}" di Home. "Hai " terlihat seperti app yang rusak.
    for (const [meta, email] of [[null, null], [{}, ''], [{ full_name: '   ' }, null], [null, '@x.com']] as const) {
      expect(displayName(meta, email).length).toBeGreaterThan(0)
    }
  })

  it('nama provider yang cuma spasi tidak dipakai', () => {
    expect(displayName({ full_name: '   ' }, 'arif@b.com')).toBe('arif')
  })

  it('nama provider dipangkas spasinya', () => {
    expect(displayName({ full_name: '  Arif  ' }, null)).toBe('Arif')
  })

  it('tidak pernah membocorkan UUID sebagai nama', () => {
    // Kalau suatu saat id ikut dipertimbangkan sebagai fallback, tes ini yang menahannya:
    // "Hai 8f3a1c2e-..." bukan sapaan.
    const out = displayName(null, null)
    expect(out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/)
  })
})

describe('toAppUser', () => {
  it('null masuk, null keluar', () => {
    expect(toAppUser(null)).toBe(null)
    expect(toAppUser(undefined)).toBe(null)
  })

  it('memetakan id, email, dan nama', () => {
    expect(toAppUser({ id: 'u1', email: 'arif@b.com', user_metadata: { full_name: 'Arif' } }))
      .toEqual({ id: 'u1', email: 'arif@b.com', name: 'Arif' })
  })

  it('email yang tidak ada jadi null, bukan undefined', () => {
    // Bentuk ini disimpan ke localStorage lewat JSON.stringify, dan undefined MENGHILANGKAN
    // kuncinya — jadi state yang dibaca balik bentuknya beda dari yang ditulis.
    const u = toAppUser({ id: 'u1' })
    expect(u?.email).toBe(null)
    expect(JSON.parse(JSON.stringify(u))).toHaveProperty('email', null)
  })
})

describe('redirectTo — alamat kembali setelah masuk', () => {
  // `MOBILE` dibaca dari import.meta.env saat modulnya diimpor, jadi cabang native cuma bisa
  // diuji dengan mengimpor ulang di bawah env yang berbeda. Itu memang cara satu-satunya, dan
  // cabang ini terlalu penting untuk dibiarkan tak teruji: dia yang menentukan apakah APK punya
  // jalan masuk sama sekali.
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it('di web memakai origin apa adanya', () => {
    // Environment tesnya node, jadi `window` dipalsukan — dan itu justru menegaskan bentuknya:
    // yang dikirim ke Supabase adalah origin, tanpa path, satu per lingkungan.
    Object.defineProperty(globalThis, 'window', {
      configurable: true, value: { location: { origin: 'https://gym.halalpro.id' } },
    })
    try {
      expect(redirectTo()).toBe('https://gym.halalpro.id')
    } finally {
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('tanpa window sama sekali mengembalikan string kosong, bukan melempar', () => {
    // Berkas ini diimpor dari tes dan skrip Node. Melempar di sana berarti gate yang merah
    // karena alasan yang tidak ada hubungannya dengan auth.
    expect(redirectTo()).toBe('')
  })

  it('di native memakai DEEP LINK, bukan origin WebView', async () => {
    // Origin WebView Capacitor adalah https://localhost. Mengirimnya sebagai alamat kembali
    // berarti tautan magic link dibuka di Chrome, dan Chrome tidak menemukan apa pun — orang
    // menatap halaman error sementara app-nya tetap tamu.
    vi.stubEnv('VITE_MOBILE', '1')
    vi.resetModules()
    const { redirectTo: nativeRedirect } = await import('./auth.js')
    expect(nativeRedirect()).toBe(NATIVE_REDIRECT)
    expect(nativeRedirect()).not.toContain('localhost')
  })

  it('alamat native TIDAK berskema http/https', async () => {
    // Kalau dia http(s), dia bukan deep link, dan Android tidak akan pernah mengantarnya ke app.
    vi.stubEnv('VITE_MOBILE', '1')
    vi.resetModules()
    const { redirectTo: nativeRedirect } = await import('./auth.js')
    expect(nativeRedirect().startsWith('http')).toBe(false)
  })
})

describe('looksLikeEmail', () => {
  it('menerima alamat biasa', () => {
    for (const v of ['a@b.co', 'arif@bisabaik.or.id', 'arif.pratama+gym@gmail.com']) {
      expect(looksLikeEmail(v), v).toBe(true)
    }
  })

  it('menolak salah tulis yang jelas', () => {
    for (const v of ['', '   ', 'arif', 'arif@', '@b.com', 'a@b', 'a b@c.com', 'a@@b.com', 'a@b.']) {
      expect(looksLikeEmail(v), JSON.stringify(v)).toBe(false)
    }
  })

  it('tidak menolak alamat sah yang regex "ala RFC" sering tolak', () => {
    // Biaya salah-tolak jauh lebih besar daripada satu request yang gagal: orang yang alamatnya
    // ditolak tidak punya jalan masuk sama sekali.
    for (const v of ['arif+tag@sub.domain.co.id', "o'brien@irish.ie", 'a_b-c@x-y.com']) {
      expect(looksLikeEmail(v), v).toBe(true)
    }
  })

  it('spasi di ujung dipangkas sebelum dinilai', () => {
    expect(looksLikeEmail('  arif@b.com  ')).toBe(true)
  })
})
