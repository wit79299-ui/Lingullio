# Lingullio -- Architecture detaillee

## Document de reference avant build

Version : 1.0
Date : 2 juillet 2026
Statut : En attente de validation

---

## Table des matieres

1. Vision produit et decisions strategiques
2. Stack technique
3. Architecture systeme
4. Modele de donnees
5. Systeme d'authentification et licences
6. Parcours utilisateur complet
7. Onboarding apprenant
8. Dashboard apprenant
9. Systeme de scoring et prediction
10. Parcours pedagogique et exercices
11. Examens blancs
12. Moteur audio et TTS
13. IA pedagogique
14. Moteur de trace manuscrit
15. Back office admin
16. Analytics admin
17. Internationalisation
18. Design system
19. Structure d'import du contenu
20. Securite et conformite
21. Risques techniques et mitigations
22. Arbitrages a valider
23. Phases de construction detaillees

---

## 1. Vision produit et decisions strategiques

### Positionnement

Lingullio est une plateforme premium de preparation aux examens de langues asiatiques. Elle ne vend pas du contenu : elle vend un parcours mesurable vers la reussite a l'examen.

### Decisions prises

- Premier parcours : HSK nouveau format 2026 (9 niveaux)
- Premiers niveaux livres : HSK 1 et HSK 2
- Prix : environ 99 EUR par niveau, vendu via Shopify
- Licence : 12 mois, prolongeable par l'admin
- Activation : automatique via webhook Shopify, code unique envoye par email
- Hebergement : Vercel (front) + Supabase (auth, DB, storage, RLS)
- Domaine : lingullio.com
- IA : OpenAI API avec mode degrade
- Audios : generation TTS complete
- Trace manuscrit : a partir du niveau 5 uniquement
- Pas de systeme de paiement integre (Shopify gere tout)

### Principes produit

- L'apprenant ne choisit jamais seul quoi faire : la plateforme recommande
- Chaque activite est reliee a un impact sur le score estime
- Le score estime est une projection responsable, jamais une promesse
- L'IA est un outil pedagogique, pas un gadget
- L'interface est sobre, premium, accessible, mobile-first
- Aucun texte d'interface n'est hardcode
- L'architecture est generique : reutilisable pour JLPT, TOPIK, autres

---

## 2. Stack technique

### Frontend

| Composant | Technologie | Justification |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR, RSC, routing, middleware, i18n, performance |
| Langage | **TypeScript** | Surete de type, maintenabilite |
| Styling | **Tailwind CSS 4** | Design system coherent, responsive, tokens |
| Composants | **Radix UI + composants custom** | Accessibilite native, headless, flexible |
| Etat client | **Zustand** | Leger, simple, performant |
| Formulaires | **React Hook Form + Zod** | Validation type-safe, UX fluide |
| Requetes | **TanStack Query** | Cache, revalidation, optimistic updates |
| Canvas/trace | **Fabric.js ou lib custom Canvas API** | Dessin manuscrit, mobile, stylet |
| Audio | **Howler.js** | Lecture audio cross-browser, vitesse variable |
| Charts | **Recharts** | Graphiques SVG legers, responsive |
| i18n | **next-intl** | Routing i18n, SSR, messages structures |
| Animations | **Framer Motion** | Transitions fluides, accessibles |

### Backend (Supabase)

| Composant | Technologie | Justification |
|---|---|---|
| Base de donnees | **PostgreSQL (Supabase)** | Relationnel, RLS natif, performant |
| Auth | **Supabase Auth custom** | Email + code, puis mot de passe, roles |
| Storage | **Supabase Storage** | Audios, fichiers trace, exports |
| Edge Functions | **Supabase Edge Functions (Deno)** | Webhooks Shopify, appels OpenAI, TTS |
| Realtime | **Supabase Realtime** | Notifications admin si necessaire |
| RLS | **Row Level Security** | Isolation stricte apprenant/admin |

### Services tiers

| Service | Usage | Justification |
|---|---|---|
| **OpenAI API** | Correction ecrite, feedback, oral, explications | GPT-4o pour qualite pedagogique |
| **OpenAI Whisper** | Transcription orale apprenant | Precision multilingue |
| **OpenAI TTS** | Generation audio vocabulaire, phrases | Voix naturelles en chinois |
| **Shopify** | Vente, paiement | Deja en place, webhook vers Supabase |
| **Resend** | Emails transactionnels | API simple, templates, delivrabilite |
| **Vercel** | Hebergement frontend | Edge, CDN, preview, CI/CD |
| **Make Me a Hanzi** | Donnees d'ordre des traits | Open source, SVG, 9000+ caracteres |

### Budget IA estime

Pour 100 apprenants actifs :

| Usage | Appels/mois | Cout estime/mois |
|---|---|---|
| Correction ecrite | ~3000 | ~15 EUR |
| Feedback exercice | ~5000 | ~10 EUR |
| Conversation orale | ~1000 | ~20 EUR |
| Transcription Whisper | ~1000 | ~5 EUR |
| TTS generation initiale | Ponctuel | ~30 EUR (une fois) |
| **Total mensuel** | | **~50 EUR** pour 100 apprenants |

Pour 1000 apprenants : ~300 a 500 EUR/mois. Optimisable avec cache et modeles plus legers.

---

## 3. Architecture systeme

```
[Shopify] --(webhook)--> [Supabase Edge Function] --> [DB: license created]
                                                        |
                                                   [Resend: email avec code]

[Navigateur/Mobile]
    |
    v
[Vercel / Next.js App]
    |--- Pages SSR/RSC (dashboard, parcours, exercices)
    |--- API Routes (proxy IA, scoring, progression)
    |
    v
[Supabase]
    |--- PostgreSQL (donnees structurees, RLS)
    |--- Auth (sessions, roles, tokens)
    |--- Storage (audios, traces, exports)
    |--- Edge Functions (webhooks, TTS batch, IA proxy)
    |
    v
[OpenAI API]
    |--- GPT-4o (correction, feedback, conversation)
    |--- Whisper (transcription orale)
    |--- TTS (generation audio)
```

### Flux d'achat et activation

