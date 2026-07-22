'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface PushNotificationButtonProps {
  token: string;
}

// Converte a chave pública VAPID (base64 urlsafe) pro formato que o
// navegador espera (Uint8Array). Função padrão usada em todo lugar que
// implementa Web Push.
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationButton({ token }: PushNotificationButtonProps) {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading');

  useEffect(() => {
    checkCurrentStatus();
  }, []);

  const checkCurrentStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      setStatus(existingSubscription ? 'subscribed' : 'unsubscribed');
    } catch (err) {
      console.error('Erro ao checar service worker:', err);
      setStatus('unsubscribed');
    }
  };

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');

      // Busca a chave pública VAPID no backend
      const keyResponse = await fetch(`${API_BASE_URL}/admin/push/vapid-public-key`);
      const { publicKey } = await keyResponse.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();

      await fetch(`${API_BASE_URL}/admin/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });

      setStatus('subscribed');
    } catch (err) {
      console.error('Erro ao ativar notificações:', err);
      setStatus('unsubscribed');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch(`${API_BASE_URL}/admin/push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setStatus('unsubscribed');
    } catch (err) {
      console.error('Erro ao desativar notificações:', err);
    }
  };

  if (status === 'loading') return null;

  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2">
        <BellOff size={14} />
        Notificações não suportadas neste navegador
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400 px-3 py-2">
        <BellOff size={14} />
        Notificações bloqueadas — habilite nas configurações do navegador
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={handleUnsubscribe}
        className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition-all"
      >
        <BellRing size={14} />
        Notificações ativadas
      </button>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      className="flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl hover:bg-blue-500/20 transition-all"
    >
      <Bell size={14} />
      Ativar notificações de novo agendamento
    </button>
  );
}
