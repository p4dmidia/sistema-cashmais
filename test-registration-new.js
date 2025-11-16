// Test script for affiliate registration with new CPF
const testRegistration = async () => {
  const testData = {
    full_name: "Teste Usuário Novo",
    cpf: "12345678909", // Different valid CPF for testing
    email: `teste.afiliado.novo.${Date.now()}@example.com`, // Unique email
    whatsapp: "11988888888",
    password: "Senha123!",
    referral_code: null
  };

  try {
    const response = await fetch('http://localhost:5177/api/affiliate/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Registration Response:', result);
    console.log('Status Code:', response.status);
    
    if (response.ok) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed:', result);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testRegistration();