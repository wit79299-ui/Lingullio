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

### Phase 2 (Back office contenu) - Partiellement commence
- Pages admin CRUD pour cours, modules, lecons, vocabulaire, grammaire, caracteres
- Editeur d'exercices (18 types)
- Systeme d'import/export de contenu
- Workflow de preview et publication

### Phase 3 : Import du premier contenu HSK 1 et 2
### Phase 4 : Front apprenant complet (onboarding 9 etapes, dashboard donnees reelles)
### Phase 5 : Moteur d'exercices (18 types), progression, scoring
### Phase 6 : Examens blancs, integration audio/TTS
### Phase 7 : Pedagogie IA (GPT-4o corrections, Whisper oral, conversation)
### Phase 8 : Moteur d'ecriture manuscrite (Canvas, Make Me a Hanzi)
### Phase 9 : Analytique admin
### Phase 10 : QA, accessibilite, tests mobile
### Phase 11 : Preparation lancement production

## Licences de test (dev)
- `test@example.com` / code `TEST1234` (HSK 1)
- `demo@example.com` / code `DEMO5678` (HSK 1)

## Variables d'environnement requises
Voir `.env.local.example` pour la liste complete.

## Derniere mise a jour
2 juillet 2026
