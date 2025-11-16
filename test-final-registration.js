// Final test with proper cookie handling
import { CookieJar } from 'tough-cookie';

const cookieJar = new CookieJar();
const timestamp = Date.now();

const testCompany = {
  razao_social: `Empresa Final Teste ${timestamp}`,
  nome_fantasia: `Final Test Company ${timestamp}`,
  cnpj: `${timestamp.toString().slice(-14).padStart(14, '0')}`,
  email: `final${timestamp}@example.com`,
  telefone: `1199999${timestamp.toString().slice(-4)}`,
  responsavel: `Responsável Final ${timestamp}`,
  senha: 'senha123',
  endereco: 'Rua Teste Final, 789',
  site_instagram: '@finaltestecompany'
};

console.log('🧪 Running final comprehensive test with cookie handling...');

import fetch from 'node-fetch';

async function makeRequest(url, options = {}) {
  
  // Get cookies for this URL
  const cookies = await cookieJar.getCookieString(url);
  if (cookies) {
    options.headers = {
      ...options.headers,
      'Cookie': cookies
    };
  }

  const response = await fetch(url, options);
  
  // Store cookies from response
  const setCookieHeaders = response.headers.raw()['set-cookie'];
  if (setCookieHeaders) {
    for (const cookieHeader of setCookieHeaders) {
      await cookieJar.setCookie(cookieHeader, url);
    }
  }
  
  return response;
}

async function runFinalTest() {
  try {
    console.log('\n🚀 Step 1: Registering company...');
    console.log('📋 Test data:', JSON.stringify(testCompany, null, 2));
    
    const registerResponse = await makeRequest('http://localhost:5173/api/empresa/registrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
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

    const loginResponse = await makeRequest('http://localhost:5173/api/empresa/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    console.log(`📊 Login response status: ${loginResponse.status}`);
    const loginResult = await loginResponse.json();
    console.log('📋 Login response:', JSON.stringify(loginResult, null, 2));

    if (!loginResponse.ok) {
      console.log('❌ Login failed!');
      return;
    }

    console.log('✅ Login successful!');
    
    console.log('\n👤 Step 3: Testing session validation with cookies...');
    const meResponse = await makeRequest('http://localhost:5173/api/empresa/me', {
      method: 'GET',
    });

    console.log(`📊 Session validation status: ${meResponse.status}`);
    const meData = await meResponse.json();
    console.log('📋 Session data:', JSON.stringify(meData, null, 2));

    if (meResponse.ok) {
      console.log('✅ Session validation successful!');
      console.log('👤 Company session active:', meData.company);
    } else {
      console.log('❌ Session validation failed!');
    }
    
    console.log('\n🧪 Step 4: Testing CNPJ login...');
    const cnpjLoginData = {
      cnpj: testCompany.cnpj,
      senha: testCompany.senha
    };

    const cnpjLoginResponse = await makeRequest('http://localhost:5173/api/empresa/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cnpjLoginData),
    });

    console.log(`📊 CNPJ login response status: ${cnpjLoginResponse.status}`);
    const cnpjLoginResult = await cnpjLoginResponse.json();
    console.log('📋 CNPJ login response:', JSON.stringify(cnpjLoginResult, null, 2));

    if (cnpjLoginResponse.ok) {
      console.log('✅ CNPJ login successful!');
    } else {
      console.log('❌ CNPJ login failed!');
    }

    console.log('\n🎉 All final tests completed!');
    
  } catch (error) {
    console.error('💥 Final test failed:', error.message);
    console.error('📊 Error stack:', error.stack);
  }
}

// Run the final test
runFinalTest();