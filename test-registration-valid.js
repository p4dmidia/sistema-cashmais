// Test script for affiliate registration with valid CPF
const generateValidCPF = () => {
  const cpf = [];
  
  // Generate first 9 digits
  for (let i = 0; i < 9; i++) {
    cpf.push(Math.floor(Math.random() * 10));
  }
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i);
  }
  let remainder = sum % 11;
  cpf.push(remainder < 2 ? 0 : 11 - remainder);
  
  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i);
  }
  remainder = sum % 11;
  cpf.push(remainder < 2 ? 0 : 11 - remainder);
  
  return cpf.join('');
};

const testRegistration = async () => {
  const validCpf = generateValidCPF();
  const testData = {
    full_name: "Teste Usuário Válido",
    cpf: validCpf, // Valid CPF for testing
    email: `teste.valido.${Date.now()}@example.com`, // Unique email
    whatsapp: "11555555555",
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