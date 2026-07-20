'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 🚀 Agora fazendo a chamada real para o seu backend FastAPI
      const res = await fetch(`${API_BASE_URL}/system/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Credenciais inválidas.');
      }
      
      const token = data.access_token;

      // Seta o cookie que o nosso middleware.ts está vigiando
      document.cookie = `superadmin_token=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      // Redireciona para o painel de controle orbital
      router.push('/superadmin');

    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans flex items-center justify-center relative overflow-hidden selection:bg-emerald-500/30 font-inter p-4">
      {/* Background Épico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-white/10 mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-500 ease-out" />
            <ShieldAlert size={32} className="text-white relative z-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Acesso Restrito</h1>
          <p className="text-sm text-zinc-500 mt-1 uppercase tracking-[0.2em] font-semibold">Lattech Panel</p>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in zoom-in-95">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail Administrativo</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@lattech.com.br" 
                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:bg-[#111] transition-all duration-300 shadow-inner" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Token Mestre (Senha)</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:bg-[#111] transition-all duration-300 shadow-inner" 
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full group relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden mt-8"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out skew-x-12" />
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Autenticando...</>
              ) : (
                <span className="flex items-center gap-2">
                  Acessar Central <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-zinc-600 text-[10px] uppercase tracking-widest mt-8 font-semibold">
          Conexão Segura • IP Registrado
        </p>
      </div>
    </div>
  );
}