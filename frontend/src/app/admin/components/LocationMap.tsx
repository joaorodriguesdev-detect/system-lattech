'use client';
import { MapPin } from 'lucide-react';

interface LocationMapProps {
  address?: string | null;
  mapUrl?: string | null;
}

export default function LocationMap({ address, mapUrl }: LocationMapProps) {
  // Se a barbearia não cadastrou o link do mapa, o bloco fica oculto
  if (!mapUrl) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
        <MapPin size={14} className="text-blue-500" />
        <span>{address || "Nossa Localização"}</span>
      </div>
      <div className="relative overflow-hidden w-full aspect-video bg-black rounded-2xl border border-white/[0.06] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] hover:border-white/[0.14] active:scale-[0.99]">
        <iframe 
          src={mapUrl} 
          className="w-full h-full border-none"
          allowFullScreen={false} 
          loading="lazy"
        />
      </div>
    </section>
  );
}