'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Star, X, Image as ImageIcon, Scissors, Zap, Check, Lock } from 'lucide-react';
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
      
      {/* Fundo preto sólido, com uma vinheta bem sutil só pra dar profundidade sem "gritar" */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#030303]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_60%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 pt-16 pb-10 flex flex-col items-center min-h-screen">
        
        {/* LOGO DA EMPRESA */}
        <div className="relative w-20 h-20 mb-5">
          <div className="relative w-full h-full rounded-2xl border border-white/10 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Scissors size={26} className="text-zinc-700" />
            )}
          </div>
        </div>

        {/* NOME DA EMPRESA - reduzido, mais discreto/premium */}
        <div className="text-center mb-9 space-y-2">
          <h1 className="text-2xl font-[family-name:var(--font-rye)] tracking-wide text-white">
            {companyName}
          </h1>
          <p className="text-zinc-600 text-[9px] font-semibold uppercase tracking-[0.25em]">
            Cabelo, Barba & Bigode !
          </p>
        </div>

        {/* MENU DE OPÇÕES - botões menores, sem glow, mais espaçados */}
        <div className="w-full space-y-4">
          
          {/* CTA principal com cor invertida (fundo claro) pra se destacar sem neon */}
          <Link 
            href="/agendamento"
            className="w-full group flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white hover:bg-zinc-200 transition-all duration-300 active:scale-[0.98]"
          >
            <CalendarDays size={18} className="text-black" />
            <span className="font-semibold text-black text-sm tracking-wide">Agendar Horário</span>
          </Link>

          <button 
            onClick={() => setShowPostsModal(true)}
            className="w-full group flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all duration-300 active:scale-[0.98]"
          >
            <ImageIcon size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-zinc-300 text-sm group-hover:text-white transition-colors">Nossos serviços</span>
          </button>

          <button 
            onClick={() => setShowLocationModal(true)}
            className="w-full group flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all duration-300 active:scale-[0.98]"
          >
            <MapPin size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-zinc-300 text-sm group-hover:text-white transition-colors">Nossa localização</span>
          </button>

          <button 
            onClick={() => setShowReviewsModal(true)}
            className="w-full group flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all duration-300 active:scale-[0.98]"
          >
            <Star size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-zinc-300 text-sm group-hover:text-white transition-colors">Avaliações</span>
          </button>

        </div>

        {/* PRÉVIA DO PORTFÓLIO - preenche o espaço com trabalho real, reforça credibilidade */}
        {posts.length > 0 && (
          <div className="w-full mt-10">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Nosso Trabalho</span>
              <button
                onClick={() => setShowPostsModal(true)}
                className="text-zinc-500 hover:text-white text-[10px] font-semibold uppercase tracking-wide transition-colors"
              >
                Ver tudo
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-6 px-6">
              {posts.slice(0, 6).map((post) => (
                <button
                  key={post.id}
                  onClick={() => setShowPostsModal(true)}
                  className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0A0A0A]"
                >
                  <img src={post.image_url} alt="Trabalho" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RODAPÉ (FOOTER) REFORMULADO */}
        <footer className="mt-auto pt-14 flex flex-col items-center justify-center gap-3.5">
          
          {/* SVG Nativo do Instagram para evitar erro de exportação do lucide-react antigo */}
          <div className="flex items-center gap-2.5">
            <a href="https://www.instagram.com/lattechapp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-all" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>

            {/* 🔒 Acesso discreto ao painel administrativo da barbearia */}
            <Link href="/admin" className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-all" aria-label="Acesso administrativo">
              <Lock size={14} />
            </Link>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500">Desenvolvido por</span>
            <a href="https://lattech.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
              <Zap size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest">LATTECH</span>
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