// Demo build (VITE_DEMO=1) — what runs on the GitHub Pages deployment.
//
// Pages can only serve static files, so there is no API: passkey sign-in, per-profile sync
// and the admin dashboard all need the Node backend and are simply not part of a demo build.
// The app therefore stays in guest mode (everything in localStorage) and boots with a seeded
// example history (demoSeed.js), so the charts, heatmap, streaks and "last time you lifted…"
// pre-fills have something to show instead of an empty shell.
//
// Only these three constants are shared with normal builds: Vite replaces VITE_DEMO at build
// time, so the demo-only UI folds away and the seed generator — imported dynamically — never
// lands in a self-hosted bundle.
export const DEMO = import.meta.env.VITE_DEMO === '1'
export const DEMO_SEEDED = 'gym_demo_seeded_v1'
/**
 * Tautan source yang ditawarkan app ke pengguna.
 *
 * Ini menunjuk repo KITA, bukan upstream — dan itu bukan preferensi, itu syarat lisensi. AGPL
 * menuntut penawaran Corresponding Source dari VERSI YANG DIMODIFIKASI; menunjuk openGym yang
 * tidak dimodifikasi tidak memenuhinya sama sekali.
 *
 * Nilainya sempat tertinggal menunjuk `gitlab.com/DuarteSantos8/opengym` setelah fork — sisa
 * warisan yang tidak terlihat karena dia CUMA dipakai di cabang `DEMO`, dan build demo tidak
 * pernah dikirim. Jadi bukan pelanggaran yang hidup, tapi jebakan yang menunggu orang pertama
 * yang menjalankan `VITE_DEMO=1`.
 *
 * Atribusi ke openGym tetap ada dan tetap wajib — tempatnya `NOTICE.md` dan baris "fork dari" di
 * Pengaturan, bukan tautan yang berlabel "source code".
 *
 * Dijaga `source-link.test.ts`.
 */
export const REPO = 'https://github.com/maulanaarifpratama-dotcom/halalprogym'
