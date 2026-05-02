import { MapPin, Star, ShieldCheck, Phone, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface CompanyListItemProps {
  company: {
    id: number;
    name: string;
    thumbnail_url: string;
    city: string;
    is_verified: boolean;
    cashback: number;
    categories: string[];
  };
  onClick: () => void;
}

export default function CompanyListItem({ company, onClick }: CompanyListItemProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] overflow-hidden group hover:border-[#70ff00]/40 transition-all shadow-xl"
    >
      <div className="flex flex-col md:flex-row p-4 gap-6">
        {/* Image Container */}
        <div className="relative w-full md:w-48 h-48 md:h-auto shrink-0 overflow-hidden rounded-2xl">
          <img 
            src={company.thumbnail_url || "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop"} 
            alt={company.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
            <span className="text-[#70ff00] font-black text-sm">{company.cashback}%</span>
            <span className="text-white text-[10px] uppercase font-bold tracking-wider">Cashback</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between py-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-white group-hover:text-[#70ff00] transition-colors">
                {company.name}
              </h3>
              {company.is_verified && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-[#70ff00]/10 border border-[#70ff00]/20 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#70ff00]" />
                  <span className="text-[#70ff00] text-[10px] font-bold uppercase tracking-tighter">Verificado</span>
                </div>
              )}
            </div>

            <div className="flex items-center text-gray-400 text-sm mb-4">
              <MapPin className="w-4 h-4 mr-1.5 text-[#70ff00]" />
              {company.city}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {company.categories.map((cat, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/5 rounded-lg text-[10px] text-gray-300 font-medium uppercase border border-white/5">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold text-white">{(company as any).rating_avg || "0.0"}</span>
              <span className="text-xs text-gray-500 font-medium">({(company as any).rating_count || 0} {(company as any).rating_count === 1 ? 'avaliação' : 'avaliações'})</span>
            </div>

            <button 
              onClick={onClick}
              className="bg-[#70ff00] text-[#001144] px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#50cc00] transition-all transform hover:scale-105 active:scale-95"
            >
              Ver Perfil
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
