
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

async function testApi() {
  console.log('Testing WITHOUT headers...');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api/health`, { method: 'GET' });
    console.log('Status (no headers):', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error (no headers):', e);
  }

  console.log('\nTesting WITH headers (apikey)...');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api/health`, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    console.log('Status (with headers):', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error (with headers):', e);
  }
}

testApi();
