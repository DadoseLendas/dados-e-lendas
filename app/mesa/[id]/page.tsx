"use client";
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserRound, Users, Home, BookOpen, Map as MapIcon, ShieldCheck, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import FichaModal from '@/app/components/ui/ficha-modal';
import ChatWidget from '@/app/components/ui/chat-widget'; 
import CampaignBooksWidget from '@/app/components/ui/campaign-books-widget';
import DiceRoller from '@/app/components/ui/dice-roller';
import TokenLibraryWidget from '@/app/components/ui/token-library-widget';

interface Token {
  id: string;
  url: string;
  x: number;
  y: number;
  name?: string;
  characterId?: number | null;
  imgOffsetX?: number;
  imgOffsetY?: number;
  isMonster?: boolean;
}

export default function TelaDeMesa() {
  const supabase = createClient();
  const router = useRouter();
  
  // A MÁGICA: Pega o ID que estiver na URL (ex: /mesa/123-abc vira '123-abc')
  const params = useParams();
  const campaignId = params.id as string;
  
  //interface e Mapa
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // <-- Adicione esta linha
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [modalAtivo, setModalAtivo] = useState<'Mapa' | null>(null);
  const [showTokenLibrary, setShowTokenLibrary] = useState(false);
  const [showBooks, setShowBooks] = useState(false);
  const [mapaUrl, setMapaUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  //tokens
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenSelecionado, setTokenSelecionado] = useState<string | null>(null);
  const [isDraggingToken, setIsDraggingToken] = useState(false);

  // Realtime refs
  const tokensRef = useRef<Token[]>([]);
  const draggingPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastBroadcastRef = useRef<number>(0);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dragMovedRef = useRef(false); // detecta se foi drag ou click

  // Keep tokensRef in sync with state (for use inside event handlers)
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  
  const gridSize = 50; 
  const tokenSize = 42; 

  //movimento do mapa
  const handleMouseDown = (e: React.MouseEvent, tokenId?: string) => {
    if (tokenId) {
      setTokenSelecionado(tokenId);
      setIsDraggingToken(true);
      dragMovedRef.current = false;
      const token = tokensRef.current.find(t => t.id === tokenId);
      if (token) draggingPosRef.current = { x: token.x, y: token.y };
      e.stopPropagation();
    } else if (e.button === 1) { 
      setIsDraggingMap(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingMap) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (isDraggingToken && tokenSelecionado) {
      dragMovedRef.current = true;
      draggingPosRef.current.x += e.movementX / zoom;
      draggingPosRef.current.y += e.movementY / zoom;
      const { x, y } = draggingPosRef.current;
      setTokens(prev => prev.map(t =>
        t.id === tokenSelecionado ? { ...t, x, y } : t
      ));
      // Broadcast ~30fps throttled
      const now = Date.now();
      if (now - lastBroadcastRef.current > 33 && realtimeChannelRef.current) {
        lastBroadcastRef.current = now;
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'token-move',
          payload: { tokenId: tokenSelecionado, x, y },
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingToken && tokenSelecionado) {
      if (!dragMovedRef.current) {
        // Foi clique (sem arrastar): abre ficha se token tem personagem
        const token = tokensRef.current.find(t => t.id === tokenSelecionado);
        if (token?.characterId) {
          if (isDM) {
            setFichaCharacterIdDM(token.characterId);
            setShowFichaDM(true);
          } else if (String(token.characterId) === String(fichaCharacterId)) {
            setShowFicha(true);
          }
          // jogador clicando em token alheio → não faz nada
        }
      } else {
        // Foi arrasto: snappa e salva posição
        const snappedX = Math.round(draggingPosRef.current.x / gridSize) * gridSize;
        const snappedY = Math.round(draggingPosRef.current.y / gridSize) * gridSize;
        const capturedId = tokenSelecionado;
        setTokens(prev => prev.map(t =>
          t.id === capturedId ? { ...t, x: snappedX, y: snappedY } : t
        ));
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'token-move',
            payload: { tokenId: capturedId, x: snappedX, y: snappedY },
          });
        }
        supabase
          .from('campaign_tokens')
          .update({ x: snappedX, y: snappedY })
          .eq('id', capturedId)
          .eq('campaign_id', campaignId)
          .then(() => {});
      }
    }
    setIsDraggingMap(false);
    setIsDraggingToken(false);
  };

  //teclado (WASD + Delete)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!tokenSelecionado) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = tokenSelecionado;
        setTokens(prev => prev.filter(t => t.id !== id));
        setTokenSelecionado(null);
        supabase.from('campaign_tokens').delete().eq('id', id).then(() => {});
        realtimeChannelRef.current?.send({
          type: 'broadcast', event: 'token-delete', payload: { tokenId: id },
        });
        return;
      }
      let dx = 0, dy = 0;
      switch(e.key.toLowerCase()) {
        case 'w': dy = -gridSize; break;
        case 's': dy = gridSize; break;
        case 'a': dx = -gridSize; break;
        case 'd': dx = gridSize; break;
        default: return;
      }
      const id = tokenSelecionado;
      const token = tokensRef.current.find(t => t.id === id);
      if (!token) return;
      const newX = token.x + dx;
      const newY = token.y + dy;
      setTokens(prev => prev.map(t => t.id === id ? { ...t, x: newX, y: newY } : t));
      supabase.from('campaign_tokens').update({ x: newX, y: newY })
        .eq('id', id).eq('campaign_id', campaignId).then(() => {});
      realtimeChannelRef.current?.send({
        type: 'broadcast', event: 'token-move', payload: { tokenId: id, x: newX, y: newY },
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tokenSelecionado, campaignId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (tipo === 'Mapa') {
      setMapaUrl(url);
    }
    setModalAtivo(null);
  };

  const addTokenToMap = async (t: { name: string; url: string }) => {
    const newId = crypto.randomUUID();
    const newToken: Token = { id: newId, url: t.url, x: 0, y: 0, name: t.name, isMonster: true };
    setTokens(prev => [...prev, newToken]);
    supabase.from('campaign_tokens').insert({
      id: newId, campaign_id: campaignId, url: t.url, x: 0, y: 0, is_monster: true,
    }).then(() => {});
    realtimeChannelRef.current?.send({ type: 'broadcast', event: 'token-add', payload: { token: newToken } });
  };

  const handleTokenUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    await addTokenToMap({ name: file.name.replace(/\.[^.]+$/, ''), url });
  };

  // Subscription realtime de tokens
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`mesa-tokens-${campaignId}`)
      .on('broadcast', { event: 'token-move' }, ({ payload }) => {
        setTokens(prev => prev.map(t =>
          t.id === payload.tokenId ? { ...t, x: payload.x, y: payload.y } : t
        ));
      })
      .on('broadcast', { event: 'token-delete' }, ({ payload }) => {
        setTokens(prev => prev.filter(t => t.id !== payload.tokenId));
      })
      .on('broadcast', { event: 'token-add' }, ({ payload }) => {
        setTokens(prev => {
          if (prev.find(t => t.id === payload.token.id)) return prev;
          return [...prev, payload.token];
        });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_tokens', filter: `campaign_id=eq.${campaignId}` },
        ({ new: row }) => {
          const t = row as any;
          setTokens(prev => {
            if (prev.find(tk => tk.id === t.id)) return prev;
            return [...prev, {
              id: t.id, url: t.url || '', x: t.x, y: t.y,
              characterId: t.character_id ?? null,
              isMonster: t.is_monster ?? false,
              imgOffsetX: 50, imgOffsetY: 50,
            }];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'campaign_tokens', filter: `campaign_id=eq.${campaignId}` },
        ({ old: row }) => {
          setTokens(prev => prev.filter(t => t.id !== (row as any).id));
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
    // Subscription para novos membros (atualiza lista de jogadores do Mestre)
    const membersChannel = supabase
      .channel(`mesa-members-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${campaignId}` },
        () => { fetchPlayerCharacters(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(membersChannel); };
  }, [campaignId]);

  // --- Logic de Dados/Ficha ---
  const [showFicha, setShowFicha] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  const [isDM, setIsDM] = useState(false);
  // DM visualizando ficha de jogador
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showFichaDM, setShowFichaDM] = useState(false);
  const [fichaCharacterIdDM, setFichaCharacterIdDM] = useState<number | string | null>(null);
  const [playerCharacters, setPlayerCharacters] = useState<{ id: number; name: string; img: string | null; imgOffsetX: number; imgOffsetY: number }[]>([]);

  // Busca e atualiza personagens dos jogadores da campanha (usado pelo Mestre)
  const fetchPlayerCharacters = async () => {
    const { data: membersData } = await supabase
      .from('campaign_members')
      .select('current_character_id')
      .eq('campaign_id', campaignId)
      .not('current_character_id', 'is', null);
    if (!membersData || membersData.length === 0) { setPlayerCharacters([]); return; }
    const charIds = membersData.map((m: any) => m.current_character_id).filter(Boolean);
    if (charIds.length === 0) { setPlayerCharacters([]); return; }
    const { data: charsData } = await supabase
      .from('characters')
      .select('id, name, img, imgOffsetX, imgOffsetY')
      .in('id', charIds);
    if (charsData) setPlayerCharacters(charsData.map((c: any) => ({ ...c, imgOffsetX: c.imgOffsetX ?? 50, imgOffsetY: c.imgOffsetY ?? 50 })) as any);
  };
  
  // Função de rolagem que virá do componente DiceRoller
  const [rollDiceFunc, setRollDiceFunc] = useState<((diceType: string, isSecret: boolean) => Promise<number | null>) | null>(null);

  // Busca role do usuário e personagem vinculado
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) return;

      setCurrentUserId(user.id);

      const { data: campaign } = await supabase
        .from('campaigns')
        .select('dm_id')
        .eq('id', campaignId)
        .maybeSingle();

      if (campaign?.dm_id === user.id) {
        setIsDM(true);
        await fetchPlayerCharacters();
      } else {
        const { data: member } = await supabase
          .from('campaign_members')
          .select('current_character_id')
          .eq('campaign_id', campaignId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.current_character_id) {
          setFichaCharacterId(member.current_character_id);
        }
      }

      // Carrega tokens do banco de dados
      const { data: dbTokens } = await supabase
        .from('campaign_tokens')
        .select('id, url, x, y, character_id, is_monster')
        .eq('campaign_id', campaignId);

      if (dbTokens && dbTokens.length > 0) {
        // Para tokens com personagem, busca dados visuais na tabela characters
        const charIds = dbTokens
          .filter((t: any) => t.character_id)
          .map((t: any) => t.character_id);

        let charMap: Record<number, { name: string; img: string; imgOffsetX: number; imgOffsetY: number }> = {};
        if (charIds.length > 0) {
          const { data: chars } = await supabase
            .from('characters')
            .select('id, name, img, imgOffsetX, imgOffsetY')
            .in('id', charIds);
          if (chars) {
            chars.forEach((c: any) => {
              charMap[c.id] = { name: c.name, img: c.img || '', imgOffsetX: c.imgOffsetX ?? 50, imgOffsetY: c.imgOffsetY ?? 50 };
            });
          }
        }

        setTokens(dbTokens.map((t: any) => {
          const charData = t.character_id ? charMap[t.character_id] : null;
          return {
            id: t.id,
            url: charData ? charData.img : (t.url || ''),
            x: t.x,
            y: t.y,
            characterId: t.character_id ?? null,
            name: charData?.name,
            imgOffsetX: charData?.imgOffsetX ?? 50,
            imgOffsetY: charData?.imgOffsetY ?? 50,
            isMonster: t.is_monster ?? false,
          };
        }));
      } else {
        // Se não há tokens salvos, cria a partir dos membros da campanha
        const { data: members } = await supabase
          .from('campaign_members')
          .select('current_character_id')
          .eq('campaign_id', campaignId)
          .not('current_character_id', 'is', null);

        if (members && members.length > 0) {
          const charIds = members.map((m: any) => m.current_character_id);
          const { data: chars } = await supabase
            .from('characters')
            .select('id, name, img, imgOffsetX, imgOffsetY')
            .in('id', charIds);

          if (chars && chars.length > 0) {
            const initialTokens: Token[] = chars.map((c: any, i: number) => ({
              id: crypto.randomUUID(),
              url: c.img || '',
              name: c.name,
              characterId: c.id,
              imgOffsetX: c.imgOffsetX ?? 50,
              imgOffsetY: c.imgOffsetY ?? 50,
              x: i * gridSize * 2,
              y: 0,
              isMonster: false,
            }));
            setTokens(initialTokens);
            // Persiste tokens iniciais no banco (apenas colunas que existem)
            await supabase.from('campaign_tokens').insert(
              initialTokens.map(t => ({
                id: t.id,
                campaign_id: campaignId,
                character_id: t.characterId,
                url: t.url,
                x: t.x,
                y: t.y,
                is_monster: false,
              }))
            );
          }
        }
      }
    };
    fetchUserRole();
  }, [supabase, campaignId]);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col relative font-sans select-none text-white">
      
      <div 
        className="flex flex-1 relative overflow-hidden bg-black" 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/*sidebar*/}
        <aside
          className={`absolute left-4 top-1/2 -translate-y-1/2 bg-[#0a120a]/80 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-500 flex flex-col items-center py-6 gap-6 z-40 shadow-[0_0_30px_rgba(0,0,0,0.5)]
          ${sidebarAberta ? 'w-14 opacity-100' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'}`}
        >
          <button
            onClick={() => router.push('/campanhas')}
            className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
            title="Início"
          >
            <Home size={22} />
          </button>

          {/* Jogador */}
          {!isDM && (
            <button
              onClick={() => {
                if (!fichaCharacterId) { alert('Você não vinculou um personagem a esta mesa!'); return; }
                setShowFicha(true);
              }}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
              title="Ficha"
            >
              <UserRound size={22} />
            </button>
          )}

          {/* Mestre */}
          {isDM && (
            <>
              <button
                onClick={() => setShowPlayerList(v => !v)}
                className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${showPlayerList ? 'text-[#00ff66] drop-shadow-[0_0_8px_#00ff66]' : 'text-white/30 hover:text-[#00ff66]'}`}
                title="Fichas dos Jogadores"
              >
                <Users size={22} />
              </button>

              <button
                onClick={() => setShowBooks(v => !v)}
                className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${showBooks ? 'text-[#00ff66] drop-shadow-[0_0_8px_#00ff66]' : 'text-white/30 hover:text-[#00ff66]'}`}
                title="Biblioteca"
              >
                <BookOpen size={22} />
              </button>

              <button
                onClick={() => setModalAtivo('Mapa')}
                className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
                title="Alterar Mapa"
              >
                <MapIcon size={22} />
              </button>

              <button
                onClick={() => setShowTokenLibrary(true)}
                className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
                title="Biblioteca de Tokens"
              >
                <ShieldCheck size={22} />
              </button>
            </>
          )}
        </aside>

        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-50 text-white/10 hover:text-[#00ff66] p-1 transition-colors"
        >
          {sidebarAberta ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* COMPONENTE AUTÔNOMO DE LIVROS DA CAMPANHA — apenas Mestre */}
        {isDM && <CampaignBooksWidget campaignId={campaignId} isOpen={showBooks} onToggle={() => setShowBooks(v => !v)} />}

        {/* Biblioteca de Tokens — apenas Mestre */}
        {isDM && <TokenLibraryWidget isOpen={showTokenLibrary} onToggle={() => setShowTokenLibrary(v => !v)} onAddToken={addTokenToMap} onUpload={handleTokenUpload} />}

        {/* Painel de fichas dos jogadores — apenas Mestre */}
        {isDM && showPlayerList && (
          <div className="absolute left-20 top-1/2 -translate-y-1/2 z-50 bg-[#0a120a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[180px] shadow-[0_0_30px_rgba(0,0,0,0.6)]">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] mb-1">Fichas dos Jogadores</span>
            {playerCharacters.length === 0 && (
              <span className="text-[10px] text-white/30">Nenhum jogador com personagem.</span>
            )}
            {playerCharacters.map(pc => (
              <button
                key={pc.id}
                onClick={() => { setFichaCharacterIdDM(pc.id); setShowFichaDM(true); setShowPlayerList(false); }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#00ff66]/10 hover:text-[#00ff66] transition-all text-left text-[11px] text-white/70 font-medium"
              >
                <div
                  className="w-7 h-7 rounded-full bg-neutral-800 shrink-0 border border-white/10"
                  style={pc.img ? { backgroundImage: `url(${pc.img})`, backgroundSize: 'cover', backgroundPosition: `${pc.imgOffsetX}% ${pc.imgOffsetY}%` } : {}}
                />
                <span className="truncate">{pc.name}</span>
              </button>
            ))}
          </div>
        )}

        {/*area central*/}
        <main 
          className="flex-grow relative overflow-hidden bg-black cursor-default"
          onMouseDown={(e) => handleMouseDown(e)}
          onWheel={(e) => {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
          }}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ 
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: (isDraggingMap || isDraggingToken) ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div className="relative pointer-events-auto">
              {!mapaUrl ? (
                <div className="w-[1000px] h-[800px] flex flex-col items-center justify-center gap-4 text-white/10">
                  <MapIcon size={64} strokeWidth={1} />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em]">Aguardando Mapa...</span>
                </div>
              ) : (
                <img src={mapaUrl} className="max-w-none block opacity-80 shadow-2xl" alt="Map" />
              )}
              
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`, 
                  backgroundSize: `${gridSize}px ${gridSize}px` 
                }} 
              />

              {tokens.map(token => (
                <div
                  key={token.id}
                  onMouseDown={(e) => handleMouseDown(e, token.id)}
                  style={{
                    transform: `translate(${token.x}px, ${token.y}px)`,
                    position: 'absolute',
                    top: mapaUrl ? '0' : '50%',
                    left: mapaUrl ? '0' : '50%',
                    marginTop: mapaUrl ? '0' : `-${gridSize/2}px`,
                    marginLeft: mapaUrl ? '0' : `-${gridSize/2}px`,
                    width: `${gridSize}px`,
                    zIndex: tokenSelecionado === token.id ? 100 : 10,
                  }}
                  className="flex flex-col items-center cursor-move group"
                >
                  <div 
                    style={{ width: `${tokenSize}px`, height: `${tokenSize}px` }}
                    className={`relative overflow-hidden transition-all duration-200 ${
                      tokenSelecionado === token.id
                        ? 'shadow-[0_0_20px_#00ff66] scale-110' 
                        : 'group-hover:shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                    }`}
                  >
                    {token.url ? (
                      <img
                        src={token.url}
                        alt={token.name ?? ''}
                        draggable={false}
                        style={{ objectPosition: `${token.imgOffsetX ?? 50}% ${token.imgOffsetY ?? 50}%` }}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <span className="text-white/20 text-lg">?</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <div className="w-[360px] h-full bg-[#080808] border-l border-white/5 z-40 relative">
          <ChatWidget 
            campaignId={campaignId} 
            isDiceReady={!!rollDiceFunc} 
            onRollDice={rollDiceFunc ? (type, secret) => rollDiceFunc(type, secret) : (async () => null)} 
          />
        </div>
      </div>

      {/* COMPONENTE EXTRAÍDO DOS DADOS FÍSICOS */}
      <DiceRoller 
        campaignId={campaignId}
        isDM={isDM}
        currentUserId={currentUserId}
        onReady={(func) => setRollDiceFunc(() => func)} 
      />
      
      {/* Modal de mapa */}
      {modalAtivo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
          <div className="bg-[#0a0a0a] border border-[#00ff66]/20 p-10 rounded-[24px] w-full max-w-md relative shadow-[0_0_50px_rgba(0,255,102,0.1)]">
            <button onClick={() => setModalAtivo(null)} className="absolute top-6 right-6 text-white/40 hover:text-[#00ff66] transition-colors">
              <X size={20}/>
            </button>
            <h2 className="text-white text-2xl font-bold mb-10 uppercase tracking-[0.2em] text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              Alterar Mapa
            </h2>
            <div className="flex flex-col gap-8">
              <label className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:bg-[#00ff66]/[0.02] hover:border-[#00ff66]/30 group transition-all duration-500">
                <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:border-[#00ff66] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] transition-all">
                  <Upload className="text-white/20 group-hover:text-[#00ff66] transition-all" size={32} />
                </div>
                <span className="text-white font-bold text-[11px] uppercase tracking-widest opacity-80">Arraste ou clique</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'Mapa')} />
              </label>
              <button
                onClick={() => setModalAtivo(null)}
                className="w-full py-4 bg-[#00ff66] text-black font-black text-[12px] uppercase tracking-[0.15em] rounded-xl hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,255,102,0.4)] transition-all duration-300 active:scale-[0.98]"
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <FichaModal
        isOpen={showFicha}
        onClose={() => setShowFicha(false)}
        characterId={fichaCharacterId}
        campaignId={campaignId}
        onRollDice={rollDiceFunc ?? (async () => null)}
      />

      {/* Ficha de jogador — visualização do Mestre */}
      <FichaModal
        isOpen={showFichaDM}
        onClose={() => setShowFichaDM(false)}
        characterId={fichaCharacterIdDM}
        campaignId={campaignId}
        onRollDice={rollDiceFunc ?? (async () => null)}
        readOnly
      />
    </div>
  );
}