import Layout from "@/react-app/components/Layout";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Grátis",
    price: "0",
    features: ["Acesso ao diretório", "Cashback básico", "Perfil limitado"],
    buttonText: "Plano Atual",
    current: true
  },
  {
    name: "Premium",
    price: "29,90",
    features: ["Cashback em dobro", "Suporte prioritário", "Ofertas exclusivas", "Perfil verificado"],
    buttonText: "Assinar Agora",
    current: false,
    featured: true
  },
  {
    name: "Empresarial",
    price: "99,90",
    features: ["Taxas reduzidas", "Dashboard avançado", "API de integração", "Gerente de conta"],
    buttonText: "Falar com Vendas",
    current: false
  }
];

export default function PlansPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-white mb-4">Escolha seu <span className="text-[#70ff00]">Plano</span></h1>
          <p className="text-gray-400">Maximize seus ganhos e benefícios no ecossistema CashMais.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-white/5 backdrop-blur-md border rounded-[40px] p-8 ${
                plan.featured ? "border-[#70ff00] shadow-[0_0_40px_rgba(112,255,0,0.1)]" : "border-white/10"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#70ff00] text-[#001144] px-4 py-1 rounded-full text-xs font-black uppercase">
                  Mais Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-gray-400 text-sm">R$</span>
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="text-gray-400 text-sm">/mês</span>
              </div>
              
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#70ff00]" /> {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-2xl font-bold transition-all ${
                plan.current 
                  ? "bg-white/10 text-white cursor-default" 
                  : "bg-[#70ff00] text-[#001144] hover:scale-105 shadow-lg shadow-[#70ff00]/20"
              }`}>
                {plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
