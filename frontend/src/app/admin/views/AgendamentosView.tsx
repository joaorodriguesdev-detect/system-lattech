'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, Ban, Calendar, Scissors } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface AgendamentosViewProps {
  token: string;
  team: any[];
  servicesMap: Record<number, { name: string; price: number }>;
}

export default function AgendamentosView({ token, team, servicesMap }: AgendamentosViewProps) {
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [loadingAllAppointments, setLoadingAllAppointments] = useState(true);
  const [appointmentFilter, setAppointmentFilter] = useState<'todos' | 'mes'>('mes');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchAllAppointments = async () => {
      setLoadingAllAppointments(true);
      try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllAppointments(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Erro ao buscar agendamentos", e);
      } finally {
        setLoadingAllAppointments(false);
      }
    };
    fetchAllAppointments();
  }, [token]);

  const handleAssignBarber = async (appId: number, barberId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/appointments/${appId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barber_id: barberId })
      });
      if (res.ok) {
        setAllAppointments(prev => prev.map(a => a.id === appId ? { ...a, barber_id: barberId } : a));
      }
    } catch {
      alert("Erro ao transferir agendamento");
    }
  };

  const handleChangeStatus = async (appointmentId: number, newStatus: 'completed' | 'canceled') => {
    setProcessingId(appointmentId);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAllAppointments((prev) => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
      } else {
        alert('Erro ao atualizar status');
      }
    } catch {
      alert('Erro de conexão ao atualizar status');
    } finally {
      setProcessingId(null);
    }
  };

  // 🔥 Filtro de agendamentos
  const filteredAppointments = allAppointments.filter((a) => {
    if (appointmentFilter === 'mes') {
      return a.appointment_date.startsWith(selectedMonth);
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Agendamentos</h2>
          <p className="text-zinc-500 text-sm">Gerencie o fluxo da sua barbearia.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0B0B0B] p-1 rounded-xl border border-white/5">
          {['mes', 'todos'].map((filter) => (
            <button
              key={filter}
              onClick={() => setAppointmentFilter(filter as any)}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                appointmentFilter === filter ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter === 'mes' ? 'Este Mês' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* 🔥 DE VOLTA: Input de Mês */}
      {appointmentFilter === 'mes' && (
        <div className="flex justify-end animate-in fade-in duration-300">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
          />
        </div>
      )}

      {/* Lista de Cards */}
      {loadingAllAppointments ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        // 🔥 DE VOLTA: Empty State Bonito
        <div className="flex flex-col items-center justify-center py-20 bg-[#0B0B0B] border border-white/[0.06] rounded-2xl border-dashed">
          <Calendar size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 font-medium">Nenhum agendamento encontrado para este período.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAppointments.map((app) => {
            const date = new Date(app.appointment_date);
            const nome = app.notes?.split('Cliente:')[1]?.split('-')[0]?.trim() || "Cliente";
            
            return (
              <div key={app.id} className="group bg-[#0B0B0B] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-black">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Info Cliente */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-lg text-zinc-400">
                      {nome.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{nome}</h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Scissors size={12}/> {servicesMap[app.service_id]?.name || 'Serviço'}
                      </p>
                    </div>
                  </div>

                  {/* Data/Hora */}
                  <div className="flex items-center gap-2 text-sm text-zinc-300 font-mono">
                    <Calendar size={16} className="text-zinc-600" />
                    <span>{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-zinc-700">|</span>
                    <Clock size={16} className="text-zinc-600" />
                    <span>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <select
                      value={app.barber_id}
                      onChange={(e) => handleAssignBarber(app.id, parseInt(e.target.value))}
                      className="bg-zinc-900 text-amber-400 text-xs font-bold rounded-lg px-3 py-2.5 md:py-2 border border-white/5 outline-none focus:border-amber-500 transition cursor-pointer flex-1 md:flex-none"
                    >
                      {team.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {app.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleChangeStatus(app.id, 'canceled')} className="p-2.5 md:p-2 bg-rose-500/5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition" title="Cancelar">
                          <Ban size={18}/>
                        </button>
                        <button onClick={() => handleChangeStatus(app.id, 'completed')} className="p-2.5 md:p-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 rounded-lg transition" title="Concluir">
                          <Check size={18}/>
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}