1. L'utilisateur achete sur Shopify
2. Shopify envoie un webhook a une Edge Function Supabase
3. L'Edge Function cree un enregistrement license + user (ou lie a un user existant)
4. L'Edge Function genere un code unique de premiere connexion
5. Resend envoie un email avec le code et le lien de connexion
6. L'utilisateur clique, saisit le code, definit son mot de passe
7. La session est creee, l'onboarding demarre

---

## 4. Modele de donnees

### Schema relationnel complet

```sql
-- ============================================================
-- UTILISATEURS ET ROLES
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'learner'
        CHECK (role IN ('admin', 'editor', 'reviewer', 'learner')),
    interface_language TEXT NOT NULL DEFAULT 'fr',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    first_login_code TEXT,
    first_login_code_expires_at TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_exam TEXT NOT NULL, -- 'hsk', 'jlpt', 'topik'
    target_level TEXT NOT NULL, -- 'hsk1', 'hsk2', etc.
    objective TEXT, -- 'exam', 'studies', 'work', 'immigration', 'personal'
    exam_date DATE,
    target_score INTEGER,
    weekly_hours NUMERIC(4,1),
    initial_score INTEGER,
    current_estimated_score INTEGER,
    expected_score_at_date INTEGER,
    confidence_level TEXT DEFAULT 'low'
        CHECK (confidence_level IN ('low', 'medium', 'high')),
    preparation_status TEXT DEFAULT 'not_started'
        CHECK (preparation_status IN (
            'not_started', 'in_progress', 'on_track',
            'near_target', 'ready', 'at_risk'
        )),
    total_study_time_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT false,
    diagnostic_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, target_exam, target_level)
);

-- ============================================================
-- LICENCES ET ACCES
-- ============================================================

CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    shopify_order_id TEXT,
    shopify_order_number TEXT,
    activation_code TEXT UNIQUE NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'refunded')),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    duration_months INTEGER NOT NULL DEFAULT 12,
    extended_months INTEGER DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STRUCTURE PEDAGOGIQUE
-- ============================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type TEXT NOT NULL, -- 'hsk', 'jlpt', 'topik'
    slug TEXT UNIQUE NOT NULL, -- 'hsk-1', 'hsk-2'
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    locale TEXT NOT NULL, -- 'fr', 'en', 'es', etc.
    title TEXT NOT NULL,
    description TEXT,
    UNIQUE(course_id, locale)
);

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE module_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    objectives TEXT, -- JSON array of learning objectives
    UNIQUE(module_id, locale)
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    lesson_type TEXT NOT NULL DEFAULT 'standard'
        CHECK (lesson_type IN (
            'standard', 'review', 'diagnostic', 'mock_exam',
            'practice', 'assessment'
        )),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    estimated_duration_minutes INTEGER,
    prerequisites JSONB DEFAULT '[]', -- array of lesson IDs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_html TEXT, -- pedagogical content (study material)
    UNIQUE(lesson_id, locale)
);

-- ============================================================
-- EXERCICES
-- ============================================================

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    exercise_type TEXT NOT NULL
        CHECK (exercise_type IN (
            'mcq', 'multiple_choice', 'fill_blank', 'matching',
            'reorder', 'dictation', 'listening_comprehension',
            'reading_comprehension', 'short_answer', 'essay',
            'speaking', 'flashcard', 'character_recognition',
            'handwriting', 'stroke_order', 'handwriting_comparison',
            'controlled_translation', 'timed_exam'
        )),
    difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    points INTEGER NOT NULL DEFAULT 10,
    estimated_duration_seconds INTEGER,
    audio_url TEXT,
    image_url TEXT,
    skill_tags TEXT[] NOT NULL DEFAULT '{}',
        -- 'listening', 'reading', 'writing', 'speaking',
        -- 'grammar', 'vocabulary', 'characters', 'handwriting'
    hsk_level TEXT,
    grammar_point_id UUID REFERENCES grammar_points(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    metadata JSONB DEFAULT '{}',
        -- theme, common_errors, pedagogical_objective, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    prompt TEXT NOT NULL,
    instruction TEXT,
    explanation TEXT, -- why correct answer is correct
    hint TEXT,
    UNIQUE(exercise_id, locale)
);

CREATE TABLE exercise_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise_option_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES exercise_options(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    content TEXT NOT NULL,
    error_explanation TEXT, -- why this wrong answer is wrong
    UNIQUE(option_id, locale)
);

-- ============================================================
-- VOCABULAIRE, GRAMMAIRE, CARACTERES
-- ============================================================

CREATE TABLE vocabulary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simplified TEXT NOT NULL,
    traditional TEXT,
    pinyin TEXT NOT NULL,
    audio_url TEXT,
    hsk_level TEXT NOT NULL,
    frequency_rank INTEGER,
    radical TEXT,
    stroke_count INTEGER,
    word_type TEXT, -- noun, verb, adj, adv, etc.
    theme TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vocabulary_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vocabulary_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    example_pinyin TEXT,
    example_translation TEXT,
    usage_notes TEXT,
    UNIQUE(vocabulary_id, locale)
);

CREATE TABLE grammar_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL, -- e.g. "S + 很 + Adj"
    hsk_level TEXT NOT NULL,
    sort_order INTEGER,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grammar_point_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grammar_point_id UUID NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    explanation_html TEXT NOT NULL,
    examples JSONB DEFAULT '[]',
        -- [{sentence, pinyin, translation}]
    common_errors JSONB DEFAULT '[]',
        -- [{error, correction, explanation}]
    UNIQUE(grammar_point_id, locale)
);

CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character TEXT NOT NULL UNIQUE,
    pinyin TEXT NOT NULL,
    radical TEXT,
    stroke_count INTEGER NOT NULL,
    hsk_level TEXT NOT NULL,
    frequency_rank INTEGER,
    decomposition TEXT, -- structural decomposition
    audio_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE character_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    meaning TEXT NOT NULL,
    mnemonic TEXT, -- memory aid
    UNIQUE(character_id, locale)
);

CREATE TABLE stroke_order_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    strokes JSONB NOT NULL,
        -- array of stroke paths [{path: "M...", type: "horizontal", order: 1}]
    medians JSONB,
        -- median points for each stroke
    svg_data TEXT,
    animation_data JSONB,
        -- timing, easing for animation
    bounding_box JSONB,
        -- {x, y, width, height}
    source TEXT DEFAULT 'makemeahanzi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(character_id)
);

-- ============================================================
-- PROGRESSION ET TENTATIVES
-- ============================================================

CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    is_correct BOOLEAN,
    score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    user_answer JSONB, -- structured answer data
    ai_feedback JSONB, -- AI-generated feedback if applicable
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE handwriting_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id),
    strokes_data JSONB NOT NULL,
        -- [{points: [{x,y,t,pressure}], direction, length}]
    image_url TEXT, -- stored canvas snapshot
    total_strokes INTEGER,
    time_spent_ms INTEGER,
    difficulty_mode TEXT DEFAULT 'beginner'
        CHECK (difficulty_mode IN ('beginner', 'intermediate', 'advanced', 'exam')),
    score_overall NUMERIC(5,2),
    score_accuracy NUMERIC(5,2),
    score_proportion NUMERIC(5,2),
    score_stroke_order NUMERIC(5,2),
    score_stroke_direction NUMERIC(5,2),
    score_fluidity NUMERIC(5,2),
    score_memorization NUMERIC(5,2),
    feedback JSONB,
        -- structured feedback from analysis/AI
    comparison_overlay_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),
    snapshot_type TEXT NOT NULL DEFAULT 'daily'
        CHECK (snapshot_type IN ('daily', 'weekly', 'post_exam', 'diagnostic', 'manual')),
    estimated_score INTEGER,
    confidence_level TEXT,
    scores_by_skill JSONB NOT NULL,
        -- {vocabulary: 72, grammar: 64, reading: 71, listening: 63, writing: 58, speaking: 60}
    total_exercises_done INTEGER,
    total_correct INTEGER,
    study_time_minutes INTEGER,
    streak_days INTEGER,
    completion_percentage NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),
    recommendation_type TEXT NOT NULL,
        -- 'daily_plan', 'weakness', 'review', 'mock_exam', 'lesson'
    priority INTEGER NOT NULL DEFAULT 0,
    target_id UUID, -- lesson_id, exercise_id, module_id, etc.
    target_type TEXT, -- 'lesson', 'exercise', 'module', 'mock_exam', 'review'
    reason_key TEXT, -- i18n key for the reason
    estimated_duration_minutes INTEGER,
    estimated_score_impact INTEGER,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EXAMENS BLANCS
-- ============================================================

CREATE TABLE mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    sort_order INTEGER NOT NULL,
    total_duration_minutes INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mock_exam_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    UNIQUE(mock_exam_id, locale)
);

CREATE TABLE mock_exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
        -- 'listening', 'reading', 'writing', 'speaking'
    sort_order INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mock_exam_section_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES mock_exam_sections(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    instructions TEXT,
    UNIQUE(section_id, locale)
);

CREATE TABLE mock_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES mock_exam_sections(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    sort_order INTEGER NOT NULL,
    points INTEGER NOT NULL
);

CREATE TABLE mock_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mock_exam_id UUID NOT NULL REFERENCES mock_exams(id),
    learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_submitted BOOLEAN DEFAULT false,
    total_score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    scores_by_section JSONB,
    time_spent_seconds INTEGER,
    auto_saved_answers JSONB, -- periodic autosave
    analysis JSONB, -- post-exam analysis
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIO
-- ============================================================

CREATE TABLE audio_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT NOT NULL,
    public_url TEXT,
    duration_seconds NUMERIC(8,2),
    file_size_bytes INTEGER,
    mime_type TEXT DEFAULT 'audio/mpeg',
    source TEXT DEFAULT 'tts'
        CHECK (source IN ('tts', 'recorded', 'imported')),
    tts_model TEXT,
    tts_voice TEXT,
    reference_type TEXT, -- 'vocabulary', 'character', 'exercise', 'exam_section'
    reference_id UUID,
    transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- IA FEEDBACK
-- ============================================================

CREATE TABLE ai_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES attempts(id),
    feedback_type TEXT NOT NULL,
        -- 'writing_correction', 'speaking_evaluation', 'error_explanation',
        -- 'grammar_reformulation', 'conversation', 'progress_summary'
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    model_used TEXT,
    input_text TEXT,
    output_text TEXT,
    structured_feedback JSONB,
    quality_rating INTEGER, -- user feedback on AI quality
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REVISION ESPACEE
-- ============================================================

CREATE TABLE spaced_repetition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),
    item_type TEXT NOT NULL, -- 'vocabulary', 'character', 'grammar', 'exercise'
    item_id UUID NOT NULL,
    ease_factor NUMERIC(4,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_at TIMESTAMPTZ,
    last_quality INTEGER, -- 0-5 scale
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, learner_profile_id, item_type, item_id)
);

-- ============================================================
-- ADMIN ET LOGS
-- ============================================================

CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    action_type TEXT NOT NULL,
        -- 'license_revoke', 'license_extend', 'content_publish',
        -- 'content_archive', 'user_deactivate', 'refund', etc.
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'exercise', 'lesson', 'module', 'course'
    content_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL, -- full content snapshot
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARAMETRES UTILISATEUR
-- ============================================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    UNIQUE(user_id, preference_key)
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX idx_learner_profiles_user ON learner_profiles(user_id);
CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_email ON licenses(email);
CREATE INDEX idx_licenses_code ON licenses(activation_code);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_exercises_lesson ON exercises(lesson_id);
CREATE INDEX idx_exercises_type ON exercises(exercise_type);
CREATE INDEX idx_exercises_skill ON exercises USING GIN(skill_tags);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_exercise ON attempts(exercise_id);
CREATE INDEX idx_attempts_profile ON attempts(learner_profile_id);
CREATE INDEX idx_handwriting_user ON handwriting_attempts(user_id);
CREATE INDEX idx_handwriting_char ON handwriting_attempts(character_id);
CREATE INDEX idx_progress_user ON progress_snapshots(user_id);
CREATE INDEX idx_progress_profile ON progress_snapshots(learner_profile_id);
CREATE INDEX idx_recommendations_user ON user_recommendations(user_id);
CREATE INDEX idx_spaced_rep_next ON spaced_repetition_items(user_id, next_review_at);
CREATE INDEX idx_vocab_level ON vocabulary_items(hsk_level);
CREATE INDEX idx_grammar_level ON grammar_points(hsk_level);
CREATE INDEX idx_characters_level ON characters(hsk_level);
CREATE INDEX idx_audio_ref ON audio_files(reference_type, reference_id);
CREATE INDEX idx_mock_attempts_user ON mock_exam_attempts(user_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
```

