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

Commit free-exercise-db **di-pin**, dan harus tetap satu nilai di semua tempat:
`scripts/build-exercise-media.mjs` (akar repo) dan `lib/exercise-media.ts`. Tempat ketiga,
`frontend/scripts/fetch-demo-media.mjs`, sengaja **MEMBACANYA** dari `lib/exercise-media.ts`
alih-alih menyimpan salinannya — cara terbaik menjaga tiga tempat tetap sinkron adalah membuat
salah satunya bukan tempat penyimpanan. Kalau satu menyimpang, peta menunjuk satu commit dan foto
datang dari commit lain: yang muncul di layar adalah **gerakan yang salah**, tanpa error. Dijaga
`exercise-media.test.ts`. Kalau dinaikkan, jalankan `node scripts/build-exercise-media.mjs
--report` dan **periksa mata** kecocokan yang tidak identik.

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

Sakelarnya **manual**, bukan deteksi tanggal Hijriah otomatis: awal Ramadan ditetapkan sidang
isbat, dan menyala sehari lebih awal berarti menahan progresi di hari orang belum berpuasa.
Mode **puasa sunah Senin–Kamis** memakai mesin yang sama, dan itu jalur ujinya sebelum Ramadan.
Notifikasi 'hydration'/'meal' ditahan di jam puasa; 'rest'/'workout' tidak.

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

## Catatan makan — dan kenapa TIDAK ADA database makanan bawaan

`lib/nutrition.ts` + layar `/food`. Kalori dan makro, target harian, dan pemecahan
sahur/berbuka di hari puasa.

**Makanannya dibuat pengguna sendiri.** Itu keputusan lisensi, bukan kekurangan fitur — dan
alasannya sama persis dengan alasan gambar latihan harus dibangun ulang:

| Sumber | Masalahnya |
| --- | --- |
| TKPI (Kemenkes) | Lisensi redistribusi komersial **tidak jelas**. Harus dipastikan dulu. |
| Open Food Facts | **ODbL** — share-alike pada databasenya. Bisa dipakai, tapi bawa kewajiban. |
| USDA FoodData Central | Domain publik dan aman, tapi isinya makanan Amerika. |

Yang terakhir itu yang menentukan: pengguna app ini mencari "nasi uduk", dan itu tidak ada di
USDA. Jadi database bawaan bukan cuma soal lisensi, dia juga harus **Indonesia** untuk berguna.

Menambahkan database nanti **tidak mengubah satu pun fungsi** di `lib/nutrition.ts` — dia cuma
mengisi `foods` dari sumber lain. Itu memang cara memisahkannya.

**Keputusan itu sekarang punya jawaban yang tidak menunggu siapa pun** — lihat bagian di bawah.
Kalau nanti ada yang mau menambah database bawaan juga, pertanyaan lisensinya tetap berlaku:
pastikan TKPI, atau terima kewajiban ODbL Open Food Facts. Sebelum salah satunya dijawab, jangan
commit satu baris pun data makanan.

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
cd frontend && npm test          # vitest — 868 test case, JANGAN dibiarkan merah
```

`npm run verify` menjalankan berurutan: `typecheck` → `check:names` → `check:locales` →
`check:locale-keys` → `test` → `build`. Pakai ini, jangan mengingat urutannya sendiri.

**CI menjalankan `npm run verify`, satu langkah, bukan daftar step.** Itu disengaja: versi lama
menuliskan setiap checker terpisah, dan itulah yang membuat CI dan gate lokal melenceng tanpa ada
yang memberi tahu — CI masih menjalankan job `mcp/` untuk direktori yang dihapus di Fase 0, jadi
**gagal di setiap push**, sementara `check:names` dan `check:locale-keys` tidak pernah jalan di
sana sama sekali. Kalau gate-nya berubah, dia berubah di satu tempat.

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
