"use client";
import { useState, useRef, useEffect } from 'react';
import {
  Send, Dices, MessageSquare, Eye, EyeOff, Clock,
  ChevronDown, Shield, Scroll
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  campaign_id?: string;
  user_name: string; // fallback quando sender_id não está no playerMap
  sender_id?: string;
  receiver_id?: string | null;
  text: string;
  is_roll: boolean;
  is_secret: boolean;
  channel: string; // 'campanha' | 'geral' | 'ooc' | 'mestre' | 'fichas'
  created_at: string;
  dice_type?: string | null;
}

interface ChatWidgetProps {
  campaignId: string;
  isDiceReady: boolean;
  onRollDice: (diceType: string, isSecret: boolean) => Promise<number | null>;
}

// Dados de exibição de cada participante, resolvidos localmente
interface PlayerInfo {
  userId: string;
  displayName: string;
  characterName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Paleta por tipo de dado — espelha as cores dos botões no painel
const DICE_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  d20:  { text: 'text-red-500',    border: 'border-red-500/50',    bg: 'bg-red-900/20'    },
  d12:  { text: 'text-orange-500', border: 'border-orange-500/50', bg: 'bg-orange-900/20' },
  d10:  { text: 'text-yellow-500', border: 'border-yellow-500/50', bg: 'bg-yellow-900/20' },
  d8:   { text: 'text-green-500',  border: 'border-green-500/50',  bg: 'bg-green-900/20'  },
  d6:   { text: 'text-blue-500',   border: 'border-blue-500/50',   bg: 'bg-blue-900/20'   },
  d4:   { text: 'text-purple-500', border: 'border-purple-500/50', bg: 'bg-purple-900/20' },
  d100: { text: 'text-gray-400',   border: 'border-gray-400/50',   bg: 'bg-gray-900/20'   },
};

