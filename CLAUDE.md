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
cd frontend && npm test          # vitest — 533 test case, JANGAN dibiarkan merah
```

## Aturan tes yang diwarisi dan tetap berlaku

Apa pun yang **memutuskan beban berikutnya** atau **membaca balik sesi yang sudah dilog** = pure
helper di `lib/` dengan unit test di sebelahnya. Bukan diverifikasi dengan klik-klik. Mesin
progresi upstream sudah dua kali kena bug yang **cuma ketangkap tes**. Mode Ramadan menyentuh
mesin itu — jadi aturan ini justru paling relevan sekarang.
