import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Lapis baca/tulis Supabase — dan satu perbedaan yang menentukan apakah data orang hilang.
 *
 * "TIDAK TAHU" BUKAN "SERVER KOSONG", dan itu seluruh isi berkas ini.
 *
 * Kalau `fetchRemoteState` mengembalikan `{ ok: true, state: null }` untuk kegagalan jaringan,
 * `decideSync` akan membacanya sebagai "akun ini belum pernah push" dan mendorong state lokal ke
 * atas state server yang sebenarnya lebih baru. Itu kehilangan data yang SUNYI: tidak ada error,
 * tidak ada pesan, cuma riwayat latihan yang tiba-tiba mundur di perangkat lain.
 *
 * KENAPA INI DIUJI SEKARANG. `remote-state.ts` tidak punya satu pun tes, dan skenario pertama
 * yang akan dialami pemilik repo ini adalah tepat yang paling berbahaya: MASUK AKUN SEBELUM
 * migration diterapkan. Tabelnya belum ada, Postgres membalas error, dan yang harus terjadi
 * adalah app membiarkan data lokal sepenuhnya utuh.
 *
 * Klien Supabase-nya dipalsukan. Yang diuji bukan Supabase — itu urusan mereka — tapi bagaimana
 * setiap bentuk jawaban dipetakan ke keputusan.
 */

const mocks = vi.hoisted(() => ({
  /** Jawaban yang akan dikembalikan `.maybeSingle()`. */
  jawabanSelect: { data: null as unknown, error: null as unknown },
  /** Jawaban yang akan dikembalikan `.upsert()`. */
  jawabanUpsert: { error: null as unknown },
  /** Apa yang benar-benar dikirim ke upsert — diperiksa, bukan diasumsikan. */
  upsertTerakhir: null as Record<string, unknown> | null,
  /** null berarti build tanpa kredensial. */
  adaKlien: true,
  lempar: false,
}))

vi.mock('./supabase.js', () => ({
  STATE_TABLE: 'user_state',
  supa: () => {
    if (!mocks.adaKlien) return null
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (mocks.lempar) throw new Error('network down')
              return mocks.jawabanSelect
            },
          }),
        }),
        upsert: async (row: Record<string, unknown>) => {
          mocks.upsertTerakhir = row
          if (mocks.lempar) throw new Error('network down')
          return mocks.jawabanUpsert
        },
        delete: () => ({ eq: async () => ({ error: mocks.jawabanUpsert.error }) }),
      }),
    }
  },
}))

const { fetchRemoteState, pushRemoteState } = await import('./remote-state.js')

/** State lokal minimal, cukup untuk memeriksa apa yang dikirim. */
const stateLokal = () => ({
  _ts: 1700000000000,
  workouts: [{ id: 'w1' }],
  active: { id: 'sedang-berjalan', entries: [] },
  routines: [],
} as unknown as Parameters<typeof pushRemoteState>[1])

beforeEach(() => {
  mocks.jawabanSelect = { data: null, error: null }
  mocks.jawabanUpsert = { error: null }
  mocks.upsertTerakhir = null
  mocks.adaKlien = true
  mocks.lempar = false
})

afterEach(() => { vi.clearAllMocks() })

