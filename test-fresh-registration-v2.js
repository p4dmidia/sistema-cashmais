// Test with completely new data on new port
async function testFreshRegistration() {
  const timestamp = Date.now();
  const testData = {
    razao_social: 'Fresh Company ' + timestamp,
    nome_fantasia: 'Fresh Store ' + timestamp,
    cnpj: '88.888.888/0001-' + (timestamp % 100).toString().padStart(2, '0'),
    email: 'fresh' + timestamp + '@test.com',
    telefone: '(88) 88888-8888',
    responsavel: 'Fresh Person ' + timestamp,
    senha: 'fresh123',
    endereco: 'Fresh Street ' + timestamp,
    site_instagram: '@fresh' + timestamp
  };

  console.log('🧪 Testing with fresh data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://localhost:5176/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
      credentials: 'include'
    });

    const text = await response.text();
    console.log('📤 Response:', response.status, text);
    
    if (response.ok) {
      console.log('✅ Registration successful!');
      
      // Test login
      console.log('🧪 Testing login...');
      const loginResponse = await fetch('http://localhost:5176/api/empresa/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testData.email,
          senha: testData.senha
        }),
        credentials: 'include'
      });

      const loginText = await loginResponse.text();
      console.log('📤 Login Response:', loginResponse.status, loginText);
      
      if (loginResponse.ok) {
        console.log('✅ Login successful!');
      } else {
        console.log('❌ Login failed');
      }
    } else {
      console.log('❌ Registration failed');
    }

  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

testFreshRegistration();