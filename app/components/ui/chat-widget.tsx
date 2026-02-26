"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Dices, MessageSquare, Eye, EyeOff, Clock, ChevronDown, UserSquare2 } from 'lucide-react';
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

  // SISTEMA DE "SUSSURROS" - PRIVADO
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDM, setIsDM] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState<string>("dm"); // "dm" ou ID do jogador
  const [campaignPlayers, setCampaignPlayers] = useState<any[]>([]); // Lista de jogadores para o select

  // 1. Inicializa o Usuário e verifica se é o Mestre
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        
        // Verifica se o usuário atual é o Mestre da campanha
        if (campaignId !== "00000000-0000-0000-0000-000000000000") {
          const { data: campaign } = await supabase.from('campaigns').select('dm_id').eq('id', campaignId).single();
          if (campaign && campaign.dm_id === user.id) {
            setIsDM(true);
            
            // TODO Futuro: Buscar os jogadores reais da campanha na tabela profiles/campaign_members
            // Por enquanto, vou mockar 2 jogadores para você testar a interface
            // Melhorar a interface de seleção
            setCampaignPlayers([
              { id: "id-jogador-1", name: "Felipe (Ladino)" },
              { id: "id-jogador-2", name: "Maria (Maga)" }
            ]);
          }
        } else {
          // Apenas para testes visuais enquanto o ID é o padrão
          setIsDM(true); 
          setCampaignPlayers([
            { id: "id-jogador-1", name: "Felipe (Ladino)" },
            { id: "id-jogador-2", name: "Maria (Maga)" }
          ]);
        }
      }
    };
    initUser();
  }, [supabase, campaignId]);

  
  // 2. Puxar Histórico E "LIGAR" O REALTIME
  useEffect(() => {
    // Busca inicial ao carregar a página
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        // .eq('campaign_id', campaignId) // Descomentar ao usar id reais
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data);
        prevMessagesLength.current = data.length;
      }
    };
    fetchMessages();

    // REAL TIME SUPABASE
    // Cria um canal que ouve o banco de dados
    const chatSubscription = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages' 
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          setMessages((prev) => {
            // Prevenção de Duplicatas: Se eu mesmo enviei, o React já adicionou localmente.
            // Ignoramos a mensagem que vem do servidor se o ID já estiver na tela.
            if (prev.find((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    // Função de limpeza: Quando o jogador sair da mesa, desliga o "ouvido" do banco.
    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [supabase, campaignId]);

  // 3. Notificações
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

    // Lógica de Destinatário
    let receiverId = null;
    if (activeTab === 'mestre') {
      if (isDM && selectedReceiver !== "dm") {
        receiverId = selectedReceiver; // Mestre mandando pra um jogador específico
      } else if (!isDM) {
        receiverId = "dm"; // Jogador mandando pro Mestre (trataremos "dm" como null ou ID do mestre depois) -> VERIFICAR
      }
    }

    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== "00000000-0000-0000-0000-000000000000" ? campaignId : null,
      user_name: "Você", // Futuro: currentUser.user_metadata.name -> VERIFICAR
      text: textToSend,
      is_roll: false,
      is_secret: false,
      channel: activeTab,
      sender_id: currentUser.id,
      receiver_id: receiverId === "dm" ? null : receiverId // Null = vai pro mestre -> VERIFICAR
    }]).select().single();

    if (data) setMessages((prev) => [...prev, data]);
  };

  const handleRollClick = async (diceType: string) => {
    if (!currentUser) return;
    const total = await onRollDice(diceType);
    if (!total) return;

    let text = `rolou um ${diceType}, resultado: ${total}`;
    
    // 1. Lógica do Destinatário e Canal
    let receiverId = null;
    let targetChannel = 'campanha';

    // 2. Se for rolagem secreta, força ir para a aba do Mestre
    if (isSecretRoll) {
      text = `rolou os dados em segredo...`;
      targetChannel = 'mestre'; // VERIFICAR PARA QUE APENAS O MESTRE LEIA AS MENSAGENS DE ROLAGENS SECRETAS
      
      // Se eu sou o mestre, posso mandar a rolagem secreta pra mim mesmo ("dm") 
      // ou para um jogador selecionado no dropdown.
      receiverId = (isDM && selectedReceiver !== "dm") ? selectedReceiver : null;
    }

    // 3. Insere no banco com o canal forçado
    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== "00000000-0000-0000-0000-000000000000" ? campaignId : null,
      user_name: "Você",
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
  
  //  FILTRO DE PRIVACIDADE DO FRONT-END
  const filteredMessages = messages.filter(msg => {
    // 1. Regra da Aba Mestre (Privacidade Estrita)
    if (activeTab === 'mestre') {
      const isMine = msg.sender_id === currentUser?.id;
      const isForMe = msg.receiver_id === currentUser?.id;
      const isToDM = msg.receiver_id === null; // null significa "para o Mestre"
      
      return msg.channel === 'mestre' && (isMine || isForMe || (isDM && isToDM));
    }
    
    // 2. Regra das outras abas (Campanha e Geral)
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

  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">
      
      <div className={`w-[400px] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-[#1a2a1a] bg-[#050a05] transition-all duration-300 ease-in-out origin-bottom-right ${isOpen ? 'h-[75vh] opacity-100 scale-100 mb-4' : 'h-0 opacity-0 scale-95 mb-0 border-0'}`}>
        <div className="bg-[#0a120a] border-b border-[#1a2a1a] px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-[#111] transition-colors" onClick={() => setIsOpen(false)}>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#00ff66]" />
            <h3 className="text-white text-xs font-bold uppercase tracking-widest">Chat da Mesa</h3>
          </div>
          <button className="text-[#4a5a4a] hover:text-[#00ff66] transition-colors"><ChevronDown size={18} /></button>
        </div>

        <div className="flex border-b border-[#1a2a1a] bg-[#050a05]">
          <button onClick={() => setActiveTab('campanha')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'campanha' ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Campanha</button>
          <button onClick={() => setActiveTab('geral')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'geral' ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Geral</button>
          <button onClick={() => setActiveTab('mestre')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'mestre' ? 'text-red-500 border-b-2 border-red-500 bg-red-900/10' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}>Mestre (Privado)</button>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-[#050a05]">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-[#4a5a4a] text-xs italic mt-20">Vazio...</p>
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-[#4a5a4a] flex items-center gap-1 font-mono">
                    <Clock size={10} /> {formatTime(msg.created_at)}
                  </span>
                  {/* Etiqueta visual de Sussurro */}
                  {msg.channel === 'mestre' && msg.receiver_id && (
                    <span className="text-[8px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 uppercase">Sussurro</span>
                  )}
                </div>

                {msg.is_roll ? (
                  <div className={`border p-3 rounded-lg text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] ${msg.is_secret ? 'bg-red-900/20 border-red-500/50' : 'bg-[#1a2a1a] border-[#00ff66]/30'}`}>
                    <span className={`font-bold block text-xs mb-1 uppercase tracking-widest ${msg.is_secret ? 'text-red-400' : 'text-[#8a9a8a]'}`}>{msg.user_name}</span>
                    <span className="text-white text-sm font-medium">{msg.text}</span>
                  </div>
                ) : (
                  <div className={`border p-3 rounded-xl rounded-tl-sm transition-colors ${msg.channel === 'mestre' ? 'border-red-900/50 bg-red-950/10' : 'border-[#1a2a1a] bg-[#0a120a] hover:border-[#4a5a4a]'}`}>
                    <span className={`font-bold text-[11px] uppercase tracking-widest block mb-1 ${msg.channel === 'mestre' ? 'text-red-500' : 'text-[#00ff66]'}`}>{msg.user_name}</span>
                    <span className="text-[#e0e0e0] text-sm break-words leading-relaxed">{msg.text}</span>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-[#1a2a1a] bg-[#0a120a] p-4 flex flex-col gap-3">
          
          {/* Se a aba Mestre estiver ativa e o usuário for o Mestre, mostra o Dropdown de destinatário */}
          {activeTab === 'mestre' && isDM && (
            <div className="flex items-center gap-2 bg-[#1a2a1a]/50 p-2 rounded-lg border border-[#333]">
              <UserSquare2 size={14} className="text-red-500" />
              <select 
                value={selectedReceiver}
                onChange={(e) => setSelectedReceiver(e.target.value)}
                className="bg-transparent text-xs text-white w-full focus:outline-none"
              >
                <option value="dm">Anotação Privada (Apenas Mestre)</option>
                {campaignPlayers.map(player => (
                  <option key={player.id} value={player.id}>Sussurrar para: {player.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'mestre' && !isDM && (
             <p className="text-[10px] text-red-500/70 italic text-center">Enviando sussurro para o Mestre...</p>
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
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Falar no canal ${activeTab}...`} className="w-full bg-black border border-[#1a2a1a] rounded-lg py-2.5 pl-4 pr-10 text-white text-xs focus:outline-none focus:border-[#00ff66]" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00ff66] bg-[#1a2a1a] hover:text-white transition-colors p-1.5 rounded-md">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="relative bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all group">
          <MessageSquare size={24} className="text-[#4a5a4a] group-hover:text-[#00ff66] transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-[#0a120a] animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

    </div>
  );
}