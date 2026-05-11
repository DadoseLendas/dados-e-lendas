"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  UserRound, Users, Home, BookOpen, Map as MapIcon, 
  ShieldCheck, ChevronLeft, ChevronRight, X, Upload, HelpCircle 
} from 'lucide-react'; 
import { FiBook } from 'react-icons/fi';
import { GiSpellBook } from 'react-icons/gi';
import { createClient } from '@/utils/supabase/client';
import FichaModal from '@/app/components/ui/ficha-modal';
import SpellModal from '@/app/components/ui/spell-modal';
import SpellCaster from '@/app/components/ui/spell-caster';
import ChatWidget from '@/app/components/ui/chat-widget'; 
import CampaignBooksWidget from '@/app/components/ui/campaign-books-widget';
import DiceRoller from '@/app/components/ui/dice-roller';
import TokenLibraryWidget from '@/app/components/ui/token-library-widget';
import MapEditorModal from '@/app/components/ui/map-editor-modal';
import { EffectResult, SpellExecution } from '@/utils/spell-executor';
interface Token {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation?: number;
  name?: string;
  characterId?: number | null;
  imgOffsetX?: number;
  imgOffsetY?: number;
  isMonster?: boolean;
  hp?: number;
  maxHp?: number;
  sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
}
// Nota: removido o mapeamento para o SpellCasterMap; mantemos tokens simples
const CONDICOES_RPG = [
  { 
  nome: "Confuso", 
  desc: "Role um d10 no início de cada um de seus turnos para determinar seu comportamento.",
  tabela: [
    { dado: "1", efeito: "Move-se em direção aleatória (d8). Não realiza ação." },
    { dado: "2-6", efeito: "Não se move nem realiza ações neste turno." },
    { dado: "7-8", efeito: "Ataque corpo a corpo contra alvo aleatório ao alcance." },
    { dado: "9-10", efeito: "Pode agir e se mover normalmente." }
  ]
},
  { 
    nome: "Exaustão", 
    desc: "Medida em 6 níveis. Uma criatura sofre o efeito do seu nível atual e de todos os anteriores.",
    niveis: [
      "1: Desvantagem em testes de atributo",
      "2: Deslocamento reduzido pela metade",
      "3: Desvantagem em jogadas de ataque e salvaguardas",
      "4: Pontos de vida máximos reduzidos pela metade",
      "5: Deslocamento reduzido para 0",
      "6: Morte"
   ],
  // Novo campo de notas extras formatado
  notas: [
    { titulo: "Acúmulo", texto: "Se um personagem já exausto sofre outro efeito que induz exaustão, o nível atual de exaustão do personagem aumenta conforme especificado pelo novo efeito." },
    { titulo: "Recuperação", texto: "Efetuar um descanso longo reduz o nível de exaustão em 1, desde que o personagem também se alimente e hidrate adequadamente durante o descanso." },
    { titulo: "", texto: "Algumas magias e habilidades também podem eliminar ou aliviar os efeitos da exaustão." }
  ]
  },
  { nome: "Agarrado", desc: "Seu deslocamento se torna 0, e você não pode se beneficiar de bônus de deslocamento. A condição encerra caso a criatura que a agarrou fique incapacitada. A condição se encerra se um efeito remover a ciatura agarrada do alcance da criatura que a agarrou ou do efeito que causa a condição" },
  { nome: "Amedrontado", desc: "Uma criatura amedrontada tem desvantagem em testes de atributo e jogadas de ataque enquanto a fonte de seu medo estiver em sua linha de visão. A criatura não pode se mover por vontade própria para perto da fonte de seu medo." },
  { nome: "Atordoado", desc: "Você está incapacitado, não pode se mover e somente fala balbuciando. Jogadas de ataque contra você possuem vantagem. Você falha automaticamente em testes de resistência de Força e Destreza." },
  { nome: "Caído", desc: " Sua única opção de movimento é rastejar, a menos que se levante. Você tem desvantagem em jogadas de ataque. Jogadas de ataque contra você possuem vantagens se o atacante estiver a 1,5 metros de você. De outra maneira, a jogada de ataque possui desvantagem."},
  { nome: "Cego", desc: "Você não pode enxergar e automaticamente falha em testes de Percepção que dependam da visão. Jogadas de ataque contra você possuem vantagem, e suas jogadas de ataque possuem desvantagem." },
  { nome: "Enfeitiçado", desc: "Você não pode atacar qurm tr rnfeitiçõu ou tê-lo como alvo de habilidades ou efeitos mágicos nocivos. Quem o enfeitiçou possui vantagem em testes de habilidade feitos para interagir socialmente com a criatura." },
  { nome: "Envenenado", desc: "Você possui desvantagem em jogadas de ataque e testes de atributos." },
  { nome: "Impedido", desc: "Seu deslocamento se torna 0, e você não pode se beneficiar de qualquer bônus em seu deslocamento. Jogadas de ataque contra você possuem vantagem. Você sofre desvantagem em jogadas de ataque. Você sofre desvantagem em testes de resistência de Destreza."},
  { nome: "Incapacitado", desc: "Você não pode realizar ações ou reações." },
  { nome: "Inconsciente", desc: "Você está incapacitado, não pode se mover ou falar e não tem ciência de seus arredores. Você larga tudo que estiver segurando e fica caído. Você falha automaticamente em testes de resistência de Força ou Destreza. Jogadas de ataque contra você póssuem vantagem. Qualquer ataque que o atinja é um acerto crítico, se o atacante estiver a 1,5 metros de você."},
  { nome:" Invisível", desc: "Uma criatura invisível é impossível de ser vista sem ajuda de magia ou um sentido especial. Para propósitos de esconder-se, a criatura está Totalmente obscurecida.A localização da criatura pode ser detectada por qualquer som que ela faça ou qualquer rastro que ela deixe. Jogadas de ataque contra a criatura têm desvantagem, e as jogadas de ataque da criatura têm vantagem"},
  { nome: "Paralisado", desc: "Você está incapacitado e não pode se mover ou falar. Você falha automaticamente em testes de resistência de Força e Destreza. Jogadas de ataque contra você possuem vantagem. Qualquer ataque que atinja você é um acerto crítico, se o atacante estiver a 1,5 metros de você."},
  { nome: " Petrificado", desc: "Você é transformado, juntamente com todos os objetos não-mágicos que estiver vestindo ou carregando, em uma substância sólida e inanimada (geralmente pedra). Seu peso é multiplicado por dez, e para de envelhecer. você está incapacitado, não pode se mover ou falar e não tem ciência de seus arredores. Jogadas de ataque contra você possuem vantagem. Você falha automaticamente em testes de resistência de Força e Destreza. Você tem resistência a todos os tipos de dano. Você fica imune a veneno e doenças, embora um veneno ou doença previamente presentes em seu sistema seja apenas suspenso, não neutralizado."},
  { nome: "Surdo", desc: "Você falha automatizamente em qualquer teste de habilidade que requeira o uso da audição"},
  { nome: "Dominado", desc: "Uma criatura dominada é controlada por outra criatura. Uma criatura dominada só realiza ações que a fonte dominante escolher, e não faz nada que o dominante não permita."},
  { nome: "Possuído", desc: "Uma criatura possuída fica incapacitada e perde o controle sobre seu corpo para a criatura que a possuiu."}
];

