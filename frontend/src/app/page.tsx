'use client';
import { useEffect, useState } from 'react';
import { Camera, Zap } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import ImageSlider from '../components/ImageSlider';
import ReviewsSummary from '../components/ReviewsSummary';
import LocationMap from '../components/LocationMap';
import FloatingBookingBtn from '../components/FloatingBookingBtn';
import ProductCarousel from '../components/ProductCarousel';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsMap, setReviewsMap] = useState<Record<number, PostReview[]>>({});
  
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string>('Carregando...');
  const [companyStatus, setCompanyStatus] = useState<'trial' | 'active' | 'suspended' | 'unknown'>('unknown');

  // Guarda a Logo da Barbearia
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Novos estados para guardar o endereço e o mapa
  const [companyAddress, setCompanyAddress] = useState<string | null>(null);
  const [companyMapUrl, setCompanyMapUrl] = useState<string | null>(null);

  const [ratingModal, setRatingModal] = useState<{ postId: number; open: boolean }>({ postId: 0, open: false });
  const [selectedRating, setSelectedRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');

  useEffect(() => {
    const hostname = window.location.hostname;

    // 🔥 TRAVA DE PRIORIDADE: Redireciona o domínio administrador direto para o painel 🔥
    // Impede que o sistema tente buscar uma barbearia chamada "app"
    if (hostname === 'app.lattech.com.br' || hostname === 'www.lattech.com.br') {
      window.location.replace('/superadmin');
      return; // Aborta o resto do código
    }

    let sub = 'mariobarber'; // Fallback de segurança
    
    // Se estiver em produção no seu domínio
    if (hostname.includes('lattech.com.br')) {
      const parts = hostname.split('.');
      // Se for barbearia.lattech.com.br, pega o "barbearia"
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
        sub = parts[0];
      }
    } 
    // Mantém funcionando para quando você rodar no seu PC
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

  const statusLower = companyStatus.toLowerCase();
  
  if (statusLower !== 'unknown' && statusLower !== 'active' && statusLower !== 'trial') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center bg-[#0A0A0A] border border-rose-500/20 rounded-3xl p-8 space-y-4">
          <h1 className="text-3xl font-bold text-rose-400">Acesso temporariamente indisponível</h1>
          <p className="text-zinc-300 leading-7">
            Sistema temporariamente indisponível.
            <br />
            Solicite ao administrador para regularizar o acesso.
          </p>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Status atual: {companyStatus}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white antialiased flex items-center justify-center bg-[#050505] relative overflow-hidden">
        
        {/* Glow Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-violet-600 opacity-10 blur-[120px]"></div>
        </div>

        <main className="w-full max-w-[480px] lg:max-w-6xl mx-auto relative z-10 flex flex-col min-h-screen shadow-2xl bg-[#050505]/50 md:bg-transparent">
          
          <header className="bg-black/40 backdrop-blur-md border-b border-white/[0.04] h-20 flex items-center px-4 shrink-0 z-40 lg:rounded-b-3xl relative">
            <div className="w-full flex items-center justify-between h-full relative">
              
              <div className="flex items-center h-full py-2 z-10 w-1/3">
                {companyLogo && (
                  <img 
                    src={companyLogo} 
                    alt={`Logo`} 
                    className="h-full w-auto max-w-[120px] object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-transform duration-300 hover:scale-105"
                  />
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <h1 className="font-unifraktur text-[26px] sm:text-[30px] tracking-[0.03em] leading-none text-center">
                  <span className="bg-gradient-to-b from-violet-200 via-violet-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(139,92,246,0.35)]">
                    {companyName}
                  </span>
                </h1>
              </div>

              <div className="flex justify-end items-center gap-2 z-10 w-1/3">
                <span className="relative flex w-2.5 h-2.5 sm:w-3 sm:h-3">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex w-full h-full rounded-full bg-emerald-400" />
                </span>
              </div>

            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8 lg:p-10 pb-28 scrollbar-none scroll-smooth">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-8">
              <div className="lg:col-span-7 flex flex-col gap-6 md:gap-8">
                
                <ImageSlider companyId={companyId} />
                
                <div className="hidden lg:block">
                  <ProductCarousel companyId={companyId} />
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-6 md:gap-8">
                <ReviewsSummary companyId={companyId} />
                
                <LocationMap address={companyAddress} mapUrl={companyMapUrl} />
              </div>
            </div>

            <FloatingBookingBtn />

            <div className="block lg:hidden mt-8 mb-6">
              <ProductCarousel companyId={companyId} />
            </div>

            <section className="space-y-6 mt-6 lg:mt-10">
              <div className="flex items-center justify-between px-1 border-b border-white/[0.05] pb-4">
                <div className="flex items-center gap-3 text-zinc-300 text-xs font-bold uppercase tracking-[0.2em]">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Camera size={16} className="text-blue-400" />
                  </div>
                  <span>Trabalhos Recentes</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
                    <p className="text-center text-zinc-600 text-sm">Carregando portfólio...</p>
                  </div>
                ) : !Array.isArray(posts) || posts.length === 0 ? (
                  <div className="col-span-full bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-16 text-center text-zinc-500 text-sm">
                    Nenhum corte publicado por essa barbearia ainda. 💈
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="group relative bg-black/40 backdrop-blur-sm border border-white/[0.06] rounded-3xl overflow-hidden hover:border-violet-500/30 transition-all duration-500 flex flex-col h-full">
                      <div className="aspect-square w-full bg-zinc-900 relative overflow-hidden shrink-0">
                        <img src={post.image_url} alt="Trabalho" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      </div>
                      <div className="p-5 space-y-4 flex flex-col flex-1 justify-between bg-zinc-950/50">
                        <div>
                          {reviewsMap[post.id] && reviewsMap[post.id].length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 bg-violet-500/10 px-2 py-1 rounded-md">
                                {reviewsMap[post.id].length} Avaliações
                              </span>
                            </div>
                          )}
                          {post.caption && <p className="text-sm leading-relaxed text-zinc-300">{post.caption}</p>}
                        </div>
                        <button onClick={() => handleOpenRating(post.id)} className="w-full mt-4 py-3.5 bg-white/5 hover:bg-violet-600 text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-300 hover:text-white border border-white/[0.08] rounded-2xl transition-all duration-300">
                          
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <footer className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col items-center justify-center gap-3 pb-4">
              <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                  <Zap size={10} className="text-white" />
                </div>
                <span className="text-sm font-bold text-zinc-300 tracking-wider">LAT System</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium tracking-[0.2em] uppercase">
                Desenvolvido por{' '}
                <a 
                  href="https://lattech.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
                >
                  LATTECH
                </a>
              </p>
            </footer>
          </div>
      </main>
    </div>
  );
}