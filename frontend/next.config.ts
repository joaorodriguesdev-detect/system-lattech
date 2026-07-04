import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite qualquer subdomínio *.lvh.me no modo dev (ex: fluxbarber.lvh.me:3000)
  // Next.js suporta glob patterns: *.lvh.me casa com qualquer subdomínio
  allowedDevOrigins: [
    '192.168.1.1',
    'localhost:3000',
    '*.lvh.me',
  ],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '*.lvh.me', port: '8000', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;