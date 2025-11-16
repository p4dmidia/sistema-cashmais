// Test session lookup
import { createClient } from '@supabase/supabase-js';

async function testSession() {
  const supabase = createClient(
    'https://hffxmntvtsimwlsapfod.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
  );

  try {
    const sessionToken = 'test_session_network_tree_1763122253033';
    
    console.log('Testing session lookup with token:', sessionToken);
    
    // Test the exact query from the API
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, full_name, email, cpf, created_at, last_access_at)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    console.log('Session query result:');
    console.log('Data:', sessionData);
    console.log('Error:', sessionError);
    
    // Check if session exists at all
    const { data: allSessions, error: allError } = await supabase
      .from('affiliate_sessions')
      .select('*');
      
    console.log('\nAll sessions:', allSessions);
    console.log('All sessions error:', allError);

  } catch (error) {
    console.error('Error testing session:', error);
  }
}

testSession();