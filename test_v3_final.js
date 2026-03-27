
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

async function testUrl(name, path, method = 'GET', body = null) {
  console.log(`\n🧪 Testing: ${name} (${path}) [${method}]`);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
      method: method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    console.log('Status:', res.status);
    const json = await res.json().catch(() => ({}));
    console.log('Response:', JSON.stringify(json).slice(0, 300));
    return res.status;
  } catch (e) {
    console.error('Error:', e.message);
    return 500;
  }
}

async function run() {
    await testUrl('Health', '/health');
    await testUrl('API Health', '/api/health');
    
    // Valid dummy payload for registration
    const dummyAffiliate = {
        full_name: 'Test AI User',
        cpf: '12345678901',
        email: `test_ai_${Date.now()}@example.com`,
        password: 'password123',
        referral_code: null
    };
    
    await testUrl('Affiliate Reg', '/api/affiliate/register', 'POST', dummyAffiliate);
}

run();
