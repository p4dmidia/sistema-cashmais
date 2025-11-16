// Test script for company registration and login
const testCompanyData = {
  razao_social: 'Empresa Teste LTDA',
  nome_fantasia: 'Loja Teste',
  cnpj: '12.345.678/0001-95',
  email: 'teste@empresa.com',
  telefone: '(11) 98765-4321',
  responsavel: 'João da Silva',
  senha: 'senha123',
  endereco: 'Rua Teste, 123',
  site_instagram: '@lojateste'
};

async function testCompanyRegistration() {
  console.log('🧪 Testing company registration...');
  
  try {
    const response = await fetch('http://localhost:5175/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompanyData),
      credentials: 'include'
    });

    const data = await response.json();
    
    console.log('📤 Registration Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });

    if (response.ok) {
      console.log('✅ Company registration successful!');
      return true;
    } else {
      console.log('❌ Company registration failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error during registration:', error);
    return false;
  }
}

async function testCompanyLogin() {
  console.log('🧪 Testing company login...');
  
  try {
    const response = await fetch('http://localhost:5175/api/empresa/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testCompanyData.email,
        senha: testCompanyData.senha
      }),
      credentials: 'include'
    });

    const data = await response.json();
    
    console.log('📤 Login Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });

    if (response.ok) {
      console.log('✅ Company login successful!');
      return true;
    } else {
      console.log('❌ Company login failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error during login:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting company registration and login tests...\n');
  
  // Test registration
  const registrationSuccess = await testCompanyRegistration();
  console.log('');
  
  if (registrationSuccess) {
    // Test login if registration was successful
    await testCompanyLogin();
  } else {
    console.log('⚠️  Skipping login test due to registration failure');
  }
  
  console.log('\n🏁 Test completed!');
}

// Wait a moment for the server to be ready
console.log('⏳ Waiting for server to be ready...');
setTimeout(runTests, 3000);