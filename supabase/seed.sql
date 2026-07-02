-- ============================================================
-- Lingullio - Seed Data for Development
-- Run with: supabase db seed or manually
-- ============================================================

-- ============================================================
-- COURSES (HSK 1-9)
-- ============================================================

INSERT INTO public.courses (id, exam_type, slug, status, version) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'HSK', 'hsk-1', 'published', 1),
  ('a0000000-0000-0000-0000-000000000002', 'HSK', 'hsk-2', 'published', 1),
  ('a0000000-0000-0000-0000-000000000003', 'HSK', 'hsk-3', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000004', 'HSK', 'hsk-4', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000005', 'HSK', 'hsk-5', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000006', 'HSK', 'hsk-6', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000007', 'HSK', 'hsk-7', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000008', 'HSK', 'hsk-8', 'draft', 1),
  ('a0000000-0000-0000-0000-000000000009', 'HSK', 'hsk-9', 'draft', 1);

-- Course translations (FR + EN for published courses)
INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'fr', 'HSK 1', 'Preparation complete au HSK niveau 1. 500 mots, 150 caracteres, grammaire de base.'),
  ('a0000000-0000-0000-0000-000000000001', 'en', 'HSK 1', 'Complete HSK Level 1 preparation. 500 words, 150 characters, basic grammar.'),
  ('a0000000-0000-0000-0000-000000000002', 'fr', 'HSK 2', 'Preparation complete au HSK niveau 2. 1272 mots, 300 caracteres, grammaire elementaire.'),
  ('a0000000-0000-0000-0000-000000000002', 'en', 'HSK 2', 'Complete HSK Level 2 preparation. 1272 words, 300 characters, elementary grammar.'),
  ('a0000000-0000-0000-0000-000000000003', 'fr', 'HSK 3', 'Preparation complete au HSK niveau 3. 2245 mots, 600 caracteres, grammaire intermediaire.'),
  ('a0000000-0000-0000-0000-000000000003', 'en', 'HSK 3', 'Complete HSK Level 3 preparation. 2245 words, 600 characters, intermediate grammar.');

-- ============================================================
-- MODULES for HSK 1
-- ============================================================

INSERT INTO public.modules (id, course_id, sort_order, status, estimated_duration_minutes) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'published', 120),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2, 'published', 150),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 3, 'published', 180);

INSERT INTO public.module_translations (module_id, locale, title, description, objectives) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'fr', 'Les bases du chinois', 'Decouvrez les fondamentaux : pinyin, tons, premiers caracteres et salutations.', '["Maitriser le systeme pinyin", "Reconnaitre les 4 tons", "Ecrire les 20 premiers caracteres", "Se presenter en chinois"]'),
  ('b0000000-0000-0000-0000-000000000001', 'en', 'Chinese basics', 'Discover the fundamentals: pinyin, tones, first characters and greetings.', '["Master the pinyin system", "Recognize the 4 tones", "Write the first 20 characters", "Introduce yourself in Chinese"]'),
  ('b0000000-0000-0000-0000-000000000002', 'fr', 'La vie quotidienne', 'Parlez de votre quotidien : famille, nourriture, nombres et dates.', '["Presenter sa famille", "Commander au restaurant", "Compter jusqu''a 100", "Dire la date et l''heure"]'),
  ('b0000000-0000-0000-0000-000000000002', 'en', 'Daily life', 'Talk about your daily life: family, food, numbers and dates.', '["Introduce your family", "Order at a restaurant", "Count to 100", "Say the date and time"]'),
  ('b0000000-0000-0000-0000-000000000003', 'fr', 'Communication essentielle', 'Exprimez-vous dans les situations courantes : transport, achats, directions.', '["Demander son chemin", "Faire des achats", "Prendre les transports", "Exprimer des preferences"]'),
  ('b0000000-0000-0000-0000-000000000003', 'en', 'Essential communication', 'Express yourself in common situations: transport, shopping, directions.', '["Ask for directions", "Go shopping", "Use public transport", "Express preferences"]');

-- ============================================================
-- LESSONS for Module 1
-- ============================================================

