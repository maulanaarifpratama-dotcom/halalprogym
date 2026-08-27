import { create } from 'zustand'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { MOBILE, nativeLoad, nativeSave, syncReminder, writeAutoBackup } from '../lib/mobile.js'
import { currentUser, signOutEverywhere, signOutHere, toAppUser } from '../lib/auth.js'
import { supa } from '../lib/supabase.js'
import { deleteRemoteState, fetchRemoteState, pushRemoteState } from '../lib/remote-state.js'
import { applyRemote, decideSync } from '../lib/sync.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, restPauseSec: 15, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null, autoBackup: false,
  // Kota untuk waktu salat. Dipilih dari daftar, bukan geolocation: tanpa izin browser,
  // jalan offline, dan untuk waktu salat presisi GPS tidak dibutuhkan. Lihat lib/prayer.ts.
  city: 'jakarta',
  // Mode Ramadan dan mode puasa sunah Senin-Kamis. Sakelar MANUAL, bukan deteksi tanggal
  // Hijriah otomatis: awal Ramadan di Indonesia ditetapkan sidang isbat, dan hisab bisa beda
  // sehari. Menyala sehari lebih awal berarti menahan progresi di hari yang belum berpuasa;
  // sehari lebih lambat berarti satu hari puasa yang dibaca mesin sebagai kegagalan.
  // Lihat lib/ramadan.ts.
  ramadan: { on: false, sunnah: false, volumeKeepPct: 65 },
  // Jeda otomatis saat waktu salat masuk di tengah sesi. Default NYALA: ini salah satu alasan
  // app ini ada. Bisa dimatikan, karena orang yang salat di gym punya kebiasaan berbeda dan
  // app tidak berhak memaksa satu di antaranya.
  prayerPause: true,
  // Geseran tanggal Hijriah, -2..+2 hari. Nol berarti pakai hisab Umm al-Qura apa adanya.
  // Ada karena sidang isbat Kemenag bisa berbeda sehari dari hisab, dan satu hari itu
  // menentukan hari pertama Ramadan. Lihat lib/hijri.ts.
  hijriOffset: 0,
  // Equipment profiles (issue: filter Library/picker/routines by what you actually own —
  // e.g. "Home" vs "Gym" — building on the session-only equipment filter from issue #6).
  equipProfiles: [], activeEquipId: null, equipFilterOn: false,
  // Standing per-exercise notes, keyed by exercise id: the gym-specific facts that are true
  // every time you do the movement ("seat 4, pin 7"). Distinct from a routine's `note`, which
  // belongs to one exercise in one plan, and from a session note, which belongs to one day.
  exNotes: {},
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return Object.assign(clone(DEF), JSON.parse(raw))
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  const persist = (S, push = true) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    set({ S })
    if (MOBILE) nativePersist()
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (MOBILE && saveTm) {
      clearTimeout(saveTm)
      saveTm = null
      nativeSave(get().S)
    }
    if (pushTm) {
      clearTimeout(pushTm)
      pushTm = null
      get().pushState()
    }
  })

  // Everything a sign-out leaves behind on this device, whichever way it was triggered.
  const clearLocalSession = () => {
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    persist(clone(DEF), false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) { persist(clone(S), push) },

    // Fires after the moments where losing local data would actually hurt — a workout just
    // logged, a routine just edited — not on every keystroke. No-op off mobile or with the
    // setting off; the private file mirror (nativePersist, above) already covers every change.
    autoBackupNow() {
      const S = get().S
      if (MOBILE && S.autoBackup) writeAutoBackup(S)
    },

    isGuest: () => localStorage.getItem('gym_guest') === '1',
    setGuest(v) { if (v) localStorage.setItem('gym_guest', '1'); else localStorage.removeItem('gym_guest'); set({}) },

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); localStorage.removeItem('gym_guest') }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    // Penanda "ada perubahan lokal yang belum sampai ke server". Tetap di localStorage, bukan
    // di memori: push yang gagal karena tab ditutup harus tetap terbaca di boot berikutnya.
    isDirty: () => localStorage.getItem('gym_dirty') === '1',

    async pushState() {
      const u = get().user
      if (!u) return
      clearTimeout(pushTm)
      const ok = await pushRemoteState(u.id, get().S)
      if (ok) localStorage.removeItem('gym_dirty')
      else localStorage.setItem('gym_dirty', '1')
    },

    // Menyelaraskan perangkat ini dengan server. Keputusan siapa yang menang ada di
    // lib/sync.ts — di sini cuma jaringan dan efeknya, supaya keputusannya bisa ditesnya
    // tanpa jaringan sama sekali.
    async pullState() {
      const u = get().user
      if (!u) return
      const res = await fetchRemoteState(u.id)
      // Gagal jaringan BUKAN "server kosong". Menganggapnya kosong akan mendorong state lokal
      // ke atas state server yang sebenarnya lebih baru, dan itu kehilangan data yang sunyi.
      if (!res.ok) return
      const local = get().S
      const action = decideSync({ local, remote: res.state, dirty: get().isDirty() })
      if (action.use === 'remote' && res.state) {
        persist(applyRemote(res.state, local, clone(DEF)), false)
        localStorage.removeItem('gym_dirty')
        return
      }
      if (action.use === 'local' && action.push) await get().pushState()
    },

    async signOut() {
      await get().pushState()   // tidak melempar — menandai kotor lalu lanjut kalau offline
      await signOutHere()
      clearLocalSession()
    },

    // "Keluar dari semua perangkat". Berbeda dari signOut, request ini TIDAK ditelan: kalau dia
    // gagal, sesi di perangkat lain semuanya masih hidup, dan menghapus salinan data di
    // perangkat ini justru mengeluarkan orang dari satu-satunya tempat yang tidak terjangkau.
    // Pemanggil yang melaporkan errornya.
    async signOutAll() {
      await get().pushState()   // tidak melempar — menandai kotor lalu lanjut kalau offline
      await signOutEverywhere()
      clearLocalSession()
    },

    // Masuk berhasil (Google atau magic link). Dipanggil dari listener onAuthStateChange, jadi
    // satu jalur untuk semua provider dan untuk sesi yang dipulihkan setelah redirect.
    async onSignedIn(user) {
      get().setUser(user)
      await get().pullState()
      const tz = localTZ()
      if (get().S.reminder?.on && get().S.reminder.tz !== tz) {
        get().update(s => { s.reminder = { ...s.reminder, tz } })
      }
      set({ ready: true })
    },

    // "Hapus semua data" untuk pengguna yang masuk harus ikut menghapus barisnya di server.
    // Kalau barisnya ditinggal, boot berikutnya menariknya kembali dan penghapusannya terasa
    // tidak berlaku — pull memang akan melihat lokal kosong dan mengambil server.
    async wipeEverything() {
      const u = get().user
      if (u) await deleteRemoteState(u.id)
      localStorage.removeItem('gym_dirty')
      persist(clone(DEF), false)
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot.
    //
    // ATURAN YANG MEMBENTUK URUTAN DI SINI: app TIDAK BOLEH menunggu jaringan untuk terbuka.
    // Orang latihan di basement gym dengan sinyal jelek, dan layar yang menggantung menunggu
    // Supabase adalah kegagalan yang paling terasa. Jadi state lokal sudah termuat sebelum
    // fungsi ini jalan (lihat loadState di atas), dan yang dikerjakan boot cuma: cari tahu
    // apakah ada sesi, lalu selaraskan di belakang.
    async boot() {
      // Build mobile: tidak ada backend sama sekali secara default — pulihkan dari cermin
      // berkas (salinan yang awet; localStorage bisa ter-evict) lalu masuk.
      if (MOBILE) {
        const saved = await nativeLoad()
        const S = get().S
        if (saved && (!hasData(S) || (saved._ts || 0) >= (S._ts || 0))) {
          persist(Object.assign(clone(DEF), saved), false)
        } else if (hasData(S)) {
          nativeSave(S)   // run pertama setelah update dari versi tanpa berkas: isi cerminnya
        }
        syncReminder(get().S)
      }
      // Build demo (GitHub Pages): seed sekali, tetap tamu.
      if (DEMO) {
        if (!localStorage.getItem(DEMO_SEEDED)) {
          localStorage.setItem(DEMO_SEEDED, '1')
          await get().resetDemo()
        }
        get().setGuest(true)
        set({ ready: true })
        return
      }

      const sb = supa()
      // Tanpa kredensial Supabase, masuk-dengan-akun tidak ada. Itu bukan kerusakan: mode tamu
      // adalah jalur yang didukung, dan `npm run dev` tanpa .env.local memang harus membuka app
      // yang berfungsi. Yang tidak boleh terjadi adalah UI menawarkan jalan yang mustahil —
      // itu dijaga oleh SUPABASE_READY di layar masuk.
      if (!sb) {
        get().setGuest(true)
        set({ ready: true })
        return
      }

      // Perubahan sesi didengarkan SEBELUM getSession dipanggil, supaya token yang datang
      // sebagai fragmen URL setelah redirect OAuth tidak terlewat di celah antara keduanya.
      sb.auth.onAuthStateChange((event, session) => {
        const u = toAppUser(session?.user)
        if (u) {
          // Refresh token tidak perlu memicu pull ulang — dia terjadi diam-diam tiap jam, dan
          // pull di situ berarti satu request tiap jam tanpa alasan.
          if (event === 'TOKEN_REFRESHED' && get().user?.id === u.id) { get().setUser(u); return }
          get().onSignedIn(u)
        } else if (event === 'SIGNED_OUT') {
          clearLocalSession()
          get().setGuest(true)
          set({ ready: true })
        }
      })

      const user = await currentUser()
      if (user) {
        await get().onSignedIn(user)
        return
      }
      // Belum masuk. Tamu selalu boleh — produk ini satu pengguna per akun, tidak ada
      // invite-only dan tidak ada admin yang bisa mematikan mode tamu.
      set({ ready: true })
    }
  }
})

export { hasData }
