"use client";
import { useState, useEffect, useRef } from 'react';
import { X, Upload, Search, ChevronLeft, ShieldCheck } from 'lucide-react';

interface GalleryToken {
  name: string;
  url: string;
  category: string;
}

interface TokenLibraryWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddToken: (token: { name: string; url: string }) => void;
  onUpload: (file: File) => void;
}

export default function TokenLibraryWidget({ isOpen, onToggle, onAddToken, onUpload }: TokenLibraryWidgetProps) {
  const [galleryTokens, setGalleryTokens] = useState<GalleryToken[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/assets/tokens/tokens.json')
      .then(r => r.json())
      .then(data => setGalleryTokens(Array.isArray(data) ? data : []))
      .catch(() => setGalleryTokens([]));
  }, []);

  const categories = Array.from(new Set(galleryTokens.map(t => t.category))).sort();

  const tokensInCategory = selectedCategory
    ? galleryTokens.filter(t =>
        t.category === selectedCategory &&
        (!search || t.name.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const handleClose = () => {
    setSelectedCategory(null);
    setSearch('');
    onToggle();
  };

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50">
      {isOpen && (
        <div className="w-72 bg-[#050a05] border border-[#1a2a1a] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[70vh]">

          {/* Header */}
          <div className="bg-[#0a120a] border-b border-[#1a2a1a] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <button
                  onClick={() => { setSelectedCategory(null); setSearch(''); }}
                  className="text-[#4a5a4a] hover:text-[#00ff66] transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              <h3 className="text-[#00ff66] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} />
                {selectedCategory ?? 'Tokens'}
              </h3>
            </div>
            <button onClick={handleClose} className="text-[#4a5a4a] hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Pastas */}
          {!selectedCategory && (
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {categories.length === 0 ? (
                <p className="text-[10px] text-[#4a5a4a] text-center py-6 leading-relaxed">
                  Nenhum token encontrado.<br/>
                  Gere o <span className="text-[#00ff66]/60">tokens.json</span> com o script.
                </p>
              ) : (
                categories.map(cat => {
                  const count = galleryTokens.filter(t => t.category === cat).length;
                  const preview = galleryTokens.find(t => t.category === cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-[#0a120a] border border-[#1a2a1a] hover:border-[#00ff66]/40 hover:bg-[#00ff66]/5 transition-all group text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-lg bg-neutral-900 shrink-0 border border-white/10"
                        style={preview?.url ? { backgroundImage: `url(${preview.url})`, backgroundSize: 'cover', backgroundPosition: '50% 50%' } : {}}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/70 group-hover:text-[#00ff66] truncate transition-colors leading-tight">{cat}</span>
                        <span className="text-[9px] text-[#4a5a4a]">{count} tokens</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Tokens da pasta */}
          {selectedCategory && (
            <>
              <div className="px-3 pt-2 pb-1 shrink-0">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a4a]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white outline-none focus:border-[#00ff66]/50 placeholder:text-[#4a5a4a]"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {tokensInCategory.length === 0 ? (
                  <p className="text-[10px] text-[#4a5a4a] text-center py-6">Nenhum resultado.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {tokensInCategory.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { onAddToken(t); handleClose(); }}
                        title={t.name}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-12 h-12 rounded-full border-2 border-white/10 group-hover:border-[#00ff66] group-hover:shadow-[0_0_10px_rgba(0,255,102,0.3)] transition-all bg-neutral-900"
                          style={{ backgroundImage: `url(${t.url})`, backgroundSize: 'cover', backgroundPosition: '50% 50%' }}
                        />
                        <span className="text-[7px] text-[#4a5a4a] group-hover:text-[#00ff66] truncate w-full text-center transition-colors">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Upload */}
          <div className="border-t border-[#1a2a1a] px-3 py-2 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="w-7 h-7 rounded-lg border border-[#1a2a1a] group-hover:border-[#00ff66]/50 bg-[#0a120a] flex items-center justify-center transition-all shrink-0">
                <Upload size={12} className="text-[#4a5a4a] group-hover:text-[#00ff66] transition-colors" />
              </div>
              <span className="text-[10px] text-[#4a5a4a] group-hover:text-[#00ff66] transition-colors">Upload personalizado</span>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { onUpload(file); handleClose(); }
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

