'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface AppointmentItem {
  id: number;
  customer_id: number;
  barber_id: number;
  service_id: number;
  appointment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ServicesMap {
  [key: number]: { name: string; price: number };
}

interface AtendimentosViewProps {
  servicesMap?: ServicesMap;
}

export default function AtendimentosView({ servicesMap = {} }: AtendimentosViewProps) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const [completedAppointments, setCompletedAppointments] = useState<AppointmentItem[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchCompletedAppointments = async () => {
    if (!token) return;
    setLoadingCompleted(true);
    try {
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedAppointments((data || []).filter((a: AppointmentItem) => a.status === 'completed'));
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        <h2 className="text-white text-xl font-bold mb-6">Histórico de Atendimentos</h2>

        {loadingCompleted ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : completedAppointments.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">Nenhum atendimento finalizado no registro.</p>
        ) : (
          <div className="space-y-3">
            {completedAppointments.map((app) => {
              const notes = app.notes || '';
              const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
              const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
              const dataObj = new Date(app.appointment_date);
              const svc = servicesMap[app.service_id];

              return (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 gap-4 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Check size={18} className="text-sky-400" />
                    </div>
                    <div>
                      <p className="text-zinc-100 font-bold">{nome}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{svc?.name || `Serviço #${app.service_id}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-8">
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-300">
                        {dataObj.toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right border-l border-white/10 pl-6 sm:pl-8">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Receita</p>
                      <p className="text-sky-400 font-bold">
                        R$ {svc ? svc.price.toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
