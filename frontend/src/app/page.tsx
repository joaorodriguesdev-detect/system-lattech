'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Star, ChevronRight, X, Image as ImageIcon, Scissors, Zap } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// Seus componentes originais (mantidos para uso nos modais)
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
  // ESTADOS ORIGINAIS MANTIDOS
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

  // Estados de Avaliação de Posts
  const [ratingModal, setRatingModal] = useState<{ postId: number; open: boolean }>({ postId: 0, open: false });
  const [selectedRating, setSelectedRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');

  // ==========================================
  // NOVOS ESTADOS PARA OS MODAIS CLEAN UI
  // ==========================================
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);

  // ==========================================
  // LÓGICA DE SUBDOMÍNIO (INTACTA)
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
        <div className="max-w-xl w-full text-center bg-[#0A0A0A] border border-rose-500/20 rounded-3xl p-8 space-y-4">
          <h1 className="text-3xl font-bold text-rose-400">Acesso temporariamente indisponível</h1>
          <p className="text-zinc-300 leading-7">
            Sistema temporariamente indisponível.
            <br />Solicite ao administrador para regularizar o acesso.
          </p>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Status atual: {companyStatus}</div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO DA PÁGINA PRINCIPAL
  // ==========================================
  if (loading && !companyName) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center">
      
      {/* Background Premium Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-amber-600 opacity-20 blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 pt-16 pb-10 flex flex-col items-center min-h-screen">
        
        {/* LOGO DA EMPRESA */}
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-full h-full rounded-full border border-white/10 bg-[#121214] flex items-center justify-center overflow-hidden shadow-2xl">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-105" />
            ) : (
              <Scissors size={40} className="text-zinc-600" />
            )}
          </div>
        </div>

        {/* NOME DA EMPRESA */}
        <div className="text-center mb-10 space-y-1">
          <h1 className="font-unifraktur text-3xl sm:text-4xl tracking-[0.03em] leading-none text-center">
            <span className="bg-gradient-to-b from-amber-200 via-amber-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(217,119,6,0.35)]">
              {companyName}
            </span>
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-2">
            Agende seu horário com praticidade
          </p>
        </div>

        {/* MENU DE OPÇÕES (Estilo Linktree Premium) */}
        <div className="w-full space-y-3.5">
          
          <button 
            onClick={() => router.push('/agendamento')}
            className="w-full group relative flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-amber-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white">
                <CalendarDays size={20} />
              </div>
              <span className="font-bold text-white text-lg tracking-wide">Faça seu agendamento</span>
            </div>
            <ChevronRight className="text-white/70 group-hover:text-white transition-colors" size={24} />
          </button>

          <button 
            onClick={() => setShowPostsModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-[#18181B]/80 backdrop-blur-md border border-white/5 hover:bg-[#27272A]/80 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <ImageIcon size={20} />
              </div>
              <span className="font-semibold text-zinc-200">Nossos serviços</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowLocationModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-[#18181B]/80 backdrop-blur-md border border-white/5 hover:bg-[#27272A]/80 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <MapPin size={20} />
              </div>
              <span className="font-semibold text-zinc-200">Nossa localização</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowReviewsModal(true)}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-[#18181B]/80 backdrop-blur-md border border-white/5 hover:bg-[#27272A]/80 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                <Star size={20} />
              </div>
              <span className="font-semibold text-zinc-200">Avaliações</span>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={20} />
          </button>

        </div>

        {/* Rodapé SaaS */}
        <footer className="mt-auto pt-12 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Zap size={10} className="text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-300 tracking-wider">LAT System</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium tracking-[0.2em] uppercase">
            Desenvolvido por <span className="text-amber-500 font-bold">LATTECH</span>
          </p>
        </footer>
      </div>

      {/* =========================================
          MODAL DE LOCALIZAÇÃO
      ========================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="text-emerald-400" size={20} /> Como chegar
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {companyAddress && (
                <p className="text-sm text-zinc-300 bg-[#18181B] p-4 rounded-xl border border-white/5">
                  {companyAddress}
                </p>
              )}
              <div className="w-full aspect-square bg-[#0A0A0A] rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative">
                {companyMapUrl ? (
                  <iframe src={companyMapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" className="absolute inset-0"></iframe>
                ) : (
                  <p className="text-xs text-zinc-600">Mapa não configurado.</p>
                )}
              </div>
              <button onClick={() => setShowLocationModal(false)} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE AVALIAÇÕES (Reaproveita seu componente)
      ========================================= */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Star className="text-rose-400" size={20} /> Avaliações da Barbearia
              </h3>
              <button onClick={() => setShowReviewsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <ReviewsSummary companyId={companyId} />
            </div>
            <div className="p-5 border-t border-white/5 shrink-0">
              <button onClick={() => setShowReviewsModal(false)} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE SERVIÇOS / POSTAGENS DO FEED
      ========================================= */}
      {showPostsModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ImageIcon className="text-sky-400" size={20} /> Nossos Serviços
            </h3>
            <button onClick={() => setShowPostsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto pb-10">
              {!Array.isArray(posts) || posts.length === 0 ? (
                <div className="col-span-full bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-16 text-center text-zinc-500 text-sm">
                  Nenhum corte publicado por essa barbearia ainda. 💈
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="group relative bg-black/40 backdrop-blur-sm border border-white/[0.06] rounded-3xl overflow-hidden flex flex-col h-full">
                    <div className="aspect-square w-full bg-zinc-900 relative overflow-hidden shrink-0">
                      <img src={post.image_url} alt="Trabalho" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    </div>
                    <div className="p-5 space-y-4 flex flex-col flex-1 justify-between bg-zinc-950/50">
                      <div>
                        {reviewsMap[post.id] && reviewsMap[post.id].length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">
                              {reviewsMap[post.id].length} Avaliações
                            </span>
                          </div>
                        )}
                        {post.caption && <p className="text-sm leading-relaxed text-zinc-300">{post.caption}</p>}
                      </div>
                      <button onClick={() => handleOpenRating(post.id)} className="w-full mt-4 py-3 bg-white/5 hover:bg-sky-600/20 text-xs font-bold tracking-[0.1em] uppercase text-zinc-300 hover:text-sky-400 border border-white/[0.08] rounded-xl transition-all duration-300">
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
          MODAL DE AVALIAÇÃO DO CORTE (Feed)
      ========================================= */}
      {ratingModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2 text-center">Avaliar Corte</h3>
            <p className="text-sm text-zinc-400 text-center mb-6">Deixe sua nota para este trabalho!</p>
            {ratingSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <span className="text-3xl">⭐</span>
                </div>
                <p className="text-emerald-400 font-bold">{ratingSuccess}</p>
                <button onClick={() => setRatingModal({ postId: 0, open: false })} className="mt-4 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition">
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
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: João" className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none transition" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRatingModal({ postId: 0, open: false })} className="flex-1 py-3.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl transition">
                    Cancelar
                  </button>
                  <button onClick={handleSubmitRating} disabled={submittingRating || selectedRating === 0} className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition">
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