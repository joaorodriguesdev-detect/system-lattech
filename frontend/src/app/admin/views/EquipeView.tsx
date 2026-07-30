'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Users, UserPlus, X, UserCircle, Check, Loader2, DollarSign, Settings2, ShieldCheck, User } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface EquipeViewProps {
  token: string;
  team: any[];
  fetchTeam: () => void;
  servicesMap: Record<number, { name: string; price: number }>;
}

export default function EquipeView({ token, team, fetchTeam, servicesMap }: EquipeViewProps) {
  // Modal de Novo Barbeiro
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberPhone, setNewBarberPhone] = useState('');
  const [newBarberCommission, setNewBarberCommission] = useState('');
  const [creatingBarber, setCreatingBarber] = useState(false);
  const [error, setError] = useState('');

  // Estados de comissão e do Modal de Comissão
  const [commissionValues, setCommissionValues] = useState<Record<number, string>>({});
  const [activeModal, setActiveModal] = useState<{ isOpen: boolean; barberId: number | null }>({ isOpen: false, barberId: null });
  const [isSavingCommission, setIsSavingCommission] = useState(false);

  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);

  // Sincroniza os commission_values do backend com o estado local
  useEffect(() => {
    const vals: Record<number, string> = {};
    team.forEach((member) => {
      vals[member.id] = (member.commission_value ?? 0).toFixed(2);
    });
    setCommissionValues((prev) => ({ ...prev, ...vals }));
  }, [team]);

  useEffect(() => {
    const fetchCompletedAppointments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompletedAppointments((data || []).filter((a: any) => a.status === 'completed'));
        }
      } catch (e) { console.error("Erro ao buscar atendimentos", e); }
    };
    fetchCompletedAppointments();
  }, [token]);

  const getBarberMetrics = (barberId: number) => {
    const cuts = completedAppointments.filter(a => a.barber_id === barberId);
    const revenue = cuts.reduce((acc, curr) => acc + (servicesMap[curr.service_id]?.price || 0), 0);
    return { cutsCount: cuts.length, revenue };
  };

  // ===== CRIAÇÃO DE NOVO PROFISSIONAL =====
  const handleCreateBarber = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim() || !newBarberPhone.trim()) {
      setError('Preencha nome e telefone do profissional.');
      return;
    }
    setCreatingBarber(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/barbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newBarberName.trim(),
          phone: newBarberPhone.trim(),
          commission_value: parseFloat(newBarberCommission.replace(',', '.')) || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao criar profissional');
      }

      setNewBarberName('');
      setNewBarberPhone('');
      setNewBarberCommission('');
      setShowTeamModal(false);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar profissional');
    } finally {
      setCreatingBarber(false);
    }
  };

  const closeTeamModal = () => {
    setShowTeamModal(false);
    setNewBarberName('');
    setNewBarberPhone('');
    setNewBarberCommission('');
    setError('');
  };

  // ===== ATUALIZAÇÃO DE COMISSÃO VIA MODAL =====
  const handleSaveCommission = async () => {
    if (activeModal.barberId === null) return;
    
    const barberId = activeModal.barberId;
    const rawValue = commissionValues[barberId] || '0';
    
    // Substitui vírgula por ponto para o Pydantic aceitar
    const numericValue = parseFloat(rawValue.replace(',', '.'));

    if (isNaN(numericValue) || numericValue < 0) {
      alert("Por favor, insira um valor numérico válido (ex: 15.00 ou 15,00).");
      return;
    }

    setIsSavingCommission(true);

    try {
      // O endpoint PATCH substitui o valor atual pelo novo no backend
      const res = await fetch(`${API_BASE_URL}/admin/barbers/${barberId}/commission`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commission_value: numericValue }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao salvar comissão');
      }

      const result = await res.json();
      
      // Atualiza o estado visual com o valor formatado novo
      setCommissionValues((prev) => ({
        ...prev,
        [barberId]: result.commission_value.toFixed(2),
      }));
      
      setActiveModal({ isOpen: false, barberId: null });
      await fetchTeam(); 
    } catch (err: any) {
      console.error('Erro ao salvar comissão:', err);
      alert('Erro ao salvar o valor da comissão.');
    } finally {
      setIsSavingCommission(false);
    }
  };

  const handleCancelModal = () => {
    if (activeModal.barberId !== null) {
      const member = team.find((m) => m.id === activeModal.barberId);
      if (member) {
        setCommissionValues((prev) => ({
          ...prev,
          [member.id]: (member.commission_value ?? 0).toFixed(2),
        }));
      }
    }
    setActiveModal({ isOpen: false, barberId: null });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <div className="space-y-6">
        
        {/* HEADER DA TELA */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users size={24} className="text-blue-500" /> Equipe e Comissões
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Gerencie a sua equipe de barbeiros e seus ganhos.</p>
          </div>
          <button
            onClick={() => setShowTeamModal(true)}
            className="w-full sm:w-auto self-start flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-[0.98]"
          >
            <UserPlus size={18} /> Novo Profissional
          </button>
        </div>

        {/* LISTAGEM DE CARDS DA EQUIPE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {team.map((member) => {
            const { cutsCount, revenue } = getBarberMetrics(member.id);
            const currentCommVal = parseFloat((commissionValues[member.id] || '0').replace(',', '.'));
            const totalCommission = cutsCount * currentCommVal;
            const hasCommission = currentCommVal > 0;

            return (
              <div key={member.id} className="bg-[#0A0A0A] border border-white/[0.06] hover:border-white/10 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between">
                <div>
                  {/* CABEÇALHO DO CARD */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                      <UserCircle size={24} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{member.name}</h3>
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-1">
                        {member.role === 'admin' ? <ShieldCheck size={10} className="text-amber-500"/> : <Scissors size={10} className="text-zinc-500"/>}
                        {member.role === 'admin' ? 'Administrador' : 'Barbeiro'}
                      </p>
                    </div>
                  </div>

                  {/* MÉTRICAS DE ATENDIMENTO */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-4">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Receita Gerada</p>
                      <p className="text-xl font-extrabold text-blue-400">R$ {revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-4">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Comissão a Pagar</p>
                      <p className="text-xl font-extrabold text-amber-500">R$ {totalCommission.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* STATUS DE SERVIÇOS & BOTÃO DE COMISSÃO (AJUSTADO PARA MOBILE) */}
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Serviços Finalizados</p>
                      <p className="text-white font-bold text-base">{cutsCount} {cutsCount === 1 ? 'concluído' : 'concluídos'}</p>
                    </div>
                    
                    <button 
                      onClick={() => setActiveModal({ isOpen: true, barberId: member.id })}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white text-xs font-bold px-4 py-3 sm:py-2.5 rounded-xl transition-all"
                    >
                      <Settings2 size={14} /> 
                      {hasCommission ? 'Editar Comissão' : 'Adicionar Comissão'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MENSAGEM DE EQUIPE VAZIA */}
        {team.length === 0 && (
          <div className="text-center py-20 bg-[#0A0A0A] border border-white/5 rounded-3xl border-dashed">
            <Users size={48} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-zinc-400 font-medium text-lg">Sua equipe ainda está vazia.</p>
            <p className="text-zinc-500 text-sm mt-1">Clique no botão "Novo Profissional" acima para cadastrar barbeiros.</p>
          </div>
        )}
      </div>

      {/* =========================================
          MODAL DE CADASTRO DE PROFISSIONAL
      ========================================= */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#0B0B0B]">
              <h3 className="font-bold text-base flex items-center gap-2 text-white">
                <UserPlus className="text-blue-500" size={18} /> Novo Profissional
              </h3>
              <button onClick={closeTeamModal} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleCreateBarber} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1.5">Nome do Profissional</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Barbeiro"
                    value={newBarberName}
                    onChange={(e) => setNewBarberName(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1.5">Telefone</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={newBarberPhone}
                    onChange={(e) => setNewBarberPhone(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1.5">Valor da Comissão por Corte (R$)</label>
                  <div className="relative">
                     <span className="absolute left-4 top-3.5 text-zinc-500 font-bold text-sm">R$</span>
                     <input
                       type="text"
                       placeholder="0.00"
                       value={newBarberCommission}
                       onChange={(e) => setNewBarberCommission(e.target.value)}
                       className="w-full bg-[#121214] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                     />
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mt-4">
                     <p className="text-rose-400 text-xs font-bold text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
                  <button 
                    type="button"
                    onClick={closeTeamModal}
                    className="flex-1 py-3.5 bg-[#121214] border border-white/5 hover:bg-[#18181b] text-zinc-300 font-bold text-sm rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={creatingBarber}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition"
                  >
                    {creatingBarber ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {creatingBarber ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE CONFIGURAÇÃO DE COMISSÃO
      ========================================= */}
      {activeModal.isOpen && activeModal.barberId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#0B0B0B]">
              <h3 className="font-bold text-base flex items-center gap-2 text-white">
                <DollarSign className="text-amber-500" size={18} /> Definir Comissão
              </h3>
              <button onClick={handleCancelModal} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-sm text-zinc-400 mb-4">
                  Defina o valor fixo (em Reais) que{' '}
                  <span className="text-white font-bold">
                    {team.find(m => m.id === activeModal.barberId)?.name}
                  </span>{' '}
                  receberá por cada serviço finalizado.
                </p>
                
                <div className="relative max-w-[200px] mx-auto">
                  <span className="absolute left-4 top-4 text-zinc-500 font-bold">R$</span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="0.00"
                    value={commissionValues[activeModal.barberId]}
                    onChange={(e) =>
                      setCommissionValues((prev) => ({
                        ...prev,
                        [activeModal.barberId!]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCommission()}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl pl-10 pr-4 py-4 text-xl font-extrabold text-white focus:border-amber-500 outline-none transition text-center"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleCancelModal}
                  className="flex-1 py-3.5 bg-[#121214] border border-white/5 hover:bg-[#18181b] text-zinc-300 font-bold text-sm rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCommission}
                  disabled={isSavingCommission}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition"
                >
                  {isSavingCommission ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}