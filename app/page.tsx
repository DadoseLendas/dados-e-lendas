'use client';
import { useState, useEffect } from 'react';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [imagem, setImagem] = useState('');

  useEffect(() => {
    setMounted(true);
    const salvas = localStorage.getItem('rpg-campanhas');
    if (salvas) setCampanhas(JSON.parse(salvas));
  }, []);

  if (!mounted) return null;

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    const nova = {
      id: Date.now(),
      titulo: nome,
      data: new Date().toLocaleDateString('pt-BR'),
      img: imagem || "https://images8.alphacoders.com/132/1322013.png"
    };
    const lista = [nova, ...campanhas];
    setCampanhas(lista);
    localStorage.setItem('rpg-campanhas', JSON.stringify(lista));
    setIsModalOpen(false);
    setNome(''); setImagem('');
  };

  return (
    <div style={{ backgroundColor: '#0b0b0b', color: 'white', minHeight: '100vh', margin: 0, fontFamily: 'serif' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: '#0a2410', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 50px', borderBottom: '1px solid rgba(0, 255, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '3px', fontWeight: 'bold' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: 'white', transform: 'rotate(45deg)' }}></div>
          DADOS E LENDAS
        </div>
        <nav>
          <span style={{ color: '#ccc', fontStyle: 'italic', marginLeft: '30px', cursor: 'pointer' }}>Campanhas</span>
          <span style={{ color: '#666', fontStyle: 'italic', marginLeft: '30px', cursor: 'pointer' }}>Personagens</span>
        </nav>
      </header>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1000px', margin: '50px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>CAMPANHAS: {campanhas.length}/6</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#2a2a2a', border: '1px solid #444', color: '#ddd', padding: '8px 20px', cursor: 'pointer' }}
          >
            Criar campanha
          </button>
        </div>

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' }}>
          {campanhas.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', border: '1px dashed #333', color: '#555', fontStyle: 'italic' }}>
              NENHUMA JORNADA INICIADA
            </div>
          )}
          {campanhas.map((c) => (
            <div key={c.id} style={{ height: '180px', borderRadius: '20px', backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.2)), url(${c.img})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #222' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>{c.titulo}</h3>
                <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Iniciada em: {c.data} | <strong>Mestre</strong></p>
              </div>
              <button style={{ alignSelf: 'flex-end', backgroundColor: 'white', color: 'black', border: 'none', padding: '8px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Acessar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#051a08', padding: '60px 20px', textAlign: 'center', marginTop: '100px', borderTop: '1px solid #111' }}>
        <p style={{ color: '#a5c6a5', fontStyle: 'italic', marginBottom: '20px' }}>Dados e lendas footer</p>
        <p style={{ maxWidth: '800px', margin: '0 auto', fontSize: '0.65rem', color: '#4d6b55', letterSpacing: '1px', lineHeight: '1.6' }}>
          LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT. PHASELLUS MATTIS, LIBERO VEL CONVALLIS LACINIA, DUI ANTE VIVRRA ANTE, AT ELEMENTUM MAGNA EX AT NIBH.
        </p>
      </footer>

      {/* MODAL  */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1a1a1a', width: '400px', border: '1px solid #333' }}>
            <div style={{ backgroundColor: '#333', padding: '15px', textAlign: 'center', borderBottom: '1px solid #111' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'black', fontWeight: 'bold' }}>Criar Campanha</h2>
            </div>
            <form onSubmit={handleCriar} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#888', fontSize: '1.1rem' }}>Nome da campanha</label>
                <input 
                  autoFocus
                  style={{ backgroundColor: '#0f1110', border: '1px solid #333', padding: '12px', color: 'white', outline: 'none' }}
                  value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da campanha" 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#888', fontSize: '1.1rem' }}>Imagem</label>
                <input 
                  style={{ backgroundColor: '#0f1110', border: '1px solid #333', padding: '12px', color: 'white', outline: 'none' }}
                  value={imagem} onChange={(e) => setImagem(e.target.value)} placeholder="URL da imagem" 
                />
                <span style={{ color: '#444', fontSize: '0.8rem', fontStyle: 'italic' }}>Inserir imagem</span>
              </div>
              <div style={{ border: '2px solid #333', padding: '2px', marginTop: '10px' }}>
                <button type="submit" style={{ width: '100%', backgroundColor: '#0a4d0a', color: 'white', border: '1px solid #0e630e', padding: '12px', fontSize: '1.1rem', cursor: 'pointer', fontFamily: 'serif' }}>
                  Criar campanha
                </button>
              </div>
              <div onClick={() => setIsModalOpen(false)} style={{ textAlign: 'center', color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer', marginTop: '10px' }}>
                Cancelar
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
