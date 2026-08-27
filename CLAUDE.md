# CLAUDE.md — Halal Pro Gym

Panduan untuk Claude Code di repo ini. Baca sebelum menyentuh kode.

## Apa ini

App latihan pribadi untuk brand **Halal Pro** ("Stay Fit Stay Halal"). Fork dari
[openGym](https://gitlab.com/DuarteSantos8/opengym), di-rework ke stack standar + tiga hal yang
jadi alasan app ini ada: **Bahasa Indonesia, jadwal sadar waktu salat, mode Ramadan.**

Single-user per akun. **Bukan** sistem manajemen gym — tidak ada member, tagihan, absensi,
kelas, atau multi-tenant. Kalau muncul permintaan ke arah itu, itu perubahan scope, bukan fitur.

## Lisensi — ini mengikat, bukan formalitas

**AGPL-3.0-or-later.** Di-fork dari kode ber-AGPL, jadi tidak ada pilihan lain, dan itu sudah
diterima sebagai keputusan.

Konsekuensi yang harus dijaga di kode:
- Repo GitHub **wajib publik**, dan link source **wajib ada di dalam app** (Settings → Tentang).
  Kalau link itu hilang, kita melanggar lisensi. Jangan hapus.
- `LICENSE` dan `NOTICE.md` jangan pernah dihapus atau dipangkas.

## Aset latihan — tiga lisensi berbeda, jangan dicampur

| Bagian | Lisensi | Boleh dipakai? |
| --- | --- | --- |
| Nama + instruksi 1.324 latihan | MIT (ExerciseDB) | **Ya**, komersial pun |
| **Gambar + GIF asal openGym** | **© Gym visual** | **TIDAK.** Butuh lisensi sendiri. |
| **Foto demo free-exercise-db** | **Unlicense** (domain publik) | **Ya**, tanpa syarat |
| Diagram otot (`lib/body-paths.js`) | MIT (MuscleMap) | **Ya** |

**Jangan pernah** mengunduh, meng-commit, atau menautkan media Gym visual — termasuk lewat CDN
jsDelivr seperti yang dilakukan upstream. Fig-leaf "diunduh runtime, tidak kami distribusikan"
milik upstream **tidak berlaku untuk produk komersial.**

Yang dipakai sekarang: **foto free-exercise-db**, lisensinya Unlicense, diverifikasi lewat API
GitHub (`spdx_id`) bukan badge README. 329 dari 1.324 latihan terpetakan, dan **24,8% itu angka
yang disengaja** — lihat `scripts/build-exercise-media.mjs`. Aturannya konservatif: nama identik,
atau selisih kata tanpa makna gerakan DAN otot primer setuju.

**Skor kemiripan DILARANG untuk pencocokan ini.** Percobaan dengan Jaccard >= 0.6 menghasilkan
490 kecocokan, dan kesalahannya justru yang paling berbahaya: "rear delt raise" -> "rear delt
ROW", "REVERSE close-grip bench press" -> "close-grip bench press". Kata yang hilang persis kata
yang menentukan variannya, dan orang meniru demo yang dia lihat. Kalau menaikkan cakupan,
naikkan lewat alias yang diperiksa manusia — jangan lewat skor.

Latihan tanpa foto mendapat **diagram otot MuscleMap** (`components/ExerciseAnatomy.jsx`), bukan
kotak kosong. Itu license-clean, dan menjawab pertanyaan yang berbeda: otot mana yang dikerjakan.

Commit free-exercise-db **di-pin** di dua tempat yang harus tetap sama:
`scripts/build-exercise-media.mjs` dan `lib/exercise-media.ts`. Kalau dinaikkan, jalankan
`node scripts/build-exercise-media.mjs --report` dan **periksa mata** kecocokan yang tidak identik.

## Stack

Vite + React + **TypeScript** + Tailwind + shadcn/ui + **Supabase** → **Vercel**,
plus **Capacitor Android** (APK unduh langsung; iOS ditunda — butuh Mac + $99/tahun).

## Yang diwarisi vs yang diganti

```
DIPERTAHANKAN  frontend/src/lib/  logika domain murni, di-port ke TS
               progression · onerm · recovery · workout-model · supersetFlow · finish-workout
               ~4.278 baris + ~4.605 baris tes. Ini aset paling berharga di repo.

DIGANTI        UI (views/components/CSS)  → Tailwind + shadcn
               storage + auth + api/      → Supabase (server 977 baris upstream sudah dihapus)
```

`lib/` itu framework-free dan storage-agnostic. **Jaga tetap begitu** — jangan impor React atau
klien Supabase ke dalamnya. Itu sebabnya dia bisa diwarisi dan ditesnya jalan.

## Aturan arsitektur yang tidak boleh dilanggar

**1. Offline-first. localStorage adalah source of truth, Supabase cuma target sync.**
Orang latihan di basement gym dengan sinyal jelek. Jangan pernah bikin layar menunggu network.
Sesi yang sedang berjalan (`active`) **cuma di klien**, sync waktu selesai.

**2. Rest timer TIDAK PAKAI server push.** Timer lokal + Capacitor local notification.
Upstream memakai `setTimeout` di server (`api/server.js:172`) — itu mustahil di Vercel serverless
*dan* menambah titik gagal jaringan tepat saat timer habis. Jangan dihidupkan ulang dalam bentuk
apa pun.

**3. Vercel serverless tidak punya state antar-request.** Tidak ada `setTimeout`, `setInterval`,
atau `Map` in-memory yang bertahan. Reminder harian pakai Vercel Cron / `pg_cron`.

**4. Waktu salat: `adhan-js`, dihitung lokal, jangan API.** Gym tanpa sinyal = tanpa waktu salat.
Default parameter Kemenag, **wajib diverifikasi** ke jadwal resmi minimal 6 kota (Jakarta,
Bandung, Surabaya, Medan, Makassar, Jayapura — sengaja rentang bujur ekstrem) sebelum parameter
dikunci. Jangan percaya angka dari hafalan model. Lokasi = **pilih kota**, bukan geolocation.

**5. Mode Ramadan wajib men-*hold* mesin progresi.** Puasa menurunkan performa; mesin progresi
tidak tahu itu Ramadan dan akan **meregresi beban**. Sebulan begitu = program mundur jauh.
Jadi mode Ramadan menyetel progresi ke `hold` (jangan naik, jangan turun) + volume dipangkas
~30–40%. Notifikasi juga harus sadar jam puasa — push "minum air" jam 2 siang itu salah.

**6. Hari: Ahad, bukan Minggu.** Nama hari Indonesia sudah Arab semua (Itsnain→Senin,
Tsalatsa→Selasa, Arbi'a→Rabu, Khamis→Kamis, Jumu'ah→Jumat, Sabt→Sabtu) — kecuali "Minggu", dari
Portugis *domingo* ("Hari Tuhan"). Ganti ke **Ahad** dan minggunya konsisten penuh.
`lib/format.js` `DAYN` **sudah** mulai indeks 0 = Ahad, jadi tidak ada pergeseran indeks.
Tanggal Hijriah ditampilkan dengan **offset ±1 hari yang bisa disetel** — hisab bisa beda sehari
dari sidang isbat Kemenag.

**7. TypeScript `strict`.** Terutama di `lib/`. Baris set punya dua diskriminator ortogonal:
`phase: 'work'|'warmup'` × `type: 'straight'|'dropset'|'restpause'`. Semantiknya beda dan pernah
membuat upstream salah: `drops` itu kerja **tambahan di atas** set utama, `clusters` itu
**pecahan dari** total set itu sendiri. Riwayat bug itu di
`docs/upstream/DOMAIN-NOTES-dropset-restpause.md` — **baca sebelum menyentuh workout-model.**

## Supabase — baca ini sebelum menjalankan SQL apa pun

Project Halal Pro Gym: **`ljhawtubkynxwcaaqcpo`**
(ref itu publik — dia ada di setiap request dari browser, jadi bukan rahasia.)

**Project ini ada di akun email yang BERBEDA dari konektor Supabase MCP di mesin ini.**
Akibatnya ada asimetri berbahaya:

| | MCP bisa lihat? |
| --- | --- |
| `ljhawtubkynxwcaaqcpo` — **Halal Pro Gym, milik repo ini** | **TIDAK** |
| `hpxjvffwhajumdlxhuet` — LittleChamp | Ya |
| `uncsvkvkaijzydndyutp` — supabase-cobalt-compass | Ya |

Jadi kalau sesi memakai tool Supabase MCP di repo ini, satu-satunya database yang terjangkau
justru **dua yang bukan milik repo ini.**

**ATURAN: jangan pernah pakai tool `mcp__*supabase*` dari repo ini.** Bukan karena rusak — karena
dia menunjuk ke tempat yang salah, dan kegagalannya sunyi.

**`hpxjvffwhajumdlxhuet` (LittleChamp) dilarang keras disentuh.** User menyatakan eksplisit
2026-08-27: project itu dipakai, jangan pernah disentuh. Bukan cuma soal repo — jangan disentuh
dari sesi mana pun.

Cara yang benar: **Supabase CLI + berkas migration di git.**

```bash
supabase link --project-ref ljhawtubkynxwcaaqcpo   # ref-nya eksplisit, bukan tersirat
supabase db push
```

Migration hidup sebagai berkas di `supabase/migrations/`, bisa di-review, bisa diulang.

**Jangan bikin workflow yang auto-`db push` saat ada perubahan di `supabase/migrations/`.**
Impactory punya itu, dan akibatnya di sana "cuma commit" bisa berarti deploy produksi. Jangan
tanam ulang jebakan yang sama di sini.

Kredensial: `.env.local` (diabaikan git). `VITE_SUPABASE_URL` dan
`VITE_SUPABASE_PUBLISHABLE_KEY` memang terkirim ke browser — bukan rahasia. Yang rahasia
(`service_role`, `sb_secret_*`, password DB) **tidak boleh ada di repo ini sama sekali**, dan
nilainya tidak pernah disalin ke vault, catatan, atau output percakapan.

### STATUS SEBENARNYA: Supabase BELUM terpasang sama sekali

Diperiksa 2026-08-28. Jangan percaya kalimat "→ Supabase" di bagian Stack sebagai keadaan
sekarang — itu rencana, bukan fakta. Yang benar hari ini:

- **Nol** impor Supabase di `frontend/src/`. `@supabase/supabase-js` tidak ada di `package.json`.
  Direktori `supabase/` belum ada.
- Seluruh lapis auth masih milik upstream: `lib/api.js` memanggil `/api/config`, `/api/pair/*`,
  dan WebAuthn passkey ke **server yang sudah kita hapus** (977 baris itu memang sudah dibuang).
- Akibatnya app **jalan normal dalam mode tamu**: `/api/config` gagal → `config` tetap null →
  `guestAllowed(null)` mengembalikan true → masuk sebagai tamu, semuanya di localStorage. Itu
  konsisten dengan aturan offline-first, jadi bukan kerusakan. Yang rusak adalah **UI yang
  menawarkan jalan yang mustahil**: "Masuk dengan passkey", "Sambungkan ke server saya",
  "Sambungkan app HP", "Pasang di server sendiri".

**Ini titik berhenti wajib, bukan pekerjaan otonom.** SOP global mewajibkan berhenti untuk
migration/schema dan auth/permission, dan memasang Supabase menyentuh keduanya sekaligus. Yang
sudah dikerjakan tanpa menyentuh auth: string-nya di-rebrand supaya tidak lagi menyebut openGym.
Yang **belum diputuskan** dan butuh keputusan user:

1. Apakah UI self-host + pairing itu dicabut (kita bukan produk self-host — Vercel + Supabase,
   satu pengguna per akun), atau ditahan sampai Supabase Auth masuk menggantikannya?
2. Skema tabel + RLS untuk sinkronisasi. Ingat: localStorage tetap sumber kebenaran, Supabase
   cuma target sync, dan sesi `active` **tidak** disinkronkan sampai selesai.

Sebelum itu dijawab, jangan menulis migration dan jangan menyentuh `lib/api.js`.

## Peringatan Dependabot 11 kerentanan — sudah diputuskan, jangan dikejar lagi

GitHub melaporkan 11 kerentanan (8 high, 1 critical) di repo ini. Semuanya satu rantai:

    @capacitor/assets -> sharp@0.32.6 -> CVE libvips

**`npm audit --omit=dev` = 0.** Nol yang sampai ke pengguna. `@capacitor/assets` adalah
devDependency yang cuma jalan saat men-generate ikon dan splash platform, dan
`@capacitor/assets@3.0.5` sudah versi terbaru — **tidak ada versi perbaikannya**, jadi
menaikkan versi tidak menyelesaikan apa pun (PR Dependabot yang masuk cuma bump paket lain).

Jalan keluar yang sebenarnya ada dua, dan keduanya sudah ditimbang:

1. **Cabut `@capacitor/assets`.** Ditolak: dia alat yang tepat untuk pekerjaannya — ikon
   adaptif Android dan splash butuh lebih dari sekadar me-resize PNG. Mencabut alat yang
   dibutuhkan supaya sebuah badge hijau adalah menukar kualitas dengan penampilan.
2. **Terima dan catat.** Dipilih. Ini catatannya.

Kalau nanti ada rilis `@capacitor/assets` yang membawa `sharp` baru, naikkan. Sampai itu ada,
peringatan itu **bukan pekerjaan** — dan sesi berikutnya tidak perlu menemukan ulang kesimpulan
ini dari nol.

## Git

```
origin    github.com/maulanaarifpratama-dotcom/halalprogym   ← kita
upstream  gitlab.com/DuarteSantos8/opengym                   ← fetch saja, push SENGAJA DIRUSAK
```

Upstream masih aktif dan masih memperbaiki bug di `lib/` — logika domain yang kita warisi. Jadi
`git fetch upstream` lalu `git log upstream/main -- frontend/src/lib/` itu berguna. Tapi karena
`lib/` sudah jadi TS, patch mereka **tidak akan apply otomatis** — baca, pahami, terapkan tangan.

**Jangan pernah push ke upstream.** URL push-nya sudah sengaja dirusak sebagai pengaman.

## Perintah

```bash
cd frontend && npm install
cd frontend && npm run dev       # dev server
cd frontend && npm run verify    # SELURUH gate, ini yang dipakai sebelum commit
cd frontend && npm test          # vitest — 591 test case, JANGAN dibiarkan merah
```

`npm run verify` menjalankan berurutan: `typecheck` → `check:names` → `check:locales` →
`check:locale-keys` → `test` → `build`. Pakai ini, jangan mengingat urutannya sendiri.

## Empat checker, dan pertanyaan berbeda yang dijawab masing-masing

Ini bukan redundansi. Masing-masing menutup celah yang tidak terlihat oleh yang lain, dan
semuanya lahir dari bug yang benar-benar lolos ke layar.

| Perintah | Pertanyaan | Bug yang melahirkannya |
| --- | --- | --- |
| `npm run typecheck` | Apakah `.ts` konsisten? | — |
| `npm run check:names` | Apakah setiap nama yang dipakai benar-benar ada? | **Layar Pengaturan MATI TOTAL** — `CITIES` dipakai tanpa pernah diimpor. Dan `onExercise` di Stats dipanggil tanpa pernah dikirim: ketukan pertama melempar ReferenceError. |
| `npm run check:locales` | Apakah 13 pack membawa kunci yang sama? | — |
| `npm run check:locale-keys` | Apakah setiap kunci terjemahan masih menunjuk teks yang ada, dan setiap nilai katalog punya terjemahan? | `full body` tampil Inggris di **13 bahasa** selama berbulan-bulan. |

**`check:names` ada karena `checkJs: false`.** `allowJs: true` + `checkJs: false` itu keputusan
yang benar — menyalakan `checkJs` sekarang menghasilkan 2.365 error yang hampir semuanya
implicit-any, bukan bug. Tapi harganya: di `.jsx`, TypeScript tidak memeriksa apa pun, termasuk
apakah sebuah nama ada. `check:names` menjalankan `tsc --checkJs` lalu **menyaring hanya TS2304
dan TS2552** ("Cannot find name"). Jadi dia bisa dipatok NOL hari ini tanpa menunggu migrasi TS
selesai. Kalau naik dari nol, itu selalu bug runtime, bukan utang tipe.

**`check:locale-keys` ada karena `check:locales` punya dua titik buta bawaan.** Dia membandingkan
pack lawan pack lewat *gabungan* kunci, jadi (1) kunci yang mati di ke-13 pack sekaligus tetap
"sinkron" sambil sama-sama menunjuk teks yang sudah tidak ada — itu yang terjadi saat string
sumber diedit, misalnya rebrand openGym → Halal Pro Gym; dan (2) kunci yang **hilang di semua
pack** tidak pernah masuk gabungan itu, jadi tidak pernah dilaporkan.

**Patokan teks pada sumber tidak cukup.** `Stats.test.js` memaku baris `onExercise` lewat
pencocokan string, dan hijau berbulan-bulan di atas simbol yang tidak ada. Kalau sebuah tes
memaku baris yang menyebut nama, dia harus ikut memaku **dari mana nama itu datang**.

## `id.js` sudah lengkap — dan "lengkap" itu sekarang bisa diperiksa

714 dari 764 kunci. **50 sisanya sengaja Inggris**, terdaftar eksplisit di `ID_KEEPS_ENGLISH`
(`scripts/check-locales.mjs`): istilah gym dan nama alat yang memang dipakai orang di gym
Indonesia — reps, barbell, dumbbell, kettlebell, cable, smith machine, lats, hamstring, core.
Menerjemahkan "reps" jadi "repetisi" bikin app terasa seperti buku pelajaran.

Daftar itu, bukan `IN_PROGRESS`, yang menjaganya sekarang. `IN_PROGRESS` memaklumi **semua** kunci
yang hilang, jadi kunci baru yang lupa disebar ke `id.js` lolos tanpa suara. Dengan daftar
eksplisit, yang hilang harus **sama dengan** daftar itu — dan pemeriksaannya dua arah, karena
kunci terdaftar yang ternyata diterjemahkan berarti keputusannya berubah tapi daftarnya belum.

Nilai `id.js` **tidak boleh identik dengan kuncinya**. Pemetaan identik bikin persentase cakupan
bohong dan membuat baris itu tampak sudah diputuskan padahal belum. Kalau Inggrisnya yang natural,
kuncinya tidak diisi dan daftarkan di `ID_KEEPS_ENGLISH`.

## Aturan tes yang diwarisi dan tetap berlaku

Apa pun yang **memutuskan beban berikutnya** atau **membaca balik sesi yang sudah dilog** = pure
helper di `lib/` dengan unit test di sebelahnya. Bukan diverifikasi dengan klik-klik. Mesin
progresi upstream sudah dua kali kena bug yang **cuma ketangkap tes**. Mode Ramadan menyentuh
mesin itu — jadi aturan ini justru paling relevan sekarang.
