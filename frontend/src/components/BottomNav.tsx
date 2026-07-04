// frontend/src/components/BottomNav.tsx
'use client';
import { Home, Calendar, User } from 'lucide-react'; // Certifique-se de instalar lucide-react ou use ícones normais

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 h-16 flex items-center justify-around px-6 z-50 max-w-md mx-auto">
      <button className="flex flex-col items-center gap-1 text-blue-500">
        <Home size={22} />
        <span className="text-xs font-medium">Feed</span>
      </button>
      
      <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
        <Calendar size={22} />
        <span className="text-xs font-medium">Agendar</span>
      </button>
      
      <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
        <User size={22} />
        <span className="text-xs font-medium">Perfil</span>
      </button>
    </div>
  );
}