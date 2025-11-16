// Test script for Supabase company registration and login
// This tests the new Supabase-based company API

const API_BASE_URL = 'http://localhost:8787';

// Test company data
const testCompany = {
  razao_social: 'Test Company Supabase',
  nome_fantasia: 'Test Company Supabase LTDA',
  cnpj: '12345678000199',
  email: 'test.supabase@company.com',
  telefone: '11999999999',
  responsavel: 'Test User Supabase',
  senha: 'TestPassword123',
  endereco: 'Test Address 123',
  site_instagram: 'https://instagram.com/testcompany'
};

async function testCompanyRegistration() {
  console.log('🧪 Testing company registration with Supabase...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany)
    });

    const result = await response.json();
    
    console.log('📤 Registration Request:', JSON.stringify(testCompany, null, 2));
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Company registration successful!');
      return result;
    } else {
      console.error('❌ Company registration failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Registration test error:', error);
    return null;
  }
}

async function testCompanyLogin() {
  console.log('\n🧪 Testing company login with Supabase...');
  
  const loginData = {
    email: testCompany.email,
    senha: testCompany.senha
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const result = await response.json();
    
    console.log('📤 Login Request:', JSON.stringify(loginData, null, 2));
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Company login successful!');
      console.log('🍪 Cookies received:', response.headers.get('set-cookie'));
      return result;
    } else {
      console.error('❌ Company login failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Login test error:', error);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Supabase company API tests...\n');
  
  // Test registration
  const registrationResult = await testCompanyRegistration();
  
  if (registrationResult) {
    // Test login
    await testCompanyLogin();
  }
  
  console.log('\n🏁 Test suite completed!');
}

// Run tests
runTests().catch(console.error);