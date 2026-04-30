-- Migration: Service Directory (Help Service Replacement)
-- Description: Creates tables for categories, images, and reviews, and updates companies table.

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT, -- Lucide icon name
    slug TEXT UNIQUE, -- URL friendly name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. COMPANY_CATEGORIES (Many-to-Many)
CREATE TABLE IF NOT EXISTS company_categories (
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, category_id)
);

-- 3. COMPANY_IMAGES (Gallery)
CREATE TABLE IF NOT EXISTS company_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. COMPANY_REVIEWS
CREATE TABLE IF NOT EXISTS company_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. UPDATE COMPANIES TABLE
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 6. INSERT INITIAL CATEGORIES
INSERT INTO categories (name, slug, icon) VALUES
('Encanador', 'encanador', 'Wrench'),
('Eletricista Residencial', 'eletricista', 'Zap'),
('Marceneiro', 'marceneiro', 'Hammer'),
('Mecânico', 'mecanico', 'Car'),
('Pintor', 'pintor', 'Paintbrush'),
('Pedreiro', 'pedreiro', 'Construction'),
('Jardineiro', 'jardineiro', 'Leaf'),
('Limpeza de Estofados', 'limpeza-estofados', 'Sparkles'),
('Ar Condicionado', 'ar-condicionado', 'Wind'),
('Chaveiro', 'chaveiro', 'Key')
ON CONFLICT (name) DO NOTHING;

-- 7. RLS POLICIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Leitura pública categorias" ON categories FOR SELECT USING (true);
CREATE POLICY "Leitura pública company_categories" ON company_categories FOR SELECT USING (true);
CREATE POLICY "Leitura pública company_images" ON company_images FOR SELECT USING (true);
CREATE POLICY "Leitura pública company_reviews" ON company_reviews FOR SELECT USING (is_active = true);

-- Auth write access for reviews
CREATE POLICY "Usuários podem avaliar" ON company_reviews FOR INSERT WITH CHECK (true);
