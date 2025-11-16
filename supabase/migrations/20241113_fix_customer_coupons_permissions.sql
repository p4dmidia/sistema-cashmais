-- Fix permissions for customer_coupons table to allow affiliate registration
-- Grant permissions to anon role for registration
GRANT SELECT ON customer_coupons TO anon;
GRANT INSERT ON customer_coupons TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON customer_coupons TO authenticated;

-- Enable RLS and create policies
ALTER TABLE customer_coupons ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert coupons during registration
CREATE POLICY "Allow anonymous coupon insertion" ON customer_coupons
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated users to manage their own coupons
CREATE POLICY "Users can manage own coupons" ON customer_coupons
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Allow public read access to active coupons
CREATE POLICY "Public can view active coupons" ON customer_coupons
    FOR SELECT TO anon, authenticated
    USING (is_active = true);