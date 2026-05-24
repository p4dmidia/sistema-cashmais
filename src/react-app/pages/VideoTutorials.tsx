import { useEffect, useState } from 'react';
import Layout from '@/react-app/components/Layout';
import { Play, Search, Film, X, HelpCircle } from 'lucide-react';

interface VideoTutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string;
}

export default function VideoTutorials() {
  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/video-tutorials');
      if (response.ok) {
        const data = await response.json();
        const list = data.tutorials || [];
        setTutorials(list);

        // Auto-select video if query param 'v' matches
        const queryParams = new URLSearchParams(window.location.search);
        const videoId = queryParams.get('v');
        if (videoId) {
          const found = list.find((t: VideoTutorial) => t.id === videoId);
          if (found) {
            setSelectedVideo(found);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDirectVideo = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const hasVideoExtension = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.mov');
    const isSupabaseStorage = lowerUrl.includes('/storage/v1/object/');
    return hasVideoExtension || isSupabaseStorage;
  };

  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1`;
    }
    
    // Vimeo
    let vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    if (url.includes('youtube.com/embed/')) {
      return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }

    return url;
  };

  const getThumbnail = (tutorial: VideoTutorial): string => {
    if (tutorial.thumbnail_url) return tutorial.thumbnail_url;

    const url = tutorial.video_url;
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://img.youtube.com/vi/${ytMatch[2]}/maxresdefault.jpg`;
    }

    return 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=800';
  };

  const filteredTutorials = tutorials.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Central de <span className="text-[#70ff00]">Tutoriais</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Aprenda a utilizar todos os recursos da plataforma CashMais com nossos guias em vídeo passo a passo.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar tutorial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#70ff00]"></div>
          </div>
        ) : filteredTutorials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#70ff00]/40 transition-all duration-300 flex flex-col h-full shadow-xl"
              >
                {/* Video Thumbnail Area */}
                <div 
                  className="relative aspect-video overflow-hidden cursor-pointer"
                  onClick={() => setSelectedVideo(tutorial)}
                >
                  <img
                    src={getThumbnail(tutorial)}
                    alt={tutorial.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors duration-300">
                    <div className="w-14 h-14 bg-[#70ff00] text-[#001144] rounded-full flex items-center justify-center shadow-lg shadow-[#70ff00]/30 transform group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[#70ff00] transition-colors">
                    {tutorial.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                    {tutorial.description || 'Assista a este vídeo tutorial para aprender mais sobre este recurso.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 max-w-lg mx-auto">
            <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhum tutorial encontrado</h3>
            <p className="text-gray-400 text-sm">
              Tente redefinir sua busca ou volte mais tarde para novos tutoriais.
            </p>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedVideo(null)}
            ></div>
            
            {/* Modal Body */}
            <div className="relative w-full max-w-4xl bg-[#001144] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white truncate pr-6">
                  {selectedVideo.title}
                </h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Video Embed */}
              <div className="relative aspect-video bg-black">
                {isDirectVideo(selectedVideo.video_url) ? (
                  <video
                    src={selectedVideo.video_url}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <iframe
                    src={getEmbedUrl(selectedVideo.video_url)}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  ></iframe>
                )}
              </div>

              {/* Description */}
              {selectedVideo.description && (
                <div className="p-6 bg-white/5 border-t border-white/10 max-h-40 overflow-y-auto">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {selectedVideo.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
