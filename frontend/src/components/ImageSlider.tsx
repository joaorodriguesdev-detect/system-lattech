'use client';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

// Imagens de fallback estáticas (3 imagens)
const FALLBACK_IMAGES = [
  '/modalimagens/md1.avif',
  '/modalimagens/md2.avif',
  '/modalimagens/md3.avif',
];

interface Banner {
  id: number;
  company_id: number;
  image_url: string;
  order: number;
  created_at: string;
}

export default function ImageSlider({ companyId }: { companyId?: number | null }) {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const images = banners.length > 0
    ? banners.map((b) => b.image_url)
    : FALLBACK_IMAGES;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchBanners = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/system/companies/${companyId}/banners`);
        if (res.ok) {
          const data: Banner[] = await res.json();
          setBanners(data);
        }
      } catch (err) {
        console.error('Erro ao buscar banners', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [companyId]);

  useEffect(() => {
    if (loading || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [loading, images.length]);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-[28px] h-[400px] md:h-[500px] flex items-center justify-center border border-white/[0.08] bg-zinc-900">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] h-[400px] md:h-[500px] flex items-center justify-center border border-white/[0.08] bg-black">
      {images.map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Slide ${index + 1}`}
          // 🔥 A MÁGICA: object-cover preenche a tela, object-top foca no topo (rosto/cabelo) 🔥
          className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out"
          style={{ opacity: index === current ? 1 : 0, zIndex: index === current ? 10 : 0 }}
        />
      ))}

      {/* Indicadores inferiores */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.8)] ${
              index === current
                ? 'bg-white w-5'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}