import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionGuard from "./components/SessionGuard";
import CookieBanner from "./components/CookieBanner";
import { ToastProvider } from "@/shared/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dados e Lendas | D&D 5e VTT",
  description: "A plataforma brasileira completa para mestres e jogadores de D&D 5e.",
  icons: {
    icon: "logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050a05]`}>
        <SessionGuard />
        <ToastProvider>
          {children}
        </ToastProvider>
        {/* LGPD: banner de consentimento de cookies — exibido apenas na primeira visita */}
        <CookieBanner />
      </body>
    </html>
  );
}