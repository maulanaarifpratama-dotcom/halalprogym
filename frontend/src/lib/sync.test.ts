import { describe, expect, it } from 'vitest'
import { applyRemote, decideSync, hasContent, stateForPush } from './sync.js'
import type { AppState } from './types.js'

// Jam dipatok, tidak diambil dari Date.now(): keputusan ini seluruhnya soal perbandingan jam,
// dan tes yang memakai jam nyata cuma gagal kadang-kadang.
const T = 1_800_000_000_000

const withData = (ts: number): AppState => ({
  _ts: ts,
  workouts: [{ d: '2026-08-01', entries: [] }] as AppState['workouts'],
  routines: [],
  bodyweight: [],
})

const empty = (ts = 0): AppState => ({ _ts: ts, workouts: [], routines: [], bodyweight: [] })

describe('hasContent', () => {
  it('kosong berarti tidak ada sesi, rutin, maupun penimbangan', () => {
    expect(hasContent(empty())).toBe(false)
    expect(hasContent(null)).toBe(false)
    expect(hasContent(undefined)).toBe(false)
  })

  it('satu rutin saja sudah cukup untuk dianggap berisi', () => {
    // Ini bukan detail: pengguna yang baru menyusun rencana tapi belum latihan sekali pun
    // TIDAK boleh state-nya ditimpa server kosong.
    expect(hasContent({ workouts: [], routines: [{ id: 'r1' }], bodyweight: [] } as AppState)).toBe(true)
  })

  it('satu penimbangan saja juga cukup', () => {
    expect(hasContent({ workouts: [], routines: [], bodyweight: [{ d: '2026-08-01', w: 77 }] })).toBe(true)
  })
})

describe('decideSync', () => {
  it('server belum pernah diisi dan lokal punya data: dorong', () => {
    const a = decideSync({ local: withData(T), remote: null, dirty: false })
    expect(a).toEqual({ use: 'local', push: true, why: expect.any(String) })
  })

  it('dua-duanya kosong: tidak melakukan apa-apa', () => {
    const a = decideSync({ local: empty(), remote: null, dirty: false })
    expect(a.use).toBe('local')
    expect(a).toMatchObject({ push: false })
  })

  it('perangkat baru — lokal kosong: ambil dari server', () => {
    const a = decideSync({ local: empty(), remote: withData(T), dirty: false })
    expect(a.use).toBe('remote')
  })

  it('KOTOR mengalahkan jam server yang lebih baru', () => {
    // Kasus yang paling penting di seluruh berkas ini. Orang latihan di basement tanpa sinyal,
    // sesinya tercatat lokal, push gagal. Lalu perangkat lain menulis sesuatu yang lebih baru.
    // Mengambil server di sini MEMBUANG sesi yang baru dicatat — persis kegagalan yang
    // membuat aturan offline-first ada.
    const a = decideSync({ local: withData(T), remote: withData(T + 86_400_000), dirty: true })
    expect(a).toEqual({ use: 'local', push: true, why: expect.any(String) })
  })

  it('server lebih baru dan lokal bersih: ambil server', () => {
    const a = decideSync({ local: withData(T), remote: withData(T + 3_600_000), dirty: false })
    expect(a.use).toBe('remote')
  })

  it('lokal lebih baru walau tidak ditandai kotor: dorong, jangan ditimpa', () => {
    // Penanda kotor bisa hilang bersama localStorage yang sebagian ter-evict. Kalau jam lokal
    // lebih baru, dia yang benar — penanda yang hilang bukan alasan membuang data.
    const a = decideSync({ local: withData(T + 3_600_000), remote: withData(T), dirty: false })
    expect(a).toEqual({ use: 'local', push: true, why: expect.any(String) })
  })

  it('selisih di dalam ambang toleransi jam: tidak menimpa dan tidak mendorong', () => {
    // Dua perangkat beda 30 detik itu normal dan bukan bukti apa pun. Bertindak atas selisih
    // sekecil itu membuat dua perangkat saling menimpa bolak-balik setiap kali dibuka.
    for (const skew of [0, 5_000, 30_000, 59_999, -30_000]) {
      const a = decideSync({ local: withData(T), remote: withData(T + skew), dirty: false })
      expect(a, 'skew ' + skew).toMatchObject({ use: 'local', push: false })
    }
  })

  it('ambangnya tepat 60 detik, dan batasnya diuji dari dua sisi', () => {
    expect(decideSync({ local: withData(T), remote: withData(T + 60_000), dirty: false }))
      .toMatchObject({ use: 'local', push: false })
    expect(decideSync({ local: withData(T), remote: withData(T + 60_001), dirty: false }))
      .toMatchObject({ use: 'remote' })
  })

  it('_ts yang hilang dibaca 0, bukan NaN', () => {
    // State dari versi app yang lebih tua tidak punya _ts. NaN akan membuat SETIAP perbandingan
    // false dan diam-diam jatuh ke cabang terakhir.
    const noTs = { workouts: [{ d: '2026-08-01', entries: [] }], routines: [], bodyweight: [] } as AppState
    expect(decideSync({ local: noTs, remote: withData(T), dirty: false })).toMatchObject({ use: 'remote' })
    expect(decideSync({ local: withData(T), remote: noTs, dirty: false }))
      .toMatchObject({ use: 'local', push: true })
  })

  it('setiap keputusan membawa alasan yang bisa dibaca manusia', () => {
    // Sinkronisasi yang salah diselidiki dari log, dan "use: local" sendirian tidak bercerita
    // cabang mana yang jalan.
    const kasus: Array<Parameters<typeof decideSync>[0]> = [
      { local: withData(T), remote: null, dirty: false },
      { local: empty(), remote: withData(T), dirty: false },
      { local: withData(T), remote: withData(T + 86_400_000), dirty: true },
      { local: withData(T), remote: withData(T), dirty: false },
    ]
    for (const k of kasus) expect(decideSync(k).why.length).toBeGreaterThan(8)
  })
})

