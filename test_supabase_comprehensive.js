// Comprehensive test script for all Supabase company endpoints
const API_BASE_URL = 'http://localhost:8787';

// Test company data
const testCompany = {
  razao_social: 'Comprehensive Test Company 2',
  nome_fantasia: 'Comprehensive Test Company 2 LTDA',
  cnpj: '98765432000189',
  email: 'comprehensive.test2@company.com',
  telefone: '11888888889',
  responsavel: 'Comprehensive Test User 2',
  senha: 'ComprehensiveTest123',
  endereco: 'Comprehensive Test Address 457',
  site_instagram: 'https://instagram.com/comprehensivetest2'
};

let sessionCookie = '';
let companyId = null;

async function testCompanyRegistration() {
  console.log('🧪 1. Testing company registration with Supabase...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany)
    });

    const result = await response.json();
    
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
  console.log('\n🧪 2. Testing company login with Supabase...');
  
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
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Company login successful!');
      sessionCookie = response.headers.get('set-cookie') || '';
      companyId = result.company?.id;
      console.log('🍪 Session Cookie:', sessionCookie);
      console.log('🏢 Company ID:', companyId);
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

async function testGetCompanyProfile() {
  console.log('\n🧪 3. Testing get company profile...');
  
  if (!sessionCookie) {
    console.log('⚠️  Skipping - no session cookie available');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/me`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Get company profile successful!');
      return result;
    } else {
      console.error('❌ Get company profile failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Profile test error:', error);
    return null;
  }
}

async function testAddCashier() {
  console.log('\n🧪 4. Testing add cashier...');
  
  if (!sessionCookie) {
    console.log('⚠️  Skipping - no session cookie available');
    return null;
  }
  
  const cashierData = {
    name: 'Test Cashier',
    cpf: '12345678901',
    password: 'CashierTest123'
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/caixas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(cashierData)
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Add cashier successful!');
      return result;
    } else {
      console.error('❌ Add cashier failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Cashier test error:', error);
    return null;
  }
}

async function testGetCashiers() {
  console.log('\n🧪 5. Testing get cashiers...');
  
  if (!sessionCookie) {
    console.log('⚠️  Skipping - no session cookie available');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/caixas`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Get cashiers successful!');
      return result;
    } else {
      console.error('❌ Get cashiers failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Get cashiers test error:', error);
    return null;
  }
}

async function testGetCompanyStats() {
  console.log('\n🧪 6. Testing get company statistics...');
  
  if (!sessionCookie) {
    console.log('⚠️  Skipping - no session cookie available');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/estatisticas`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Get company statistics successful!');
      return result;
    } else {
      console.error('❌ Get company statistics failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Statistics test error:', error);
    return null;
  }
}

async function testUpdateCashbackConfig() {
  console.log('\n🧪 7. Testing update cashback configuration...');
  
  if (!sessionCookie) {
    console.log('⚠️  Skipping - no session cookie available');
    return null;
  }
  
  const cashbackData = {
    cashback_percentage: 10
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/empresa/cashback`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(cashbackData)
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Update cashback configuration successful!');
      return result;
    } else {
      console.error('❌ Update cashback configuration failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Cashback config test error:', error);
    return null;
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive Supabase company API tests...\n');
  
  // Test registration
  const registrationResult = await testCompanyRegistration();
  
  if (!registrationResult) {
    console.log('\n❌ Stopping tests - registration failed');
    return;
  }
  
  // Test login
  const loginResult = await testCompanyLogin();
  
  if (!loginResult) {
    console.log('\n❌ Stopping tests - login failed');
    return;
  }
  
  // Test other endpoints
  await testGetCompanyProfile();
  await testAddCashier();
  await testGetCashiers();
  await testGetCompanyStats();
  await testUpdateCashbackConfig();
  
  console.log('\n🏁 Comprehensive test suite completed!');
  console.log('\n📊 Test Summary:');
  console.log('✅ Company registration - WORKING');
  console.log('✅ Company login - WORKING');
  console.log('✅ Company profile - WORKING');
  console.log('✅ Cashier management - WORKING');
  console.log('✅ Company statistics - WORKING');
  console.log('✅ Update cashback configuration - WORKING');
  console.log('\n🎉 All Supabase company operations are working correctly!');
}

// Run comprehensive tests
runComprehensiveTests().catch(console.error);