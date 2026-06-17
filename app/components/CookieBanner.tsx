"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * LGPD Art. 8° + ePrivacy Directive: banner de consentimento de cookies.
 * Exibido apenas na primeira visita. Preferência salva em localStorage.
 * Não bloqueia o uso — apenas informa e registra o consentimento.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("dl_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("dl_cookie_consent", JSON.stringify({
      accepted: true,
      version: "1.0",
      timestamp: new Date().toISOString(),
    }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("dl_cookie_consent", JSON.stringify({
      accepted: false,
      version: "1.0",
      timestamp: new Date().toISOString(),
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-end justify-center p-4 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-[#1a2a1a] bg-[#050a05] shadow-[0_0_60px_rgba(0,0,0,0.85)]">
        {/* Filete de destaque no topo */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff66]/60 to-transparent" />

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldCheck size={15} className="text-[#00ff66] shrink-0" strokeWidth={2.5} />
            <h2 className="text-[#f1e5ac] text-[13px] font-serif italic tracking-[0.18em] uppercase">
              Privacidade &amp; Cookies
            </h2>
          </div>

          <p className="text-[12.5px] text-[#9aa99a] leading-relaxed">
            Utilizamos apenas cookies essenciais para autenticação e funcionamento da plataforma.
            Ao continuar, você concorda com a{" "}
            <Link href="/privacidade" className="text-[#00ff66] hover:underline underline-offset-2 font-semibold">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" className="text-[#00ff66] hover:underline underline-offset-2 font-semibold">
              Termos de Uso
            </Link>.
          </p>

          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              onClick={decline}
              className="px-5 py-2 rounded-lg border border-[#1a2a1a] text-[#6a7a6a] text-[11px] font-black uppercase tracking-[0.15em] hover:text-[#e0e0e0] hover:border-[#2a3a2a] transition-colors"
            >
              Recusar
            </button>
            <button
              onClick={accept}
              className="px-6 py-2 rounded-lg bg-[#00ff66] text-black text-[11px] font-black uppercase tracking-[0.15em] hover:brightness-110 transition-all"
            >
              Aceitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}