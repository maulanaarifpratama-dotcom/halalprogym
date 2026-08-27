-- Halal Pro Gym — tabel sinkronisasi.
--
-- KENAPA SATU TABEL JSONB, BUKAN 12 TABEL TERNORMALISASI
--
-- Rencana awal menyebut "12 tabel + RLS". Itu dikoreksi di sini, dengan alasan, karena skema
-- ternormalisasi tidak menjawab pertanyaan yang app ini benar-benar punya:
--
--   1. localStorage adalah SUMBER KEBENARAN, Supabase cuma target sync (aturan #1 CLAUDE.md).
--      Klien tidak pernah bertanya "sesi mana yang beban squat-nya di atas 100 kg" ke server —
--      seluruh statistik, progresi, dan grafik dihitung lokal dari state di memori. Tidak ada
--      satu pun query per-kolom di seluruh app.
--
--   2. Tanpa query per-kolom, normalisasi cuma menambah satu mapper dua arah untuk 12 bentuk
--      data, dan setiap perubahan bentuk di lib/types.ts jadi migration. Itu biaya nyata untuk
--      kemampuan yang tidak dipakai.
--
--   3. Yang dibutuhkan justru sebaliknya: satu operasi atomik. State ini punya invarian
--      lintas-bagian (mis. week menunjuk routine.id, exWeights menunjuk exercise.id). Menulis
--      12 tabel berarti 12 kesempatan untuk sinkron separuh jalan.
--
-- Kalau nanti benar-benar butuh query server-side — leaderboard, agregat lintas pengguna,
-- ekspor analitik — normalisasi masuk sebagai tabel TURUNAN yang diisi dari jsonb ini, bukan
-- sebagai pengganti sumbernya.
--
-- SESI YANG SEDANG BERJALAN TIDAK IKUT
--
-- `state.active` ada di dalam jsonb ini secara teknis, tapi klien MENGOSONGKANNYA sebelum push
-- (lihat lib/sync.ts). Alasannya di CLAUDE.md: sesi berjalan cuma milik klien, disinkronkan
-- waktu selesai. Kalau sesi berjalan ikut tersinkron, membuka app di HP kedua akan menarik
-- sesi setengah jalan dari perangkat pertama dan dua-duanya saling menimpa tiap set.

create table if not exists public.user_state (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  state       jsonb       not null,
  -- Jam KLIEN saat state ini dibuat (`state._ts`), disimpan sebagai kolom sendiri supaya bisa
  -- dibandingkan tanpa membongkar jsonb-nya. Sengaja BUKAN now(): keputusan siapa yang menang
  -- dibuat dari jam yang sama yang dipakai klien lain, dan klien bisa offline berjam-jam
  -- sebelum push. `updated_at` di bawah yang memakai jam server, untuk audit.
  client_ts   bigint      not null default 0,
  updated_at  timestamptz not null default now()
);

comment on table public.user_state is
  'Satu baris per pengguna: seluruh state app sebagai jsonb. localStorage tetap sumber kebenaran; ini target sync.';
comment on column public.user_state.client_ts is
  'state._ts dari klien — jam klien, bukan jam server. Dipakai untuk memutuskan siapa yang lebih baru.';

-- `updated_at` harus jam server dan tidak boleh bisa dipalsukan klien: dia satu-satunya
-- pegangan saat menyelidiki sinkronisasi yang bentrok. Trigger, bukan default, karena default
-- tidak berlaku pada UPDATE.
create or replace function public.touch_user_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before insert or update on public.user_state
  for each row execute function public.touch_user_state();

-- ------------------------------------------------------------------------------------------
-- RLS
--
-- Satu pengguna per akun, jadi aturannya satu kalimat: kamu cuma bisa melihat dan menulis
-- barismu sendiri. Tidak ada peran admin, tidak ada berbagi, tidak ada multi-tenant — itu
-- keputusan produk yang tercatat, bukan penyederhanaan sementara.
--
-- Keempat operasi ditulis eksplisit. `for all` lebih pendek tapi menyembunyikan bahwa INSERT
-- butuh `with check` sementara SELECT butuh `using`; menuliskannya membuat celah yang paling
-- sering terjadi — INSERT tanpa `with check` — mustahil ditulis tanpa terlihat.
alter table public.user_state enable row level security;

drop policy if exists user_state_select_own on public.user_state;
create policy user_state_select_own on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_state_insert_own on public.user_state;
create policy user_state_insert_own on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_state_update_own on public.user_state;
create policy user_state_update_own on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_state_delete_own on public.user_state;
create policy user_state_delete_own on public.user_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- `(select auth.uid())` bukan `auth.uid()` telanjang: bentuk subquery dievaluasi SEKALI per
-- query, bukan sekali per baris. Di tabel satu-baris-per-pengguna bedanya tidak terasa, tapi
-- ini pola yang direkomendasikan Supabase dan tidak ada alasan menulis versi yang lebih lambat.

-- anon TIDAK diberi akses apa pun. Pengguna tamu tidak pernah menyentuh tabel ini — datanya
-- tinggal di localStorage, dan itu memang jalur yang didukung, bukan mode darurat.
revoke all on public.user_state from anon;
