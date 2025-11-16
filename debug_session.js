import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hffxmntvtsimwlsapfod.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
);

async function debugSession() {
  const sessionToken = 'test_session_network_tree_1763122253033';
  const now = new Date().toISOString();
  
  console.log('Current time:', now);
  console.log('Session token:', sessionToken);
  
  try {
    // Test the exact query from the API
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(
          id, 
          full_name, 
          cpf, 
          email, 
          whatsapp, 
          referral_code, 
          sponsor_id, 
          is_verified, 
          created_at,
          last_access_at
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', now)
      .eq('affiliates.is_active', true)
      .single();

    console.log('Session data:', sessionData);
    console.log('Session error:', sessionError);
    
    if (sessionError) {
      // Let's try a simpler query to see what's wrong
      console.log('\n--- Trying simpler query ---');
      const { data: simpleSession, error: simpleError } = await supabase
        .from('affiliate_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();
      
      console.log('Simple session data:', simpleSession);
      console.log('Simple session error:', simpleError);
      
      if (simpleSession) {
        console.log('\n--- Checking if session is expired ---');
        console.log('Session expires at:', simpleSession.expires_at);
        console.log('Is expired?', new Date(simpleSession.expires_at) < new Date());
        
        console.log('\n--- Checking affiliate data ---');
        const { data: affiliateData, error: affiliateError } = await supabase
          .from('affiliates')
          .select('*')
          .eq('id', simpleSession.affiliate_id)
          .single();
          
        console.log('Affiliate data:', affiliateData);
        console.log('Affiliate error:', affiliateError);
        console.log('Is active?', affiliateData?.is_active);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugSession();