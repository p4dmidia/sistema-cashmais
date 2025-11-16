// Test script for affiliate registration with completely new CPF
const testRegistration = async () => {
  const testData = {
    full_name: "Teste Usuário Completo",
    cpf: "98765432100", // Completely new CPF for testing
    email: `teste.completo.${Date.now()}@example.com`, // Unique email
    whatsapp: "11777777777",
    password: "Senha123!",
    referral_code: null
  };

  console.log('Testing registration with data:', testData);

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