'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, Trash2, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
}

export default function ServicosView() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  // === ESTADOS ===
  const [adminServices, setAdminServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [creatingService, setCreatingService] = useState(false);

  // === FETCH ===
  const fetchAdminServices = async () => {
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) return;
    
    setLoadingServices(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = userData.company_id;
      const res = await fetch(`${API_BASE_URL}/services/?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: 'no-store' // 🔥 A MÁGICA: Obriga o Next.js a buscar dados novos!
      });
      if (res.ok) {
        const data = await res.json();
        setAdminServices(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchAdminServices();
  }, []);

  // === HANDLERS ===
  const handleCreateService = async (e: FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice) {
      alert('Preencha o nome e o preço do serviço.');
      return;
    }
    if (!token) return;
    setCreatingService(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newServiceName.trim(),
          description: newServiceDesc.trim(),
          price: parseFloat(newServicePrice),
          duration_minutes: parseInt(newServiceDuration),
        }),
      });

      if (res.ok) {
        await fetchAdminServices();
        setShowServiceForm(false);
        setNewServiceName('');
        setNewServiceDesc('');
        setNewServicePrice('');
        setNewServiceDuration('30');
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao criar serviço');
      }
    } catch {
      alert('Erro de conexão ao criar serviço.');
    } finally {
      setCreatingService(false);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Tem certeza que deseja remover este serviço?')) return;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminServices((prev) => prev.filter((s) => s.id !== serviceId));
      } else {
        alert('Erro ao remover serviço');
      }
    } catch {
      alert('Erro de conexão ao remover serviço.');
    }
  };

  // === RENDER ===
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold">Catálogo de Serviços</h2>
            <p className="text-zinc-500 text-sm mt-1">Defina o que sua empresa oferece.</p>
          </div>
          <button
            onClick={() => {
              setShowServiceForm(!showServiceForm);
              if (showServiceForm) {
                setNewServiceName('');
                setNewServiceDesc('');
                setNewServicePrice('');
                setNewServiceDuration('30');
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
          >
            {showServiceForm ? <X size={16} /> : <Plus size={16} />}
            {showServiceForm ? 'Cancelar' : 'Criar Serviço'}
          </button>
        </div>

        {/* FORMULÁRIO */}
        {showServiceForm && (
          <form onSubmit={handleCreateService} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Ex: Combo Degradê + Barba"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="70.00"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="O tratamento VIP completo"
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-white/5 pt-5">
              <button
                disabled={creatingService}
                className="bg-white text-black hover:bg-zinc-200 text-sm font-bold px-8 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
              >
                {creatingService ? 'Processando...' : 'Adicionar ao Catálogo'}
              </button>
            </div>
          </form>
        )}

        {/* LISTAGEM */}
        {loadingServices ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : adminServices.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">
            Você ainda não configurou nenhum serviço.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminServices.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-zinc-100">{svc.name}</h3>
                    <span className="text-xs font-semibold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">
                      R$ {svc.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{svc.description || 'Sem descrição'}</p>
                  <p className="text-[10px] text-zinc-600 mt-2 font-mono flex items-center gap-1">
                    <Clock size={10} /> {svc.duration_minutes} min
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteService(svc.id)}
                  className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition shrink-0"
                  title="Remover Serviço"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
