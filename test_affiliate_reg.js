
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

const testAffiliateData = {
  full_name: 'Afiliado Teste ' + Date.now(),
  email: 'aff' + Date.now() + '@teste.com',
  cpf: '12345678901', // Should be 11 chars
  password: 'senha123',
  phone: '11987654321',
  sponsor_id: null
};

async function testAffiliateRegistration() {
  console.log('🧪 Testing PRODUCTION affiliate registration...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/api/api/affiliate/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(testAffiliateData)
    });

    const status = response.status;
    const data = await response.json();
    
    console.log('📤 Registration Response:', {
      status: status,
      data: data
    });

    if (response.ok) {
      console.log('✅ Affiliate registration successful!');
    } else {
      console.log('❌ Affiliate registration failed.');
    }
  } catch (error) {
    console.error('❌ Network error during registration:', error);
  }
}

testAffiliateRegistration();