describe('fetchRemoteState — "tidak tahu" harus berbeda dari "kosong"', () => {
  it('TABEL BELUM ADA jadi ok:false, BUKAN state null', () => {
    // Ini skenario nyata: masuk akun sebelum `supabase db push` dijalankan. Postgres membalas
    // 42P01 undefined_table. Kalau ini dibaca sebagai "server kosong", state lokal akan
    // didorong ke atas server dan penanda kotor dibersihkan — dan itu benar sampai suatu hari
    // tabelnya ada dan berisi data dari perangkat lain.
    mocks.jawabanSelect = {
      data: null,
      error: { code: '42P01', message: 'relation "user_state" does not exist' },
    }
    return fetchRemoteState('u1').then(hasil => {
      expect(hasil).toEqual({ ok: false })
      expect('state' in hasil, 'jangan pernah mengaku tahu isi server').toBe(false)
    })
  })

  it('RLS menolak juga jadi ok:false', async () => {
    // Kebijakan RLS yang belum benar terlihat sama dari klien: error, bukan baris kosong.
    mocks.jawabanSelect = { data: null, error: { code: '42501', message: 'permission denied' } }
    expect(await fetchRemoteState('u1')).toEqual({ ok: false })
  })

  it('BARIS belum ada jadi ok:true dengan state null — itu memang kosong', async () => {
    // `maybeSingle` mengembalikan data null tanpa error kalau akunnya belum pernah push. Ini
    // satu-satunya keadaan yang aman untuk didorongi, dan dia harus bisa dibedakan.
    mocks.jawabanSelect = { data: null, error: null }
    expect(await fetchRemoteState('u1')).toEqual({ ok: true, state: null })
  })

  it('baris yang ada dikembalikan apa adanya', async () => {
    mocks.jawabanSelect = { data: { state: { workouts: [{ id: 'dari-server' }] } }, error: null }
    const hasil = await fetchRemoteState('u1')
    expect(hasil.ok).toBe(true)
    if (hasil.ok) expect(hasil.state).toEqual({ workouts: [{ id: 'dari-server' }] })
  })

  it('jaringan yang melempar jadi ok:false, bukan lemparan ke pemanggil', async () => {
    // Boot memanggil ini. Lemparan di sini berarti layar yang tidak pernah terbuka — dan orang
    // latihan di basement gym dengan sinyal jelek, jadi ini keadaan normal bukan kasus tepi.
    mocks.lempar = true
    expect(await fetchRemoteState('u1')).toEqual({ ok: false })
  })

  it('build tanpa kredensial jadi ok:false, bukan melempar', async () => {
    mocks.adaKlien = false
    expect(await fetchRemoteState('u1')).toEqual({ ok: false })
  })
})

describe('pushRemoteState', () => {
  it('sukses jadi true', async () => {
    expect(await pushRemoteState('u1', stateLokal())).toBe(true)
  })

  it('TABEL BELUM ADA jadi false — penanda kotor harus tetap berdiri', async () => {
    // `false` berarti belum sampai, dan pemanggilnya yang menahan penanda kotor. Mengembalikan
    // true di sini akan membersihkan penanda itu dan sesi yang dicatat orang hilang selamanya.
    mocks.jawabanUpsert = { error: { code: '42P01', message: 'relation does not exist' } }
    expect(await pushRemoteState('u1', stateLokal())).toBe(false)
  })

  it('jaringan yang melempar jadi false, bukan lemparan', async () => {
    mocks.lempar = true
    expect(await pushRemoteState('u1', stateLokal())).toBe(false)
  })

  it('build tanpa kredensial jadi false', async () => {
    mocks.adaKlien = false
    expect(await pushRemoteState('u1', stateLokal())).toBe(false)
  })

  it('SESI YANG SEDANG BERJALAN tidak pernah ikut terkirim', async () => {
    // Aturan yang sudah tercatat: `active` cuma milik klien. Disaring di `stateForPush`, dan
    // ini yang memeriksa bahwa jalur push benar-benar melewatinya — bukan mengandalkan ingatan
    // seseorang setiap kali jalur ini berubah.
    await pushRemoteState('u1', stateLokal())
    const row = mocks.upsertTerakhir as { state: { active: unknown } }
    expect(row.state.active).toBe(null)
  })

  it('client_ts dikirim sebagai ANGKA di kolomnya sendiri', async () => {
    // Perbandingan jam terjadi di klien; kolom terpisah membuatnya bisa dilihat langsung saat
    // menyelidiki bentrokan. Angka, bukan string — perbandingan string atas timestamp salah.
    await pushRemoteState('u1', stateLokal())
    const row = mocks.upsertTerakhir as { client_ts: number; user_id: string }
    expect(typeof row.client_ts).toBe('number')
    expect(row.client_ts).toBe(1700000000000)
    expect(row.user_id).toBe('u1')
  })

  it('_ts yang hilang jadi 0, bukan NaN', async () => {
    // NaN di kolom bigint ditolak Postgres, dan push yang gagal karena itu akan gagal SELAMANYA
    // untuk state itu — bukan sekali.
    await pushRemoteState('u1', { workouts: [] } as unknown as Parameters<typeof pushRemoteState>[1])
    const row = mocks.upsertTerakhir as { client_ts: number }
    expect(row.client_ts).toBe(0)
    expect(Number.isNaN(row.client_ts)).toBe(false)
  })
})
