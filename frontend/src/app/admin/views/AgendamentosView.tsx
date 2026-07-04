'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, Ban } from 'lucide-react';
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-5 md:p-8">
        
        {/* HEADER DA ABA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold">Gestão de Agendamentos</h2>
            <p className="text-zinc-500 text-sm mt-1">Aprove ou escolha o profissional que executou o serviço.</p>
          </div>
          <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setAppointmentFilter('mes')}
              className={`text-xs px-4 py-2 rounded-lg font-semibold transition ${
                appointmentFilter === 'mes' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setAppointmentFilter('todos')}
              className={`text-xs px-4 py-2 rounded-lg font-semibold transition ${
                appointmentFilter === 'todos' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* LISTAGEM DOS AGENDAMENTOS */}
        {loadingAllAppointments ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : allAppointments.length === 0 ? (
          <p className="text-center text-zinc-500 py-20">Nenhum agendamento encontrado no sistema.</p>
        ) : (
          <>
            {appointmentFilter === 'mes' && (
              <div className="mb-6">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full md:w-auto bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            )}

            <div className="rounded-2xl border border-white/5 overflow-hidden">
              {/* Tabela para Desktop / Cards para Mobile */}
              <table className="w-full text-sm text-left block md:table">
                <thead className="bg-white/[0.02] text-zinc-400 text-xs uppercase tracking-wider hidden md:table-header-group">
                  <tr>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Data / Hora</th>
                    <th className="px-6 py-4 font-medium">Profissional</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-white/5 block md:table-row-group">
                  {allAppointments
                    .filter((a) => {
                      if (appointmentFilter === 'mes') {
                        const mesAno = a.appointment_date.substring(0, 7);
                        return mesAno === selectedMonth;
                      }
                      return true;
                    })
                    .map((app) => {
                      const notes = app.notes || '';
                      const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
                      const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
                      const dataObj = new Date(app.appointment_date);

                      return (
                        <tr key={app.id} className="block md:table-row bg-[#0A0A0A] md:bg-transparent p-4 md:p-0 hover:bg-white/[0.02] transition mb-3 md:mb-0 rounded-xl md:rounded-none border md:border-none border-white/5">
                          
                          {/* CLIENTE */}
                          <td className="block md:table-cell md:px-6 md:py-4 mb-3 md:mb-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sky-400 font-bold text-sm md:text-xs shrink-0">
                                {nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold md:font-semibold text-zinc-100 block text-base md:text-sm">{nome}</span>
                                <span className="text-[11px] md:text-[10px] text-zinc-500 block">{servicesMap[app.service_id]?.name || `Serviço #${app.service_id}`}</span>
                              </div>
                            </div>
                          </td>

                          {/* DATA E HORA */}
                          <td className="flex justify-between items-center md:table-cell md:px-6 md:py-4 mb-3 md:mb-0 border-t border-white/5 md:border-none pt-3 md:pt-0">
                            <span className="md:hidden text-xs text-zinc-500 font-semibold uppercase tracking-wider">Agendamento</span>
                            <div className="text-right md:text-left">
                              <div className="text-zinc-200 font-medium text-sm">{dataObj.toLocaleDateString('pt-BR')}</div>
                              <div className="text-zinc-500 text-xs">{dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </td>
                          
                          {/* BARBEIRO */}
                          <td className="flex justify-between items-center md:table-cell md:px-6 md:py-4 mb-3 md:mb-0 border-t border-white/5 md:border-none pt-3 md:pt-0">
                            <span className="md:hidden text-xs text-zinc-500 font-semibold uppercase tracking-wider">Profissional</span>
                            <select
                              value={app.barber_id}
                              onChange={(e) => handleAssignBarber(app.id, parseInt(e.target.value))}
                              className="bg-[#121214] md:bg-[#0A0A0A] text-amber-400 font-semibold border border-white/10 rounded-lg px-3 py-2 md:py-1.5 text-xs focus:border-amber-500 outline-none w-36 md:w-32 cursor-pointer transition"
                            >
                              {(team || []).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* STATUS */}
                          <td className="flex justify-between items-center md:table-cell md:px-6 md:py-4 mb-4 md:mb-0 border-t border-white/5 md:border-none pt-3 md:pt-0">
                            <span className="md:hidden text-xs text-zinc-500 font-semibold uppercase tracking-wider">Status</span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 md:px-2.5 md:py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                              ${app.status === 'completed' ? 'bg-sky-400/10 text-sky-400 border border-sky-400/20' :
                                app.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                              {app.status === 'completed' && <Check size={12} />}
                              {app.status === 'pending' && <Clock size={12} />}
                              {app.status === 'canceled' && <Ban size={12} />}
                              {app.status === 'completed' ? 'Concluído' :
                               app.status === 'pending' ? 'Pendente' : 'Cancelado'}
                            </span>
                          </td>

                          {/* AÇÕES */}
                          <td className="block md:table-cell md:px-6 md:py-4 md:text-right border-t border-white/5 md:border-none pt-4 md:pt-0">
                            {app.status === 'pending' ? (
                              <div className="flex justify-end gap-2 w-full md:w-auto">
                                <button
                                  onClick={() => handleChangeStatus(app.id, 'canceled')}
                                  disabled={processingId === app.id}
                                  className="flex-1 md:flex-none justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] md:text-[10px] font-bold px-4 py-2.5 md:px-3 md:py-2 rounded-lg transition disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleChangeStatus(app.id, 'completed')}
                                  disabled={processingId === app.id}
                                  className="flex-1 md:flex-none justify-center bg-sky-400 hover:bg-sky-500 text-white text-[11px] md:text-[10px] font-bold px-4 py-2.5 md:px-3 md:py-2 rounded-lg transition disabled:opacity-50"
                                >
                                  Finalizar
                                </button>
                              </div>
                            ) : (
                              <div className="text-center md:text-right w-full">
                                <span className="text-zinc-600 hidden md:inline">—</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}