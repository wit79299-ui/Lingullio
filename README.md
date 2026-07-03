# Lingullio

## Presentation du projet
- **Nom** : Lingullio (lingullio.com)
- **Objectif** : Plateforme EdTech premium de preparation aux examens de langues asiatiques, commencant par le HSK (chinois mandarin, nouveau format 2026, 9 niveaux)
- **Modele** : Systeme pedagogique complet (diagnostic, guidage, entrainement, mesure, explication des erreurs, prediction de progression)
- **Prix** : ~99 EUR, licence 12 mois via Shopify

## Stack technique
- **Frontend** : Next.js 15 (App Router, RSC), React 19, TypeScript strict
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Styling** : Tailwind CSS 4 avec design tokens Lingullio (`@theme`)
- **i18n** : next-intl v4, 20 langues, `localePrefix: 'as-needed'`, defaut `fr`
- **UI** : Radix UI (headless), CVA (variants), Lucide React (icones)
- **State** : Zustand (client), TanStack Query (server state)
- **Forms** : React Hook Form + Zod
- **Deploiement** : Vercel (production)

## URLs
- **Dev sandbox** : https://3000-ic66lt2l6yurckegrav5c-b237eb32.sandbox.novita.ai
- **Production** : (pas encore deploye)

## Etat de la base de donnees Supabase (3 juillet 2026)

### Contenu ingere

| Table | Count | Details |
|-------|-------|---------|
| courses | 9 | HSK 1-9 (1-5 published, 6-9 draft) |
| modules | 37 | 10 HSK1 + 6 HSK2 + 7 HSK3 + 4 HSK4 + 10 HSK5 |
| lessons | 208 | 51 HSK1 + 31 HSK2 + 63 HSK3 + 19 HSK4 + 50 HSK5 |
| vocabulary_items | 1679 | 319 HSK1 + 200 HSK2 + 500 HSK3 + 60 HSK4 + 600 HSK5 |
| grammar_points | 66 | 35 HSK1 + 9 HSK2 + 11 HSK3 + 11 HSK4 |
| characters | 986 | 248 HSK1 + 123 HSK2 + 284 HSK3 + 331 HSK5 (deduplication inter-niveaux) |
| stroke_order_data | 655 | HSK1-3 coverage 100% (source: MakeMeAHanzi) |
| exercises | 205 | HSK1 seulement (10 types differents) |
| exercise_options | 456 | Options MCQ pour 112 exercices |
| lesson_vocabulary_items | 1642 | Mappings lesson-vocab (HSK1-5) |
| lesson_grammar_points | 51 | Mappings lesson-grammar (HSK1-4) |
| lesson_characters | 2281 | Mappings lesson-characters (HSK1-5) |
| audio_files | 0 | TTS non encore genere |

### Traductions FR+EN
- vocabulary_translations: 8846 records — FR+EN couverts pour HSK1-5
- grammar_point_translations: 762 records — FR+EN pour HSK1-4
- character_translations: 6326 records
- lesson_translations: 416 (208 lecons x 2 locales)
- course_translations: 62 / module_translations: 128

### Qualite des traductions EN (post-LLM)
- HSK2: 4/200 passthroughs restants (98% qualite)
- HSK3: 14/500 passthroughs restants (97% qualite)
- HSK5: 600/600 FR generees par LLM (100%)
- Grammar EN: 18/31 stubs corriges par LLM (HSK3: 7, HSK4: 11)

### Couverture HSK 3.0 officiel
- HSK1: 319/~300 mots (107%) -- complet
- HSK2: 200/~200 mots (100%) -- complet
- HSK3: 500/~500 mots (100%) -- complet
- HSK4: 60/~500 mots (12%) -- source DOCX partielle, necessite enrichissement
- HSK5: 600/~600 mots (100%) -- complet (EN source + FR LLM)

### Test de positionnement (diagnostic)
- **Modele de donnees** : `learner_profiles.diagnostic_completed` (boolean), `lesson_type='diagnostic'` (5 lecons diagnostic dans DB)
- **Backend** : `activateAccount()` cree le profil avec `diagnostic_completed: false`
- **Frontend** : Route `/onboarding` protegee dans middleware, mais **aucune page d'onboarding/diagnostic implementee**
- **Statut** : Prevu dans l'architecture mais pas encore code. Le flow serait : inscription → onboarding (9 etapes) → test diagnostic → attribution du parcours personnalise

### Scripts d'ingestion (dans `/scripts/`)
- `ingest-hsk1.py` — Phase 1 : modules, lecons, grammaire, vocab enrichi
- `ingest-hsk1-phase2.py` — Phase 2 : content_html, mnemoniques, exercices, strokes
- `fix-exercise-options-v2.py` — Correction UUID pour options d'exercices
- `ingest-hsk234.py` — Ingestion HSK2-4 : vocab HTML, grammaire DOCX, characters
- `fix-hsk234-characters.py` — Deduplication caracteres entre niveaux
- `populate-junctions.py` — Tables de jonction lesson<->contenu
- `llm-translate-and-ingest-hsk5.py` — Fix traductions EN passthrough + grammar stubs via LLM
- `ingest-hsk5.py` — Ingestion HSK5 : 600 vocab + FR via LLM
- `fix-hsk5-remaining.py` — Fix lessons/characters/junctions HSK5

## Fonctionnalites terminees

### Phase 0 : Pre-build
- Document d'architecture complet (23 sections, 57K caracteres) dans `docs/ARCHITECTURE.md`
- Analyse de la charte graphique, integration du logo
- 12 points d'arbitrage valides par l'utilisateur

### Phase 1 : Socle technique (TERMINE)

