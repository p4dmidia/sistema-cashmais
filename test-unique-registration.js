// Test with unique data to avoid duplicate email error
const timestamp = Date.now();

const testCompany = {
  razao_social: `Empresa Teste Única ${timestamp}`,
  nome_fantasia: `Unique Test Company ${timestamp}`,
  cnpj: `${timestamp.toString().slice(-14).padStart(14, '0')}`,
  email: `unique${timestamp}@teste.com`,
  telefone: `1199999${timestamp.toString().slice(-4)}`,
  responsavel: `Responsável Único ${timestamp}`,
  senha: 'senha123',
  endereco: 'Rua Teste Único, 456',
  site_instagram: '@uniquetestecompany'
};

console.log('🧪 Testing company registration with unique data...');
console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));

async function testUniqueRegistration() {
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
      
      // Test login
      console.log('\n🔐 Testing company login...');
      const loginResponse = await fetch('http://127.0.0.1:8787/api/empresa/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCompany.email,
          senha: testCompany.senha
        }),
        credentials: 'include',
      });

      console.log(`📊 Login response status: ${loginResponse.status}`);
      const loginData = await loginResponse.json();
      console.log('📋 Login response:', JSON.stringify(loginData, null, 2));

      if (loginResponse.ok) {
        console.log('✅ Login successful!');
      } else {
        console.log('❌ Login failed!');
      }
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
testUniqueRegistration();