'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function SuperAdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ⚠️ SUBSTITUA 'sua-senha-mestra' PELA SENHA QUE VOCÊ QUISER USAR
    if (password === 'sua-senha-mestra') { 
      // Injeta o crachá de acesso que o seu middleware.ts exige!
      document.cookie = "superadmin_token=authenticated; path=/; max-age=86400";
      
      // Redireciona para o painel
      router.push('/superadmin');
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white relative overflow-hidden px-4">
      
      {/* Background Glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-violet-600 opacity-20 blur-[120px]"></div>
      </div>

      <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-zinc-400">
            Ion Master Panel
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Acesso Restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full bg-zinc-900/50 border ${error ? 'border-red-500' : 'border-white/10'} rounded-xl p-4 text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none transition-colors`}
              placeholder="Digite a senha mestra..."
            />
            {error && <p className="text-red-400 text-xs mt-2 ml-1">Senha incorreta. Acesso negado.</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] uppercase tracking-wider text-sm"
          >
            Autenticar
          </button>
        </form>
      </div>
    </div>
  );
}