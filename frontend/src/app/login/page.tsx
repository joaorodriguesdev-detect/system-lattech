'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Zap, LogIn, Building2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function TenantLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados do White-Label (Personalização do Inquilino)
  const [companyName, setCompanyName] = useState('Carregando...');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Busca os dados da Barbearia pelo Link
  useEffect(() => {
    const hostname = window.location.hostname;
    let sub = 'mariobarber'; // Fallback
    
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
        if (data.name) setCompanyName(data.name); 
        if (data.logo_url) setCompanyLogo(data.logo_url);
      })
      .catch(err => {
        console.error("Erro ao descobrir empresa:", err);
        setCompanyName('Painel Administrativo');
      })
      .finally(() => {
        setLoadingCompany(false);
      });
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Padrão FastAPI (OAuth2PasswordRequestForm)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE_URL}/auth/login`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Salva o token de acesso (ajuste o nome da chave se necessário)
        document.cookie = `access_token=${data.access_token}; path=/; max-age=86400`;
        localStorage.setItem('access_token', data.access_token);

        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redireciona para o painel
        router.push('/admin');
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique se o servidor está online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-between p-6 relative overflow-hidden font-inter selection:bg-blue-500/30">
      
      {/* Background Cinematic */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Espaçador superior para centralizar o card */}
      <div className="flex-1" />

      {/* Card de Login Premium */}
      <main className="w-full max-w-md mx-auto bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-indigo-500" />
        
        <div className="p-8 sm:p-10 flex flex-col items-center">
          
          {/* Identidade Visual do Barbeiro (White-Label) */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
            <div className="w-20 h-20 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center relative overflow-hidden shadow-xl">
              {loadingCompany ? (
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={32} className="text-zinc-700" />
              )}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
            {companyName}
          </h1>
          <p className="text-zinc-500 text-xs mb-8 uppercase tracking-[0.2em] font-semibold text-center">
            Acesso da Administração
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Mail size={14} /> E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#0d0d0d] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Lock size={14} /> Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d0d0d] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 shadow-inner"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center py-3 rounded-xl font-medium animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full group relative flex items-center justify-center gap-2 mt-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out skew-x-12" />
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={18} className="relative z-10" /> <span className="relative z-10 uppercase tracking-widest">Acessar Painel</span></>
              )}
            </button>
          </form>
        </div>
      </main>

      <div className="flex-1" />

      {/* Nossa Assinatura Discreta e Elegante no Rodapé */}
      <footer className="w-full flex flex-col items-center justify-center gap-2 pb-4 pt-10 relative z-10">
        <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
          <div className="w-4 h-4 rounded-[4px] bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center">
            <Zap size={10} className="text-white" />
          </div>
          <span className="text-xs font-bold text-zinc-400 tracking-wider">Powered by LAT System</span>
        </div>
        <p className="text-[9px] text-zinc-600 font-medium tracking-[0.2em] uppercase">
          Desenvolvido por{' '}
          <a 
            href="https://instagram.com/joaorodriguesdev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sky-400/80 hover:text-sky-400 font-bold transition-colors"
          >
            @joaorodriguesdev
          </a>
        </p>
      </footer>

    </div>
  );
}