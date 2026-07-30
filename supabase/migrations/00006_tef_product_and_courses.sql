-- ============================================================
-- Lingullio - Migration 00006: TEF Product, Courses & SKU Mappings
-- 1. Create LINGULLIO-TEF product
-- 2. Create TEF courses (4 épreuves + 1 global)
-- 3. Create course translations (FR + EN)
-- 4. Create Shopify SKU mappings for TEF
-- 5. Add product_id column to licenses table
-- ============================================================

-- ============================================================
-- 1. CREATE LINGULLIO-TEF PRODUCT
-- ============================================================
INSERT INTO public.products (id, code, exam_type, target_language, status, sort_order)
VALUES ('f0000000-0000-0000-0000-000000000002', 'LINGULLIO-TEF', 'TEF', 'fr', 'published', 2)
ON CONFLICT (code) DO NOTHING;

-- Product translations
INSERT INTO public.product_translations (product_id, locale, name, description, tagline) VALUES
('f0000000-0000-0000-0000-000000000002', 'fr', 'Lingullio TEF — Français', 'Préparation complète au TEF (Test d''Évaluation de Français). Compréhension orale et écrite, expression orale et écrite, vocabulaire et structure.', 'Réussissez le TEF du premier coup'),
('f0000000-0000-0000-0000-000000000002', 'en', 'Lingullio TEF — French', 'Complete TEF (Test d''Évaluation de Français) preparation. Listening and reading comprehension, speaking and writing, vocabulary and structure.', 'Pass the TEF on your first attempt')
ON CONFLICT (product_id, locale) DO NOTHING;

-- ============================================================
-- 2. CREATE TEF COURSES
-- ============================================================
-- TEF has 4 mandatory sections (épreuves):
--   - Compréhension orale (CO) — Listening comprehension
--   - Compréhension écrite (CE) — Reading comprehension
--   - Expression orale (EO) — Speaking
--   - Expression écrite (EE) — Writing
-- Plus an optional section:
--   - Lexique et Structure (LS) — Vocabulary & Grammar

