'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Settings, Image as ImageIcon, MapPin, Phone, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function SettingsView({ token }: { token: string }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [companyPlan, setCompanyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Estados de Mapa e WhatsApp
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    const fetchCompanyPlan = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Calcula dias restantes se o backend não enviou
          let dias = data.dias_restantes;
          if (dias === undefined || dias === null) {
            const targetDate = data.status === 'trial' ? data.trial_end : data.subscription_end;
            if (targetDate) {
              const diff = new Date(targetDate).getTime() - new Date().getTime();
              dias = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
            } else { dias = 0; }
          }
          setCompanyPlan({ ...data, dias_restantes: dias });
          if (data.logo_url) setCurrentLogo(data.logo_url);
          
          // Preenche os dados de localização e contato
          if (data.address) setAddress(data.address);
          if (data.map_url) setMapUrl(data.map_url);
          if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);

        }
      } catch (err) {
        console.error("Erro ao buscar configurações", err);
      } finally {
        setLoadingPlan(false);
      }
    };
    fetchCompanyPlan();
  }, [token]);

  const handleLogoUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!logoFile) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', logoFile);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/company/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        alert('Logo atualizada com sucesso!');
        if (result.logo_url) setCurrentLogo(result.logo_url);
        setLogoFile(null);
        setLogoPreview('');
      } else {
        alert(`Erro ao atualizar logo`);
      }
    } catch { alert('Erro de conexão ao enviar logo.'); } 
    finally { setUploadingLogo(false); }
  };

  const handleSaveLocation = async (e: FormEvent) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/company/location`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ address: address, map_url: mapUrl, whatsapp_number: whatsappNumber }),
      });
      if (res.ok) {
        alert('Configurações de contato salvas com sucesso!');
      } else {
        alert('Erro ao salvar dados.');
      }
    } catch { alert('Erro de conexão.'); } 
    finally { setSavingLocation(false); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20 space-y-6">
      
      {/* HEADER DA TELA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-zinc-500 text-sm">Personalize os dados públicos da sua barbearia e gerencie sua assinatura.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (Dados da Barbearia) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* LOGO FORM */}
          <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <ImageIcon size={18} className="text-blue-500"/> Identidade Visual
            </h3>
            <form onSubmit={handleLogoUpload} className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-24 h-24 shrink-0 rounded-2xl border border-white/10 flex items-center justify-center bg-[#0A0A0A] overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} className="w-full h-full object-cover" />
                ) : currentLogo ? (
                  <img src={currentLogo} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-zinc-600 font-medium">Sem Logo</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-4">
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  if (file) setLogoPreview(URL.createObjectURL(file));
                  else setLogoPreview('');
                }} className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:transition-colors cursor-pointer" />
                <button disabled={uploadingLogo || !logoFile} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                  {uploadingLogo ? 'Enviando...' : 'Atualizar Logo'}
                </button>
              </div>
            </form>
          </div>

          {/* LOCALIZAÇÃO E CONTATO FORM */}
          <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-500"/> Localização e Contato
            </h3>
            <form onSubmit={handleSaveLocation} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Phone size={14} className="text-zinc-400" /> WhatsApp da Barbearia
                </label>
                <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="Ex: 5541999999999" className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
                <p className="text-xs text-zinc-500 mt-2">Os agendamentos do aplicativo serão enviados para este número.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 mt-4">Endereço Completo</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Rua das Flores, 100 - Centro" className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 mt-4">Link do Mapa (Iframe src)</label>
                <input type="text" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="URL do Google Maps" className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
              </div>
              <div className="pt-2">
                <button disabled={savingLocation} type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-8 py-3 rounded-xl disabled:opacity-50 transition-colors">
                  {savingLocation ? 'Salvando...' : 'Salvar Informações'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* COLUNA DIREITA (Assinatura e Plano) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-b from-[#121214] to-[#0A0A0A] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden h-full flex flex-col">
            
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-6">
              <CreditCard size={18} className="text-blue-500" />
              <h3 className="text-sm font-bold text-white">Assinatura LAT</h3>
            </div>

            {loadingPlan ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : companyPlan ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">Status Atual</p>
                    <div className="flex items-center gap-2">
                      {companyPlan.status === 'trial' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold rounded-lg uppercase tracking-wider">
                          <Clock size={12} /> Avaliação
                        </span>
                      ) : companyPlan.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold rounded-lg uppercase tracking-wider">
                          <CheckCircle size={12} /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-lg uppercase tracking-wider">
                          <Ban size={12} /> Suspenso
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">Validade do Acesso</p>
                    <p className="text-white text-base font-semibold">
                      {companyPlan.dias_restantes > 0 ? (
                        <>Restam <span className="text-blue-400">{companyPlan.dias_restantes}</span> dias</>
                      ) : (
                        <span className="text-rose-400">Plano expirado</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Data limite: {companyPlan.status === 'trial' 
                        ? (companyPlan.trial_end ? new Date(companyPlan.trial_end).toLocaleDateString('pt-BR') : '--') 
                        : (companyPlan.subscription_end ? new Date(companyPlan.subscription_end).toLocaleDateString('pt-BR') : '--')}
                    </p>
                  </div>

                </div>

                {/* Botão de Fatura / Atualização (Futuro) */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest font-medium mb-3">
                    Gerenciamento Financeiro
                  </p>
                  <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold rounded-xl text-sm transition-colors"
                    onClick={() => alert("Módulo de pagamentos Asaas será ativado em breve.")}
                  >
                    Gerenciar Assinatura
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Não foi possível carregar os dados.
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}