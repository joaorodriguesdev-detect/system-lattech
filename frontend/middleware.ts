import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ROTA DO DONO DO SAAS (/superadmin)
  if (pathname.startsWith('/superadmin')) {
    // Se já estiver na página de login, deixa passar
    if (pathname === '/superadmin/login') {
      return NextResponse.next();
    }
    
    // Verifica se tem o crachá de superadmin
    const superToken = request.cookies.get('superadmin_token')?.value;
    if (superToken !== 'authenticated') {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. ROTA DO BARBEIRO INQUILINO (/admin)
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

    const response = NextResponse.next();
    response.headers.set('x-security-token', accessToken);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/superadmin/:path*'],
};