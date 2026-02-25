"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/app/components/ui/navbar';
import { Send, Dices, MessageSquare, ScrollText } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import FichaModal from '@/app/components/ui/ficha-modal';

interface Message {
  id: string;
  user_name: string;
  text: string;
  is_roll: boolean;
  created_at: string;
}

const diceColors: Record<string, string> = {
  d20: "#ef4444", d12: "#f97316", d10: "#eab308", d8: "#22c55e", d6: "#3b82f6", d4: "#a855f7", d100: "#6b7280",
};

export default function TelaDeMesa() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [diceBox, setDiceBox] = useState<any>(null);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const initializedRef = useRef(false);

  // Ficha do personagem
  const [showFicha, setShowFicha] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  
  // REFERÊNCIA PARA O TIMEOUT: Para evitar que uma rolagem limpe a outra
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Busca o personagem vinculado à campanha ativa do usuário
  useEffect(() => {
    const fetchLinkedCharacter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('campaign_members')
        .select('current_character_id')
        .eq('user_id', user.id)
        .not('current_character_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.current_character_id) setFichaCharacterId(data.current_character_id);
    };
    fetchLinkedCharacter();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [supabase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
    // Dá um tempo maior para o layout do Next.js estabilizar
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const { default: DiceBox } = await import('@3d-dice/dice-box');
        
        const box = new DiceBox({
        container: "#dice-box",
        assetPath: "/dice-box-assets/assets/",
        theme: "default",
        scale: 11,
        gravity: 5.5,
        spinForce: 2,
        throwForce: 4.7,
        // FORÇAR DIMENSÕES INICIAIS
        // Pegamos o tamanho real da div pai no momento da criação
        width: document.getElementById('dice-box')?.clientWidth || window.innerWidth,
        height: document.getElementById('dice-box')?.clientHeight || window.innerHeight,
        });

        await box.init();

        // Re-dispara o resize para garantir que o motor de física entenda o novo tamanho
        window.dispatchEvent(new Event('resize'));

        setDiceBox(box);
        setIsDiceReady(true);
    } catch (error) {
        console.error("Erro ao inicializar DiceBox:", error);
    }
    };

    initDice();
  }, []);

  const handleRollDice = async (diceType: string) => {
    if (!diceBox) return;
    
    // 1. CANCELA QUALQUER LIMPEZA AGENDADA
    // Se você clicar rápido, o cronômetro da limpeza anterior é parado aqui
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    try {
      const diceColor = diceColors[diceType] || "#ffffff";
      const sidesValue = parseInt(diceType.replace('d', ''));
      
      // REMOVIDO: diceBox.clear() daqui para não interromper animações em curso

      // 2. ROLA O DADO (O await espera ele parar)
      const result = await diceBox.roll([{
        qty: 1,
        sides: sidesValue,
        themeColor: diceColor
      }]);
      
      const total = result[0].value;
      const { data } = await supabase.from('chat_messages').insert([{
        user_name: "Você (Mestre)",
        text: `rolou um ${diceType}, resultado: ${total}`,
        is_roll: true
      }]).select().single();

      if (data) setMessages((prev) => [...prev, data]);

      // 3. AGENDA A LIMPEZA (Debounce)
      // A mesa só será limpa 2 segundos depois que o ÚLTIMO dado parar
      cleanupTimeoutRef.current = setTimeout(() => {
        diceBox.clear();
        cleanupTimeoutRef.current = null;
      }, 2000);

    } catch (error) {
      console.error("Erro ao rolar:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText("");
    const { data } = await supabase.from('chat_messages').insert([{
      user_name: "Você (Mestre)",
      text: textToSend,
      is_roll: false
    }]).select().single();
    if (data) setMessages((prev) => [...prev, data]);
  };

  const dadosDisponiveis = [
    { nome: 'd20', cor: 'border-red-500 text-red-500 hover:bg-red-500/20' },
    { nome: 'd12', cor: 'border-orange-500 text-orange-500 hover:bg-orange-500/20' },
    { nome: 'd10', cor: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/20' },
    { nome: 'd8',  cor: 'border-green-500 text-green-500 hover:bg-green-500/20' },
    { nome: 'd6',  cor: 'border-blue-500 text-blue-500 hover:bg-blue-500/20' },
    { nome: 'd4',  cor: 'border-purple-500 text-purple-500 hover:bg-purple-500/20' },
    { nome: 'd100',cor: 'border-gray-400 text-gray-400 hover:bg-gray-500/20' },
  ];

  return (
    <div className="h-screen w-screen bg-[#0a120a] overflow-hidden flex flex-col relative font-sans">
      
      <style jsx global>{`
        #dice-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100% !important;
            height: 100% !important;
        }

        #dice-box canvas {
            /* O segredo está aqui: ignorar os pixels fixos da lib */
            width: 50% !important; 
            height: 50% !important;
            object-fit: contain; /* Garante que o aspecto 3D não distorça */
            position: absolute !important;
            top: 25%;
            left: 25%;
        }
        `}</style>

      <div className="relative z-50">
        <Navbar abaAtiva="campanhas" setAbaAtiva={() => {}} />
      </div>

      <div className="flex-grow relative w-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] z-10">
        <div 
            id="dice-box" 
            className="absolute inset-0 w-full h-full flex items-center justify-center z-40"
            style={{ width: '50vw', height: '50%' }}
        >
        </div>

        {!isDiceReady && (
          <div className="flex h-full w-full items-center justify-center">
             <p className="text-[#00ff66] animate-pulse">Conjurando dados mágicos...</p>
          </div>
        )}
      </div>

      {/* Botão Ficha — canto esquerdo */}
      {fichaCharacterId && (
        <button
          onClick={() => setShowFicha(true)}
          title="Ver Ficha do Personagem"
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] text-[#4a5a4a] hover:text-[#00ff66] p-4 rounded-xl transition-all group shadow-[0_0_20px_rgba(0,0,0,0.6)]"
        >
          <ScrollText size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 opacity-60 group-hover:opacity-100 transition-opacity">
            Ficha
          </span>
        </button>
      )}

      <div className="absolute bottom-6 right-6 z-50">
        <div className="w-[400px] h-[70vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-[#1a2a1a] bg-[#050a05]">
          <div className="bg-[#0a120a] border-b border-[#1a2a1a] px-5 py-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-[#00ff66]" />
            <h3 className="text-white text-sm font-bold uppercase tracking-widest">Chat da Mesa</h3>
          </div>

          <div className="flex-grow overflow-y-auto p-5 space-y-5 bg-[#050a05]">
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                {msg.is_roll ? (
                  <div className="bg-[#1a2a1a] border border-[#00ff66]/30 p-3 rounded-lg text-center shadow-[inset_0_0_10px_rgba(0,255,102,0.05)]">
                    <span className="text-[#8a9a8a] font-bold block text-xs mb-1 uppercase tracking-widest">{msg.user_name}</span>
                    <span className="text-white text-base">{msg.text}</span>
                  </div>
                ) : (
                  <div className="border border-[#00ff66] bg-transparent p-3.5 rounded-2xl rounded-tl-sm shadow-[0_0_10px_rgba(0,255,102,0.05)]">
                    <span className="text-[#00ff66] font-bold text-xs uppercase tracking-widest block mb-1">{msg.user_name}</span>
                    <span className="text-[#e0e0e0] break-words leading-relaxed">{msg.text}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-[#1a2a1a] bg-[#0a120a] p-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {dadosDisponiveis.map((dado) => (
                <button
                  key={dado.nome}
                  onClick={() => handleRollDice(dado.nome)}
                  disabled={!isDiceReady}
                  className={`border ${dado.cor} bg-transparent py-1.5 px-2.5 rounded-lg flex items-center gap-1 hover:scale-105 transition-all shadow-sm disabled:opacity-50`}
                >
                  <Dices size={14} />
                  <span className="text-[10px] font-bold uppercase">{dado.nome}</span>
                </button>
              ))}
            </div>
            <form onSubmit={sendMessage} className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Fale com o grupo..."
                className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:border-[#00ff66]"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ff66] bg-[#1a2a1a] p-1.5 rounded-md">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <FichaModal
        isOpen={showFicha}
        onClose={() => setShowFicha(false)}
        characterId={fichaCharacterId}
      />
    </div>
  );
}