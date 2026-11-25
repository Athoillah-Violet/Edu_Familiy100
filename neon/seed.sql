-- ==============================================================================
-- SEED DATA AWAL: FAMILY 100 BK (6 PAKET MATERI BIMBINGAN KONSELING)
-- Database: Neon PostgreSQL
-- Idempoten: Aman dijalankan berulang kali tanpa merusak data yang sudah ada
-- ==============================================================================

DO $$
DECLARE
    cat1_id UUID := '00000000-0000-0000-0000-000000000001';
    cat2_id UUID := '00000000-0000-0000-0000-000000000002';
    cat3_id UUID := '00000000-0000-0000-0000-000000000003';
    cat4_id UUID := '00000000-0000-0000-0000-000000000004';
    cat5_id UUID := '00000000-0000-0000-0000-000000000005';
    cat6_id UUID := '00000000-0000-0000-0000-000000000006';

    q101_id UUID := '00000000-0000-0000-0000-000000000101';
    q102_id UUID := '00000000-0000-0000-0000-000000000102';
    q103_id UUID := '00000000-0000-0000-0000-000000000103';

    q201_id UUID := '00000000-0000-0000-0000-000000000201';
    q202_id UUID := '00000000-0000-0000-0000-000000000202';
    q203_id UUID := '00000000-0000-0000-0000-000000000203';

    q301_id UUID := '00000000-0000-0000-0000-000000000301';
    q302_id UUID := '00000000-0000-0000-0000-000000000302';
    q303_id UUID := '00000000-0000-0000-0000-000000000303';

    q401_id UUID := '00000000-0000-0000-0000-000000000401';
    q402_id UUID := '00000000-0000-0000-0000-000000000402';
    q403_id UUID := '00000000-0000-0000-0000-000000000403';

    q501_id UUID := '00000000-0000-0000-0000-000000000501';
    q502_id UUID := '00000000-0000-0000-0000-000000000502';
    q503_id UUID := '00000000-0000-0000-0000-000000000503';

    q601_id UUID := '00000000-0000-0000-0000-000000000601';
    q602_id UUID := '00000000-0000-0000-0000-000000000602';
    q603_id UUID := '00000000-0000-0000-0000-000000000603';
