'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Star, ChevronRight, X, Image as ImageIcon, Scissors, Zap, Check } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// Seus componentes originais 
import ReviewsSummary from '../components/ReviewsSummary';

interface Post {
  id: number;
  barber_id: number;
  image_url: string;
  caption: string | null;
  created_at: string;
}

interface PostReview {
  id: number;
  post_id: number;
  customer_name: string;
  rating: number;
  status: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();

  // ==========================================
  // ESTADOS
  // ==========================================
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsMap, setReviewsMap] = useState<Record<number, PostReview[]>>({});
  
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string>('Carregando...');
  const [companyStatus, setCompanyStatus] = useState<'trial' | 'active' | 'suspended' | 'unknown'>('unknown');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyAddress, setCompanyAddress] = useState<string | null>(null);
  const [companyMapUrl, setCompanyMapUrl] = useState<string | null>(null);

  // Estados de Avaliação
  const [ratingModal, setRatingModal] = useState<{ postId: number; open: boolean }>({ postId: 0, open: false });
  const [selectedRating, setSelectedRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');

  // Estados dos Modais UI
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);

  // ==========================================
  // LÓGICA DE SUBDOMÍNIO E FETCH
  // ==========================================
  useEffect(() => {
    const hostname = window.location.hostname;

    if (hostname === 'app.lattech.com.br' || hostname === 'www.lattech.com.br') {
      window.location.replace('/superadmin');
      return;
    }

    let sub = 'mariobarber'; 
    
    if (hostname.includes('lattech.com.br')) {
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
        sub = parts[0];
      }
    } 
    else if (hostname.includes('localhost') || hostname.includes('lvh.me')) {
      sub = 'mariobarber'; 
    }

    fetch(`${API_BASE_URL}/system/companies/lookup?subdomain=${sub}`)
      .then(res => {
        if (!res.ok) throw new Error("Empresa não encontrada");
        return res.json();
      })
      .then(data => {
        setCompanyId(data.id);
        if (data.name) setCompanyName(data.name); 
        if (data.logo_url) setCompanyLogo(data.logo_url);
        setCompanyStatus(data.status || 'active');
        if (data.address) setCompanyAddress(data.address);
        if (data.map_url) setCompanyMapUrl(data.map_url);
      })
      .catch(err => {
        console.error("Erro ao descobrir empresa:", err);
        setCompanyName('Empresa não encontrada');
        setPosts([]);
        setLoading(false); 
      });
  }, []);

  useEffect(() => {
    if (companyId === null) return; 
    if (companyStatus !== 'active' && companyStatus !== 'trial') return;

    fetch(`${API_BASE_URL}/feed/?company_id=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        const postsData = Array.isArray(data) ? data : []; 
        setPosts(postsData);
        setLoading(false);
        if (postsData.length > 0) {
          void Promise.all(postsData.map(async (post: Post) => {
            const res = await fetch(`${API_BASE_URL}/post-reviews/?post_id=${post.id}&company_id=${companyId}`);
            if (res.ok) {
              const reviews = await res.json();
              setReviewsMap((prev) => ({ ...prev, [post.id]: Array.isArray(reviews) ? reviews : [] }));
            }
          }));
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar feed:", err);
        setPosts([]);
        setLoading(false);
      });
  }, [companyId, companyStatus]);

  const handleOpenRating = (postId: number) => {
    setRatingModal({ postId, open: true });
    setSelectedRating(0);
    setCustomerName('');
    setRatingSuccess('');
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      alert('Selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    const name = customerName.trim() || 'Anônimo';
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/post-reviews/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: ratingModal.postId,
          customer_name: name,
          rating: selectedRating,
          company_id: companyId 
        }),
      });
      if (res.ok) {
        setRatingSuccess('Avaliação enviada para aprovação! ⭐');
        setSelectedRating(0);
        setCustomerName('');
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao enviar avaliação.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // ==========================================
  // TELA DE SUSPENSÃO
  // ==========================================
  const statusLower = companyStatus.toLowerCase();
  if (statusLower !== 'unknown' && statusLower !== 'active' && statusLower !== 'trial') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center bg-[#0A0A0A] border border-blue-500/20 rounded-2xl p-8 space-y-4">
          <h1 className="text-2xl font-bold text-blue-400">Acesso Indisponível</h1>
          <p className="text-zinc-400 text-sm">
            Sistema temporariamente indisponível. Solicite ao administrador para regularizar o acesso.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !companyName) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO DA PÁGINA PRINCIPAL (PREMIUM UI)
  // ==========================================
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center">
      
      {/* Background com Imagem e Overlay Premium */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-start justify-center">
        {/* Imagem de Fundo com opacidade aumentada para ficar mais visível */}
        <div className="absolute inset-0 bg-[url('/imagens/fundoapp.png')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        {/* Overlay Escuro (Clareado no topo, escuro na base) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/30 via-[#050505]/70 to-[#050505]"></div>
        {/* Glow Azul no topo */}
        <div className="w-[400px] h-[400px] bg-blue-600/30 blur-[120px] rounded-full mt-[-100px] absolute"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 pt-16 pb-10 flex flex-col items-center min-h-screen">
        
        {/* LOGO DA EMPRESA */}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl"></div>
          <div className="relative w-full h-full rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Scissors size={32} className="text-zinc-700" />
            )}
          </div>
        </div>

        {/* NOME DA EMPRESA */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            {companyName}
          </h1>
          <p className="text-zinc-400 text-sm font-medium tracking-wide drop-shadow-sm">
            Praticidade no seu agendamento
          </p>
        </div>

        {/* MENU DE OPÇÕES */}
        <div className="w-full space-y-3">
          
          {/* Botão Primário: Agendar (Degradê Azul com Branco) */}
          <button 
            onClick={() => router.push('/agendamento')}
            className="w-full group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 hover:from-blue-500 hover:to-sky-300 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-blue-500/20 border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                <CalendarDays size={20} />
              </div>
              <span className="font-bold text-white text-lg tracking-wide">Agendar</span>
            </div>
            <ChevronRight className="text-white/70 group-hover:text-white transition-colors" size={24} />
          </button>

          {/* Botões Secundários: Clean Glassmorphismm */}
          <button 
            onClick={() => setShowPostsModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-xl bg-[#121214]/80 backdrop-blur-md border border-white/5 hover:border-blue-500/30 hover:bg-[#18181b]/90 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <ImageIcon size={20} />
              </div>
              <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">Nossos serviços</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-blue-400 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowLocationModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-xl bg-[#121214]/80 backdrop-blur-md border border-white/5 hover:border-blue-500/30 hover:bg-[#18181b]/90 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <MapPin size={20} />
              </div>
              <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">Nossa localização</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-blue-400 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowReviewsModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-xl bg-[#121214]/80 backdrop-blur-md border border-white/5 hover:border-blue-500/30 hover:bg-[#18181b]/90 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <Star size={20} />
              </div>
              <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">Avaliações</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-blue-400 transition-colors" size={20} />
          </button>

        </div>

        {/* Rodapé SaaS Minimalista */}
        <footer className="mt-auto pt-16 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <Zap size={12} className="text-blue-500" />
            <span className="text-xs font-bold text-zinc-400 tracking-wide drop-shadow-md">LAT System</span>
          </div>
        </footer>
      </div>

      {/* =========================================
          MODAL DE LOCALIZAÇÃO
      ========================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h3 className="font-bold text-base flex items-center gap-2 text-white">
                <MapPin className="text-blue-500" size={18} /> Como chegar
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {companyAddress && (
                <p className="text-sm text-zinc-300 bg-[#121214] p-4 rounded-xl border border-white/5">
                  {companyAddress}
                </p>
              )}
              <div className="w-full aspect-square bg-[#121214] rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative">
                {companyMapUrl ? (
                  <iframe src={companyMapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" className="absolute inset-0"></iframe>
                ) : (
                  <p className="text-xs text-zinc-600">Mapa não configurado.</p>
                )}
              </div>
              <button onClick={() => setShowLocationModal(false)} className="w-full py-3.5 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-[#18181b] text-white font-bold rounded-xl transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE AVALIAÇÕES
      ========================================= */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2 text-white">
                <Star className="text-blue-500" size={18} /> Avaliações
              </h3>
              <button onClick={() => setShowReviewsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <ReviewsSummary companyId={companyId} />
            </div>
            <div className="p-5 border-t border-white/5 shrink-0">
              <button onClick={() => setShowReviewsModal(false)} className="w-full py-3.5 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-[#18181b] text-white font-bold rounded-xl transition">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE SERVIÇOS / POSTAGENS
      ========================================= */}
      {showPostsModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <h3 className="font-bold text-base flex items-center gap-2 text-white">
              <ImageIcon className="text-blue-500" size={18} /> Portfólio de Serviços
            </h3>
            <button onClick={() => setShowPostsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto pb-10">
              {!Array.isArray(posts) || posts.length === 0 ? (
                <div className="col-span-full bg-[#0A0A0A] border border-dashed border-white/10 rounded-2xl p-16 text-center text-zinc-500 text-sm">
                  Nenhum serviço publicado ainda.
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="group relative bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-full">
                    <div className="aspect-square w-full bg-[#121214] relative overflow-hidden shrink-0">
                      <img src={post.image_url} alt="Trabalho" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="p-4 space-y-3 flex flex-col flex-1 justify-between">
                      <div>
                        {reviewsMap[post.id] && reviewsMap[post.id].length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">
                              {reviewsMap[post.id].length} Avaliações
                            </span>
                          </div>
                        )}
                        {post.caption && <p className="text-sm leading-relaxed text-zinc-300">{post.caption}</p>}
                      </div>
                      <button onClick={() => handleOpenRating(post.id)} className="w-full mt-3 py-2.5 bg-white/5 hover:bg-blue-600/10 text-xs font-bold uppercase text-zinc-400 hover:text-blue-400 border border-white/5 rounded-xl transition-all duration-300">
                        Avaliar Corte
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE AVALIAÇÃO DO CORTE
      ========================================= */}
      {ratingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 text-center">Avaliar Corte</h3>
            <p className="text-sm text-zinc-400 text-center mb-6">Deixe sua nota para este trabalho</p>
            
            {ratingSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <Check size={24} className="text-blue-400" />
                </div>
                <p className="text-blue-400 font-bold">{ratingSuccess}</p>
                <button onClick={() => setRatingModal({ postId: 0, open: false })} className="mt-4 w-full py-3.5 bg-[#121214] hover:bg-[#18181b] border border-white/5 text-white rounded-xl transition">
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setSelectedRating(star)} className={`p-2 transition-transform hover:scale-110 ${selectedRating >= star ? 'text-amber-400' : 'text-zinc-700'}`}>
                      <Star size={32} fill={selectedRating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Seu Nome (Opcional)</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: João" className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRatingModal({ postId: 0, open: false })} className="flex-1 py-3.5 bg-[#121214] border border-white/5 hover:bg-[#18181b] text-zinc-300 font-bold rounded-xl transition">
                    Cancelar
                  </button>
                  <button onClick={handleSubmitRating} disabled={submittingRating || selectedRating === 0} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition">
                    {submittingRating ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}