INSERT INTO public.lessons (id, module_id, sort_order, lesson_type, status, estimated_duration_minutes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'standard', 'published', 25),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 2, 'standard', 'published', 30),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 3, 'practice', 'published', 20),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 4, 'review', 'published', 15);

INSERT INTO public.lesson_translations (lesson_id, locale, title, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'fr', 'Le systeme pinyin', 'Decouvrez le pinyin, le systeme de romanisation du chinois mandarin.'),
  ('c0000000-0000-0000-0000-000000000001', 'en', 'The pinyin system', 'Discover pinyin, the romanization system for Mandarin Chinese.'),
  ('c0000000-0000-0000-0000-000000000002', 'fr', 'Les quatre tons', 'Apprenez a distinguer et prononcer les quatre tons du chinois.'),
  ('c0000000-0000-0000-0000-000000000002', 'en', 'The four tones', 'Learn to distinguish and pronounce the four tones of Chinese.'),
  ('c0000000-0000-0000-0000-000000000003', 'fr', 'Pratique : pinyin et tons', 'Exercices de reconnaissance et prononciation.'),
  ('c0000000-0000-0000-0000-000000000003', 'en', 'Practice: pinyin and tones', 'Recognition and pronunciation exercises.'),
  ('c0000000-0000-0000-0000-000000000004', 'fr', 'Revision du module 1', 'Revisez les concepts cles du module.'),
  ('c0000000-0000-0000-0000-000000000004', 'en', 'Module 1 review', 'Review the key concepts of the module.');

-- ============================================================
-- SAMPLE VOCABULARY (HSK 1 first 20 words)
-- ============================================================

INSERT INTO public.vocabulary_items (id, simplified, traditional, pinyin, hsk_level, frequency_rank, word_type, theme, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', '你', NULL, 'ni3', '1', 1, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000002', '好', NULL, 'hao3', '1', 2, 'adjective', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000003', '我', NULL, 'wo3', '1', 3, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000004', '是', NULL, 'shi4', '1', 4, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000005', '的', NULL, 'de', '1', 5, 'particle', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000006', '了', NULL, 'le', '1', 6, 'particle', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000007', '不', NULL, 'bu4', '1', 7, 'adverb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000008', '在', NULL, 'zai4', '1', 8, 'preposition', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000009', '人', NULL, 'ren2', '1', 9, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000010', '有', NULL, 'you3', '1', 10, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000011', '他', NULL, 'ta1', '1', 11, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000012', '这', NULL, 'zhe4', '1', 12, 'pronoun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000013', '中', NULL, 'zhong1', '1', 13, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000014', '大', NULL, 'da4', '1', 14, 'adjective', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000015', '来', NULL, 'lai2', '1', 15, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000016', '上', NULL, 'shang4', '1', 16, 'preposition', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000017', '国', NULL, 'guo2', '1', 17, 'noun', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000018', '个', NULL, 'ge4', '1', 18, 'measure_word', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000019', '到', NULL, 'dao4', '1', 19, 'verb', 'basic', 'published'),
  ('d0000000-0000-0000-0000-000000000020', '说', NULL, 'shuo1', '1', 20, 'verb', 'basic', 'published');

-- Vocabulary translations (FR + EN)
INSERT INTO public.vocabulary_translations (vocabulary_id, locale, meaning, example_sentence, example_pinyin, example_translation) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'fr', 'tu, vous', '你好！', 'ni3 hao3', 'Bonjour !'),
  ('d0000000-0000-0000-0000-000000000001', 'en', 'you', '你好！', 'ni3 hao3', 'Hello!'),
  ('d0000000-0000-0000-0000-000000000002', 'fr', 'bon, bien', '很好', 'hen3 hao3', 'Tres bien'),
  ('d0000000-0000-0000-0000-000000000002', 'en', 'good, well', '很好', 'hen3 hao3', 'Very good'),
  ('d0000000-0000-0000-0000-000000000003', 'fr', 'je, moi', '我是学生。', 'wo3 shi4 xue2sheng', 'Je suis etudiant.'),
  ('d0000000-0000-0000-0000-000000000003', 'en', 'I, me', '我是学生。', 'wo3 shi4 xue2sheng', 'I am a student.'),
  ('d0000000-0000-0000-0000-000000000004', 'fr', 'etre', '他是老师。', 'ta1 shi4 lao3shi1', 'Il est professeur.'),
  ('d0000000-0000-0000-0000-000000000004', 'en', 'to be', '他是老师。', 'ta1 shi4 lao3shi1', 'He is a teacher.'),
  ('d0000000-0000-0000-0000-000000000005', 'fr', 'particule structurale', '我的书', 'wo3 de shu1', 'Mon livre'),
  ('d0000000-0000-0000-0000-000000000005', 'en', 'structural particle', '我的书', 'wo3 de shu1', 'My book'),
  ('d0000000-0000-0000-0000-000000000010', 'fr', 'avoir, il y a', '我有一本书。', 'wo3 you3 yi4 ben3 shu1', 'J''ai un livre.'),
  ('d0000000-0000-0000-0000-000000000010', 'en', 'to have, there is', '我有一本书。', 'wo3 you3 yi4 ben3 shu1', 'I have a book.');

