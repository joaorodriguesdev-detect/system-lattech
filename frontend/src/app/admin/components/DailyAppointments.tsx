'use client';

import { useState, useEffect } from 'react';
import { CalendarClock, Calendar, Scissors, User, Clock, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface DailyAppointment {
  id: number;
  customer_name: string;
  service_name: string;
  barber_name: string;
  time: string;
  status: string;
}

interface DailyAppointmentsProps {
  token: string;
}

export default function DailyAppointments({ token }: DailyAppointmentsProps) {
  const [appointments, setAppointments] = useState<DailyAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDailyAppointments = async () => {
    try {
      // Pega a data local exata do navegador do usuário (YYYY-MM-DD)
      const hojeLocal = new Date();
      const year = hojeLocal.getFullYear();
      const month = String(hojeLocal.getMonth() + 1).padStart(2, '0');
      const day = String(hojeLocal.getDate()).padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      const response = await fetch(`${API_BASE_URL}/admin/dashboard/daily-appointments?date=${dataFormatada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Erro ao buscar agendamentos do dia:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyAppointments();
    const interval = setInterval(fetchDailyAppointments, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const hojeExibicao = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div className="mb-8 p-6 bg-[#121214] border border-white/[0.05] rounded-3xl flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <CalendarClock size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">Atendimentos para Hoje!</h2>
            <p className="text-zinc-400 text-xs font-medium capitalize">{hojeExibicao}</p>
          </div>
        </div>
        {appointments.length > 0 && (
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/30">
            {appointments.length} reserva(s)
          </span>
        )}
      </div>

      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-2 sm:p-4 shadow-lg">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-300 font-semibold text-lg mb-1">Agenda Livre</p>
            <p className="text-zinc-500 text-sm">Nenhum cliente agendado para o dia de hoje.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/[0.03] hover:border-blue-500/30 hover:bg-white/[0.05] rounded-2xl transition-all group">
                
                <div className="flex items-center gap-4">
                  <div className="min-w-[60px] text-center">
                    <span className="text-xl font-black text-white block leading-none">{appt.time}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Horário</span>
                  </div>
                  
                  <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
                  
                  <div>
                    <h4 className="text-white font-bold text-base flex items-center gap-2">
                      {appt.customer_name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs font-medium text-zinc-400">
                      <span className="flex items-center gap-1"><Scissors size={12}/> {appt.service_name}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                      <span className="flex items-center gap-1"><User size={12}/> {appt.barber_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-white/5 flex items-center justify-end">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border flex items-center gap-1.5
                    ${appt.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      appt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'}`}>
                    {appt.status === 'COMPLETED' && <CheckCircle size={12} />}
                    {appt.status === 'PENDING' && <Clock size={12} />}
                    {appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}