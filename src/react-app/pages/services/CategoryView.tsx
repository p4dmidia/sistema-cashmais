import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Layout from "@/react-app/components/Layout";
import CompanyListItem from "@/react-app/components/services/CompanyListItem";
import { List, Map as MapIcon, ChevronLeft, Search, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryMap from "@/react-app/components/services/CategoryMap";
import { supabase } from "@/lib/supabase";

export default function CategoryView() {
  const { id: categorySlug } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, [categorySlug]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      // 1. Get Category ID
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (!catData) {
        setCompanies([]);
        return;
      }

      // 2. Get Companies IDs for this category
      const { data: relData } = await supabase
        .from('company_categories')
        .select('company_id')
        .eq('category_id', catData.id);

      const ids = (relData || []).map(r => r.company_id);

      if (ids.length === 0) {
        setCompanies([]);
        return;
      }

      // 3. Fetch Full Company Data
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id, 
          nome_fantasia, 
          thumbnail_url, 
          address_city, 
          is_verified, 
          description,
          latitude, 
          longitude,
          company_cashback_config(cashback_percentage),
          company_categories(categories(name)),
          company_reviews(rating)
        `)
        .in('id', ids)
        .eq('is_active', true);

      if (error) throw error;

      // 4. Format for UI
      const formatted = (companiesData || []).map(co => {
        const reviews = co.company_reviews || [];
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
          ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
          : "0.0";

        return {
          ...co,
          name: co.nome_fantasia,
          city: co.address_city,
          rating_avg: averageRating,
          rating_count: totalReviews,
          cashback: co.company_cashback_config?.[0]?.cashback_percentage || 5,
          categories: co.company_categories?.map((cc: any) => cc.categories?.name) || []
        };
      });

      setCompanies(formatted);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((c: any) => 
    c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/servicos')}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white capitalize">
                {categorySlug?.replace('-', ' ')}
              </h1>
              <p className="text-[#70ff00] text-sm font-medium">
                {filteredCompanies.length} empresas encontradas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
            <button 
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                viewMode === "list" 
                  ? "bg-[#70ff00] text-[#001144] shadow-[0_0_20px_rgba(112,255,0,0.3)]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
            <button 
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                viewMode === "map" 
                  ? "bg-[#70ff00] text-[#001144] shadow-[0_0_20px_rgba(112,255,0,0.3)]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Mapa
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center px-4 py-2 bg-black/20 rounded-xl border border-white/5">
            <Search className="w-4 h-4 text-gray-500 mr-3" />
            <input 
              type="text" 
              placeholder="Buscar nesta categoria..."
              className="bg-transparent border-none text-white focus:ring-0 w-full text-sm placeholder-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-sm font-bold transition-all">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[600px] relative">
          <AnimatePresence mode="wait">
            {viewMode === "list" ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="h-48 bg-white/5 animate-pulse rounded-[32px] border border-white/5"></div>
                  ))
                ) : filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
                    <CompanyListItem 
                      key={company.id} 
                      company={company} 
                      onClick={() => navigate(`/servicos/empresa/${company.id}`)}
                    />
                  ))
                ) : (
                  <div className="col-span-2 py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <Search className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhuma empresa encontrada</h3>
                    <p className="text-gray-500">Tente ajustar sua busca ou mudar os filtros.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 bg-white/5 rounded-[40px] border border-white/10 overflow-hidden"
              >
                <CategoryMap 
                  companies={filteredCompanies} 
                  onCompanyClick={(id) => navigate(`/servicos/empresa/${id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