-- ============================================================
-- SAMPLE GRAMMAR POINTS (HSK 1)
-- ============================================================

INSERT INTO public.grammar_points (id, pattern, hsk_level, sort_order, difficulty, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'S + 是 + N', '1', 1, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000002', 'S + 不 + V', '1', 2, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000003', 'S + 很 + Adj', '1', 3, 1, 'published'),
  ('e0000000-0000-0000-0000-000000000004', 'S + V + 了', '1', 4, 2, 'published'),
  ('e0000000-0000-0000-0000-000000000005', '在 + Place + V', '1', 5, 2, 'published');

INSERT INTO public.grammar_point_translations (grammar_point_id, locale, title, explanation_html, examples, common_errors) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'fr', 'Phrase avec 是 (etre)', '<p>Le verbe <strong>是</strong> (shi) est utilise pour identifier ou classifier. Equivalent de "etre" en francais.</p><p>Structure : Sujet + 是 + Nom</p>', '[{"zh": "我是学生。", "pinyin": "Wo shi xuesheng.", "translation": "Je suis etudiant."}, {"zh": "他是老师。", "pinyin": "Ta shi laoshi.", "translation": "Il est professeur."}]', '[{"error": "我是好。", "correction": "我很好。", "explanation": "On n''utilise pas 是 devant un adjectif. Utilisez 很 a la place."}]'),
  ('e0000000-0000-0000-0000-000000000001', 'en', 'Sentences with 是 (to be)', '<p>The verb <strong>是</strong> (shi) is used to identify or classify. Equivalent to "to be" in English.</p><p>Structure: Subject + 是 + Noun</p>', '[{"zh": "我是学生。", "pinyin": "Wo shi xuesheng.", "translation": "I am a student."}, {"zh": "他是老师。", "pinyin": "Ta shi laoshi.", "translation": "He is a teacher."}]', '[{"error": "我是好。", "correction": "我很好。", "explanation": "Do not use 是 before an adjective. Use 很 instead."}]'),
  ('e0000000-0000-0000-0000-000000000002', 'fr', 'Negation avec 不', '<p>La negation se forme en placant <strong>不</strong> (bu) avant le verbe ou l''adjectif.</p><p>Structure : Sujet + 不 + Verbe</p>', '[{"zh": "我不是老师。", "pinyin": "Wo bu shi laoshi.", "translation": "Je ne suis pas professeur."}, {"zh": "他不去。", "pinyin": "Ta bu qu.", "translation": "Il n''y va pas."}]', '[]'),
  ('e0000000-0000-0000-0000-000000000002', 'en', 'Negation with 不', '<p>Negation is formed by placing <strong>不</strong> (bu) before the verb or adjective.</p><p>Structure: Subject + 不 + Verb</p>', '[{"zh": "我不是老师。", "pinyin": "Wo bu shi laoshi.", "translation": "I am not a teacher."}, {"zh": "他不去。", "pinyin": "Ta bu qu.", "translation": "He is not going."}]', '[]');

