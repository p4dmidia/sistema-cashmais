// Comprehensive test for company registration and login
const timestamp = Date.now();

const testCompany = {
  razao_social: `Empresa Completa Teste ${timestamp}`,
  nome_fantasia: `Complete Test Company ${timestamp}`,
  cnpj: `${timestamp.toString().slice(-14).padStart(14, '0')}`,
  email: `complete${timestamp}@example.com`,
  telefone: `1199999${timestamp.toString().slice(-4)}`,
  responsavel: `Responsável Completo ${timestamp}`,
  senha: 'senha123',
  endereco: 'Rua Teste Completo, 456',
  site_instagram: '@completetestecompany'
};

console.log('🧪 Running comprehensive company registration test...');
console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));

async function runComprehensiveTest() {
  try {
    console.log('\n🚀 Step 1: Registering company...');
    
    const registerResponse = await fetch('http://localhost:5173/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
      credentials: 'include',
    });

    console.log(`📊 Registration response status: ${registerResponse.status}`);
    const registerData = await registerResponse.json();
    console.log('📋 Registration response:', JSON.stringify(registerData, null, 2));

    if (!registerResponse.ok) {
      console.log('❌ Registration failed!');
      return;
    }

    console.log('✅ Registration successful!');
    
    console.log('\n🔐 Step 2: Testing company login...');
    const loginData = {
      email: testCompany.email,
      senha: testCompany.senha
    };

    const loginResponse = await fetch('http://localhost:5173/api/empresa/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
      credentials: 'include',
    });

    console.log(`📊 Login response status: ${loginResponse.status}`);
    const loginResult = await loginResponse.json();
    console.log('📋 Login response:', JSON.stringify(loginResult, null, 2));

    if (!loginResponse.ok) {
      console.log('❌ Login failed!');
      return;
    }

    console.log('✅ Login successful!');
    
    console.log('\n👤 Step 3: Testing session validation...');
    const meResponse = await fetch('http://localhost:5173/api/empresa/me', {
      method: 'GET',
      credentials: 'include',
    });

    console.log(`📊 Session validation status: ${meResponse.status}`);
    const meData = await meResponse.json();
    console.log('📋 Session data:', JSON.stringify(meData, null, 2));

    if (meResponse.ok) {
      console.log('✅ Session validation successful!');
    } else {
      console.log('❌ Session validation failed!');
    }
    
    console.log('\n🧪 Step 4: Testing duplicate registration (should fail)...');
    const duplicateResponse = await fetch('http://localhost:5173/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
      credentials: 'include',
    });

    console.log(`📊 Duplicate registration status: ${duplicateResponse.status}`);
    const duplicateData = await duplicateResponse.json();
    console.log('📋 Duplicate registration response:', JSON.stringify(duplicateData, null, 2));

    if (!duplicateResponse.ok) {
      console.log('✅ Duplicate registration correctly rejected!');
    } else {
      console.log('⚠️  Duplicate registration unexpectedly succeeded!');
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('📊 Error stack:', error.stack);
  }
}

// Run the comprehensive test
runComprehensiveTest();