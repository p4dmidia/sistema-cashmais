// Script de teste completo para login e sessão com cookies

let sessionCookie = '';

async function testLogin() {
  console.log('🔐 Testando login...');
  
  try {
    const loginResponse = await fetch('http://localhost:5173/api/affiliate/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cpf: '12345678909',
        password: 'temp123'
      }),
    });

    const loginData = await loginResponse.json();
    console.log(`   📤 Status do login: ${loginResponse.status}`);
    console.log(`   📄 Resposta:`, loginData);
    
    // Capturar cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log(`   🍪 Cookies recebidos: ${cookies || 'Nenhum'}`);
    
    if (cookies) {
      // Extrair o valor do cookie affiliate_session
      const match = cookies.match(/affiliate_session=([^;]+)/);
      if (match) {
        sessionCookie = match[1];
        console.log(`   🔑 Token de sessão: ${sessionCookie}`);
      }
    }
    
    if (loginResponse.ok) {
      console.log('   ✅ Login realizado com sucesso!');
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
  
  if (!sessionCookie) {
    console.log('   ⚠️ Nenhum cookie de sessão disponível');
    return false;
  }
  
  try {
    const sessionResponse = await fetch('http://localhost:5173/api/affiliate/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `affiliate_session=${sessionCookie}`,
      },
    });

    const sessionData = await sessionResponse.json();
    console.log(`   📤 Status da sessão: ${sessionResponse.status}`);
    console.log(`   📄 Resposta:`, sessionData);
    
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

async function testSessionWithCredentials() {
  console.log('\n👤 Testando sessão com credentials...');
  
  try {
    const sessionResponse = await fetch('http://localhost:5173/api/affiliate/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Isso deve incluir os cookies
    });

    const sessionData = await sessionResponse.json();
    console.log(`   📤 Status da sessão: ${sessionResponse.status}`);
    console.log(`   📄 Resposta:`, sessionData);
    
    if (sessionResponse.ok) {
      console.log('   ✅ Sessão válida com credentials!');
      console.log(`   👤 Usuário: ${sessionData.full_name}`);
      return true;
    } else {
      console.log('   ❌ Sessão inválida com credentials:', sessionData);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erro de conexão na sessão com credentials:', error.message);
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
      // Testar sessão de diferentes formas
      setTimeout(() => {
        testSession().then(() => {
          setTimeout(() => {
            testSessionWithCredentials();
          }, 1000);
        });
      }, 1000);
    }
    console.log('\n🏁 Teste finalizado!');
  });
  
}).catch(error => {
  console.log('🔴 Servidor não está respondendo em localhost:5173');
  console.log('💡 Certifique-se de que o servidor de desenvolvimento está rodando');
  console.log('   Tente: npm run dev');
});