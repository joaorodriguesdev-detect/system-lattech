import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. ANÁLISE DE INFRAESTRUTURA: Captura o domínio acessado (ex: app.lattech.com.br)
  const hostname = request.headers.get("host") || "";
  
  // Define se é o ecossistema principal do SaaS (onde o inquilino não deve ser buscado)
  const isRootDomain = 
    hostname.includes("app.lattech.com.br") || 
    hostname.includes("localhost") ||
    hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  // Cria um clone dos headers para injetarmos informações nativas para o Next.js
  const requestHeaders = new Headers(request.headers);
  if (isRootDomain) {
    requestHeaders.set("x-is-root-domain", "true");
  }

  // 2. ROTA DO DONO DO SAAS (/superadmin)
  if (pathname.startsWith('/superadmin')) {
    // Se já estiver na página de login, deixa passar repassando os headers modificados
    if (pathname === '/superadmin/login') {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    
    // Verifica se tem o crachá de superadmin
    const superToken = request.cookies.get('superadmin_token')?.value;
    if (superToken !== 'authenticated') {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. ROTA DO BARBEIRO INQUILINO (/admin)
  if (pathname.startsWith('/admin')) {
    const accessToken = request.cookies.get('access_token')?.value;
    const tenantStatus = request.cookies.get('tenant_status')?.value || 'active';

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const normalizedStatus = tenantStatus.toLowerCase();
    if (normalizedStatus === 'suspended') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Injeta o token de segurança na requisição para a API
    requestHeaders.set('x-security-token', accessToken);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Rotação padrão para qualquer outra página
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Aumentamos o escopo do matcher para ele rodar na raiz e capturar o host corretamente
  matcher: ['/admin/:path*', '/superadmin/:path*', '/'],
};