#### Phase 1.1-1.4 : Fondations
- Design system complet : 11 composants UI (Button, Badge, Card, Input, ProgressBar, ScoreRing, Spinner, DataTable, Dialog, Tabs, Textarea)
- Palette de couleurs Lingullio : navy, blue, teal, cream, gold avec echelles completes
- Polices : Inter (UI) + Noto Sans SC (caracteres chinois)
- i18n : 20 locales configurees, fichiers FR et EN complets (~200 cles chacun)
- Layouts : sidebar desktop + bottom nav mobile (learner), sidebar admin, auth centre
- Pages : login, activation (2 etapes), mot de passe oublie, reinitialisation, dashboard (mock data), admin dashboard

#### Phase 1.5 : Authentification Supabase
- Server actions : signIn, signOut, requestPasswordReset, resetPassword, verifyActivationCode, activateAccount, getCurrentUser, getSession
- Formulaires connectes a Supabase Auth (login, activation code + mot de passe, forgot-password, reset-password)
- Middleware avec protection auth : routes learner = session requise, routes admin = role admin/editor/reviewer requis
- Route callback auth pour confirmations email Supabase
- AuthProvider client + store Zustand pour l'etat de session
- Bouton de deconnexion dans la sidebar avec info utilisateur

#### Phase 1.6 : Base de donnees et API
- Schema initial : 33 tables (migration 00001), indexes, triggers updated_at
- Politiques RLS completes : 60+ policies sur toutes les tables (migration 00002)
- Seed data : 9 cours HSK, modules, lecons, 20 mots vocabulaire, 5 points grammaire, 10 caracteres, 5 exercices, 2 licences test
- Webhook Shopify : verification HMAC, creation licence avec code d'activation
- API routes : /api/user/profile (GET/PATCH), /api/user/preferences (GET/PUT)

### Phase 2 : Contenu (EN COURS)
- Phase 2a : HSK1 complet (319 vocab, 35 grammaire, 248 caracteres, 205 exercices, strokes SVG)
- Phase 2b : HSK1 contenu riche (content_html, mnemoniques, options d'exercices)
- Phase 2c : HSK2-4 ingestion (760 vocab, 31 grammaire, 407 caracteres, junctions)
- Phase 2d : Qualite traductions EN via LLM (passthrough 97-98%, grammar stubs corriges)
- Phase 2e : HSK5 ingestion (600 vocab, FR via LLM, 331 caracteres)

### Phase 2.1 : Composants admin
- DataTable generique avec pagination, barre de recherche, filtre de statut
- Dialog (modal Radix UI), Tabs (Radix UI), Textarea

## Modele de donnees
33 tables organisees en 8 domaines :
- **Utilisateurs** : users, learner_profiles, user_preferences
- **Licences** : licenses, courses, course_translations
- **Contenu** : modules, lessons, grammar_points, vocabulary_items, characters (+ translations pour chaque)
- **Exercices** : exercises, exercise_options (+ translations), stroke_order_data
- **Progression** : attempts, handwriting_attempts, progress_snapshots, user_recommendations, spaced_repetition_items
- **Examens blancs** : mock_exams, mock_exam_sections, mock_exam_questions, mock_exam_attempts (+ translations)
- **Media** : audio_files
- **Admin** : admin_actions, content_versions, ai_feedback_logs

## Structure du projet
```
src/
  app/
    [locale]/(auth)/     login, activate, forgot-password, reset-password
    [locale]/(learner)/  dashboard (+ futures pages)
    [locale]/(admin)/    admin dashboard (+ futures pages)
    api/                 user/profile, user/preferences, webhooks/shopify
    auth/callback/       Supabase auth callback
  components/
    layout/              sidebar, bottom-nav, top-bar, admin-sidebar
    providers/           auth-provider
    ui/                  button, badge, card, input, progress-bar, score-ring, spinner, data-table, dialog, tabs, textarea
  i18n/                  config, routing, request, navigation
  lib/
    auth/                actions (server actions)
    learner/             queries (fetchLearnerVocabulary, etc.)
    supabase/            client, server
  messages/              fr.json, en.json
  stores/                auth-store
  styles/                globals.css
  types/                 database.ts
scripts/                 9 scripts d'ingestion Python
supabase/
  migrations/            00001_initial_schema.sql, 00002_rls_policies.sql
  seed.sql
```

## Phases restantes

### Priorite 1 : Enrichissement contenu
- [ ] HSK4 vocabulaire complet (~440 mots manquants)
- [ ] HSK5 caracteres: enrichir radical/stroke_count (actuellement placeholders)
- [ ] HSK5 stroke_order_data (0/331 — pas de source SVG)
- [ ] Exercices HSK2/3/4/5 (actuellement HSK1 seulement)
- [ ] Generation audio TTS pour vocabulaire
- [ ] 18 passthroughs EN restants (4 HSK2 + 14 HSK3) — quantite negligeable

### Priorite 2 : Front apprenant
- [ ] Onboarding 9 etapes + test diagnostic
- [ ] Dashboard avec donnees reelles Supabase
- [ ] Moteur d'exercices (10 types implementes, 18 prevus)
- [ ] Progression et scoring

### Priorite 3 : Admin et production
- [ ] Pages admin CRUD
- [ ] Examens blancs
- [ ] Integration audio/TTS
- [ ] Pedagogie IA (GPT-4o corrections, Whisper oral)
- [ ] Moteur d'ecriture manuscrite
- [ ] QA, accessibilite, tests mobile
- [ ] Preparation lancement production (Vercel)

## Licences de test (dev)
- `test@example.com` / code `TEST1234` (HSK 1)
- `demo@example.com` / code `DEMO5678` (HSK 1)

## Variables d'environnement requises
Voir `.env.local.example` pour la liste complete.

## Derniere mise a jour
3 juillet 2026
