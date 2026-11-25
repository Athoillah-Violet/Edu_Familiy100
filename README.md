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

Aplikasi menggunakan `@neondatabase/neon-js` dengan arsitektur **Neon Auth** dan **Neon Data API** (*public client-side*).

1. Salin berkas percontohan `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi variabel dari konsol Neon Anda:
   ```env
   VITE_NEON_AUTH_URL=https://auth.neon.tech/neondb/...
   VITE_NEON_DATA_API_URL=https://api.neon.tech/neondb/...
   ```

> [!NOTE]
> Jika file `.env` dikosongkan, aplikasi secara otomatis berjalan dalam **Mode Demo (Offline)** menggunakan paket data lokal `src/data/demo.json`. Jangan pernah memasukkan connection string `postgresql://` maupun secret API key ke dalam frontend aplikasi ini.

---

## 3. Langkah Setup Neon Database

Ikuti urutan langkah berikut di **Neon Console** ([console.neon.tech](https://console.neon.tech)):

### Langkah 1: Aktifkan Neon Auth dan Neon Data API
- Masuk ke proyek Neon Anda di **Neon Console**.
- Aktifkan fitur **Neon Auth** (Managed Better Auth) pada menu **Auth**. Salin **Auth URL** yang disediakan.
- Aktifkan fitur **Neon Data API** pada menu **Data API** (atau Project Settings). Salin **Data API URL** yang disediakan.

### Langkah 2: Eksekusi `neon/schema.sql`
- Masuk ke menu **SQL Editor** di Neon Console.
- Buka dan salin seluruh isi berkas `neon/schema.sql`.
- Klik **Run** untuk membuat tabel (`categories`, `questions`, `answers`, `admins`, `game_sessions`), hak akses `GRANT` schema/tabel ke role `anonymous` dan `authenticated`, serta seluruh kebijakan **Row Level Security (RLS)**.

### Langkah 3: Eksekusi `neon/seed.sql`
- Di **SQL Editor**, buka dan salin berkas `neon/seed.sql`.
- Klik **Run** untuk memasukkan 6 paket materi BK lengkap (Anti-Perundungan, Manajemen Waktu, Regulasi Emosi, Komunikasi Asertif, Perencanaan Karier, dan Literasi Digital). Skrip ini bersifat idempoten dan aman dijalankan berulang kali.

### Langkah 4: Buat Akun Pengguna Admin Guru
- Masuk ke menu **Auth** -> **Users** di Neon Console (atau buat pengguna lewat antarmuka Neon Auth).
- Daftarkan akun email dan kata sandi guru BK (contoh: `guru.bk@sekolah.sch.id`).
- Salin nilai **User ID** (`text` / string ID) dari akun yang baru dibuat.

### Langkah 5: Matikan Pendaftaran Publik (Disable Public Sign-Up)
- Pada pengaturan **Auth** di Neon Console, nonaktifkan opsi **Public Sign-Up** / **Allow new user signups** (jika tersedia di paket/versi Neon Auth Anda). Dengan demikian, hanya akun yang didaftarkan pihak sekolah yang dapat login.

### Langkah 6: Daftarkan User ID ke Tabel `admins`
- Kembali ke **SQL Editor**, jalankan query berikut (ganti `<USER_ID>` dengan ID dari Langkah 4):
  ```sql
  INSERT INTO public.admins (user_id)
  VALUES ('<USER_ID>');
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
   - `VITE_NEON_AUTH_URL` = *(Auth URL dari Neon Console)*
   - `VITE_NEON_DATA_API_URL` = *(Data API URL dari Neon Console)*
5. Klik tombol **Deploy**.

---

## 5. Struktur Halaman & Alur Penggunaan

- `/index.html` : **Beranda Aplikasi** (Pengenalan alur permainan 4 langkah, pilihan materi survei, dan tautan mulai).
- `/setup.html` : **Wizard Pengaturan Sesi Permainan** (3 langkah: pilih topik & jumlah ronde, bagi 2-4 kelompok siswa dan warna, atur timer dan batas strike).
- `/game.html` : **Arena Permainan Interaktif** (Tampilan layar proyektor kelas: pertanyaan besar, kartu survei dinamis, papan skor tim, banner panduan fase "Sekarang Apa?", dan panel kendali guru dengan tombol pintasan keyboard `H`).
- `/result.html` : **Hasil Akhir & Refleksi** (Pengumuman pemenang, papan peringkat semua kelompok, ringkasan per ronde yang dapat dibuka-tutup, dan tombol cetak).
- `/admin/login.html` : **Login Admin Guru BK** (Pintu masuk pengelola materi pembelajaran).
- `/admin/index.html` : **Dashboard Kategori Materi** (Kelola status publikasi, buat paket topik, dan impor paket Excel `.xlsx`).
- `/admin/editor.html` : **Editor Soal & Jawaban** (Kelola pertanyaan, bobot poin 3-8 jawaban, reorder urutan soal, catatan refleksi karakter, dan ekspor paket JSON).

---

## 6. Prinsip Engine & Kontrak Keamanan

1. **Pure Deterministic Engine (`src/lib/gameEngine.js`):**
   - Seluruh aturan permainan (Face-Off, Play, Strike, Steal, Refleksi, Poin) diatur oleh fungsi murni `reduce(state, action)`.
   - UI tidak memanipulasi skor atau fase secara sepihak; UI hanya mengirimkan aksi (`dispatch(action)`) dan merefleksikan perubahan `state`.
2. **Offline-Safe Persistence (`src/lib/gameStore.js` & `src/lib/sessionReport.js`):**
   - Setiap aksi tersimpan aman ke `localStorage`. Permainan yang tidak sengaja tertutup atau ter-refresh dapat langsung dilanjutkan tanpa kehilangan skor.
   - Selesai permainan, laporan sesi dikirim ke database Neon. Jika terjadi kendala koneksi internet sekolah, laporan otomatis tersimpan di antrean perangkat (*pending sessions*) dan dapat dikirim ulang sewaktu-waktu.
3. **Web Audio API (`src/lib/audio.js`):**
   - Efek suara bel, strike buzzer, kartu terbuka, dan denting waktu disintesis langsung menggunakan Web Audio API tanpa memerlukan berkas audio eksternal.
4. **Desain Ramah Sekolah:**
   - Bersih, kontras nyaman, menggunakan tema modern dark navy dan aksen glow, serta mendukung `prefers-reduced-motion`.

---

## 7. Checklist Serah Terima ke Klien (Sekolah / Guru BK)

Gunakan daftar periksa ini saat serah terima aplikasi kepada pihak sekolah:

- [x] **Koneksi Database:** Tabel dan RLS Neon terpasang via `neon/schema.sql` dan `neon/seed.sql`.
- [x] **Akun Guru BK:** Akun admin telah didaftarkan pada tabel `admins` dan berhasil login di `/admin/login.html`.
- [x] **Keamanan Auth:** Pendaftaran publik (*public sign-up*) pada Neon Auth telah dinonaktifkan.
- [x] **Mode Offline / Demo:** Aplikasi dapat berjalan normal menggunakan data percontohan jika jaringan internet kelas terputus.
- [x] **Tampilan Proyektor:** Arena permainan (`game.html`) muat dalam satu layar tanpa scroll vertikal pada resolusi proyektor standar (1280x720 hingga 1920x1080).
- [x] **Kerahasiaan Kunci Jawaban:** Kunci jawaban pada panel guru tampil ter-blur secara otomatis agar tidak bocor ke siswa saat proyektor menyala.
- [x] **Pintasan Keyboard Guru:**
  - Tombol `[H]` : Sembunyikan / Tampilkan Panel Kendali Guru.
  - Tombol `[A]`, `[L]`, `[S]`, `[K]` : Pintasan bel tim saat fase Face-Off.
- [x] **Pencetakan Hasil:** Halaman hasil akhir (`result.html`) dapat dicetak langsung (`window.print()`) secara bersih dan rapi untuk dokumentasi portofolio layanan BK.
