-- Fix permissions for user_settings table to allow affiliate registration
-- Grant permissions to anon role for registration
GRANT SELECT ON user_settings TO anon;
GRANT INSERT ON user_settings TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON user_settings TO authenticated;

-- Enable RLS and create policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert settings during registration
CREATE POLICY "Allow anonymous settings insertion" ON user_settings
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated users to manage their own settings (using user_id bigint)
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL TO authenticated
    USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()));