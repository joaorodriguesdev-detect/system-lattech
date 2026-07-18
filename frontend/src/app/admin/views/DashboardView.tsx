'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Clock, AlertCircle, Scissors, Calendar, BarChart, Medal,
  Check
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface TopService {
  name: string;
  price: number;
  count: number;
}

interface DashboardMetrics {
  period: { start_date: string; end_date: string };
  total_appointments: number;
  completed_appointments: number;
  canceled_appointments: number;
  pending_appointments: number;
  revenue: number;
  total_barbers: number;
  total_attendances: number;
  top_services: TopService[];
  pending_reviews: number;
}

interface CompanyPlan {
  status: string;
  trial_end: string | null;
  subscription_end: string | null;
  dias_restantes: number;
  data_cadastro: string | null;
}

interface DashboardViewProps {
  token: string;
  onUnauthorized: () => void;
  onSuspended: () => void;
}

export default function DashboardView({ token, onUnauthorized, onSuspended }: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [companyPlan, setCompanyPlan] = useState<CompanyPlan | null>(null);

  const fetchDashboard = async () => {
    try {
      setDashboardError(false);
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        console.warn('Token expirado. Redirecionando para login...');
        onUnauthorized();
        return;
      }

            if (response.status === 403) {
        onSuspended();
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMetrics(data);
    } catch {
      if (!metrics) {
                setMetrics({
          period: { start_date: '', end_date: '' },
          total_appointments: 0,
          completed_appointments: 0,
          canceled_appointments: 0,
          pending_appointments: 0,
          revenue: 0,
          total_barbers: 0,
          total_attendances: 0,
          top_services: [],
          pending_reviews: 0,
        });
      }
      setDashboardError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyPlan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyPlan(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDashboard();
    fetchCompanyPlan();

    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-[#121214] border border-white/5 p-8 rounded-2xl shadow-2xl text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-400 font-medium">Sincronizando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dashboardError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-400" />
            <p className="text-sm text-rose-200">Falha na sincronização. Exibindo dados em cache.</p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchDashboard(); }}
            className="text-rose-400 hover:text-rose-300 text-xs font-semibold underline"
          >
            Sincronizar
          </button>
        </div>
      )}

      {/* PLAN CARD */}
      {companyPlan && companyPlan.status !== 'suspended' && (
        <div className="mb-6">
          <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${
            companyPlan.status === 'trial'
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-sky-400/10 border-sky-400/20'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                companyPlan.status === 'trial'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-sky-400/20 text-sky-400'
              }`}>
                {companyPlan.status === 'trial' ? <Clock size={20} /> : <Check size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {companyPlan.status === 'trial'
                    ? `Plano Pro — ${companyPlan.dias_restantes} dia${companyPlan.dias_restantes !== 1 ? 's' : ''} restante${companyPlan.dias_restantes !== 1 ? 's' : ''}`
                    : 'Plano Ativo'}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {companyPlan.status === 'trial'
                    ? `Expira em ${new Date(companyPlan.trial_end!).toLocaleDateString('pt-BR')}`
                    : `Válido até ${new Date(companyPlan.subscription_end!).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
            </div>
            {companyPlan.status === 'trial' && companyPlan.dias_restantes <= 3 && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg shrink-0">
                ⚠️ Próximo do fim
              </span>
            )}
          </div>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
        <div className="xl:col-span-2 bg-[#121214] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[60px] -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
          <div className="flex items-center justify-between mb-2 relative z-10">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1">
              Faturamento <span className="text-amber-500">»</span>
            </p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <TrendingUp size={14} className="text-amber-400" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-white mb-1">R$ {metrics.revenue.toFixed(2)}</h3>
            <p className="text-xs text-sky-400 font-medium">+</p>
          </div>
          <div className="mt-6 h-20 w-full relative z-10">
            <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,60 0,40 33,25 66,35 100,15 133,25 166,5 200,10 200,60" fill="url(#areaGrad)" />
              <polyline fill="none" stroke="url(#lineGrad)" strokeWidth="3" points="0,40 33,25 66,35 100,15 133,25 166,5 200,10" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="0" cy="40" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="33" cy="25" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="66" cy="35" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="100" cy="15" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="133" cy="25" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="166" cy="5" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="200" cy="10" r="3" fill="#121214" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 blur-[50px] -mr-10 -mt-10 transition-all group-hover:bg-sky-400/20"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Atendimentos</p>
            <div className="w-8 h-8 rounded-full bg-sky-400/10 flex items-center justify-center border border-sky-400/20">
              <Scissors size={14} className="text-sky-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.completed_appointments}</h3>
          <p className="text-xs text-sky-400 font-medium">Serviços finalizados</p>
        </div>

        <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Pendentes</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock size={14} className="text-amber-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.pending_appointments}</h3>
          <p className="text-xs text-amber-400 font-medium">Aguardando ação</p>
        </div>

        <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Agendamentos</p>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Calendar size={14} className="text-sky-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white mb-1">{metrics.total_appointments}</h3>
          <p className="text-xs text-sky-400 font-medium">Volume do período</p>
        </div>
      </div>

      {/* TOP SERVICES + OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#121214] border border-white/[0.05] rounded-3xl p-6">
          <h3 className="text-white text-base font-bold mb-6 flex items-center gap-2">
            <Medal size={18} className="text-sky-400" />
            Serviços Mais Procurados
          </h3>
          {metrics.top_services && metrics.top_services.length > 0 ? (
            <div className="space-y-3">
              {metrics.top_services.map((svc: TopService, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border
                      ${idx === 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        idx === 1 ? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' : 
                        'bg-blue-500/10 text-sky-400 border-blue-500/20'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{svc.name}</p>
                      <p className="text-xs text-zinc-500">R$ {svc.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{svc.count}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Pedidos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
              <BarChart size={32} className="mb-3 opacity-20" />
              <p className="text-sm">Sem dados suficientes.</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-blue-600/10 to-[#121214] border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden">
          <h3 className="text-sky-300 text-sm font-bold uppercase tracking-widest mb-6">Visão Geral</h3>
          <div className="space-y-6">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Período de Análise</p>
              <p className="text-white text-sm font-medium">
                {new Date(metrics.period.start_date).toLocaleDateString('pt-BR')} — {new Date(metrics.period.end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="h-px bg-white/5 w-full"></div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Cancelamentos</p>
              <p className="text-rose-400 text-2xl font-bold">{metrics.canceled_appointments}</p>
            </div>
            <div className="h-px bg-white/5 w-full"></div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Barbeiros Ativos</p>
              <p className="text-white text-2xl font-bold">{metrics.total_barbers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}