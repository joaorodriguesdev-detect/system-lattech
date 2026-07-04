'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Users, UserPlus, X, UserCircle, DollarSign, Check, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface EquipeViewProps {
  token: string;
  team: any[];
  fetchTeam: () => void;
  servicesMap: Record<number, { name: string; price: number }>;
}

export default function EquipeView({ token, team, fetchTeam, servicesMap }: EquipeViewProps) {
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberPhone, setNewBarberPhone] = useState('');
  const [newBarberCommission, setNewBarberCommission] = useState('');
  const [creatingBarber, setCreatingBarber] = useState(false);
  const [error, setError] = useState('');

  // Estados para valor fixo de comissão por barbeiro (sincronizado com o backend)
  const [commissionValues, setCommissionValues] = useState<Record<number, string>>({});
  const [savingCommission, setSavingCommission] = useState<Record<number, boolean>>({});

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
          commission_value: parseFloat(newBarberCommission) || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao criar profissional');
      }

      setNewBarberName('');
      setNewBarberPhone('');
      setNewBarberCommission('');
      setShowTeamForm(false);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar profissional');
    } finally {
      setCreatingBarber(false);
    }
  };

  // ===== ATUALIZAÇÃO DE COMISSÃO VIA PATCH =====
  const handleSaveCommission = async (barberId: number) => {
    const rawValue = commissionValues[barberId] || '0';
    const numericValue = parseFloat(rawValue.replace(',', '.'));

    if (isNaN(numericValue) || numericValue < 0) return;

    setSavingCommission((prev) => ({ ...prev, [barberId]: true }));

    try {
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
      // Atualiza com o valor exato que veio do backend
      setCommissionValues((prev) => ({
        ...prev,
        [barberId]: result.commission_value.toFixed(2),
      }));
    } catch (err: any) {
      console.error('Erro ao salvar comissão:', err);
      // Reverte para o valor original do team
      const member = team.find((m) => m.id === barberId);
      if (member) {
        setCommissionValues((prev) => ({
          ...prev,
          [barberId]: (member.commission_value ?? 0).toFixed(2),
        }));
      }
    } finally {
      setSavingCommission((prev) => ({ ...prev, [barberId]: false }));
    }
  };

  const handleCommissionKeyDown = (e: React.KeyboardEvent, barberId: number) => {
    if (e.key === 'Enter') {
      handleSaveCommission(barberId);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <Users size={22} className="text-sky-400" /> Equipe e Comissões
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Gerencie o valor fixo por corte (R$) de cada profissional.</p>
          </div>
          <button
            onClick={() => setShowTeamForm(!showTeamForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {showTeamForm ? <X size={16} /> : <UserPlus size={16} />}
            {showTeamForm ? 'Cancelar' : 'Novo Profissional'}
          </button>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}
        {showTeamForm && (
          <form onSubmit={handleCreateBarber} className="bg-[#0A0A0A] border border-white/[0.05] rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">Nome</label>
                <input
                  type="text"
                  placeholder="Ex: João Barbeiro"
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">Telefone</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={newBarberPhone}
                  onChange={(e) => setNewBarberPhone(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">Valor Fixo por Corte (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 15.00"
                  value={newBarberCommission}
                  onChange={(e) => setNewBarberCommission(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:border-blue-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={creatingBarber}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
                {creatingBarber ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                {creatingBarber ? 'Criando...' : 'Adicionar'}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-rose-400 text-xs font-medium">{error}</p>
            )}
          </form>
        )}

        {/* LISTAGEM DE CARDS DA EQUIPE */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {team.map((member) => {
            const { cutsCount, revenue } = getBarberMetrics(member.id);
            const commissionValue = parseFloat(commissionValues[member.id] || '0');
            const isSaving = savingCommission[member.id];
            const totalCommission = cutsCount * commissionValue;

            return (
              <div key={member.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6">
                {/* CABEÇALHO DO CARD */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <UserCircle size={24} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{member.name}</h3>
                    <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{member.role}</p>
                  </div>
                </div>

                {/* MÉTRICAS */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#121214] rounded-2xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Receita Gerada</p>
                    <p className="text-lg font-bold text-sky-400">R$ {revenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#121214] rounded-2xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total a Pagar (Comissão)</p>
                    <p className="text-lg font-bold text-amber-400">R$ {totalCommission.toFixed(2)}</p>
                  </div>
                </div>

                {/* STATUS DE CORTES */}
                <div className="bg-[#121214] rounded-2xl p-4 mb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Serviços Finalizados</p>
                    <span className="text-white font-bold text-lg">{cutsCount}</span>
                  </div>
                </div>

                {/* VALOR FIXO POR CORTE — EDITÁVEL */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-bold mb-2 flex items-center gap-1">
                    <DollarSign size={12} /> Valor Fixo por Corte (R$)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionValues[member.id] || '0.00'}
                      onChange={(e) =>
                        setCommissionValues((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                      onBlur={() => handleSaveCommission(member.id)}
                      onKeyDown={(e) => handleCommissionKeyDown(e, member.id)}
                      className="flex-1 bg-[#121214] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white text-center focus:border-blue-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCommission(member.id)}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-2.5 transition flex items-center justify-center"
                      title="Salvar"
                    >
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                  </div>
                  {isSaving && (
                    <p className="text-[10px] text-sky-400 mt-1">Salvando...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MENSAGEM DE EQUIPE VAZIA */}
        {team.length === 0 && !showTeamForm && (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 font-medium">Nenhum profissional cadastrado.</p>
            <p className="text-zinc-600 text-sm mt-1">Clique em "Novo Profissional" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}