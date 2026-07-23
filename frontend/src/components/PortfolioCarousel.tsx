'use client';

import { useState, useEffect } from 'react';

interface CarouselPost {
  id: number;
  image_url: string;
  caption?: string | null;
}

interface PortfolioCarouselProps {
  posts: CarouselPost[];
  onOpenAll: () => void;
}

export default function PortfolioCarousel({ posts, onOpenAll }: PortfolioCarouselProps) {
  const [index, setIndex] = useState(0);

  // Limita a 10 fotos no carrossel (o resto fica só no modal "Ver tudo",
  // evita ciclo longo demais e mantém a leitura dos pontinhos simples)
  const items = posts.slice(0, 10);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const getItem = (offset: number) => {
    const i = (index + offset + items.length) % items.length;
    return items[i];
  };

  const prevItem = items.length > 1 ? getItem(-1) : null;
  const currentItem = getItem(0);
  const nextItem = items.length > 1 ? getItem(1) : null;

  return (
    <div className="w-full mt-10">
      <div className="flex items-center justify-between mb-4 px-0.5">
        <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Nosso Trabalho</span>
        <button
          onClick={onOpenAll}
          className="text-zinc-500 hover:text-white text-[10px] font-semibold uppercase tracking-wide transition-colors"
        >
          Ver tudo
        </button>
      </div>

      {/* CARROSSEL COVERFLOW: anterior pequena à esquerda, atual grande no centro, próxima pequena à direita */}
      <div className="flex items-center justify-center gap-3 h-40">
        {prevItem && (
          <button
            key={`prev-${prevItem.id}`}
            onClick={onOpenAll}
            className="shrink-0 w-14 h-24 rounded-xl overflow-hidden border border-white/[0.06] opacity-40 scale-95 transition-all duration-500"
          >
            <img src={prevItem.image_url} alt="" className="w-full h-full object-cover" />
          </button>
        )}

        <button
          key={`current-${currentItem.id}`}
          onClick={onOpenAll}
          className="shrink-0 z-10 w-28 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
        >
          <img src={currentItem.image_url} alt="Trabalho" className="w-full h-full object-cover" />
        </button>

        {nextItem && (
          <button
            key={`next-${nextItem.id}`}
            onClick={onOpenAll}
            className="shrink-0 w-14 h-24 rounded-xl overflow-hidden border border-white/[0.06] opacity-40 scale-95 transition-all duration-500"
          >
            <img src={nextItem.image_url} alt="" className="w-full h-full object-cover" />
          </button>
        )}
      </div>

      {/* Indicadores (pontinhos) */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? 'w-4 bg-white' : 'w-1 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
