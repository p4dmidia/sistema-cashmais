
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

const testCompanyData = {
  razao_social: 'Empresa Teste ' + Date.now(),
  nome_fantasia: 'Loja Teste ' + Date.now(),
  cnpj: '12345678000195', // Use a clean CNPJ
  email: 'teste' + Date.now() + '@empresa.com',
  telefone: '11987654321',
  responsavel: 'João da Silva',
  senha: 'senha123',
  endereco: 'Rua Teste, 123',
  site_instagram: '@lojateste'
};

async function testProdRegistration() {
  console.log('🧪 Testing PRODUCTION company registration...');
  console.log('URL:', `${SUPABASE_URL}/functions/v1/api/api/empresa/registrar`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/api/api/empresa/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(testCompanyData)
    });

    const status = response.status;
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }
    
    console.log('📤 Registration Response:', {
      status: status,
      data: data
    });

    if (response.ok) {
      console.log('✅ Company registration successful!');
    } else {
      console.log('❌ Company registration failed.');
    }
  } catch (error) {
    console.error('❌ Network error during registration:', error);
  }
}

testProdRegistration();
