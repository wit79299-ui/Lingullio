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
| courses | 9 | HSK 1-9 (1-4 published, 5-9 draft) |
| modules | 27 | 10 HSK1 + 6 HSK2 + 7 HSK3 + 4 HSK4 |
| lessons | 158 | 51 HSK1 + 31 HSK2 + 63 HSK3 + 19 HSK4 |
| vocabulary_items | 1079 | 319 HSK1 + 200 HSK2 + 500 HSK3 + 60 HSK4 |
| grammar_points | 66 | 35 HSK1 + 9 HSK2 + 11 HSK3 + 11 HSK4 |
| characters | 655 | Avec deduplication inter-niveaux |
| stroke_order_data | 655 | 100% coverage SVG (source: MakeMeAHanzi) |
| exercises | 205 | HSK1 seulement (10 types differents) |
| exercise_options | 456 | Options MCQ pour 112 exercices |
| lesson_vocabulary_items | 1042 | Mappings lesson-vocab |
| lesson_grammar_points | 51 | Mappings lesson-grammar |
| lesson_characters | 1434 | Mappings lesson-characters |
| audio_files | 0 | TTS non encore genere |

### Traductions FR+EN
- vocabulary_translations: 1078/1079 FR + 1078/1079 EN (100%)
- grammar_point_translations: 66/66 FR + 66/66 EN (100%)
- character_translations: 5664 records (couvre 20 locales pour HSK1, FR+EN pour HSK2-3)
- lesson_translations: 316 (158 lecons x 2 locales)

### Couverture HSK 3.0 officiel (mots additionnels par niveau)
- HSK1: 319/~300 mots (107%) -- complet
- HSK2: 200/~200 mots (100%) -- complet
- HSK3: 500/~500 mots (100%) -- complet
- HSK4: 60/~500 mots (12%) -- source DOCX partielle, necessite enrichissement

### Scripts d'ingestion (dans `/scripts/`)
- `ingest-hsk1.py` — Phase 1 : modules, lecons, grammaire, vocab enrichi
- `ingest-hsk1-phase2.py` — Phase 2 : content_html, mnemoniques, exercices, strokes
- `fix-exercise-options-v2.py` — Correction UUID pour options d'exercices
- `ingest-hsk234.py` — Ingestion HSK2-4 : vocab HTML, grammaire DOCX, characters
- `fix-hsk234-characters.py` — Deduplication caracteres entre niveaux
- `populate-junctions.py` — Tables de jonction lesson<->contenu

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

### Phase 2.1 : Composants admin (EN COURS)
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
    supabase/            client, server
  messages/              fr.json, en.json
  stores/                auth-store
  styles/                globals.css
  types/                 database.ts
supabase/
  migrations/            00001_initial_schema.sql, 00002_rls_policies.sql
  seed.sql
```

## Phases restantes

### Priorite 1 : Enrichissement contenu
- [ ] HSK4 vocabulaire complet (~440 mots manquants)
- [ ] Exercices HSK2/3/4 (actuellement HSK1 seulement)
- [ ] Generation audio TTS pour vocabulaire (53/1079 ont audio_url)
- [ ] Traductions EN de qualite pour HSK2/3 (actuellement generees par mapping FR→EN basique)

### Priorite 2 : Front apprenant
- [ ] Onboarding 9 etapes
- [ ] Dashboard avec donnees reelles Supabase
- [ ] Moteur d'exercices (10 types implementes, 18 prevus)
- [ ] Progression et scoring

### Priorite 3 : Admin et production
- [ ] Pages admin CRUD pour cours, modules, lecons, vocabulaire, grammaire, caracteres
- [ ] Examens blancs (donnees presentes dans DOCX mais pas encore ingerees)
- [ ] Integration audio/TTS
- [ ] Pedagogie IA (GPT-4o corrections, Whisper oral)
- [ ] Moteur d'ecriture manuscrite (Canvas, Make Me a Hanzi, strokes SVG deja en DB)
- [ ] QA, accessibilite, tests mobile
- [ ] Preparation lancement production (Vercel)

## Licences de test (dev)
- `test@example.com` / code `TEST1234` (HSK 1)
- `demo@example.com` / code `DEMO5678` (HSK 1)

## Variables d'environnement requises
Voir `.env.local.example` pour la liste complete.

## Derniere mise a jour
3 juillet 2026
