'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, Ban, Calendar, Scissors, Package } from 'lucide-react';
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

  const filteredAppointments = allAppointments.filter((a) => {
    if (appointmentFilter === 'mes') {
      return a.appointment_date.startsWith(selectedMonth);
    }
    return true;
  });

  // 🔥 LEITOR INTELIGENTE CORRIGIDO 🔥
  const extractCartDetails = (notes: string | null) => {
    if (!notes) return { name: "Cliente", extras: null, products: null };
    
    let name = "Cliente";
    let extras = null;
    let products = null;

    // Adicionamos a flag 's' (dotAll) no final para o regex ler as quebras de linha (\n) do carrinho
    const oldNameMatch = notes.match(/Cliente:\s*([\s\S]*?)(?:\s*-\s*Tel:|$)/);
    
    if (oldNameMatch) {
       // Isola apenas a primeira linha do bloco de notas para ser o Nome + Tag
       // Ex: "Joao Luiz | Agendamento via app (Carrinho)."
       name = oldNameMatch[1].trim().split('\n')[0].trim();
    }

    // Procura os serviços extras e remove o ponto final caso exista
    const extrasMatch = notes.match(/Serviços extras:\s*([^\n]+)/);
    if (extrasMatch) {
      extras = extrasMatch[1].replace(/\.$/, '').trim(); 
    }

    // Procura os produtos e remove o ponto final caso exista
    const productsMatch = notes.match(/Produtos reservados:\s*([^\n]+)/);
    if (productsMatch) {
      products = productsMatch[1].replace(/\.$/, '').trim();
    }

    return { name, extras, products };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Agendamentos</h2>
          <p className="text-zinc-500 text-sm">Gerencie os agendamentos e o carrinho dos clientes.</p>
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

      {appointmentFilter === 'mes' && (
        <div className="flex justify-end animate-in fade-in duration-300">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
          />
        </div>
      )}

      {/* Lista de Cards */}
      {loadingAllAppointments ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0B0B0B] border border-white/[0.06] rounded-2xl border-dashed">
          <Calendar size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 font-medium">Nenhum agendamento encontrado para este período.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((app) => {
            const date = new Date(app.appointment_date);
            const cartDetails = extractCartDetails(app.notes);
            const clientName = cartDetails.name !== "Cliente" ? cartDetails.name : `Cliente #${app.customer_id}`;
            
            return (
              <div key={app.id} className="group bg-[#0A0A0A] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-black">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Info Cliente & Carrinho */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-[#121214] border border-white/5 flex items-center justify-center font-bold text-lg text-zinc-400 shrink-0">
                      {clientName.charAt(0)}
                    </div>
                    <div className="space-y-2 w-full">
                      <h3 className="font-semibold text-white">{clientName}</h3>
                      
                      {/* Serviço Principal */}
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                        <Scissors size={12} className="text-blue-500"/> {servicesMap[app.service_id]?.name || 'Serviço Principal'}
                      </p>

                      {/* Itens Extras do Carrinho */}
                      {(cartDetails.extras || cartDetails.products) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {cartDetails.extras && (
                            <span className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
                              <Scissors size={10} /> + {cartDetails.extras}
                            </span>
                          )}
                          {cartDetails.products && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
                              <Package size={10} /> + {cartDetails.products}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Data/Hora */}
                  <div className="flex items-center gap-2 text-sm text-zinc-300 font-mono bg-[#121214] px-4 py-2 rounded-xl border border-white/5">
                    <Calendar size={14} className="text-zinc-500" />
                    <span>{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-zinc-700 mx-1">|</span>
                    <Clock size={14} className="text-zinc-500" />
                    <span>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Controles do Barbeiro */}
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <select
                      value={app.barber_id}
                      onChange={(e) => handleAssignBarber(app.id, parseInt(e.target.value))}
                      className="bg-[#121214] text-blue-400 text-xs font-bold rounded-xl px-3 py-3 md:py-2.5 border border-white/5 outline-none focus:border-blue-500 transition cursor-pointer flex-1 md:flex-none"
                    >
                      {team.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {app.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleChangeStatus(app.id, 'canceled')} className="p-3 md:p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition" title="Cancelar">
                          <Ban size={18}/>
                        </button>
                        <button onClick={() => handleChangeStatus(app.id, 'completed')} className="p-3 md:p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition" title="Concluir">
                          <Check size={18}/>
                        </button>
                      </div>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
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