-- ============================================================
-- SAMPLE CHARACTERS (HSK 1 first 10)
-- ============================================================

INSERT INTO public.characters (id, character, pinyin, radical, stroke_count, hsk_level, frequency_rank, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', '你', 'ni3', '亻', 7, '1', 1, 'published'),
  ('f0000000-0000-0000-0000-000000000002', '好', 'hao3', '女', 6, '1', 2, 'published'),
  ('f0000000-0000-0000-0000-000000000003', '我', 'wo3', '戈', 7, '1', 3, 'published'),
  ('f0000000-0000-0000-0000-000000000004', '是', 'shi4', '日', 9, '1', 4, 'published'),
  ('f0000000-0000-0000-0000-000000000005', '人', 'ren2', '人', 2, '1', 5, 'published'),
  ('f0000000-0000-0000-0000-000000000006', '大', 'da4', '大', 3, '1', 6, 'published'),
  ('f0000000-0000-0000-0000-000000000007', '中', 'zhong1', '丨', 4, '1', 7, 'published'),
  ('f0000000-0000-0000-0000-000000000008', '国', 'guo2', '囗', 8, '1', 8, 'published'),
  ('f0000000-0000-0000-0000-000000000009', '学', 'xue2', '子', 8, '1', 9, 'published'),
  ('f0000000-0000-0000-0000-000000000010', '生', 'sheng1', '生', 5, '1', 10, 'published');

INSERT INTO public.character_translations (character_id, locale, meaning, mnemonic) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'fr', 'tu, vous', 'Un personne (亻) debout avec le numero sept (七) en dessous'),
  ('f0000000-0000-0000-0000-000000000001', 'en', 'you', 'A person (亻) standing with the number seven (七) below'),
  ('f0000000-0000-0000-0000-000000000002', 'fr', 'bon, bien', 'Une femme (女) avec son enfant (子) : tout va bien'),
  ('f0000000-0000-0000-0000-000000000002', 'en', 'good, well', 'A woman (女) with her child (子): all is well'),
  ('f0000000-0000-0000-0000-000000000005', 'fr', 'personne, homme', 'Deux traits qui representent une personne debout'),
  ('f0000000-0000-0000-0000-000000000005', 'en', 'person, people', 'Two strokes representing a person standing'),
  ('f0000000-0000-0000-0000-000000000006', 'fr', 'grand', 'Une personne (人) avec les bras grands ouverts'),
  ('f0000000-0000-0000-0000-000000000006', 'en', 'big, large', 'A person (人) with arms spread wide open');

-- ============================================================
-- SAMPLE EXERCISES (HSK 1 Module 1 Lesson 1)
-- ============================================================

