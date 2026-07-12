import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  // 1. ROTA DO SUPERADMIN (Lattech)
  if (host.includes('app.lattech.com.br') || host.includes('localhost')) {
    return {
      name: 'Ion Master Panel',
      short_name: 'Lattech',
      description: 'Painel de controle orbital e gerenciamento de assinaturas.',
      start_url: '/superadmin',
      display: 'standalone',
      background_color: '#050505',
      theme_color: '#8B5CF6',
      icons: [
        { src: '/icon.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      ],
    };
  }

  // 2. ROTA DINÂMICA DOS TENANTS (Barbearias)
  try {
    // Substitua pela URL real da sua API FastAPI
    // Comunicação direta e ultra-rápida dentro do servidor Ubuntu
    const apiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${apiUrl}/api/v1/tenants/lookup?domain=${host}`, {
    next: { revalidate: 3600 } 
    });
    
    if (!response.ok) throw new Error('Tenant não encontrado');
    
    const tenant = await response.json();

    return {
      name: tenant.name,
      short_name: tenant.slug,
      description: `Aplicativo oficial de agendamento - ${tenant.name}`,
      start_url: '/',
      display: 'standalone',
      background_color: tenant.theme_color || '#000000',
      theme_color: tenant.theme_color || '#000000',
      icons: [
        {
          src: tenant.logo_url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable', // <-- Alterado aqui!
        },
        {
          src: tenant.logo_url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable', // <-- Alterado aqui!
        },
      ],
    };
  } catch (error) {
    // 3. FALLBACK DE SEGURANÇA (Caso a API esteja fora do ar)
    return {
      name: 'Barbearia App',
      short_name: 'Agendar',
      start_url: '/',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
    };
  }
}