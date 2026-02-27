"use client";
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionGuard() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  useEffect(() => {
    // Não vigia o usuário se ele já estiver na tela de login ou cadastro
    if (pathname.startsWith('/login') || pathname.startsWith('/cadastro') || pathname.startsWith('/auth')) {
      return;
    }

    let lastActivityTime = Date.now();
    let isLoggingOut = false;

    const checkSessionAndHeartbeat = async () => {
      if (isLoggingOut) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // REGRA 1: Aba fechada por mais de 10 minutos
      // Só checa isso na montagem inicial (quando o código acabou de carregar)
      const lastHeartbeat = localStorage.getItem('dl_session_heartbeat');
      if (lastHeartbeat && !isLoggingOut) {
        const timeSinceClosed = Date.now() - parseInt(lastHeartbeat, 10);
        
        // Se a diferença for MAIOR que 10 minutos E MENOR que 1 ano (para evitar bugs de relógio)
        if (timeSinceClosed > TEN_MINUTES_MS && timeSinceClosed < 31536000000) {
          isLoggingOut = true;
          await handleLogout("Sessão expirada. Você ficou mais de 10 minutos com o pergaminho fechado.");
          return;
        }
      }

      // Loop de verificação que roda a cada 5 segundos
      const interval = setInterval(async () => {
        if (isLoggingOut) return;

        // REGRA 2: Inatividade com a aba aberta por 2 horas
        if (Date.now() - lastActivityTime > TWO_HOURS_MS) {
          isLoggingOut = true;
          clearInterval(interval);
          await handleLogout("Sessão expirada. Os deuses notaram sua ausência por 2 horas.");
          return;
        }

        // Bate o coração (Grava que o usuário está vivo e com a aba aberta)
        localStorage.setItem('dl_session_heartbeat', Date.now().toString());
      }, 5000);

      // Atualiza o tempo de atividade quando o usuário interage
      const resetActivity = () => {
        lastActivityTime = Date.now();
      };

      // Eventos que provam que o usuário está vivo na frente da tela
      // Usamos mousedown e keydown no lugar de mousemove para economizar processamento
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

      return () => {
        clearInterval(interval);
        events.forEach(e => window.removeEventListener(e, resetActivity));
      };
    };

    const cleanup = checkSessionAndHeartbeat();

    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [pathname, router, supabase]);

  const handleLogout = async (reason: string) => {
    // 1. Apaga os cookies de sessão no Supabase
    await supabase.auth.signOut();
    // 2. Limpa o coração
    localStorage.removeItem('dl_session_heartbeat');
    // 3. Joga para a tela de login com o motivo na URL
    router.push(`/login?reason=${encodeURIComponent(reason)}`);
  };

  return null; // Como é um guardião, ele é invisível.
}