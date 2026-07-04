import { 
    LayoutDashboard, CalendarCheck, Users, ShoppingBag, 
    MessageSquare, Star, BarChart, Scissors, Settings, LogOut, X 
  } from 'lucide-react';
  import { useRouter } from 'next/navigation';
  
  const TAB_LABEL: Record<AdminTab, string> = {
    dashboard: 'Dashboard', agendamentos: 'Agendamentos', equipe: 'Equipe & Comissões',
    vitrine: 'Vitrine de Produtos', postagens: 'Portfólio', avaliacoes: 'Avaliações',
    atendimentos: 'Atendimentos', servicos: 'Serviços', configuracoes: 'Configurações',
  };
  
  export type AdminTab = 'dashboard' | 'agendamentos' | 'equipe' | 'vitrine' | 'postagens' | 'avaliacoes' | 'atendimentos' | 'servicos' | 'configuracoes';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }: AdminSidebarProps) {
    const router = useRouter();
  
    const handleLogout = () => {
      localStorage.clear();
      router.push('/login');
    };
  
    return (
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          w-64 bg-[#0A0A0A] border-r border-white/[0.04] fixed inset-y-0 left-0 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:z-30
        `}>
          <div className="px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-white text-xl font-extrabold tracking-wide flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.6)]"></div>
               LAT System
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Admin Workspace</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 hover:text-white transition p-1">
              <X size={18} />
            </button>
          </div>
  
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest px-3 mb-3">Menu Principal</p>
            {(Object.keys(TAB_LABEL)).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as AdminTab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 text-left
                  ${activeTab === tab ? 'bg-blue-500/10 text-sky-400 font-medium' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]'}`}
              >
                {tab === 'dashboard' && <LayoutDashboard size={18} />}
                {tab === 'agendamentos' && <CalendarCheck size={18} />}
                {tab === 'equipe' && <Users size={18} />}
                {tab === 'vitrine' && <ShoppingBag size={18} />}
                {tab === 'postagens' && <MessageSquare size={18} />}
                {tab === 'avaliacoes' && <Star size={18} />}
                {tab === 'atendimentos' && <BarChart size={18} />}
                {tab === 'servicos' && <Scissors size={18} />}
                {tab === 'configuracoes' && <Settings size={18} />}
                {TAB_LABEL[tab as AdminTab]}
              </button>
            ))}
          </nav>
  
          <div className="p-4">
            <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        </aside>
      </>
    );
  }