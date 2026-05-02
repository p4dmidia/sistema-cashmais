import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Layout from "@/react-app/components/Layout";
import ImageCarousel from "@/react-app/components/services/ImageCarousel";
import { 
  Phone, 
  MessageCircle, 
  MapPin, 
  Star, 
  ShieldCheck, 
  ChevronLeft, 
  ExternalLink,
  Info,
  Calendar,
  Wallet
} from "lucide-react";
import { motion } from "framer-motion";

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/companies/${id}/public`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000011] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#70ff00]"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl text-white">Empresa não encontrada</h1>
          <button onClick={() => navigate('/servicos')} className="text-[#70ff00] mt-4 underline">Voltar para o diretório</button>
        </div>
      </Layout>
    );
  }

  const galleryImages = company.company_images?.map((img: any) => img.image_url) || [];
  const cashback = company.company_cashback_config?.[0]?.cashback_percentage || 5;
  const reviews = company.company_reviews || [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá ${company.nome_fantasia}, vi seu perfil no CashMais e gostaria de saber mais sobre seus serviços.`);
    window.open(`https://wa.me/${company.whatsapp?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-12">
            {/* Header & Carousel */}
            <div className="space-y-8">
              <ImageCarousel images={galleryImages.length > 0 ? galleryImages : [company.thumbnail_url]} />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-black text-white">{company.nome_fantasia}</h1>
                    {company.is_verified && <ShieldCheck className="w-8 h-8 text-[#70ff00]" />}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#70ff00]" /> {company.address_city}, {company.address_state}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" /> {averageRating} ({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#70ff00]/10 border border-[#70ff00]/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="bg-[#70ff00] text-[#001144] w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl italic shadow-[0_0_20px_rgba(112,255,0,0.3)]">
                      {cashback}%
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Cashback Ativo</p>
                      <p className="text-[#70ff00] text-xs font-medium">Economize nesta empresa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 md:p-10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Info className="w-6 h-6 text-[#70ff00]" /> Sobre a Empresa
              </h2>
              <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">
                {company.description || "Esta empresa ainda não adicionou uma descrição detalhada."}
              </p>
              
              <div className="mt-10 pt-10 border-t border-white/10 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-widest opacity-60">Categorias de Atuação</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.company_categories?.map((cc: any) => (
                      <span key={cc.categories.id} className="px-4 py-2 bg-white/5 rounded-xl text-white text-sm font-medium border border-white/5">
                        {cc.categories.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-widest opacity-60">Endereço</h3>
                  <p className="text-gray-300 text-sm">
                    {company.address_street}, {company.address_number}<br />
                    {company.address_district} - {company.address_city}/{company.address_state}<br />
                    CEP: {company.address_zip}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews Placeholder */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-400" /> Avaliações
                </h2>
                <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-xl text-sm font-bold border border-white/10 transition-all">
                  Avaliar Empresa
                </button>
              </div>
              
              {company.company_reviews?.length > 0 ? (
                <div className="space-y-6">
                  {company.company_reviews.map((review: any) => (
                    <div key={review.id} className="p-6 bg-black/20 rounded-3xl border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#70ff00]/10 rounded-full flex items-center justify-center text-[#70ff00] font-bold">
                            U
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">Usuário CashMais</p>
                            <p className="text-gray-500 text-xs">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm italic">"{review.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Ainda não há avaliações para esta empresa. Seja o primeiro!
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Actions (Right) */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Contact Card */}
              <div className="bg-[#70ff00] rounded-[40px] p-8 shadow-[0_20px_50px_rgba(112,255,0,0.2)]">
                <h3 className="text-[#001144] text-2xl font-black mb-6">Entre em Contato</h3>
                <div className="space-y-4">
                  <button 
                    onClick={handleWhatsApp}
                    className="w-full bg-[#001144] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95"
                  >
                    <MessageCircle className="w-6 h-6" /> WhatsApp
                  </button>
                  <button 
                    onClick={() => window.open(`tel:${company.telefone}`)}
                    className="w-full bg-white text-[#001144] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95"
                  >
                    <Phone className="w-6 h-6" /> Ligar Agora
                  </button>
                </div>
                <p className="text-[#001144]/60 text-center text-xs font-bold mt-6 uppercase tracking-wider">
                  Atendimento em Horário Comercial
                </p>
              </div>

              {/* Map Action */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8">
                <h3 className="text-white text-xl font-bold mb-6">Localização</h3>
                <div className="w-full aspect-square bg-black/20 rounded-3xl mb-6 relative overflow-hidden">
                  {company.latitude && company.longitude ? (
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${company.latitude},${company.longitude}&z=15&output=embed`}
                    ></iframe>
                  ) : (
                    <>
                      <img 
                        src="https://images.unsplash.com/photo-1569336415962-a4bd4f799335?q=80&w=2070&auto=format&fit=crop" 
                        className="w-full h-full object-cover opacity-50 grayscale"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-[#70ff00] drop-shadow-[0_0_15px_rgba(112,255,0,0.8)]" />
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${company.latitude},${company.longitude}`, '_blank')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border border-white/10"
                >
                  <ExternalLink className="w-5 h-5" /> Iniciar Navegação
                </button>
              </div>

              {/* Verified Badge info */}
              {company.is_verified && (
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-3xl p-6 flex items-start gap-4">
                  <ShieldCheck className="w-10 h-10 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm">Empresa Verificada</p>
                    <p className="text-blue-400 text-xs mt-1">Este estabelecimento passou pelo processo de auditoria da equipe CashMais.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
