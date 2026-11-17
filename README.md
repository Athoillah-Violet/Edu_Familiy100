# Edu Family 100 - Bimbingan Konseling (BK)

Media kuis edukatif interaktif berbasis "Family 100" khusus pembelajaran Bimbingan Konseling (BK) untuk siswa SMP dan SMA. Aplikasi dirancang khusus untuk dipandu oleh guru BK di depan kelas menggunakan layar proyektor.

---

## 1. Prasyarat & Instalasi Lokal

Pastikan telah menginstal [Node.js](https://nodejs.org/) (versi LTS disarankan, Node.js >= 18).

```bash
# 1. Clone repository
git clone https://github.com/Athoillah-Violet/Edu_Familiy100.git
cd Edu_Familiy100

# 2. Install dependensi
npm install

# 3. Jalankan pengujian unit test engine
npm test

# 4. Jalankan development server lokal
npm run dev
```

Server lokal akan berjalan di `http://localhost:5173`.

---

## 2. Konfigurasi Environment (`.env`)

Aplikasi menggunakan `@supabase/supabase-js` v2 dengan arsitektur *public client-side*.

1. Salin berkas percontohan `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi variabel dari dashboard Supabase Anda (**Project Settings** -> **API**):
   ```env
   VITE_SUPABASE_URL=https://proyek-anda.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

> [!NOTE]
> Jika file `.env` dikosongkan, aplikasi secara otomatis berjalan dalam **Mode Demo (Offline)** menggunakan paket data lokal `src/data/demo.json`. Jangan pernah memasukkan `service_role` / `secret key` ke dalam aplikasi ini.

---

## 3. Langkah Setup Supabase Database

Ikuti urutan langkah berikut di **Supabase Dashboard**:

### Langkah 1: Eksekusi `schema.sql`
- Masuk ke **Supabase Dashboard** -> menu **SQL Editor**.
- Buka dan salin seluruh isi berkas `schema.sql`.
- Klik **Run** untuk membuat tabel (`categories`, `questions`, `answers`, `admins`, `game_sessions`) beserta seluruh kebijakan **Row Level Security (RLS)**.

### Langkah 2: Eksekusi `seed.sql`
- Di **SQL Editor**, buka dan salin berkas `seed.sql`.
- Klik **Run** untuk memasukkan materi dan soal awal (Anti-Perundungan & Manajemen Waktu Belajar).

### Langkah 3: Buat Akun Pengguna Admin Guru
- Masuk ke menu **Authentication** -> **Users**.
- Klik tombol **Add User** -> **Create User**.
- Masukkan email dan password guru BK (contoh: `guru.bk@sekolah.sch.id`).
- Salin nilai **User UID** dari akun yang baru dibuat.

### Langkah 4: Matikan Pendaftaran Publik (Disable Public Sign-Up)
- Masuk ke **Authentication** -> **Providers** -> **Email**.
- Matikan opsi **"Allow new users to sign up"** (unchecked).
- Simpan perubahan. Dengan ini, hanya admin yang dibuat manual oleh sekolah yang bisa memiliki akun.

### Langkah 5: Daftarkan UID ke Tabel `admins`
- Kembali ke **SQL Editor**, jalankan query berikut (ganti `<USER_UID>` dengan UID dari Langkah 3):
  ```sql
  INSERT INTO public.admins (user_id)
  VALUES ('<USER_UID>');
  ```
- Akun guru BK kini telah aktif dan memiliki hak akses penuh untuk membuat/mengedit materi di `/admin/login.html`.

---

## 4. Panduan Deploy ke Vercel

Aplikasi ini telah dikonfigurasi sebagai static multi-page application via `vercel.json`:

1. Buka [Vercel Dashboard](https://vercel.com/) dan pilih **Add New...** -> **Project**.
2. Hubungkan repository GitHub: `Athoillah-Violet/Edu_Familiy100`.
3. Pada halaman konfigurasi build:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Tambahkan **Environment Variables**:
   - `VITE_SUPABASE_URL` = *(URL Proyek Supabase)*
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = *(Anon Public Key Supabase)*
5. Klik tombol **Deploy**.

---

## 5. Struktur Halaman & Alur Penggunaan

- `/index.html` : **Beranda Aplikasi** (Pengenalan alur permainan 4 langkah, pilihan materi survei, dan tautan mulai).
- `/setup.html` : **Wizard Pengaturan Sesi Permainan** (3 langkah: pilih topik & jumlah ronde, bagi 2-4 kelompok siswa dan warna, atur timer dan batas strike).
- `/game.html` : **Arena Permainan Interaktif** (Tampilan layar proyektor kelas: pertanyaan besar, kartu survei dinamis, papan skor tim, banner panduan fase "Sekarang Apa?", dan panel kendali guru dengan tombol pintasan keyboard `H`).
- `/result.html` : **Hasil Akhir & Refleksi** (Pengumuman pemenang, papan peringkat semua kelompok, ringkasan per ronde yang dapat dibuka-tutup, dan tombol cetak).
- `/admin/login.html` : **Login Admin Guru BK** (Pintu masuk pengelola materi pembelajaran).
- `/admin/index.html` : **Dashboard Kategori Materi** (Kelola status publikasi, buat paket topik, dan impor paket JSON).
- `/admin/editor.html` : **Editor Soal & Jawaban** (Kelola pertanyaan, bobot poin 3-8 jawaban, reorder urutan soal, catatan refleksi karakter, dan ekspor paket JSON).

---

## 6. Prinsip Engine & Kontrak Keamanan

1. **Pure Deterministic Engine (`src/lib/gameEngine.js`):**
   - Seluruh aturan permainan (Face-Off, Play, Strike, Steal, Refleksi, Poin) diatur oleh fungsi murni `reduce(state, action)`.
   - UI tidak memanipulasi skor atau fase secara sepihak; UI hanya mengirimkan aksi (`dispatch(action)`) dan merefleksikan perubahan `state`.
2. **Offline-Safe Persistence (`src/lib/gameStore.js` & `src/lib/sessionReport.js`):**
   - Setiap aksi tersimpan aman ke `localStorage`. Permainan yang tidak sengaja tertutup atau ter-refresh dapat langsung dilanjutkan tanpa kehilangan skor.
   - Selesai permainan, laporan sesi dikirim ke Supabase. Jika terjadi kendala koneksi internet sekolah, laporan otomatis tersimpan di antrean perangkat (*pending sessions*) dan dapat dikirim ulang sewaktu-waktu.
3. **Web Audio API (`src/lib/audio.js`):**
   - Efek suara bel, strike buzzer, kartu terbuka, dan denting waktu disintesis langsung menggunakan Web Audio API tanpa memerlukan berkas audio eksternal.
4. **Desain Ramah Sekolah:**
   - Bersih, terang, menggunakan tema indigo dan warna tim lembut, tanpa neon, tanpa efek mencolok yang memicu kelelahan visual siswa, serta mendukung `prefers-reduced-motion`.

---

## 7. Checklist Serah Terima ke Klien (Sekolah / Guru BK)

Gunakan daftar periksa ini saat serah terima aplikasi kepada pihak sekolah:

- [x] **Koneksi Database:** Tabel dan RLS Supabase terpasang via `schema.sql` dan `seed.sql`.
- [x] **Akun Guru BK:** Akun admin telah didaftarkan pada tabel `admins` dan berhasil login di `/admin/login.html`.
- [x] **Keamanan Auth:** Pendaftaran publik (*public sign-up*) pada Supabase Auth telah dinonaktifkan.
- [x] **Mode Offline / Demo:** Aplikasi dapat berjalan normal menggunakan data percontohan jika jaringan internet kelas terputus.
- [x] **Tampilan Proyektor:** Arena permainan (`game.html`) muat dalam satu layar tanpa scroll vertikal pada resolusi proyektor standar (1280x720 hingga 1920x1080).
- [x] **Kerahasiaan Kunci Jawaban:** Kunci jawaban pada panel guru tampil ter-blur secara otomatis agar tidak bocor ke siswa saat proyektor menyala.
- [x] **Pintasan Keyboard Guru:**
  - Tombol `[H]` : Sembunyikan / Tampilkan Panel Kendali Guru.
  - Tombol `[A]`, `[L]`, `[S]`, `[K]` : Pintasan bel tim saat fase Face-Off.
- [x] **Pencetakan Hasil:** Halaman hasil akhir (`result.html`) dapat dicetak langsung (`window.print()`) secara bersih dan rapi untuk dokumentasi portofolio layanan BK.
