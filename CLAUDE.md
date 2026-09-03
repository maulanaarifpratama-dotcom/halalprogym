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
GitHub (`spdx_id`) bukan badge README. 376 dari 1.324 latihan terpetakan, dan **28,4% itu angka
yang disengaja** — lihat `scripts/build-exercise-media.mjs`. Aturannya konservatif: nama identik,
atau selisih kata tanpa makna gerakan DAN otot primer setuju.

**Ada DUA daftar tangan, dan keduanya perlu.** `HAND_ALIASES` menambah kecocokan yang aturan
otomatis lewatkan; `HAND_REJECTS` membuang kecocokan yang aturan otomatis terima dengan SALAH.
Tanpa yang kedua, satu-satunya cara memperbaiki satu baris adalah memperketat aturan untuk semua
baris — dan itu sudah diukur: memecah kelas `smith` dari `machine` membuang **tujuh** kecocokan
yang benar ("Smith Machine Bent Over Row", "Smith Machine Squat", …) untuk membuang enam yang
salah. Pertukaran yang buruk, jadi perbaikannya per-baris.

Yang ditolak sekarang tujuh, semuanya kelas **alat yang berbeda**: Smith machine dipasangkan foto
mesin tuas (`smith shoulder press` → *Leverage Shoulder Press*), dipasangkan latihan tanpa alat
(`smith chair squat` → *Chair Squat*), dan satu baris yang data sumbernya sendiri tidak konsisten
(`lever bent over row` bertanda `eq: barbell` di katalog kita). Ketujuhnya mendapat diagram otot,
dan itu jawaban yang lebih jujur daripada foto mesin yang salah.

**`ez barbell` SENGAJA tetap sekelas dengan `barbell`.** Batangnya beda bentuk, gerakannya
identik, dan lifter menukarnya tanpa berpikir. Jangan ditanyakan ulang setiap audit.

**Skor kemiripan DILARANG untuk pencocokan ini.** Percobaan dengan Jaccard >= 0.6 menghasilkan
490 kecocokan, dan kesalahannya justru yang paling berbahaya: "rear delt raise" -> "rear delt
ROW", "REVERSE close-grip bench press" -> "close-grip bench press". Kata yang hilang persis kata
yang menentukan variannya, dan orang meniru demo yang dia lihat. Kalau menaikkan cakupan,
naikkan lewat alias yang diperiksa manusia — jangan lewat skor.

Latihan tanpa foto mendapat **diagram otot MuscleMap** (`components/ExerciseAnatomy.jsx`), bukan
kotak kosong. Itu license-clean, dan menjawab pertanyaan yang berbeda: otot mana yang dikerjakan.

Penurunannya berlapis dan **gagal muat ikut turun**: foto → diagram otot → ikon bagian tubuh
dengan ajakan mengisi bagian tubuhnya. Slot demo tidak pernah kosong, dan tidak pernah menampilkan
ikon gambar-rusak bawaan browser. Dipaku `Media.test.jsx`, yang ada karena satu komentar di repo
ini sempat mengklaim sebaliknya — bingkai hilang disebut "tampil sebagai gambar rusak", padahal
`onError` menangkapnya. Konsekuensinya justru lebih halus dan itu yang benar: bingkai hilang tidak
bisa dibedakan dari latihan yang belum terpetakan, jadi lubangnya tidak akan pernah dilaporkan
siapa pun. Itu alasan `scripts/fetch-demo-media.mjs` gagal keras.

Commit free-exercise-db **di-pin**, dan harus tetap satu nilai di semua tempat:
`scripts/build-exercise-media.mjs` (akar repo) dan `lib/exercise-media.ts`. Tempat ketiga,
`frontend/scripts/fetch-demo-media.mjs`, sengaja **MEMBACANYA** dari `lib/exercise-media.ts`
alih-alih menyimpan salinannya — cara terbaik menjaga tiga tempat tetap sinkron adalah membuat
salah satunya bukan tempat penyimpanan. Kalau satu menyimpang, peta menunjuk satu commit dan foto
datang dari commit lain: yang muncul di layar adalah **gerakan yang salah**, tanpa error. Dijaga
`exercise-media.test.ts`. Kalau dinaikkan, jalankan `node scripts/build-exercise-media.mjs
--report` dan **periksa mata** kecocokan yang tidak identik.

## Demo gerakan: ILUSTRASI menang atas FOTO — dan alasannya aturan aurat

Dua sumber, dan urutannya bukan selera:

| Sumber | Lisensi | Bentuk | Cakupan |
| --- | --- | --- | --- |
| **RepDB** | Free Tier v1.0 — komersial + atribusi | ilustrasi flat, dua bingkai | 135 |
| free-exercise-db | Unlicense | foto orang sungguhan | 376 |
| **gabungan** | | | **411 dari 1.324** |

`demoFrames` memilih ILUSTRASI lebih dulu, dan itu memenuhi aturan yang sudah tertulis di
`DESIGN.md` sejak hari pertama, di bagian *Yang tidak boleh masuk*:

> Figur manusia berpakaian minim sebagai demo gerakan — soal aurat **dan** lisensi.

Foto free-exercise-db adalah foto orang sungguhan, dan **sebagian bertelanjang dada**. Aturannya
ada; yang tidak pernah terjadi adalah memeriksanya ke foto yang benar-benar dikirim — tidak ada
metadata yang menyatakan "model bertelanjang dada", jadi aturan otomatis apa pun tidak akan pernah
menangkapnya. Ketahuan cuma saat delapan foto dibuka satu per satu. Kelas yang sama dengan
`--acc-ink` dan `--label-3`.

**Cakupannya PARSIAL, dan itu harus disebut jujur.** RepDB cuma menutupi 135
latihan, jadi ratusan latihan lain masih memakai foto — dan sebagian di antaranya mungkin masih
melanggar aturan yang sama. Yang menutup itu sepenuhnya adalah keputusan bisnis: beli lisensi
media, atau foto/ilustrasi sendiri.

**Cakupannya dinaikkan lewat alias yang diperiksa manusia, bukan pelonggaran aturan.** 86 → 135
(+49): 424 usulan → penjaga kata-penentu-varian membuang 325 → **penjaga kesepakatan alat**
membuang 44 lagi → tujuh sisanya gambarnya dibuka satu per satu.

Penjaga alat itu yang paling berharga, dan empat contohnya akan lolos kalau cuma membaca nama:

| Nama kita | Nama RepDB | Yang digambar ilustrasinya |
| --- | --- | --- |
| `kettlebell arnold press` | "Arnold Press" | **dumbbell** |
| `dumbbell goblet squat` | "Goblet Squat" | **kettlebell** |
| `barbell single leg deadlift` | "… Single Leg Deadlift" | **kettlebell** |
| `dumbbell preacher curl` | "Preacher Curl" | **EZ-bar** |

Nama RepDB sering generik sementara nama kita menyebut alatnya — dan yang generik itu **tetap
menggambar satu alat tertentu.** Enam dari tujuh yang alatnya tidak dinyatakan juga ditolak
setelah gambarnya dibuka: ilustrasi "Single Leg Calf Raise" ternyata berat badan murni, tanpa
band maupun dumbbell.

**Term 3 lisensi RepDB menentukan cara kerjanya:** dataset tidak boleh diredistribusi. Repo ini
publik (AGPL mewajibkannya), jadi yang di-commit **cuma peta** (id katalog kami → nama berkas
mereka, dan peta itu karya kami). Gambarnya dimuat dari distribusi RepDB pada **commit yang
di-pin** — pola yang sama persis dengan foto, dan alasannya sama: peta dan gambar yang berpisah
berarti gerakan yang salah di layar, tanpa error. Membundel ke APK adalah pemakaian in-app dan
diizinkan term 4; cache-nya di luar repo.

**Atribusi wajib** (term 2): `NOTICE.md` dan Pengaturan → Tentang. Dijaga
`exercise-illustrations.test.ts`. Jangan hapus.

`DEMO_COUNT` adalah **gabungan**, bukan penjumlahan — puluhan latihan tercakup keduanya, dan
menjumlahkannya akan mengklaim cakupan yang tidak ada di header yang dilihat pengguna.

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

Yang membuat aturan ini benar-benar berlaku, bukan cuma tertulis:

- **`public/sw.js` cache-first, bukan network-first.** Masalahnya BUKAN offline — offline sudah
  tertangani, karena fetch yang gagal jatuh ke cache. Yang salah adalah kasus yang jauh lebih
  sering: sinyal ADA tapi buruk. `fetch()` tidak punya timeout, jadi satu request yang
  menggantung berarti layar yang menggantung. Ada 18 tesnya, dijalankan atas berkas aslinya.
- **Foto gerakan dari CDN ikut di-cache**, dengan mode `cors` bukan opaque (opaque menghabiskan
  kuota dengan padding besar). SW lama menolak semua request lintas-origin, jadi di basement
  tanpa sinyal app ini menampilkan **nol foto gerakan**.
- **`lib/prefetch.ts` menyiapkan foto rencana HARI INI** selagi masih di wifi. Cache yang diisi
  saat dibutuhkan selalu terlambat satu langkah. Ditahan di koneksi hemat-data dan 2g.
- **APK MEMBUNDEL fotonya sendiri** (`scripts/fetch-demo-media.mjs`, dipanggil `build:mobile`).
  Dua butir di atas cuma berlaku di web: build native sengaja TIDAK mendaftarkan service worker —
  benar, karena shell-nya sudah dari disk — tapi akibat sampingannya tidak pernah ditutup. Tanpa
  service worker tidak ada cache foto yang kita kendalikan, dan `prefetchMedia` diam-diam tidak
  melakukan apa pun karena tidak ada registrasi untuk dikirimi pesan. Jadi di APK setiap foto
  butuh jaringan setiap kali, di kendaraan yang justru >90% pasar sasaran. Harganya **diukur, 39
  MB** — bukan 25 MB seperti perkiraan pertama dari 8 sampel. Cache-nya di `media-cache/`, **di
  luar `public/`**: Vite menyalin `public/` ke `dist/` di SETIAP build, dan di sana build web ikut
  membawa 39 MB yang tidak dipakai (terukur: 49 MB alih-alih 11 MB, terkirim ke Vercel tiap
  deploy). Itu sempat terjadi, dan cuma ketangkap karena ukurannya diukur.

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

**5. Mode Ramadan men-*hold* mesin progresi — SUDAH TERPASANG.** Puasa menurunkan performa;
mesin progresi tidak tahu itu Ramadan dan akan **meregresi beban**. Sebulan begitu = program
mundur jauh. Logikanya di `lib/ramadan.ts` (murni, bertes), disambungkan di `nextPrescription`
sebagai **pembungkus di luar badan fungsinya** — badan itu punya sebelas jalan keluar, dan satu
cabang yang lupa sudah cukup. Volume dipangkas di `buildWorkSets`, satu tempat yang dilewati
semua mode logging; set warm-up TIDAK ikut dipangkas.

