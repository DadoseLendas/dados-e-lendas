"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/app/components/ui/navbar';
import { Book, Plus, Trash2, ExternalLink, BookOpen, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import PdfReaderModal from '@/app/components/ui/pdf-reader-modal';

interface CampaignBook {
  id: string;
  campaign_id: string;
  user_id: string;
  title: string;
  pdf_url: string;
  cover_url: string;
  created_at: string;
  campaigns?: { name: string };
}

interface Campaign {
  id: string;
  name: string;
}

export default function TelaDeLivros() {
  const supabase = createClient();
  const [books, setBooks] = useState<CampaignBook[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activePdfTitle, setActivePdfTitle] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPdfUrl, setNewPdfUrl] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  // 1. Busca Inicial
  useEffect(() => {
    const fetchLibraryData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Segurança: Puxa APENAS as campanhas onde o usuário atual é o Mestre (dm_id)
      const { data: myCampaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('dm_id', user.id);
      
      if (myCampaigns) {
        setCampaigns(myCampaigns);
        if (myCampaigns.length > 0) setSelectedCampaignId(myCampaigns[0].id);
      }

      const { data: myBooks } = await supabase
        .from('campaign_books')
        .select('*, campaigns(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (myBooks) setBooks(myBooks);
      setIsLoading(false);
    };

    fetchLibraryData();
  }, [supabase]);

  // Extrai miniatura oficial do Google Drive
  const getDriveThumbnail = (pdfUrl: string) => {
    try {
      const match = pdfUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
      }
      return null;
    } catch {
      return null;
    }
  };

  // 2. Adicionar Novo Livro
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPdfUrl.trim() || !selectedCampaignId) {
      alert("Preencha o título, o link do PDF e selecione uma campanha.");
      return;
    }

    const booksInThisCampaign = books.filter(b => b.campaign_id === selectedCampaignId).length;
    if (booksInThisCampaign >= 3) {
      alert("Limite atingido: Você já possui 3 livros associados a esta campanha.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let finalCoverUrl = newCoverUrl.trim();
    if (!finalCoverUrl) {
      const autoCover = getDriveThumbnail(newPdfUrl);
      if (autoCover) finalCoverUrl = autoCover;
    }

    const { data, error } = await supabase.from('campaign_books').insert([{
      campaign_id: selectedCampaignId,
      user_id: user.id,
      title: newTitle,
      pdf_url: newPdfUrl,
      cover_url: finalCoverUrl || null 
    }]).select('*, campaigns(name)').single();

    if (error) {
      console.error("Erro ao salvar livro:", error);
      alert("Ocorreu um erro ao salvar o livro.");
    } else if (data) {
      setBooks([data, ...books]);
      setIsAddModalOpen(false);
      setNewTitle(""); setNewPdfUrl(""); setNewCoverUrl("");
    }
  };

  // 3. Deletar Livro
  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover este livro da sua estante?")) return;

    await supabase.from('campaign_books').delete().eq('id', id);
    setBooks(books.filter(book => book.id !== id));
  };

  const openReader = (url: string, title: string) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
    setIsReaderOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a120a] font-sans flex flex-col relative text-white">
      <Navbar abaAtiva="livros" setAbaAtiva={() => {}} />

      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50 pointer-events-none z-0"></div>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 lg:p-12 relative z-10">
        
        {/* CABEÇALHO DA BIBLIOTECA */}
        <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-[#1a2a1a] pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-[#00ff66] flex items-center gap-3">
              <Book size={32} /> A Grande Biblioteca
            </h1>
            <p className="text-[#8a9a8a] text-sm mt-2 max-w-2xl">
              Gerencie seus compêndios, livros de regras e anotações. Você pode vincular até 3 livros por campanha.
            </p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#00ff66] text-[#050a05] px-5 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,102,0.3)] whitespace-nowrap"
          >
            <Plus size={16} /> Adicionar Tomo
          </button>
        </div>

        {/* =====================================================================
            NOVO AVISO GLOBAL SOBRE O GOOGLE DRIVE NA TELA PRINCIPAL
            ===================================================================== */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-start gap-3 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
          <Info size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-1">Como usar PDFs do Google Drive</h3>
            <p className="text-[#8a9a8a] text-sm leading-relaxed">
              Para que o leitor integrado funcione corretamente, certifique-se de que o compartilhamento do seu arquivo no Google Drive esteja configurado como <strong className="text-blue-300">"Qualquer pessoa com o link"</strong>. Links restritos serão bloqueados pela segurança do Google.
            </p>
          </div>
        </div>

        {/* ESTANTE VIRTUAL */}
        {isLoading ? (
          <p className="text-[#00ff66] animate-pulse text-center mt-20 font-mono">Consultando os pergaminhos...</p>
        ) : books.length === 0 ? (
          <div className="text-center mt-24 flex flex-col items-center">
            <BookOpen size={64} className="text-[#1a2a1a] mb-4" />
            <h3 className="text-[#4a5a4a] text-xl font-bold uppercase tracking-widest">Sua estante está vazia</h3>
            <p className="text-[#4a5a4a] text-sm mt-2 max-w-md">Adicione links de PDFs do seu Google Drive para começar a construir sua biblioteca de mestre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book) => (
              <div key={book.id} className="group relative bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] rounded-xl overflow-hidden shadow-lg transition-all hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,255,102,0.1)] flex flex-col">
                
                <div 
                  className="h-48 w-full bg-[#111] flex flex-col justify-end p-4 relative cursor-pointer"
                  onClick={() => openReader(book.pdf_url, book.title)}
                  style={book.cover_url ? { backgroundImage: `url(${book.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {!book.cover_url && <div className="absolute inset-0 bg-gradient-to-t from-[#0a120a] to-[#1a2a1a]"></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  
                  <div className="relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#00ff66] bg-[#00ff66]/10 px-2 py-0.5 rounded border border-[#00ff66]/30 mb-2 inline-block shadow-sm">
                      {book.campaigns?.name || "Mesa Desconhecida"}
                    </span>
                    <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 shadow-black drop-shadow-md">{book.title}</h3>
                  </div>
                </div>

                <div className="p-3 border-t border-[#1a2a1a] bg-[#0a120a] flex items-center justify-between">
                  <button onClick={() => openReader(book.pdf_url, book.title)} className="text-xs font-bold uppercase tracking-widest text-[#00ff66] hover:text-white transition-colors flex items-center gap-1.5">
                    <BookOpen size={14} /> Ler
                  </button>
                  <div className="flex gap-2">
                    <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#4a5a4a] hover:text-white transition-colors" title="Abrir link externo"><ExternalLink size={16} /></a>
                    <button onClick={() => handleDeleteBook(book.id)} className="text-[#4a5a4a] hover:text-red-500 transition-colors" title="Remover Livro"><Trash2 size={16} /></button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE ADICIONAR LIVRO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#050a05] border border-[#1a2a1a] rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 border-b border-[#1a2a1a] pb-4">Registrar Novo Livro</h2>
            
            <form onSubmit={handleAddBook} className="space-y-5">
              
              {/*LAYOUT SELEÇÃO DE CAMPANHAS*/}
              <div>
                <label className="block text-[#8a9a8a] text-[10px] font-bold uppercase tracking-widest mb-2">Vincular a qual das SUAS campanhas?</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {campaigns.length === 0 ? (
                    <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3">
                      <ShieldAlert size={20} className="text-red-500" />
                      <p className="text-xs text-red-400">Você ainda não é Mestre de nenhuma campanha. Crie uma primeiro para adicionar livros.</p>
                    </div>
                  ) : (
                    campaigns.map(camp => (
                      <div 
                        key={camp.id}
                        onClick={() => setSelectedCampaignId(camp.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          selectedCampaignId === camp.id 
                            ? 'bg-[#00ff66]/10 border-[#00ff66] shadow-[inset_0_0_10px_rgba(0,255,102,0.1)]' 
                            : 'bg-[#0a120a] border-[#1a2a1a] hover:border-[#4a5a4a]'
                        }`}
                      >
                        <ShieldCheck size={18} className={selectedCampaignId === camp.id ? 'text-[#00ff66]' : 'text-[#4a5a4a]'} />
                        <div>
                          <p className={`text-sm font-bold ${selectedCampaignId === camp.id ? 'text-[#00ff66]' : 'text-[#e0e0e0]'}`}>{camp.name}</p>
                          <p className="text-[10px] text-[#4a5a4a] uppercase tracking-widest">Mestre: Você</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#8a9a8a] text-[10px] font-bold uppercase tracking-widest mb-1.5">Título do Compêndio</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Livro do Jogador D&D 5e" className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-sm focus:border-[#00ff66] focus:outline-none" required />
              </div>

              <div>
                <label className="block text-[#8a9a8a] text-[10px] font-bold uppercase tracking-widest mb-1.5">Link do PDF (Google Drive)</label>
                <input type="url" value={newPdfUrl} onChange={(e) => setNewPdfUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-sm focus:border-[#00ff66] focus:outline-none" required />
                {/* AVISO DENTRO DO MODAL */}
                <p className="text-[10px] text-blue-400 mt-1.5 flex items-center gap-1 font-medium">
                  <Info size={12} /> Lembre-se: O link deve estar como "Qualquer pessoa com o link"
                </p>
              </div>

              <div>
                <label className="block text-[#8a9a8a] text-[10px] font-bold uppercase tracking-widest mb-1.5">Link da Capa (Opcional - Imagem JPG/PNG)</label>
                <input type="url" value={newCoverUrl} onChange={(e) => setNewCoverUrl(e.target.value)} placeholder="Deixe em branco para usar a miniatura automática" className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-sm focus:border-[#00ff66] focus:outline-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1a2a1a]">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-[#4a5a4a] hover:text-white border border-[#1a2a1a] rounded-lg hover:bg-[#1a2a1a] transition-colors">Cancelar</button>
                <button type="submit" disabled={!selectedCampaignId} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-[#050a05] bg-[#00ff66] rounded-lg hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,255,102,0.2)] disabled:opacity-50 disabled:cursor-not-allowed">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PdfReaderModal isOpen={isReaderOpen} onClose={() => setIsReaderOpen(false)} title={activePdfTitle} pdfUrl={activePdfUrl} />
    </div>
  );
}