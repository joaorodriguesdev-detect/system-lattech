'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  tag: string;
  image_url: string;
  active: boolean;
}

interface Props {
  companyId: number | null;
}

export default function ProductCarousel({ companyId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/products/?company_id=${companyId}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('[ProductCarousel] Erro ao buscar produtos:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [companyId]);

  // Enquanto carrega, não mostra nada
  if (loading) return null;
  // Se não tem produtos, esconde a sessão inteira
  if (products.length === 0) return null;

  return (
    <section className="space-y-4 py-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-zinc-300 text-[11px] font-semibold uppercase tracking-[0.2em]">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <ShoppingBag size={12} className="text-violet-400" />
          </div>
          <span>Vitrine de Produtos</span>
        </div>
        <button className="text-[10px] text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-violet-300 transition">
          Ver todos <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory px-1">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="snap-start shrink-0 w-44 bg-[#0A0A0A] border border-white/[0.05] rounded-3xl p-3 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-500"
          >
            {/* ── Imagem real do produto (via upload do admin) ── */}
            <div className="w-full h-32 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
              {prod.image_url ? (
                <img
                  src={prod.image_url}
                  alt={prod.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Sparkles size={28} className="text-violet-400 opacity-50" />
              )}

              {prod.tag && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                  <span className="text-[8px] font-bold text-white uppercase tracking-widest">
                    {prod.tag}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-bold text-zinc-100 leading-tight">{prod.name}</h3>
              <p className="text-[10px] text-zinc-500 line-clamp-2">
                {prod.description || 'Sem descrição'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <span className="text-sm font-extrabold text-white">
                R$ {Number(prod.price).toFixed(2)}
              </span>
              <button className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}