**Grafik berat badan menandai Ramadan, dan penandanya dihitung dari KALENDER bukan dari sakelar
itu** (`lib/ramadan-bands.ts`). Puasa sebulan menurunkan berat badan; grafiknya tidak tahu soal
kalender, jadi yang terlihat adalah penurunan tajam sebulan lalu naik lagi — dan setahun kemudian
tidak ada cara tahu itu Ramadan dan bukan program yang gagal. `S.ramadan` cuma menyimpan keadaan
SEKARANG, tidak ada riwayat kapan sakelarnya menyala, jadi menandai masa lalu dari sakelar itu
mustahil. Ramadan sendiri fakta kalender. Konsekuensinya jujur: pitanya memakai hisab + offset,
jadi tepinya bisa bergeser sehari dari ketetapan Kemenag — untuk pita latar itu tidak mengubah
apa pun, dan perbedaan kepentingan itulah alasan yang satu boleh otomatis dan yang lain tidak.

Sakelarnya **manual**, bukan deteksi tanggal Hijriah otomatis: awal Ramadan ditetapkan sidang
isbat, dan menyala sehari lebih awal berarti menahan progresi di hari orang belum berpuasa.
Mode **puasa sunah Senin–Kamis** memakai mesin yang sama, dan itu jalur ujinya sebelum Ramadan.

**Di hari puasa, kartu salat di Home juga menyebut kapan masuk akal latihan** — sebelum Magrib
(selesai lalu langsung berbuka) dan setelah Tarawih. Logikanya `trainingWindows` di
`lib/ramadan.ts`, sudah ada dan bertes sejak mode Ramadan dipasang tapi **tidak pernah dipanggil
dari mana pun** sampai 2026-08-28. Saran, bukan paksaan. Di hari biasa barisnya tidak muncul, dan
cabang NEGATIF itu yang paling penting dipaku tesnya: menyarankan "latihan sebelum berbuka" di
hari orang tidak berpuasa bukan cuma tidak berguna, dia salah.

**`notificationAllowed` masih MENGANGGUR, dan dokumen ini pernah menyatakan sebaliknya.** Dia
menahan notifikasi 'hydration'/'meal' di jam puasa dan membiarkan 'rest'/'workout' — tapi app ini
tidak punya notifikasi hydration maupun meal sama sekali, jadi tidak ada yang memanggilnya.
Fungsinya dibiarkan hidup karena bahayanya nyata: pengingat "minum air" jam 2 siang di bulan
Ramadan. Siapa pun yang menambahkan notifikasi jenis itu **wajib** melewatinya.

**6. Hari: Ahad, bukan Minggu.** Nama hari Indonesia sudah Arab semua (Itsnain→Senin,
Tsalatsa→Selasa, Arbi'a→Rabu, Khamis→Kamis, Jumu'ah→Jumat, Sabt→Sabtu) — kecuali "Minggu", dari
Portugis *domingo* ("Hari Tuhan"). Ganti ke **Ahad** dan minggunya konsisten penuh.
`lib/format.js` `DAYN` **sudah** mulai indeks 0 = Ahad, jadi tidak ada pergeseran indeks.
Tanggal Hijriah ditampilkan dengan **offset ±2 hari yang bisa disetel** (`lib/hijri.ts`) — hisab
Umm al-Qura bisa beda sehari dari sidang isbat Kemenag, dan selisih itu menentukan hari pertama
Ramadan. **Angkanya dari `Intl`, nama bulannya dari tabel KBBI sendiri**: ICU berubah antar versi
dan sebagian mengembalikan "Rabiʻ I", sementara ejaan keislaman di sini wajib KBBI.

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

### Supabase TERPASANG — dan yang dicabut bersamanya

Dipasang 2026-08-28 setelah user memberi izin eksplisit atas titik berhenti ini.

- **Satu tabel jsonb**, bukan 12 tabel ternormalisasi. Alasannya di
  `supabase/migrations/20260828000000_user_state.sql`: klien tidak pernah bertanya per-kolom ke
  server — seluruh statistik dihitung lokal — jadi normalisasi cuma menambah mapper dua arah dan
  12 kesempatan untuk sinkron separuh jalan. RLS `user_id = auth.uid()`, keempat operasi ditulis
  eksplisit.
- **`fetchRemoteState` membedakan "TIDAK TAHU" dari "server kosong", dan itu bukan kehalusan.**
  Kalau error dibaca sebagai kosong, `decideSync` mendorong lokal ke atas server yang lebih baru
  dan membersihkan penanda kotor — kehilangan data yang sunyi. Skenario pertama yang pasti terjadi:
  **masuk akun sebelum `supabase db push` dijalankan.** Tabelnya belum ada, Postgres membalas
  42P01, dan data lokal harus utuh sepenuhnya. Dipaku `remote-state.test.ts` (13 tes; berkas itu
  tadinya nol tes), termasuk RLS yang menolak, `_ts` hilang yang tidak boleh jadi NaN, dan `active`
  yang tidak pernah ikut terkirim.
- **Keputusan sinkronisasi ada di `lib/sync.ts`**, murni dan bertes. Cabang terpentingnya:
  penanda kotor MENGALAHKAN jam server yang lebih baru — sesi yang dicatat di basement tanpa
  sinyal tidak boleh dibuang. Ambang toleransi jam 60 detik.
- **Auth: Google + magic link.** Passkey dicabut — dia terikat RP_ID, jadi tidak berlaku di
  preview deployment Vercel dan mustahil dari WebView APK.
- **Di APK, alamat kembali auth adalah DEEP LINK, bukan origin WebView** — lihat bagian di bawah.
- **`active` tidak pernah disinkronkan.** Dikosongkan di `stateForPush`, bukan di pemanggilnya.

**Migration diterapkan MANUAL.** `supabase link --project-ref ljhawtubkynxwcaaqcpo` lalu
`supabase db push`. Tidak ada workflow auto-push, dan jangan dibuat.

