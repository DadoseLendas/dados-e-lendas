"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Dices, MessageSquare, Eye, EyeOff, Clock, ChevronDown, UserSquare2, ChevronUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  campaign_id?: string;
  user_name: string;
  text: string;
  is_roll: boolean;
  is_secret: boolean;
  channel: string;
  created_at: string;
  sender_id?: string;
  receiver_id?: string;
}

interface ChatWidgetProps {
  campaignId: string;
  isDiceReady: boolean;
  onRollDice: (diceType: string) => Promise<number | null>;
}

export default function ChatWidget({ campaignId, isDiceReady, onRollDice }: ChatWidgetProps) {
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<'campanha' | 'geral' | 'mestre'>('campanha');
  const [isSecretRoll, setIsSecretRoll] = useState(false);
  
  const [isOpen, setIsOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  // SISTEMA DE "SUSSURROS" E IDENTIDADE
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Aventureiro");
  const [isDM, setIsDM] = useState(false);
  
  // Layout Profissional do Dropdown
  const [selectedReceiver, setSelectedReceiver] = useState<string>("dm"); // "dm" = Anotação privada
  const [isReceiverMenuOpen, setIsReceiverMenuOpen] = useState(false);
  const [campaignPlayers, setCampaignPlayers] = useState<any[]>([]); 

  // 1. Inicializa o Usuário, o Nome e os Jogadores
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      
      // Pega o nome do usuário (do metadata do cadastro)
      setCurrentUserName(user.user_metadata?.name || user.email?.split('@')[0] || "Aventureiro");

      if (campaignId && campaignId !== "00000000-0000-0000-0000-000000000000") {
        // Verifica se é o Mestre
        const { data: campaign } = await supabase.from('campaigns').select('dm_id').eq('id', campaignId).single();
        const userIsDM = campaign?.dm_id === user.id;
        setIsDM(userIsDM);
        
        // Se for o mestre, busca os jogadores reais da campanha para o Dropdown
        if (userIsDM) {
          const { data: members } = await supabase
            .from('campaign_members')
            .select(`
              user_id,
              profiles:user_id ( name )
            `)
            .eq('campaign_id', campaignId);
            
          if (members) {
            const formatPlayers = members.map((m: any) => ({
              id: m.user_id,
              name: m.profiles?.name || "Jogador"
            }));
            setCampaignPlayers(formatPlayers);
          }
        }
      }
    };
    initData();
  }, [supabase, campaignId]);

  // 2. Puxar Histórico E LIGAR O REALTIME
  useEffect(() => {
    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100);
      
      // Só filtra pela campanha se for um ID válido, senão traz tudo (para testes antigos)
      if (campaignId !== "00000000-0000-0000-0000-000000000000") {
        query = query.eq('campaign_id', campaignId);
      }

      const { data } = await query;
      if (data) {
        setMessages(data);
        prevMessagesLength.current = data.length;
      }
    };
    fetchMessages();

    // Isolamento Realtime: Só ouve mensagens desta campanha específica!
    const chatSubscription = supabase
      .channel(`chat_room_${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          // Ignora se for de outra campanha que vazou no realtime
          if (campaignId !== "00000000-0000-0000-0000-000000000000" && newMessage.campaign_id !== campaignId) return;

          setMessages((prev) => {
            if (prev.find((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      ).subscribe();

    return () => { supabase.removeChannel(chatSubscription); };
  }, [supabase, campaignId]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    } else if (messages.length > prevMessagesLength.current) {
      setUnreadCount((prev) => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isOpen, activeTab]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;
    
    const textToSend = inputText;
    setInputText(""); 

    let receiverId = null;
    if (activeTab === 'mestre') {
      if (isDM && selectedReceiver !== "dm") {
        receiverId = selectedReceiver; // Mestre mandou pro Jogador
      } else if (!isDM) {
        receiverId = null; // Jogador mandou pro Mestre (null = mestre)
      }
    }

    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== "00000000-0000-0000-0000-000000000000" ? campaignId : null,
      user_name: currentUserName, // NOME REAL AQUI
      text: textToSend,
      is_roll: false,
      is_secret: false,
      channel: activeTab,
      sender_id: currentUser.id,
      receiver_id: receiverId
    }]).select().single();

    if (data) setMessages((prev) => [...prev, data]);
  };

  const handleRollClick = async (diceType: string) => {
    if (!currentUser) return;
    const total = await onRollDice(diceType);
    if (!total) return;

    let text = `rolou um ${diceType}, resultado: ${total}`;
    let receiverId = null;
    let targetChannel = 'campanha';

    if (isSecretRoll) {
      text = `rolou os dados em segredo...`;
      targetChannel = 'mestre'; 
      receiverId = (isDM && selectedReceiver !== "dm") ? selectedReceiver : null;
    }

    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== "00000000-0000-0000-0000-000000000000" ? campaignId : null,
      user_name: currentUserName, // NOME REAL AQUI
      text: text,
      is_roll: true,
      is_secret: isSecretRoll,
      channel: targetChannel,
      sender_id: currentUser.id,
      receiver_id: receiverId
    }]).select().single();

    if (data) {
      if (isSecretRoll) data.text = `(SECRETO) rolou um ${diceType}, resultado: ${total}`;
      setMessages((prev) => [...prev, data]);
    }
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // FILTRO SEGURO DE VISIBILIDADE
  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'mestre') {
      const isMine = msg.sender_id === currentUser?.id; // Se eu rolei escondido, eu vejo.
      const isForMe = msg.receiver_id === currentUser?.id; // Se o mestre sussurrou pra mim, eu vejo.
      const isToDM = msg.receiver_id === null; // Se é msg genérica do/para o mestre.
      
      return msg.channel === 'mestre' && (isMine || isForMe || (isDM && isToDM));
    }
    return msg.channel === activeTab;
  });

  const dadosDisponiveis = [
    { nome: 'd20', cor: 'border-red-500 text-red-500 hover:bg-red-500/20' },
    { nome: 'd12', cor: 'border-orange-500 text-orange-500 hover:bg-orange-500/20' },
    { nome: 'd10', cor: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/20' },
    { nome: 'd8',  cor: 'border-green-500 text-green-500 hover:bg-green-500/20' },
    { nome: 'd6',  cor: 'border-blue-500 text-blue-500 hover:bg-blue-500/20' },
    { nome: 'd4',  cor: 'border-purple-500 text-purple-500 hover:bg-purple-500/20' },
    { nome: 'd100',cor: 'border-gray-400 text-gray-400 hover:bg-gray-500/20' },
  ];

  // Identifica o nome de quem está selecionado no Dropdown
  const getSelectedReceiverName = () => {
    if (selectedReceiver === "dm") return "Anotação Privada (Só Mestre)";
    const player = campaignPlayers.find(p => p.id === selectedReceiver);
    return player ? `Sussurro: ${player.name}` : "Selecionar Jogador...";
  };

  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">
      
      <div className={`w-[400px] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-[#1a2a1a] bg-[#050a05] transition-all duration-300 ease-in-out origin-bottom-right ${isOpen ? 'h-[75vh] opacity-100 scale-100 mb-4' : 'h-0 opacity-0 scale-95 mb-0 border-0'}`}>
        {/* Header do Chat */}
        <div className="bg-[#0a120a] border-b border-[#1a2a1a] px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-[#111] transition-colors" onClick={() => setIsOpen(false)}>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#00ff66]" />
            <h3 className="text-[#f1e5ac] text-xs font-serif italic tracking-widest uppercase">Chat da Mesa</h3>
          </div>
          <button className="text-[#4a5a4a] hover:text-[#00ff66] transition-colors"><ChevronDown size={18} /></button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[#1a2a1a] bg-[#050a05]">
          <button onClick={() => setActiveTab('campanha')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'campanha' ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Campanha</button>
          <button onClick={() => setActiveTab('geral')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'geral' ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Geral</button>
          <button onClick={() => setActiveTab('mestre')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'mestre' ? 'text-red-500 border-b-2 border-red-500 bg-red-900/10' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Mestre (Privado)</button>
        </div>

        {/* Mensagens */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-[#050a05] custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-[#4a5a4a] text-xs italic mt-20">O silêncio ecoa na taverna...</p>
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-[#4a5a4a] flex items-center gap-1 font-mono">
                    <Clock size={10} /> {formatTime(msg.created_at)}
                  </span>
                  {msg.channel === 'mestre' && msg.receiver_id && (
                    <span className="text-[8px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 uppercase font-bold tracking-widest">Sussurro</span>
                  )}
                </div>

                {msg.is_roll ? (
                  <div className={`border p-3 rounded-lg text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] ${msg.is_secret ? 'bg-red-900/20 border-red-500/50' : 'bg-[#1a2a1a] border-[#00ff66]/30'}`}>
                    <span className={`font-black block text-xs mb-1 uppercase tracking-widest ${msg.is_secret ? 'text-red-400' : 'text-[#00ff66]'}`}>{msg.user_name}</span>
                    <span className="text-white text-sm font-medium">{msg.text}</span>
                  </div>
                ) : (
                  <div className={`border p-3 rounded-xl rounded-tl-sm transition-colors ${msg.channel === 'mestre' ? 'border-red-900/50 bg-red-950/10' : 'border-[#1a2a1a] bg-[#0a120a] hover:border-[#4a5a4a]'}`}>
                    <span className={`font-black text-[11px] uppercase tracking-widest block mb-1 ${msg.channel === 'mestre' ? 'text-red-500' : 'text-[#f1e5ac]'}`}>{msg.user_name}</span>
                    <span className="text-[#e0e0e0] text-sm break-words leading-relaxed">{msg.text}</span>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input e Controles */}
        <div className="border-t border-[#1a2a1a] bg-[#0a120a] p-4 flex flex-col gap-3 relative">
          
          {/* O NOVO LAYOUT DO DROP DOWN DO MESTRE */}
          {activeTab === 'mestre' && isDM && (
            <div className="relative">
              <button 
                onClick={() => setIsReceiverMenuOpen(!isReceiverMenuOpen)}
                className="w-full flex items-center justify-between bg-[#1a2a1a]/50 hover:bg-[#1a2a1a] p-2.5 rounded-lg border border-[#333] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserSquare2 size={14} className="text-red-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e0e0e0]">{getSelectedReceiverName()}</span>
                </div>
                {isReceiverMenuOpen ? <ChevronDown size={14} className="text-[#4a5a4a]" /> : <ChevronUp size={14} className="text-[#4a5a4a]" />}
              </button>

              {isReceiverMenuOpen && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-[#0a120a] border border-[#1a2a1a] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.9)] overflow-hidden z-50">
                  <button 
                    onClick={() => { setSelectedReceiver("dm"); setIsReceiverMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#8a9a8a] hover:bg-[#1a2a1a] hover:text-white border-b border-[#1a2a1a]/50 transition-colors"
                  >
                    Anotação Privada (Só Mestre)
                  </button>
                  {campaignPlayers.map(player => (
                    <button 
                      key={player.id}
                      onClick={() => { setSelectedReceiver(player.id); setIsReceiverMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      Sussurrar para: {player.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mestre' && !isDM && (
             <p className="text-[9px] font-bold tracking-widest text-red-500/70 uppercase text-center flex items-center justify-center gap-1">
                <EyeOff size={10} /> Sussurrando para o Mestre
             </p>
          )}

          <div className="flex items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-1.5 flex-1 justify-center">
              {dadosDisponiveis.map((dado) => (
                <button key={dado.nome} onClick={() => handleRollClick(dado.nome)} disabled={!isDiceReady} className={`border ${dado.cor} bg-transparent py-1.5 px-2 rounded flex items-center gap-1 hover:scale-105 transition-all shadow-sm disabled:opacity-50`}>
                  <Dices size={12} /> <span className="text-[9px] font-bold uppercase">{dado.nome}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsSecretRoll(!isSecretRoll)} className={`p-2 rounded-lg border transition-colors flex-shrink-0 flex items-center justify-center ${isSecretRoll ? 'bg-red-900/30 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-transparent border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66] hover:text-[#00ff66]'}`} title="Rolagem Secreta">
              {isSecretRoll ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <form onSubmit={sendMessage} className="relative">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Mensagem...`} className="w-full bg-black border border-[#1a2a1a] rounded-lg py-2.5 pl-4 pr-10 text-white text-xs focus:outline-none focus:border-[#00ff66]" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00ff66] bg-[#1a2a1a] hover:text-black hover:bg-[#00ff66] transition-colors p-1.5 rounded-md">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="relative bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all group">
          <MessageSquare size={24} className="text-[#4a5a4a] group-hover:text-[#00ff66] transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#0a120a] border border-[#00ff66] text-[#00ff66] text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,102,0.5)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

    </div>
  );
}