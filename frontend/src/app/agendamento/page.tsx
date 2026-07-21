'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { 
  CalendarDays, Clock, Scissors, Phone, User, 
  CheckCircle, ArrowLeft, MessageCircle, ShoppingCart, 
  Trash2, Plus, Check, Package, X
} from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
}

interface CartItem {
  id: number;
  type: 'service' | 'product';
  name: string;
  price: number;
}

export default function AgendamentoPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyPhone, setCompanyPhone] = useState<string>(''); 
  const [companyName, setCompanyName] = useState<string>('');
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    const hostname = window.location.hostname;
    let sub = 'mariobarber'; 
    
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
      .then(apiData => {
        setCompanyId(apiData.id); 
        if (apiData.name) setCompanyName(apiData.name);
        if (apiData.whatsapp_number) {
            setCompanyPhone(apiData.whatsapp_number.replace(/\D/g, ''));
        }
      })
      .catch(err => {
        console.error("Erro ao descobrir empresa:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (companyId === null) return; 

    setLoading(true);
    
    const fetchServices = fetch(`${API_BASE_URL}/services/?company_id=${companyId}`)
      .then(res => res.ok ? res.json() : []);
      
    const fetchProducts = fetch(`${API_BASE_URL}/products/?company_id=${companyId}`)
      .then(res => res.ok ? res.json() : []);

    Promise.all([fetchServices, fetchProducts])
      .then(([servicesData, productsData]) => {
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setProducts(Array.isArray(productsData) ? productsData.filter((p: Product) => p.active) : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (!data || !companyId) return;

    const fetchOccupiedSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`${API_BASE_URL}/appointments/occupied-slots?company_id=${companyId}&date=${data}`);
        if (res.ok) {
          const fetchedSlots = await res.json();
          setOccupiedSlots(fetchedSlots);
        }
      } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchOccupiedSlots();
  }, [data, companyId]);

  const gerarDatas = () => {
    const datas: { value: string; label: string }[] = [];
    const hoje = new Date();
    
    for (let i = 0; i <= 14; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      
      if (d.getDay() !== 0) { 
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const value = `${year}-${month}-${day}`;
        
        const label = i === 0 
          ? 'Hoje' 
          : d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
          
        datas.push({ value, label });
      }
    }
    return datas;
  };

  const getAvailableTimeSlots = () => {
    const allTimeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
    return allTimeSlots.filter(time => !occupiedSlots.includes(time));
  };

  const toggleCartItem = (item: CartItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id && i.type === item.type);
      if (exists) {
        return prev.filter(i => !(i.id === item.id && i.type === item.type));
      }
      return [...prev, item];
    });
  };

  const isInCart = (id: number, type: 'service' | 'product') => {
    return cart.some(i => i.id === id && i.type === type);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price, 0);

  const handleConfirmar = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !telefone.trim() || !data || !hora) {
      alert('Preencha todos os campos obrigatórios (Nome, WhatsApp, Data e Hora).');
      return;
    }

    const cartServices = cart.filter(i => i.type === 'service');
    const cartProducts = cart.filter(i => i.type === 'product');

    if (cartServices.length === 0) {
      alert('Seu carrinho precisa ter pelo menos 1 serviço para podermos agendar um horário.');
      return;
    }

    setEnviando(true);
    
    const appointmentDateLocal = `${data}T${hora}:00`;
    
    let notesText = `Agendamento via app (Carrinho).`;
    if (cartServices.length > 1) {
      notesText += `\nServiços extras: ${cartServices.slice(1).map(s => s.name).join(', ')}.`;
    }
    if (cartProducts.length > 0) {
      notesText += `\nProdutos reservados: ${cartProducts.map(p => p.name).join(', ')}.`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          service_id: cartServices[0].id, 
          appointment_date: appointmentDateLocal, 
          customer_name: nome,
          customer_phone: telefone,
          notes: notesText,
        }),
      });

      if (res.ok) {
        const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        let msg = `🪒 *Novo Agendamento!*\n\n👤 *Cliente:* ${nome}\n📞 *Tel:* ${telefone}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n\n`;
        
        msg += `🛒 *Itens do Carrinho:*\n`;
        cartServices.forEach(s => msg += `✂️ ${s.name} - R$ ${s.price.toFixed(2)}\n`);
        cartProducts.forEach(p => msg += `🛍️ ${p.name} - R$ ${p.price.toFixed(2)}\n`);
        
        msg += `\n💰 *Total a pagar:* R$ ${cartTotal.toFixed(2)}\n\n✅ Aguardando aprovação no painel!`;

        const numDestino = companyPhone ? companyPhone : ''; 
        setWhatsappLink(`https://wa.me/${numDestino}?text=${encodeURIComponent(msg)}`);
        
        setSucesso(true);
        setIsCartOpen(false);
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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <CheckCircle size={40} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reserva Concluída!</h1>
            <p className="text-zinc-400 text-sm mt-2">Seu pedido foi registrado e enviado para a barbearia.</p>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-400 hover:from-blue-500 hover:to-sky-300 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 border border-white/10"
          >
            <MessageCircle size={20} />
            Avisar Barbeiro no WhatsApp
          </a>

          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-[#121214] border border-white/5 text-zinc-300 hover:text-white hover:bg-[#18181b] rounded-xl text-sm font-bold transition"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24 relative">
      
      <header className="bg-black/50 backdrop-blur-md border-b border-white/[0.04] h-16 flex items-center px-4 sticky top-0 z-40">
        <div className="flex items-center w-full">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <div className="ml-2">
            <h1 className="text-sm font-bold text-white tracking-wide">Monte seu pedido</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{companyName}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        
        <div className="flex p-1 bg-[#121214] border border-white/5 rounded-xl">
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'services' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Scissors size={14} /> Serviços
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'products' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Package size={14} /> Loja / Produtos
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Carregando catálogo...</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6 animate-in fade-in duration-300">
            
            {activeTab === 'services' && (
              services.length === 0 ? (
                <p className="text-center text-zinc-500 py-10 bg-[#0A0A0A] rounded-xl border border-dashed border-white/10">Nenhum serviço disponível no momento.</p>
              ) : (
                services.map((svc) => {
                  const added = isInCart(svc.id, 'service');
                  return (
                    <div key={`svc-${svc.id}`} className={`bg-[#0A0A0A] border ${added ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'} rounded-xl p-4 transition-all duration-300`}>
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-zinc-100">{svc.name}</h3>
                          <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{svc.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] text-zinc-400 font-medium bg-zinc-900 px-2 py-1 rounded-md flex items-center gap-1">
                              <Clock size={10} /> {svc.duration_minutes} min
                            </span>
                            <span className="text-xs font-bold text-white">R$ {svc.price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-end">
                          <button 
                            onClick={() => toggleCartItem({ id: svc.id, type: 'service', name: svc.name, price: svc.price })}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              added ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                            }`}
                          >
                            {added ? <Trash2 size={18} /> : <Plus size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}

            {activeTab === 'products' && (
              products.length === 0 ? (
                <p className="text-center text-zinc-500 py-10 bg-[#0A0A0A] rounded-xl border border-dashed border-white/10">Nenhum produto na loja no momento.</p>
              ) : (
                products.map((prod) => {
                  const added = isInCart(prod.id, 'product');
                  return (
                    <div key={`prod-${prod.id}`} className={`bg-[#0A0A0A] border ${added ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'} rounded-xl p-4 transition-all duration-300 flex gap-4`}>
                      <div className="w-20 h-20 rounded-lg bg-zinc-900 border border-white/5 shrink-0 overflow-hidden flex items-center justify-center">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-zinc-700" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-100 line-clamp-1">{prod.name}</h3>
                          {prod.description && <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{prod.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-white">R$ {prod.price.toFixed(2)}</span>
                          <button 
                            onClick={() => toggleCartItem({ id: prod.id, type: 'product', name: prod.name, price: prod.price })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              added ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                            }`}
                          >
                            {added ? 'Remover' : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}

          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
        <button
          onClick={() => cart.length > 0 && setIsCartOpen(true)}
          disabled={cart.length === 0}
          className={`w-full flex items-center justify-between p-4 rounded-xl shadow-2xl transition-all duration-300 ${
            cart.length > 0 
              ? 'bg-gradient-to-r from-blue-600 to-sky-400 hover:from-blue-500 hover:to-sky-300 text-white border border-white/10 active:scale-[0.98]' 
              : 'bg-[#121214] border border-white/5 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center ${cart.length > 0 ? 'text-white' : 'text-zinc-600'}`}>
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-white text-blue-600 text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="font-bold text-sm tracking-wide">
              {cart.length > 0 ? `Finalizar carrinho (${cart.length})` : 'Carrinho vazio'}
            </span>
          </div>
          {cart.length > 0 && (
            <span className="font-extrabold text-sm tracking-wider">
              R$ {cartTotal.toFixed(2)}
            </span>
          )}
        </button>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div className="bg-[#0A0A0A] w-full max-w-md h-full md:h-[90vh] md:mt-[5vh] md:rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300 overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0 bg-[#0B0B0B]">
              <h3 className="font-bold text-base flex items-center gap-2 text-white">
                <ShoppingCart className="text-blue-500" size={18} /> Seu Pedido
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              
              <div className="space-y-2 mb-8">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Itens Selecionados</h4>
                <div className="bg-[#121214] border border-white/5 rounded-xl p-2 space-y-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        {item.type === 'service' ? <Scissors size={14} className="text-zinc-500"/> : <Package size={14} className="text-zinc-500"/>}
                        <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">R$ {item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 border-t border-white/5 mt-2">
                    <span className="text-sm font-bold text-zinc-400">Total</span>
                    <span className="text-lg font-extrabold text-blue-400">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <form id="checkout-form" onSubmit={handleConfirmar} className="space-y-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Dados do Agendamento</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Seu Nome</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
                      <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como gosta de ser chamado?" 
                        className="w-full bg-[#121214] border border-white/5 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">WhatsApp</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
                      <input type="tel" required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(41) 99999-0000" 
                        className="w-full bg-[#121214] border border-white/5 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Data</label>
                    <div className="relative">
                      <CalendarDays size={16} className="absolute left-3 top-3.5 text-zinc-500 pointer-events-none" />
                      <select required value={data} onChange={(e) => {
                          setData(e.target.value);
                          setHora(''); 
                        }} 
                        className="w-full bg-[#121214] border border-white/5 rounded-xl pl-9 pr-2 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition appearance-none cursor-pointer">
                        <option value="">Selecione a data</option>
                        {isMounted && gerarDatas().map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {data && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Horário Disponível</label>
                      {loadingSlots ? (
                        <div className="text-zinc-500 text-sm flex items-center gap-2">
                           <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> 
                           Verificando agenda...
                        </div>
                      ) : getAvailableTimeSlots().length === 0 ? (
                        <div className="text-amber-500 text-sm font-bold bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                          Agenda esgotada para este dia!
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {getAvailableTimeSlots().map((time) => (
                            <button 
                              key={time}
                              type="button"
                              onClick={() => setHora(time)}
                              className={`p-2 rounded-xl border text-sm transition-all ${
                                hora === time 
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                                  : 'border-white/10 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </form>

            </div>

            <div className="p-5 border-t border-white/5 bg-[#0B0B0B] shrink-0">
              <button
                type="submit"
                form="checkout-form"
                disabled={enviando || !hora}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
              >
                {enviando ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Check size={20} /> Confirmar Reserva
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}