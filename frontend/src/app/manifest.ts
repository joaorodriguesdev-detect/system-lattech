import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lattech System',
    short_name: 'Lattech',
    description: 'Gestão absoluta e automação para empresas',
    start_url: '/',
    display: 'standalone', // Isso faz o site abrir parecendo um app nativo, sem a barra do navegador!
    background_color: '#000000', // A cor de fundo da tela de carregamento
    theme_color: '#000000', // A cor da barra de status do celular
    icons: [
      {
        src: '/icon.png', // Lembre-se de ter um icon.png na pasta src/app/
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}