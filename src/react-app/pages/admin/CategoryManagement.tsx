import { useEffect, useState } from "react";
import Layout from "@/react-app/components/Layout";
import { Plus, Edit2, Trash2, Tag, Search, Info } from "lucide-react";
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
  const [newCategory, setNewCategory] = useState({ name: "", icon: "Tag", slug: "" });

  const autoMap: Record<string, string> = {
    'encanador': 'Wrench',
    'eletricista': 'Zap',
    'marceneiro': 'Hammer',
    'mecanico': 'Car',
    'pintor': 'Paintbrush',
    'pedreiro': 'Construction',
    'jardineiro': 'Leaf',
    'limpeza': 'Sparkles',
    'ar-condicionado': 'Wind',
    'chaveiro': 'Key',
    'informatica': 'Monitor',
    'tecnico': 'Cpu',
    'massagem': 'Flower2',
    'frete': 'Truck',
    'mudanca': 'Package',
    'professor': 'GraduationCap',
    'advogado': 'Scale',
    'contador': 'Calculator',
    'dentista': 'Stethoscope'
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (newCategory.name && (newCategory.icon === "Tag" || !newCategory.icon)) {
        const nameLower = newCategory.name.toLowerCase();
        // Check for partial matches too
        const key = Object.keys(autoMap).find(k => nameLower.includes(k));
        if (key) {
          setNewCategory(prev => ({ ...prev, icon: autoMap[key] }));
        }
      }
    }, 500);
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
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      if (response.ok) {
        setShowModal(false);
        setNewCategory({ name: "", icon: "Tag", slug: "" });
        fetchCategories();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Layout>
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
                      <button className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors">
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#001144] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Nova Categoria</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Nome</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all"
                  placeholder="Ex: Encanador"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-2 font-medium">Ícone (Lucide Name)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] transition-all"
                    placeholder="Ex: Wrench"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="block text-gray-400 text-xs mb-2 font-medium">Preview</label>
                  <CategoryIcon iconName={newCategory.icon} size={24} className="w-12 h-12" />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                <Info className="w-3 h-3" /> Use nomes do Lucide Icons (ex: Zap, Wrench, Hammer)
              </p>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-bold border border-white/10"
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
    </Layout>
  );
}
