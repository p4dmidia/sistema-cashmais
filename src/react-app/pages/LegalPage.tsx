import Layout from "@/react-app/components/Layout";
import { useLocation } from "react-router";
import { FileText, Shield } from "lucide-react";

export default function LegalPage() {
  const location = useLocation();
  const isTerms = location.pathname.includes('termos');
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-[#70ff00]/10 rounded-2xl">
            {isTerms ? <FileText className="w-8 h-8 text-[#70ff00]" /> : <Shield className="w-8 h-8 text-[#70ff00]" />}
          </div>
          <h1 className="text-3xl font-black text-white">
            {isTerms ? "Termos de Uso" : "Políticas de Privacidade"}
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 md:p-12 space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Introdução</h2>
            <p>
              Estes {isTerms ? "termos de uso" : "políticas de privacidade"} regem o acesso e uso da plataforma CashMais. Ao utilizar nossos serviços, você concorda plenamente com as diretrizes aqui estabelecidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Uso do Sistema</h2>
            <p>
              A plataforma CashMais é um ecossistema de cashback e marketplace de serviços. O usuário compromete-se a fornecer informações verídicas e a utilizar a plataforma de forma ética.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Proteção de Dados</h2>
            <p>
              {isTerms 
                ? "Os dados fornecidos são utilizados para processar transações e melhorar a experiência do usuário, conforme nossa Política de Privacidade."
                : "Seus dados pessoais são protegidos por criptografia e nunca serão vendidos a terceiros. Utilizamos informações apenas para o funcionamento essencial da plataforma."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Cashback e Recompensas</h2>
            <p>
              O sistema de recompensas é baseado na contratação de empresas parceiras. Os valores acumulados podem ser utilizados dentro do ecossistema conforme as regras vigentes no painel do usuário.
            </p>
          </section>

          <div className="pt-8 border-t border-white/10 text-sm text-gray-500">
            Última atualização: Abril de 2026.
          </div>
        </div>
      </div>
    </Layout>
  );
}
