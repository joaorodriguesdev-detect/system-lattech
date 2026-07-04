'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/session';
import DashboardView from '@/app/admin/views/DashboardView'; // Verifique se o caminho está correto conforme seu explorador

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = getAuthToken();
    if (!t) {
      router.replace('/login');
    } else {
      setToken(t);
    }
  }, [router]);

  if (!token) return null;

  return (
    <div className="p-6">
      {/* Aqui carregamos o seu Dashboard real com os dados do backend */}
      <DashboardView 
        token={token} 
        onUnauthorized={() => router.push('/login')} 
        onSuspended={() => router.push('/assinatura-pendente')} 
      />
    </div>
  );
}