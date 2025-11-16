// Test with explicit values for all fields
async function testExplicitRegistration() {
  const timestamp = Date.now();
  const testData = {
    razao_social: 'Explicit Company ' + timestamp,
    nome_fantasia: 'Explicit Store ' + timestamp,
    cnpj: '77.777.777/0001-' + (timestamp % 100).toString().padStart(2, '0'),
    email: 'explicit' + timestamp + '@test.com',
    telefone: '(77) 77777-7777',
    responsavel: 'Explicit Person ' + timestamp,
    senha: 'explicit123',
    endereco: 'Explicit Street ' + timestamp,
    site_instagram: '@explicit' + timestamp
  };

  console.log('🧪 Testing with explicit data:', JSON.stringify(testData, null, 2));

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
      
      // Parse the response to get session info
      try {
        const data = JSON.parse(text);
        console.log('📋 Registration data:', data);
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
      
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
        
        // Parse login response
        try {
          const loginData = JSON.parse(loginText);
          console.log('📋 Login data:', loginData);
        } catch (e) {
          console.log('Could not parse login response as JSON');
        }
      } else {
        console.log('❌ Login failed');
      }
    } else {
      console.log('❌ Registration failed');
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(text);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('Raw error text:', text);
      }
    }

  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

testExplicitRegistration();