---

## 5. Systeme d'authentification et licences

### Flux d'activation

```
1. Achat sur Shopify
2. Webhook POST --> Edge Function /webhooks/shopify/order-paid
3. Edge Function :
   a. Verifie la signature HMAC du webhook
   b. Extrait email + produit achete
   c. Determine le course_id correspondant
   d. Genere un activation_code unique (8 caracteres alphanumeriques)
   e. Cree l'enregistrement license (status: pending)
   f. Si user n'existe pas : cree user (role: learner, sans mot de passe)
   g. Envoie email via Resend :
      - "Votre acces Lingullio est pret"
      - Contient le code et le lien https://lingullio.com/activate
4. L'utilisateur arrive sur /activate
5. Il saisit son email + code
6. La plateforme verifie :
   - Code valide et non expire
   - Email correspond
   - License status = pending
7. Si OK : ecran "Definissez votre mot de passe"
8. L'utilisateur definit son mot de passe (min 8 chars, 1 majuscule, 1 chiffre)
9. License passe a status: active, activated_at = now()
10. expires_at = activated_at + 12 mois (+ extensions si admin)
11. Session creee, redirection vers onboarding
```

### Connexion ulterieure

```
1. /login : email + mot de passe
2. Verification Supabase Auth
3. Middleware verifie : license active + non expiree
4. Si expiree : ecran "Votre acces a expire" avec options
5. Si revoquee : ecran "Acces desactive, contactez le support"
```

