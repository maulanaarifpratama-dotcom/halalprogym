<div align="center">

# Halal Pro Gym

**Stay Fit Stay Halal**

App latihan pribadi yang tahu kapan kamu salat, dan tahu kapan kamu puasa.

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-38bdf8?style=flat-square&logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-a78bfa?style=flat-square)

</div>

> **Status: dalam pengembangan.** Target siap sebelum Ramadan 1448 (≈ 8 Februari 2027).

## Kenapa ada

App latihan yang ada sekarang tidak tahu apa-apa soal cara hidup penggunanya yang Muslim.
Rest timer bunyi pas Maghrib. Mesin progresinya menurunkan bebanmu sebulan penuh selama Ramadan
karena membaca puasa sebagai "gagal mencapai target". Jadwal mingguannya menyebut hari pertama
"Minggu".

Halal Pro Gym menyelesaikan itu:

- 🕌 **Sadar waktu salat** — sesi latihan yang sedang jalan **otomatis dijeda** saat waktu salat
  masuk. Jadwal dan notifikasi menghindari window salat. Jumat dapat window lebih lebar untuk
  Jumu'ah. Dihitung lokal (`adhan-js`), jalan tanpa sinyal.
- 🌙 **Mode Ramadan** — jendela latihan bergeser (sebelum Maghrib atau setelah Tarawih), volume
  dipangkas ke target maintenance, dan **mesin progresi di-*hold*** supaya sebulan puasa tidak
  memundurkan programmu. Notifikasi tahu kamu sedang puasa. Berlaku juga untuk **puasa sunnah**
  Senin–Kamis dan Ayyamul Bidh.
- 🗓️ **Ahad, bukan Minggu** — dan tanggal Hijriah di samping Masehi, dengan offset yang bisa
  disetel ke sidang isbat.
- 🇮🇩 **Bahasa Indonesia** — UI dan instruksi latihan. Nama gerakan dibiarkan Inggris, karena
  itu yang dipakai orang di gym.
- 🏋️ **Mesin latihan yang serius** — progresi (linear, Greyskull LP, double progression), estimasi
  1RM, peta kelelahan otot, superset, warm-up, drop-set, rest-pause. Diwarisi dari openGym dengan
  533 unit test-nya.
- 📴 **Offline dulu** — datamu di HP-mu. Sync ke server itu bonus, bukan syarat. Basement gym
  tanpa sinyal tetap jalan.

## Stack

Vite · React 19 · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel · Capacitor (Android)

## Lisensi

**GNU AGPL v3.0** — lihat [LICENSE](LICENSE).

Ini fork dari [**openGym**](https://gitlab.com/DuarteSantos8/opengym) oleh Duarte Santos, yang
membangun mesin latihan yang app ini berdiri di atasnya. Atribusi lengkap dan lisensi pihak
ketiga ada di [NOTICE.md](NOTICE.md).

AGPL berarti kalau kamu memakai app ini sebagai layanan, kamu berhak atas source code-nya.
Ini source code-nya. Silakan fork.

**Catatan aset:** gambar dan animasi latihan dari dataset asal openGym adalah © Gym visual dan
**tidak** dipakai di sini. Halal Pro Gym memakai diagram otot [MuscleMap](https://github.com/melihcolpan/MuscleMap)
(MIT) plus asetnya sendiri.
