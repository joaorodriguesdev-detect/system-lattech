'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { 
  CalendarDays, Clock, Scissors, Phone, User, 
  CheckCircle, ArrowLeft, MessageCircle, Bot, Sparkles, MessageSquare 
} from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

export default function AgendamentoPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [step, setStep] = useState<'services' | 'dados' | 'confirmacao'>('services');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  const ADMIN_WHATSAPP = '5541995707907';

  // 👇 DETETIVE SAAS NATIVO (Extração do Subdomínio) 👇
  useEffect(() => {
    const hostname = window.location.hostname;
    let sub = 'mariobarber'; 
    
    // Leitura inteligente
    if (hostname.includes('lvh.me')) {
      sub = hostname.replace('.lvh.me', '');
    } else if (hostname !== 'localhost' && hostname.includes('.')) {
      sub = hostname.split('.')[0];
    }

    fetch(`${API_BASE_URL}/system/companies/lookup?subdomain=${sub}`)
      .then(res => {
        if (!res.ok) throw new Error("Empresa não encontrada");
        return res.json();
      })
      .then(data => {
        setCompanyId(data.id); 
      })
      .catch(err => {
        console.error("Erro ao descobrir empresa:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (companyId === null) return; 

    setLoading(true);
    fetch(`${API_BASE_URL}/services/?company_id=${companyId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Erro no backend');
        return res.json();
      })
      .then((data) => {
        setServices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setServices([]);
        setLoading(false);
      });
  }, [companyId]);

  const gerarDatas = () => {
    const datas: { value: string; label: string }[] = [];
    const hoje = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0) {
        const value = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
        datas.push({ value, label });
      }
    }
    return datas;
  };

  const gerarHorarios = () => {
    const horarios: string[] = [];
    for (let h = 8; h <= 17; h++) {
      horarios.push(`${String(h).padStart(2, '0')}:00`);
      if (h < 17) horarios.push(`${String(h).padStart(2, '0')}:30`);
    }
    return horarios;
  };

  const handleSelecionarServico = (svc: Service) => {
    setSelectedService(svc);
    setStep('dados');
  };

  const handleVoltar = () => {
    if (step === 'dados') {
      setStep('services');
    } else if (step === 'confirmacao') {
      setStep('dados');
    }
  };

  const handleContinuarDados = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !data || !hora) {
      alert('Preencha todos os campos.');
      return;
    }
    setStep('confirmacao');
  };

  const handleConfirmar = async () => {
    if (!selectedService || companyId === null) return;
    setEnviando(true);

    const appointmentDate = new Date(`${data}T${hora}:00`);

    try {
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          service_id: selectedService.id,
          appointment_date: appointmentDate.toISOString(),
          customer_name: nome,
          customer_phone: telefone,
          notes: `Agendamento efetuado via site`,
        }),
      });

      if (res.ok) {
        const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
        const mensagem = `🪒 *Novo Agendamento!*\n\n👤 *Cliente:* ${nome}\n📞 *Tel:* ${telefone}\n✂️ *Serviço:* ${selectedService.name}\n💰 *Valor:* R$ ${selectedService.price.toFixed(2)}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n\n✅ Aguardando aprovação no painel!`;
        const link = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        setWhatsappLink(link);
        setSucesso(true);
      } else {
        const err = await res.json();
        alert("Erro retornado pelo servidor: " + JSON.stringify(err.detail || err, null, 2));
      }
    } catch {
      alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-sky-400/20 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agendamento Enviado!</h1>
            <p className="text-zinc-400 text-sm mt-2">Seu horário foi registrado e enviado para aprovação.</p>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            <MessageCircle size={20} />
            Falar com o Barbeiro
          </a>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl text-sm border border-zinc-700 hover:bg-zinc-700 transition"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-white/[0.06] h-16 flex items-center px-5 sticky top-0 z-40">
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => step === 'services' ? router.push('/') : handleVoltar()} className="text-zinc-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-bold">Agendar Horário</h1>
            <p className="text-[10px] text-zinc-500">
              {step === 'services' && 'Escolha como deseja agendar'}
              {step === 'dados' && 'Seus dados'}
              {step === 'confirmacao' && 'Confirme o agendamento'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${step === 'services' ? 'bg-amber-500' : 'bg-zinc-700'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'dados' ? 'bg-amber-500' : 'bg-zinc-700'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'confirmacao' ? 'bg-amber-500' : 'bg-zinc-700'}`} />
          </div>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {step === 'services' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 via-green-500 to-teal-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <a
                  href={`https://wa.me/${ADMIN_WHATSAPP}?text=Oi! Gostaria de agendar um horário.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex flex-col items-center justify-center gap-3 bg-zinc-950 border border-white/10 p-6 rounded-2xl hover:bg-zinc-900 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-400/10 mb-1 border border-sky-400/20">
                    <Bot size={28} className="text-sky-400 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    Atendimento com IA <Sparkles size={18} className="text-amber-400" />
                  </h2>
                  <p className="text-sm text-zinc-400 text-center leading-relaxed px-2">
                    Sem filas, sem formulários. Nossa IA agenda seu horário direto no WhatsApp em segundos!
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider bg-sky-400/10 px-5 py-2.5 rounded-full border border-sky-400/20">
                    <MessageSquare size={16} />
                    Agendar pelo WhatsApp
                  </div>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6 opacity-60">
              <div className="h-px bg-gradient-to-r from-transparent to-zinc-700 flex-1"></div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Ou escolha manualmente</span>
              <div className="h-px bg-gradient-to-l from-transparent to-zinc-700 flex-1"></div>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-amber-500 animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Carregando cardápio...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                Nenhum serviço disponível para esta barbearia.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelecionarServico(svc)}
                    className="w-full text-left bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-800/50 rounded-2xl p-4 transition-all duration-300 active:scale-[0.99] group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Scissors size={14} className="text-amber-500/70" />
                          <h3 className="font-bold text-sm text-zinc-100">{svc.name}</h3>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2">{svc.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-[10px] text-zinc-400 font-medium bg-zinc-800/80 px-2 py-1 rounded-md flex items-center gap-1.5">
                            <Clock size={10} />
                            {svc.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center h-full pt-1">
                        <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wide">A partir de</p>
                        <p className="text-base font-bold text-white">R$ {svc.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'dados' && selectedService && (
          <form onSubmit={handleContinuarDados} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-amber-500" />
                  <span className="font-semibold text-sm">{selectedService.name}</span>
                </div>
                <span className="text-white font-bold">R$ {selectedService.price.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Seu Nome
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como gosta de ser chamado?"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} /> WhatsApp
              </label>
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(41) 99999-0000"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <CalendarDays size={12} /> Data
                </label>
                <select
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition"
                >
                  <option value="">Selecione</option>
                  {gerarDatas().map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={12} /> Horário
                </label>
                <select
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition"
                >
                  <option value="">Selecione</option>
                  {gerarHorarios().map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors mt-4 active:scale-[0.99]"
            >
              Continuar
            </button>
          </form>
        )}

        {step === 'confirmacao' && selectedService && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-center">Resumo do Agendamento</h2>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-3">
                  <span className="text-zinc-500">Serviço</span>
                  <span className="font-medium text-right max-w-[60%]">{selectedService.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-3">
                  <span className="text-zinc-500">Cliente</span>
                  <span className="font-medium">{nome}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-3">
                  <span className="text-zinc-500">Data e Hora</span>
                  <span className="font-medium text-amber-400">
                    {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')} às {hora}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400 font-medium">Total a pagar</span>
                  <span className="font-extrabold text-xl text-white">R$ {selectedService.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVoltar}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 py-4 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={enviando}
                className="flex-[2] flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirmar Horário
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}