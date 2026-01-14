'use client';
import { useState, useEffect } from 'react';
import Card from '../components/Card';

export default function CampanhasPage() {
  const [mounted, setMounted] = useState(false);
  const [campanhas, setCampanhas] = useState<any[]>([]); // Começa vazio
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [imagem, setImagem] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const handleCriarCampanha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    const novaCampanha = {
      id: Date.now(),
      titulo: nome,
      data: new Date().toLocaleDateString('pt-BR'),
      papel: "Mestre", // Padrão para quem cria
      img: imagem || "https://images8.alphacoders.com/132/1322013.png" // Imagem padrão se vazio
    };

    setCampanhas([novaCampanha, ...campanhas]);
    setIsModalOpen(false);
    setNome('');
    setImagem('');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-zinc-300 font-sans">
      {/* Header */}
      <header className="bg-[#0a2410] px-8 py-4 flex justify-between items-center border-b border-green-900/30">
        <div className="flex items-center gap-3 font-serif text-white text-lg tracking-widest uppercase">
           Dados e Lendas
        </div>
        <nav className="flex gap-8 text-white/80 font-serif italic">
          <a href="#" className="hover:text-white">Campanhas</a>
          <a href="#" className="hover:text-white">Personagens</a>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto mt-12 px-6 pb-20">
        <div className="flex justify-between items-end mb-10 pb-4 border-b border-zinc-800/50">
          <h1 className="text-2xl font-serif text-zinc-100">
            Campanhas: <span className="text-green-600 font-bold">{campanhas.length}</span>/6
          </h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2a2a2a] border border-zinc-700 px-6 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-all shadow-md"
          >
            Criar campanha
          </button>
        </div>

        {/* Lista de Campanhas */}
        {campanhas.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 font-serif italic">Nenhuma campanha encontrada. Comece uma nova jornada!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {campanhas.map((c) => (
              <Card key={c.id} titulo={c.titulo} data={c.data} papel={c.papel} imagem={c.img} />
            ))}
          </div>
        )}
      </main>

      {/* MODAL BASEADO NO PROTÓTIPO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[400px] bg-[#1a1a1a] border-[1px] border-zinc-700 shadow-2xl overflow-hidden">
            
            {/* Cabeçalho do Modal com textura escura */}
            <div className="bg-[#2a2a2a] border-b border-zinc-800 p-4 text-center relative">
               <h2 className="text-xl font-serif font-bold text-zinc-100 tracking-wide">Criar Campanha</h2>
               <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-zinc-500 to-transparent opacity-30"></div>
            </div>

            <form onSubmit={handleCriarCampanha} className="p-8 flex flex-col gap-6">
              {/* Nome da Campanha */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 font-serif text-lg">Nome da campanha</label>
                <input 
                  required
                  type="text"
                  placeholder="Nome da campanha"
                  className="bg-[#0f1110] border border-zinc-800 p-3 text-zinc-200 outline-none focus:border-green-900 transition-colors"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              {/* Upload de Imagem (Simulado) */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 font-serif text-lg">Imagem</label>
                <div className="relative group cursor-pointer">
                   <input 
                    type="text"
                    placeholder="Cole a URL da imagem aqui"
                    className="bg-transparent border-none text-zinc-500 text-sm w-full focus:ring-0 outline-none"
                    value={imagem}
                    onChange={(e) => setImagem(e.target.value)}
                   />
                   <p className="text-zinc-500 text-sm italic mt-1">Inserir imagem</p>
                </div>
              </div>

              {/* Botão Criar Campanha */}
              <div className="mt-4 p-[2px] bg-zinc-800 border border-zinc-700 shadow-inner">
                <button 
                  type="submit"
                  className="w-full bg-[#0a4d0a] hover:bg-green-800 text-zinc-200 py-2.5 font-serif text-lg transition-colors border border-green-900"
                >
                  Criar campanha
                </button>
              </div>
              
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-center text-xs text-zinc-600 hover:text-zinc-400 uppercase tracking-widest"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#051a08] py-12 px-6 text-center">
          <p className="text-zinc-500 font-serif mb-4">Dados e lendas footer</p>
          <p className="max-w-2xl mx-auto text-[10px] text-zinc-600 leading-relaxed uppercase">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus mattis, libero vel convallis lacinia, 
            dui ante viverra ante, at elementum magna ex at nibh.
          </p>
      </footer>
    </div>
  );
}