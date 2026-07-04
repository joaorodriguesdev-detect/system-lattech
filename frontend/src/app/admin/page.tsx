'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import AdminSidebar, { type AdminTab } from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import SubscriptionAlert from '@/components/SubscriptionAlert';
import DashboardView from './views/DashboardView';
import SettingsView from './views/SettingsView';
import VitrineView from './views/VitrineView';
import AgendamentosView from './views/AgendamentosView';
import EquipeView from './views/EquipeView';
import PostagensView from './views/PostagensView';
import AvaliacoesView from './views/AvaliacoesView';
import AtendimentosView from './views/AtendimentosView';
import ServicosView from './views/ServicosView';

// ===== TIPOS GLOBAIS =====
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

interface CompanyPlan {
  status: string;
  trial_end: string | null;
  subscription_end: string | null;
  dias_restantes: number;
  data_cadastro: string | null;
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
  top_services: { name: string; price: number; count: number }[];
  pending_reviews?: number;
}

// ===== SHELL PRINCIPAL =====
export default function AdminDashboard() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  // === ESTADO GLOBAL MÍNIMO ===
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // === DADOS COMPARTILHADOS (header + modais) ===
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<number, { name: string; price: number }>>({});
  const [companyPlan, setCompanyPlan] = useState<CompanyPlan | null>(null);
  const [tenantStatus, setTenantStatus] = useState<'active' | 'trial' | 'suspended'>('active');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // === ESTADO DOS MODAIS GLOBAIS ===
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentItem[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [processingReviewId, setProcessingReviewId] = useState<number | null>(null);

  const planExpired = tenantStatus === 'suspended';

  // ====== FETCHES GLOBAIS ======
  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }
      if (response.status === 403) setTenantStatus('suspended');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setMetrics(data);
      setPendingReviewCount(data.pending_reviews || 0);
    } catch {
      if (!metrics) {
        setMetrics({
          period: { start_date: '', end_date: '' },
          total_appointments: 0, completed_appointments: 0,
          canceled_appointments: 0, pending_appointments: 0,
          revenue: 0, total_barbers: 0, total_attendances: 0,
          top_services: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/barbers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // 🔥 PROTEÇÃO: Garante que team seja sempre um array, mesmo se a API falhar
        setTeam(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  const fetchServicesMap = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${API_BASE_URL}/services/?company_id=${userData.company_id}&include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, { name: string; price: number }> = {};
        (Array.isArray(data) ? data : []).forEach((s: any) => { map[s.id] = { name: s.name, price: s.price }; });
        setServicesMap(map);
      }
    } catch {}
  };

  const fetchCompanyPlan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyPlan(data);
        setTenantStatus(data.status || 'active');
      }
    } catch {}
  };

  // ====== HANDLERS DOS MODAIS ======
  const fetchPendingAppointments = async () => {
    setLoadingPending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const all = await response.json();
      setPendingAppointments(Array.isArray(all) ? all.filter((a: AppointmentItem) => a.status === 'pending') : []);
    } catch {
      setPendingAppointments([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleOpenPendingModal = () => {
    fetchPendingAppointments();
    setShowPendingModal(true);
  };

  const handleChangeStatus = async (appointmentId: number, newStatus: 'completed' | 'canceled') => {
    setProcessingId(appointmentId);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error();
      setPendingAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      await fetchDashboard();
    } catch {
      alert('Erro ao atualizar status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAssignBarber = async (appId: number, barberId: number) => {
    try {
      await fetch(`${API_BASE_URL}/admin/appointments/${appId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barber_id: barberId }),
      });
    } catch {
      alert('Erro ao transferir agendamento');
    }
  };

  // ====== REVIEWS ======
  const fetchPendingReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingReviews(Array.isArray(data) ? data : []);
      }
    } catch {
      setPendingReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleOpenReviewModal = () => {
    fetchPendingReviews();
    setShowReviewModal(true);
  };

  const handleApproveReview = async (reviewId: number) => {
    setProcessingReviewId(reviewId);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setPendingReviewCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      alert('Erro ao aprovar avaliação');
    } finally {
      setProcessingReviewId(null);
    }
  };

  const handleRejectReview = async (reviewId: number) => {
    setProcessingReviewId(reviewId);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setPendingReviewCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      alert('Erro ao rejeitar avaliação');
    } finally {
      setProcessingReviewId(null);
    }
  };

  // ====== INIT ======
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) setUserName(JSON.parse(userData).name || 'Admin');

    fetchDashboard();
    fetchTeam();
    fetchServicesMap();
    fetchCompanyPlan();

    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // ====== LOADING ======
  if (loading || !metrics) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="bg-[#121214] border border-white/5 p-8 rounded-2xl shadow-2xl text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-400 font-medium">Sincronizando sistema...</p>
        </div>
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex font-sans selection:bg-blue-500/30">
      {/* SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* HEADER */}
        <AdminHeader
          activeTab={activeTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userName={userName}
          pendingAppointmentsCount={metrics.pending_appointments}
          pendingReviewCount={pendingReviewCount}
          onOpenPendingModal={handleOpenPendingModal}
          onOpenReviewModal={handleOpenReviewModal}
        />

        {/* SUBSCRIPTION ALERT */}
        {companyPlan && (
          <SubscriptionAlert
            status={companyPlan.status as 'trial' | 'active' | 'suspended'}
            endDate={companyPlan.status === 'trial' ? companyPlan.trial_end : companyPlan.subscription_end}
          />
        )}

        {/* BANNER PLANO EXPIRADO */}
        {planExpired && (
          <div className="px-6 pt-6">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-rose-200 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">Plano expirado</p>
                <p className="text-xs text-rose-100/80">Regularize a assinatura para reativar o acesso completo ao painel.</p>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO — RENDERIZA A VIEW ATIVA */}
        <main className="flex-1 p-6 md:p-8 z-10">
          {activeTab === 'dashboard' && (
            <DashboardView
              token={token!}
              onUnauthorized={() => { localStorage.clear(); router.push('/login'); }}
              onSuspended={() => setTenantStatus('suspended')}
            />
          )}
          {activeTab === 'configuracoes' && <SettingsView token={token!} />}
          {activeTab === 'vitrine' && <VitrineView />}
          
          {activeTab === 'agendamentos' && <AgendamentosView token={token!} team={team} servicesMap={servicesMap} />}
          {activeTab === 'equipe' && <EquipeView token={token!} team={team} fetchTeam={fetchTeam} servicesMap={servicesMap} />}
          {activeTab === 'postagens' && <PostagensView token={token!} />}
          
          {activeTab === 'avaliacoes' && <AvaliacoesView />}
          {activeTab === 'atendimentos' && <AtendimentosView servicesMap={servicesMap} />}
          {activeTab === 'servicos' && <ServicosView />}
        </main>
      </div>

      {/* ===== MODAL: AGENDAMENTOS PENDENTES ===== */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col modal-animate">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0A0A0A]">
              <h2 className="text-white text-lg font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Solicitações Pendentes
              </h2>
              <button onClick={() => setShowPendingModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {loadingPending ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : pendingAppointments.length === 0 ? (
                <div className="text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="mx-auto mb-4 opacity-50"><polyline points="20 6 9 17 4 12"/></svg>
                  <p className="text-zinc-300 font-medium">Tudo limpo por aqui!</p>
                  <p className="text-zinc-500 text-sm mt-1">Nenhuma aprovação pendente.</p>
                </div>
              ) : (
                pendingAppointments.map((app) => {
                  const notes = app.notes || '';
                  const nomeMatch = notes.match(/Cliente:\s*(.*?)(?:\s*-\s*Tel:|$)/);
                  const nome = nomeMatch ? nomeMatch[1].trim() : `Cliente #${app.customer_id}`;
                  const dataObj = new Date(app.appointment_date);

                  return (
                    <div key={app.id} className="bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-bold text-lg">{nome}</p>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase px-2 py-1 rounded-md">Pendente</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                        <div className="bg-white/[0.02] rounded-xl p-3">
                          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Data / Hora</p>
                          <p className="text-zinc-200 font-medium">{dataObj.toLocaleDateString('pt-BR')} às {dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="bg-white/[0.02] rounded-xl p-3">
                          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Serviço</p>
                          <p className="text-zinc-200 font-medium truncate">{servicesMap[app.service_id]?.name || `Serviço #${app.service_id}`}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Quem vai fazer o corte?</label>
                        <select
                          value={app.barber_id}
                          onChange={(e) => handleAssignBarber(app.id, parseInt(e.target.value))}
                          className="w-full bg-[#121214] text-amber-400 font-bold border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none transition cursor-pointer"
                        >
                          {(team || []).map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleChangeStatus(app.id, 'completed')} disabled={processingId === app.id}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">
                          {processingId === app.id ? '...' : 'Aprovar'}
                        </button>
                        <button onClick={() => handleChangeStatus(app.id, 'canceled')} disabled={processingId === app.id}
                          className="flex-1 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-300 font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">
                          {processingId === app.id ? '...' : 'Recusar'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: AVALIAÇÕES PENDENTES ===== */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col modal-animate">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0A0A0A]">
              <h2 className="text-white text-lg font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Avaliações da Barbearia
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {loadingReviews ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="mx-auto mb-4 opacity-50"><polyline points="20 6 9 17 4 12"/></svg>
                  <p className="text-zinc-300 font-medium">Tudo aprovado!</p>
                </div>
              ) : (
                pendingReviews.map((review) => (
                  <div key={review.id} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-sky-400 font-bold text-sm">
                        {review.customer_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-100 block">{review.customer_name || 'Anônimo'}</span>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                              fill={star <= review.rating ? '#f59e0b' : 'none'}
                              stroke={star <= review.rating ? '#f59e0b' : '#3f3f46'} strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 italic mb-4">&ldquo;{review.comment || ''}&rdquo;</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleApproveReview(review.id)} disabled={processingReviewId === review.id}
                        className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-xs">
                        {processingReviewId === review.id ? '...' : 'Aprovar'}
                      </button>
                      <button onClick={() => handleRejectReview(review.id)} disabled={processingReviewId === review.id}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-xs">
                        {processingReviewId === review.id ? '...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}