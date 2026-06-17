"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Users, ChevronDown, GripHorizontal, Moon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { fetchProfile } from '@/features/profile/services/profile-service';
import { fetchCharacterById } from '@/features/character/services/character-service';
import {
  fetchCampaignMember,
  fetchCampaignMembers,
  fetchProfilesByIds,
  fetchCharactersByIds,
  fetchCampaignDmId,
} from '@/features/mesa/services/mesa-service';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type StatusType = 'online' | 'ausente';

interface PlayerPresence {
  userId: string;
  displayName: string;
  characterName: string | null;
  characterImg: string | null;  // foto do personagem (não do perfil)
  avatarUrl: string | null;     // foto do perfil (fallback)
  status: StatusType;
  joinedAt: string;
}

interface PlayerStatusWidgetProps {
  campaignId: string;
  isDM: boolean;
  currentUserId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<StatusType, string> = {
  online:  'Online',
  ausente: 'Ausente',
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function PlayerStatusWidget({
  campaignId,
  isDM,
  currentUserId,
}: PlayerStatusWidgetProps) {
  const supabase = useMemo(() => createClient(), []);

  // --- Estado do painel ---
  const [isOpen, setIsOpen]   = useState(false);
  const [players, setPlayers] = useState<Map<string, PlayerPresence>>(new Map());
  const [myStatus, setMyStatus] = useState<StatusType>('online');

  // --- Dados do usuário atual ---
  const [myDisplayName,   setMyDisplayName]   = useState('');
  const [myCharacterName, setMyCharacterName] = useState<string | null>(null);
  const [myCharacterImg,  setMyCharacterImg]  = useState<string | null>(null);
  const [myAvatarUrl,     setMyAvatarUrl]     = useState<string | null>(null);

  // --- Draggable ---
  const widgetRef       = useRef<HTMLDivElement>(null);
  const isDraggingRef   = useRef(false);
  const dragOffsetRef   = useRef({ x: 0, y: 0 });
  // Posição inicial: canto superior direito, 24px de margem (ajustado para ficar acima do chat)
  const [position, setPosition] = useState({ x: -24, y: 24 });
  // x negativo = âncora à direita via CSS (transform + right)

  // --- Realtime ---
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myStatusRef = useRef<StatusType>('online');
  useEffect(() => { myStatusRef.current = myStatus; }, [myStatus]);

  // ---------------------------------------------------------------------------
  // Inicialização: busca dados do usuário e personagem
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!campaignId || !currentUserId) return;

    const init = async () => {
      // Perfil do usuário atual
      const profile = await fetchProfile(currentUserId);
      const name = profile?.display_name ?? 'Aventureiro';
      setMyDisplayName(name);
      setMyAvatarUrl(profile?.avatar_url ?? null);

      // Personagem vinculado do usuário atual
      const myMember = await fetchCampaignMember(campaignId, currentUserId);

      if (myMember?.current_character_id) {
        const myChar = await fetchCharacterById(myMember.current_character_id);
        setMyCharacterName(myChar?.name ?? null);
        setMyCharacterImg(myChar?.img ?? null);
      }

      // Busca TODOS os membros da campanha para popular a lista inicial
      const dmId = await fetchCampaignDmId(campaignId);
      const members = await fetchCampaignMembers(campaignId);

      // Agrega todos os user_ids: jogadores + mestre
      const allUserIds = [
        ...members.map((m: any) => m.user_id),
      ];
      if (dmId && !allUserIds.includes(dmId)) {
        allUserIds.push(dmId);
      }

      if (allUserIds.length === 0) return;

      // Busca perfis
      const profiles = await fetchProfilesByIds(allUserIds);

      // Busca personagens vinculados
      const charIds = members
        .map((m: any) => m.current_character_id)
        .filter(Boolean);

      const chars = charIds.length > 0 ? await fetchCharactersByIds(charIds) : [];

      // Monta mapa inicial — todos como ausente (o Presence sobrescreve)
      const initial = new Map<string, PlayerPresence>();
      for (const uid of allUserIds) {
        const prof = profiles.find((p: any) => p.id === uid);
        const member = members.find((m: any) => m.user_id === uid);
        const char = member?.current_character_id
          ? chars.find((c: any) => c.id === member.current_character_id)
          : null;

        initial.set(uid, {
          userId:        uid,
          displayName:   prof?.display_name ?? 'Aventureiro',
          characterName: (char as any)?.name ?? null,
          characterImg:  (char as any)?.img  ?? null,
          avatarUrl:     prof?.avatar_url    ?? null,
          status:        'ausente',
          joinedAt:      '',
        });
      }
      setPlayers(initial);
    };

    init();
  }, [campaignId, currentUserId, isDM, supabase]);

  // ---------------------------------------------------------------------------
  // Supabase Presence — sincroniza presença em tempo real
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!campaignId || !currentUserId || !myDisplayName) return;

    const channel = supabase.channel(`presence-${campaignId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannelRef.current = channel;

    // Snapshot completo ao sincronizar
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        displayName: string;
        characterName: string | null;
        characterImg: string | null;
        avatarUrl: string | null;
        status: StatusType;
        joinedAt: string;
      }>();

      // Atualiza apenas os que estão presentes no Presence (online)
      // Os ausentes permanecem do mapa inicial
      setPlayers(prev => {
        const next = new Map(prev);
        for (const [userId, presences] of Object.entries(state)) {
          const p = (presences as any[])[0];
          if (!p) continue;
          const existing = next.get(userId);
          next.set(userId, {
            userId,
            displayName:   existing?.displayName   ?? p.displayName   ?? 'Aventureiro',
            characterName: existing?.characterName ?? p.characterName ?? null,
            characterImg:  existing?.characterImg  ?? p.characterImg  ?? null,
            avatarUrl:     existing?.avatarUrl     ?? p.avatarUrl     ?? null,
            status:        p.status ?? 'online',
            joinedAt:      p.joinedAt ?? new Date().toISOString(),
          });
        }
        return next;
      });
    });

    // Alguém entrou — atualiza status para online, preserva dados estáticos do init
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const p = (newPresences as any[])[0];
      if (!p) return;
      setPlayers(prev => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, {
          userId:        key,
          displayName:   existing?.displayName   ?? p.displayName   ?? 'Aventureiro',
          characterName: existing?.characterName ?? p.characterName ?? null,
          characterImg:  existing?.characterImg  ?? p.characterImg  ?? null,
          avatarUrl:     existing?.avatarUrl     ?? p.avatarUrl     ?? null,
          status:        p.status ?? 'online',
          joinedAt:      p.joinedAt ?? new Date().toISOString(),
        });
        return next;
      });
    });

    // Alguém saiu — marca como ausente em vez de remover imediatamente
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setPlayers(prev => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing) next.set(key, { ...existing, status: 'ausente' });
        return next;
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          displayName:   myDisplayName,
          characterName: myCharacterName,
          characterImg:  myCharacterImg,
          avatarUrl:     myAvatarUrl,
          status:        myStatusRef.current,
          joinedAt:      new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  // Reconecta se os dados básicos mudarem
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, currentUserId, myDisplayName]);

  // Atualiza track ao mudar status ou personagem sem recriar o canal
  const updateTrack = useCallback(async (nextStatus: StatusType) => {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    await ch.track({
      displayName:   myDisplayName,
      characterName: myCharacterName,
      characterImg:  myCharacterImg,
      avatarUrl:     myAvatarUrl,
      status:        nextStatus,
      joinedAt:      new Date().toISOString(),
    });
  }, [myDisplayName, myCharacterName, myCharacterImg, myAvatarUrl]);

  // ---------------------------------------------------------------------------
  // Detecta perda de foco da aba/página: ausente automático
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleVisibility = () => {
      const next: StatusType = document.hidden ? 'ausente' : 'online';
      setMyStatus(next);
      updateTrack(next);
    };

    const handleBeforeUnload = () => {
      setMyStatus('ausente');
      updateTrack('ausente');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateTrack]);

  // ---------------------------------------------------------------------------
  // Toggle manual de status
  // ---------------------------------------------------------------------------
  const toggleStatus = () => {
    const next: StatusType = myStatus === 'online' ? 'ausente' : 'online';
    setMyStatus(next);
    updateTrack(next);
  };

  // ---------------------------------------------------------------------------
  // Drag — move o widget pela tela
  // ---------------------------------------------------------------------------
  const handleDragStart = (e: React.MouseEvent) => {
    // Só inicia no handle (GripHorizontal)
    isDraggingRef.current = true;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !widgetRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w  = widgetRef.current.offsetWidth;
      const h  = widgetRef.current.offsetHeight;

      let nx = e.clientX - dragOffsetRef.current.x;
      let ny = e.clientY - dragOffsetRef.current.y;

      // Clamp dentro da viewport
      nx = Math.max(0, Math.min(nx, vw - w));
      ny = Math.max(0, Math.min(ny, vh - h));

      widgetRef.current.style.left = `${nx}px`;
      widgetRef.current.style.top  = `${ny}px`;
      widgetRef.current.style.right = 'auto';
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Fecha o painel ao clicar fora dele (ou em outro componente)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      // Não fecha enquanto arrasta o painel
      if (isDraggingRef.current) return;
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------
  const playerList = Array.from(players.values()).sort((a, b) => {
    // Eu mesmo primeiro
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    // Online antes de ausente
    if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const onlineCount  = Array.from(players.values()).filter(p => p.status === 'online').length;
  const totalCount   = players.size;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={widgetRef}
      className="fixed z-50 select-none"
      style={{ top: '24px', left: '15px', minWidth: '220px' }}
    >
      {/* ── Painel aberto ── */}
      <div
        className={`
          flex flex-col rounded-xl overflow-hidden border border-[#1a2a1a]
          bg-[#050a05] shadow-[0_0_40px_rgba(0,0,0,0.8)]
          transition-all duration-300 origin-top-right
          ${isOpen ? 'opacity-100 scale-100' : 'h-0 opacity-0 scale-95 border-0 pointer-events-none'}
        `}
        style={{ width: '220px' }}
      >
        {/* Header — arrastar aqui */}
        <div
          onMouseDown={handleDragStart}
          className="bg-[#0a120a] border-b border-[#1a2a1a] px-4 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={13} className="text-[#2a3a2a]" />
            <Users size={13} className="text-[#00ff66]" />
            <span className="text-[#f1e5ac] text-[10px] font-serif italic tracking-widest uppercase">
              Jogadores
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Contador online/total */}
            <span className="text-[9px] font-black text-[#4a5a4a] tabular-nums">
              <span className="text-[#00ff66]">{onlineCount}</span>
              <span className="text-[#2a3a2a]">/</span>
              {totalCount}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#2a3a2a] hover:text-[#4a5a4a] transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="flex flex-col gap-0.5 p-2 max-h-[280px] overflow-y-auto custom-scrollbar">
          {playerList.length === 0 ? (
            <p className="text-center text-[#2a3a2a] text-[10px] italic py-4">
              Nenhum jogador conectado
            </p>
          ) : (
            playerList.map((player) => {
              const isMe = player.userId === currentUserId;
              const isOnline = player.status === 'online';

              return (
                <div
                  key={player.userId}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors
                    ${isMe ? 'bg-[#0a120a]' : 'hover:bg-[#0a120a]/50'}
                  `}
                >
                  {/* Avatar — foto do personagem, fallback inicial do display_name */}
                  <div className="relative shrink-0">
                    <div
                      className={`
                        w-7 h-7 rounded-full border overflow-hidden bg-[#0a120a] flex items-center justify-center
                        ${isOnline ? 'border-[#1a3a1a]' : 'border-[#1a1a1a]'}
                      `}
                      style={
                        player.characterImg
                          ? { backgroundImage: `url(${player.characterImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : player.avatarUrl
                            ? { backgroundImage: `url(${player.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : {}
                      }
                    >
                      {!player.characterImg && !player.avatarUrl && (
                        <span className="text-[10px] font-bold text-[#3a4a3a] uppercase">
                          {player.displayName.charAt(0)}
                        </span>
                      )}
                    </div>
                    {/* Bolinha de status */}
                    <span
                      className={`
                        absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#050a05]
                        transition-all duration-500
                        ${isOnline
                          ? 'bg-[#00ff66] shadow-[0_0_6px_rgba(0,255,102,0.8)]'
                          : 'bg-[#3a3a3a]'}
                      `}
                    />
                  </div>

                  {/* Info — nome do jogador em destaque, personagem como subtítulo */}
                  <div className="flex-1 min-w-0">
                    <span className={`
                      text-[11px] font-bold truncate leading-none block
                      ${isMe ? 'text-[#f1e5ac]' : isOnline ? 'text-white/80' : 'text-white/30'}
                    `}>
                      {player.displayName}
                      {isMe && (
                        <span className="text-[8px] text-[#4a5a4a] font-normal ml-1">
                          (você)
                        </span>
                      )}
                    </span>
                    {player.characterName && (
                      <span className={`text-[9px] truncate block leading-none mt-0.5 ${isOnline ? 'text-[#4a5a4a]' : 'text-[#2a3a2a]'}`}>
                        {player.characterName}
                      </span>
                    )}
                  </div>

                  {/* Ícone de status — bolinha verde (online) ou lua riscada (ausente) */}
                  {isMe ? (
                    <button
                      onClick={toggleStatus}
                      title={myStatus === 'online' ? 'Marcar como ausente' : 'Marcar como online'}
                      className={`
                        shrink-0 flex items-center justify-center w-6 h-6 rounded-md border transition-all
                        ${myStatus === 'online'
                          ? 'bg-[#00ff66]/10 border-[#00ff66]/30 hover:bg-red-900/20 hover:border-red-500/40'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#00ff66]/10 hover:border-[#00ff66]/30'}
                      `}
                    >
                      {myStatus === 'online' ? (
                        /* bolinha verde */
                        <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_rgba(0,255,102,0.9)]" />
                      ) : (
                        /* lua riscada — Moon com linha diagonal por cima */
                        <span className="relative flex items-center justify-center">
                          <Moon size={10} className="text-white/30" />
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="block w-[13px] h-[1.5px] bg-white/40 rotate-45 rounded-full" />
                          </span>
                        </span>
                      )}
                    </button>
                  ) : (
                    /* Outros jogadores — só exibe, não clica */
                    <span className="shrink-0 flex items-center justify-center w-5 h-5">
                      {isOnline ? (
                        <span className="w-2 h-2 rounded-full bg-[#00ff66]/60 shadow-[0_0_4px_rgba(0,255,102,0.6)]" />
                      ) : (
                        <span className="relative flex items-center justify-center">
                          <Moon size={10} className="text-[#2a3a2a]" />
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="block w-[13px] h-[1.5px] bg-[#2a3a2a] rotate-45 rounded-full" />
                          </span>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé — meu status atual */}
        <div className="border-t border-[#1a2a1a] px-3 py-2 flex items-center justify-between bg-[#0a120a]">
          <span className="text-[9px] text-[#2a3a2a] uppercase font-black tracking-widest">
            Seu status
          </span>
          <button
            onClick={toggleStatus}
            className={`
              flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all
              ${myStatus === 'online'
                ? 'bg-[#00ff66]/10 border-[#00ff66]/20 text-[#00ff66]'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-white/30'}
            `}
          >
            {myStatus === 'online' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_rgba(0,255,102,0.9)]" />
                Online
              </>
            ) : (
              <>
                <span className="relative flex items-center justify-center">
                  <Moon size={9} className="text-white/30" />
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="block w-[12px] h-[1.5px] bg-white/40 rotate-45 rounded-full" />
                  </span>
                </span>
                Ausente
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Botão flutuante quando fechado ── */}
      {!isOpen && (
        <button
          onMouseDown={handleDragStart}
          onClick={() => setIsOpen(true)}
          className="relative bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] p-3.5 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all group cursor-grab active:cursor-grabbing"
          title="Ver jogadores"
        >
          <Users size={20} className="text-[#4a5a4a] group-hover:text-[#00ff66] transition-colors" />
          {onlineCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#0a120a] border border-[#00ff66] text-[#00ff66] text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(0,255,102,0.5)]">
              {onlineCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}