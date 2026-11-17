-- ==============================================================================
-- SCHEMA FAMILY 100 BK (Bimbingan Konseling SMP / SMA)
-- Database: Supabase PostgreSQL
-- ==============================================================================

-- 1. Tabel Admins (Menyimpan daftar UID user Supabase Auth yang berhak menjadi admin)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Categories (Paket materi topik pembelajaran BK)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description VARCHAR(300),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Questions (Daftar pertanyaan survei per paket topik)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    multiplier SMALLINT NOT NULL DEFAULT 1 CHECK (multiplier >= 1 AND multiplier <= 3),
    reflection_note TEXT,
    discussion_prompts JSONB DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Answers (Daftar jawaban papan terurut per pertanyaan)
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_text VARCHAR(200) NOT NULL,
    points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
    keywords JSONB DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel Game Sessions (Riwayat sesi permainan di kelas)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    teams JSONB NOT NULL DEFAULT '[]'::jsonb,
    rounds INT NOT NULL DEFAULT 0,
    played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function: Memeriksa apakah user saat ini terdaftar sebagai admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  );
$$;

-- RLS Admins
CREATE POLICY "Admin dapat melihat data admin" ON public.admins
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- RLS Categories
CREATE POLICY "Publik dapat membaca kategori yang dipublikasikan" ON public.categories
    FOR SELECT TO anon, authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admin dapat mengelola seluruh kategori" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS Questions
CREATE POLICY "Publik dapat membaca soal dari kategori yang dipublikasikan" ON public.questions
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = questions.category_id AND (c.is_published = true OR public.is_admin())
        )
    );

CREATE POLICY "Admin dapat mengelola seluruh soal" ON public.questions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS Answers
CREATE POLICY "Publik dapat membaca jawaban dari soal yang dipublikasikan" ON public.answers
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.categories c ON c.id = q.category_id
            WHERE q.id = answers.question_id AND (c.is_published = true OR public.is_admin())
        )
    );

CREATE POLICY "Admin dapat mengelola seluruh jawaban" ON public.answers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS Game Sessions
CREATE POLICY "Publik dan admin dapat menyimpan riwayat sesi permainan" ON public.game_sessions
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Admin dapat membaca data sesi permainan" ON public.game_sessions
    FOR SELECT TO authenticated
    USING (public.is_admin());