### Mot de passe oublie

```
1. /forgot-password : saisie email
2. Edge Function genere un token temporaire (30 min)
3. Email Resend avec lien /reset-password?token=xxx
4. L'utilisateur definit un nouveau mot de passe
5. Token invalide apres usage
```

### Roles et permissions

| Role | Acces |
|---|---|
| **admin** | Tout : contenus, utilisateurs, licences, analytics, parametres |
| **editor** | Contenus : creation, edition, preview. Pas d'acces utilisateurs/licences |
| **reviewer** | Contenus : lecture seule + validation/rejet. Pas d'edition |
| **learner** | Front office uniquement, selon licence active |

---

## 6. Parcours utilisateur complet

### Apprenant

```
Achat Shopify
  --> Email avec code
    --> /activate (code + email)
      --> Definition mot de passe
        --> Onboarding (9 etapes)
          --> Diagnostic initial
            --> Dashboard personnalise
              --> Parcours guide / Objectif du jour
                --> Lecons + Exercices
                  --> Feedback + Progression
                    --> Revision intelligente
                      --> Examens blancs
                        --> Analyse + Recommandations
                          --> Cycle continu jusqu'a l'examen
```

### Admin

```
Login admin (/admin/login)
  --> Dashboard admin (vue globale)
    --> Gestion apprenants
      --> Fiche individuelle + progression + actions
    --> Gestion licences
      --> Activation, prolongation, revocation, remboursement
    --> Gestion contenus
      --> Niveaux > Modules > Lecons > Exercices
      --> Import en masse
      --> Preview apprenant
    --> Analytics
      --> KPI globaux, tendances, alertes
    --> Parametres
      --> Langues, emails, configuration
```

---

## 7. Onboarding apprenant

### Etapes

| Etape | Ecran | Donnees collectees |
|---|---|---|
| 1 | Choix langue interface | `interface_language` |
| 2 | Choix niveau HSK | `target_level` |
| 3 | Objectif | `objective` (exam, studies, work, immigration, personal) |
| 4 | Date d'examen | `exam_date` (optionnel) |
| 5 | Score cible | `target_score` (optionnel, selon niveau) |
| 6 | Disponibilite | `weekly_hours` |
| 7 | Auto-evaluation | 5 questions rapides par competence |
| 8 | Diagnostic recommande | Proposition du diagnostic complet |
| 9 | Plan genere | Affichage du plan personnalise |

### UX

- Indicateur de progression (1/9, 2/9...)
- Navigation avant/arriere
- Possibilite de sauter les etapes optionnelles
- Resume avant validation
- Animation de generation du plan a l'etape 9

---

## 8. Dashboard apprenant

### Structure desktop (sidebar + contenu principal)

