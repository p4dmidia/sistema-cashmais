// Create test affiliate and session for network tree testing
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function createTestData() {
  const supabase = createClient(
    'https://hffxmntvtsimwlsapfod.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
  );

  try {
    // Create test affiliate
    const passwordHash = await bcrypt.hash('test123', 10);
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        full_name: 'Test Affiliate',
        email: 'test@cashmais.com',
        cpf: '12345678901',
        phone: '11999999999',
        password_hash: passwordHash,
        referral_code: 'TEST123',
        is_active: true,
        is_verified: true,
        last_access_at: new Date().toISOString()
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('Error creating affiliate:', affiliateError);
      return;
    }

    console.log('Created test affiliate:', affiliate);

    // Create test session
    const sessionToken = 'test_session_network_tree_' + Date.now();
    const { data: session, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .insert({
        affiliate_id: affiliate.id,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        ip_address: '127.0.0.1',
        user_agent: 'Test Browser',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return;
    }

    console.log('Created test session:', session);
    console.log('Session token for testing:', sessionToken);

    // Create some test network members (referrals)
    for (let i = 1; i <= 3; i++) {
      const { data: referral, error: referralError } = await supabase
        .from('affiliates')
        .insert({
          full_name: `Test Referral ${i}`,
          email: `referral${i}@cashmais.com`,
          cpf: `1234567890${i}`,
          phone: `1199999999${i}`,
          password_hash: passwordHash,
          referral_code: `REF${i}123`,
          sponsor_id: affiliate.id,
          is_active: true,
          is_verified: true,
          last_access_at: new Date().toISOString()
        })
        .select()
        .single();

      if (referralError) {
        console.error(`Error creating referral ${i}:`, referralError);
      } else {
        console.log(`Created referral ${i}:`, referral);
      }
    }

    console.log('\nTest data created successfully!');
    console.log('Session token for testing network tree:', sessionToken);
    console.log('You can now test the network tree with this session token.');

  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestData();