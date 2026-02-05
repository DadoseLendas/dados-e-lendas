"use client";

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import CampanhasView from '@/components/CampanhasView';
import PersonagensView from '@/components/PersonagensView';
import PerfilView from '@/components/PerfilView';

export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState<string>('campanhas');

  return (
    <main className="min-h-screen bg-[#050a05] text-white">
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      <div className="max-w-[1200px] mx-auto py-12 px-6">
        {abaAtiva === 'campanhas' && <CampanhasView />}
        {abaAtiva === 'personagens' && <PersonagensView />}
        {abaAtiva === 'perfil' && <PerfilView />}
      </div>
    </main>
  );
}