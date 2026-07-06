# Lingullio

## Project Overview
- **Name**: Lingullio (lingullio.com)
- **Goal**: Premium EdTech platform for Asian language exam preparation, starting with HSK (Mandarin Chinese, 2026 new format, 9 levels)
- **Model**: Complete pedagogical system (diagnostic, guidance, training, measurement, error explanation, progression prediction)
- **Price**: ~99 EUR, 12-month license via Shopify

## URLs
- **Production**: https://lingullio.vercel.app
- **GitHub**: https://github.com/wit79299-ui/Lingullio

## Tech Stack
- **Frontend**: Next.js 15 (App Router, RSC), React 19, TypeScript strict
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS 4 with Lingullio design tokens (`@theme`)
- **i18n**: next-intl v4, 20 languages, `localePrefix: 'as-needed'`, default `en`
- **UI**: Radix UI (headless), CVA (variants), Lucide React (icons)
- **State**: Zustand (client) with Supabase sync, TanStack Query (server state)
- **Forms**: React Hook Form + Zod
- **Deployment**: Vercel (auto-deploy from GitHub)

## Data Architecture

### Database (Supabase PostgreSQL)
38+ tables organized in 9 domains:
- **Users**: users, learner_profiles, user_preferences
- **Licenses**: licenses, courses, course_translations, products, product_translations, shopify_sku_mappings
- **Content**: modules, lessons, grammar_points, vocabulary_items, characters (+ translations)
- **Exercises**: exercises, exercise_options (+ translations), stroke_order_data
- **Progression**: attempts, handwriting_attempts, progress_snapshots, user_recommendations, spaced_repetition_items
- **Sync** (NEW): user_knowledge_items, placement_results + learner_profiles JSONB columns
- **Mock Exams**: mock_exams, mock_exam_sections, mock_exam_questions, mock_exam_attempts (+ translations)
- **Media**: audio_files
- **Admin**: admin_actions, content_versions, ai_feedback_logs

### Progression Sync System (NEW - Migration 00005)
Real-time bidirectional sync between client Zustand stores and Supabase:

| Store | Sync Target | Strategy |
|-------|-------------|----------|
| `user-knowledge-store` | `user_knowledge_items` table | Item-level upsert, merge counters |
| `gamification-store` | `learner_profiles` columns + `gamification_extended` JSONB | Max-of-counters merge |
| `training-mode-store` | `learner_profiles.training_mode_config` JSONB | Last-write-wins |
| Placement results | `placement_results` table | Insert-only, latest wins |

**Sync Architecture:**
- `SyncManager` (client singleton): debounced push (2s), auto-retry (3x), offline-first
- `SyncProvider` (React component): auto-pull on login, merge server<->local with conflict resolution
- API routes: `/api/sync/knowledge`, `/api/sync/gamification`, `/api/sync/training-mode`, `/api/sync/placement`, `/api/sync/pull`
- Auth: Supabase SSR cookies -> server-side user resolution -> service role client for DB ops
- RLS policies on all new tables (users can only access their own data)

### Storage Services Used
- **Supabase Auth**: Email/password authentication with activation flow
- **Supabase PostgreSQL**: All relational data with RLS
- **Zustand + localStorage**: Client-side cache (offline-first, syncs to Supabase)

## Completed Features

### Authentication & Licensing
- Shopify webhook (`orders/paid` -> POST /api/webhooks/shopify) -> license creation
- Brevo transactional email with activation link
- Activation flow: code verification -> password setup -> account creation
- Login with email/password, password reset flow
- Eye toggle on all password fields (login, activate, reset-password)

### Placement Test (Diagnostic)
- Full placement test engine with 3 phases: profile (5 questions), diagnostic (32 questions), production (2 tasks)
- All content translated to English (200+ strings)
- Pinyin-based written production (not characters)
- SM-2 SRS integration: diagnostic answers seed the knowledge map
- Results synced to Supabase `placement_results` table

### Learning Engine
- SM-2 spaced repetition algorithm (`srs-engine.ts`)
- User Knowledge Map store: tracks every vocab/character/grammar item encountered
- Mastery levels: unknown -> seen -> learning -> familiar -> mastered
- Review queue with priority scoring (overdue items first)
- At-risk item detection (Ebbinghaus forgetting curve)

### Gamification
- XP system with leveling (configurable thresholds)
- Streak tracking (daily activity, longest streak)
- Badge system with 15+ badges
- Session scoring with perfect session bonus, speed bonus
- Toast notifications for XP, level-up, badges, streak milestones

### Training Modes
- **Standard**: Default dashboard, user-driven navigation
- **Coach Autonome**: Auto-triggered after 15 days inactivity
- **Parcours Inverse**: User declares HSK goal + deadline, follows dynamic roadmap with weekly milestones

### Content (Supabase)
| Level | Vocabulary | Grammar | Characters | Exercises | Strokes |
|-------|-----------|---------|------------|-----------|---------|
| HSK1 | 319 | 35 | 248 | 205 | 248 |
| HSK2 | 200 | 9 | 123 | - | 123 |
| HSK3 | 500 | 11 | 284 | - | 284 |
| HSK4 | 60 | 11 | - | - | - |
| HSK5 | 600 | - | 331 | - | - |

### Admin
- DataTable with pagination, search, status filter
- Content management pages for courses, modules, lessons, vocabulary, grammar, characters, exercises

### Progression Sync (Production-Ready)
- All user progression data synced to Supabase (not just localStorage)
- Offline-first: works without network, syncs when available
- Multi-device support: same data on any browser/device
- Conflict resolution: merge strategy (max counters, union arrays)

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/profile` | GET/PATCH | User profile management |
| `/api/user/preferences` | GET/PUT | User preferences |
| `/api/webhooks/shopify` | POST | Shopify order webhook |
| `/api/sync/pull` | GET | Pull all progression data (login) |
| `/api/sync/knowledge` | GET/POST | Knowledge map sync |
| `/api/sync/gamification` | GET/POST | Gamification state sync |
| `/api/sync/training-mode` | GET/POST | Training mode config sync |
| `/api/sync/placement` | GET/POST | Placement results sync |
| `/auth/callback` | GET | Supabase auth callback |

## Remaining Work

### Priority 1: Content Enrichment
- [ ] HSK4 vocabulary complete (~440 words missing)
- [ ] HSK5 characters: enrich radical/stroke_count
- [ ] HSK5 stroke_order_data
- [ ] Exercises for HSK2/3/4/5
- [ ] TTS audio generation

### Priority 2: Frontend Features
- [ ] Exercise engine (10 types implemented, 18 planned)
- [ ] Error tracking (Sentry)
- [ ] Rate limiting on API routes

### Priority 3: Admin & Production
- [ ] Mock exam engine
- [ ] AI pedagogy (GPT-4o corrections, Whisper oral)
- [ ] Handwriting engine
- [ ] QA, accessibility, mobile testing

## Migrations Applied

| Migration | Description | Date |
|-----------|-------------|------|
| 00001 | Initial schema (33 tables) | 2026-07-02 |
| 00002 | RLS policies (60+ policies) | 2026-07-02 |
| 00003 | Gamification columns | 2026-07-04 |
| 00004 | Products & level rename | 2026-07-05 |
| 00005 | Progression sync system | 2026-07-06 |

## Environment Variables
See `.env.local.example` for the complete list.

## Last Updated
6 July 2026
