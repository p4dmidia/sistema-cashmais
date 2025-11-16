// Quick test after server restart
const timestamp = Date.now();

const testCompany = {
  razao_social: `Empresa Pós-Reinício ${timestamp}`,
  nome_fantasia: `Post-Restart Company ${timestamp}`,
  cnpj: `${timestamp.toString().slice(-14).padStart(14, '0')}`,
  email: `restart${timestamp}@example.com`,
  telefone: `1199999${timestamp.toString().slice(-4)}`,
  responsavel: `Responsável Pós-Reinício ${timestamp}`,
  senha: 'senha123',
  endereco: 'Rua Teste Reinício, 999',
  site_instagram: '@restartcompany'
};

console.log('🧪 Testing company registration after server restart...');
console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));

async function testAfterRestart() {
  try {
    console.log('\n🚀 Sending registration request to restarted server...');
    
    const response = await fetch('http://127.0.0.1:8787/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
      credentials: 'include',
    });

    console.log(`📊 Response status: ${response.status}`);
    
    const responseData = await response.json();
    console.log('📋 Response:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Registration successful after restart!');
      
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
        console.log('✅ Login successful after restart!');
      } else {
        console.log('❌ Login failed after restart!');
      }
    } else {
      console.log('❌ Registration failed after restart!');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', responseData);
    }
  } catch (error) {
    console.error('💥 Request failed:', error.message);
    console.error('📊 Error stack:', error.stack);
  }
}

// Run the test
testAfterRestart();