const getDiceColor = (diceType?: string | null) =>
  DICE_COLORS[diceType ?? ''] ?? DICE_COLORS['d20'];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ChatWidget({ campaignId, isDiceReady, onRollDice }: ChatWidgetProps) {
  const supabase    = createClient();
  const chatEndRef  = useRef<HTMLDivElement>(null);

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [inputText,     setInputText]     = useState('');
  const [activeTab,     setActiveTab]     = useState<'campanha' | 'fichas'>('campanha');
  const [isSecretRoll,  setIsSecretRoll]  = useState(false);
  const [isOpen,        setIsOpen]        = useState(true);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const prevMessagesLength = useRef(0);

  const [currentUser,   setCurrentUser]   = useState<User | null>(null);
  const [displayName,   setDisplayName]   = useState('Aventureiro');
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [isDM,          setIsDM]          = useState(false);
  const [dmId,          setDmId]          = useState<string | null>(null);

  // Mapa userId → info de exibição; evita colunas extras em chat_messages
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});

  // ---------------------------------------------------------------------------
  // Inicialização: identidade do usuário, papel na campanha e mapa de jogadores
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!campaignId || campaignId === '00000000-0000-0000-0000-000000000000') return;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // display_name vem de profiles; metadados de auth guardam dados de cadastro
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      setDisplayName(
        profile?.display_name    ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Aventureiro'
      );

      const { data: campaign } = await supabase
        .from('campaigns')
        .select('dm_id')
        .eq('id', campaignId)
        .single();

      const userIsDM = campaign?.dm_id === user.id;
      setIsDM(userIsDM);
      setDmId(campaign?.dm_id ?? null);

      // Personagem ativo: campaign_members.current_character_id → characters.name
      const { data: memberData } = await supabase
        .from('campaign_members')
        .select('current_character_id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.current_character_id) {
        const { data: charData } = await supabase
          .from('characters')
          .select('name')
          .eq('id', memberData.current_character_id)
          .single();
        setCharacterName(charData?.name ?? null);
      }

      // Duas queries separadas: não há FK direta entre campaign_members e profiles
      const { data: members } = await supabase
        .from('campaign_members')
        .select('user_id, current_character_id')
        .eq('campaign_id', campaignId);

      if (members && members.length > 0) {
        const userIds = members.map((m: any) => m.user_id);
        const charIds = members.map((m: any) => m.current_character_id).filter(Boolean);

        const { data: profilesList } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        const { data: charactersList } = charIds.length > 0
          ? await supabase.from('characters').select('id, name').in('id', charIds)
          : { data: [] };

        const map: Record<string, PlayerInfo> = {};
        members.forEach((m: any) => {
          const prof = profilesList?.find((p: any) => p.id === m.user_id);
          const char = charactersList?.find((c: any) => c.id === m.current_character_id);
          map[m.user_id] = {
            userId:        m.user_id,
            displayName:   prof?.display_name || 'Aventureiro',
            characterName: char?.name ?? null,
          };
        });

        // O mestre pode não estar em campaign_members como jogador
        if (campaign?.dm_id) {
          const { data: dmProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', campaign.dm_id)
            .single();
          map[campaign.dm_id] = {
            userId:        campaign.dm_id,
            displayName:   dmProfile?.display_name || 'Mestre',
            characterName: null,
          };
        }

        setPlayerMap(map);
      }
    };

    init();
  }, [supabase, campaignId]);

  // ---------------------------------------------------------------------------
  // Histórico inicial + Realtime — filtro server-side por campaign_id
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!campaignId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true })
        .limit(150);

      if (data) {
        setMessages(data);
        prevMessagesLength.current = data.length;
      }
    };
    fetchMessages();

    // O filtro server-side garante que apenas INSERTs desta campanha
    // chegam ao subscriber — sem descarte desnecessário no cliente
    const chatSub = supabase
      .channel(`chat_room_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(chatSub); };
  }, [supabase, campaignId]);

  // ---------------------------------------------------------------------------
  // Scroll automático e contador de não lidos
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messages.length > prevMessagesLength.current) {
      setUnreadCount((prev) => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isOpen]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  // ---------------------------------------------------------------------------
  // Envio de mensagem de texto
  // ---------------------------------------------------------------------------
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;
    if (activeTab === 'fichas') return;

    const textToSend = inputText;
    setInputText('');

    await supabase.from('chat_messages').insert([{
      campaign_id: campaignId,
      user_name:   displayName,
      text:        textToSend,
      is_roll:     false,
      is_secret:   false,
      channel:     'campanha',
      sender_id:   currentUser.id,
      receiver_id: null,
    }]);
  };

  // ---------------------------------------------------------------------------
  // Rolagem de dados
  // ---------------------------------------------------------------------------
  const handleRollClick = async (diceType: string) => {
    if (!currentUser) return;
    const total = await onRollDice(diceType, isSecretRoll);
    if (total === null || total === undefined) return;

    const textPublico = `rolou ${diceType} → ${total}`;
    const textSecreto = `(SECRETO) rolou ${diceType} → ${total}`;

    // Valor real persiste no banco; o prefixo "(SECRETO)" é aplicado só localmente
    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId,
      user_name:   displayName,
      text:        textPublico,
      is_roll:     true,
      is_secret:   isSecretRoll,
      channel:     'campanha',
      sender_id:   currentUser.id,
      receiver_id: null,
      dice_type:   diceType,
    }]).select().single();

    if (data) {
      const localMsg: Message = {
        ...data,
        text: isSecretRoll ? textSecreto : textPublico,
      };
      setMessages((prev) => {
        if (prev.find((m) => m.id === localMsg.id)) return prev;
        return [...prev, localMsg];
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Filtro de visibilidade das mensagens
  // ---------------------------------------------------------------------------
  const filteredMessages = messages.filter((msg) => {
    if (activeTab === 'fichas') return msg.channel === 'fichas';
    if (msg.channel !== 'campanha') return false;
    if (!msg.is_secret) return true;

    const isMine     = msg.sender_id === currentUser?.id;
    const senderIsDM = msg.sender_id === dmId;

    if (isDM) {
      if (senderIsDM) return isMine; // rolagem secreta do próprio mestre
      return true;                    // rolagem secreta de qualquer jogador
    }

    return isMine;
  });

  // ---------------------------------------------------------------------------
  // Resolve o nome de exibição de uma mensagem a partir do playerMap
  // ---------------------------------------------------------------------------
  const resolveLabel = (msg: Message): string => {
    const info = msg.sender_id ? playerMap[msg.sender_id] : null;
    if (!info) return msg.user_name;
    return info.characterName
      ? `${info.displayName} · ${info.characterName}`
      : info.displayName;
  };

  const dadosDisponiveis = [
    { nome: 'd20',  cor: 'border-red-500    text-red-500    hover:bg-red-500/20'    },
    { nome: 'd12',  cor: 'border-orange-500 text-orange-500 hover:bg-orange-500/20' },
    { nome: 'd10',  cor: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/20' },
    { nome: 'd8',   cor: 'border-green-500  text-green-500  hover:bg-green-500/20'  },
    { nome: 'd6',   cor: 'border-blue-500   text-blue-500   hover:bg-blue-500/20'   },
    { nome: 'd4',   cor: 'border-purple-500 text-purple-500 hover:bg-purple-500/20' },
    { nome: 'd100', cor: 'border-gray-400   text-gray-400   hover:bg-gray-500/20'   },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">

      <div className={`
        w-[400px] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden
        border border-[#1a2a1a] bg-[#050a05] transition-all duration-300 ease-in-out origin-bottom-right
        ${isOpen ? 'h-[75vh] opacity-100 scale-100 mb-4' : 'h-0 opacity-0 scale-95 mb-0 border-0'}
      `}>

        <div
          className="bg-[#0a120a] border-b border-[#1a2a1a] px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-[#111] transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#00ff66]" />
            <h3 className="text-[#f1e5ac] text-xs font-serif italic tracking-widest uppercase">
              Chat da Mesa
            </h3>
          </div>
          <ChevronDown size={18} className="text-[#4a5a4a]" />
        </div>

        {/* Aba "Fichas" visível apenas para o Mestre */}
        <div className="flex border-b border-[#1a2a1a] bg-[#050a05]">
          <button
            onClick={() => setActiveTab('campanha')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1
              ${activeTab === 'campanha'
                ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30'
                : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}
          >
            <MessageSquare size={10} /> Campanha
          </button>

          {isDM && (
            <button
              onClick={() => setActiveTab('fichas')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1
                ${activeTab === 'fichas'
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/10'
                  : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}
            >
              <Scroll size={10} /> Fichas
            </button>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-[#050a05] custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-[#4a5a4a] text-xs italic mt-20">
              {activeTab === 'fichas'
                ? 'Nenhuma alteração de ficha registrada.'
                : 'O silêncio ecoa na taverna...'}
            </p>
          ) : (
            filteredMessages.map((msg) => {
              const isMine     = msg.sender_id === currentUser?.id;
              const senderIsDM = msg.sender_id === dmId;
              const nameLabel  = resolveLabel(msg);
              const diceColor  = getDiceColor(msg.dice_type);

              return (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-[#4a5a4a] flex items-center gap-1 font-mono">
                      <Clock size={10} /> {formatTime(msg.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      {msg.is_secret && (
                        <span className="text-[8px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50 uppercase font-bold tracking-widest flex items-center gap-0.5">
                          <EyeOff size={8} /> Secreto
                        </span>
                      )}
                      {senderIsDM && (
                        <span className="text-[8px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/50 uppercase font-bold tracking-widest flex items-center gap-0.5">
                          <Shield size={8} /> Mestre
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.is_roll ? (
                    <div className={`border p-3 rounded-lg text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]
                      ${msg.is_secret
                        ? 'bg-red-900/20 border-red-500/50'
                        : `${diceColor.bg} ${diceColor.border}`}`}
                    >
                      <span className={`font-black block text-xs mb-1 uppercase tracking-widest
                        ${msg.is_secret ? 'text-red-400' : diceColor.text}`}>
                        {nameLabel}
                      </span>
                      <span className="text-white text-sm font-medium">{msg.text}</span>
                      {msg.is_secret && isMine && (
                        <span className="block text-[9px] text-red-400/60 mt-1 italic">
                          Apenas você {isDM ? '' : 'e o Mestre '}veem isto
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="border p-3 rounded-xl rounded-tl-sm transition-colors border-[#1a2a1a] bg-[#0a120a] hover:border-[#4a5a4a]">
                      <span className={`font-black text-[11px] uppercase tracking-widest block mb-1
                        ${senderIsDM ? 'text-amber-400' : 'text-[#f1e5ac]'}`}>
                        {nameLabel}
                      </span>
                      <span className="text-[#e0e0e0] text-sm break-words leading-relaxed">
                        {msg.text}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-[#1a2a1a] bg-[#0a120a] p-4 flex flex-col gap-3">
          {activeTab === 'fichas' ? (
            <p className="text-[9px] font-bold tracking-widest text-amber-500/60 uppercase text-center flex items-center justify-center gap-1">
              <Scroll size={10} /> Registro automático de mudanças de ficha
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-1.5 flex-1 justify-center">
                  {dadosDisponiveis.map((dado) => (
                    <button
                      key={dado.nome}
                      onClick={() => handleRollClick(dado.nome)}
                      disabled={!isDiceReady}
                      className={`border ${dado.cor} bg-transparent py-1.5 px-2 rounded flex items-center gap-1 hover:scale-105 transition-all shadow-sm disabled:opacity-50`}
                    >
                      <Dices size={12} />
                      <span className="text-[9px] font-bold uppercase">{dado.nome}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsSecretRoll(!isSecretRoll)}
                  title={isSecretRoll ? 'Desativar rolagem secreta' : 'Ativar rolagem secreta'}
                  className={`p-2 rounded-lg border transition-colors flex-shrink-0 flex items-center justify-center
                    ${isSecretRoll
                      ? 'bg-red-900/30 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'bg-transparent border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66] hover:text-[#00ff66]'}`}
                >
                  {isSecretRoll ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {isSecretRoll && (
                <p className="text-[9px] font-bold tracking-widest text-red-400/80 uppercase text-center flex items-center justify-center gap-1 animate-pulse">
                  <EyeOff size={9} />
                  {isDM
                    ? 'Rolagem Secreta — apenas você verá'
                    : 'Rolagem Secreta — você e o Mestre verão'}
                </p>
              )}

              <form onSubmit={sendMessage} className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Mensagem..."
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-2.5 pl-4 pr-10 text-white text-xs focus:outline-none focus:border-[#00ff66]"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00ff66] bg-[#1a2a1a] hover:text-black hover:bg-[#00ff66] transition-colors p-1.5 rounded-md"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="relative bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all group"
        >
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