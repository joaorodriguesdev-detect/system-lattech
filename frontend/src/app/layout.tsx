import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, UnifrakturMaguntia } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const unifrakturMaguntia = UnifrakturMaguntia({
  variable: "--font-unifraktur",
  weight: "400",
  subsets: ["latin"],
});

// 🔥 SOLUÇÃO: Transformamos a Metadata em Dinâmica para ler o domínio acessado 🔥
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Lógica do SuperAdmin
  if (host.includes("app.lattech.com.br") || host.includes("localhost")) {
    return {
      title: "Ion Master Panel | SuperAdmin",
      description: "Painel de controle orbital e gerenciamento de assinaturas.",
      robots: "noindex, nofollow",
    };
  }

  // Lógica Dinâmica da Barbearia
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/v1/tenants/lookup?domain=${host}`);
    
    if (response.ok) {
      const tenant = await response.json();
      return {
        title: `${tenant.name} | Agendamento & Gestão`,
        description: `Agendamento online oficial para ${tenant.name}.`,
        icons: {
          icon: tenant.logo_url,
          apple: tenant.logo_url,
        },
        openGraph: {
          title: tenant.name,
          images: [tenant.logo_url],
        }
      };
    }
  } catch (error) {
    console.error("Erro ao carregar tenant na metadata", error);
  }

  // Fallback se algo der errado
  return {
    title: "Agendamento | Barbearia",
    description: "Sistema de agendamento online.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plusJakarta.variable} ${unifrakturMaguntia.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}