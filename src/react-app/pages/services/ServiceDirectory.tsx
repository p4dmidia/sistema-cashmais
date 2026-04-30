import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { Search, MapPin, ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import CategoryIcon from "@/react-app/components/services/CategoryIcon";

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export default function ServiceDirectory() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies/public');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    if (!searchTerm && !cityFilter) {
      setFilteredCategories(categories);
      setFilteredCompanies([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const city = cityFilter.toLowerCase();

    const filteredCats = categories.filter(c => 
      c.name.toLowerCase().includes(term)
    );

    const filteredComps = companies.filter(c => {
      const matchesTerm = c.nome_fantasia?.toLowerCase().includes(term) || 
                          c.company_categories?.some((cc: any) => cc.categories?.name?.toLowerCase().includes(term));
      const matchesCity = city === "" || c.address_city?.toLowerCase().includes(city);
      return matchesTerm && matchesCity;
    });

    setFilteredCategories(filteredCats);
    setFilteredCompanies(filteredComps);
  }, [searchTerm, cityFilter, categories, companies]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to a search results page or category view with search params
    navigate(`/servicos/pesquisa?q=${searchTerm}&city=${cityFilter}`);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            Encontre os <span className="text-[#70ff00]">Melhores Serviços</span> com Cashback
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10"
          >
            Contrate profissionais qualificados e receba parte do seu dinheiro de volta em cada serviço realizado.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            <form onSubmit={handleSearch} className="bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl md:rounded-full flex flex-col md:flex-row gap-2 shadow-2xl shadow-black/50">
              <div className="flex-1 flex items-center px-4 py-2 border-b md:border-b-0 md:border-r border-white/10">
                <Search className="w-5 h-5 text-[#70ff00] mr-3" />
                <input 
                  type="text" 
                  placeholder="O que você precisa? (Ex: Encanador, Mecânico...)"
                  className="bg-transparent border-none text-white focus:ring-0 w-full placeholder-gray-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center px-4 py-2">
                <MapPin className="w-5 h-5 text-[#70ff00] mr-3" />
                <input 
                  type="text" 
                  placeholder="Em qual cidade?"
                  className="bg-transparent border-none text-white focus:ring-0 w-full placeholder-gray-500"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="bg-[#70ff00] hover:bg-[#50cc00] text-[#001144] font-bold py-3 px-8 rounded-xl md:rounded-full transition-all transform hover:scale-105"
              >
                Buscar Agora
              </button>
            </form>
          </motion.div>
        </div>

        {/* Search Results / Categories Section */}
        <div className="mb-20">
          {searchTerm || cityFilter ? (
            <div className="space-y-12">
              {/* Filtered Categories */}
              {filteredCategories.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    Categorias Encontradas <span className="ml-3 px-2 py-1 bg-[#70ff00]/20 text-[#70ff00] text-xs rounded-lg">{filteredCategories.length}</span>
                  </h3>
                  <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 md:grid-cols-5 gap-6"
                  >
                    {filteredCategories.map((cat) => (
                      <motion.button
                        key={cat.id}
                        variants={item}
                        onClick={() => navigate(`/servicos/categoria/${cat.slug}`)}
                        className="group relative glass-card hover:glass-morphism hover:border-[#70ff00]/50 rounded-3xl p-6 transition-all duration-300 text-center flex flex-col items-center justify-center gap-4 overflow-hidden premium-glow"
                      >
                        <CategoryIcon iconName={cat.icon} size={24} />
                        <span className="text-white font-bold group-hover:text-[#70ff00] transition-colors">{cat.name}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Filtered Companies */}
              {filteredCompanies.length > 0 ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    Empresas Encontradas <span className="ml-3 px-2 py-1 bg-[#70ff00]/20 text-[#70ff00] text-xs rounded-lg">{filteredCompanies.length}</span>
                  </h3>
                  <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredCompanies.map((company) => (
                      <motion.div 
                        key={company.id}
                        variants={item}
                        onClick={() => navigate(`/servicos/empresa/${company.id}`)}
                        className="group glass-card hover:glass-morphism rounded-3xl border border-white/10 overflow-hidden hover:border-[#70ff00]/50 transition-all duration-300 cursor-pointer premium-glow"
                      >
                        <div className="h-48 overflow-hidden relative">
                          <img 
                            src={company.thumbnail_url || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=800&auto=format&fit=crop"} 
                            alt={company.nome_fantasia}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute top-4 right-4 bg-[#70ff00] text-[#001144] font-bold px-3 py-1.5 rounded-xl text-sm shadow-xl">
                            {company.company_cashback_config?.[0]?.cashback_percentage || 5}% back
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center text-xs text-[#70ff00] font-bold uppercase tracking-wider mb-2">
                            {company.company_categories?.[0]?.categories?.name || 'Serviço'}
                          </div>
                          <h3 className="text-white font-bold text-xl mb-2 group-hover:text-[#70ff00] transition-colors">
                            {company.nome_fantasia}
                          </h3>
                          <div className="flex items-center text-gray-400 text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-[#70ff00]" />
                            {company.address_city || 'Cidade não informada'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ) : (
                searchTerm && filteredCategories.length === 0 && (
                  <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <p className="text-gray-500 text-lg">Nenhum resultado encontrado para "{searchTerm}"</p>
                  </div>
                )
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Navegue por Categoria</h2>
                <button className="text-[#70ff00] hover:underline flex items-center text-sm font-semibold">
                  Ver todas as categorias <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-40 bg-white/5 animate-pulse rounded-3xl border border-white/5"></div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 md:grid-cols-5 gap-6"
                >
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      variants={item}
                      onClick={() => navigate(`/servicos/categoria/${cat.slug}`)}
                      className="group relative glass-card hover:glass-morphism hover:border-[#70ff00]/50 rounded-3xl p-8 transition-all duration-300 text-center flex flex-col items-center justify-center gap-6 overflow-hidden premium-glow"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#70ff00]/0 to-[#70ff00]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <CategoryIcon 
                        iconName={cat.icon} 
                        className="w-20 h-20 group-hover:shadow-[0_0_30px_rgba(112,255,0,0.3)] transition-all duration-300"
                        size={32}
                      />

                      <span className="text-white font-bold text-lg group-hover:text-[#70ff00] transition-colors tracking-tight">
                        {cat.name}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Featured Section */}
        <div className="bg-gradient-to-r from-[#001144] to-[#002266] rounded-[40px] p-8 md:p-12 border border-[#70ff00]/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#70ff00] opacity-5 blur-[120px]"></div>
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-1 bg-[#70ff00]/10 border border-[#70ff00]/20 rounded-full text-[#70ff00] text-xs font-bold mb-6">
                <Star className="w-3 h-3 mr-2" /> RECURSO EXCLUSIVO
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Transforme cada conserto em uma oportunidade de economia.
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Ao contratar através do CashMais, você não apenas resolve seu problema com profissionais de confiança, mas também acumula saldo para suas próximas compras.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#70ff00]/20 rounded-full flex items-center justify-center text-[#70ff00] font-black italic">5%</div>
                  <span className="text-white text-sm">Cashback Médio</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#70ff00]/20 rounded-full flex items-center justify-center text-[#70ff00] font-black italic">✓</div>
                  <span className="text-white text-sm">Profissionais Verificados</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" 
                alt="App Interface" 
                className="w-full max-w-md mx-auto drop-shadow-[0_0_50px_rgba(112,255,0,0.2)]"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
