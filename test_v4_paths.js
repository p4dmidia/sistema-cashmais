
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

async function testUrl(name, url, method = 'GET', body = null) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`URL: ${url}`);
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 300));
    return res.status;
  } catch (e) {
    console.error('Error:', e.message);
    return 500;
  }
}

async function run() {
    // 1. Single /api (Expected path Hono sees: /affiliate/register if gateway strips one)
    await testUrl('Single API Path', `${SUPABASE_URL}/functions/v1/api/affiliate/register`, 'POST', { test: true });
    
    // 2. No /api part (Expected to match nothing or handle it)
    await testUrl('Base function path', `${SUPABASE_URL}/functions/v1/api/register`, 'POST', { test: true });

    // 3. Double /api (What the proxy sends)
    await testUrl('Double API Path', `${SUPABASE_URL}/functions/v1/api/api/affiliate/register`, 'POST', { test: true });
}

run();
