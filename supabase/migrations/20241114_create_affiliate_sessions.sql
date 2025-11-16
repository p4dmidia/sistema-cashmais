-- Create affiliate_sessions table for Supabase
CREATE TABLE IF NOT EXISTS public.affiliate_sessions (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_token ON public.affiliate_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_affiliate_id ON public.affiliate_sessions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_expires_at ON public.affiliate_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.affiliate_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - allow service role to manage all sessions
CREATE POLICY "Allow service role to manage all sessions" ON public.affiliate_sessions
    FOR ALL USING (true);

-- Grant permissions to service role
GRANT ALL ON public.affiliate_sessions TO authenticated;
GRANT SELECT ON public.affiliate_sessions TO anon;