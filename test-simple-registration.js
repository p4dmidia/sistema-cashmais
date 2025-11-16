// Simple test to isolate the D1 issue
const testCompany = {
  razao_social: 'Empresa Teste Simples',
  nome_fantasia: 'Teste Simples Company',
  cnpj: '12345678901234',
  email: 'simples@teste.com',
  telefone: '11999999999',
  responsavel: 'Responsável Teste Simples',
  senha: 'senha123',
  endereco: 'Rua Teste Simples, 123',
  site_instagram: '@simplestestecompany'
};

console.log('🧪 Testing simple company registration...');
console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));

async function testSimpleRegistration() {
  try {
    console.log('\n🚀 Sending registration request...');
    
    const response = await fetch('http://127.0.0.1:8787/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
      credentials: 'include',
    });

    console.log(`📊 Response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📄 Raw response: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📋 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response:', parseError.message);
    }

    if (response.ok) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed!');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', responseData || responseText);
    }
  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

// Run the test
testSimpleRegistration();