BEGIN

    -- =========================================================================
    -- PAKET 1: Anti-Perundungan & Empati Sosial
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat1_id,
        'Anti-Perundungan & Empati Sosial',
        'Topik pembelajaran seputar membangun empati, mengenali tanda perundungan (bullying), dan tindakan bijak saat melihat teman disakiti.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 1.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q101_id,
        cat1_id,
        'Apa yang sebaiknya dilakukan siswa saat melihat teman diejek di depan kelas?',
        1,
        'Menjadi pelindung bagi teman (upstander) lebih bermakna daripada sekadar diam menonton (bystander). Keberanian kecil kita bisa menyelamatkan harga diri orang lain.',
        '["Mengapa sebagian siswa memilih diam saat melihat temannya diejek?", "Bagaimana cara menegur teman yang mengejek tanpa memicu pertengkaran baru?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q101_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q101_id, 'Menemani dan menenangkan korban', 38, '["temani", "hibur", "dampingi", "bicara", "merangkul"]'::jsonb, 1),
        (q101_id, 'Menegur pelaku dengan sopan dan tegas', 26, '["tegur", "ingatkan", "nasihati", "hentikan"]'::jsonb, 2),
        (q101_id, 'Melapor ke guru BK atau wali kelas', 20, '["lapor guru", "beri tahu wali kelas", "panggil guru", "konselor"]'::jsonb, 3),
        (q101_id, 'Mengajak korban pergi dari lokasi', 11, '["ajak pergi", "bawa pergi", "hindari", "selamatkan"]'::jsonb, 4),
        (q101_id, 'Tidak ikut tertawa atau menyoraki', 5, '["jangan tertawa", "diam tidak ikut", "tidak bersorak", "jangan tonton"]'::jsonb, 5);

    -- Soal 1.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q102_id,
        cat1_id,
        'Sebutkan tanda atau ciri seseorang memiliki sikap empati yang tinggi!',
        2,
        'Empati adalah kemampuan menempatkan diri pada posisi orang lain. Mendengarkan dengan hati adalah wujud empati paling sederhana yang bisa kita lakukan setiap hari.',
        '["Apa bedanya mendengarkan sekadar merespons dengan mendengarkan untuk memahami?", "Bagaimana empati membantu kelas menjadi lebih damai dan kompak?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q102_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q102_id, 'Mendengarkan curhat tanpa menyela', 35, '["mendengar", "menyimak", "pendengar baik"]'::jsonb, 1),
        (q102_id, 'Bisa merasakan kesedihan teman', 28, '["peka", "peduli perasaan", "merasakan", "peduli"]'::jsonb, 2),
        (q102_id, 'Menawarkan bantuan tanpa diminta', 19, '["menolong", "bantu", "ringan tangan"]'::jsonb, 3),
        (q102_id, 'Menghargai perbedaan pendapat', 12, '["toleransi", "tidak memaksakan", "menghargai"]'::jsonb, 4),
        (q102_id, 'Tidak menghakimi kesalahan teman', 6, '["tidak ngejudge", "memaafkan", "memahami"]'::jsonb, 5);

    -- Soal 1.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q103_id,
        cat1_id,
        'Apa dampak buruk dari perundungan siber (cyberbullying) bagi remaja?',
        3,
        'Jejak digital itu nyata dan dampaknya bagi kesehatan mental teman kita bisa bertahan lama. Jadilah pengguna internet yang menyebarkan kebaikan.',
        '["Mengapa di media sosial orang lebih mudah berkomentar jahat?", "Langkah apa yang perlu diambil jika kita menjadi sasaran komentar jahat di medsos?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q103_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q103_id, 'Rasa cemas dan takut berlebihan', 34, '["cemas", "takut", "trauma", "gelisah"]'::jsonb, 1),
        (q103_id, 'Menarik diri dari pergaulan sosial', 27, '["mengurung diri", "minder", "tidak mau keluar", "isolasi"]'::jsonb, 2),
        (q103_id, 'Prestasi belajar di sekolah menurun', 21, '["nilai turun", "tidak fokus", "malas belajar"]'::jsonb, 3),
        (q103_id, 'Hilang rasa percaya diri', 13, '["minder", "tidak percaya diri", "merasa buruk", "insecure"]'::jsonb, 4),
        (q103_id, 'Gangguan tidur atau sulit istirahat', 5, '["insomnia", "sulit tidur", "stres", "begadang"]'::jsonb, 5);


    -- =========================================================================
    -- PAKET 2: Manajemen Waktu & Belajar Efektif
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat2_id,
        'Manajemen Waktu & Belajar Efektif',
        'Materi bimbingan belajar untuk melatih disiplin diri, mengurangi kebiasaan menunda tugas (prokrastinasi), dan mencapai cita-cita.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 2.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q201_id,
        cat2_id,
        'Apa penyebab utama siswa sering menunda-nunda mengerjakan tugas sekolah?',
        1,
        'Menunda pekerjaan sering kali bukan karena malas, tetapi karena cemas tugasnya terlalu sulit. Mulailah dari 5 menit pertama!',
        '["Tugas apa yang paling sering kalian tunda?", "Trik apa yang paling ampuh bagi kalian untuk mulai mengerjakan tugas?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q201_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q201_id, 'Asyik bermain HP atau scrolling medsos', 42, '["main hp", "main game", "medsos", "tiktok", "gadget"]'::jsonb, 1),
        (q201_id, 'Merasa tugas terlalu sulit atau bingung', 25, '["sulit", "tidak paham", "bingung", "rumit"]'::jsonb, 2),
        (q201_id, 'Merasa batas waktu (deadline) masih lama', 18, '["deadline lama", "masih santai", "nanti saja"]'::jsonb, 3),
        (q201_id, 'Kelelahan setelah pulang sekolah', 10, '["capek", "lelah", "mengantuk", "kurang energi"]'::jsonb, 4),
        (q201_id, 'Tidak memiliki jadwal belajar yang jelas', 5, '["tidak ada jadwal", "lupa", "tidak teratur"]'::jsonb, 5);

    -- Soal 2.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q202_id,
        cat2_id,
        'Kebiasaan baik apa yang paling membantu siswa memahami pelajaran?',
        2,
        'Belajar sedikit demi sedikit namun konsisten jauh lebih efektif daripada sistem kebut semalam (SKS).',
        '["Bagaimana cara menjaga fokus saat suasana di rumah sedang ramai?", "Apakah kalian lebih suka belajar sendiri atau berkelompok? Mengapa?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q202_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q202_id, 'Mencatat poin penting dengan bahasa sendiri', 36, '["mencatat", "merangkum", "catatan rapi", "mind map"]'::jsonb, 1),
        (q202_id, 'Mengulang materi 15 menit setiap malam', 29, '["mengulang", "review materi", "belajar rutin", "konsisten"]'::jsonb, 2),
        (q202_id, 'Berani bertanya pada guru saat belum paham', 18, '["bertanya", "aktif di kelas", "tanya guru", "tidak malu"]'::jsonb, 3),
        (q202_id, 'Mengerjakan latihan soal mandiri', 12, '["latihan soal", "mengerjakan pr", "kuis mandiri"]'::jsonb, 4),
        (q202_id, 'Menjelaskan materi ke teman sebangku', 5, '["mengajari teman", "diskusi teman", "belajar bersama"]'::jsonb, 5);

    -- Soal 2.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q203_id,
        cat2_id,
        'Strategi apa yang ampuh menghindari godaan distraksi smartphone saat jam belajar?',
        2,
        'Menciptakan lingkungan yang kondusif adalah kunci fokus. Jauhkan godaan sebelum godaan tersebut menguras konsentrasi kita.',
        '["Berapa lama rata-rata kalian bisa fokus tanpa mengecek HP?", "Fitur apa di ponsel yang paling membantu membatasi screen time?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q203_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q203_id, 'Menyalakan mode hening atau pesawat', 35, '["silent", "mode hening", "mode pesawat", "do not disturb"]'::jsonb, 1),
        (q203_id, 'Menaruh HP di luar kamar atau tempat jauh', 28, '["jauhkan hp", "taruh di luar", "simpan di laci"]'::jsonb, 2),
        (q203_id, 'Memasang timer teknik belajar Pomodoro', 20, '["pomodoro", "pasang timer", "atur waktu fokus"]'::jsonb, 3),
        (q203_id, 'Mematikan notifikasi media sosial', 12, '["matikan notif", "nonaktifkan aplikasi", "hapus distraksi"]'::jsonb, 4),
        (q203_id, 'Menitipkan HP ke orang tua selama belajar', 5, '["titip orang tua", "minta tolong ibu", "titipkan"]'::jsonb, 5);


    -- =========================================================================
    -- PAKET 3: Regulasi Emosi & Manajemen Stres
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat3_id,
        'Regulasi Emosi & Manajemen Stres',
        'Materi bimbingan pribadi untuk melatih kecerdasan emosional, cara sehat meredakan amarah, serta mengelola tekanan belajar.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 3.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q301_id,
        cat3_id,
        'Cara sehat dan positif apa yang paling efektif saat merasa sangat marah atau kesal?',
        1,
        'Marah adalah emosi wajar, namun cara mengekspresikannya adalah pilihan kita. Kendalikan respon agar tidak menyakiti diri sendiri dan orang lain.',
        '["Apa yang biasanya terjadi jika amarah dipendam terlalu lama?", "Mengapa menarik napas dalam bisa membantu menenangkan detak jantung saat marah?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q301_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q301_id, 'Menarik napas dalam-dalam dan berhitung 1-10', 36, '["tarik napas", "relaksasi napas", "hitung 1 sampai 10", "tenang"]'::jsonb, 1),
        (q301_id, 'Mengambil jeda menjauh dari situasi pemicu', 26, '["time out", "menjauh sebentar", "diam sejenak", "menyendiri"]'::jsonb, 2),
        (q301_id, 'Menuliskan isi hati di buku jurnal pribadi', 18, '["journaling", "menulis diary", "menulis curahan hati"]'::jsonb, 3),
        (q301_id, 'Berolahraga atau bergerak aktif', 12, '["olahraga", "jalan kaki", "lari", "bersepeda"]'::jsonb, 4),
        (q301_id, 'Mendengarkan musik yang menenangkan', 8, '["dengar musik", "lagu santai", "musik instrumental"]'::jsonb, 5);

    -- Soal 3.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q302_id,
        cat3_id,
        'Apa tanda-tanda yang dialami tubuh ketika seseorang sedang mengalami stres berat?',
        2,
        'Tubuh kita selalu memberi sinyal saat kelelahan mental melanda. Kenali gejalanya lebih awal agar bisa segera beristirahat.',
        '["Bagaimana kalian membedakan lelah biasa karena fisik dengan lelah karena stres pikiran?", "Kepada siapa kalian biasanya bercerita saat merasa overwhelmed?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q302_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q302_id, 'Sakit kepala atau pusing terus-menerus', 34, '["pusing", "sakit kepala", "migrain", "kepala berat"]'::jsonb, 1),
        (q302_id, 'Nafsu makan menurun atau justru berlebihan', 25, '["susah makan", "makan terus", "tidak nafsu makan", "maag"]'::jsonb, 2),
        (q302_id, 'Sulit tidur nyenyak atau sering terbangun', 20, '["insomnia", "sulit tidur", "tidur tidak nyenyak", "gelisah"]'::jsonb, 3),
        (q302_id, 'Mudah tersinggung dan gampang menangis', 14, '["sensitif", "mudah marah", "emosional", "gampang sedih"]'::jsonb, 4),
        (q302_id, 'Badan pegal-pegal dan terasa kaku', 7, '["otot tegang", "pegal", "badan lemas", "letih"]'::jsonb, 5);

    -- Soal 3.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q303_id,
        cat3_id,
        'Kegiatan me time atau relaksasi apa yang cocok bagi remaja untuk recharge energi positif?',
        2,
        'Istirahat bukan berarti malas; istirahat adalah bagian penting dari persiapan untuk berkarya lebih baik.',
        '["Apa kegiatan akhir pekan favorit kalian yang paling membuat pikiran kembali fresh?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q303_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q303_id, 'Tidur cukup dan berkualitas tanpa gangguan', 35, '["tidur cukup", "istirahat tidur", "tidur nyenyak"]'::jsonb, 1),
        (q303_id, 'Menekuni hobi kreatif seperti menggambar atau memasak', 27, '["hobi", "menggambar", "memasak", "melukis", "bermusik"]'::jsonb, 2),
        (q303_id, 'Menghabiskan waktu santai bersama keluarga atau hewan peliharaan', 18, '["kumpul keluarga", "main sama kucing", "family time"]'::jsonb, 3),
        (q303_id, 'Jalan-jalan menikmati udara luar ruangan atau alam', 13, '["jalan sore", "taman", "ke alam", "piknik santai"]'::jsonb, 4),
        (q303_id, 'Detoksifikasi gawai atau membatasi media sosial seharian', 7, '["detoks medsos", "tanpa gadget", "offline day"]'::jsonb, 5);


    -- =========================================================================
    -- PAKET 4: Komunikasi Asertif & Resolusi Konflik
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat4_id,
        'Komunikasi Asertif & Resolusi Konflik',
        'Materi bimbingan sosial untuk melatih keberanian berpendapat secara santun, berkata tidak pada ajakan buruk, dan menyelesaikan perselisihan.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 4.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q401_id,
        cat4_id,
        'Bagaimana cara menolak ajakan teman yang merugikan tanpa menyakiti perasaan mereka?',
        1,
        'Asertif berarti menghargai kebutuhan diri sendiri tanpa meremehkan martabat orang lain. Katakan tidak pada perilakunya, bukan memusuhi orangnya.',
        '["Mengapa sering kali kita merasa tidak enakan menolak ajakan teman sebaya?", "Bagaimana cara mempertahankan prinsip diri saat ditekan kelompok?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q401_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q401_id, 'Menyampaikan alasan jujur dengan nada tenang', 36, '["jujur", "tenang", "alasan jelas", "bicara sopan"]'::jsonb, 1),
        (q401_id, 'Mengucapkan terima kasih lalu menolak dengan sopan', 26, '["terima kasih tapi maaf", "tolak halus", "sopan santun"]'::jsonb, 2),
        (q401_id, 'Menawarkan alternatif kegiatan lain yang positif', 18, '["tawarkan opsi lain", "ganti kegiatan", "alternatif sehat"]'::jsonb, 3),
        (q401_id, 'Tegas pada batasan diri tanpa ragu-ragu', 12, '["tegas", "punya prinsip", "tidak bimbang", "konsisten"]'::jsonb, 4),
        (q401_id, 'Menghindari menyalahkan atau menceramahi teman', 8, '["jangan menggurui", "tidak menghakimi", "fokus pada alasan diri"]'::jsonb, 5);

    -- Soal 4.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q402_id,
        cat4_id,
        'Langkah pertama apa yang paling bijak saat terjadi kesalahpahaman dengan teman dekat?',
        2,
        'Komunikasi langsung secara tatap muka mampu mencegah spekulasi dan prasangka buruk yang merusak ikatan pertemanan.',
        '["Mengapa menyelesaikan masalah lewat pesan teks (chat) sering memperkeruh suasana?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q402_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q402_id, 'Mengajak bicara empat mata secara langsung', 38, '["bicara langsung", "empat mata", "ketemu langsung", "tabayyun"]'::jsonb, 1),
        (q402_id, 'Mendengarkan penjelasan teman dari sudut pandangnya', 26, '["dengarkan penjelasan", "melihat sisi dia", "tabayun", "klarifikasi"]'::jsonb, 2),
        (q402_id, 'Tidak menyindir di status atau story media sosial', 17, '["jangan sindir", "tidak bikin story", "stop sindiran online"]'::jsonb, 3),
        (q402_id, 'Berani meminta maaf jika diri kita keliru', 12, '["minta maaf duluan", "akui kesalahan", "lapang dada"]'::jsonb, 4),
        (q402_id, 'Meminta bantuan pihak netral seperti guru BK jika buntu', 7, '["minta mediasi", "konselor", "guru bk", "mediator"]'::jsonb, 5);

    -- Soal 4.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q403_id,
        cat4_id,
        'Ciri komunikasi yang saling menghargai saat berdiskusi di dalam kelompok belajar?',
        2,
        'Diskusi yang sehat adalah tempat bertukar gagasan, bukan ajang mencari siapa yang paling unggul.',
        '["Apa yang harus dilakukan jika gagasan kita tidak terpilih oleh kelompok?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q403_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q403_id, 'Menunggu giliran bicara tanpa memotong ucapan teman', 37, '["tidak memotong", "menunggu giliran", "tertib bicara"]'::jsonb, 1),
        (q403_id, 'Mengkritik idenya bukan menyerang pribadinya', 27, '["kritik ide", "bukan personal", "fokus topik"]'::jsonb, 2),
        (q403_id, 'Mengapresiasi masukan teman sebelum memberi sanggahan', 18, '["apresiasi", "hargai pendapat", "terima kasih masukannya"]'::jsonb, 3),
        (q403_id, 'Menggunakan bahasa yang santun dan nada ramah', 11, '["bahasa santun", "nada ramah", "tidak membentak"]'::jsonb, 4),
        (q403_id, 'Mau menerima mufakat demi tujuan kelompok', 7, '["kompromi", "mufakat", "lapang dada kelompok"]'::jsonb, 5);


    -- =========================================================================
    -- PAKET 5: Perencanaan Karier & Mengenali Minat Bakat
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat5_id,
        'Perencanaan Karier & Mengenali Minat Bakat',
        'Materi bimbingan karier untuk membantu siswa mengenali potensi unik, merencanakan studi lanjut, dan menyiapkan masa depan.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 5.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q501_id,
        cat5_id,
        'Cara paling efektif untuk mengetahui minat dan bakat sejati di usia remaja?',
        1,
        'Minat tumbuh seiring pengalaman. Jangan ragu mencoba hal baru dan terlibat aktif dalam kegiatan sekolah.',
        '["Apa kegiatan yang membuatmu lupa waktu saat mengerjakannya?", "Bagaimana ekstrakurikuler membantu kalian menemukan passion?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q501_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q501_id, 'Mencoba berbagai ekstrakurikuler dan kegiatan positif', 36, '["ekskul", "ikut kegiatan", "coba hal baru", "organisasi"]'::jsonb, 1),
        (q501_id, 'Konsultasi dan tes minat bakat dengan guru BK', 27, '["tes minat bakat", "tanya guru bk", "asesmen", "konseling bk"]'::jsonb, 2),
        (q501_id, 'Memperhatikan hobi yang paling dinikmati saat luang', 19, '["hobi", "hal yang disukai", "passion", "kegemaran"]'::jsonb, 3),
        (q501_id, 'Meminta masukan objektif dari orang tua dan sahabat', 11, '["tanya orang tua", "pendapat sahabat", "refleksi teman"]'::jsonb, 4),
        (q501_id, 'Mengikuti perlombaan atau proyek karya mandiri', 7, '["lomba", "bikin proyek", "portofolio", "kompetisi"]'::jsonb, 5);

    -- Soal 5.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q502_id,
        cat5_id,
        'Pertimbangan utama saat memilih jurusan sekolah lanjutan (SMA, SMK, atau MA)?',
        2,
        'Pilihlah jalur masa depan berdasarkan potensi dan cita-cita pribadi, bukan sekadar mengikuti tren teman sebaya.',
        '["Apa perbedaan mendasar antara melanjutkan ke SMA dengan SMK?", "Bagaimana menyelaraskan cita-cita pribadi dengan harapan orang tua?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q502_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q502_id, 'Kesesuaian dengan cita-cita masa depan', 38, '["cita-cita", "tujuan masa depan", "visi karier"]'::jsonb, 1),
        (q502_id, 'Kemampuan akademik dan mata pelajaran favorit', 25, '["nilai akademik", "mapel favorit", "kemampuan diri"]'::jsonb, 2),
        (q502_id, 'Rencana lanjut kuliah atau langsung bekerja', 18, '["kuliah", "kerja", "jenjang karier", "rencana jangka panjang"]'::jsonb, 3),
        (q502_id, 'Kondisi finansial dan restu dari keluarga', 12, '["restu orang tua", "finansial", "dukungan keluarga"]'::jsonb, 4),
        (q502_id, 'Prospek peluang kerja di masa mendatang', 7, '["peluang kerja", "kebutuhan industri", "masa depan cerah"]'::jsonb, 5);

    -- Soal 5.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q503_id,
        cat5_id,
        'Keterampilan non-teknis (soft skills) yang paling dicari untuk sukses di era modern?',
        3,
        'Kecerdasan akademik membuka pintu kesempatan, tetapi karakter dan keterampilan sosiallah yang mengantarkan kita ke puncak kesuksesan.',
        '["Mengapa kemampuan bekerja sama dalam tim sangat penting di dunia kerja?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q503_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q503_id, 'Kemampuan komunikasi lisan dan tulisan yang baik', 34, '["komunikasi", "public speaking", "bicara lugas"]'::jsonb, 1),
        (q503_id, 'Kerja sama tim dan kolaborasi yang solid', 26, '["kolaborasi", "teamwork", "kerja sama", "kompak"]'::jsonb, 2),
        (q503_id, 'Kemampuan berpikir kritis dan pemecahan masalah', 20, '["critical thinking", "problem solving", "berpikir kritis", "solusi"]'::jsonb, 3),
        (q503_id, 'Kemampuan adaptasi dan cepat belajar hal baru', 13, '["adaptasi", "fleksibel", "kemauan belajar", "growth mindset"]'::jsonb, 4),
        (q503_id, 'Integritas moral, kejujuran, dan kedisiplinan', 7, '["jujur", "disiplin", "integritas", "tanggung jawab"]'::jsonb, 5);


    -- =========================================================================
    -- PAKET 6: Literasi Digital & Etika Bermedia Sosial
    -- =========================================================================
    INSERT INTO public.categories (id, title, description, is_published)
    VALUES (
        cat6_id,
        'Literasi Digital & Etika Bermedia Sosial',
        'Materi bimbingan pribadi dan sosial mengenai bijak bermedsos, menjaga privasi akun, menyaring kabar hoaks, dan jejak digital positif.',
        true
    ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_published = EXCLUDED.is_published;

    -- Soal 6.1
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q601_id,
        cat6_id,
        'Informasi pribadi apa saja yang pantang disebarkan secara terbuka di media sosial?',
        1,
        'Keamanan siber dimulai dari perlindungan privasi diri sendiri. Sekali terunggah ke internet, informasi sulit ditarik kembali seutuhnya.',
        '["Bahaya apa yang mengintai jika alamat rumah atau nomor telepon disebar di medsos?", "Mengapa tiket perjalanan atau kartu identitas tidak boleh dipamerkan?"]'::jsonb,
        1
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q601_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q601_id, 'Nomor identitas (NIK / KK / Kartu Pelajar)', 37, '["nik", "kartu pelajar", "kk", "identitas", "ktp"]'::jsonb, 1),
        (q601_id, 'Alamat lengkap rumah dan lokasi live realtime', 28, '["alamat rumah", "share location", "lokasi rumah", "tempat tinggal"]'::jsonb, 2),
        (q601_id, 'Kata sandi akun dan kode OTP verifikasi', 19, '["password", "kata sandi", "otp", "kode rahasia"]'::jsonb, 3),
        (q601_id, 'Nomor telepon pribadi dan WhatsApp', 11, '["nomor hp", "telepon", "no wa", "whatsapp"]'::jsonb, 4),
        (q601_id, 'Kondisi konflik internal dalam keluarga', 5, '["masalah keluarga", "curhat aib", "rahasia pribadi"]'::jsonb, 5);

    -- Soal 6.2
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q602_id,
        cat6_id,
        'Langkah kritis apa yang wajib dilakukan saat menerima pesan viral yang meragukan?',
        2,
        'Saring sebelum sharing! Menjadi netizen cerdas berarti tidak mudah terprovokasi oleh judul bombastis sebelum mengecek fakta resminya.',
        '["Mengapa berita hoaks sering kali memakai judul yang memancing emosi atau kepanikan?"]'::jsonb,
        2
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q602_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q602_id, 'Memeriksa kebenaran ke sumber berita resmi terpercaya', 38, '["cek sumber resmi", "verifikasi", "media kredibel", "fakta"]'::jsonb, 1),
        (q602_id, 'Tidak langsung menyebarkan atau meneruskan pesan', 26, '["jangan sebar", "stop di kita", "saring sebelum sharing"]'::jsonb, 2),
        (q602_id, 'Membaca keseluruhan isi bukan hanya judul clickbait', 18, '["baca tuntas", "baca lengkap", "jangan cuma judul"]'::jsonb, 3),
        (q602_id, 'Memeriksa tanggal dan konteks foto atau video', 11, '["cek tanggal", "cek keaslian foto", "konteks waktu"]'::jsonb, 4),
        (q602_id, 'Menanyakan ke orang tua atau guru jika ragu', 7, '["tanya guru", "tanya orang tua", "minta pandangan dewasa"]'::jsonb, 5);

    -- Soal 6.3
    INSERT INTO public.questions (id, category_id, question_text, multiplier, reflection_note, discussion_prompts, sort_order)
    VALUES (
        q603_id,
        cat6_id,
        'Bagaimana cara memanfaatkan media sosial untuk membangun rekam jejak digital yang positif?',
        2,
        'Jejak digitalmu adalah cerminan karaktermu di masa depan. Buatlah karya dan inspirasi yang membuatmu bangga.',
        '["Bagaimana jejak digital seseorang bisa memengaruhi seleksi beasiswa atau pekerjaan di masa depan?"]'::jsonb,
        3
    ) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, reflection_note = EXCLUDED.reflection_note, discussion_prompts = EXCLUDED.discussion_prompts;

    DELETE FROM public.answers WHERE question_id = q603_id;
    INSERT INTO public.answers (question_id, answer_text, points, keywords, sort_order) VALUES
        (q603_id, 'Membagikan karya hobi prestasi atau bakat positif', 36, '["posting karya", "prestasi", "portofolio", "karya seni"]'::jsonb, 1),
        (q603_id, 'Menyebarkan informasi edukatif dan konten inspiratif', 27, '["konten edukasi", "tips bermanfaat", "inspirasi", "kebaikan"]'::jsonb, 2),
        (q603_id, 'Memberikan komentar yang ramah santun dan membangun', 19, '["komentar sopan", "apresiasi orang lain", "positive comment"]'::jsonb, 3),
        (q603_id, 'Mengikuti akun komunitas belajar dan pengembangan diri', 11, '["follow akun edukasi", "grup belajar", "komunitas positif"]'::jsonb, 4),
        (q603_id, 'Mendukung kampanye sosial dan aksi peduli sesama', 7, '["kampanye sosial", "donasi", "peduli lingkungan", "volunteering"]'::jsonb, 5);

END $$;
