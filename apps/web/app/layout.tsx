import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPJ Cobranca AI Agent",
  description: "Painel administrativo do agente IA CPJ Cobranca",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
