// Test cookie parsing
const { createClient } = require('@supabase/supabase-js');

async function testCookieParsing() {
  // Simulate the cookie parsing logic from the API
  const cookieHeader = 'affiliate_session=test_session_network_tree_1763122253033';
  
  console.log('Testing cookie parsing...');
  console.log('Cookie header:', cookieHeader);
  
  // Extract session token (similar to getCookie function)
  const sessionToken = cookieHeader.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('affiliate_session='))
    ?.split('=')[1];
    
  console.log('Extracted session token:', sessionToken);
  
  if (!sessionToken) {
    console.log('No session token found - would return 401');
    return;
  }
  
  console.log('Session token found, proceeding with authentication...');
  
  // Test the Supabase query
  const supabase = createClient(
    'https://hffxmntvtsimwlsapfod.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
  );

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    console.log('Session query result:');
    console.log('Data:', sessionData);
    console.log('Error:', sessionError);
    
    if (sessionError || !sessionData) {
      console.log('Session not found or expired - would return 401');
    } else {
      console.log('Session valid - would proceed with request');
    }
    
  } catch (error) {
    console.error('Error testing session:', error);
  }
}

testCookieParsing();