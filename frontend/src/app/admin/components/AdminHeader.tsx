'use client';

import { Menu, Clock, Star } from 'lucide-react';

interface AdminHeaderProps {
  activeTab: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userName: string;
  pendingAppointmentsCount: number;
  pendingReviewCount: number;
  onOpenPendingModal: () => void;
  onOpenReviewModal: () => void;
}

const TAB_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  agendamentos: 'Agendamentos',
  equipe: 'Equipe & Comissões',
  vitrine: 'Vitrine de Produtos',
  postagens: 'Portfólio',
  avaliacoes: 'Avaliações',
  atendimentos: 'Atendimentos',
  servicos: 'Serviços',
  configuracoes: 'Configurações',
};

export default function AdminHeader({
  activeTab,
  sidebarOpen,
  setSidebarOpen,
  userName,
  pendingAppointmentsCount,
  pendingReviewCount,
  onOpenPendingModal,
  onOpenReviewModal,
}: AdminHeaderProps) {
  const tabLabel = TAB_LABEL[activeTab] || 'Admin';

  return (
    <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.04] sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold tracking-wide text-zinc-100">{tabLabel}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Pendentes */}
          <button
            onClick={onOpenPendingModal}
            className="relative flex items-center justify-center w-10 h-10 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-full transition"
          >
            <Clock size={16} className="text-zinc-400" />
            {pendingAppointmentsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative flex justify-center items-center rounded-full h-4 w-4 bg-sky-500 text-[9px] font-bold text-white">
                  {pendingAppointmentsCount}
                </span>
              </span>
            )}
          </button>

          {/* Botão Avaliações Pendentes */}
          <button
            onClick={onOpenReviewModal}
            className="relative flex items-center justify-center w-10 h-10 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-full transition"
            title="Avaliações Pendentes"
          >
            <Star size={16} className="text-zinc-400" />
            {pendingReviewCount > 0 && (
              <span className="absolute -top-1 -right-1 flex justify-center items-center rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white">
                {pendingReviewCount}
              </span>
            )}
          </button>

          {/* Avatar + Nome */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/[0.05] ml-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-zinc-300">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}