-- tef-co: Compréhension orale
INSERT INTO public.courses (id, exam_type, slug, status, version)
VALUES ('b0000000-0000-0000-0000-000000000001', 'TEF', 'tef-co', 'published', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
('b0000000-0000-0000-0000-000000000001', 'fr', 'TEF — Compréhension orale', 'Entraînement à la compréhension orale du TEF. 60 questions, 40 minutes. Écoutez et comprenez des dialogues, annonces et discussions en français.'),
('b0000000-0000-0000-0000-000000000001', 'en', 'TEF — Listening Comprehension', 'TEF listening comprehension training. 60 questions, 40 minutes. Listen to and understand French dialogues, announcements and discussions.')
ON CONFLICT (course_id, locale) DO NOTHING;

-- tef-ce: Compréhension écrite
INSERT INTO public.courses (id, exam_type, slug, status, version)
VALUES ('b0000000-0000-0000-0000-000000000002', 'TEF', 'tef-ce', 'published', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
('b0000000-0000-0000-0000-000000000002', 'fr', 'TEF — Compréhension écrite', 'Entraînement à la compréhension écrite du TEF. 60 questions, 60 minutes. Lisez et analysez des textes, articles et documents en français.'),
('b0000000-0000-0000-0000-000000000002', 'en', 'TEF — Reading Comprehension', 'TEF reading comprehension training. 60 questions, 60 minutes. Read and analyze French texts, articles and documents.')
ON CONFLICT (course_id, locale) DO NOTHING;

-- tef-eo: Expression orale
INSERT INTO public.courses (id, exam_type, slug, status, version)
VALUES ('b0000000-0000-0000-0000-000000000003', 'TEF', 'tef-eo', 'published', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
('b0000000-0000-0000-0000-000000000003', 'fr', 'TEF — Expression orale', 'Entraînement à l''expression orale du TEF. 2 sections, 15 minutes. Pratiquez la prise de parole, l''argumentation et le dialogue en français.'),
('b0000000-0000-0000-0000-000000000003', 'en', 'TEF — Speaking', 'TEF speaking training. 2 sections, 15 minutes. Practice speaking, argumentation and dialogue in French.')
ON CONFLICT (course_id, locale) DO NOTHING;

-- tef-ee: Expression écrite
INSERT INTO public.courses (id, exam_type, slug, status, version)
VALUES ('b0000000-0000-0000-0000-000000000004', 'TEF', 'tef-ee', 'published', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
('b0000000-0000-0000-0000-000000000004', 'fr', 'TEF — Expression écrite', 'Entraînement à l''expression écrite du TEF. 2 sections, 60 minutes. Rédigez des textes structurés et argumentés en français.'),
('b0000000-0000-0000-0000-000000000004', 'en', 'TEF — Writing', 'TEF writing training. 2 sections, 60 minutes. Write structured and argumentative texts in French.')
ON CONFLICT (course_id, locale) DO NOTHING;

-- tef-ls: Lexique et Structure
INSERT INTO public.courses (id, exam_type, slug, status, version)
VALUES ('b0000000-0000-0000-0000-000000000005', 'TEF', 'tef-ls', 'published', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, description) VALUES
('b0000000-0000-0000-0000-000000000005', 'fr', 'TEF — Lexique et Structure', 'Maîtrisez le vocabulaire et la grammaire française pour le TEF. 40 questions, 30 minutes. Enrichissez votre lexique et perfectionnez votre maîtrise des structures grammaticales.'),
('b0000000-0000-0000-0000-000000000005', 'en', 'TEF — Vocabulary & Grammar', 'Master French vocabulary and grammar for the TEF. 40 questions, 30 minutes. Enrich your lexicon and perfect your grasp of grammatical structures.')
ON CONFLICT (course_id, locale) DO NOTHING;

-- ============================================================
-- 3. LINK TEF COURSES TO PRODUCT
-- ============================================================
UPDATE public.courses SET product_id = 'f0000000-0000-0000-0000-000000000002'
WHERE exam_type = 'TEF' AND product_id IS NULL;

-- ============================================================
-- 4. SHOPIFY SKU MAPPINGS FOR TEF
-- ============================================================
-- TEF-MASTERY = full product access (all sections)
INSERT INTO public.shopify_sku_mappings (sku, product_id, grants_full_product) VALUES
('TEF-MASTERY', 'f0000000-0000-0000-0000-000000000002', true)
ON CONFLICT (sku) DO NOTHING;

-- Individual section SKUs
INSERT INTO public.shopify_sku_mappings (sku, course_id, product_id, grants_full_product) VALUES
('TEF-CO', 'b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', false),
('TEF-CE', 'b0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', false),
('TEF-EO', 'b0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', false),
('TEF-EE', 'b0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', false),
('TEF-LS', 'b0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', false)
ON CONFLICT (sku) DO NOTHING;

-- ============================================================
-- 5. ADD product_id TO licenses TABLE (for multi-product support)
-- ============================================================
-- This allows us to know which product a license grants access to,
-- not just which individual course.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'licenses' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.licenses ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add grants_full_product to licenses (true = access to ALL courses of the product)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'licenses' AND column_name = 'grants_full_product'
    ) THEN
        ALTER TABLE public.licenses ADD COLUMN grants_full_product BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Backfill existing HSK licenses with product_id
UPDATE public.licenses 
SET product_id = 'f0000000-0000-0000-0000-000000000001',
    grants_full_product = true
WHERE product_id IS NULL 
  AND course_id IN (SELECT id FROM public.courses WHERE exam_type = 'HSK');

-- Index for license lookups by product
CREATE INDEX IF NOT EXISTS idx_licenses_product ON public.licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_grants_full ON public.licenses(user_id, product_id, grants_full_product) WHERE status = 'active';
