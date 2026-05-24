-- Migration: Create Video Tutorials Table and RLS Policies
CREATE TABLE IF NOT EXISTS public.video_tutorials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active video tutorials" ON public.video_tutorials;
DROP POLICY IF EXISTS "Allow admin full access to video tutorials" ON public.video_tutorials;

-- Create Policies
CREATE POLICY "Allow public read access to active video tutorials"
  ON public.video_tutorials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow admin full access to video tutorials"
  ON public.video_tutorials FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Grant privileges
GRANT ALL ON TABLE public.video_tutorials TO postgres, service_role;
GRANT SELECT ON TABLE public.video_tutorials TO anon, authenticated;