**Yang dicabut, dan kenapa itu bukan sekadar hapus kode mati:** UI self-host, "Sambungkan ke
server saya", "Sambungkan app HP", dasbor admin, dan web push semuanya MENAWARKAN JALAN YANG
MUSTAHIL — orang mengetuknya lalu gagal. Dua di antaranya juga melanggar aturan yang sudah
tertulis di dokumen ini: `useUI.js` memanggil `/api/push/rest-timer` (aturan #2), dan
`Workout.jsx` mem-POST `/api/activity` tiap 20 detik selama sesi.

**App jalan penuh TANPA kredensial**, dalam mode tamu. Itu jalur yang didukung, bukan mode
darurat: `supa()` mengembalikan null, boot masuk sebagai tamu, dan Pengaturan mengatakannya.
`npm run dev` tanpa `.env.local` memang harus membuka app yang berfungsi.

## Masuk dari APK — dua jalur yang sama-sama buntu, satu perbaikan

Diperbaiki 2026-08-28. Sebelum itu, **APK tidak punya satu pun jalan masuk yang berfungsi** —
bukan satu, seperti yang dulu tertulis di kepala `lib/auth.ts`.

| Jalur | Kenapa buntu |
| --- | --- |
| Google | Google MEMBLOKIR OAuth di WebView tersemat (`disallowed_useragent`, kebijakan sejak 2016). Tombolnya mengantar orang ke halaman penolakan Google. |
| Magic link | Alamat kembalinya `window.location.origin`, dan di WebView Capacitor itu `https://localhost`. Tautan dari email dibuka di Chrome, dan Chrome tidak menemukan apa pun. |

Yang kedua ketemu justru saat memperbaiki yang pertama, dan itu pelajarannya: dokumen ini
menyatakan "magic link tetap bekerja di WebView" dengan penuh percaya diri, dan yang benar adalah
**pengirimannya** bekerja, bukan **kembalinya**. Klaim tentang jalur yang tidak pernah dijalankan
di perangkat sungguhan harus diperiksa, bukan diwarisi.

**Satu perbaikan menyembuhkan keduanya:** di build native `redirectTo()` mengembalikan deep link
`id.halalpro.gym://auth-callback`, dan keduanya kembali lewat pintu yang sama. Persetujuan Google
dibuka di browser SISTEM (`@capacitor/browser`, `skipBrowserRedirect: true`) supaya user agent-nya
asli — kalau klien Supabase yang meredirect, WebView-nya yang jalan dan kita kembali ke masalah
semula.

**`AndroidManifest.xml` TIDAK punya intent-filter deep link sama sekali** sampai perbaikan ini.
`custom_url_scheme` sudah ada di `strings.xml` sejak awal, tapi tidak ada yang membacanya — jadi
deep link-nya bukan "belum dipakai", dia memang tidak berfungsi. Ini kelas kesalahan yang sama
dengan `applicationId` upstream yang bertahan berbulan-bulan: berkas di `android/` tidak dibaca
`npm run build`, tidak ditulis ulang `cap sync`, dan tidak disentuh satu tes pun.

**Tiga tempat, satu nilai**, dipaku `oauth.test.ts`: `appId` di `capacitor.config.json`,
`custom_url_scheme` di `strings.xml`, `DEEP_LINK_SCHEME` di `lib/oauth.ts`. Kalau satu menyimpang,
Android mengantar deep link ke skema yang tidak ada penerimanya dan alur masuk berhenti **tanpa
pesan apa pun**.

**Deep link adalah DATA YANG TIDAK DIPERCAYA.** `parseCallback` menolak skema DAN host yang tidak
cocok, karena pendengar `appUrlOpen` menerima setiap deep link yang dibuka ke app — dan menukar
"kode" dari URL sembarang berarti menyerahkan alur masuk ke siapa pun yang bisa membuat tautan.
`https://auth-callback?code=...` punya host yang sama dan datang dari tautan web mana pun.

**Pendengarnya dipasang di `App.jsx`, bukan di layar masuk.** Deep link tiba setelah orang keluar
dari app ke browser sistem, dan Android bisa membangunkan app di layar mana pun.

**Tidak ada callback sukses**, dan itu disengaja: pertukaran yang berhasil memicu `SIGNED_IN`, dan
store sudah mendengarkannya. Melaporkan sukses dari pendengar juga berarti `onSignedIn` jalan dua
kali — dua `pullState()` yang berlomba atas state yang sama.

**`id.halalpro.gym://auth-callback` WAJIB didaftarkan** di Supabase → Authentication → URL
Configuration → Redirect URLs. Tanpa itu Supabase mengembalikan orang ke Site URL: mereka masuk di
versi web sementara app-nya tetap tamu, tanpa pesan error di mana pun. Ada di `docs/DEPLOY.md`.

**BELUM DIUJI DI PERANGKAT.** Keputusan jalur dan pembacaan URL-nya bertes (15 tes), tapi
browser-sistem-lalu-deep-link cuma bisa dibuktikan dengan APK di HP sungguhan.

## Catatan makan, dan database makanan bawaan — pertanyaan lisensinya SUDAH DIJAWAB

`lib/nutrition.ts` + layar `/food`. Kalori dan makro, target harian, dan pemecahan
sahur/berbuka di hari puasa.

Dokumen ini dulu menulis **"TIDAK ADA database makanan bawaan"** dengan tiga sumber yang
semuanya bermasalah dan tidak satu pun dijawab, ditutup aturan: *"sebelum salah satunya dijawab,
jangan commit satu baris pun data makanan."* Pertanyaannya sekarang dijawab, diverifikasi ke
sumbernya masing-masing — bukan dari hafalan:

| Sumber | Lisensi sebenarnya | Dipakai? |
| --- | --- | --- |
| **USDA FoodData Central** | **CC0 1.0**, domain publik | **Ya** — bahan pokok |
| **Open Food Facts** — database | **ODbL 1.0** | **Ya** — turunannya ikut ODbL + atribusi |
| **Open Food Facts** — isi | **DbCL 1.0** | Ya |
| **Open Food Facts** — GAMBAR | CC BY-SA 3.0 | **TIDAK.** Share-alike menular. |
| **TKPI (Kemenkes)** | **"© Copyright 2022. All Rights Reserved"** | **TIDAK BOLEH.** |

**TKPI itu bukan lagi "belum jelas", dia "tidak boleh"** — dan bedanya penting. Selama
berbulan-bulan catatan "harus dipastikan dulu" membuat setiap sesi mengira ini pekerjaan yang
menunggu keputusan. Repositori resminya (`repository.kemkes.go.id/book/668`) tidak punya satu pun
pernyataan lisensi terbuka. Itu menyakitkan, karena isinya justru paling tepat: TKPI memang
dibuat untuk pangan Indonesia. Jangan diperiksa ulang, dan **jangan pernah di-commit.**

### Dua sumber, dua berkas, dua lisensi — dan kenapa dipisah

| Berkas | Isi | Lisensi |
| --- | --- | --- |
| `lib/food-usda.js` | 59 bahan pokok dikurasi tangan, tiap baris membawa `fdcId`-nya | CC0 |
| `lib/food-retail.js` | 758 produk ritel, **dibuat mesin** oleh `scripts/build-food-retail.mjs` | ODbL |

Dipisah karena kewajibannya beda. Mencampurnya berarti seluruh berkas harus ODbL, termasuk baris
yang sebenarnya CC0 — dan lebih buruk, tidak ada lagi cara melihat mana yang mana.

**NOL GAMBAR, dan itu diperiksa dari sumber.** Skrip pembuatnya tidak pernah meminta field
gambar; `food-db.test.ts` gagal kalau ada yang menambahkannya, dan `food-retail.test.ts` menolak
URL apa pun di dalam data. Repo ini sudah membayar satu jebakan media berlisensi (Gym visual)
dengan membangun ulang seluruh demo gerakan.

**Atribusi ODbL ada di TIGA tempat, dan ketiganya wajib**: `NOTICE.md`, Pengaturan → Tentang, dan
**lembar pencarian makanan itu sendiri**. Yang ketiga paling gampang dianggap berlebihan dan
justru paling penting — atribusi yang cuma ada di layar Tentang tidak terlihat oleh siapa pun yang
sedang memakai datanya. Dipaku `food-attribution.test.ts`.

### Katalog TIDAK PERNAH masuk ke `S`

`S.foods` disinkronkan ke Supabase. Katalog dimuat sebagai **chunk terpisah** (23 KB gzip,
`import()` dinamis), dan memilih satu baris **MENGADOPSI**-nya sekali ke `S.foods` — persis
seperti yang sudah dilakukan jalur AI. Tiga akibat yang semuanya diinginkan: `S.foods` tumbuh
hanya sebesar yang benar-benar dimakan orang; riwayat tidak ikut membusuk saat katalog dibangun
ulang; dan nol perubahan pada `MealEntry`, `macrosOf`, maupun lapisan sync.

Adopsi **tidak menimpa** yang sudah ada. Begitu diadopsi, baris itu milik pengguna, dan angka yang
dia koreksi karena beda dengan label di tangannya harus menang atas katalog.

### Pencarian: token, BUKAN skor kemiripan

Aturan yang sama dengan foto gerakan, dan alasannya berlaku lebih keras di sini: *susu* 61 kkal vs
*susu kental manis* 336 kkal, dan *tanpa gula* vs *gula* adalah kebalikan yang cuma dibedakan satu
kata. Kecocokan persis SELALU mengalahkan kecocokan sebagian, apa pun panjang namanya.

### Saringan halal, dan kelas kesalahan yang terulang di sini

OFF memuat produk beralkohol dan berbahan babi. Yang dipakai untuk membuang adalah sinyal
terstruktur (`alcohol_100g > 0`, tag kategori) plus kata kunci **pada BATAS KATA**.

Versi pertama memakai `includes()`, dan dari 25 produk yang ditandai **24 SALAH**: `rum` cocok
dengan "**rum**put laut", `gin` dengan "ori**gin**al" dan "an**gin**", `ale` dengan "k**ale**" dan
"D**ale**s", `arak` dengan "Ac**arak**i" (jamu). Satu-satunya yang benar adalah "San Miguel **Pale**
Pilsen" — dan menarik, batas kata saja juga melewatkannya, karena 'ale' bukan kata di situ. Jadi
perbaikannya dua sisi: batas kata, DAN kata yang lebih spesifik (`pilsen`, `pilsner`).

Ini kelas yang sama dengan skor kemiripan yang dilarang untuk foto gerakan, dan dia terulang
justru di berkas yang komentarnya sendiri memperingatkannya. Cacatnya **tidak terlihat dari kode
maupun dari jumlah baris hasil** — cuma dari `--report` yang benar-benar dibaca.

Saringannya konservatif dan **best-effort**: tag OFF adalah kontribusi pengguna dan sering kosong,
jadi ini bukan sertifikasi halal. Yang menentukan tetap label di kemasan, dan itu dikatakan di
`NOTICE.md`.

### Plafon datanya, diukur bukan diperkirakan

Dari 4.693 produk ber-tag Indonesia di indeks OFF, cuma **824 punya angka kalori**. Yang tanpa
kalori juga tanpa kalori di API v2 — jadi datanya memang tidak ada, bukan indeksnya yang kurang.
Dua contohnya menjelaskan kenapa: *"BENIH MENTIMUN VITANI"* (benih tanam) dan *"Hydrating mist"*
(kosmetik) ikut ber-tag Indonesia. Setelah saringan nama dan gizi, **758** yang terpakai.

Jadi 758 itu mendekati plafon data ritel Indonesia yang berlisensi terbuka, bukan hasil setengah
jalan. Kalau nanti mau menaikkannya, yang menaikkan bukan skrip ini — yang menaikkan adalah orang
yang menyumbang data ke Open Food Facts.

**NOL KALORI DITERIMA, dan itu bukan detail.** Versi pertama menolak `kcal < 1`, dan akibatnya
langsung terlihat: **Aqua tidak ada di katalog**, begitu juga air mineral lain dan teh tawar. Nol
yang dinyatakan OFF adalah DATA, bukan data yang hilang — bedanya persis yang sudah dijaga di
`fetchRemoteState` ("tidak tahu" vs "server kosong"). Dan orang yang mencari "Aqua" lalu tidak
menemukannya menyimpulkan databasenya payah, bukan menyimpulkan airnya nol kalori.

### Endpoint OFF: `search.openfoodfacts.org`, bukan `/api/v2/search`

Jangan diulang jalannya. `/api/v2/search` dengan `page_size=100` + `fields` yang memuat
`nutriments` membalas **503 berulang**; halaman yang sama membalas **200 seketika** dengan
`fields=code` saja. Jadi yang menjatuhkannya **biaya per-request, bukan rate limit** — diagnosis
pertama salah di sini, dan memperlambat jeda ke 15 detik tidak memperbaiki apa pun.
`search.openfoodfacts.org` mengembalikan **600 produk dalam 3 detik tanpa jeda**.

Bentuk responsnya beda: hasilnya di `hits` bukan `products`, `brands` **array** bukan string, dan
sintaks query harus `countries_tags:"en:indonesia"` — `countries:indonesia` mengembalikan **NOL
tanpa error**, yang terbaca seperti "Indonesia memang tidak punya data". Skripnya berhenti keras
kalau hasilnya nol, justru karena itu.

Cache di `food-cache/`, **di luar `public/`** (Vite menyalin `public/` ke `dist/` di setiap build —
repo ini sudah pernah mengirim 39 MB media yang tidak dipakai ke Vercel karena itu). Menyegarkan
data: `npm run food:retail` (tambahkan `--report` dan **baca laporannya**).

### Masakan matang tetap urusan AI

Nasi uduk, rendang, gado-gado tidak ada di kedua sumber: dia bukan produk ritel dan bukan bahan
mentah. Itu tetap dijawab perkiraan gizi AI di bawah — yang justru dipasang karena jalan buntu
lisensi ini, dan LLM tahu nasi uduk. Jalur manual tetap ada dan tetap jalan tanpa apa pun.

## Perkiraan gizi AI — kunci milik pengguna, dan kenapa itu MENJAWAB jalan buntu lisensi

Terpasang 2026-08-28. Idenya dari [fud-ai](https://github.com/apoorvdarshan/fud-ai) (MIT).

Jalan buntunya di atas: ketiga sumber database makanan punya masalah, dan yang paling menentukan
bukan lisensi — pengguna app ini mencari "nasi uduk", dan itu tidak ada di USDA. Pendekatan ini
**menghindari pertanyaannya sepenuhnya: kita tidak mendistribusikan data makanan sama sekali.**
Pengguna membawa API key sendiri, request pergi langsung dari perangkatnya ke provider
pilihannya, dan tidak ada yang lewat server kita — kita memang tidak punya server. **Nol data
yang dikirim berarti nol paparan lisensi.** Dan LLM tahu nasi uduk.

Empat berkas, dan pembagiannya bukan kosmetik:

| Berkas | Isinya | Kenapa dipisah |
| --- | --- | --- |
| `lib/ai-nutrition.ts` | prompt, parsing, validasi | MURNI, nol jaringan — di sinilah kesalahan sebenarnya bersembunyi, dan semuanya bisa dites tanpa satu request pun |
| `lib/ai-key.ts` | penyimpanan kunci | kuncinya **tidak pernah masuk `S`** |
| `lib/ai-client.ts` | dua bentuk API + timeout | satu-satunya yang menyentuh jaringan |
| `components/AiFoodSheet.jsx` | alur lima langkah | teks UI hidup di sini, bukan di `lib/` |

**Keluaran model adalah DATA, bukan perintah, dan tidak boleh dipercaya.** Divalidasi ke batas
fisik yang diperiksa **per 100 gram** — batas absolut tidak bermakna tanpa beratnya — lalu
diperiksa konsistensinya dengan faktor Atwater (4/4/9). Atwater dipakai untuk **menandai**, bukan
menghitung ulang: kalau makro dan kalori bertentangan jauh, salah satunya salah, dan pengguna
berhak tahu sebelum menyimpannya. Makanan yang cuma melaporkan kalori TIDAK ditandai — itu sah,
dan peringatan yang bising akan diabaikan.

**Peringatan `macros-mismatch` DIHITUNG ULANG saat pengguna mengedit**, lewat `macrosDisagree`
yang diekspor. Ini bukan kerapian: versi pertama membekukannya dari jawaban model, dan bug itu
terlihat langsung di layar — orang membetulkan kalorinya sampai cocok dengan makronya, dan app
tetap bilang keduanya tidak cocok. `clamped` dan `no-grams` tetap beku, karena keduanya
pernyataan tentang jawaban model dan tetap benar apa pun yang diedit.

**Angka gizi TERKUNCI di layar tinjau, dan harus dibuka sengaja.** Kunci itu yang mengatakan
"ini estimasi" tanpa satu paragraf peringatan. Kolom yang langsung bisa diedit berkata
sebaliknya — dia terasa seperti formulir yang sudah benar dan cuma perlu dikonfirmasi. Karena itu
`.field:disabled` punya gaya sendiri di `index.css`: default browser terlalu halus untuk memikul
beban itu, dan kunci yang tidak terlihat tidak mengatakan apa-apa.

**Kunci hidup di entri localStorage-nya SENDIRI (`gym_ai_key_v1`), di luar `S`.** Itu membuat
kebocoran ke Supabase mustahil secara struktur, bukan bergantung pada seseorang mengingat
saringan di `stateForPush` setiap kali jalur push berubah. Dijaga `ai-key.test.ts`, yang membaca
sumber `useStore.js` dan menuntut kata "apiKey" tidak muncul di sana sama sekali.

**localStorage tidak terenkripsi, dan itu DIKATAKAN di UI.** fud-ai menyimpan kuncinya di
Keychain/EncryptedSharedPreferences; di web tidak ada padanannya — tidak ada penyimpanan yang
bisa dibaca halaman tapi tidak bisa dibaca skrip yang jalan di halaman itu. Mengenkripsinya
dengan kunci yang juga ada di halaman cuma teater.

**Timeout 20 detik, dan itu bukan detail.** `fetch()` tidak punya timeout bawaan, dan aturan #1
sudah pernah dilanggar tepat oleh sifat itu (service worker network-first). Di sini bentuknya
lebih buruk: tombol yang berputar selamanya sementara orang menunggu untuk mencatat sarapan.
Kegagalan punya **sebab** (`auth`/`quota`/`timeout`/`offline`/`unreadable`), karena "gagal" tanpa
sebab membuat orang mencoba ulang sepuluh kali padahal yang salah kuncinya.

**Kunci Gemini di header `x-goog-api-key`, BUKAN di query string** seperti yang disarankan
dokumentasi Google. Query string berakhir di log server, di riwayat browser, dan di header
Referer. Ada tesnya, dan tesnya sudah dibuktikan bisa merah.

**Dua BENTUK API, bukan daftar merek.** fud-ai mendukung 13 provider; `openai` di sini menutup
OpenRouter, Groq, Together, Mistral, dan Ollama lokal tanpa satu baris kode tambahan, lewat
`baseUrl`. Menambah merek berarti menambah permukaan yang harus dijaga.

**Teks, bukan foto.** fud-ai memulai dari kamera. Model penglihatan jauh lebih mahal per request
— dan ini kuota milik pengguna, bukan kami — sementara mengetik "nasi uduk satu porsi" lebih
cepat daripada memfoto lalu menunggu. Foto label kemasan kasus yang sah, dan bisa ditambahkan
nanti tanpa mengubah satu pun berkas di `lib/`.

**Jalur manual tetap tombol utama.** Dia jalan tanpa kunci, tanpa jaringan, dan tanpa kuota
siapa pun. AI berdiri di sebelahnya, tidak menggantikannya.

## Aksen sebagai TEKS di tema terang — `--acc-ink`, bukan `--acc`

Lime `#94e900` di atas putih memberi **1,5:1**. WCAG AA menuntut 4,5:1 untuk teks biasa. Jadi di
tema terang, label tombol ("Log", "New"), label tab yang aktif, angka kalori hari ini, dan delta
berat badan semuanya praktis tidak terbaca sampai 2026-08-28.

Kesadarannya sudah ada di `index.css` — catatan di blok tema terang menulis "di atas paper, lime
.12 nyaris hilang — garis terang pakai tinta, bukan aksen" — tapi itu cuma diterapkan ke GARIS.
Teks tidak ikut, dan tidak ada yang mengukurnya. Kelas yang sama dengan `full body` yang tampil
Inggris di 13 bahasa: cuma terlihat kalau kamu benar-benar memakai mode yang bukan default, dan
pengembangnya memakai tema gelap (di sana lime di atas `#101c13` sudah 11:1).

**Aturannya sekarang: aksen sebagai LATAR pakai `--acc`, aksen sebagai TEKS pakai `--acc-ink`.**
Di tema gelap `--acc-ink` = `--acc`, jadi tidak ada yang berubah di sana. Di tema terang dia turun
ke `--acc-2`, dengan dua penurunan tambahan yang diukur satu-satu: lime ke `--deep` `#008140`
(karena `--acc-2` `#0a9a00` cuma 3,4:1) dan oranye ke `#a35800` (karena `--acc-2` `#c76b00` cuma
3,8:1). Terukur setelahnya: **lime 4,98 · sky 5,62 · oranye 5,31 · violet 6,04 · pink 5,33 · merah
5,38 · teal 5,39** di atas putih. Ketujuhnya lolos AA.

`--yellow-ink` sama ceritanya: `#ffcc00` di atas putih juga 1,5:1.

**`iconTint` TIDAK ikut berubah** — itu LATAR dengan glyph gelap di atasnya, dan penulisnya sudah
mengukurnya (12,6:1 untuk aksen). Mengubahnya akan merusak yang sudah benar.

**Dan lapisan KEDUA dari bug yang sama, ditemukan 2026-09-02 dengan memindai setiap simpul
teks di 7 rute x 2 tema x 7 aksen.** Nilai `--acc-ink` di atas diukur ke PUTIH, sementara setiap
permukaan `tinted` di app ini adalah wash 16-18% warna itu sendiri di atas paper (`#f3f7ef`) atau
`--surface-2` (`#e8efe1`) — keduanya lebih gelap dari putih, jadi marginnya terkikis. Di sana
KETUJUH aksen gagal, bukan cuma lime dan oranye: lime 4,03 · sky 3,94 · oranye 4,05 · violet
4,26 · pink 3,66 · merah 3,74 · teal 4,05.

**Menipiskan tint TIDAK menolong, dan itu diukur:** pada 6% pun lime cuma 4,16 dan pink 4,19.
Sebabnya bukan kedalaman tint, tapi permukaan di bawahnya. Jadi tintanya yang turun 10-15%, dan
**kasus TERBURUK yang jadi target** — yang lolos di atas tint otomatis lolos di paper dan putih.

**Tema gelap juga, dan arah koreksinya BERLAWANAN.** Klaim "di tema gelap sama dengan `--acc`:
lime di atas `#101c13` sudah 11:1" benar, tapi cuma untuk LIME di permukaan POLOS. Di atas tint
sendiri lima dari tujuh gagal (sky 3,17 · violet 3,14 · pink 3,68 · merah 3,73 · teal 4,47), dan
di sana tintanya harus NAIK ke arah putih. Satu nilai tidak bisa melayani kedua tema.

**Tiga warna semantik tidak punya tinta sama sekali.** `--yellow-ink` sudah jadi presedennya,
tapi `--green`, `--orange` dan `--red` dipakai sebagai warna teks di 15 tempat tanpa varian ink:
chip "Selesai" 2,65 · `.mchip.miss` 1,93 · "Reset semuanya" 3,55. Sekarang `--green-ink`,
`--orange-ink`, `--red-ink` di kedua tema. Dan `--yellow-ink` yang SUDAH ADA pun gagal (3,98) di
atas wash kuning 18% `.pr`, karena dia juga diukur ke putih.

**Premisnya yang salah, bukan angkanya: "17px/600, jadi ambang AA-nya 3:1 (teks besar)".** Baris
itu ada di `index.css` dan menyimpulkan "blue, purple, pink dan red tetap putih (3.5-4.1:1) —
lolos". WCAG menyebut teks besar >= 18,66px **bold** atau >= 24px; 17px/600 bukan keduanya, jadi
ambangnya 4,5 dan keempatnya gagal. **Ini kelas kesalahan yang paling mahal di sini: angka yang
BENAR dibandingkan ke ambang yang salah — dan itu lolos review justru karena angkanya tercatat.**

Dan itu bukan soal satu tombol: `--on-acc` dipakai sebagai teks di `.btn.primary`, `.chip.on`,
`.setrow.done .n`, `.prayer-cell.on` dan `.wday.today .num`. Perbaikannya menggelapkan keempat
`--acc` 7-14% (sky `#0070eb`, violet `#a34cce`, pink `#de274a`, merah `#db3329`) — BUKAN menukar
putih jadi hitam (di atas biru terbaca salah), dan BUKAN membesarkan `.num` supaya lolos ambang
teks besar (itu memindahkan masalahnya ke lima pemakaian lain). Aksen brand lime tidak disentuh.

**Nama latihan huruf kecil di Statistik, Title Case di sepuluh tempat lain.** `capWords` ada
karena satu tempat TIDAK BISA memakai CSS `.capitalize`: pemilih latihan merangkai nama dengan
bebannya, dan `capitalize` di situ menulis "60 Kg" — jebakan `.chip`/"350 Ml" yang sama. Batas
katanya setiap non-huruf, bukan cuma spasi, karena itu yang CSS lakukan.

Dijaga `contrast.test.ts`, yang menghitung rasionya dari token — bukan dari render. Kontras itu
aritmetika atas dua warna, dan tes render di lingkungan ini justru tidak bisa dipercaya:
pengukuran pertama di browser melaporkan 1,26:1 untuk teks yang baik-baik saja, karena transisi
CSS `background` **MACET di `currentTime` 0** selama pane tidak meng-komposit frame. Kalau nanti
mengaudit warna lewat browser, matikan transisi dulu (`* { transition: none !important }`) —
tanpa itu setiap elemen ber-transisi melaporkan warna LAMA-nya.

Satu pemakaian sempat luput dari penukaran mekanis: `bwDeltaColor()` di `sheets.jsx`
mengembalikan `'var(--acc)'` sebagai string, jadi pencarian teks `color: 'var(--acc)'` tidak
menemukannya. Yang lewat variabel selalu luput.

## Baris daftar adalah TOMBOL, dan `--label-3` sudah dinaikkan — dua aturan a11y

**Setiap baris `.item` yang bisa diketuk harus `<button>`, bukan `<div>`.** CSS-nya sudah ditulis
untuk itu sejak awal (`text-align:left` dan `width:100%` cuma berarti apa-apa pada tombol), tapi
JSX-nya memakai `<div>` di **18 tempat** — jadi setiap baris daftar di app ini tidak masuk urutan
tab, tidak merespons Enter/Space, dan tidak disebut sebagai kontrol oleh pembaca layar. Diperbaiki
2026-09-01, dan diverifikasi dengan Tab sungguhan: cincin lime 2px, `offset` 2px, radius tetap 16px.

Dua akibat yang harus dijaga:

- **Baris yang punya DUA aksi bukan satu tombol.** Baris latihan di Library membuka detail DAN
  punya tombol "Plan". `<button>` di dalam `<button>` itu HTML yang tidak sah. Bentuknya: barisnya
  wadah `<div className="item">`, aksi utamanya `<button className="imain">` yang mengambil
  thumbnail PLUS teks — bukan cuma teks, karena target ketuk yang menyusut adalah memperbaiki
  keyboard sambil memperburuk jempol. Terukur 229×50 px = 67% lebar baris di 375px.
- **Baris TANPA `onClick` sendiri tetap `<div>`.** Baris "Logged today" di `Food.jsx` cuma memuat
  tombol hapus; dia bukan kontrol, dan memaksanya jadi tombol menghasilkan nesting yang tidak sah.

**Checkbox set adalah kontrol yang paling sering diketuk di app ini, dan dia TIDAK PUNYA NAMA
sampai 2026-09-02.** `Check` di `ui.jsx` merender `<button role="checkbox">` yang isinya cuma
`<Icon>` ber-`aria-hidden` — benar untuk ikon dekoratif, tapi akibatnya tombolnya tidak punya
nama sama sekali. Diukur di pohon aksesibilitas hidup: layar latihan menyebut **"checkbox" empat
kali berturut-turut**, tidak ada satu pun yang bisa dibedakan. Tetangganya di baris yang sama
(`Start set`, `Remove set`) sudah ber-`aria-label` sejak awal, jadi ini kelalaian satu komponen,
bukan kebijakan — dan orang yang memakai pembaca layar justru orang yang tidak bisa melihat nomor
set di kolom kiri. Sekarang `Set 1` … `Set 4`, dan `Set warm-up 1` untuk baris pemanasan, dengan
penomoran yang tetap restart per fase. Keadaannya tetap dibawa `aria-checked`, jadi namanya cukup
menyebut BARIS MANA.

**Aturan itu ternyata cuma berlaku untuk `.item`, dan LIMA kontrol lain lolos.** Penjaganya
mencari `className="item"` sebagai literal, jadi dia melewatkan (1) kelas lain sama sekali, dan
(2) baris `.item` yang className-nya dirangkai. Terukur di DOM hidup: **sembilan elemen
bisa-diketuk di Beranda, nol yang masuk urutan tab** — jadi satu-satunya jalan memulai latihan
lewat keyboard adalah tab bar di bawah, sementara aksi utama layarnya sendiri tidak bisa
dijangkau.

| Berkas | Kelas | Yang dilakukannya |
| --- | --- | --- |
| `Home.jsx` | `.today-row` | **AKSI UTAMA app ini** — mulai / lanjutkan latihan hari ini |
| `Home.jsx` | `.wday` | tujuh sel hari, membuka lembar penjadwalan |
| `Home.jsx` | `.card tappable` | kartu rentetan, membuka kalender |
| `Stats.jsx` | `.mrow` | baris latihan per otot |
| `RoutineEdit.jsx` | `'item' + …` | pelanggaran ke-19 aturan `.item`, disembunyikan satu penggabungan string |

Dan seperti `.item`, **CSS-nya sudah lebih dulu ditulis untuk tombol**: `.wday` membawa
`background:none;border:none`, `.today-row` membawa `width:100%;text-align:left`. Baris
`RoutineEdit` memuat empat tombol, jadi dia dapat pola wadah yang sama (`.imain`, terukur
249×50 px).

**Reset CSS-nya SEMPIT dengan sengaja, dan batasnya diukur di layar.** `<button>` tidak mewarisi
`font-family` maupun `color`, dan anak-anak keempat kelas itu cuma menyetel UKURAN — jadi
`font:inherit` wajib. Tapi versi pertama juga menambahkan `display:block` dan `background:none`,
dan keduanya merusak: `button.card` (0,1,1) mengalahkan `.row` dan `.card`, jadi chevron kartu
Makanan turun ke baris sendiri DAN kartunya kehilangan permukaannya. Aturan itu sekarang tidak
pernah menyentuh `display` maupun `background`.

Pengecualiannya **per-baris beserta alasannya**, pola `HAND_REJECTS` yang sama, dan sekarang
tinggal DUA: latar lembar (`.mback` — padanannya Escape, bukan tab stop) dan gambar demo (target
jempol tambahan; kontrol keyboard-nya tombol `.gifhint` di dalamnya). Kuncinya penanda HARFIAH
dari tag, bukan nama kelas: `Media.jsx` menulis `className={cls('')}`, jadi nama kelas yang
dirender tidak pernah muncul di sumbernya.

**Yang ketiga sudah dihapus, dan itu memang harus dihapus bukan diperbarui.** Heatmap 12 bulan
dulu di daftar itu dengan alasan "perbaikan sebenarnya roving tabindex, dan itu belum
dikerjakan" — dan **pengecualian yang alasannya "belum dikerjakan" adalah utang, bukan
keputusan.** Roving tabindex-nya sekarang terpasang, jadi barisnya hilang dari daftar.

Modelnya sengaja **KRONOLOGIS, bukan spasial**, dan tiga keputusan di dalamnya saling menopang:

- **Cuma hari yang punya sesi yang bisa difokus**, jadi setiap yang bisa difokus BISA DITEKAN.
  Sel kosong tetap `<div>` tanpa handler — tombol yang tidak melakukan apa-apa lebih buruk
  daripada bukan tombol. Terukur di app hidup: 3 tombol, 368 div, **tepat satu tab stop**.
- **Panah maju/mundur di antara hari-hari itu dalam urutan waktu**, Home/End ke ujung, dan di
  ujung dia BERHENTI — melingkar di daftar linier membuat orang kehilangan tempat.
- **`role="grid"` sengaja TIDAK dipakai.** Pola grid ARIA menuntut Kiri/Kanan bergerak di dalam
  satu baris dan Atas/Bawah antar baris, sementara DOM di sini kolom-mayor: satu `.hm-col` adalah
  satu PEKAN, dirender vertikal. Jadi mengaku grid berarti memilih salah satu dari dua kerugian —
  tombol panah yang terasa terbalik dari yang dilihat mata, atau kontrak ARIA yang dilanggar.
  Nama per-sel ("Kam, 13 Agu 2026 · 1 sesi · 30 mnt · 5.000 kg") membawa lebih banyak informasi
  daripada "baris 3 kolom 12", jadi tidak ada yang hilang dengan tidak mengaku.

Nama itu sekaligus bukti tiga perbaikan lain menyatu: tanggal terlokalisasi (bukan ISO mentah
seperti tooltip lama), bentuk **tunggal** "1 sesi", dan satuan **"mnt"** yang sama dengan kartu
salat. Dijaga `Heatmap.test.jsx` (10 tes), dan `button.hm-c` mendapat reset tombol yang
**tidak menyentuh `background`** — seluruh tangga `l1..l4` yang menyetelnya, dan menimpanya akan
menghapus warna heatmap-nya. Pelajaran yang sudah dibayar sekali di `button.card`.

**Bingkai demo kedua dulu cuma bisa dilihat dengan MENGETUK gambarnya.** Jadi separuh informasi
demo — posisi akhir gerakan — tidak pernah sampai ke pemakai keyboard. Petunjuk di sudut sudah
mengatakan keadaannya dan sudah berbagi CSS dengan tombol `.giftoggle`, jadi menjadikannya tombol
nol baris gaya baru. Handler gambarnya DIBIARKAN: target sebesar gambar itu yang benar untuk
jempol, dan aturan "jangan perbaiki keyboard dengan memperburuk jempol" sudah tertulis di atas.

**Dan kelasnya ternyata TIGA komponen lagi, bukan cuma `Check`.** Bentuknya sama persis:
teksnya SUDAH ADA di layar, tapi tidak ada yang menautkannya ke kontrolnya.

| Komponen | Isinya | Yang didengar pembaca layar |
| --- | --- | --- |
| `Switch` | cuma `<span class="knob">` | **"switch" 5x** di Pengaturan, dua di antaranya Mode Ramadan dan Puasa sunah |
| `Stepper` | `.stp-l` sudah merender "Set"/"Reps" | **"edit text, blank" 5x** di lembar konfigurasi latihan |
| baris set | header `BEBAN (KG)`/`REPS`/`RIR` di baris terpisah | **"edit text, blank" 3x per baris** |

Sakelar Mode Ramadan yang tidak bisa dibedakan itu bukan ketidaknyamanan: menyalakan yang salah
berarti beban ditahan sebulan di hari orang tidak berpuasa.

**Semuanya ditautkan lewat `aria-labelledby` ke teks yang SUDAH dirender, bukan `aria-label` yang
mengetikkan ulang.** Dua alasannya, dan keduanya berlaku umum: nol string duplikat untuk
diterjemahkan ke 13 bahasa, dan namanya ikut berubah sendiri kalau labelnya diedit. `Row`
menyediakan id judulnya lewat context supaya 13 pemanggil `<Switch>` tidak perlu disentuh sama
sekali. Baris set menunjuk DUA id — nomor set dan header kolomnya — jadi ARIA yang merangkainya
jadi "1 Beban (kg)", bukan penggabungan manual yang lolos dari penjaga terjemahan.

**Yang menemukan tiga dari empat itu penjaganya, bukan mata saya.** `views/smoke.test.jsx`
sekarang me-mount setiap rute dan menuntut NOL kontrol tanpa nama — tes RENDER, bukan pemindai
sumber, karena mekanisme namanya berbeda-beda (`aria-label`, dua bentuk `aria-labelledby`,
placeholder). Pemindai sumber harus tahu ketiganya; render cuma perlu bertanya "apa namanya".
Dan mekanismenya ikut dipaku: kalau seseorang "memperbaikinya" dengan mengetikkan ulang label ke
13 `aria-label`, penjaga namanya tetap hijau — jadi ada tes terpisah yang menuntut sakelar di
dalam `Row` memakai `aria-labelledby`.

**LEMBAR ADALAH DIALOG MODAL, dan sampai 2026-09-02 dia cuma modal secara visual.** Escape sudah
bekerja sejak awal — yang tidak ada adalah tiga hal lain, dan semuanya standar: `role="dialog"` +
`aria-modal`, fokus yang MASUK, dan fokus yang KEMBALI. Diukur di app hidup: membuka lembar
meninggalkan fokus pada PEMICUNYA di belakang overlay, dan **51 elemen di belakang overlay masih
bisa di-Tab** — pemakai keyboard berjalan ke kontrol yang tertutup dan tidak bisa dilihatnya.

Empat keputusan di dalamnya yang tidak boleh dibalik tanpa membaca alasannya:

- **Fokus jatuh ke PANEL, bukan ke kontrol pertamanya.** Panel yang difokus membuat pembaca layar
  menyebut "dialog" lalu membaca dari judulnya; melompat ke tombol pertama melewati judul itu.
- **Panel TIDAK merampas fokus dari kolom yang meng-`autoFocus` sendiri** (`panel.contains(
  document.activeElement)`). Dua lembar melakukannya — `AiFoodSheet` dan `FoodDbSheet` — dan
  merampasnya berarti orang mengetuk "Database" lalu mengetik ke tempat yang salah.
- **Fokus kembali ke pemicunya saat ditutup**, dan pemicu yang sudah hilang dari dokumen tidak
  boleh melempar: "Hapus latihan ini" adalah persis bentuk itu — baris yang membuka lembar lalu
  dihapus oleh lembar itu sendiri.
- **`aria-modal` cuma di lembar TERATAS.** Dua dialog yang sama-sama mengaku modal adalah
  pernyataan yang saling bertentangan, dan yang di bawah memang tidak modal lagi.

Perangkap Tab tidak butuh `isTop`: peristiwanya berasal dari dalam panel teratas, dan panel di
bawahnya bukan leluhurnya. Dijaga `Modals.focus.test.jsx` (9 tes), termasuk jalur
`kind: 'center'` yang render-nya BERBEDA — dan itu jalur `confirmSheet`, yang menghapus data.

**Satu lagi dari sapuan yang sama, dan kelasnya beda: SCRIM.** Pil "Perkecil"/"posisi awal" di
atas gambar demo memakai `rgba(0,0,0,.45)` dengan teks putih. Di bawahnya bukan permukaan yang
bisa diukur — di bawahnya GAMBAR SEMBARANG, jadi yang bisa diukur cuma batas terburuknya: di atas
area putih, teks putih cuma **3,35:1**. Dan itu bukan kasus sudut sejak ilustrasi RepDB jadi
sumber demo utama, karena latar ilustrasinya memang hampir putih. Naik ke `.55` memberi 4,76 di
atas putih dan 9,8 di atas foto medium.

**16 `aria-label` ditulis langsung dalam bahasa Inggris**, jadi nama kontrolnya Inggris di 13
bahasa. Keempat checker tidak bisa melihatnya karena mereka bekerja dari `t()`, dan
`no-untranslated-id.test.ts` mencari literal INDONESIA — literal Inggris justru luput darinya.
Yang paling terasa: stepper "Decrease"/"Increase" dipakai untuk beban, reps, kalori, dan target
berat, jadi pembaca layar menyebut "Increase" tiap kali beban ditambah. Sembilan kunci baru;
`minus 0.1`/`plus 0.1` sengaja dipetakan ke `Decrease`/`Increase` karena langkah 0,1 itu detail
implementasi, bukan hal yang perlu diucapkan.

Dijaga `list-rows.test.ts`, yang memindai SELURUH `.jsx`. Daftar "elemen interaktif"-nya memuat
KOMPONEN berhuruf besar (`<Button>`, `<Switch>`, `<TextField>`, …), bukan cuma tag HTML — karena
pemeriksaan yang cuma mencari `<button` huruf kecil justru yang melewatkan pelanggaran pertama.

**`--label-3` sudah dinaikkan dan JANGAN diturunkan lagi.** Pada `.40` dia memberi 3,49:1 di tema
gelap dan **2,65:1 di tema terang** — di bawah 4,5:1 yang WCAG AA tuntut untuk teks biasa. Dia
dipakai 24 kali, hampir semuanya teks, termasuk `.field::placeholder`: jadi setiap kolom pencarian
di app ini punya placeholder yang tidak lolos. Sekarang `.52` (gelap) dan `.60` (terang), terukur
4,67–5,12 di ketiga permukaan.

Bentuknya identik dengan cerita `--acc-ink` di atas: kesadarannya ada di komentar, pengukurannya
tidak. `contrast.test.ts` dulu cuma memaku AKSEN — sekarang seluruh tangga label (`label`,
`label-2`, `label-3` × 3 permukaan × 2 tema). **Tes kontras yang cuma menutup satu keluarga token
memberi rasa aman yang lebih luas daripada cakupannya.**

Satu lagi dari kelas yang sama: `.chip` meng-`capitalize` isinya, jadi "350 ml" tampil
**"350 Ml"**. Kapital di satuan SI membawa arti — mm vs Mm itu 10⁶ kali. Ditutup `.chip.unit`,
dengan tes yang juga memaku `.chip` dasar MASIH meng-capitalize; kalau tidak, penjaganya berhenti
menjaga apa pun tanpa ada yang tahu.

## 320dp dan 360dp bukan kasus tepi — dan dua fitur sempat hilang di sana

Pasar sasaran app ini Android Indonesia, dan **360dp adalah lebar paling umum** di sana; 320dp
masih hidup di perangkat murah. Dua cacat ditemukan dengan benar-benar menyetel viewport ke lebar
itu, dan keduanya **SUNYI**: nol error, nol tes merah, nilai yang benar di DOM.

**1. Tombol "AI" di layar Makanan TIDAK BISA DIJANGKAU di 360px.** Baris tiga aksi ("Catat
makanan" / "Database" / "AI") sebagai `.row` biasa butuh 370px — terukur. Dan `overflow-x` body
tidak menggeser, jadi tombolnya bukan "sedikit terpotong", dia hilang. Seluruh jalur perkiraan
gizi AI ikut hilang bersamanya.

Sekarang `.actrow`: **sempit dulu**, bentuk bakunya dua baris (utama penuh di atas, dua sekunder
berbagi baris kedua), dan baris tunggal cuma di `@media (min-width:400px)`. Ambangnya 400 bukan
370 karena label ini diterjemahkan ke 13 bahasa — "Catat makanan" jauh lebih pendek dari "Essen
protokollieren".

Satu jebakan di sini yang cuma terlihat di layar: **`flex-basis:auto` memaksa satu tombol per
baris**, karena `.btn` membawa `width:100%` dan basis `auto` resolve ke lebar baris penuh.
Terukur: ketiganya 398px di viewport 430px, tiga baris di layar yang jelas cukup untuk satu.
`flex:0 1 auto` terbaca sangat wajar, dan itu sebabnya penjaganya menjaga PASANGANNYA —
`auto` boleh justru ketika `width:auto` ikut menetralkan `.btn`.

**2. Baris set menampilkan "1" untuk nilai 10.** `.stp .num` membawa `min-width:0`, jadi di baris
tiga kolom (mode effort menyala) enam tombol -/+ memakan hampir semuanya: kolom reps tersisa
**8px**, kolom RIR **6px**. `input.value` tetap `"10"` — jadi tidak ada yang melempar dan tidak
ada tes DOM yang bisa melihatnya. Satu-satunya jejaknya `scrollWidth` 15px lawan lebar render
8px.

Untuk app latihan itu cacat yang mahal: orang membaca beban dan reps dari baris ini di sela set,
dan **angka yang salah dibaca berarti set yang salah dikerjakan.**

Alokasinya diukur, bukan dibagi rata — beban memuat DESIMAL, effort satu karakter:

| | flex | hasil di 320px |
| --- | --- | --- |
| beban | 1.5 | 39px — cukup "127.5" |
| reps | 1 | 22px |
| effort | .7 | 22px |

Tombolnya menyusut 23 → 20px dengan sengaja: keduanya sudah di bawah ambang target-ketuk 44px
pada lebar ini, sementara **angka yang tidak terbaca lebih buruk dari yang sulit diketuk**, dan
barisnya masih bisa diisi dengan mengetik. Kasus DUA kolom ketemu SETELAH yang tiga kolom
diperbaiki — mematikan effort membuat tombolnya kembali 32px dan beban lima karakter terpotong
lagi; tombolnya jadi 26px di sana.

Dijaga `narrow-layout.test.ts`, dan penjaganya **membaca CSS, bukan merender**: jsdom tidak punya
layout, jadi `getBoundingClientRect()` nol, `scrollWidth` nol, dan media query tidak pernah
cocok. Tes render di sini akan hijau apa pun yang terjadi — bentuk penjaga yang paling berbahaya.
Angka-angkanya datang dari pengukuran di browser sungguhan dan tercatat di komentar `index.css`.

## Ekspor yang tidak pernah dipanggil — dan yang PALING mahal bukan kode matinya

Dijaga `idle-exports.test.ts`, dan bentuknya `ID_KEEPS_ENGLISH` yang sama: yang menganggur harus
**sama dengan** daftar eksplisit, dan pemeriksaannya dua arah.

Kelasnya sudah tiga kali di sini, dan yang mahal bukan baris matinya — yang mahal adalah **fungsi
yang dokumentasinya menjanjikan pemakaian yang tidak pernah ada**. Dia lolos review justru karena
ada tesnya, dan setiap sesi berikutnya membacanya sebagai fitur yang sudah jalan:

| Fungsi | Klaimnya | Kenyataannya |
| --- | --- | --- |
| `trainingWindows` | jendela latihan hari puasa | nol pemanggil sampai 2026-08-28 |
| `isRamadanByHisab` | "dipakai kartu Home untuk memberi konteks" | nol pemanggil sampai 2026-09-02 |
| `prayerClash` | "dipakai saat merencanakan" | nol pemanggil, **masih** |

`isRamadanByHisab` sekarang benar-benar dipakai, dan itu menutup lubang yang nyata di antara dua
aturan yang sama-sama benar: mode Ramadan ADA karena mesin progresi akan meregresi beban, dan
sakelarnya MANUAL karena awal Ramadan ditetapkan sidang isbat. Di antara keduanya, orang yang
tidak tahu setelan itu ada berpuasa sebulan sementara bebannya diregresi. Kartu salat sekarang
mengatakannya — **isyarat, bukan gerbang**, dan kata-katanya tidak menyatakan "ini Ramadan"
sebagai fakta karena hisab bisa beda sehari dari isbat.

Kelasnya `.prayer-hint`, BUKAN `.prayer-train`. Keduanya baris kecil di bawah jadwal tapi artinya
berbeda, dan memakai satu kelas membuat tes tidak bisa membedakannya — terbukti langsung: tiga tes
`.prayer-train` yang sudah ada jadi merah, karena tanggal yang mereka pakai (4 Maret 2026) memang
di dalam Ramadan 1447 menurut hisab.

`prayerClash` TIDAK disambungkan, dan itu keputusan bukan kelalaian: dia butuh perkiraan DURASI
sesi, dan repo ini belum punya satu pun — `fmtDur` cuma memformat yang sudah lewat. Dari mana
angkanya datang (median riwayat rutin itu? jumlah set × waktu istirahat?) adalah keputusan yang
belum diambil.

**Dua berkas DIHAPUS, dan yang satu bukan sekadar mati.** `lib/audit.js` + tesnya (209 baris)
merender log aktivitas admin dari `GET /api/admin/audit` — server yang dihapus di Fase 0, dan
`Admin.jsx` yang ikut pergi bersamanya (`Settings.jsx` sendiri mencatat itu). Modulnya juga
**sengaja Inggris-saja**, jadi keempat checker lokalisasi pun tidak melihatnya. Tesnya hijau
selamanya untuk fitur yang tidak bisa jalan.

**Dan satu yang TIDAK dihapus meski terlihat mati: Tailwind + shadcn.** `components/ui/button.tsx`
satu-satunya komponen shadcn dan tidak ada layar yang memakainya; nol utility Tailwind di seluruh
JSX. Tapi `styles/tailwind.css` menjelaskan bahwa itu **bibit Fase 3** (migrasi UI per layar),
lengkap dengan alasan preflight sengaja dimatikan. Jadi ini bukan sisa scaffold, ini rencana yang
belum jalan — dan harganya terukur: **plugin Tailwind memakan 89% waktu build** (15,2 dari 17
detik) untuk utility yang belum dipakai satu layar pun. Apakah Fase 3 diteruskan atau dicabut
adalah keputusan produk, bukan keputusan yang boleh diambil sambil lalu.

## Pack instruksi: `pt` mendapat INGGRIS padahal pack Portugis ada di repo

Sepuluh pack instruksi, masing-masing menutupi **seluruh 1.324 latihan**. Tiga bahasa tidak
punya: `de`, `id`, dan `pt`. Untuk dua yang pertama itu memang belum ada terjemahannya. Untuk
`pt` tidak — `pt-BR` ada, dan untuk teks PANJANG seperti langkah gerakan jarak Brasil-Portugal
jauh lebih kecil daripada jarak Portugis-Inggris. Yang hilang bukan packnya, tapi fallback-nya.

`INSTR_FALLBACK = { pt: 'pt-BR' }`, dan cuma INSTRUKSI yang meminjam — bukan nama latihan, yang
pendek, sudah bilingual dengan Inggris di kurung, dan perbedaan istilahnya jauh lebih terasa
per-baris.

**Keputusan "pack mana" tadinya tersebar di EMPAT tempat**, dan itu yang membuat perbaikannya
setengah jalan pada percobaan pertama:

| Tempat | Gerbangnya |
| --- | --- |
| `setLang` di `i18n.js` | memuat packnya |
| `_setLangState` di `i18n-core.js` | **membuang** yang baru dimuat |
| `sheets.jsx` | label "· instruksi Inggris" di detail latihan |
| `Settings.jsx` | subtitle di pemilih bahasa |

Salinan KEDUA yang paling mahal: browser benar-benar mengunduh `instr/pt-BR.js` — terlihat di
tab jaringan — lalu `_setLangState` menyetel `instr` ke `null` karena dia mengulang
`INSTR_LANGS.includes(lang)` sendiri. Labelnya sudah benar, isinya masih Inggris, **nol error di
mana pun.** Cuma terlihat dengan membaca layar.

Sekarang semuanya lewat `instrPackFor()`, dan `lang-packs.test.ts` memaku `INSTR_LANGS.includes(`
cuma boleh ada di dalam fungsi itu. Berkas yang sama juga memaku ketiga daftar bahasa cocok
dengan berkas di disk — selisihnya sunyi ke dua arah: pack tak terdaftar tidak pernah dimuat,
pack terdaftar tanpa berkas jatuh ke Inggris tanpa pesan. Keduanya lolos `check:locales` (dia
membandingkan pack lawan pack) dan `check:locale-keys` (dia cuma melihat kunci UI), karena
instruksi latihan tidak lewat `t()` sama sekali.

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

## Identitas paket Android — SATU-SATUNYA yang tidak bisa diperbaiki belakangan

`applicationId` = **`id.halalpro.gym`**. Jangan pernah diubah setelah APK pertama dibagikan.

Begitu satu APK terpasang, applicationId-nya **adalah** identitas app itu di perangkat.
Menggantinya kemudian berarti Android melihatnya sebagai app yang berbeda: pengguna harus
meng-uninstall yang lama, dan seluruh datanya ikut terhapus. Tidak ada jalan migrasi.

Folder `android/` sempat masih memakai `ch.duartesantos.opengym` milik upstream sampai
2026-08-28, padahal `capacitor.config.json` sudah di-rebrand sejak Fase 0. Tidak ada yang
menangkapnya: `cap sync` tidak menulis ulang identitas paket yang sudah ada, `npm run build`
tidak membacanya, dan tidak ada satu tes pun menyentuh folder itu.

Sekarang dijaga `src/lib/android-identity.test.js` — namespace, applicationId, nama paket Java
(termasuk direktorinya, karena Java mewajibkannya cocok), nama app, dan `custom_url_scheme`
semuanya dipaku ke `capacitor.config.json`.

**Keystore Android juga tidak bisa dirotasi.** Berbeda dari kredensial lain: kunci yang bocor
tidak bisa diganti tanpa memaksa setiap pengguna uninstall. `.gitignore` menutup `*.jks`,
`*.keystore`, `key.properties`. Cara menyiapkannya di `docs/DEPLOY.md`.

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
cd frontend && npm test          # vitest — JANGAN dibiarkan merah
```

`npm run verify` menjalankan berurutan: `typecheck` → `check:names` → `check:locales` →
`check:locale-keys` → `test` → **`test:utc`** → `build`. Pakai ini, jangan mengingat urutannya
sendiri.

**`test:utc` menjalankan suite KEDUA KALINYA di zona waktu UTC**, dan itu ada karena gate
lokal hijau berhari-hari sementara CI merah di SETIAP commit tanpa ada yang tahu. Mesin
pengembang di Asia/Jakarta, runner GitHub di UTC. Yang ketahuan bukan tes cerewet: `adhan`
membaca hari kalender dari zona RUNTIME, jadi perangkat yang tidak sezona dengan kota
terpilih mendapat jadwal hari yang salah. Dijalankan lewat `scripts/test-utc.mjs` dan bukan
`TZ=UTC vitest run`, karena bentuk POSIX itu gagal di cmd.exe — dan `verify` justru perintah
yang paling sering dijalankan di mesin Windows.

**CI punya DUA job, dan keduanya menjawab pertanyaan yang berbeda.** `verify` menjawab "apakah
kodenya benar". `deploy-build` menjawab "apakah perintah yang dipakai PRODUKSI masih jalan" — dan
itu tidak pernah dijawab siapa pun sampai Vercel gagal sementara CI hijau. Dia membaca
`buildCommand` **dari `vercel.json`**, bukan menyalinnya, lalu memeriksa `index.html` dan `sw.js`
benar-benar ada di keluarannya. `paths` workflow juga sekarang memuat `vercel.json` dan
`package.json` akar; sebelumnya perubahan di sana tidak memicu CI sama sekali.

**Job `verify` menjalankan `npm run verify`, satu langkah, bukan daftar step.** Itu disengaja: versi lama
menuliskan setiap checker terpisah, dan itulah yang membuat CI dan gate lokal melenceng tanpa ada
yang memberi tahu — CI masih menjalankan job `mcp/` untuk direktori yang dihapus di Fase 0, jadi
**gagal di setiap push**, sementara `check:names` dan `check:locale-keys` tidak pernah jalan di
sana sama sekali. Kalau gate-nya berubah, dia berubah di satu tempat.

## Versi Node dipin di DUA package.json, dan itu bukan duplikasi

Vite 8 menuntut Node `^20.19.0 || >=22.12.0`. Repo ini tidak punya `engines` sama sekali sampai
2026-08-28, jadi Vercel memakai versi default-nya sendiri — dan di Node 18 build gagal, sementara
CI tetap hijau karena CI menyebut `node-version: 22` secara eksplisit. Asimetri "CI hijau, Vercel
merah" itu yang bikin kelas bug ini mahal.

`package.json` di **akar repo** ada HANYA untuk baris `engines`: Vercel membacanya dari Root
Directory, dan `vercel.json` memakai `cd frontend`, jadi Root Directory-nya akar. Berkas itu tidak
punya dependensi, tidak dipakai membangun apa pun, dan tidak boleh diberi dependensi.
`frontend/package.json` juga menyebutnya, untuk kasus Root Directory disetel ke `frontend`.

`frontend/.npmrc` menyalakan `engine-strict=true`, supaya Node yang salah gagal dengan
`EBADENGINE` yang menyebut versi yang dibutuhkan dan yang terpasang — bukan gagal jauh di dalam
Vite. Sudah dibuktikan menyala dengan memalsukan `engines` ke `>=99`.

**`frontend/.npmrc` menyalakan `ignore-scripts=true`, dan tempatnya yang menentukan.**
`@capacitor/assets` menarik `sharp@0.32.6` yang punya install script native; GitHub Actions punya
toolchain untuk itu, image build Vercel belum tentu. Perbaikan lewat `npm ci --ignore-scripts` di
`vercel.json` HANYA berlaku kalau Vercel membaca `vercel.json` — dan dia tidak membacanya kalau
**Root Directory** project disetel ke `frontend`. `.npmrc` berlaku di kedua konfigurasi.

**Root Directory Vercel harus AKAR REPO.** Kalau disetel `frontend`, `vercel.json` di akar tidak
pernah dibaca: build tetap jalan (Vercel mendeteksi Vite) tapi seluruh `headers` HILANG tanpa
suara — termasuk `Cache-Control: max-age=0` untuk `sw.js`, dan service worker yang di-cache
berarti orang terjebak di versi lama app selamanya. Untuk berjaga, `frontend/vercel.json` ada dan
membawa **hanya headers**; keduanya dipaku identik oleh `vercel-headers.test.ts`. Perintah build
sengaja tidak diduplikasi. Kedua skenario dibangun di job CI `deploy-build`.

## Empat checker, dan pertanyaan berbeda yang dijawab masing-masing

Ini bukan redundansi. Masing-masing menutup celah yang tidak terlihat oleh yang lain, dan
semuanya lahir dari bug yang benar-benar lolos ke layar.

| Perintah | Pertanyaan | Bug yang melahirkannya |
| --- | --- | --- |
| `npm run typecheck` | Apakah `.ts` konsisten? | — |
| `npm run check:names` | Apakah setiap nama yang dipakai benar-benar ada? | **Layar Pengaturan MATI TOTAL** — `CITIES` dipakai tanpa pernah diimpor. Dan `onExercise` di Stats dipanggil tanpa pernah dikirim: ketukan pertama melempar ReferenceError. |
| `npm run check:locales` | Apakah 13 pack membawa kunci yang sama? | — |
| `npm run check:locale-keys` | Apakah setiap kunci terjemahan masih menunjuk teks yang ada, dan setiap nilai katalog punya terjemahan? | `full body` tampil Inggris di **13 bahasa** selama berbulan-bulan. |

**Katalog 1.324 latihan dipaku `catalogue-integrity.test.js`.** Katalognya di-generate, dan berkas
yang di-generate paling mudah rusak diam-diam: satu field yang lupa disalin tidak menggagalkan
build, typecheck, maupun tes mana pun — yang terjadi `undefined` yang mengalir ke layar. Dipaku:
1.324 tepat, id unik dan berbentuk empat digit, kelima field yang dibaca UI ada di setiap catatan,
`sm` selalu array, setiap latihan punya instruksi Inggris, dan himpunan bagian tubuh (10) dan alat
(28) tetap tertutup — nilai baru yang masuk diam-diam berarti chip filter yang tidak diterjemahkan.

Berkas itu juga **memeriksa angka di dokumentasi ke kenyataan**: komentar `exercise-media.ts`
sempat menulis "329 dari 1.324 (24,8%)" sementara petanya berisi 340 (25,7%) — basi 11 latihan,
dan tidak ada yang bisa melihatnya. Repo ini berdiri di atas dokumentasi yang padat, dan itu cuma
berguna kalau angkanya benar.

**Dan ada lapis kelima yang bukan checker: `views/smoke.test.jsx`.** Dia me-mount SETIAP rute,
dua kali — keadaan pemasangan baru (`DEF` apa adanya) dan keadaan terisi — dan menuntut nol
lemparan, nol `console.error`, dan bukan layar kosong. Alasannya: `check:names` cuma bisa melihat
NAMA. Dia tidak bisa melihat `S.bodyweight[0].w` atas array kosong, dan itu tetap TypeError di
layar orang. Dibuktikan: menyisipkan baris itu ke Stats membuat `check:names` DAN `typecheck`
tetap hijau, sementara smoke test merah. Keadaan pemasangan baru disebut lebih dulu dengan
sengaja — itu yang dilihat setiap pengguna baru, dan yang paling jarang dijalankan saat
mengembangkan karena mesin pengembang selalu punya data. Ada juga penjaga yang menuntut setiap
rute baru di `App.jsx` masuk ke daftarnya, dibaca dari sumber.

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

**Keempat checker itu semuanya bekerja DARI `t()`, dan di situ titik butanya.** Teks yang tidak
pernah mengaku sebagai teks yang perlu diterjemahkan tidak terlihat oleh satu pun dari mereka.
`PrayerCard.jsx` menuliskan hitungan mundur sebagai `` `${h} jam ${m} mnt` `` langsung di
template — jadi UI Mandarin menampilkan **"Magrib 1 jam 53 mnt"**, dan begitu juga kedua belas
bahasa lain. Ditemukan dengan mengganti bahasa app ke Mandarin dan MEMBACA layarnya. Ditutup
`no-untranslated-id.test.ts`, dipatok NOL: dia membuang komentar (seluruh dokumentasi di sini
Indonesia) lalu memindai literal string di `components/`, `views/`, `store/`. `lib/` sengaja di
luar cakupan — dua isi Indonesia di sana keduanya sah dan bukan UI: prompt LLM di
`ai-nutrition.ts` (yang memang harus Indonesia) dan string `why` diagnostik di `sync.ts` (yang
diperiksa ke pemanggilnya: tidak pernah ditampilkan).

**Titik buta itu punya sisi KEDUA, dan yang ini cuma terlihat kalau app-nya dipakai.** Teks yang
lewat `t()` pun bisa salah, karena `t()` melakukan `dict[s] || s` — string Inggrisnya ADALAH
kuncinya, jadi **plural Inggris tidak pernah otomatis**. Hitungan 1 membaca "1 workouts" di
Riwayat, "1 sets" di Statistik, "1 equipment types" di Pengaturan. Kesadarannya sudah ada:
komentar `exCount` di `lib/format.ts` menuliskannya persis ("Plural forms are not automatic when
the English string is the key") dan tiga tempat sudah memakai idiomnya. Lima tempat lain tidak.
Bentuknya identik dengan `--acc-ink` dan `--label-3`: aturannya tertulis, penerapannya sebagian.

**Dan satuan waktu tidak pernah lewat `t()` sama sekali.** `fmtDur` menulis `' min'`, `'h '`, dan
`'m'` sendiri, jadi Beranda menulis "Zuhur 20 mnt" sementara Riwayat menulis "2 min" — satuan yang
sama, dua singkatan, satu ketukan apart. Ringkasan kardio lebih jauh lagi: `"20 min @ 8 km/h"`
ditulis langsung di template di TIGA tempat (`history.ts` dua kali, `plan-share.js`), padahal
kolom isiannya sudah lama menerjemahkan `Speed (km/h)` jadi **"km/jam"**. Ketiganya di `lib/` —
direktori yang `no-untranslated-id.test.ts` sengaja TIDAK pindai, jadi celahnya ada di tempat
yang paling tidak diawasi untuk urusan teks UI dan paling banyak dipanggil.

`counted-strings.test.ts` memaku keduanya sebagai KELAS, bukan sebagai daftar temuan: dia
memindai setiap pemanggilan kunci plural dan menuntut cabang tunggal (kecuali yang mengoper
PECAHAN — "1/17 sets" benar, "1/17 set" salah), lalu memindai satuan waktu di luar `t()`. Dua
dari tiga temuan kardio ditemukan OLEH penjaga itu, bukan oleh mata saya. Dua kali penjaganya
sempat menuduh dirinya sendiri — komentar yang mengutip pemanggilan yang salah, dan
`${t('{0} min', x)}` yang cocok dengan pola naif karena `[^}]+` berhenti di kurung tutup pertama.
Keduanya dibuang eksplisit, dan ketiga penjaganya sudah dibuktikan bisa merah.

**Sekalian ditemukan di layar yang sama: ICU `zh` memakai ulang nama bulan GREGORIAN untuk bulan
Hijriah.** Bulan ke-3 keluar sebagai `三月` — nama Maret — jadi pengguna Mandarin melihat
"15 三月 1448 H". `lib/hijri.ts` sekarang membandingkan nama Hijriah dari ICU dengan nama bulan
Gregorian pada ordinal yang sama; kalau identik, ICU tidak punya data Hijriah untuk bahasa itu
dan dipakai transliterasi Latin (`HIJRI_MONTHS_LATIN`). Pemeriksaan ini lebih baik daripada
daftar bahasa yang di-hardcode karena dia **memperbaiki diri sendiri**: kalau ICU menambahkan
nama Hijriah nanti, app langsung memakainya. Bahasa yang ICU-nya sudah benar (tr "Rebiülevvel",
ru "раби-уль-авваль", fr, ko, hi) tidak ikut dipaksa ke Latin — dan itu ada tesnya, karena
pemeriksaannya harus dua arah.

**Smoke test me-mount layar, TIDAK membuka lembar — dan di celah itu ada bug.** Layar makan
menyimpan `undefined` untuk makro opsional yang kosong (benar: makanan cuma membawa apa yang
diisi), tapi lembar EDIT-nya merender `value={f.protein}` apa adanya. Untuk makanan tersimpan
tanpa protein itu `value={undefined}`, jadi React memperlakukan inputnya sebagai tak-terkendali
lalu menulis error saat orang mengetik. Ditutup `views/Food.edit.test.jsx`, dan dua hal di berkas
itu layak diingat: dia harus merender `<Modals />` juga (lembar dibuka lewat `useUI.openSheet`,
dan `Food` bukan yang merendernya — tanpa itu tesnya hijau tanpa memeriksa apa pun), dan dia harus
benar-benar MENGETIK, karena React memperingatkan saat input BERPINDAH ke terkendali, bukan saat
dirender dengan `undefined`. Dua-duanya cuma ketemu karena uji-baliknya tidak mau merah.

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

**Waktu salat dihitung untuk hari kalender KOTA, bukan hari kalender perangkat.**
`scheduleFor` menurunkan Y/M/D lewat `city.tz` sebelum menyerahkannya ke `adhan`, karena
`adhan` membaca tanggal dari zona runtime. Tanpa itu, perangkat UTC dengan kota Jakarta
membaca instan 05:50 WIB sebagai hari KEMARIN dan seluruh jadwalnya bergeser sehari.
Jendela Jumat juga ditentukan di zona kota. `city.tz` sudah ada sejak awal dan dulu cuma
dipakai memformat.

**Tes TIDAK BOLEH bergantung pada jam dinding.** `Workout.test.jsx` hijau berbulan-bulan lalu
merah tanpa satu baris kode berubah: hijau 15:11, merah 15:17, dan Asar hari itu tepat 15:17.
`Workout.jsx` merender `<PrayerPause />`, komponen itu membaca `new Date()` dan memanggil
`stopRest()` saat waktu salat masuk — perilaku produksi yang BENAR, dan assertion "stopRest tidak
dipanggil" yang jadi salah lima kali sehari. Ini kelas kegagalan paling mahal di sini karena
bentuknya CI merah tanpa sebab yang bisa direproduksi: orang menekan re-run, hijau, pelajarannya
hilang. Dipaku `no-wallclock-tests.test.ts`, yang menuntut setiap tes yang merender `Workout`
mematikan `PrayerPause` — kelasnya, bukan dua kasusnya.

Apa pun yang **memutuskan beban berikutnya** atau **membaca balik sesi yang sudah dilog** = pure
helper di `lib/` dengan unit test di sebelahnya. Bukan diverifikasi dengan klik-klik. Mesin
progresi upstream sudah dua kali kena bug yang **cuma ketangkap tes**. Mode Ramadan menyentuh
mesin itu — jadi aturan ini justru paling relevan sekarang.
