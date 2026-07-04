'use client';
import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FloatingBookingBtn() {
  const router = useRouter();

  return (
    // Removido o fixed. Agora ele respeita o fluxo e o tamanho da coluna.
    // 'w-full' faz ele ocupar a largura exata do container pai.
    <div className="w-full">
      <button
        onClick={() => router.push('/agendamento')}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95"
      >
        <CalendarDays size={16} />
        Faça seu Agendamento
      </button>
    </div>
  );
}