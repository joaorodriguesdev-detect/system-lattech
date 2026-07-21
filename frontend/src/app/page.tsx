'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  // RENDERIZAÇÃO DA PÁGINA PRINCIPAL
  // ==========================================
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center">
      
      {/* Background com Imagem e Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-start justify-center">
        <div className="absolute inset-0 bg-[url('/imagens/fundoapp.png')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/30 via-[#050505]/70 to-[#050505]"></div>
        <div className="w-[400px] h-[400px] bg-blue-600/30 blur-[120px] rounded-full mt-[-100px] absolute"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 pt-16 pb-10 flex flex-col items-center min-h-screen">
        
        {/* LOGO DA EMPRESA */}
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl"></div>
          <div className="relative w-full h-full rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Scissors size={36} className="text-zinc-700" />
            )}
          </div>
        </div>

        {/* NOME DA EMPRESA COM FONTE VINTAGE (RYE) */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl font-[family-name:var(--font-rye)] tracking-widest text-white drop-shadow-md">
            {companyName}
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] drop-shadow-sm">
            Cabelo, Barba & Bigode !
          </p>
        </div>

        {/* MENU DE OPÇÕES */}
        <div className="w-full space-y-3.5">
          
          {/* BOTÃO CORRIGIDO PARA USAR <Link> DO NEXT.JS */}
          <Link 
            href="/agendamento"
            className="w-full group flex items-center justify-between px-5 py-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 backdrop-blur-md transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(59,130,246,0.1)]"
          >
            <div className="flex items-center gap-3.5">
              <CalendarDays size={22} className="text-blue-400 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-bold text-blue-400 text-base tracking-wide">Agendar Horário</span>
            </div>
            <ChevronRight className="text-blue-400/60 group-hover:text-blue-400 transition-colors" size={20} />
          </Link>

          <button 
            onClick={() => setShowPostsModal(true)}
            className="w-full group flex items-center justify-between px-5 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              <ImageIcon size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
              <span className="font-semibold text-zinc-200 text-base group-hover:text-white transition-colors">Nossos serviços</span>
            </div>
            <ChevronRight className="text-zinc-500 group-hover:text-zinc-300 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowLocationModal(true)}
            className="w-full group flex items-center justify-between px-5 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              <MapPin size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
              <span className="font-semibold text-zinc-200 text-base group-hover:text-white transition-colors">Nossa localização</span>
            </div>
            <ChevronRight className="text-zinc-500 group-hover:text-zinc-300 transition-colors" size={20} />
          </button>

          <button 
            onClick={() => setShowReviewsModal(true)}
            className="w-full group flex items-center justify-between px-5 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              <Star size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
              <span className="font-semibold text-zinc-200 text-base group-hover:text-white transition-colors">Avaliações</span>
            </div>
            <ChevronRight className="text-zinc-500 group-hover:text-zinc-300 transition-colors" size={20} />
          </button>

        </div>

        {/* RODAPÉ (FOOTER) REFORMULADO */}
        <footer className="mt-auto pt-16 flex flex-col items-center justify-center gap-4">
          
          {/* SVG Nativo do Instagram para evitar erro de exportação do lucide-react antigo */}
          <a href="https://www.instagram.com/lattechapp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </a>

          <div className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 text-zinc-400">
               <span className="text-[10px] uppercase tracking-widest drop-shadow-md">Desenvolvido por</span>
            </div>
            <a href="https://lattech.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors">
              <Zap size={14} />
              <span className="text-xs font-bold uppercase tracking-widest drop-shadow-md">LATTECH</span>
            </a>
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
              <button onClick={() => setShowLocationModal(false)} className="w-full py-3.5 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-[#18181b] text-white font-bold text-sm rounded-xl transition">
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
              <button onClick={() => setShowReviewsModal(false)} className="w-full py-3.5 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-[#18181b] text-white font-bold text-sm rounded-xl transition">
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}