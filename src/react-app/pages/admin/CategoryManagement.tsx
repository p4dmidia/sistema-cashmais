import { useEffect, useState } from "react";
import AdminLayout from "@/react-app/components/AdminLayout";
import { Plus, Edit2, Trash2, Tag, Search, Info } from "lucide-react";
import toast from "react-hot-toast";
import CategoryIcon from "@/react-app/components/services/CategoryIcon";

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", icon: "Tag", slug: "" });

  const autoMap: Record<string, string> = {
    // Manutenção e Obras
    'encanador': 'Wrench',
    'eletricista': 'Zap',
    'marceneiro': 'Hammer',
    'mecanico': 'Car',
    'oficina': 'Car',
    'pintor': 'Paintbrush',
    'pedreiro': 'Construction',
    'obra': 'Construction',
    'reforma': 'Construction',
    'jardineiro': 'Leaf',
    'jardim': 'Leaf',
    'limpeza': 'Sparkles',
    'faxina': 'Sparkles',
    'ar-condicionado': 'Wind',
    'refrigeracao': 'Wind',
    'chaveiro': 'Key',
    'frete': 'Truck',
    'mudanca': 'Package',
    'carreto': 'Truck',
    'solar': 'Sun',
    'energia': 'Zap',
    'seguranca': 'Lock',
    'alarme': 'Bell',
    
    // Tecnologia e Escritório
    'informatica': 'Monitor',
    'computador': 'Monitor',
    'celular': 'Smartphone',
    'tecnico': 'Cpu',
    'eletronico': 'Cpu',
    'advogado': 'Scale',
    'juridico': 'Scale',
    'contador': 'Calculator',
    'contabilidade': 'Calculator',
    'consultoria': 'Briefcase',
    'imobiliaria': 'Home',
    'imovel': 'Building',
    'aluguel': 'Key',
    'seguros': 'ShieldCheck',
    'banco': 'Landmark',
    'financeiro': 'DollarSign',
    
    // Saúde e Beleza
    'medico': 'Stethoscope',
    'dentista': 'Stethoscope',
    'saude': 'HeartPulse',
    'clinica': 'Hospital',
    'hospital': 'Hospital',
    'emergencia': 'Ambulance',
    'farmacia': 'Pill',
    'remedio': 'Pill',
    'drogaria': 'Pill',
    'laboratorio': 'TestTube2',
    'exame': 'ClipboardList',
    'otica': 'Glasses',
    'oculos': 'Glasses',
    'psicologo': 'Brain',
    'fisioterapia': 'Activity',
    'massagem': 'Flower2',
    'estetica': 'Sparkles',
    'beleza': 'Scissors',
    'salao': 'Scissors',
    'barbeiro': 'Scissors',
    'barbearia': 'Scissors',
    'cabelo': 'Scissors',
    'unha': 'Hand',
    'manicure': 'Hand',
    'maquiagem': 'Sparkles',
    'spa': 'Waves',
    
    // Gastronomia
    'comida': 'Utensils',
    'restaurante': 'Utensils',
    'buffet': 'Utensils',
    'lanche': 'Pizza',
    'pizza': 'Pizza',
    'hamburguer': 'Beef',
    'burger': 'Beef',
    'carne': 'Beef',
    'churrascaria': 'Beef',
    'japones': 'Fish',
    'sushi': 'Fish',
    'peixe': 'Fish',
    'doce': 'Cake',
    'bolo': 'Cake',
    'bebida': 'Beer',
    'bar': 'Beer',
    'cafe': 'Coffee',
    'padaria': 'Croissant',
    'pao': 'Croissant',
    'confeitaria': 'Cake',
    'sorvete': 'IceCreamCone',
    'acai': 'IceCreamCone',
    
    // Educação, Lazer e Comércio
    'professor': 'GraduationCap',
    'aula': 'GraduationCap',
    'curso': 'BookOpen',
    'escola': 'School',
    'faculdade': 'School',
    'livraria': 'Book',
    'papelaria': 'Pencil',
    'pet': 'Dog',
    'cachorro': 'Dog',
    'veterinario': 'Dog',
    'banho': 'Bath',
    'academia': 'Dumbbell',
    'treino': 'Dumbbell',
    'fitness': 'Dumbbell',
    'crossfit': 'Dumbbell',
    'esporte': 'Trophy',
    'futebol': 'Trophy',
    'musica': 'Music',
    'festa': 'PartyPopper',
    'evento': 'Calendar',
    'fotografo': 'Camera',
    'foto': 'Camera',
    'cinema': 'Clapperboard',
    'filme': 'Film',
    'teatro': 'Ticket',
    'viagem': 'Plane',
    'turismo': 'Map',
    'hotel': 'Bed',
    'pousada': 'Bed',
    'moda': 'ShoppingBag',
    'loja': 'Store',
    'roupa': 'Shirt',
    'calcado': 'Footprints',
    'supermercado': 'ShoppingCart',
    'mercado': 'ShoppingCart',
    'mercearia': 'ShoppingCart',
    'joalheria': 'Gem',
    'joia': 'Gem',
    'brinquedo': 'Baby',
    'kids': 'Baby',
    'floricultura': 'Flower',
    'flores': 'Flower',
    'lavanderia': 'Shirt',
    'costura': 'Scissors',
    
    // Veículos e Outros
    'posto': 'Fuel',
    'gasolina': 'Fuel',
    'combustivel': 'Fuel',
    'estacionamento': 'ParkingCircle',
    'transporte': 'Truck',
    'taxi': 'CarFront',
    'uber': 'CarFront',
    'igreja': 'Church',
    'religiao': 'Church',
    'templo': 'Landmark',
    'clube': 'Umbrella',
    'lazer': 'Palmtree'
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (newCategory.name) {
        // Normalização: remove acentos e deixa em minúsculo
        const nameNormalized = newCategory.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
          
        const key = Object.keys(autoMap).find(k => {
          const keyNormalized = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return nameNormalized.includes(keyNormalized);
        });

        if (key) {
          setNewCategory(prev => ({ ...prev, icon: autoMap[key] }));
        } else if (newCategory.icon === "Tag" || !newCategory.icon) {
          setNewCategory(prev => ({ ...prev, icon: "Tag" }));
        }
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [newCategory.name]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}` 
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      if (response.ok) {
        toast.success(editingCategory ? 'Categoria atualizada!' : 'Categoria criada!');
        setShowModal(false);
        setEditingCategory(null);
        setNewCategory({ name: "", icon: "Tag", slug: "" });
        fetchCategories();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar categoria');
      }
    } catch (error) {
      toast.error('Erro de conexão com o servidor');
      console.error('Error:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({ name: category.name, icon: category.icon, slug: category.slug });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Categoria excluída!');
        fetchCategories();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao excluir categoria');
      }
    } catch (error) {
      toast.error('Erro de conexão ao excluir');
      console.error('Error:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestão de Categorias</h1>
            <p className="text-[#70ff00]">Gerencie os tipos de serviços do sistema</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#70ff00] text-[#001144] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#50cc00] transition-all"
          >
            <Plus className="w-5 h-5" /> Nova Categoria
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Ícone</th>
                <th className="px-6 py-4 font-bold">Nome</th>
                <th className="px-6 py-4 font-bold">Slug</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="text-white hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <CategoryIcon iconName={cat.icon} size={20} className="w-10 h-10" />
                  </td>
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{cat.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(cat)}
                        className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-12 text-center text-gray-500">Carregando...</div>}
        </div>
      </div>

      {/* Modal Placeholder */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditingCategory(null); setNewCategory({ name: "", icon: "Tag", slug: "" }); }}></div>
          <div className="relative bg-[#001144] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
                <div className="bg-[#70ff00]/10 p-3 rounded-xl border border-[#70ff00]/20">
                  <CategoryIcon iconName={newCategory.icon} size={32} className="w-12 h-12" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ícone Sugerido</p>
                  <p className="text-white font-bold">{newCategory.icon}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Nome da Categoria</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all"
                  placeholder="Ex: Pet Shop, Barbearia, Dentista..."
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2 font-medium">Personalizar Ícone (Opcional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#70ff00] transition-all"
                    placeholder="Nome do ícone (Lucide)"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-2">
                  <Info className="w-3 h-3" /> O sistema sugere o ícone automaticamente, mas você pode alterar se preferir.
                </p>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCategory(null); setNewCategory({ name: "", icon: "Tag", slug: "" }); }}
                  className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#70ff00] text-[#001144] rounded-xl font-bold shadow-lg shadow-[#70ff00]/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
