# Glosarium Bahasa Indonesia — Halal Pro Gym

Keputusan istilah, diambil **sebelum** terjemahan massal. Mengubahnya belakangan berarti
menyentuh ~10.360 baris instruksi latihan, jadi ini dikunci lebih dulu dengan sengaja.

Dipakai oleh `frontend/src/locales/id.js` dan oleh pipeline `scripts/translate-*.mjs` di Fase 4.

## Tiga aturan induk

**1. Istilah gym tetap Inggris.** Deadlift, bench press, squat, reps, set, superset, warm-up,
drop-set, rest-pause — itu yang benar-benar dipakai orang di gym Indonesia. Kalau istilah
Inggrisnya yang natural, **kuncinya tidak diisi sama sekali**; `t()` melakukan `dict[s] || s`
jadi fallback yang mengerjakannya. Menerjemahkan "reps" jadi "repetisi" bikin app terasa seperti
buku pelajaran, bukan seperti gym.

**2. Semua istilah keislaman mengikuti KBBI, tanpa pengecualian.** Diputuskan 2026-08-27:
KBBI adalah standar nasional, jadi ejaan yang terasa asing pun tetap dipakai. Konsekuensinya
nyata dan disengaja — lihat "tiga yang akan terlihat seperti salah tulis" di bawah.

**3. Sapaan santai, bukan formal.** "kamu", bukan "Anda". Orang di gym sedang bekerja, bukan
sedang dilayani teller bank. Tidak ada tanda seru motivasional.

## Hari

| Inggris | Indonesia | Catatan |
| --- | --- | --- |
| Sunday | **Ahad** | Bukan "Minggu" — lihat di bawah |
| Monday | Senin | dari *Itsnain* (dua) |
| Tuesday | Selasa | dari *Tsalatsa* (tiga) |
| Wednesday | Rabu | dari *Arbi'a* (empat) |
| Thursday | Kamis | dari *Khamis* (lima) |
| Friday | Jumat | dari *Jumu'ah* |
| Saturday | Sabtu | dari *Sabt* |

Pendek: `Ahd · Sen · Sel · Rab · Kam · Jum · Sab`

**Kenapa Ahad.** Enam dari tujuh nama hari Indonesia sudah dari bahasa Arab. Satu-satunya yang
bukan adalah "Minggu", dari Portugis *domingo* (*dies Dominica*, "Hari Tuhan"). Ganti kata itu
ke **Ahad** (*al-ahad*, "yang pertama") dan minggunya konsisten penuh. Jadi ini bukan preferensi
yang ditempelkan — ini memperbaiki satu-satunya kata yang keluar dari pola.

**Jebakan teknis yang sudah ditangani.** `Intl` dengan `id-ID` **mengembalikan "Minggu"**.
Tempat yang lewat `t(DAYN[..])` aman karena pack yang menentukan, tapi pemanggil
`toLocaleDateString` langsung tidak melihat pack. Ditangani `localeDateString()` di
`lib/format.ts` lewat `formatToParts` — bukan regex atas string hasil, supaya kata "Minggu"
yang muncul sebagai bagian teks lain tidak ikut terganti. Ada tesnya di `format.test.ts`.

## Gender

| Inggris | Indonesia |
| --- | --- |
| Male | **Ikhwan** |
| Female | **Akhwat** |

Ini melabeli **diagram tubuh** (`BodyMap`, dari MuscleMap) — bukan demo gerakan.

**Demo gerakan tetap satu set netral untuk semua**, diputuskan 2026-08-27. Tidak ada aset
bergender. Itu menghapus penggandaan aset dari jalur kritis, dan aurat tetap terjaga lewat
gaya visualnya (line-art / diagram otot), bukan lewat dua set terpisah.

Nilai tersimpannya tetap `'male'` / `'female'` — nol migrasi data.

## Istilah keislaman

**Semua istilah mengikuti KBBI** — keputusan user 2026-08-27: *"kalau disalah-salahin kan itu
standar nasional."* Tidak ada pengecualian, termasuk untuk ejaan yang terasa asing.

| Istilah | Dipakai (KBBI) | Yang lazim tapi TIDAK dipakai |
| --- | --- | --- |
| salat | **salat** | sholat, shalat, solat |
| Subuh | **Subuh** | Shubuh |
| Zuhur | **Zuhur** | Dzuhur, Dhuhur |
| Asar | **Asar** | Ashar, Ashr |
| Magrib | **Magrib** | Maghrib |
| Isya | **Isya** | Isyak, Isha |
| Ramadan | **Ramadan** | Ramadhan, Romadhon |
| Tarawih | **Tarawih** | Taraweh, Tarowih |
| sunah | **sunah** | sunnah |
| sahur · imsak · berbuka | huruf kecil, kata biasa | — |
| Hijriah | **Hijriah** | Hijriyah |
| Jumat | **Jumat** (hari) | — |
| salat Jumat | **salat Jumat** | Jumu'ah, Jumatan |

**Tiga yang akan terlihat seperti salah tulis, dan memang disengaja:**

- **Magrib** tanpa h, **Asar** tanpa h, **Zuhur** dengan Z. Ini yang paling sering ditulis lain
  di luar sana, dan yang paling mungkin dilaporkan sebagai bug. Bukan bug.
- **sunah**, satu n. KBBI menulis begitu. Jadi "puasa sunah", bukan "puasa sunnah".
- **salat Jumat**, bukan "Jumu'ah". Transliterasi Arab dipakai hanya kalau KBBI tidak punya
  padanannya sama sekali.

Yang KBBI **tidak** punya padanannya tetap transliterasi Arab: **Ayyamul Bidh**, **Ikhwan**,
**Akhwat**.

> Catatan pelaksanaan: ejaan di tabel ini ditulis dari pemahaman KBBI dan **layak dicek sekali**
> ke kbbi.kemdikbud.go.id sebelum terjemahan massal Fase 4 — khususnya `sunah`, `akhwat`, dan
> `ikhwan`. Setelah dicek, hapus catatan ini. Aturannya sudah final; yang perlu dipastikan
> hanya isi entrinya.

## Latihan

| Inggris | Indonesia | Catatan |
| --- | --- | --- |
| Rest | Istirahat | |
| Rest day | Hari istirahat | |
| Body weight | Berat badan | |
| Sets | Set | |
| Reps | *(tidak diisi)* | natural apa adanya |
| Superset, warm-up, drop-set, rest-pause | *(tidak diisi)* | istilah gym |
| Start workout | Mulai latihan | |
| Note | Catatan | |

## Navigasi

Home → **Beranda** · Plan → **Rencana** · Stats → **Statistik** ·
History → **Riwayat** · Settings → **Pengaturan**

## Aksi

Confirm → Konfirmasi · Cancel → Batal · Delete/Remove → Hapus · Save → Simpan ·
Import → Impor · Done → Selesai · Skip → Lewati · Edit → Ubah · On → Nyala · Off → Mati ·
All → Semua

## Status pack

`locales/id.js` **sengaja belum lengkap** — 740 kunci total, yang diisi baru yang membawa
keputusan brand. `t()` jatuh ke Inggris per-kunci, jadi pack parsial bukan kegagalan.

`INSTR_LANGS` dan `EXERCISE_NAME_LANGS` **belum** memuat `id`: keduanya butuh run terjemahan
besar (instruksi ~10.360 baris, nama latihan 1.324 entri) lewat `scripts/translate-*.mjs`.
Itu pekerjaan Fase 4.