describe('stateForPush', () => {
  it('MENGOSONGKAN sesi yang sedang berjalan', () => {
    const local = { ...withData(T), active: { entries: [{ id: '0001' }] } } as AppState
    expect(stateForPush(local).active).toBe(null)
  })

  it('tidak mengubah state aslinya', () => {
    const local = { ...withData(T), active: { entries: [] } } as AppState
    stateForPush(local)
    expect(local.active).not.toBe(null)
  })

  it('membiarkan semua field lain apa adanya', () => {
    const local = { ...withData(T), unit: 'lb', city: 'bandung', active: {} } as AppState
    const out = stateForPush(local)
    expect(out.unit).toBe('lb')
    expect(out.city).toBe('bandung')
    expect(out.workouts).toEqual(local.workouts)
    expect(out._ts).toBe(T)
  })
})

describe('applyRemote', () => {
  const DEF = { unit: 'kg', city: 'jakarta', workouts: [], routines: [], bodyweight: [] } as AppState

  it('MEMPERTAHANKAN sesi yang sedang berjalan di perangkat ini', () => {
    // Menarik dari server di tengah latihan tidak boleh menghapus sesi yang sedang dikerjakan.
    const local = { ...withData(T), active: { entries: [{ id: '0001' }] } } as AppState
    const out = applyRemote(withData(T + 1000), local, DEF)
    expect(out.active).toBe(local.active)
  })

  it('field yang tidak ada di state server jatuh ke default, bukan undefined', () => {
    // State dari versi app lebih tua tidak punya field yang baru. Tanpa overlay default,
    // `S.city` jadi undefined dan kartu waktu salat kehilangan kotanya.
    const out = applyRemote({ _ts: T, workouts: [] } as AppState, empty(), DEF)
    expect(out.city).toBe('jakarta')
    expect(out.unit).toBe('kg')
  })

  it('state server menang atas default', () => {
    const out = applyRemote({ _ts: T, unit: 'lb', city: 'medan' } as AppState, empty(), DEF)
    expect(out.unit).toBe('lb')
    expect(out.city).toBe('medan')
  })

  it('tanpa sesi berjalan di lokal, active tidak dipaksa ada', () => {
    const out = applyRemote(withData(T), empty(), DEF)
    expect(out.active).toBeFalsy()
  })
})