**Sidebar gauche** (fond #1B3A4B) :
- Logo Lingullio
- Accueil (actif)
- Parcours
- Revisions
- Examens blancs
- Progression
- Objectifs
- Ressources
- Separateur
- Parametres
- Aide

**Zone principale :**

| Section | Contenu |
|---|---|
| **Header** | "Bienvenue [prenom]", niveau, date examen, score cible, serie actuelle |
| **Score estime** | Anneau circulaire, score/max, confiance, evolution |
| **Progression globale** | Pourcentage + barres par competence |
| **Plan du jour** | Liste de taches recommandees avec duree, bouton "Commencer" |
| **Recommandations** | Cartes horizontales : revision, examen blanc, points faibles |

### Structure mobile (empilage vertical)

- Header compact avec logo + cloche
- Carte de salutation
- Carte objectif du jour (fond navy, bouton blanc)
- Score estime compact
- Liste "A faire ensuite"
- Barre de navigation fixe en bas : Accueil, Parcours, Revisions, Profil

---

## 9. Systeme de scoring et prediction

### Algorithme du score estime

Le score estime est calcule a partir de multiples signaux ponderes :

```
Score estime = (
    w1 * score_diagnostic_initial
  + w2 * taux_reussite_par_competence
  + w3 * difficulte_moyenne_reussie
  + w4 * regularite_score
  + w5 * performance_examens_blancs
  + w6 * vitesse_reponse_score
  + w7 * tendance_recente
  + w8 * completion_parcours
  + w9 * qualite_productions_ecrites
  + w10 * qualite_productions_orales
  + w11 * maitrise_caracteres
) / sum(weights)
```

### Ponderation initiale (HSK)

| Signal | Poids | Justification |
|---|---|---|
| Diagnostic initial | 0.15 | Diminue au fil du temps |
| Taux reussite/competence | 0.20 | Signal le plus fiable |
| Difficulte reussie | 0.10 | Differencie les niveaux |
| Regularite | 0.05 | Indicateur d'engagement |
| Examens blancs | 0.25 | Le plus predictif du resultat reel |
| Vitesse de reponse | 0.05 | Indicateur de maitrise |
| Tendance recente | 0.10 | Capture la dynamique |
| Completion parcours | 0.05 | Couverture du programme |
| Productions ecrites | 0.03 | Si applicable au niveau |
| Productions orales | 0.02 | Si applicable au niveau |
| Maitrise caracteres | 0.05 | Selon le niveau |

### Niveau de confiance

| Confiance | Conditions |
|---|---|
| Basse | < 50 exercices, < 1 examen blanc |
| Moyenne | 50-200 exercices, 1-2 examens blancs |
| Elevee | > 200 exercices, > 2 examens blancs, > 2 semaines d'activite |

### Affichage responsable

- Toujours afficher "Score estime" (jamais "votre score")
- Toujours afficher le niveau de confiance
- Formulation : "Projection actuelle" / "Estimation basee sur vos resultats"
- Jamais : "Vous aurez ce score" / "Garanti"

---

## 10. Parcours pedagogique et exercices

### Modes d'utilisation

| Mode | Description |
|---|---|
| **Parcours guide** | Progression lineaire module par module, lecon par lecon |
| **Objectif du jour** | Plan genere quotidiennement selon les besoins |
| **Entrainement libre** | L'apprenant choisit un exercice ou un theme |
| **Revision intelligente** | Algorithme SM-2 adapte, cartes a reviser |
| **Examens blancs** | Simulation complete |
| **Faiblesses** | Focus sur les competences les plus faibles |
| **Simulation examen** | Conditions reelles (chronometre, pas d'aide) |

### Types d'exercices

Chaque type a un composant React dedie :

| Type | Competences | Composant |
|---|---|---|
| QCM | Toutes | `McqExercise` |
| Choix multiple | Toutes | `MultipleChoiceExercise` |
| Texte a trou | Vocabulaire, grammaire | `FillBlankExercise` |
| Association | Vocabulaire, caracteres | `MatchingExercise` |
| Remise en ordre | Grammaire, lecture | `ReorderExercise` |
| Dictee | Ecoute, ecriture | `DictationExercise` |
| Comprehension audio | Ecoute | `ListeningExercise` |
| Comprehension ecrite | Lecture | `ReadingExercise` |
| Reponse courte | Ecriture | `ShortAnswerExercise` |
| Redaction | Ecriture (IA) | `EssayExercise` |
| Oral avec micro | Oral (IA) | `SpeakingExercise` |
| Flashcards | Vocabulaire, caracteres | `FlashcardExercise` |
| Reconnaissance | Caracteres | `CharRecognitionExercise` |
| Trace manuscrit | Ecriture (canvas) | `HandwritingExercise` |
| Ordre des traits | Caracteres | `StrokeOrderExercise` |
| Comparaison trace | Ecriture | `HandwritingCompareExercise` |
| Traduction | Toutes | `TranslationExercise` |
| Examen chronometre | Toutes | `TimedExamExercise` |

### Flux d'un exercice

```
1. Affichage de la consigne (traduite selon locale)
2. Lecture audio si applicable
3. L'apprenant repond
4. Validation
5. Affichage resultat : correct/incorrect
6. Explication de la bonne reponse
7. Si incorrect : explication de l'erreur + erreurs frequentes
8. Bouton "IA : expliquer autrement" (optionnel)
9. Enregistrement de la tentative
10. Mise a jour progression + revision espacee
11. Passage a l'exercice suivant
```

---

## 11. Examens blancs

### Structure

Un examen blanc reproduit le format officiel HSK :

| Section | Contenu HSK 1-2 | Duree |
|---|---|---|
| Listening | Comprehension orale, QCM | 20-30 min |
| Reading | Comprehension ecrite, QCM, association | 20-30 min |

(Les niveaux superieurs ajoutent Writing et Speaking.)

### Fonctionnalites

- Chronometre par section
- Sauvegarde automatique toutes les 30 secondes
- Navigation entre questions
- Indicateur de questions repondues / non repondues
- Pause possible (le chronometre s'arrete, mais c'est enregistre)
- Soumission section par section ou globale
- Score immediat apres soumission
- Correction detaillee question par question
- Analyse par competence
- Comparaison avec examens precedents
- Recommandations post-examen

---

## 12. Moteur audio et TTS

### Generation TTS

Les audios seront generes par batch via une Edge Function :

```
Pour chaque vocabulary_item sans audio :
  1. Appel OpenAI TTS (voix : alloy ou nova, modele tts-1-hd)
  2. Stockage dans Supabase Storage : /audio/vocabulary/{hsk_level}/{id}.mp3
  3. Mise a jour audio_url dans la base
```

Idem pour les caracteres, phrases d'exemple, consignes d'exercice.

### Lecteur audio

Composant `AudioPlayer` :
- Play/Pause
- Reecoute (bouton replay)
- Vitesse : 0.5x, 0.75x, 1x (par defaut), 1.25x
- Barre de progression
- Transcription masquee/affichee (toggle)
- Preload pour les exercices d'ecoute

---

## 13. IA pedagogique

### Prompts controles

Chaque usage de l'IA est encadre par un prompt systeme strict :

#### Correction ecrite

```
Tu es un professeur de chinois specialise dans la preparation au HSK.
Niveau de l'apprenant : {level}.
Exercice : {exercise_type}.
Consigne : {prompt}.
Reponse de l'apprenant : {answer}.
Reponse attendue : {expected_answer}.

Instructions :
1. Indique si la reponse est correcte, partiellement correcte ou incorrecte.
2. Explique chaque erreur specifiquement (grammaire, vocabulaire, structure, ton).
3. Propose une version corrigee.
4. Donne un conseil concret pour eviter cette erreur.
5. Utilise la langue : {locale}.
6. Ne donne JAMAIS d'information incertaine sur une regle.
7. Si tu n'es pas sur, dis-le explicitement.
8. Adapte la complexite de ton explication au niveau de l'apprenant.
```

#### Evaluation orale

```
Tu es un evaluateur certifie HSK pour l'expression orale.
Niveau : {level}.
Exercice : {prompt}.
Transcription de l'apprenant : {transcript}.

Evalue sur 5 criteres (note /10 chacun) :
1. Comprehension de la consigne
2. Pertinence du contenu
3. Vocabulaire et structures utilisees
4. Fluidite et coherence
5. (Si donnees disponibles) Indications de prononciation

Donne un feedback constructif et un conseil d'amelioration.
Langue de reponse : {locale}.
```

#### Explication d'erreur

```
Tu es un tuteur bienveillant et precis.
L'apprenant a fait cette erreur : {error}.
La bonne reponse etait : {correct}.
Contexte : {context}.
Niveau : {level}.

Explique simplement pourquoi c'est une erreur.
Donne un moyen de s'en souvenir.
Donne un exemple similaire.
Langue : {locale}.
Ne jamais inventer de regle grammaticale.
```

### Mode degrade

Si l'API OpenAI est indisponible :
1. Les corrections ecrites utilisent la comparaison statique (reponse attendue vs reponse)
2. Les exercices oraux sont desactives avec message explicatif
3. Les explications d'erreurs utilisent les explications pre-redigees dans la base
4. Un bandeau informe l'apprenant : "L'assistant IA est temporairement indisponible. Les corrections automatiques restent actives."

---

## 14. Moteur de trace manuscrit

### Donnees source

Utiliser **Make Me a Hanzi** (open source, 9000+ caracteres) :
- Format : JSON avec paths SVG et medians pour chaque trait
- A telecharger et stocker dans la table `stroke_order_data`

### Composant `HandwritingCanvas`

```
Props :
  - character: string
  - strokeData: StrokeOrderData
  - mode: 'beginner' | 'intermediate' | 'advanced' | 'exam'
  - onComplete: (result: HandwritingResult) => void

Fonctionnalites :
  - Canvas HTML5 avec support tactile, stylet et souris
  - Grille de reference (fond)
  - Modele visible/masque selon le mode
  - Animation du trace modele (replay)
  - Capture des coordonnees, timestamps, pression
  - Boutons : effacer, recommencer, afficher modele, revoir animation
  - Rendu fluide (requestAnimationFrame, interpolation de Bezier)
```

### Analyse du trace

L'analyse combine deux approches :

**1. Analyse algorithmique (cote client + serveur) :**
- Nombre de traits vs attendu
- Ordre des traits (sequence de directions)
- Direction de chaque trait (comparaison vecteur)
- Proportions (bounding box des composants)
- Placement dans la grille

**2. Analyse IA (cote serveur, optionnelle) :**
- Envoi de l'image du trace + donnees vectorielles
- Comparaison avec le modele
- Feedback detaille en langage naturel

### Scoring du trace

| Critere | Poids | Methode |
|---|---|---|
| Forme generale | 0.20 | Comparaison bounding box + densite |
| Proportion | 0.15 | Ratio largeur/hauteur des composants |
| Placement | 0.10 | Position relative dans la grille |
| Nombre de traits | 0.15 | Correspondance exacte |
| Ordre des traits | 0.20 | Sequence correcte |
| Direction des traits | 0.10 | Angle moyen par trait |
| Fluidite | 0.10 | Regularite de la vitesse |

### Feedback visuel

- Superposition du trace utilisateur (rouge) et du modele (bleu transparent)
- Mise en evidence du trait problematique (surlignage)
- Animation du trace utilisateur en replay
- Animation du trace modele en replay
- Score par critere affiche visuellement

---

## 15. Back office admin

### Pages et fonctionnalites

#### Dashboard admin
- KPI : apprenants actifs, activations du jour, taux completion, score moyen
- Graphiques : evolution sur 30 jours
- Alertes : apprenants a risque, contenus non publies, licences expirant

#### Gestion apprenants
- Liste filtrable : nom, email, niveau, statut, derniere activite
- Recherche
- Export CSV
- Fiche apprenant : profil, progression, score, activite, licence, actions

#### Gestion licences
- Liste avec filtres : statut, date, niveau
- Actions : activer, prolonger, revoquer, rembourser
- Historique des actions

#### Gestion contenus
- Arborescence : Cours > Modules > Lecons > Exercices
- CRUD complet sur chaque niveau
- Duplication
- Preview cote apprenant
- Gestion des traductions par locale
- Import en masse (CSV, JSON)
- Gestion des audios (upload, generation TTS, association)
- Gestion des caracteres et donnees de traits

#### Types d'exercices
- Formulaire adaptatif selon le type
- Preview en direct
- Gestion des options et traductions
- Tags pedagogiques

---

## 16. Analytics admin

### Metriques

| Categorie | Metriques |
|---|---|
| **Engagement** | Apprenants actifs (jour/semaine/mois), taux activation, temps moyen, series |
| **Progression** | Taux completion, score moyen initial/actuel, evolution |
| **Contenu** | Exercices les plus echoues, modules les plus difficiles, caracteres les moins maitrise |
| **Retention** | Taux retour J+1, J+7, J+30, apprenants a risque |
| **Examens** | Taux de passage, score moyen, amelioration entre tentatives |
| **IA** | Nombre d'appels, cout, satisfaction (feedback utilisateur) |

---

## 17. Internationalisation

### Architecture

- Fichiers de traduction : `/messages/{locale}.json`
- Pas de texte hardcode dans les composants
- Utilisation de `next-intl` avec routing i18n
- Les contenus pedagogiques ont leurs propres tables `*_translations`
- L'interface utilise les fichiers de messages JSON
- Le choix de langue est stocke dans `users.interface_language`
- Un middleware Next.js gere le routing selon la langue

### Locales supportees

```
fr, en, es, vi, id, th, ja, ko, zh-Hans, zh-Hant,
hi, ar, ru, tr, pl, ro, uk, pt, de, it
```

### Structure des fichiers de messages

```json
{
  "common": {
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "next": "Suivant",
    "previous": "Precedent"
  },
  "dashboard": {
    "welcome": "Bienvenue {name}",
    "estimatedScore": "Score estime",
    "confidence": "Confiance : {level}",
    "todayPlan": "Plan pour aujourd'hui"
  },
  "exercises": {
    "correct": "Correct",
    "incorrect": "Incorrect",
    "explanation": "Explication",
    "tryAgain": "Reessayer",
    "showHint": "Voir un indice"
  }
}
```

---

## 18. Design system

### Tokens de design (charte Lingullio)

```css
:root {
  /* Couleurs principales */
  --color-navy-900: #0D1B2A;
  --color-navy-700: #1B3A4B;
  --color-blue-500: #3E6FAE;
  --color-teal-500: #2DB39A;
  --color-cream-50: #F4F1EA;
  --color-gold-500: #E6B84A;

  /* Neutres */
  --color-white: #FFFFFF;
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Semantiques */
  --color-success: #2DB39A;
  --color-warning: #E6B84A;
  --color-error: #DC2626;
  --color-info: #3E6FAE;

  /* Typographies */
  --font-primary: 'Inter', system-ui, sans-serif;
  --font-chinese: 'Noto Sans SC', sans-serif;

  /* Tailles */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* Espacement */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Rayons */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Ombres */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Zones tactiles */
  --touch-target-min: 44px;
}
```

### Composants principaux

| Composant | Specifications |
|---|---|
| `Button` | Primaire (navy pill), secondaire (outline), taille min 44px |
| `Badge` | Pill colore, 4 variantes (nouveau, progres, reviser, maitrise) |
| `Card` | Fond blanc ou cream, ombre sm, radius lg |
| `ScoreRing` | SVG annulaire, trait teal, score centre, confiance en dessous |
| `ProgressBar` | Lineaire, fond gris, barre teal |
| `Sidebar` | Fond navy-700, items blancs, item actif avec accent |
| `BottomNav` | Fixe, fond blanc, 4-5 items, icones outline |
| `AudioPlayer` | Compact, play/pause, vitesse, barre |
| `HandwritingCanvas` | Plein ecran mobile, grille, controles en bas |
| `ExerciseLayout` | Consigne en haut, zone de reponse, validation, feedback |

---

## 19. Structure d'import du contenu

### Format attendu pour le vocabulaire (CSV)

```csv
simplified,traditional,pinyin,meaning_fr,meaning_en,hsk_level,word_type,theme,example_sentence,example_pinyin,example_translation_fr,example_translation_en,frequency_rank
你,你,ni3,tu / toi,you,hsk1,pronoun,basic,你好！,ni3 hao3,Bonjour !,Hello!,1
好,,hao3,bon / bien,good,hsk1,adjective,basic,你好！,ni3 hao3,Bonjour !,Hello!,2
```

### Format attendu pour la grammaire (CSV)

```csv
pattern,hsk_level,difficulty,title_fr,title_en,explanation_fr,explanation_en,example_1_sentence,example_1_pinyin,example_1_translation_fr,example_1_translation_en,common_error_1,common_error_1_correction,common_error_1_explanation_fr
S + 很 + Adj,hsk1,1,Exprimer un etat avec 很,Express a state with 很,"En chinois, on utilise 很 entre le sujet et l'adjectif...","In Chinese, 很 is used between the subject and the adjective...",她很漂亮。,ta1 hen3 piao4liang,Elle est tres belle.,She is very beautiful.,她是很漂亮,她很漂亮,Ne pas utiliser 是 devant un adjectif qualificatif
```

### Format attendu pour les exercices (JSON)

```json
{
  "exercises": [
    {
      "type": "mcq",
      "hsk_level": "hsk1",
      "skill_tags": ["vocabulary", "reading"],
      "difficulty": 1,
      "estimated_duration_seconds": 30,
      "theme": "greetings",
      "grammar_point": null,
      "prompt": {
        "fr": "Que signifie 你好 ?",
        "en": "What does 你好 mean?"
      },
      "options": [
        {
          "content": {"fr": "Bonjour", "en": "Hello"},
          "is_correct": true,
          "error_explanation": null
        },
        {
          "content": {"fr": "Au revoir", "en": "Goodbye"},
          "is_correct": false,
          "error_explanation": {
            "fr": "Au revoir se dit 再见 (zaijian) en chinois.",
            "en": "Goodbye is 再见 (zaijian) in Chinese."
          }
        },
        {
          "content": {"fr": "Merci", "en": "Thank you"},
          "is_correct": false,
          "error_explanation": {
            "fr": "Merci se dit 谢谢 (xiexie) en chinois.",
            "en": "Thank you is 谢谢 (xiexie) in Chinese."
          }
        }
      ],
      "explanation": {
        "fr": "你好 (nihao) est la salutation standard en chinois.",
        "en": "你好 (nihao) is the standard greeting in Chinese."
      },
      "status": "validated"
    }
  ]
}
```

### Format pour les parcours (JSON)

```json
{
  "course": {
    "exam_type": "hsk",
    "slug": "hsk-1",
    "title": {"fr": "HSK 1", "en": "HSK 1"},
    "modules": [
      {
        "sort_order": 1,
        "title": {"fr": "Se presenter", "en": "Introduce yourself"},
        "estimated_duration_minutes": 120,
        "lessons": [
          {
            "sort_order": 1,
            "type": "standard",
            "title": {"fr": "Salutations de base", "en": "Basic greetings"},
            "estimated_duration_minutes": 20,
            "content_html": {"fr": "<h2>Les salutations...</h2>", "en": "<h2>Greetings...</h2>"},
            "exercise_refs": ["ex-001", "ex-002", "ex-003"]
          }
        ]
      }
    ]
  }
}
```

### Structure de dossier pour l'import

```
import/
  hsk1/
    vocabulary.csv
    grammar.csv
    exercises.json
    course_structure.json
    audio/         (vide, sera genere par TTS)
    content/
      module-01/
        lesson-01.fr.md
        lesson-01.en.md
        lesson-02.fr.md
        lesson-02.en.md
  hsk2/
    (meme structure)
```

---

## 20. Securite et conformite

### Mesures

| Domaine | Implementation |
|---|---|
| **Auth** | Supabase Auth, bcrypt, tokens JWT, refresh tokens |
| **RLS** | Chaque table avec policies strictes par role |
| **API** | Validation Zod sur tous les endpoints |
| **CSRF** | Tokens CSRF sur les formulaires |
| **XSS** | Sanitisation HTML, CSP headers |
| **Webhooks** | Verification HMAC signature Shopify |
| **Storage** | Fichiers audio en signed URLs, pas de listing public |
| **Sessions** | Expiration 7 jours, renouvellement automatique |
| **Logs admin** | Toute action admin est enregistree |
| **RGPD** | Export donnees utilisateur, suppression sur demande |
| **Backups** | Supabase point-in-time recovery |

---

## 21. Risques techniques et mitigations

| Risque | Impact | Probabilite | Mitigation |
|---|---|---|---|
| API OpenAI indisponible | Exercices IA bloques | Faible | Mode degrade avec corrections statiques |
| Couts IA excessifs | Depassement budget | Moyen | Cache reponses, limites par utilisateur, modeles legers |
| Performance TTS batch | Delai generation audios | Moyen | Generation asynchrone, file d'attente |
| Canvas mobile lent | Trace manuscrit inutilisable | Moyen | Optimisation requestAnimationFrame, simplification |
| Latence Supabase | UX degradee | Faible | Cache TanStack Query, optimistic updates |
| Volume d'import | Import lent pour gros fichiers | Moyen | Import par batch, barre de progression |
| Precision analyse trace | Feedback incorrect | Moyen | Combinaison algo + IA, seuils de confiance |
| Compatibilite i18n RTL | Arabe casse | Moyen | Prevoir direction: rtl dans le design system |
| Expiration licence non detectee | Acces indu | Faible | Middleware de verification a chaque requete |

---

## 22. Arbitrages a valider

Avant de commencer le build, confirme ces choix :

### Architecture

1. **Next.js App Router** : confirmes-tu Next.js ou preferes-tu une autre option ?
2. **Supabase** : confirmes-tu Supabase pour auth + DB + storage ?
3. **Vercel** : confirmes-tu le deploiement sur Vercel ?

### Fonctionnel

4. **HSK 1 et 2 en premier** : on commence par les deux niveaux, dans cet ordre ?
5. **TTS OpenAI** : pour les audios generes, la voix OpenAI est acceptable ? Sinon, preference ?
6. **Make Me a Hanzi** : comme source de donnees de traits, c'est acceptable ?
7. **Resend** : pour les emails transactionnels, ou tu as deja un service ?

### Design

8. **Charte validee** : la charte extraite ci-dessus est correcte et complete ?
9. **Le logo et les icones** : as-tu les fichiers SVG du logo et des icones de la charte ?

### Contenu

10. **Templates d'import** : les formats CSV/JSON proposes te conviennent ? As-tu besoin d'adaptations ?

### Budget

11. **Budget IA** : ~50 EUR/mois pour 100 apprenants te convient comme point de depart ?

---

## 23. Phases de construction detaillees

### Phase 1 : Socle technique (estimee 2-3 jours)
- Initialisation projet Next.js 15 + TypeScript
- Configuration Tailwind 4 avec tokens Lingullio
- Design system : composants de base (Button, Badge, Card, Input, etc.)
- Configuration Supabase (projet, tables initiales, RLS)
- Authentification custom (login, code, mot de passe, reset)
- Middleware de verification de licence
- Configuration next-intl avec fichiers fr/en
- Layout desktop (sidebar) et mobile (bottom nav)
- CI/CD Vercel

### Phase 2 : Back office contenu (estimee 3-4 jours)
- Layout admin
- CRUD cours, modules, lecons
- CRUD exercices (formulaires adaptatifs par type)
- Gestion traductions
- Import CSV/JSON
- Upload audios
- Preview apprenant
- Gestion statuts (brouillon, valide, publie, archive)

### Phase 3 : Import HSK 1 et 2 (estimee 1-2 jours)
- Preparation des fichiers d'import
- Import vocabulaire
- Import grammaire
- Import exercices
- Generation TTS batch
- Verification et validation

### Phase 4 : Front apprenant (estimee 3-4 jours)
- Onboarding (9 etapes)
- Dashboard (desktop + mobile)
- Score estime (composant annulaire)
- Progression par competence
- Plan du jour
- Navigation parcours

### Phase 5 : Exercices et progression (estimee 4-5 jours)
- 18 types d'exercices (composants React)
- Enregistrement des tentatives
- Calcul de progression
- Revision espacee (SM-2)
- Feedback immediat
- Recommandations

### Phase 6 : Examens blancs et audio (estimee 2-3 jours)
- Module examen blanc
- Chronometre
- Sauvegarde automatique
- Correction et analyse
- Lecteur audio avec vitesse variable

### Phase 7 : IA pedagogique (estimee 3-4 jours)
- Correction ecrite (GPT-4o)
- Feedback d'erreur
- Conversation orale (Whisper + GPT)
- Mode degrade
- Prompts controles

### Phase 8 : Trace manuscrit (estimee 3-4 jours)
- Import Make Me a Hanzi
- Composant Canvas
- Analyse algorithmique
- Scoring
- Feedback visuel
- 4 modes de difficulte

### Phase 9 : Analytics admin (estimee 2-3 jours)
- Dashboard admin avec KPI
- Graphiques (Recharts)
- Apprenants a risque
- Contenus a ameliorer
- Export

### Phase 10 : QA et accessibilite (estimee 2-3 jours)
- Audit WCAG
- Tests mobile
- Tests navigateurs
- Correction contrastes, focus, lecteur d'ecran
- Tests de performance

### Phase 11 : Lancement (estimee 1-2 jours)
- DNS lingullio.com vers Vercel
- Variables d'environnement production
- Webhook Shopify production
- Emails transactionnels
- Tests end-to-end
- Documentation admin

---

**Temps total estime : 26 a 37 jours de developpement**

---

*En attente de validation pour commencer le build.*
