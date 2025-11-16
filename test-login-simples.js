// Script de teste para verificar login (apenas)

// Usar um CPF que sabemos que existe no sistema
const testCPF = '12345678909'; // CPF que já foi cadastrado
const testPassword = 'temp123'; // Senha que definimos no D1

console.log('🧪 Iniciando teste de login...');
console.log('📋 Dados do teste:');
console.log(`   CPF: ${testCPF}`);
console.log(`   Senha: ${testPassword}`);

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
    console.log(`   📄 Resposta completa:`, loginData);
    
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
    console.log(`   📄 Resposta completa:`, sessionData);
    
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

// Verificar se o servidor está rodando
console.log('🔍 Verificando se o servidor está rodando...');
fetch('http://localhost:5173/api/affiliate/login', {
  method: 'GET',
}).then(response => {
  console.log('🟢 Servidor está rodando!');
  
  // Executar testes
  testLogin().then(loginSuccess => {
    if (loginSuccess) {
      // Testar sessão após login bem-sucedido
      setTimeout(() => testSession(), 1000);
    }
    console.log('\n🏁 Teste finalizado!');
  });
  
}).catch(error => {
  console.log('🔴 Servidor não está respondendo em localhost:5173');
  console.log('💡 Certifique-se de que o servidor de desenvolvimento está rodando');
  console.log('   Tente: npm run dev');
});