INSERT INTO public.exercises (id, lesson_id, exercise_type, difficulty, points, estimated_duration_seconds, skill_tags, hsk_level, sort_order, status) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'mcq', 1, 10, 30, '{vocabulary}', '1', 1, 'published'),
  ('a1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'mcq', 1, 10, 30, '{vocabulary}', '1', 2, 'published'),
  ('a1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'fill_blank', 1, 15, 45, '{grammar,vocabulary}', '1', 3, 'published'),
  ('a1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'matching', 1, 20, 60, '{vocabulary}', '1', 4, 'published'),
  ('a1000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'character_recognition', 1, 10, 20, '{characters}', '1', 5, 'published');

INSERT INTO public.exercise_translations (exercise_id, locale, prompt, instruction, explanation, hint) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'fr', 'Que signifie 你好 ?', 'Choisissez la bonne traduction.', '你好 (ni hao) est la salutation standard en chinois mandarin.', 'Pensez a une salutation courante.'),
  ('a1000000-0000-0000-0000-000000000001', 'en', 'What does 你好 mean?', 'Choose the correct translation.', '你好 (ni hao) is the standard greeting in Mandarin Chinese.', 'Think of a common greeting.'),
  ('a1000000-0000-0000-0000-000000000002', 'fr', 'Comment dit-on "je" en chinois ?', 'Choisissez le bon caractere.', '我 (wo) est le pronom de la premiere personne du singulier.', 'C''est l''un des premiers mots appris.'),
  ('a1000000-0000-0000-0000-000000000002', 'en', 'How do you say "I" in Chinese?', 'Choose the correct character.', '我 (wo) is the first person singular pronoun.', 'It is one of the first words learned.'),
  ('a1000000-0000-0000-0000-000000000003', 'fr', '我___学生。(Je suis etudiant.)', 'Completez avec le mot correct.', '是 (shi) est utilise pour identifier ou classifier, similaire a "etre".', 'Un verbe d''identification.'),
  ('a1000000-0000-0000-0000-000000000003', 'en', '我___学生。(I am a student.)', 'Complete with the correct word.', '是 (shi) is used to identify or classify, similar to "to be".', 'A verb of identification.');

-- Exercise options for MCQ exercises
INSERT INTO public.exercise_options (id, exercise_id, sort_order, is_correct) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 1, true),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 2, false),
  ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 3, false),
  ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 4, false),
  ('a2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 1, false),
  ('a2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 2, true),
  ('a2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 3, false),
  ('a2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 4, false);

INSERT INTO public.exercise_option_translations (option_id, locale, content, error_explanation) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'fr', 'Bonjour', NULL),
  ('a2000000-0000-0000-0000-000000000001', 'en', 'Hello', NULL),
  ('a2000000-0000-0000-0000-000000000002', 'fr', 'Au revoir', '再见 (zaijian) signifie "au revoir", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000002', 'en', 'Goodbye', '再见 (zaijian) means "goodbye", not 你好.'),
  ('a2000000-0000-0000-0000-000000000003', 'fr', 'Merci', '谢谢 (xiexie) signifie "merci", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000003', 'en', 'Thank you', '谢谢 (xiexie) means "thank you", not 你好.'),
  ('a2000000-0000-0000-0000-000000000004', 'fr', 'Pardon', '对不起 (duibuqi) signifie "pardon", pas 你好.'),
  ('a2000000-0000-0000-0000-000000000004', 'en', 'Sorry', '对不起 (duibuqi) means "sorry", not 你好.'),
  ('a2000000-0000-0000-0000-000000000005', 'fr', '他 (ta)', '他 signifie "il/lui", pas "je".'),
  ('a2000000-0000-0000-0000-000000000005', 'en', '他 (ta)', '他 means "he/him", not "I".'),
  ('a2000000-0000-0000-0000-000000000006', 'fr', '我 (wo)', NULL),
  ('a2000000-0000-0000-0000-000000000006', 'en', '我 (wo)', NULL),
  ('a2000000-0000-0000-0000-000000000007', 'fr', '你 (ni)', '你 signifie "tu/vous", pas "je".'),
  ('a2000000-0000-0000-0000-000000000007', 'en', '你 (ni)', '你 means "you", not "I".'),
  ('a2000000-0000-0000-0000-000000000008', 'fr', '她 (ta)', '她 signifie "elle", pas "je".'),
  ('a2000000-0000-0000-0000-000000000008', 'en', '她 (ta)', '她 means "she/her", not "I".');

-- ============================================================
-- ADMIN USER (for development only - will be created via Supabase Auth)
-- Note: In development, create this user via Supabase Auth first,
-- then update the auth_id field
-- ============================================================

-- Placeholder admin user (auth_id will be set after Supabase Auth creation)
INSERT INTO public.users (id, email, display_name, role, interface_language, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@lingullio.com', 'Admin Lingullio', 'admin', 'fr', true);

-- ============================================================
-- SAMPLE LICENSES (for testing activation flow)
-- ============================================================

INSERT INTO public.licenses (id, email, activation_code, course_id, status, duration_months) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'test@example.com', 'TEST1234', 'a0000000-0000-0000-0000-000000000001', 'pending', 12),
  ('a3000000-0000-0000-0000-000000000002', 'demo@example.com', 'DEMO5678', 'a0000000-0000-0000-0000-000000000001', 'pending', 12);
