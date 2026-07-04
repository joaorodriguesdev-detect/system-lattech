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
  // Adicionamos o 'await' aqui!
  const headersList = await headers();
  const hostname = headersList.get("host") || "";

  // Se o acesso for pelo domínio do dono do SaaS, altera o título e as tags
  if (hostname.includes("app.lattech.com.br") || hostname.includes("localhost")) {
    return {
      title: "Ion Master Panel | SuperAdmin",
      description: "Painel de controle orbital e gerenciamento de assinaturas do sistema Ion.",
      robots: "noindex, nofollow", // Evita que o Google indexe sua página de Login mestre
    };
  }

  // Caso contrário, renderiza a metadata original da barbearia inquilina
  return {
    title: "LATTECH | Agendamento & Gestão",
    description:
      "Sistema completo para barbearias: agendamento online, feed de trabalhos, avaliações e painel administrativo.",
    keywords: ["barbearia", "agendamento", "barbeiro", "corte", "gestão"],
    authors: [{ name: "LATTECH Sistemas" }],
    openGraph: {
      title: "LATTECH Sistemas — Sistema de Agendamento Online",
      description: "Agendamento online e gestão para sua barbearia",
      type: "website",
    },
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