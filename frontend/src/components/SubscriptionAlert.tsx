'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, X, CreditCard } from 'lucide-react';

interface SubscriptionAlertProps {
  status: 'trial' | 'active' | 'suspended';
  endDate: string | null;
  checkoutUrl?: string; // Se você já tiver a URL do checkout
}

export default function SubscriptionAlert({ status, endDate, checkoutUrl }: SubscriptionAlertProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; days: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!endDate || status === 'suspended') return;

    const calculateTime = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeLeft({ hours: 0, days: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setTimeLeft({ days, hours });

      // Se faltar menos de 24 horas (0 dias e horas > 0) e não foi fechado ainda, exibe o Modal!
      if (days === 0 && hours <= 24 && !dismissed) {
        setShowModal(true);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000 * 60 * 60); // Atualiza a cada hora

    return () => clearInterval(timer);
  }, [endDate, status, dismissed]);

  if (status === 'suspended') return null; // Se tá suspenso, a tela inteira já deve estar bloqueada
  if (!timeLeft) return null;

  const isCritical = timeLeft.days === 0 && timeLeft.hours <= 24;

  return (
    <>
      {/* BANNER FIXO NO TOPO (Aparece se faltar menos de 3 dias) */}
      {timeLeft.days <= 3 && !isCritical && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center gap-3 w-full z-40">
          <Clock size={16} className="text-amber-400" />
          <span className="text-sm font-medium text-amber-200">
            Seu plano expira em <strong className="text-amber-400">{timeLeft.days} dias</strong>.
          </span>
          <button className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold px-3 py-1 rounded-md transition">
            Renovar Agora
          </button>
        </div>
      )}

      {/* POP-UP CRÍTICO: MENOS DE 24 HORAS */}
      {showModal && isCritical && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121214] border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-500/10 w-full max-w-md p-6 relative animate-in zoom-in-95">
            <button 
              onClick={() => { setShowModal(false); setDismissed(true); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-rose-500 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Atenção! Seu plano está expirando.</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Faltam apenas <strong className="text-rose-400">{timeLeft.hours} horas</strong> para o seu acesso ser suspenso. Garanta a continuidade do seu sistema agora.
              </p>

              <button 
                onClick={() => checkoutUrl ? window.location.href = checkoutUrl : alert('Redirecionar para Pagamento')}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <CreditCard size={18} /> Assinar / Renovar Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}