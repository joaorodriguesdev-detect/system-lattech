import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================================
  // 1. ROTA DO SUPERADMIN (/superadmin)
  // ==========================================
  if (pathname.startsWith('/superadmin')) {
    // Libera a página de login para evitar loop infinito de redirecionamento
    if (pathname === '/superadmin/login') {
      return NextResponse.next();
    }
    
    // Captura o token de segurança
    const superToken = request.cookies.get('superadmin_token')?.value;
    
    // Validação Blindada: Se não existe token ou se está vazio, intercepta e chuta para o login.
    // (Removido o engessamento "==='authenticated'" para suportar JWTs reais no futuro)
    if (!superToken) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
    
    return NextResponse.next();
  }

  // ==========================================
  // 2. ROTA DO LOJISTA INQUILINO (/admin)
  // ==========================================
  if (pathname.startsWith('/admin')) {
    const accessToken = request.cookies.get('access_token')?.value;
    const tenantStatus = request.cookies.get('tenant_status')?.value || 'active';

    // Sem acesso = Redireciona para o login do inquilino
    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Tenant bloqueado/suspenso = Expulso da dashboard
    if (tenantStatus.toLowerCase() === 'suspended') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Injeta o token nos headers para as rotas subsequentes consumirem com segurança
    const response = NextResponse.next();
    response.headers.set('x-security-token', accessToken);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // O asterisco garante que qualquer sub-rota (ex: /superadmin/config) também seja interceptada
  matcher: ['/admin/:path*', '/superadmin/:path*'],
};