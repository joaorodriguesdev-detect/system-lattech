'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Settings, Image as ImageIcon, ShieldAlert, Clock, Check, Ban, MapPin, Trash2, Upload, Phone } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function SettingsView({ token }: { token: string }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [companyPlan, setCompanyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // 🔥 NOVOS ESTADOS PARA O MAPA E WHATSAPP
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // 🔥 ESTADOS PARA BANNERS
  const [banners, setBanners] = useState<any[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCompanyPlan = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
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
        console.error("Erro crítico ao buscar plano", err);
      } finally {
        setLoadingPlan(false);
      }
    };
    fetchCompanyPlan();
    fetchBanners();
  }, [token]);

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/company/banners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (err) {
      console.error('Erro ao buscar banners', err);
    }
  };

  const handleBannerUpload = async (order: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploadingBanner(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE_URL}/admin/company/banners`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          await fetchBanners();
        } else {
          const err = await res.json();
          alert(err.detail || 'Erro ao fazer upload do banner.');
        }
      } catch {
        alert('Erro de conexão ao enviar banner.');
      } finally {
        setUploadingBanner(false);
      }
    };
    input.click();
  };

  const handleBannerDelete = async (banner: any) => {
    if (!confirm('Remover este banner?')) return;

    setDeletingBannerId(banner.id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/company/banners/${banner.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchBanners();
      } else {
        alert('Erro ao remover banner.');
      }
    } catch {
      alert('Erro de conexão ao remover banner.');
    } finally {
      setDeletingBannerId(null);
    }
  };

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
    } catch { alert('Erro crítico ao subir logo.'); } 
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
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar dados.');
      }
    } catch { alert('Erro de conexão.'); } 
    finally { setSavingLocation(false); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8 max-w-3xl mx-auto">
        
        <div className="mb-8 border-b border-white/5 pb-6">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Settings size={22} className="text-sky-400" /> Configurações da Barbearia
          </h2>
        </div>

        {/* --- FORMULÁRIO DE LOGO --- */}
        <form onSubmit={handleLogoUpload} className="space-y-8 mb-10">
            <div>
              <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                <ImageIcon size={16} className="text-sky-400"/> Logo da Empresa
              </h3>
              <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Logo Atual</p>
                  <div className="w-32 h-32 shrink-0 rounded-2xl border border-white/10 flex items-center justify-center bg-[#050505] overflow-hidden">
                    {currentLogo ? <img src={currentLogo} className="w-full h-full object-contain p-2" /> : <p className="text-[10px] text-zinc-600">Sem Logo</p>}
                  </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    if (file) setLogoPreview(URL.createObjectURL(file));
                    else setLogoPreview('');
                  }} className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-sky-400" />
                  <button disabled={uploadingLogo || !logoFile} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">
                    {uploadingLogo ? 'Enviando...' : 'Atualizar Logo'}
                  </button>
                </div>
              </div>
            </div>
        </form>

        {/* --- SEÇÃO DE BANNERS DA VITRINE --- */}
        <div className="mb-10 border-t border-white/5 pt-8">
          <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
            <ImageIcon size={16} className="text-amber-400" /> Banners da Vitrine (Máx: 5)
          </h3>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((slot) => {
                const banner = banners.find((b: any) => b.order === slot);

                if (banner) {
                  return (
                    <div
                      key={banner.id}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group"
                    >
                      <img
                        src={banner.image_url}
                        alt={`Banner ${slot}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                        <button
                          onClick={() => handleBannerDelete(banner)}
                          disabled={deletingBannerId === banner.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl disabled:opacity-50"
                          title="Remover banner"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {slot}/5
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`empty-${slot}`}
                    className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 transition-colors group cursor-pointer"
                    onClick={() => !uploadingBanner && handleBannerUpload(slot)}
                  >
                    {uploadingBanner ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-zinc-500">Enviando...</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={22} className="text-zinc-600 group-hover:text-sky-400 transition-colors" />
                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                          Upload
                        </span>
                      </>
                    )}
                    <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {slot}/5
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-600 mt-4 text-center">
              Clique em um slot vazio para fazer upload. Passe o mouse sobre a imagem para removê-la.
            </p>
          </div>
        </div>

        {/* 🔥 NOVO FORMULÁRIO DE CONTATO E MAPA 🔥 */}
        <form onSubmit={handleSaveLocation} className="space-y-4 mb-10 border-t border-white/5 pt-8">
          <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-blue-400"/> Localização e Contato
          </h3>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Phone size={14} className="text-green-500" /> WhatsApp da Barbearia
              </label>
              <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="Ex: 5541999999999" className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
              <p className="text-xs text-zinc-500 mt-2">Os agendamentos do site serão enviados para este número (adicione apenas números com DDD e DDI 55).</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2 mt-6">Endereço Escrito</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Rua XV de Novembro, 1000 - Centro" className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Link do Iframe do Google Maps (src)</label>
              <input type="text" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="Cole apenas o link que fica dentro do src='...'" className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
              <p className="text-xs text-zinc-500 mt-2">Vá no Google Maps &gt; Compartilhar &gt; Incorporar Mapa &gt; Copie apenas a URL que está dentro das aspas do <b>src</b>.</p>
            </div>
            <div className="flex justify-end pt-4">
              <button disabled={savingLocation} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">
                {savingLocation ? 'Salvando...' : 'Salvar Dados'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}