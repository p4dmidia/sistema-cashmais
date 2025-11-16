// Script de teste para verificar cadastro e login


// Gerar dados de teste
const testCPF = '82943765003'; // CPF válido gerado aleatoriamente para teste
const testPassword = 'Teste123@';
const testEmail = `test_${Date.now()}@example.com`;
const testName = 'Teste Usuário';

console.log('🧪 Iniciando teste de cadastro e login...');
console.log('📋 Dados do teste:');
console.log(`   CPF: ${testCPF}`);
console.log(`   Email: ${testEmail}`);
console.log(`   Senha: ${testPassword}`);

async function testRegistration() {
  console.log('\n📝 Testando cadastro...');
  
  try {
    const registerResponse = await fetch('http://localhost:5173/api/affiliate/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: testName,
        cpf: testCPF,
        email: testEmail,
        password: testPassword,
        whatsapp: '11999999999'
      }),
    });

    const registerData = await registerResponse.json();
    console.log(`   📤 Status do cadastro: ${registerResponse.status}`);
    
    if (registerResponse.ok) {
      console.log('   ✅ Cadastro realizado com sucesso!');
      console.log(`   🆔 ID do afiliado: ${registerData.affiliate.id}`);
      return true;
    } else {
      console.log('   ❌ Erro no cadastro:', registerData);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão no cadastro:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testando login...');
  
  try {
    const loginResponse = await fetch('http://localhost:5173/api/affiliate/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        cpf: testCPF,
        password: testPassword
      }),
    });

    const loginData = await loginResponse.json();
    console.log(`   📤 Status do login: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      console.log('   ✅ Login realizado com sucesso!');
      console.log(`   🍪 Cookies recebidos: ${loginResponse.headers.get('set-cookie') || 'Nenhum'}`);
      return true;
    } else {
      console.log('   ❌ Erro no login:', loginData);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão no login:', error.message);
    return false;
  }
}

async function testSession() {
  console.log('\n👤 Testando sessão...');
  
  try {
    const sessionResponse = await fetch('http://localhost:5173/api/affiliate/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const sessionData = await sessionResponse.json();
    console.log(`   📤 Status da sessão: ${sessionResponse.status}`);
    
    if (sessionResponse.ok) {
      console.log('   ✅ Sessão válida!');
      console.log(`   👤 Usuário: ${sessionData.full_name}`);
      return true;
    } else {
      console.log('   ❌ Sessão inválida:', sessionData);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão na sessão:', error.message);
    return false;
  }
}

// Executar testes
async function runTests() {
  const registrationSuccess = await testRegistration();
  
  if (registrationSuccess) {
    // Aguardar um pouco antes de testar login
    console.log('\n⏰ Aguardando 2 segundos antes do teste de login...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const loginSuccess = await testLogin();
    
    if (loginSuccess) {
      // Testar sessão
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testSession();
    }
  }
  
  console.log('\n🏁 Teste finalizado!');
}

// Verificar se o servidor está rodando
console.log('🔍 Verificando se o servidor está rodando...');
fetch('http://localhost:5173/api/affiliate/login', {
  method: 'GET',
}).then(response => {
  console.log('🟢 Servidor está rodando!');
  runTests();
}).catch(error => {
  console.log('🔴 Servidor não está respondendo em localhost:5173');
  console.log('💡 Certifique-se de que o servidor de desenvolvimento está rodando');
  console.log('   Tente: npm run dev');
});