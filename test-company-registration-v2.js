// Test script for company registration with enhanced debug output
const timestamp = Date.now();

const testCompany = {
  razao_social: `Empresa Teste ${timestamp}`,
  nome_fantasia: `Teste Company ${timestamp}`,
  cnpj: `${timestamp.toString().slice(-14).padStart(14, '0')}`,
  email: `test${timestamp}@example.com`,
  telefone: `1199999${timestamp.toString().slice(-4)}`,
  responsavel: `Responsável Teste ${timestamp}`,
  senha: 'senha123',
  endereco: 'Rua Teste, 123',
  site_instagram: '@testecompany'
};

console.log('🧪 Testing company registration with debug output...');
console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));

async function testRegistration() {
  try {
    console.log('\n🚀 Sending registration request...');
    
    const response = await fetch('http://localhost:5173/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
      credentials: 'include',
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📄 Raw response: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📋 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response:', parseError.message);
      console.log('📄 Raw response text:', responseText);
    }

    if (response.ok) {
      console.log('✅ Registration successful!');
      
      // Test login with the same credentials
      console.log('\n🔐 Testing company login...');
      await testLogin();
    } else {
      console.log('❌ Registration failed!');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', responseData || responseText);
      
      if (responseData?.error) {
        console.log('❌ Error message:', responseData.error);
      }
      if (responseData?.details) {
        console.log('📋 Error details:', responseData.details);
      }
    }
  } catch (error) {
    console.error('💥 Request failed:', error.message);
    console.error('📊 Error stack:', error.stack);
  }
}

async function testLogin() {
  try {
    const loginData = {
      email: testCompany.email,
      senha: testCompany.senha
    };

    console.log('📋 Login data:', JSON.stringify(loginData, null, 2));

    const response = await fetch('http://localhost:5173/api/empresa/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
      credentials: 'include',
    });

    console.log(`📊 Login response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📄 Login raw response: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📋 Login parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse login JSON response:', parseError.message);
      console.log('📄 Login raw response text:', responseText);
    }

    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('👤 Company data:', responseData.company);
    } else {
      console.log('❌ Login failed!');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', responseData || responseText);
    }
  } catch (error) {
    console.error('💥 Login request failed:', error.message);
    console.error('📊 Error stack:', error.stack);
  }
}

// Run the test
testRegistration();