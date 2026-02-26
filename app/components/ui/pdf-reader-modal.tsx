"use client";
import { X, ExternalLink, AlertCircle } from 'lucide-react';

interface PdfReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
}

export default function PdfReaderModal({ isOpen, onClose, title, pdfUrl }: PdfReaderModalProps) {
  if (!isOpen) return null;

  const getUniversalUrl = (url: string) => {
    try {
      if (url.includes('drive.google.com')) {
        // Extrai o ID do arquivo de qualquer URL do drive
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        
        if (match && match[1]) {
          const fileId = match[1];
          // proxy, força o uso da API 'viewer' que não exige cookies de terceira parte para evitar bloqueio da imagem do pdf por AdBlocks
          return `https://drive.google.com/viewerng/viewer?embedded=true&url=https://drive.google.com/uc?id=${fileId}&export=download`;
        }
      }
      
      if (url.includes('dropbox.com')) {
        return url.replace('dl=0', 'raw=1');
      }
      return url; 
    } catch {
      return url;
    }
  };

  const safeEmbedUrl = getUniversalUrl(pdfUrl);
  const isGoogleDrive = pdfUrl.includes('drive.google.com');

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      
      {/* Container Principal do Leitor */}
      <div className="w-full max-w-6xl h-full flex flex-col bg-[#050a05] border border-[#1a2a1a] rounded-xl shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a2a1a] bg-[#0a120a]">
          <h2 className="text-[#00ff66] font-bold tracking-widest uppercase text-sm flex items-center gap-2">
            📖 {title}
          </h2>
          
          <div className="flex items-center gap-3">
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#4a5a4a] hover:text-white transition-colors flex items-center gap-1 text-xs uppercase tracking-widest font-bold bg-[#1a2a1a] px-3 py-1.5 rounded-md"
              title="Abrir arquivo original em nova aba"
            >
              <ExternalLink size={14} /> Abrir Externo
            </a>
            
            <button 
              onClick={onClose}
              className="text-[#4a5a4a] hover:text-red-500 transition-colors p-1 ml-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Alerta para links que não são do Drive */}
        {!isGoogleDrive && (
          <div className="bg-yellow-900/20 border-b border-yellow-700/50 p-3 flex items-start gap-2 text-yellow-500 text-xs">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p>Este link não é do Google Drive. Se a tela abaixo ficar em branco, o site bloqueia a leitura. Use o botão <strong>"Abrir Externo"</strong>.</p>
          </div>
        )}

        {/* Área de Leitura Segura */}
        <div className="flex-grow w-full bg-[#111] relative">
          <iframe
            src={safeEmbedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay"
            title={`Leitor do PDF: ${title}`}
          ></iframe>
        </div>

      </div>
    </div>
  );
}