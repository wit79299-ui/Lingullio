-- ============================================================
-- Lingullio - Migration 00004: Multi-Product Architecture
-- 1. Create products & product_translations tables
-- 2. Create shopify_sku_mappings table  
-- 3. Rename hsk_level → level across all content tables
-- 4. Add product_id FK to courses
-- 5. Create exec_raw_sql utility function
-- 6. Seed initial product data (Lingullio HSK)
-- ============================================================

-- ============================================================
-- 0. UTILITY: exec_raw_sql function for future migrations
-- ============================================================
CREATE OR REPLACE FUNCTION public.exec_raw_sql(sql_text TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,             -- e.g. 'LINGULLIO-HSK', 'LINGULLIO-TOPIK'
    exam_type TEXT NOT NULL,               -- e.g. 'HSK', 'TOPIK', 'TEF'
    target_language TEXT NOT NULL,          -- e.g. 'zh', 'ko', 'fr'
    icon_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'validated', 'published', 'archived')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,                    -- e.g. 'Lingullio HSK — Chinois'
    description TEXT,
    tagline TEXT,                           -- e.g. 'Maîtrisez le HSK de 1 à 6'
    UNIQUE(product_id, locale)
);

-- ============================================================
-- 2. SHOPIFY SKU MAPPINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopify_sku_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,              -- e.g. 'HSK-1', 'HSK-MASTERY', 'TOPIK-I'
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    grants_full_product BOOLEAN NOT NULL DEFAULT false,  -- true = access to ALL levels of the product
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. ADD product_id TO courses
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 4. RENAME hsk_level → level IN ALL CONTENT TABLES
-- ============================================================

-- 4a. vocabulary_items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'vocabulary_items' AND column_name = 'hsk_level'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'vocabulary_items' AND column_name = 'level'
    ) THEN
        ALTER TABLE public.vocabulary_items RENAME COLUMN hsk_level TO level;
    END IF;
END $$;

-- 4b. grammar_points
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'grammar_points' AND column_name = 'hsk_level'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'grammar_points' AND column_name = 'level'
    ) THEN
        ALTER TABLE public.grammar_points RENAME COLUMN hsk_level TO level;
    END IF;
END $$;

-- 4c. characters
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'hsk_level'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'level'
    ) THEN
        ALTER TABLE public.characters RENAME COLUMN hsk_level TO level;
    END IF;
END $$;

-- 4d. exercises
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'hsk_level'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'level'
    ) THEN
        ALTER TABLE public.exercises RENAME COLUMN hsk_level TO level;
    END IF;
END $$;

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_exam_type ON public.products(exam_type);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_courses_product_id ON public.courses(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sku_mappings_product ON public.shopify_sku_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sku_mappings_course ON public.shopify_sku_mappings(course_id);

-- ============================================================
-- 6. TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. RLS POLICIES for new tables
-- ============================================================

-- Products: readable by all authenticated, writable by admin
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Product translations: same as products
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_translations_read_all" ON public.product_translations FOR SELECT USING (true);
CREATE POLICY "product_translations_admin_write" ON public.product_translations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Shopify SKU mappings: admin only
ALTER TABLE public.shopify_sku_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sku_mappings_admin_read" ON public.shopify_sku_mappings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sku_mappings_admin_write" ON public.shopify_sku_mappings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 8. SEED: Create Lingullio HSK product & link courses
-- ============================================================
INSERT INTO public.products (id, code, exam_type, target_language, status, sort_order)
VALUES ('p0000000-0000-0000-0000-000000000001', 'LINGULLIO-HSK', 'HSK', 'zh', 'published', 1)
ON CONFLICT (code) DO NOTHING;

-- Translations
INSERT INTO public.product_translations (product_id, locale, name, description, tagline) VALUES
('p0000000-0000-0000-0000-000000000001', 'fr', 'Lingullio HSK — Chinois', 'Préparation complète aux examens HSK du niveau 1 au niveau 6. Vocabulaire, grammaire, caractères, exercices interactifs et examens blancs.', 'Maîtrisez le HSK de 1 à 6'),
('p0000000-0000-0000-0000-000000000001', 'en', 'Lingullio HSK — Chinese', 'Complete HSK exam preparation from level 1 to level 6. Vocabulary, grammar, characters, interactive exercises and mock exams.', 'Master HSK from level 1 to 6')
ON CONFLICT (product_id, locale) DO NOTHING;

-- Link all HSK courses to the product
UPDATE public.courses SET product_id = 'p0000000-0000-0000-0000-000000000001'
WHERE exam_type = 'HSK' AND product_id IS NULL;

-- Shopify SKU mappings
-- HSK-MASTERY = full product access (all levels)
INSERT INTO public.shopify_sku_mappings (sku, product_id, grants_full_product) VALUES
('HSK-MASTERY', 'p0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (sku) DO NOTHING;

-- Individual level SKUs
INSERT INTO public.shopify_sku_mappings (sku, course_id, product_id, grants_full_product) VALUES
('HSK-1', 'a0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-2', 'a0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-3', 'a0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-4', 'a0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-5', 'a0000000-0000-0000-0000-000000000005', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-6', 'a0000000-0000-0000-0000-000000000006', 'p0000000-0000-0000-0000-000000000001', false),
('HSK-7-9', 'a0000000-0000-0000-0000-000000000079', 'p0000000-0000-0000-0000-000000000001', false)
ON CONFLICT (sku) DO NOTHING;
