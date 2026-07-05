'use client';

import { useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api';
import { clearAuthSession, getAuthToken } from '@/lib/session';
import {
  Building2, Plus, Search, ShieldAlert, X, 
  Activity, Link as LinkIcon, UserCircle, Mail, Lock, Trash2, Camera,
  CalendarDays, Zap, CreditCard, PowerOff, CheckCircle2, AlertOctagon
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  subdomain: string;
  logo_url: string | null;
  is_active?: boolean; 
  created_at?: string;
  status?: 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
  trial_end?: string | null;
  subscription_end?: string | null;
}

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Campos do Formulário
  const [newName, setNewName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [trialDays, setTrialDays] = useState<7 | 15 | 30>(7);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Estados de Validação e IA
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isAiProvisioning, setIsAiProvisioning] = useState(false);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/system/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      } else {
        console.error("Erro na resposta do servidor");
      }
    } catch (err) {
      console.error("Erro ao buscar empresas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Efeito de Debounce para validação do Subdomínio
  useEffect(() => {
    if (newSubdomain.length < 3) {
      setIsSlugAvailable(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const res = await fetch(`${API_BASE_URL}/system/check-subdomain?slug=${newSubdomain}`);
        if (res.ok) {
          const data = await res.json();
          setIsSlugAvailable(data.available);
        } else {
          setIsSlugAvailable(null);
        }
      } catch (error) {
        console.error("Erro ao validar subdomínio", error);
        setIsSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [newSubdomain]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewName(val);
    setNewSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault();

    if (isSlugAvailable === false) {
      alert('❌ O subdomínio escolhido já está em uso.');
      return;
    }

    setCreating(true);
    setIsAiProvisioning(true);

    try {
      const res = await fetch(`${API_BASE_URL}/system/provision-tenant`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-master-token': 'detect@ion!2001#'
        },
        body: JSON.stringify({ 
          company_name: newName, 
          subdomain: newSubdomain,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
          trial_days: trialDays,
        }),
      });

      if (res.ok) {
        alert('🚀 Infraestrutura lançada! A Inteligência Artificial está gerando o cardápio e configurando o sistema em background.');
        setShowModal(false);
        setNewName(''); setNewSubdomain('');
        setAdminName(''); setAdminEmail(''); setAdminPassword('');
        fetchCompanies(); 
      } else {
        const err = await res.json();
        const errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
        alert(`❌ Erro: ${errorMessage}`);
      }
    } catch {
      alert('❌ Erro de conexão com o servidor.');
    } finally {
      setCreating(false);
      setIsAiProvisioning(false);
    }
  };

  const handleCheckout = async (companyId: number, kind: 'trial' | 'subscription') => {
    setCheckoutLoadingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/checkout-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, kind }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (res.status === 404 && data.detail) {
        const fallbackUrl = kind === 'trial' ? data.detail.trial_url : data.detail.subscription_url;
        if (fallbackUrl) {
          window.location.href = fallbackUrl;
          return;
        }
      }
      alert(data.detail?.trial_url || data.detail?.subscription_url || data.detail || 'Falha ao gerar checkout.');
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  const handleManualActivate = async (company: Company) => {
    const customerId = prompt(`⚡ Ativação de Elite - Informe o ID Asaas para [${company.name}] (ou 'teste' para forçar bypass):`);
    if (!customerId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/billing/manual/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, customer_id: customerId, status: 'active', code: 'ionbarber-active-2026' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies((prev) => prev.map((item) => (item.id === company.id ? { ...item, status: 'ACTIVE' } : item)));
        alert('🚀 ' + (data.message || 'Empresa ativada com sucesso.'));
      } else {
        alert('❌ ' + (data.detail || 'Erro ao ativar manualmente.'));
      }
    } catch {
      alert('❌ Erro de conexão com o servidor.');
    }
  };

  const handleCompanyAction = async (companyId: number, action: 'suspend' | 'trial', days?: 7 | 15 | 30) => {
    setActionLoadingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/companies/${companyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ionbarber-active-2026', days }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = data.company;
        setCompanies((prev) => prev.map((item) => (item.id === companyId ? { ...item, ...updated } : item)));
        alert('✅ ' + (data.message || 'Ação aplicada com sucesso.'));
      } else {
        alert('❌ ' + (data.detail || 'Erro ao executar ação.'));
      }
    } catch {
      alert('❌ Erro de conexão com o servidor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`⚠️ ATENÇÃO EXTREMA!\n\nTem certeza que deseja EXCLUIR PERMANENTEMENTE a empresa "${companyName}"?\n\nEsta ação vai desintegrar todos os dados e é IRREVERSÍVEL!`)) return;

    setDeletingId(companyId);
    try {
      const res = await fetch(`${API_BASE_URL}/system/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'x-master-token': 'detect@ion!2001#' },
      });

      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== companyId));
        alert(`🗑️ Empresa "${companyName}" foi obliterada do sistema.`);
      } else {
        const err = await res.json();
        const errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
        alert(`❌ Erro: ${errorMessage}`);
      }
    } catch {
      alert('❌ Erro de conexão com o servidor.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  const StatusBadge = ({ status }: { status?: string }) => {
    const s = (status || 'TRIAL').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <CheckCircle2 size={12} /> Ativo
        </span>
      );
    }
    if (s === 'TRIAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
          <CalendarDays size={12} /> Em Teste
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
        <AlertOctagon size={12} /> Suspenso
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-emerald-500/30 font-inter">
      {/* Background Épico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Header Premium */}
      <header className="bg-[#080808]/80 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-500 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
              <ShieldAlert size={24} className="text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none group-hover:text-emerald-400 transition-colors">LATTECH Panel</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-semibold">SaaS Control Center</p>
              </div>
            </div>
          </div>
          
          <button onClick={() => { document.cookie = "superadmin_token=; path=/; max-age=0"; window.location.href = '/superadmin/login'; }} className="group flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300">
            <PowerOff size={16} className="text-rose-500 group-hover:animate-pulse" />
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Desconectar</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Tenants (Empresas)</h2>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">Painel de controle orbital. Gerenciamento de assinaturas</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="relative group w-full sm:w-72">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou link..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full bg-[#0d0d0d] border border-white/[0.08] hover:border-white/20 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 shadow-inner" 
                />
              </div>
            </div>
            
            <button onClick={() => setShowModal(true)} className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-emerald-400/30 overflow-hidden shrink-0">
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out skew-x-12" />
              <Plus size={18} className="relative z-10" /> 
              <span className="relative z-10 text-sm uppercase tracking-wider">Novo Tenant</span>
            </button>
          </div>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#050505]/80 text-zinc-400 text-[10px] uppercase tracking-[0.2em] border-b border-white/[0.06]">
                <tr>
                  <th className="px-8 py-6 font-bold w-20">ID</th>
                  <th className="px-8 py-6 font-bold">Empresa</th>
                  <th className="px-8 py-6 font-bold">Acesso</th>
                  <th className="px-8 py-6 font-bold">Ciclo de Vida</th>
                  <th className="px-8 py-6 font-bold text-right">Comandos Orbitais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center"><div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" /><p className="text-zinc-500 text-sm uppercase tracking-widest font-semibold animate-pulse">Sincronizando banco de dados...</p></td></tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center"><div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={24} className="text-zinc-600" /></div><p className="text-zinc-500 text-sm">Nenhum tenant encontrado no radar.</p></td></tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr key={company.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                      <td className="px-8 py-5">
                        <span className="font-mono text-xs text-zinc-600 font-bold tracking-wider">#{String(company.id).padStart(4, '0')}</span>
                      </td>
                      
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-emerald-500/30 transition-colors">
                            {company.logo_url ? <Image src={company.logo_url} alt="Logo" width={48} height={48} unoptimized className="w-full h-full object-cover" /> : <Building2 size={20} className="text-zinc-700" />}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-100 text-base block group-hover:text-emerald-400 transition-colors">{company.name}</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 block">Tenant Ativo</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <a href={`https://${company.subdomain}.lattech.com.br`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/10 transition-all duration-300 group/link">
                          <LinkIcon size={14} className="group-hover/link:-rotate-12 transition-transform" />
                          <span className="font-mono font-medium">{company.subdomain}.lattech.com.br</span>
                        </a>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={company.status} />
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-zinc-600 uppercase tracking-widest w-10">Trial:</span>
                              <span className="text-zinc-300 font-medium">{formatDate(company.trial_end)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-zinc-600 uppercase tracking-widest w-10">Plano:</span>
                              <span className="text-zinc-300 font-medium">{formatDate(company.subscription_end)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                          
                          <div className="flex items-center bg-[#0d0d0d] border border-white/5 rounded-xl p-1 shadow-sm">
                            <button onClick={() => handleCheckout(company.id, (company.status || '').toUpperCase() === 'TRIAL' ? 'trial' : 'subscription')} disabled={checkoutLoadingId === company.id || actionLoadingId === company.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
                              <CreditCard size={14} /> Checkout
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <button onClick={() => handleManualActivate(company)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
                              <Zap size={14} /> Bypass
                            </button>
                          </div>
                          
                          <div className="flex items-center bg-[#0d0d0d] border border-white/5 rounded-xl p-1 shadow-sm">
                            <button onClick={() => handleCompanyAction(company.id, 'trial', 7)} disabled={actionLoadingId === company.id} className="px-3 py-1.5 text-xs font-bold text-amber-500/80 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">7d</button>
                            <button onClick={() => handleCompanyAction(company.id, 'trial', 15)} disabled={actionLoadingId === company.id} className="px-3 py-1.5 text-xs font-bold text-amber-500/80 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">15d</button>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <button onClick={() => handleCompanyAction(company.id, 'trial', 30)} disabled={actionLoadingId === company.id} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50">
                              <Plus size={12} /> 30d
                            </button>
                          </div>

                          <div className="flex items-center bg-[#0d0d0d] border border-white/5 rounded-xl p-1 shadow-sm ml-2">
                            <button onClick={() => handleCompanyAction(company.id, 'suspend')} disabled={actionLoadingId === company.id} className="p-2 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50" title="Suspender Acesso">
                              <PowerOff size={16} />
                            </button>
                            <button onClick={() => handleDeleteCompany(company.id, company.name)} disabled={deletingId === company.id || actionLoadingId === company.id} className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50" title="Destruir Tenant">
                              {deletingId === company.id ? <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Premium */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => !creating && setShowModal(false)} />
          
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.04] bg-[#050505] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Building2 size={18} className="text-emerald-400" /></div>
                  Provisionar Nova Barbearia
                </h2>
                <p className="text-xs text-zinc-500 mt-1 ml-11">Configure os parâmetros do novo inquilino (Tenant).</p>
              </div>
              <button onClick={() => !creating && setShowModal(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCompany} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              
              {/* Sec 1 */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-zinc-300">1</span>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Identidade Visual e Rota</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome Comercial</label>
                    <input type="text" required value={newName} onChange={handleNameChange} placeholder="Ex: Barbearia do Zé" className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-[#111] transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Subdomínio do Sistema</label>
                    <div className="flex items-center group relative">
                      <input 
                        type="text" 
                        required 
                        value={newSubdomain} 
                        onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} 
                        placeholder="barbeariadoze" 
                        className={`w-full bg-[#0d0d0d] border border-r-0 rounded-l-xl px-4 py-3.5 text-sm text-white focus:outline-none transition-all ${isSlugAvailable === false ? 'border-rose-500' : 'border-white/10 focus:border-emerald-500'}`} 
                      />
                      <span className="bg-[#111] border border-white/10 border-l-0 rounded-r-xl px-4 py-3.5 text-sm text-emerald-500/70 font-mono select-none flex items-center gap-2">
                        .lattech.com.br
                        {/* Feedback em tempo real */}
                        {isCheckingSlug && <div className="w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />}
                        {!isCheckingSlug && isSlugAvailable === true && <CheckCircle2 size={14} className="text-emerald-500" />}
                        {!isCheckingSlug && isSlugAvailable === false && <X size={14} className="text-rose-500" />}
                      </span>
                    </div>
                    {isSlugAvailable === false && <span className="text-rose-500 text-xs ml-1 block mt-1">Subdomínio já em uso</span>}
                  </div>
                </div>
              </div>

              {/* Sec 2 */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-zinc-300">2</span>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Acesso do Proprietário (Admin)</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><UserCircle size={14}/> Nome Completo</label>
                    <input type="text" required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Nome do Dono" className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-[#111] transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Mail size={14}/> E-mail Corporativo</label>
                      <input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="contato@barbearia.com" className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-[#111] transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Lock size={14}/> Senha Mestra</label>
                      <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-[#111] transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sec 3 */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-zinc-300">3</span>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Injeção de Trial (Test Drive)</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([7, 15, 30] as const).map((days) => (
                    <button key={days} type="button" onClick={() => setTrialDays(days)} className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${trialDays === days ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-white/5 bg-[#0d0d0d] text-zinc-500 hover:border-white/20 hover:text-zinc-300'}`}>
                      <span className="text-3xl font-black tracking-tighter mb-1">{days}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Dias Livres</span>
                      {trialDays === days && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                          <CheckCircle2 size={14} className="text-[#050505]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-8 border-t border-white/5 flex gap-4 sticky bottom-0 bg-[#0a0a0a] pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || isSlugAvailable === false} className="flex-1 group relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
                  <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out skew-x-12" />
                  {isAiProvisioning ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Acionando Inteligência...</>
                  ) : creating ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Provisionando Nave...</>
                  ) : (
                    <><Zap size={18} /> Iniciar Operação SaaS</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}} />
    </div>
  );
}