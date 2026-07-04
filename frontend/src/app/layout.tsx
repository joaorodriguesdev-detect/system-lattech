import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, UnifrakturMaguntia } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Ion — Barbearia | Agendamento & Gestão",
  description:
    "Sistema completo para barbearias: agendamento online, feed de trabalhos, avaliações e painel administrativo.",
  keywords: ["barbearia", "agendamento", "barbeiro", "corte", "gestão"],
  authors: [{ name: "Ion Sistemas" }],
  openGraph: {
    title: "Ion Sistemas — Sistema de Agendamento Online",
    description: "Agendamento online e gestão para sua barbearia",
    type: "website",
  },
};

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
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  );
}
