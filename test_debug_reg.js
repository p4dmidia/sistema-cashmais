
const SUPABASE_URL = 'https://jxupizzwrnivhnaexrmb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXBpenp3cm5pdmhuYWV4cm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDk1NjksImV4cCI6MjA4OTg4NTU2OX0.N17XSUASYwShkKmpnI3NDCLD1dgWqnEk-1xLmaKprlo';

async function testApi(name, path, data) {
  console.log(`\n🧪 Testing: ${name} (${path})`);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(data)
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
    return res.ok;
  } catch (e) {
    console.error('Error:', e.message);
    return false;
  }
}

const companyData = {
  razao_social: 'Empresa Teste ' + Date.now(),
  nome_fantasia: 'Loja Teste',
  cnpj: '12345678000195',
  email: 'empresa' + Date.now() + '@teste.com',
  telefone: '11987654321',
  responsavel: 'João',
  senha: 'senha123'
};

const affiliateData = {
  full_name: 'Afiliado Teste ' + Date.now(),
  email: 'aff' + Date.now() + '@teste.com',
  cpf: String(Date.now()).slice(-11), // Random-ish CPF
  password: 'senha123',
  phone: '11987654321',
  sponsor_id: null
};

async function run() {
    await testApi('Company Registration', '/api/empresa/registrar', companyData);
    await testApi('Affiliate Registration', '/api/affiliate/register', affiliateData);
}

run();
