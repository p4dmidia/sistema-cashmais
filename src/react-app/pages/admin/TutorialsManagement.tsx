import React, { useEffect, useState, useRef } from "react";
import AdminLayout from "@/react-app/components/AdminLayout";
import { Plus, Edit2, Trash2, Video, Search, Info, Play, ToggleLeft, ToggleRight, Camera, UploadCloud, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/react-app/lib/supabase";

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export default function TutorialsManagement() {
  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<VideoTutorial | null>(null);
  const [selectedPreviewVideo, setSelectedPreviewVideo] = useState<VideoTutorial | null>(null);

  const isDirectVideo = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const hasVideoExtension = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.mov');
    const isSupabaseStorage = lowerUrl.includes('/storage/v1/object/');
    return hasVideoExtension || isSupabaseStorage;
  };

  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1`;
    }
    let vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    if (url.includes('youtube.com/embed/')) {
      return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }
    return url;
  };
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    order_index: 0,
    is_active: true
  });

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB (default Supabase free-tier limit)
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; 
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('O arquivo de vídeo é muito grande! O limite do Supabase é de 50MB. Por favor, comprima o vídeo ou insira um link direto (ex: YouTube/Vimeo).');
      return;
    }

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `tutorials/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading video:', uploadError);
        if (uploadError.message?.includes('exceeded the maximum allowed size')) {
          throw new Error('O arquivo de vídeo excede o limite máximo de tamanho de 50MB do Supabase. Comprima o vídeo ou use um link externo.');
        }
        throw new Error(`Falha ao enviar vídeo: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, video_url: publicUrl }));
      toast.success('Vídeo enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao enviar vídeo.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    const MAX_THUMB_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_THUMB_SIZE) {
      toast.error('A imagem da thumbnail é muito grande! O limite máximo é de 5MB.');
      return;
    }

    setUploadingThumb(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `tutorials/thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading thumbnail:', uploadError);
        throw new Error(`Falha ao enviar thumbnail: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success('Thumbnail enviada com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao enviar thumbnail.');
    } finally {
      setUploadingThumb(false);
    }
  };

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/video-tutorials');
      if (response.ok) {
        const data = await response.json();
        setTutorials(data.tutorials || []);
      } else {
        toast.error('Erro ao carregar tutoriais');
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      toast.error('Erro de conexão ao carregar tutoriais');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      order_index: 0,
      is_active: true
    });
    setEditingTutorial(null);
  };

  const handleEdit = (tutorial: VideoTutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description || "",
      video_url: tutorial.video_url,
      thumbnail_url: tutorial.thumbnail_url || "",
      order_index: tutorial.order_index,
      is_active: tutorial.is_active
    });
    setShowModal(true);
  };

  const handleToggleActive = async (tutorial: VideoTutorial) => {
    try {
      const updated = {
        title: tutorial.title,
        description: tutorial.description,
        video_url: tutorial.video_url,
        thumbnail_url: tutorial.thumbnail_url,
        order_index: tutorial.order_index,
        is_active: !tutorial.is_active
      };
      const response = await fetch(`/api/admin/video-tutorials/${tutorial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        toast.success(`Tutorial ${!tutorial.is_active ? 'ativado' : 'desativado'} com sucesso!`);
        fetchTutorials();
      } else {
        toast.error('Erro ao atualizar status do tutorial');
      }
    } catch (error) {
      toast.error('Erro de conexão');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este tutorial em vídeo?')) return;
    try {
      const response = await fetch(`/api/admin/video-tutorials/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Tutorial excluído com sucesso!');
        fetchTutorials();
      } else {
        toast.error('Erro ao excluir tutorial');
      }
    } catch (error) {
      toast.error('Erro de conexão');
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Título e URL do vídeo são obrigatórios');
      return;
    }

    try {
      const url = editingTutorial 
        ? `/api/admin/video-tutorials/${editingTutorial.id}` 
        : '/api/admin/video-tutorials';
      const method = editingTutorial ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingTutorial ? 'Tutorial atualizado!' : 'Tutorial adicionado!');
        setShowModal(false);
        resetForm();
        fetchTutorials();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar tutorial');
      }
    } catch (error) {
      toast.error('Erro de conexão com o servidor');
      console.error('Error:', error);
    }
  };

  const getThumbnailPreview = (url: string, customThumb: string): string => {
    if (customThumb) return customThumb;
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://img.youtube.com/vi/${ytMatch[2]}/default.jpg`;
    }
    return 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=800';
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestão de Vídeos Tutoriais</h1>
            <p className="text-[#70ff00]">Gerencie os vídeos instrutivos exibidos no site para todos os usuários</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-[#70ff00] text-[#001144] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#50cc00] transition-all"
          >
            <Plus className="w-5 h-5" /> Adicionar Tutorial
          </button>
        </div>

        {/* Video Tutorials Table/Grid */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Thumbnail</th>
                <th className="px-6 py-4 font-bold">Título</th>
                <th className="px-6 py-4 font-bold">Ordem</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tutorials.map((tutorial) => (
                <tr key={tutorial.id} className="text-white hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => setSelectedPreviewVideo(tutorial)}
                      className="w-20 aspect-video rounded-lg overflow-hidden bg-black relative flex items-center justify-center border border-white/10 cursor-pointer group/thumb hover:border-[#70ff00]/50 transition-all"
                      title="Visualizar Vídeo"
                    >
                      <img 
                        src={getThumbnailPreview(tutorial.video_url, tutorial.thumbnail_url || '')} 
                        alt="" 
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" 
                      />
                      <Play className="absolute w-4 h-4 text-white drop-shadow-md group-hover/thumb:scale-110 group-hover/thumb:text-[#70ff00] transition-all" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white line-clamp-1">{tutorial.title}</div>
                    <a 
                      href={`/tutoriais?v=${tutorial.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#70ff00]/80 hover:text-[#70ff00] hover:underline transition-colors block mt-0.5 font-medium truncate max-w-md"
                      title="Clique para abrir a página pública do tutorial"
                    >
                      cashmais.net.br/tutoriais?v={tutorial.id}
                    </a>
                  </td>
                  <td className="px-6 py-4 font-medium">{tutorial.order_index}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleToggleActive(tutorial)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        tutorial.is_active 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {tutorial.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedPreviewVideo(tutorial)}
                        className="p-2 hover:bg-white/10 rounded-lg text-[#70ff00] transition-colors"
                        title="Visualizar Vídeo"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(tutorial)}
                        className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tutorial.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tutorials.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    Nenhum tutorial cadastrado. Clique em "Adicionar Tutorial" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div className="p-12 text-center text-gray-500">Carregando...</div>}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="relative bg-[#001144] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl z-10">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingTutorial ? 'Editar Tutorial' : 'Adicionar Tutorial'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Título do Vídeo *</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all"
                  placeholder="Ex: Como indicar amigos, Como solicitar saques..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Descrição / Instruções (Opcional)</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all h-24 resize-none"
                  placeholder="Instruções breves sobre o conteúdo do vídeo..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">URL do Vídeo *</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input 
                    type="text" 
                    required
                    className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all placeholder-gray-400"
                    placeholder="Ex: https://www.youtube.com/watch?v=XXXXX"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleVideoUpload}
                    accept="video/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="w-full sm:w-auto px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center justify-center font-semibold shrink-0"
                  >
                    {uploadingVideo ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <UploadCloud className="w-4 h-4 mr-2" />
                    )}
                    {uploadingVideo ? 'Enviando...' : 'Enviar Vídeo'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3" /> Cole um link do YouTube/Vimeo ou envie um arquivo de vídeo direto.
                </p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">URL da Thumbnail Personalizada (Opcional)</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input 
                    type="text" 
                    className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all placeholder-gray-400"
                    placeholder="Ex: https://dominio.com/imagem.jpg"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  />
                  <input
                    type="file"
                    ref={thumbInputRef}
                    onChange={handleThumbUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={uploadingThumb}
                    className="w-full sm:w-auto px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center justify-center font-semibold shrink-0"
                  >
                    {uploadingThumb ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {uploadingThumb ? 'Enviando...' : 'Enviar Imagem'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3" /> Insira o link da imagem ou envie uma do seu computador.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2 font-medium">Ordem de Exibição</label>
                  <input 
                    type="number" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#70ff00] focus:ring-1 focus:ring-[#70ff00] transition-all"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-white font-medium mb-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[#70ff00] bg-white/10 border-white/30 rounded focus:ring-[#70ff00] focus:ring-2"
                    />
                    Tutorial Ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
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

      {/* Video Preview Modal */}
      {selectedPreviewVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md" 
            onClick={() => setSelectedPreviewVideo(null)}
          ></div>
          <div className="relative w-full max-w-4xl bg-[#001144] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white truncate pr-6">
                Visualizar: {selectedPreviewVideo.title}
              </h3>
              <button
                onClick={() => setSelectedPreviewVideo(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Embed */}
            <div className="relative aspect-video bg-black">
              {isDirectVideo(selectedPreviewVideo.video_url) ? (
                <video
                  src={selectedPreviewVideo.video_url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={getEmbedUrl(selectedPreviewVideo.video_url)}
                  title={selectedPreviewVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              )}
            </div>

            {/* Description */}
            {selectedPreviewVideo.description && (
              <div className="p-6 bg-white/5 border-t border-white/10 max-h-40 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {selectedPreviewVideo.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
