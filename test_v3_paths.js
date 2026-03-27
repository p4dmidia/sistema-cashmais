
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

async function testUrl(name, path, method = 'GET') {
  console.log(`\n🧪 Testing: ${name} (${path}) [${method}]`);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
      method: method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: method === 'POST' ? JSON.stringify({ test: true }) : undefined
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 100));
    return res.ok;
  } catch (e) {
    console.error('Error:', e.message);
    return false;
  }
}

async function run() {
    await testUrl('Aff Reg (Path: /api/affiliate/register)', '/api/affiliate/register', 'POST'); 
    await testUrl('Aff Reg (Path: /affiliate/register)', '/affiliate/register', 'POST');
    await testUrl('Aff Reg (Path: /register)', '/register', 'POST');
    await testUrl('Test Regex (Path: /anything/affiliate/register)', '/anything/affiliate/register', 'GET');
}

run();
