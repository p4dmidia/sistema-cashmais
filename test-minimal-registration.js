// Test minimal registration to isolate the issue
async function testMinimalRegistration() {
  const testData = {
    razao_social: 'Minimal Company',
    nome_fantasia: 'Minimal Store',
    cnpj: '11.111.111/0001-99',
    email: 'minimal@test.com',
    telefone: '(11) 11111-1111',
    responsavel: 'Minimal Person',
    senha: 'minimal123'
  };

  console.log('🧪 Testing minimal data (no optional fields):', JSON.stringify(testData, null, 2));

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
      console.log('✅ Minimal registration successful!');
    } else {
      console.log('❌ Minimal registration failed');
      
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

testMinimalRegistration();