export default function TelaDeMesa() {
  const supabase = useMemo(() => createClient(), []);
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
  const [mapGridPx, setMapGridPx] = useState<number>(50);
  const [mapScale, setMapScale] = useState<number>(100);
  const [gridColor, setGridColor] = useState<string>('#ffffff');
  const [gridOpacity, setGridOpacity] = useState<number>(0.08);
  const [gridThickness, setGridThickness] = useState<number>(1);
  const [gridDashed, setGridDashed] = useState<boolean>(false);
  const [gridDashFrequency, setGridDashFrequency] = useState<number>(5);
  const [gridDimension, setGridDimension] = useState<string>('5 pes'); // NOVO: dimensão do grid
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [showRuler, setShowRuler] = useState(false);
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number; y: number } | null>(null);
  const [rulerLocked, setRulerLocked] = useState(false);
  const [isRulerDragging, setIsRulerDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [activeSpellCast, setActiveSpellCast] = useState<SpellExecution | null>(null);

  //tokens
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenSelecionado, setTokenSelecionado] = useState<string | null>(null);
  const [isDraggingToken, setIsDraggingToken] = useState(false);
  const mapContentRef = useRef<HTMLDivElement | null>(null);

  // Realtime refs
  const tokensRef = useRef<Token[]>([]);
  const draggingPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastBroadcastRef = useRef<number>(0);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dragMovedRef = useRef(false); // detecta se foi drag ou click

  // Keep tokensRef in sync with state (for use inside event handlers)
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  
  const gridSize = mapGridPx;
  const tokenSizeBase = Math.min(gridSize, 60); // base cap
  const gridDistanceInfo = useMemo(() => {
    const match = gridDimension.trim().match(/^([\d.,]+)\s*(.*)$/);
    const value = match ? Number.parseFloat(match[1].replace(',', '.')) : 5;
    const rawUnit = (match?.[2]?.trim() || 'pes').toLowerCase();
    const unit = rawUnit === 'ft' || rawUnit === 'feet' ? 'pes' : rawUnit === 'metro' || rawUnit === 'metros' ? 'm' : rawUnit;
    return {
      value: Number.isFinite(value) && value > 0 ? value : 5,
      unit,
    };
  }, [gridDimension]);
  const footprintForCategory = (cat?: string) => {
    switch (cat) {
      case 'Tiny': return 0.5; // 1/4 area -> side = 0.5
      case 'Small': return 1;
      case 'Medium': return 1;
      case 'Large': return 2;
      case 'Huge': return 3;
      case 'Gargantuan': return 4;
      default: return 1;
    }
  };
  const mapScalePercent = mapScale / 100;
  const rulerIsActive = Boolean(rulerStart);
  const getLocalPointFromMouse = (clientX: number, clientY: number) => {
    const rect = mapContentRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;

    if (x < 0 || y < 0 || x > rect.width / zoom || y > rect.height / zoom) {
      return null;
    }

    return { x, y };
  };
  const getRulerDistance = () => {
    if (!rulerStart || !rulerEnd) return null;
    const dx = rulerEnd.x - rulerStart.x;
    const dy = rulerEnd.y - rulerStart.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    const squares = pixelDistance / gridSize;
    const baseDistance = squares * gridDistanceInfo.value;
    const meters = gridDistanceInfo.unit === 'm' ? baseDistance : baseDistance * 0.3048;
    const feet = gridDistanceInfo.unit === 'm' ? baseDistance * 3.28084 : baseDistance;
    return { pixelDistance, squares, baseDistance, meters, feet };
  };
  const normalizeRotation = (value: number) => {
    const normalized = value % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  };
  const broadcastRulerState = (payload: {
    showRuler: boolean;
    rulerStart: { x: number; y: number } | null;
    rulerEnd: { x: number; y: number } | null;
    rulerLocked: boolean;
    isRulerDragging: boolean;
  }) => {
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'ruler-change',
      payload,
    });
  };

  const getGridBgStyle = () => {
    const r = parseInt(gridColor.slice(1, 3), 16);
    const g = parseInt(gridColor.slice(3, 5), 16);
    const b = parseInt(gridColor.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${gridOpacity})`;
    
    if (gridDashed) {
      const dashSize = Math.max(2, gridSize / gridDashFrequency);
      const svg = `<svg width="${gridSize}" height="${gridSize}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="${gridSize}" y2="0" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
        <line x1="0" y1="0" x2="0" y2="${gridSize}" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
      </svg>`;
      return {
        backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(svg)}')`,
        backgroundSize: `${gridSize}px ${gridSize}px`
      };
    } else {
      return {
        backgroundImage: `linear-gradient(to right, ${rgba} ${gridThickness}px, transparent ${gridThickness}px), linear-gradient(to bottom, ${rgba} ${gridThickness}px, transparent ${gridThickness}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`
      };
    }
  }; 

  //movimento do mapa
  const handleMouseDown = (e: React.MouseEvent, tokenId?: string) => {
    if (tokenId) {
      setTokenSelecionado(tokenId);
      setIsDraggingToken(true);
      dragMovedRef.current = false;
      const token = tokensRef.current.find(t => t.id === tokenId);
      if (token) draggingPosRef.current = { x: token.x, y: token.y };
      e.stopPropagation();
    } else if (showRuler && !rulerLocked && e.button === 0) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY);
      if (!point) return;
      setRulerStart(point);
      setRulerEnd(point);
      setIsRulerDragging(true);
      setRulerLocked(false);
      setIsDraggingMap(false);
      broadcastRulerState({
        showRuler: true,
        rulerStart: point,
        rulerEnd: point,
        rulerLocked: false,
        isRulerDragging: true,
      });
      e.preventDefault();
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
    } else if (showRuler && rulerStart && isRulerDragging && !rulerLocked) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY);
      if (point) {
        setRulerEnd(point);
        broadcastRulerState({
          showRuler: true,
          rulerStart,
          rulerEnd: point,
          rulerLocked: false,
          isRulerDragging: true,
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
    if (isRulerDragging && rulerStart) {
      setRulerLocked(true);
      setIsRulerDragging(false);
      broadcastRulerState({
        showRuler: true,
        rulerStart,
        rulerEnd: rulerEnd ?? rulerStart,
        rulerLocked: true,
        isRulerDragging: false,
      });
    }
    setIsDraggingMap(false);
    setIsDraggingToken(false);
  };

  //teclado (WASD + Delete)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!tokenSelecionado) return;
      const id = tokenSelecionado;
      const token = tokensRef.current.find(t => t.id === id);
      if (!token) return;

      if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'e') {
        if (!token.isMonster) return;
        e.preventDefault();
        const step = e.key.toLowerCase() === 'q' ? -15 : 15;
        const newRotation = normalizeRotation((token.rotation ?? 0) + step);
        setTokens(prev => prev.map(t => t.id === id ? { ...t, rotation: newRotation } : t));
        realtimeChannelRef.current?.send({
          type: 'broadcast',
          event: 'token-rotate',
          payload: { tokenId: id, rotation: newRotation },
        });
        supabase.from('campaign_tokens').update({ rotation: newRotation })
          .eq('id', id).eq('campaign_id', campaignId).then(() => {});
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
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
    if (tipo === 'Mapa') {
      const ext = file.name.split('.').pop() ?? 'png';
      const fileName = `maps/${campaignId}-map.${ext}`;
      console.log('[MAPA] Iniciando upload:', fileName);
      const { error } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) {
        console.error('[MAPA] Erro no upload:', error.message);
        alert('Erro ao fazer upload do mapa: ' + error.message);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('campaign-assets').getPublicUrl(fileName);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      setMapPreviewUrl(cacheBustedUrl);
      setShowMapEditor(true);
      setModalAtivo(null);
    }
    e.target.value = '';
  };

  const handleMapEditorConfirm = async (gridPx: number, mapScale: number, gridColor: string, gridOpacity: number, gridThickness: number, gridDashed: boolean, gridDashFrequency: number, gridDimension: string) => {
    if (!mapPreviewUrl) return;
    
    setMapGridPx(gridPx);
    setMapScale(mapScale);
    setGridColor(gridColor);
    setGridOpacity(gridOpacity);
    setGridThickness(gridThickness);
    setGridDashed(gridDashed);
    setGridDashFrequency(gridDashFrequency);
    setGridDimension(gridDimension);
    setMapaUrl(mapPreviewUrl);
    setShowMapEditor(false);
    setMapPreviewUrl(null);
    
    // Salvar no banco com tratamento de erro
    try {
      console.log('[MAPA] Salvando no banco com parâmetros:', {
        map_url: mapPreviewUrl,
        map_grid_px: gridPx,
        map_scale: mapScale,
        map_grid_color: gridColor,
        map_grid_opacity: gridOpacity,
        map_grid_thickness: gridThickness,
        map_grid_dashed: gridDashed,
        map_grid_dash_frequency: gridDashFrequency,
        map_grid_dimension: gridDimension
      });

      const { data, error } = await supabase.from('campaigns').update({ 
        map_url: mapPreviewUrl, 
        map_grid_px: gridPx,
        map_scale: mapScale,
        map_grid_color: gridColor,
        map_grid_opacity: gridOpacity,
        map_grid_thickness: gridThickness,
        map_grid_dashed: gridDashed,
        map_grid_dash_frequency: gridDashFrequency,
        map_grid_dimension: gridDimension
      }).eq('id', campaignId).select();

      if (error) {
        console.error('[MAPA] Erro ao salvar no banco:', error);
        alert('⚠️ Erro ao salvar mapa: ' + error.message);
        return;
      }

      console.log('[MAPA] Salvo com sucesso! Dados:', data);
    } catch (err) {
      console.error('[MAPA] Erro ao salvar:', err);
      alert('⚠️ Erro inesperado ao salvar mapa');
      return;
    }
    
    // Broadcast do mapa para outros jogadores
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'map-change',
      payload: { mapUrl: mapPreviewUrl, gridPx, mapScale, gridColor, gridOpacity, gridThickness, gridDashed, gridDashFrequency, gridDimension },
    });
  };

  const addTokenToMap = async (t: { name: string; url: string; sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' }) => {
    const newId = crypto.randomUUID();
    const defaultSize = t.sizeCategory ?? 'Medium';
    const newToken: Token = { id: newId, url: t.url, x: 0, y: 0, rotation: 0, name: t.name, isMonster: true, sizeCategory: defaultSize };
    setTokens(prev => [...prev, newToken]);
    const { data, error } = await supabase.from('campaign_tokens').insert({
      id: newId, campaign_id: campaignId, url: t.url, x: 0, y: 0, is_monster: true, size_category: defaultSize,
    }).select();
    if (error) console.error('[TOKEN] Erro ao inserir token:', error);
    realtimeChannelRef.current?.send({ type: 'broadcast', event: 'token-add', payload: { token: newToken } });
  };

  const handleTokenUpload = async (file: File) => {
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `tokens/${campaignId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('campaign-assets')
      .upload(fileName, file, { contentType: file.type, upsert: true });
    if (error) { console.error('Erro ao fazer upload do token:', error); return; }
    const { data: { publicUrl } } = supabase.storage.from('campaign-assets').getPublicUrl(fileName);
    await addTokenToMap({ name: file.name.replace(/\.[^.]+$/, ''), url: publicUrl });
  };

  // Subscription realtime de tokens
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`mesa-tokens-${campaignId}`)
      .on('broadcast', { event: 'token-move' }, ({ payload }) => {
        setTokens(prev => prev.map(t =>
          t.id === payload.tokenId ? { ...t, x: payload.x, y: payload.y, rotation: payload.rotation ?? t.rotation ?? 0 } : t
        ));
      })
      .on('broadcast', { event: 'token-rotate' }, ({ payload }) => {
        setTokens(prev => prev.map(t =>
          t.id === payload.tokenId ? { ...t, rotation: normalizeRotation(payload.rotation ?? 0) } : t
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
      .on('broadcast', { event: 'map-change' }, ({ payload }) => {
        if (payload.mapUrl) setMapaUrl(payload.mapUrl);
        if (payload.gridPx) setMapGridPx(payload.gridPx);
        if (payload.mapScale) setMapScale(payload.mapScale);
        if (payload.gridColor) setGridColor(payload.gridColor);
        if (payload.gridOpacity !== undefined) setGridOpacity(payload.gridOpacity);
        if (payload.gridThickness) setGridThickness(payload.gridThickness);
        if (payload.gridDashed !== undefined) setGridDashed(payload.gridDashed);
        if (payload.gridDashFrequency) setGridDashFrequency(payload.gridDashFrequency);
        if (payload.gridDimension) setGridDimension(payload.gridDimension);
      })
      .on('broadcast', { event: 'ruler-change' }, ({ payload }) => {
        setShowRuler(Boolean(payload?.showRuler));
        setRulerStart(payload?.rulerStart ?? null);
        setRulerEnd(payload?.rulerEnd ?? null);
        setRulerLocked(Boolean(payload?.rulerLocked));
        setIsRulerDragging(Boolean(payload?.isRulerDragging));
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
              rotation: t.rotation ?? 0,
              characterId: t.character_id ?? null,
              isMonster: t.is_monster ?? false,
              imgOffsetX: 50, imgOffsetY: 50,
              sizeCategory: t.size_category ?? 'Medium',
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
    // Subscription para novos membros (atualiza lista de jogadores do Mestre e cria token)
    const membersChannel = supabase
      .channel(`mesa-members-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${campaignId}` },
        async ({ new: row }) => {
          await fetchPlayerCharacters();
          // Se o membro tem personagem vinculado, cria token caso não exista
          const charId = (row as any)?.current_character_id;
          if (!charId) return;
          const alreadyExists = tokensRef.current.some(t => String(t.characterId) === String(charId));
          if (alreadyExists) return;
          const { data: char } = await supabase
            .from('characters')
            .select('id, name, img, imgOffsetX, imgOffsetY')
            .eq('id', charId)
            .maybeSingle();
          if (!char) return;
          const newId = crypto.randomUUID();
          const newToken: Token = {
            id: newId,
            url: (char as any).img || '',
            x: 0, y: 0,
            rotation: 0,
            name: (char as any).name,
            characterId: (char as any).id,
            imgOffsetX: (char as any).imgOffsetX ?? 50,
            imgOffsetY: (char as any).imgOffsetY ?? 50,
            isMonster: false,
            sizeCategory: 'Medium',
          };
          setTokens(prev => [...prev, newToken]);
          await supabase.from('campaign_tokens').insert({
            id: newId,
            campaign_id: campaignId,
            character_id: newToken.characterId,
            url: newToken.url,
            x: 0, y: 0,
            size_category: newToken.sizeCategory ?? 'Medium',
            is_monster: false,
          });
          realtimeChannelRef.current?.send({
            type: 'broadcast', event: 'token-add', payload: { token: newToken },
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(membersChannel); };
  }, [campaignId]);

  // --- Logic de Dados/Ficha ---
  const [showFicha, setShowFicha] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  const [isDM, setIsDM] = useState(false);
  // DM visualizando ficha de jogador
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showFichaDM, setShowFichaDM] = useState(false);
  const [fichaCharacterIdDM, setFichaCharacterIdDM] = useState<number | string | null>(null);
  const [playerCharacters, setPlayerCharacters] = useState<{ id: number; name: string; img: string | null; imgOffsetX: number; imgOffsetY: number }[]>([]);

  const [modalAjuda, setModalAjuda] = useState(false);
  const [buscaCondicao, setBuscaCondicao] = useState("");
  const [itemExpandido, setItemExpandido] = useState<string | null>(null);

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
  const [rollDiceFunc, setRollDiceFunc] = useState<((formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage') => Promise<any | null>) | null>(null);

  const casterToken = useMemo(() => {
    const ownToken = tokens.find((token) => String(token.characterId) === String(fichaCharacterId));
    if (ownToken) return ownToken;
    if (tokenSelecionado) {
      const selected = tokens.find((token) => token.id === tokenSelecionado);
      if (selected) return selected;
    }
    return tokens[0] ?? null;
  }, [fichaCharacterId, tokenSelecionado, tokens]);

  const spellCasterTokens = useMemo(() => {
    return tokens.map((token) => ({
      id: token.id,
      x: token.x,
      y: token.y,
      raio: gridSize * footprintForCategory(token.sizeCategory) * 0.5,
      nome: token.name || token.id,
      pvAtuais: token.hp,
      pvMax: token.maxHp,
    }));
  }, [gridSize, tokens]);

  const handleSpellLaunch = (spell: SpellExecution) => {
    setActiveSpellCast(spell);
    setShowSpellModal(false);
  };

  const handleSpellCast = useCallback((results: EffectResult[]) => {
    setTokens((prev) => prev.map((token) => {
      const result = results.find((item) => item.tokenId === token.id);
      if (!result) return token;

      const currentHp = token.hp ?? token.maxHp ?? 0;
      const maxHp = token.maxHp ?? currentHp;
      const nextHp = Math.max(0, Math.min(maxHp, currentHp - result.danoRecebido));
      return { ...token, hp: nextHp, maxHp };
    }));
  }, []);

  // Busca role do usuário e personagem vinculado
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) return;

      setCurrentUserId(user.id);

      // Busca dm_id, map_url e map_grid_px da campanha
      // Nota: Tenta carregar as colunas novas, mas faz fallback se não existirem
      let campaign: any = null;
      let campaignError: any = null;

      try {
        // Tenta com TODAS as colunas (após migrations)
        const result = await supabase
          .from('campaigns')
          .select('dm_id, map_url, map_grid_px, map_scale, map_grid_color, map_grid_opacity, map_grid_thickness, map_grid_dashed, map_grid_dash_frequency, map_grid_dimension')
          .eq('id', campaignId)
          .maybeSingle();
        
        campaign = result.data;
        campaignError = result.error;

        console.log('[MAPA] Query completa - Dados:', campaign, 'Erro:', campaignError?.message);

        // Se falhar, tenta só as colunas antigas
        if (!campaign || campaignError) {
          console.log('[MAPA] Tentando fallback com colunas antigas...');
          const fallbackResult = await supabase
            .from('campaigns')
            .select('dm_id, map_url, map_grid_px')
            .eq('id', campaignId)
            .maybeSingle();
          
          campaign = fallbackResult.data;
          campaignError = fallbackResult.error;
          console.log('[MAPA] Fallback - Dados:', campaign, 'Erro:', campaignError?.message);
        }
      } catch (err) {
        console.error('[MAPA] Erro ao carregar campanha:', err);
      }

      // Debug: Mostra cada campo individualmente
      if (campaign) {
        console.log('[MAPA] Campos carregados:');
        console.log('  map_url:', (campaign as any).map_url ? '✓' : '✗');
        console.log('  map_grid_px:', (campaign as any).map_grid_px);
        console.log('  map_scale:', (campaign as any).map_scale);
        console.log('  map_grid_color:', (campaign as any).map_grid_color);
        console.log('  map_grid_opacity:', (campaign as any).map_grid_opacity);
        console.log('  map_grid_thickness:', (campaign as any).map_grid_thickness);
        console.log('  map_grid_dashed:', (campaign as any).map_grid_dashed);
        console.log('  map_grid_dash_frequency:', (campaign as any).map_grid_dash_frequency);
        console.log('  map_grid_dimension:', (campaign as any).map_grid_dimension);
      }

      // Carrega mapa (coluna antiga, sempre existe)
      if ((campaign as any)?.map_url) {
        console.log('[MAPA] 🎯 Carregando mapa_url:', (campaign as any).map_url);
        setMapaUrl((campaign as any).map_url);
      } else {
        console.log('[MAPA] ⚠️ map_url vazio ou nulo');
      }
      
      // Carrega grid configs (colunas novas, podem não existir ainda)
      if ((campaign as any)?.map_grid_px) {
        console.log('[MAPA] Carregando map_grid_px:', (campaign as any).map_grid_px);
        setMapGridPx((campaign as any).map_grid_px);
      }
      if ((campaign as any)?.map_scale) {
        console.log('[MAPA] Carregando map_scale:', (campaign as any).map_scale);
        setMapScale((campaign as any).map_scale);
      }
      if ((campaign as any)?.map_grid_color) {
        console.log('[MAPA] Carregando map_grid_color:', (campaign as any).map_grid_color);
        setGridColor((campaign as any).map_grid_color);
      }
      if ((campaign as any)?.map_grid_opacity) {
        console.log('[MAPA] Carregando map_grid_opacity:', (campaign as any).map_grid_opacity);
        setGridOpacity((campaign as any).map_grid_opacity);
      }
      if ((campaign as any)?.map_grid_thickness) {
        console.log('[MAPA] Carregando map_grid_thickness:', (campaign as any).map_grid_thickness);
        setGridThickness((campaign as any).map_grid_thickness);
      }
      if ((campaign as any)?.map_grid_dashed !== undefined) {
        console.log('[MAPA] Carregando map_grid_dashed:', (campaign as any).map_grid_dashed);
        setGridDashed((campaign as any).map_grid_dashed);
      }
      if ((campaign as any)?.map_grid_dash_frequency) {
        console.log('[MAPA] Carregando map_grid_dash_frequency:', (campaign as any).map_grid_dash_frequency);
        setGridDashFrequency((campaign as any).map_grid_dash_frequency);
      }
      if ((campaign as any)?.map_grid_dimension) {
        console.log('[MAPA] Carregando map_grid_dimension:', (campaign as any).map_grid_dimension);
        setGridDimension((campaign as any).map_grid_dimension);
      }

      console.log('[DM] user.id:', user.id, '| campaignId:', campaignId);
      console.log('[DM] campaign:', campaign, '| error:', campaignError?.message);

      // Verifica se o usuário é o mestre, 
      let userIsDM = campaign?.dm_id === user.id;

      if (!userIsDM) {
        // Fallback: query filtrada por dm_id (funciona mesmo com RLS restritivo)
        const { data: ownedCampaign, error: ownedError } = await supabase
          .from('campaigns')
          .select('id')
          .eq('id', campaignId)
          .eq('dm_id', user.id)
          .maybeSingle();

        console.log('[DM] fallback ownedCampaign:', ownedCampaign, '| error:', ownedError?.message);
        if (ownedCampaign) userIsDM = true;
      }

      console.log('[DM] isDM final:', userIsDM);

      if (userIsDM) {
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

      // Carrega tokens do banco de dados (inclui categoria de tamanho)
      let dbTokens: any[] | null = null;
      const { data: dbTokensWithRotation, error: dbTokensWithRotationError } = await supabase
        .from('campaign_tokens')
        .select('id, url, x, y, rotation, character_id, is_monster, size_category')
        .eq('campaign_id', campaignId);

      if (dbTokensWithRotationError) {
        const { data: dbTokensFallback } = await supabase
          .from('campaign_tokens')
          .select('id, url, x, y, character_id, is_monster, size_category')
          .eq('campaign_id', campaignId);
        dbTokens = dbTokensFallback;
      } else {
        dbTokens = dbTokensWithRotation;
      }

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
            rotation: t.rotation ?? 0,
            characterId: t.character_id ?? null,
            name: charData?.name,
            imgOffsetX: charData?.imgOffsetX ?? 50,
            imgOffsetY: charData?.imgOffsetY ?? 50,
            isMonster: t.is_monster ?? false,
            sizeCategory: t.size_category ?? 'Medium',
          };
        }));

        // Verifica se algum membro com personagem não tem token e cria
        const { data: members } = await supabase
          .from('campaign_members')
          .select('current_character_id')
          .eq('campaign_id', campaignId)
          .not('current_character_id', 'is', null);

        if (members && members.length > 0) {
          const existingCharIds = new Set(dbTokens.filter((t: any) => t.character_id).map((t: any) => String(t.character_id)));
          const missingCharIds = members
            .map((m: any) => m.current_character_id)
            .filter((id: any) => id && !existingCharIds.has(String(id)));

          if (missingCharIds.length > 0) {
            const { data: missingChars } = await supabase
              .from('characters')
              .select('id, name, img, imgOffsetX, imgOffsetY')
              .in('id', missingCharIds);

            if (missingChars && missingChars.length > 0) {
              const newTokens: Token[] = missingChars.map((c: any, i: number) => ({
                id: crypto.randomUUID(),
                url: c.img || '',
                name: c.name,
                characterId: c.id,
                imgOffsetX: c.imgOffsetX ?? 50,
                imgOffsetY: c.imgOffsetY ?? 50,
                x: i * gridSize * 2,
                y: 0,
                rotation: 0,
                isMonster: false,
                sizeCategory: 'Medium',
              }));
              setTokens(prev => [...prev, ...newTokens]);
              await supabase.from('campaign_tokens').insert(
                newTokens.map(t => ({
                  id: t.id,
                  campaign_id: campaignId,
                  character_id: t.characterId,
                  url: t.url,
                  x: t.x,
                  y: t.y,
                  size_category: t.sizeCategory ?? 'Medium',
                  is_monster: false,
                }))
              );
            }
          }
        }
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
              rotation: 0,
              isMonster: false,
              sizeCategory: 'Medium',
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
                size_category: t.sizeCategory ?? 'Medium',
                is_monster: false,
              }))
            );
          }
        }
      }
    };
    fetchUserRole();
  }, [campaignId]);

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

          {!isDM && (
            <button
              onClick={() => {
                if (!fichaCharacterId) { alert('Você não vinculou um personagem a esta mesa!'); return; }
                setShowSpellModal(true);
              }}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
              title="Magias"
            >
              {showSpellModal ? <GiSpellBook size={28} /> : <FiBook size={22} />}
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
          <div className="absolute right-6 top-6 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md shadow-[0_0_24px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={() => {
                setShowRuler((prev) => !prev);
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${showRuler ? 'bg-[#00ff66] text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#00ff66]'}`}
            >
              Régua
            </button>
            <button
              type="button"
              onClick={() => {
                setRulerStart(null);
                setRulerEnd(null);
                setRulerLocked(false);
                setIsRulerDragging(false);
                broadcastRulerState({
                  showRuler: false,
                  rulerStart: null,
                  rulerEnd: null,
                  rulerLocked: false,
                  isRulerDragging: false,
                });
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/50 hover:border-[#00ff66]/40 hover:text-[#00ff66]"
            >
              Limpar
            </button>
            {getRulerDistance() && (
              <div className="ml-2 rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/10 px-3 py-1.5 text-[11px] font-bold text-[#d7ffd6]">
                {getRulerDistance()!.meters.toFixed(1)} metros • {getRulerDistance()!.feet.toFixed(1)} pés
              </div>
            )}
          </div>

          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ 
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: (isDraggingMap || isDraggingToken) ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div ref={mapContentRef} className="relative pointer-events-auto">
              {!mapaUrl ? (
                <div className="w-[1000px] h-[800px] flex flex-col items-center justify-center gap-4 text-white/10">
                  <MapIcon size={64} strokeWidth={1} />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em]">Aguardando Mapa...</span>
                </div>
              ) : (
                <img src={mapaUrl} className="max-w-none block opacity-80 shadow-2xl" alt="Map" />
              )}

              {rulerStart && rulerEnd && (() => {
                const dx = rulerEnd.x - rulerStart.x;
                const dy = rulerEnd.y - rulerStart.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const distance = getRulerDistance();
                const midX = (rulerStart.x + rulerEnd.x) / 2;
                const midY = (rulerStart.y + rulerEnd.y) / 2;

                return (
                  <>
                    <div
                      className="absolute left-0 top-0 pointer-events-none"
                      style={{
                        transform: `translate(${rulerStart.x}px, ${rulerStart.y}px) rotate(${angle}deg)`,
                        transformOrigin: '0 0',
                      }}
                    >
                      <div className="h-[3px] rounded-full bg-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.8)]" style={{ width: `${length}px` }} />
                    </div>
                    <div
                      className="absolute pointer-events-none rounded-full border border-[#00ff66]/30 bg-black/80 px-2 py-1 text-[10px] font-bold text-[#00ff66] shadow-[0_0_16px_rgba(0,0,0,0.5)]"
                      style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)' }}
                    >
                      {distance ? `${distance.meters.toFixed(1)} m • ${distance.feet.toFixed(1)} pés` : ''}
                    </div>
                  </>
                );
              })()}
              
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={getGridBgStyle()}
              />

              {tokens.map(token => {
                const footprint = footprintForCategory(token.sizeCategory);
                const displaySize = gridSize * footprint;
                return (
                  <div
                    key={token.id}
                    onMouseDown={(e) => handleMouseDown(e, token.id)}
                    style={{
                      transform: `translate(${token.x}px, ${token.y}px)`,
                      position: 'absolute',
                      top: mapaUrl ? '0' : '50%',
                      left: mapaUrl ? '0' : '50%',
                      marginTop: mapaUrl ? '0' : `-${(displaySize)/2}px`,
                      marginLeft: mapaUrl ? '0' : `-${(displaySize)/2}px`,
                      width: `${displaySize}px`,
                      height: `${displaySize}px`,
                      zIndex: tokenSelecionado === token.id ? 100 : 10,
                    }}
                    className="flex flex-col items-center cursor-move group"
                  >
                    <div 
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: token.isMonster ? `rotate(${token.rotation ?? 0}deg)` : 'none',
                        transformOrigin: '50% 50%',
                      }}
                      className={`relative overflow-hidden transition-all duration-200 ${token.characterId ? 'rounded-full border-2 bg-neutral-900' : ''} ${
                        token.characterId
                          ? tokenSelecionado === token.id
                            ? 'border-[#00ff66] shadow-[0_0_20px_#00ff66] scale-110'
                            : 'border-white/60 group-hover:border-[#00ff66] group-hover:shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                          : tokenSelecionado === token.id
                            ? 'scale-110'
                            : ''
                      }`}
                    >
                      {token.url ? (
                        <img
                          src={token.url}
                          alt={token.name ?? ''}
                          draggable={false}
                          style={{ objectPosition: `${token.imgOffsetX ?? 50}% ${token.imgOffsetY ?? 50}%` }}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                          <span className="text-white/20 text-lg">?</span>
                        </div>
                      )}
                    </div>
                    {token.characterId && token.name && (
                      <span className="mt-1 text-[8px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[80px] truncate text-center leading-tight">
                        {token.name}
                      </span>
                    )}
                  </div>
                );
              })}

              <SpellCaster
                isOpen={Boolean(activeSpellCast)}
                spell={activeSpellCast}
                campaignId={campaignId}
                tokens={spellCasterTokens}
                casterPoint={casterToken ? { x: casterToken.x, y: casterToken.y } : null}
                gridSize={gridSize}
                gridValue={gridDistanceInfo.value}
                gridUnit={gridDistanceInfo.unit === 'm' ? 'm' : 'pes'}
                casterLevel={casterToken?.characterId ? 1 : 1}
                casterModificador={3}
                onClose={() => setActiveSpellCast(null)}
                onSpellCast={handleSpellCast}
              />
            </div>
          </div>
        </main>

        <div className="z-40 relative">
          <ChatWidget 
            campaignId={campaignId} 
            isDiceReady={!!rollDiceFunc} 
            onRollDice={rollDiceFunc ? (type, secret, mode) => rollDiceFunc(type, secret, mode) : (async () => null)} 
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
      
      {/* Modal para upload de mapa (simples) */}
      {modalAtivo === 'Mapa' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
          <div className="bg-[#0a0a0a] border border-[#00ff66]/20 p-10 rounded-[24px] w-full max-w-md relative shadow-[0_0_50px_rgba(0,255,102,0.1)]">
            <button onClick={() => setModalAtivo(null)} className="absolute top-6 right-6 text-white/40 hover:text-[#00ff66] transition-colors">
              <X size={20}/>
            </button>
            <h2 className="text-white text-2xl font-bold mb-10 uppercase tracking-[0.2em] text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              Carregar Mapa
            </h2>
            <div className="flex flex-col gap-8">
              <label className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:bg-[#00ff66]/[0.02] hover:border-[#00ff66]/30 group transition-all duration-500">
                <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:border-[#00ff66] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] transition-all">
                  <Upload className="text-white/20 group-hover:text-[#00ff66] transition-all" size={32} />
                </div>
                <span className="text-white font-bold text-[11px] uppercase tracking-widest opacity-80">Arraste ou clique</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'Mapa')} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Editor de Mapa (modal grande com preview e controles) */}
      <MapEditorModal
        isOpen={showMapEditor}
        mapUrl={mapPreviewUrl || ''}
        campaignId={campaignId}
        onConfirm={handleMapEditorConfirm}
        onCancel={() => {
          setShowMapEditor(false);
          setMapPreviewUrl(null);
        }}
      />

      <FichaModal
        isOpen={showFicha}
        onClose={() => setShowFicha(false)}
        characterId={fichaCharacterId}
        campaignId={campaignId}
       onRollDice={async (formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage' = 'normal') => {
          if (rollDiceFunc) {
            return await rollDiceFunc(formula, isSecret, mode);
          }
          return null;
        }}
      />

      <SpellModal
        isOpen={showSpellModal}
        onClose={() => setShowSpellModal(false)}
        characterId={fichaCharacterId}
        onLaunchSpell={handleSpellLaunch}
      />

      {/* Ficha de jogador — visualização do Mestre */}
      <FichaModal
        isOpen={showFichaDM}
        onClose={() => setShowFichaDM(false)}
        characterId={fichaCharacterIdDM}
        campaignId={campaignId}
        onRollDice={async (formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage' = 'normal') => {
          if (rollDiceFunc) {
            return await rollDiceFunc(formula, isSecret, mode);
          }
          return null;
        }}
        readOnly
      />

      {/* Botão para abrir */}
      <button 
        onClick={() => setModalAjuda(!modalAjuda)}
        className="fixed bottom-6 left-6 z-[9999] w-12 h-12 bg-[#0a0a0a] border-2 border-[#00ff66] rounded-full flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:scale-110 transition-all"
        title="Manual de Condições"
      >
        <HelpCircle size={24} />
      </button>

      
      {modalAjuda && (
        <div 
          className="fixed bottom-20 left-6 z-[9998] w-80 sm:w-96 bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col resize overflow-auto min-h-[300px] max-h-[70vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#00ff66]/5">
            <span className="text-[#00ff66] font-bold text-xs uppercase tracking-tighter">Manual de Condições</span>
            <button onClick={() => setModalAjuda(false)} className="text-white/20 hover:text-white"><X size={18}/></button>
          </div>

          {/* Busca */}
          <div className="p-3">
            <input 
              type="text" 
              placeholder="Buscar condição..." 
              className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#00ff66]/30"
              value={buscaCondicao}
              onChange={(e) => setBuscaCondicao(e.target.value)}
            />
          </div>

          {/* Lista Expansível */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {CONDICOES_RPG
              .filter(c => c.nome.toLowerCase().includes(buscaCondicao.toLowerCase()))
              .map((c, i) => {
                const isExpanded = itemExpandido === c.nome;
                return (
                  <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
                    <button 
                      onClick={() => setItemExpandido(isExpanded ? null : c.nome)}
                      className="w-full p-3 flex justify-between items-center hover:bg-white/[0.05] transition-colors"
                    >
                      <span className={`text-xs font-bold uppercase ${isExpanded ? 'text-[#00ff66]' : 'text-white/60'}`}>{c.nome}</span>
                      <ChevronRight size={14} className={`text-white/20 transition-transform ${isExpanded ? 'rotate-90 text-[#00ff66]' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="p-3 pt-0 text-[11px] text-white/70 leading-relaxed border-t border-white/5">
                        <p className="mb-3 text-white/80">{c.desc}</p>
                        
                        {/* Tabela (Apenas números) */}
                        {c.tabela && (
                          <div className="space-y-1 mt-2">
                            {c.tabela.map((t, idx) => (
                              <div key={idx} className="flex gap-2 bg-black/40 p-2 rounded border border-white/5">
                                <span className="text-[#00ff66] font-bold min-w-[30px]">{t.dado}</span>
                                <span className="text-white/50">{t.efeito}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Níveis */}
                        {c.niveis && (
                          <div className="space-y-1 mt-2">
                            {c.niveis.map((n, idx) => (
                              <div key={idx} className="flex gap-2 text-white/50">
                                <span className="text-[#00ff66]">•</span> {n}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notas Extras */}
                        {c.notas && (
                          <div className="mt-3 pt-2 border-t border-white/5 text-[10px]">
                            {c.notas.map((n, idx) => (
                              <p key={idx} className="mb-2 text-white/40">
                                {n.titulo && <strong className="text-[#00ff66]/70">{n.titulo}: </strong>} {n.texto}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}