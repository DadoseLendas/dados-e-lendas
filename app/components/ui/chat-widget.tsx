"use client";
import { useState, useRef, useEffect } from 'react';
import {
  Send, Dices, MessageSquare, Eye, EyeOff, Clock,
  ChevronDown, UserSquare2, ChevronUp, Shield, Scroll
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  campaign_id?: string;
  /** Nome de exibição (profile.display_name ou character name) */
  user_name: string;
  /** ID real do remetente (nunca exposto visualmente) */
  sender_id?: string;
  receiver_id?: string | null;
  text: string;
  is_roll: boolean;
  is_secret: boolean;
  /** 'campanha' | 'fichas' */
  channel: string;
  created_at: string;
  /** Nome do personagem, se houver */
  character_name?: string | null;
}

interface ChatWidgetProps {
  campaignId: string;
  isDiceReady: boolean;
  onRollDice: (diceType: string, isSecret: boolean) => Promise<number | null>;
}

interface CampaignPlayer {
  id: string;
  /** Nome de perfil */
  name: string;
  /** Nome do personagem na campanha, se houver */
  characterName?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ChatWidget({ campaignId, isDiceReady, onRollDice }: ChatWidgetProps) {
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  /**
   * ABAS:
   * - Jogador: apenas 'campanha'
   * - Mestre:  'campanha' (chat geral + rolagens secretas de todos) | 'fichas' (mudanças de ficha)
   */
  const [activeTab, setActiveTab] = useState<'campanha' | 'fichas'>('campanha');
  const [isSecretRoll, setIsSecretRoll] = useState(false);

  const [isOpen, setIsOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  // Identidade
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  /** Nome de exibição real do perfil (NÃO o email/id) */
  const [displayName, setDisplayName] = useState<string>('Aventureiro');
  /** Nome do personagem deste usuário nesta campanha */
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [isDM, setIsDM] = useState(false);
  const [dmId, setDmId] = useState<string | null>(null);

  // Sussurro do Mestre
  const [selectedReceiver, setSelectedReceiver] = useState<string>('dm');
  const [isReceiverMenuOpen, setIsReceiverMenuOpen] = useState(false);
  const [campaignPlayers, setCampaignPlayers] = useState<CampaignPlayer[]>([]);

  // ---------------------------------------------------------------------------
  // 1. Inicializa identidade, papel e jogadores
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      /**
       * FIX: Buscamos o nome de exibição na tabela `profiles` (campo `display_name`),
       * NÃO nos metadados de auth — metadados costumam ter o nome de cadastro/email.
       */
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const resolvedName =
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Aventureiro';
      setDisplayName(resolvedName);

      if (!campaignId || campaignId === '00000000-0000-0000-0000-000000000000') return;

      // Determina se é Mestre
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('dm_id')
        .eq('id', campaignId)
        .single();

      const userIsDM = campaign?.dm_id === user.id;
      setIsDM(userIsDM);
      setDmId(campaign?.dm_id ?? null);

      // Busca o personagem do usuário nesta campanha
      const { data: memberData } = await supabase
        .from('campaign_members')
        .select('character_name')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .single();
      setCharacterName(memberData?.character_name ?? null);

      // Mestre busca a lista de jogadores para sussurro
      if (userIsDM) {
        const { data: members } = await supabase
          .from('campaign_members')
          .select(`
            user_id,
            character_name,
            profiles:user_id ( display_name )
          `)
          .eq('campaign_id', campaignId);

        if (members) {
          const formatted: CampaignPlayer[] = members.map((m: Record<string, any>) => ({
            id: m.user_id,
            name: m.profiles?.display_name || 'Jogador',
            characterName: m.character_name ?? null,
          }));
          setCampaignPlayers(formatted);
        }
      }
    };

    initData();
  }, [supabase, campaignId]);

  // ---------------------------------------------------------------------------
  // 2. Histórico + Realtime — isolado por campaignId
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchMessages = async () => {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(150);

      if (campaignId && campaignId !== '00000000-0000-0000-0000-000000000000') {
        query = query.eq('campaign_id', campaignId);
      }

      const { data } = await query;
      if (data) {
        setMessages(data);
        prevMessagesLength.current = data.length;
      }
    };
    fetchMessages();

    /**
     * Canal isolado por campanha: `chat_room_{campaignId}`
     * Garante que mensagens de mesas diferentes não se misturem.
     */
    const chatSub = supabase
      .channel(`chat_room_${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as Message;

          // Isolamento extra: ignora se vazou de outra campanha
          if (
            campaignId !== '00000000-0000-0000-0000-000000000000' &&
            newMsg.campaign_id !== campaignId
          ) return;

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
  // 3. Scroll + badge de não lidos
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
  // 4. Envio de mensagem
  // ---------------------------------------------------------------------------
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const textToSend = inputText;
    setInputText('');

    // Canal 'fichas' é somente-leitura (atualizações automáticas de sistema)
    if (activeTab === 'fichas') return;

    await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== '00000000-0000-0000-0000-000000000000' ? campaignId : null,
      user_name: displayName,
      character_name: characterName,
      text: textToSend,
      is_roll: false,
      is_secret: false,
      channel: 'campanha',
      sender_id: currentUser.id,
      receiver_id: null,
    }]);
  };

  // ---------------------------------------------------------------------------
  // 5. Rolagem de dados
  // ---------------------------------------------------------------------------
  const handleRollClick = async (diceType: string) => {
    if (!currentUser) return;
    const total = await onRollDice(diceType, isSecretRoll);
    if (total === null || total === undefined) return;

    /**
     * VISIBILIDADE NO CHAT:
     * - Rolagem pública     → canal 'campanha', todos veem
     * - Rolagem secreta de JOGADOR → canal 'campanha', is_secret=true
     *   → O jogador vê o resultado real; outros jogadores NÃO veem; Mestre vê
     * - Rolagem secreta do MESTRE  → canal 'campanha', is_secret=true, sender_id = dmId
     *   → Apenas o Mestre vê; nenhum jogador vê
     */
    const textPublico = `rolou ${diceType} → ${total}`;
    const textSecreto = `(SECRETO) rolou ${diceType} → ${total}`;

    const { data } = await supabase.from('chat_messages').insert([{
      campaign_id: campaignId !== '00000000-0000-0000-0000-000000000000' ? campaignId : null,
      user_name: displayName,
      character_name: characterName,
      text: textPublico,         // Salva o texto real no banco
      is_roll: true,
      is_secret: isSecretRoll,
      channel: 'campanha',
      sender_id: currentUser.id,
      receiver_id: null,
    }]).select().single();

    if (data) {
      // Localmente o dono sempre vê o resultado real
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
  // 6. Filtro de mensagens visíveis
  // ---------------------------------------------------------------------------
  const filteredMessages = messages.filter((msg) => {
    // Aba Fichas: só mostra mensagens do canal 'fichas'
    if (activeTab === 'fichas') return msg.channel === 'fichas';

    // Aba Campanha: canal 'campanha'
    if (msg.channel !== 'campanha') return false;

    if (!msg.is_secret) return true; // Pública → todos veem

    /**
     * Rolagem SECRETA:
     * - Mestre vê tudo que for secreto (de qualquer jogador E a própria)
     * - Jogador só vê a sua própria rolagem secreta
     * - Mestre rolando secreto → só o próprio mestre vê
     */
    const isMine = msg.sender_id === currentUser?.id;
    const senderIsDM = msg.sender_id === dmId;

    if (isDM) {
      // Se o mestre é o remetente → só ele vê
      if (senderIsDM) return isMine;
      // Rolagem secreta de jogador → mestre vê
      return true;
    }

    // Jogador só vê a própria rolagem secreta
    return isMine;
  });

  // ---------------------------------------------------------------------------
  // 7. Helpers de UI
  // ---------------------------------------------------------------------------
  const getSelectedReceiverName = () => {
    if (selectedReceiver === 'dm') return 'Anotação Privada (Só Mestre)';
    const p = campaignPlayers.find((p) => p.id === selectedReceiver);
    return p ? `Sussurro → ${p.characterName || p.name}` : 'Selecionar Jogador...';
  };

  const dadosDisponiveis = [
    { nome: 'd20',  cor: 'border-red-500 text-red-500 hover:bg-red-500/20' },
    { nome: 'd12',  cor: 'border-orange-500 text-orange-500 hover:bg-orange-500/20' },
    { nome: 'd10',  cor: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/20' },
    { nome: 'd8',   cor: 'border-green-500 text-green-500 hover:bg-green-500/20' },
    { nome: 'd6',   cor: 'border-blue-500 text-blue-500 hover:bg-blue-500/20' },
    { nome: 'd4',   cor: 'border-purple-500 text-purple-500 hover:bg-purple-500/20' },
    { nome: 'd100', cor: 'border-gray-400 text-gray-400 hover:bg-gray-500/20' },
  ];

  // ---------------------------------------------------------------------------
  // 8. Render
  // ---------------------------------------------------------------------------
  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">

      {/* ── Chat expandido ── */}
      <div className={`w-[400px] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-[#1a2a1a] bg-[#050a05] transition-all duration-300 ease-in-out origin-bottom-right ${isOpen ? 'h-[75vh] opacity-100 scale-100 mb-4' : 'h-0 opacity-0 scale-95 mb-0 border-0'}`}>

        {/* Header */}
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
          <button className="text-[#4a5a4a] hover:text-[#00ff66] transition-colors">
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Abas — Jogador vê só "Campanha"; Mestre vê "Campanha" + "Fichas" */}
        <div className="flex border-b border-[#1a2a1a] bg-[#050a05]">
          <button
            onClick={() => setActiveTab('campanha')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${activeTab === 'campanha' ? 'text-[#00ff66] border-b-2 border-[#00ff66] bg-[#1a2a1a]/30' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}
          >
            <MessageSquare size={10} /> Campanha
          </button>

          {isDM && (
            <button
              onClick={() => setActiveTab('fichas')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${activeTab === 'fichas' ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/10' : 'text-[#4a5a4a] hover:text-[#8a9a8a]'}`}
            >
              <Scroll size={10} /> Fichas
            </button>
          )}
        </div>

        {/* Mensagens */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-[#050a05] custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-[#4a5a4a] text-xs italic mt-20">
              {activeTab === 'fichas' ? 'Nenhuma alteração de ficha registrada.' : 'O silêncio ecoa na taverna...'}
            </p>
          ) : (
            filteredMessages.map((msg) => {
              const isMine = msg.sender_id === currentUser?.id;
              const senderIsDM = msg.sender_id === dmId;

              /**
               * Nome exibido: preferência ao nome do personagem.
               * O `user_name` agora sempre é o display_name correto (corrigido no envio).
               */
              const nameLabel = msg.character_name
                ? `${msg.user_name} · ${msg.character_name}`
                : msg.user_name;

              return (
                <div key={msg.id} className="text-sm">
                  {/* Timestamp + badges */}
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

                  {/* Bolha da rolagem */}
                  {msg.is_roll ? (
                    <div className={`border p-3 rounded-lg text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] ${msg.is_secret ? 'bg-red-900/20 border-red-500/50' : 'bg-[#1a2a1a] border-[#00ff66]/30'}`}>
                      <span className={`font-black block text-xs mb-1 uppercase tracking-widest ${msg.is_secret ? 'text-red-400' : 'text-[#00ff66]'}`}>
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
                    /* Bolha de texto */
                    <div className={`border p-3 rounded-xl rounded-tl-sm transition-colors ${activeTab === 'fichas' ? 'border-amber-900/50 bg-amber-950/10' : 'border-[#1a2a1a] bg-[#0a120a] hover:border-[#4a5a4a]'}`}>
                      <span className={`font-black text-[11px] uppercase tracking-widest block mb-1 ${senderIsDM ? 'text-amber-400' : 'text-[#f1e5ac]'}`}>
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

        {/* Input e controles */}
        <div className="border-t border-[#1a2a1a] bg-[#0a120a] p-4 flex flex-col gap-3 relative">

          {/* Aba Fichas é somente-leitura */}
          {activeTab === 'fichas' ? (
            <p className="text-[9px] font-bold tracking-widest text-amber-500/60 uppercase text-center flex items-center justify-center gap-1">
              <Scroll size={10} /> Registro automático de mudanças de ficha
            </p>
          ) : (
            <>
              {/* Dados */}
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

                {/* Toggle rolagem secreta */}
                <button
                  onClick={() => setIsSecretRoll(!isSecretRoll)}
                  title={isSecretRoll ? 'Rolagem Secreta (ativo)' : 'Rolagem Secreta (inativo)'}
                  className={`p-2 rounded-lg border transition-colors flex-shrink-0 flex items-center justify-center ${isSecretRoll ? 'bg-red-900/30 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-transparent border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66] hover:text-[#00ff66]'}`}
                >
                  {isSecretRoll ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Indicador visual de rolagem secreta */}
              {isSecretRoll && (
                <p className="text-[9px] font-bold tracking-widest text-red-400/80 uppercase text-center flex items-center justify-center gap-1 animate-pulse">
                  <EyeOff size={9} />
                  {isDM ? 'Rolagem Secreta — apenas você verá' : 'Rolagem Secreta — você e o Mestre verão'}
                </p>
              )}

              {/* Campo de texto */}
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

      {/* ── Botão flutuante quando fechado ── */}
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