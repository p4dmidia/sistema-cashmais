import { useEffect, useState } from "react";
import AdminLayout from "@/react-app/components/AdminLayout";
import { Star, Trash2, MessageSquare, Building2, User, Calendar, ShieldAlert } from "lucide-react";

interface Review {
  id: string;
  company_id: number;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  companies: {
    nome_fantasia: string;
  };
  user_profiles: {
    mocha_user_id: string;
  };
}

export default function ReviewManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/admin/reviews');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;
    
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setReviews(reviews.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Moderação de Avaliações</h1>
          <p className="text-[#70ff00]">Gerencie os comentários e notas dos serviços</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#70ff00]"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma avaliação encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:border-[#70ff00]/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < review.rating ? 'fill-[#70ff00] text-[#70ff00]' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-white mb-6 italic">"{review.comment}"</p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Building2 className="w-3.5 h-3.5 text-[#70ff00]" />
                    <span className="truncate">{review.companies.nome_fantasia}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User className="w-3.5 h-3.5 text-[#70ff00]" />
                    <span>ID: {review.user_profiles.mocha_user_id.replace('affiliate_', '')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5 text-[#70ff00]" />
                    <span>{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
