-- ==============================================================================
-- SEED DATA AWAL: FAMILY 100 BK
-- Masukkan setelah menjalankan schema.sql
-- ==============================================================================

DO $$
DECLARE
    cat1_id UUID := '00000000-0000-0000-0000-000000000001';
    cat2_id UUID := '00000000-0000-0000-0000-000000000002';
    q1_id UUID := '00000000-0000-0000-0000-000000000101';
    q2_id UUID := '00000000-0000-0000-0000-000000000102';
    q3_id UUID := '00000000-0000-0000-0000-000000000103';
    q4_id UUID := '00000000-0000-0000-0000-000000000201';
    q5_id UUID := '00000000-0000-0000-0000-000000000202';
BEGIN
    -- 1. Kategori 1: Anti-Perundungan & Empati Sosial
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat1_id,
        'Anti-Perundungan & Empati Sosial',
        'Topik pembelajaran seputar membangun empati, mengenali tanda perundungan (bullying), dan tindakan bijak saat melihat teman disakiti.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q1_id,
        cat1_id,
        'Apa yang sebaiknya dilakukan siswa saat melihat teman diejek di depan kelas?',
        1,
        'Menjadi pelindung bagi teman (upstander) lebih bermakna daripada sekadar diam menonton (bystander). Keberanian kecil kita bisa menyelamatkan harga diri orang lain.',
        '["Mengapa sebagian siswa memilih diam saat melihat temannya diejek?", "Bagaimana cara menegur teman yang mengejek tanpa memicu pertengkaran baru?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

    -- Jawaban Soal 1
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order)
    VALUES
        (q1_id, 'Menemani dan menenangkan korban', 38, '["temani", "hibur", "dampingi", "bicara"]'::jsonb, 1),
        (q1_id, 'Menegur pelaku dengan sopan dan tegas', 26, '["tegur", "ingatkan", "nasihati"]'::jsonb, 2),
        (q1_id, 'Melapor ke guru BK atau wali kelas', 20, '["lapor guru", "beri tahu wali kelas", "panggil guru"]'::jsonb, 3),
        (q1_id, 'Mengajak korban pergi dari lokasi', 11, '["ajak pergi", "bawa pergi", "hindari"]'::jsonb, 4),
        (q1_id, 'Tidak ikut tertawa atau menyoraki', 5, '["jangan tertawa", "diam tidak ikut", "tidak bersorak"]'::jsonb, 5)
    ON CONFLICT DO NOTHING;

    -- Soal 2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q2_id,
        cat1_id,
        'Sebutkan tanda atau ciri seseorang memiliki sikap empati yang tinggi!',
        2,
        'Empati adalah kemampuan menempatkan diri pada posisi orang lain. Mendengarkan dengan hati adalah wujud empati paling sederhana yang bisa kita lakukan setiap hari.',
        '["Apa bedanya mendengarkan sekadar merespons dengan mendengarkan untuk memahami?", "Bagaimana empati membantu kelas menjadi lebih damai dan kompak?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

    -- Jawaban Soal 2
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order)
    VALUES
        (q2_id, 'Mendengarkan curhat tanpa menyela', 35, '["mendengar", "menyimak", "pendengar baik"]'::jsonb, 1),
        (q2_id, 'Bisa merasakan kesedihan teman', 28, '["peka", "peduli perasaan", "merasakan"]'::jsonb, 2),
        (q2_id, 'Menawarkan bantuan tanpa diminta', 19, '["menolong", "bantu", "ringan tangan"]'::jsonb, 3),
        (q2_id, 'Menghargai perbedaan pendapat', 12, '["toleransi", "tidak memaksakan", "menghargai"]'::jsonb, 4),
        (q2_id, 'Tidak menghakimi kesalahan teman', 6, '["tidak ngejudge", "memaafkan", "memahami"]'::jsonb, 5)
    ON CONFLICT DO NOTHING;

    -- Soal 3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q3_id,
        cat1_id,
        'Apa dampak buruk dari perundungan siber (cyberbullying) bagi remaja?',
        3,
        'Jejak digital itu nyata dan dampaknya bagi kesehatan mental teman kita bisa bertahan lama. Jadilah pengguna internet yang menyebarkan kebaikan.',
        '["Mengapa di media sosial orang lebih mudah berkomentar jahat?", "Langkah apa yang perlu diambil jika kita menjadi sasaran komentar jahat di medsos?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

    -- Jawaban Soal 3
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order)
    VALUES
        (q3_id, 'Rasa cemas dan takut berlebihan', 34, '["cemas", "takut", "trauma", "gelisah"]'::jsonb, 1),
        (q3_id, 'Menarik diri dari pergaulan sosial', 27, '["mengurung diri", "minder", "tidak mau keluar"]'::jsonb, 2),
        (q3_id, 'Prestasi belajar di sekolah menurun', 21, '["nilai turun", "tidak fokus", "malas belajar"]'::jsonb, 3),
        (q3_id, 'Hilang rasa percaya diri', 13, '["minder", "tidak percaya diri", "merasa buruk"]'::jsonb, 4),
        (q3_id, 'Gangguan tidur atau sulit istirahat', 5, '["insomnia", "sulit tidur", "stres"]'::jsonb, 5)
    ON CONFLICT DO NOTHING;

    -- 2. Kategori 2: Manajemen Waktu & Belajar Efektif
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat2_id,
        'Manajemen Waktu & Belajar Efektif',
        'Materi bimbingan belajar untuk melatih disiplin diri, mengurangi kebiasaan menunda tugas (prokrastinasi), dan mencapai cita-cita.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 4
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q4_id,
        cat2_id,
        'Apa penyebab utama siswa sering menunda-nunda mengerjakan tugas sekolah?',
        1,
        'Menunda pekerjaan sering kali bukan karena malas, tetapi karena cemas tugasnya terlalu sulit. Mulailah dari 5 menit pertama!',
        '["Tugas apa yang paling sering kalian tunda?", "Trik apa yang paling ampuh bagi kalian untuk mulai mengerjakan tugas?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

    -- Jawaban Soal 4
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order)
    VALUES
        (q4_id, 'Asyik bermain HP atau scrolling medsos', 42, '["main hp", "main game", "medsos", "tiktok"]'::jsonb, 1),
        (q4_id, 'Merasa tugas terlalu sulit atau bingung', 25, '["sulit", "tidak paham", "bingung"]'::jsonb, 2),
        (q4_id, 'Merasa batas waktu (deadline) masih lama', 18, '["deadline lama", "masih santai", "nanti saja"]'::jsonb, 3),
        (q4_id, 'Kelelahan setelah pulang sekolah', 10, '["capek", "lelah", "mengantuk"]'::jsonb, 4),
        (q4_id, 'Tidak memiliki jadwal belajar yang jelas', 5, '["tidak ada jadwal", "lupa", "tidak teratur"]'::jsonb, 5)
    ON CONFLICT DO NOTHING;

    -- Soal 5
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q5_id,
        cat2_id,
        'Kebiasaan baik apa yang paling membantu siswa memahami pelajaran?',
        2,
        'Belajar sedikit demi sedikit namun konsisten jauh lebih efektif daripada sistem kebut semalam (SKS).',
        '["Bagaimana cara menjaga fokus saat suasana di rumah sedang ramai?", "Apakah kalian lebih suka belajar sendiri atau berkelompok? Mengapa?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

    -- Jawaban Soal 5
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order)
    VALUES
        (q5_id, 'Mencatat poin penting dengan bahasa sendiri', 36, '["mencatat", "merangkum", "catatan rapi"]'::jsonb, 1),
        (q5_id, 'Mengulang materi 15 menit setiap malam', 29, '["mengulang", "review materi", "belajar rutin"]'::jsonb, 2),
        (q5_id, 'Berani bertanya pada guru saat belum paham', 18, '["bertanya", "aktif di kelas", "tanya guru"]'::jsonb, 3),
        (q5_id, 'Mengerjakan latihan soal mandiri', 12, '["latihan soal", "mengerjakan pr", "kuis mandiri"]'::jsonb, 4),
        (q5_id, 'Menjelaskan materi ke teman sebangku', 5, '["mengajari teman", "diskusi teman", "belajar bersama"]'::jsonb, 5)
    ON CONFLICT DO NOTHING;

END $$;
