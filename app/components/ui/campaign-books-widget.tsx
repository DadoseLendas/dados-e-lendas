"use client";
import { useState, useEffect } from 'react';
import { Book, X, BookOpen, Plus, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import PdfReaderModal from '@/app/components/ui/pdf-reader-modal';

interface CampaignBook {
  id: string;
  title: string;
  pdf_url: string;
  cover_url: string;
}

interface CampaignBooksWidgetProps {
  campaignId: string;
}

export default function CampaignBooksWidget({ campaignId }: CampaignBooksWidgetProps) {
  const supabase = createClient();
  const [books, setBooks] = useState<CampaignBook[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Estados do Modal de Cadastro rápido
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPdfUrl, setNewPdfUrl] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  // Estados do Leitor de PDF
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activePdfTitle, setActivePdfTitle] = useState("");

  useEffect(() => {
    fetchCampaignBooks();
  }, [campaignId]);

  const fetchCampaignBooks = async () => {
    if (!campaignId || campaignId === "00000000-0000-0000-0000-000000000000") return;
    
    const { data } = await supabase
      .from('campaign_books')
      .select('id, title, pdf_url, cover_url')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (data) setBooks(data);
  };

  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Remover este livro da mesa?")) return;

    const { error } = await supabase.from('campaign_books').delete().eq('id', id);
    if (!error) setBooks(prev => prev.filter(b => b.id !== id));
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPdfUrl.trim()) return;

    if (books.length >= 3) {
      alert("Limite de 3 livros por campanha atingido.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Lógica de Capa: Link manual ou Miniatura do Drive
    let finalCoverUrl = newCoverUrl.trim();
    if (!finalCoverUrl && newPdfUrl.includes('drive.google.com')) {
      const match = newPdfUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || newPdfUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match) finalCoverUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }

    const { data, error } = await supabase.from('campaign_books').insert([{
      campaign_id: campaignId,
      user_id: user.id,
      title: newTitle,
      pdf_url: newPdfUrl,
      cover_url: finalCoverUrl || null
    }]).select().single();

    if (data) {
      setBooks(prev => [...prev, data]);
      setIsAddModalOpen(false);
      setNewTitle(""); setNewPdfUrl(""); setNewCoverUrl("");
    }
  };

  const openReader = (url: string, title: string) => {
    setActivePdfUrl(url);
    setActivePdfTitle(title);
    setIsReaderOpen(true);
    setIsOpen(false);
  };

  return (
    <>
      <div className="absolute left-6 top-1/2 translate-y-12 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] text-[#4a5a4a] hover:text-[#00ff66] p-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.6)] relative group"
        >
          <Book size={22} />
          <span className="absolute -top-2 -right-2 bg-[#0a120a] border border-[#00ff66] text-[#00ff66] text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-lg">
            {books.length}
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-16 top-0 w-72 bg-[#050a05] border border-[#1a2a1a] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-left-4 duration-200">
            <div className="bg-[#0a120a] border-b border-[#1a2a1a] px-4 py-3 flex items-center justify-between">
              <h3 className="text-[#00ff66] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} /> Biblioteca da Mesa
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-[#4a5a4a] hover:text-white"><X size={16} /></button>
            </div>
            
            <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {books.map(book => (
                <div 
                  key={book.id}
                  onClick={() => openReader(book.pdf_url, book.title)}
                  className="group flex items-center gap-3 p-2 rounded-lg bg-[#0a120a] border border-[#1a2a1a] hover:border-[#00ff66]/40 cursor-pointer transition-all"
                >
                  <div 
                    className="w-10 h-14 bg-[#111] rounded flex-shrink-0 border border-[#222] bg-cover bg-center shadow-inner" 
                    style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : {}}
                  >
                    {!book.cover_url && <Book size={12} className="text-[#1a2a1a] m-auto mt-4" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white text-[11px] font-bold truncate group-hover:text-[#00ff66] transition-colors">{book.title}</p>
                    <div className="flex gap-3 mt-2">
                       <button onClick={(e) => handleDeleteBook(e, book.id)} className="text-[#4a5a4a] hover:text-red-500 transition-colors" title="Remover"><Trash2 size={13} /></button>
                       <a href={book.pdf_url} target="_blank" onClick={(e) => e.stopPropagation()} className="text-[#4a5a4a] hover:text-blue-400 transition-colors" title="Link Externo"><ExternalLink size={13} /></a>
                    </div>
                  </div>
                </div>
              ))}

              {books.length < 3 && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-4 border-2 border-dashed border-[#1a2a1a] rounded-lg text-[#4a5a4a] hover:text-[#00ff66] hover:border-[#00ff66]/30 flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <Plus size={20} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Vincular Novo Tomo</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ADICIONAR (NA MESA) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#050a05] border border-[#1a2a1a] rounded-2xl w-full max-w-sm p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <h2 className="text-white font-black uppercase tracking-widest text-sm mb-6 border-b border-[#1a2a1a] pb-3 flex items-center gap-2">
              <Plus size={16} className="text-[#00ff66]" /> Novo Livro na Mesa
            </h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold uppercase text-[#4a5a4a] mb-1 block tracking-widest">Título</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Guia do Mestre" className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-xs focus:border-[#00ff66] outline-none transition-colors" required />
              </div>
              
              <div>
                <label className="text-[9px] font-bold uppercase text-[#4a5a4a] mb-1 block tracking-widest">Link do PDF (Google Drive)</label>
                <input type="url" value={newPdfUrl} onChange={(e) => setNewPdfUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-xs focus:border-[#00ff66] outline-none transition-colors" required />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-[#4a5a4a] mb-1 block tracking-widest flex items-center gap-1">
                  <ImageIcon size={10} /> Link da Capa (Opcional)
                </label>
                <input type="url" value={newCoverUrl} onChange={(e) => setNewCoverUrl(e.target.value)} placeholder="Link de imagem..." className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-3 text-white text-xs focus:border-[#00ff66] outline-none transition-colors" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-[#4a5a4a] border border-[#1a2a1a] rounded-lg hover:bg-[#1a2a1a] transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-[#00ff66] text-black rounded-lg hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]">Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PdfReaderModal isOpen={isReaderOpen} onClose={() => setIsReaderOpen(false)} title={activePdfTitle} pdfUrl={activePdfUrl} />
    </>
  );
}