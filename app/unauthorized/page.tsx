'use client';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050a05] text-white p-6">
      <div className="bg-[#0a120a] border border-[#1a2a1a] p-10 rounded-xl max-w-md text-center shadow-[0_0_50px_rgba(255,0,0,0.1)]">
        
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-900/20 rounded-full border border-red-900/50">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-serif font-bold text-red-500 mb-4 tracking-widest uppercase italic">
          Acesso Negado
        </h1>
        
        <p className="text-[#8a9a8a] mb-8 text-sm leading-relaxed">
          As runas de proteção impedem sua passagem. Você precisa estar autenticado para acessar o Dashboard.
        </p>

        <button 
          onClick={() => router.push('/login')}
          className="w-full bg-[#00ff66] text-black font-black py-3 rounded-lg text-sm uppercase tracking-widest hover:bg-[#00cc52] shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all"
        >
          Ir para Login
        </button>
      </div>
    </div>
  );
}