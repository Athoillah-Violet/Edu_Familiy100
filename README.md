# Edu Family 100 - Bimbingan Konseling (BK)

Web game edukasi interaktif berbasis "Family 100" khusus pembelajaran Bimbingan Konseling (BK) untuk siswa SMP/SMA.

---

## 1. Prasyarat & Instalasi

Pastikan telah menginstal [Node.js](https://nodejs.org/) (versi LTS disarankan, >= 18).

```bash
# Clone repository
git clone https://github.com/Athoillah-Violet/Edu_Familiy100.git
cd Edu_Familiy100

# Install dependensi
npm install
```

---

## 2. Konfigurasi Environment (`.env`)

Aplikasi menggunakan `@supabase/supabase-js` v2 dengan arsitektur *public client-side*.

1. Duplikasi file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Dapatkan nilai konfigurasi dari dashboard Supabase Anda:
   - Buka **Supabase Dashboard** -> Proyek Anda -> **Project Settings** -> **API**.
   - Salin **Project URL** ke `VITE_SUPABASE_URL`.
   - Salin **anon / public key** ke `VITE_SUPABASE_PUBLISHABLE_KEY`.
   ```env
   VITE_SUPABASE_URL=https://xyzcompany.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
> [!NOTE]
> Jika file `.env` tidak diisi atau variabel kosong, aplikasi secara otomatis berjalan dalam **Mode Demo** (mengambil paket materi dari `src/data/demo.json` secara offline). Jangan pernah memasukkan `service_role` key ke dalam project frontend ini.

---

## 3. Menjalankan Server Lokal (Development)

```bash
# Jalankan development server Vite
npm run dev

# Menjalankan pengujian logika matcher
npm test

# Build untuk produksi
npm run build
```

Setelah server berjalan, Anda dapat membuka:
- `http://localhost:5173/` : Halaman Utama
- `http://localhost:5173/setup.html` : Setup Permainan
- `http://localhost:5173/game.html` : Arena Game
- `http://localhost:5173/result.html` : Ringkasan Hasil & Refleksi BK
- `http://localhost:5173/admin/login.html` : Login Admin / Guru BK
- `http://localhost:5173/admin/index.html` : Dashboard Kategori Soal
- `http://localhost:5173/admin/editor.html` : Editor CRUD Soal & Jawaban
- `http://localhost:5173/test.html` : Halaman Uji Backend (*hapus sebelum produksi*)

---

## 4. Panduan Deploy ke Vercel

Target deploy aplikasi ini adalah static build:
1. Hubungkan repository GitHub `Edu_Familiy100` ke Vercel.
2. Konfigurasi project di Vercel:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Tambahkan **Environment Variables** di dashboard Vercel (**Settings** -> **Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Tekan tombol **Deploy**.

---

## 5. Panduan Manajemen Admin Supabase

Untuk memberikan hak akses Admin / Guru BK kepada akun pengguna:
1. **Buat Akun Pengguna:**
   - Masuk ke **Supabase Dashboard** -> Proyek Anda -> **Authentication** -> **Users**.
   - Klik **Add User** -> Masukkan email dan password admin (misal: `guru.bk@sekolah.sch.id`).
   - Salin **User UID** pengguna tersebut.
2. **Daftarkan UID ke Tabel `admins`:**
   - Buka menu **Table Editor** atau **SQL Editor** di Supabase Dashboard.
   - Jalankan query SQL berikut (ganti `<USER_UID>` dengan UID asli):
     ```sql
     INSERT INTO public.admins (user_id)
     VALUES ('<USER_UID>');
     ```
3. Akun tersebut kini dapat masuk melalui `/admin/login.html` dan mengelola paket soal.

---

## 6. Catatan Keamanan & Keterbatasan Non-Atomik

> [!IMPORTANT]
> Keamanan data dan hak akses guru/admin diatur sepenuhnya oleh **Row Level Security (RLS)** pada database Supabase, **BUKAN** oleh pengecekan frontend / UI semata.
> 
> - Semua tabel (`categories`, `questions`, `answers`, `game_sessions`, `admins`) harus mengaktifkan RLS di Supabase.
> - Kebijakan `SELECT` publik hanya diizinkan untuk kategori dengan status `is_published = true` dan soal-soal terkait.
> - Operasi tulis (`INSERT`, `UPDATE`, `DELETE`) dan pembacaan draft soal hanya diizinkan melalui RLS policy bagi user yang terdaftar pada tabel `admins`.
> - Frontend hanya memvalidasi input dasar dan menampilkan antarmuka berdasarkan status auth.

> [!WARNING]
> **Keterbatasan Non-Atomik pada Pengelolaan Jawaban:**
> Fungsi `saveQuestionWithAnswers()` bekerja secara berurutan: menyimpan/memperbarui data soal, mencadangkan jawaban lama, membersihkan jawaban lama, lalu memasukkan jawaban baru yang telah diurutkan berdasarkan poin.
> 
> Karena klien Supabase JS publik tidak mendukung transaksi atomik multi-langkah (`BEGIN ... COMMIT`) tanpa database RPC function, sistem mengimplementasikan *software-level rollback* (jika penyimpanan jawaban baru gagal, sistem otomatis berupaya memulihkan jawaban lama). Jika terjadi kegagalan jaringan di tengah proses, disarankan memeriksa kembali daftar jawaban di halaman editor soal.

---

## 7. Arsitektur Engine Game Murni & Alur Permainan

Aplikasi game ini dipisahkan secara tegas antara logika game (*game engine*) dan antarmuka pengguna (*UI*):

### Alur Fase Permainan
$$\text{FACE\_OFF} \longrightarrow \text{PLAYING} \longrightarrow \text{STEAL} \longrightarrow \text{ROUND\_END} \longrightarrow \text{REFLECTION} \longrightarrow \text{NEXT} \longrightarrow (\text{FINAL\_RESULT})$$

1. **FACE_OFF:** Dua tim berhadapan menekan buzzer (`BUZZ`). Jawaban peringkat 1 langsung memenangkan kontrol. Jika non-top, tim lawan diberi kesempatan menjawab lebih tinggi. Pemenang memilih Main (`play`) atau Oper (`pass`).
2. **PLAYING:** Tim berkontrol menebak sisa jawaban (`REVEAL`). Jika melakukan kesalahan atau waktu habis, tim menerima `STRIKE`. Tiga strike memicu fase `STEAL`.
3. **STEAL:** Tim lawan memiliki 1 kesempatan mencuri pot (`STEAL_ANSWER`). Berhasil = seluruh pot direbut tim pencuri; Gagal = pot kembali ke tim berkontrol.
4. **ROUND_END & REFLECTION:** Poin pemenang dikalikan multiplier soal dan ditambahkan ke skor. Guru memandu refleksi BK dan pertanyaan diskusi kelas.
5. **FINAL_RESULT:** Rekapitulasi pemenang dan peringkat seluruh tim.

### Prinsip Determinisme & Pemisahan UI
- **Pure Reducer:** `reduce(state, action)` tidak pernah mengubah state lama secara in-place, tidak menggunakan `Math.random()`, dan tidak memanggil `Date.now()`.
- **UI Hanya Mengirim Aksi:** UI tidak boleh mengubah skor atau memanipulasi variabel permainan secara langsung; UI hanya memanggil `dispatch(action)`.
- **Timer Eksternal:** Timer dihitung oleh UI peramban; saat waktu habis, UI hanya memicu aksi `{ type: 'TIMER_EXPIRED' }`.
- **Persistensi & Pemulihan:** Setiap perubahan state otomatis disimpan oleh `gameStore.js` ke `localStorage`. Saat halaman dimuat ulang, permainan dapat dilanjutkan persis dari titik terakhir.

---

## 8. Kebijakan RLS untuk Tabel `game_sessions` (Rekomendasi)

Tabel `game_sessions` menampung ringkasan hasil akhir permainan:
- Struktur: `id (uuid)`, `category_id (uuid)`, `teams (jsonb)`, `played_at (timestamptz)`.
- Jika sesi permainan dijalankan oleh fasilitator/guru yang tidak login admin, Supabase memerlukan kebijakan RLS `INSERT` agar sesi dapat disimpan. Jalankan query berikut di **SQL Editor** Supabase Dashboard:

```sql
-- Izinkan penyimpanan sesi permainan publik / anonim
CREATE POLICY "Allow insert game_sessions" ON public.game_sessions
FOR INSERT WITH CHECK (true);

-- Izinkan pembacaan sesi oleh admin
CREATE POLICY "Allow read game_sessions for admin" ON public.game_sessions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
```
Jika kebijakan di atas belum dipasang, sistem `sessionReport.js` secara otomatis mengamankan laporan ke dalam antrean offline (*pending sessions*) di `localStorage` tanpa mengganggu alur permainan.
