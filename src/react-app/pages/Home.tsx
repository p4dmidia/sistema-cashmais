import { Link } from 'react-router';
import { ArrowRight, Users, TrendingUp, Shield, Smartphone, DollarSign, Store } from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {}, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-[#001144]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img 
                src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" 
                alt="CashMais" 
                className="h-10 w-auto"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/empresa/cadastro"
                className="hidden sm:inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-[#70ff00] text-[#70ff00] rounded-lg font-semibold hover:bg-[#70ff00] hover:text-white hover:scale-[1.02] transition-all duration-200 text-sm"
              >
                <Store className="w-4 h-4 mr-2" />
                Empresa Parceira
              </Link>
              
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 bg-[#70ff00] text-white rounded-lg font-semibold hover:bg-[#50cc00] hover:scale-[1.02] transition-all duration-200 text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Área do Afiliado
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                  Ganhe dinheiro com cada compra
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  O primeiro sistema de cashback com rede MLM de até 10 níveis. 
                  Transforme suas compras em renda e construa uma rede próspera.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-[#70ff00]/25"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                
                <Link
                  to="/empresa/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 hover:scale-[1.02] transition-all duration-200"
                >
                  <Store className="w-5 h-5 mr-2" />
                  Sou Empresa
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#70ff00]">1%</div>
                  <div className="text-sm text-gray-400">Cashback Base</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#70ff00]">10</div>
                  <div className="text-sm text-gray-400">Níveis MLM</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#70ff00]">R$ 10</div>
                  <div className="text-sm text-gray-400">Saque Mínimo</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#70ff00]/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-900/30 rounded-xl border border-green-700">
                    <div>
                      <div className="text-green-300 text-sm">Seu Saldo</div>
                      <div className="text-white font-bold text-xl">R$ 247,50</div>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-400" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Nível 1 (3 pessoas)</span>
                      <span className="text-blue-400 font-semibold">R$ 45,00</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Nível 2 (9 pessoas)</span>
                      <span className="text-purple-400 font-semibold">R$ 92,50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Compras diretas</span>
                      <span className="text-yellow-400 font-semibold">R$ 110,00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <svg className="absolute top-20 right-20 w-32 h-32 text-[#70ff00]/10" fill="currentColor" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50"/>
          </svg>
          <svg className="absolute bottom-20 left-20 w-24 h-24 text-purple-500/10" fill="currentColor" viewBox="0 0 100 100">
            <polygon points="50,0 100,50 50,100 0,50"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Como Funciona o CashMais
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Um sistema completo que combina cashback tradicional com o poder do marketing multinível
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-[#70ff00]/20 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-[#70ff00]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Compre Normalmente</h3>
              <p className="text-gray-300 leading-relaxed">
                Faça suas compras em lojas parceiras e informe seu cupom de cliente. 
                Receba cashback em cada transação.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Indique Pessoas</h3>
              <p className="text-gray-300 leading-relaxed">
                Convide amigos e familiares. Ganhe comissões de até 10 níveis 
                de profundidade em sua rede MLM.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Ganhe Sempre</h3>
              <p className="text-gray-300 leading-relaxed">
                Receba renda passiva de todas as compras da sua rede. 
                Quanto mais pessoas, maior sua comissão mensal.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Sistema Seguro</h3>
              <p className="text-gray-300 leading-relaxed">
                Plataforma com autenticação Google, controle anti-fraude 
                e histórico completo de todas as transações.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Saque Rápido</h3>
              <p className="text-gray-300 leading-relaxed">
                Solicite saques via PIX a partir de R$10. 
                Taxa de apenas 30% para manter o sistema funcionando.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-pink-600/20 rounded-xl flex items-center justify-center mb-6">
                <Store className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Lojas Parceiras</h3>
              <p className="text-gray-300 leading-relaxed">
                Rede crescente de estabelecimentos comerciais. 
                Empresas podem se cadastrar e oferecer cashback aos clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Por que Escolher o CashMais?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              A única plataforma que oferece cashback real combinado com oportunidade de renda através de marketing multinível
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="space-y-8">
              <div className="p-4 bg-[#70ff00]/10 border border-[#70ff00]/30 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-[#70ff00] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sem Investimento Inicial</h3>
                    <p className="text-gray-300">Cadastro 100% gratuito, sem taxas de adesão ou mensalidades. Comece a ganhar a partir da primeira compra ou indicação.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#70ff00] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Cashback Garantido em Toda Compra</h3>
                  <p className="text-gray-300">Diferente de outros programas que limitam categorias, você recebe cashback em todas as compras nas lojas parceiras, sem exceção.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#70ff00] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Renda Passiva Real</h3>
                  <p className="text-gray-300">Construa uma rede de até 10 níveis e receba comissões mensais das compras de todos os membros. Uma única indicação pode gerar renda por anos.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#70ff00] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Transparência Total</h3>
                  <p className="text-gray-300">Acompanhe em tempo real todos os ganhos, comissões e movimentações da sua rede através do dashboard completo e detalhado.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#70ff00]/10 to-purple-600/10 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Potencial de Ganhos</h3>
                  <p className="text-gray-300">Exemplo com rede de 1.000 pessoas</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-900/30 to-green-800/30 rounded-xl">
                    <span className="text-gray-300">Cashback pessoal mensal</span>
                    <span className="text-[#70ff00] font-bold text-lg">R$ 250</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-xl">
                    <span className="text-gray-300">Comissões da rede</span>
                    <span className="text-blue-400 font-bold text-lg">R$ 2.150</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-xl">
                    <span className="text-gray-300 font-bold">Total mensal</span>
                    <span className="text-purple-400 font-bold text-xl">R$ 2.400</span>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">*Simulação baseada em gasto médio de R$ 500/mês por pessoa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      {/* FAQ Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Esclarecemos as principais dúvidas sobre o funcionamento do CashMais
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">Como funciona o sistema de cashback?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Você recebe um cupom único após o cadastro. Ao fazer compras em lojas parceiras, informe seu cupom ao caixa e receba cashback sobre o valor da compra, creditado instantaneamente na sua conta.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">Como ganho comissões com indicações?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Ao indicar pessoas, elas entram na sua rede MLM. Você recebe comissões sobre o cashback de todos os membros da sua rede até 10 níveis de profundidade. Quanto maior sua rede, maiores suas comissões mensais.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">Qual o valor mínimo para saque?</h3>
                <p className="text-gray-300 leading-relaxed">
                  O saque mínimo é de R$ 10,00 via PIX.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">É necessário pagar alguma taxa de adesão?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Não! O cadastro é 100% gratuito e não cobramos mensalidades. Você só paga a taxa de 30% quando solicitar um saque. Todas as funcionalidades da plataforma são liberadas gratuitamente.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">Como as empresas se tornam parceiras?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Empresas podem se cadastrar gratuitamente em nossa plataforma. Elas configuram a porcentagem de cashback desejada e recebem acesso ao sistema de caixa para registrar as compras dos afiliados.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3">Posso acompanhar minha rede em tempo real?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Sim! Nossa plataforma oferece dashboard completo onde você acompanha sua rede, todas as transações, comissões recebidas, histórico de saques e performance de cada nível da sua estrutura MLM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-[#70ff00]/10 to-purple-600/10 rounded-3xl p-12 border border-[#70ff00]/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para Começar a Ganhar?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Junte-se aos milhares de afiliados que já estão transformando 
              suas compras em renda recorrente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-[#70ff00]/25"
              >
                Criar Conta Grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              
              <Link
                to="/empresa/cadastro"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 hover:scale-[1.02] transition-all duration-200"
              >
                <Store className="w-5 h-5 mr-2" />
                Cadastrar Empresa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img 
                src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" 
                alt="CashMais" 
                className="h-10 w-auto"
              />
            </div>
            
            <div className="text-gray-400 text-sm text-center md:text-right">
              <p>&copy; 2024 CashMais. Sistema de cashback com MMN</p>
              <p className="mt-1">CNPJ: 61356738000180</p>
              <p className="mt-1">CashMais Tecnologia em Consumo e Cashback Ltda</p>
              <p className="mt-1">Desenvolvido por <a href="https://www.p4dmidia.com.br/" target="_blank" rel="noopener noreferrer" className="text-[#70ff00] hover:underline">P4D Mídia</a></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
