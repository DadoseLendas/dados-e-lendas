"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  UserRound, Users, Home, BookOpen, Map as MapIcon, 
  ShieldCheck, ChevronLeft, ChevronRight, X, Upload, HelpCircle, Ruler, Trash2,
  Dices, Sword, Sparkles, Move, Keyboard, MousePointer2
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
import { parseMonsterSheetFromClipboardText, parseMonsterSheetFromText } from '@/utils/monster-sheet-parser';
import { registerMesaCharacterShortcuts } from '@/utils/mesa-keyboard-shortcuts';
import TokenSheetPanel, { TokenSheet } from '@/app/components/ui/token-sheet-panel';
import PlayerStatusWidget from '@/app/components/ui/player-status-widget';

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

// Interface para régua de um usuário
interface UserRuler {
  userId: string;
  userName: string;
  showRuler: boolean;
  rulerStart: { x: number; y: number } | null;
  rulerEnd: { x: number; y: number } | null;
  rulerLocked: boolean;
  isRulerDragging: boolean;
  color: string; // Cor única para cada usuário
}

// Cores para diferenciar as réguas dos usuários
const USER_COLORS = [
  '#00ff66', // verde
  '#ff4444', // vermelho
  '#4488ff', // azul
  '#ffaa44', // laranja
  '#ff44ff', // rosa
  '#44ffaa', // turquesa
  '#ffff44', // amarelo
  '#aa44ff', // roxo
];

const EMPTY_ABILITIES = {
  str: "",
  dex: "",
  con: "",
  int: "",
  wis: "",
  cha: "",
};

const buildEmptySheet = (name?: string): TokenSheet => ({
  name: name ?? "",
  size_category: "",
  type: "",
  alignment: "",
  armorClass: "",
  hitPoints: "",
  speed: "",
  abilities: { ...EMPTY_ABILITIES },
  saves: { ...EMPTY_ABILITIES },
  skills: {},
  damageResistances: "",
  conditionImmunities: "",
  senses: "",
  languages: "",
  challengeRating: "",
  xp: "",
  abilitiesText: "",
  actionsText: "",
});

const toStringValue = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value));

const toNumberOrNull = (value: unknown) => {
  const normalized = toStringValue(value).replace(',', '.').trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const toLeadingNumberOrNull = (value: unknown) => {
  const normalized = toStringValue(value).replace(',', '.').trim();
  if (!normalized) return null;

  const match = normalized.match(/-?\d[\d.,]*/);
  if (!match?.[0]) return null;

  const numericText = match[0].replace(/[.,]/g, '');
  const num = Number(numericText);
  return Number.isFinite(num) ? num : null;
};

const toList = (value: unknown) =>
  toStringValue(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const fromList = (value?: string[] | string | null) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(', ');
  return value;
};

const normalizeAbilityScores = (value: Partial<typeof EMPTY_ABILITIES> | null | undefined) => ({
  str: toStringValue(value?.str),
  dex: toStringValue(value?.dex),
  con: toStringValue(value?.con),
  int: toStringValue(value?.int),
  wis: toStringValue(value?.wis),
  cha: toStringValue(value?.cha),
});

const normalizeTokenSheet = (sheet: Partial<TokenSheet> | null | undefined): TokenSheet => ({
  name: toStringValue(sheet?.name),
  size_category: toStringValue(sheet?.size_category),
  type: toStringValue(sheet?.type),
  alignment: toStringValue(sheet?.alignment),
  armorClass: toStringValue(sheet?.armorClass),
  hitPoints: toStringValue(sheet?.hitPoints),
  speed: toStringValue(sheet?.speed),
  abilities: normalizeAbilityScores(sheet?.abilities),
  saves: normalizeAbilityScores(sheet?.saves),
  skills: sheet?.skills ?? {},
  damageResistances: toStringValue(sheet?.damageResistances),
  conditionImmunities: toStringValue(sheet?.conditionImmunities),
  senses: toStringValue(sheet?.senses),
  languages: toStringValue(sheet?.languages),
  challengeRating: toStringValue(sheet?.challengeRating),
  xp: toStringValue(sheet?.xp),
  abilitiesText: toStringValue(sheet?.abilitiesText),
  actionsText: toStringValue(sheet?.actionsText),
});

const TUTORIAL_VTT = {
  jogador: [
    {
      titulo: "🧙‍♂️ Criando sua Lenda (Ficha)",
      desc: "O primeiro passo para não morrer no primeiro encontro! No menu lateral, clique em 'Ficha'. Lá você define seu nome, raça e classe. O sistema já calcula seus bônus baseado nos atributos (10 é a média humana, acima disso você é um herói, abaixo... bom, boa sorte). Ao subir de nível, seu Bônus de Proficiência escala sozinho!",
      detalhes: [
        { item: "Pontos Iniciais", texto: "Distribua seus valores nos Atributos (FOR, DES, CON, INT, SAB, CAR). Eles afetam TUDO no jogo." },
        { item: "Proficiências", texto: "Marque o círculo ao lado das perícias em que você é treinado para somar seu bônus de proficiência." },
        { item: "Salvaguardas", texto: "São seus testes de resistência. Úteis para quando o mestre joga uma bola de fogo na sua cara." }
      ]
    },
    {
      titulo: "⚔️ Pancadaria e Magia",
      desc: "Como fazer os inimigos pedirem arrego.",
      detalhes: [
        { item: "Ataque com Armas", texto: "No seu Inventário, clique no botão 'ATK' da arma. O sistema soma seu atributo + proficiência e joga no chat." },
        { item: "Lançar Magias", texto: "No seu Grimório, clique no ícone de 'Lançar'. O cursor vai mudar no mapa: clique onde quer que a magia aconteça!" },
        { item: "Dano", texto: "Após acertar o ataque, clique no valor de dano na sua ficha para rolar os dados de destruição." }
      ]
    },
    {
      titulo: "🎲 Dados e o Destino (Vantagem/Desvantagem)",
      desc: "O motor do jogo são os dados de 20 lados (d20).",
      detalhes: [
        { item: "Comando de Chat", texto: "Digite '/r 1d20+5' para rolagens rápidas. O chat aceita fórmulas complexas tipo '2d6+1d4+3'." },
        { item: "Vantagem (⬆️)", texto: "Role dois d20 e pegue o maior. Use quando o mestre está de bom humor ou você foi esperto." },
        { item: "Desvantagem (⬇️)", texto: "Role dois d20 e pegue o menor. Acontece quando você está cego, caído ou a vida está difícil." },
        { item: "Segredo", texto: "Marque a opção 'Segredo' no painel de dados para que apenas você e o mestre vejam o resultado." }
      ]
    },
    {
      titulo: "🗺️ Vida no Mapa",
      desc: "Seu token é sua representação no mundo.",
      detalhes: [
        { item: "Movimentação", texto: "Clique e arraste seu token, ou use 'W A S D' para precisão milimétrica." },
        { item: "Medir Distância", texto: "Use a ferramenta de 'Régua' na barra inferior. Clique e arraste para saber se o goblin está ao alcance da sua espada." },
        { item: "Interação", texto: "Clique duplo no seu token abre sua ficha instantaneamente." }
      ]
    }
  ],
  mestre: [
    {
      titulo: "👑 O Poder Absoluto (Gestão da Mesa)",
      desc: "Você é o deus desse mundo (mas tente ser um deus legal).",
      detalhes: [
        { item: "Biblioteca de Tokens", texto: "Clique no ícone de Escudo no menu lateral para puxar monstros e NPCs para o mapa." },
        { item: "Editor de Mapa", texto: "Ícone de Mapa no menu lateral. Permite mudar a imagem de fundo, ajustar o tamanho do grid e a escala (metros/pés)." },
        { item: "Fichas de Monstros", texto: "Clique duplo em qualquer monstro no mapa para abrir a ficha de estatísticas dele." }
      ]
    },
    {
      titulo: "📋 Fiscalizar Jogadores",
      desc: "Sempre tem alguém tentando roubar no HP...",
      detalhes: [
        { item: "Lista de Jogadores", texto: "No menu lateral (ícone de Pessoas), você vê todos os personagens da mesa e pode abrir a ficha de qualquer um em modo leitura." },
        { item: "Votos Secretos", texto: "Você recebe todas as rolagens secretas dos jogadores no seu chat. Eles não podem esconder nada de você!" }
      ]
    },
    {
      titulo: "🦾 Automação de Monstros",
      desc: "Gerenciar 10 goblins nunca foi tão fácil.",
      detalhes: [
        { item: "Colar Ficha", texto: "Ao abrir a ficha de um monstro vazio, você pode colar o texto da ficha (do 5e.tools ou similar) e o sistema preenche TUDO sozinho." },
        { item: "HP em Tempo Real", texto: "O HP dos monstros aparece como uma barra acima do token ou pode ser editado na ficha rápida." }
      ]
    }
  ]
};

const CONDICOES_RPG = [
  { nome: "Confuso", desc: "Role um d10 no início de cada um de seus turnos para determinar seu comportamento.", tabela: [{ dado: "1", efeito: "Move-se em direção aleatória (d8). Não realiza ação." }, { dado: "2-6", efeito: "Não se move nem realiza ações neste turno." }, { dado: "7-8", efeito: "Ataque corpo a corpo contra alvo aleatório ao alcance." }, { dado: "9-10", efeito: "Pode agir e se mover normalmente." }] },
  { nome: "Exaustão", desc: "Medida em 6 níveis. Uma criatura sofre o efeito do seu nível atual e de todos os anteriores.", niveis: ["1: Desvantagem em testes de atributo", "2: Deslocamento reduzido pela metade", "3: Desvantagem em jogadas de ataque e salvaguardas", "4: Pontos de vida máximos reduzidos pela metade", "5: Deslocamento reduzido para 0", "6: Morte"], notas: [{ titulo: "Acúmulo", texto: "Se um personagem já exausto sofre outro efeito que induz exaustão, o nível atual de exaustão do personagem aumenta conforme especificado pelo novo efeito." }, { titulo: "Recuperação", texto: "Efetuar um descanso longo reduz o nível de exaustão em 1, desde que o personagem também se alimente e hidrate adequadamente durante o descanso." }, { titulo: "", texto: "Algumas magias e habilidades também podem eliminar ou aliviar os efeitos da exaustão." }] },
  { nome: "Agarrado", desc: "Seu deslocamento se torna 0, e você não pode se beneficiar de bônus de deslocamento." },
  { nome: "Amedrontado", desc: "Uma criatura amedrontada tem desvantagem em testes de atributo e jogadas de ataque enquanto a fonte de seu medo estiver em sua linha de visão." },
  { nome: "Atordoado", desc: "Você está incapacitado, não pode se mover e somente fala balbuciando." },
  { nome: "Caído", desc: "Sua única opção de movimento é rastejar, a menos que se levante. Você tem desvantagem em jogadas de ataque." },
  { nome: "Cego", desc: "Você não pode enxergar e automaticamente falha em testes de Percepção que dependam da visão." },
  { nome: "Enfeitiçado", desc: "Você não pode atacar quem te enfeitiçou ou tê-lo como alvo de habilidades ou efeitos mágicos nocivos." },
  { nome: "Envenenado", desc: "Você possui desvantagem em jogadas de ataque e testes de atributos." },
  { nome: "Impedido", desc: "Seu deslocamento se torna 0, e você não pode se beneficiar de qualquer bônus em seu deslocamento." },
  { nome: "Incapacitado", desc: "Você não pode realizar ações ou reações." },
  { nome: "Inconsciente", desc: "Você está incapacitado, não pode se mover ou falar e não tem ciência de seus arredores." },
  { nome: "Invisível", desc: "Uma criatura invisível é impossível de ser vista sem ajuda de magia ou um sentido especial." },
  { nome: "Paralisado", desc: "Você está incapacitado e não pode se mover ou falar." },
  { nome: "Petrificado", desc: "Você é transformado em uma substância sólida e inanimada (geralmente pedra)." },
  { nome: "Surdo", desc: "Você falha automaticamente em qualquer teste de habilidade que requeira o uso da audição." },
];

export default function TelaDeMesa() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  const params = useParams();
  const campaignId = params.id as string;
  
  // Estado do usuário
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Aventureiro');
  const [isDM, setIsDM] = useState(false);
  
  // Réguas de todos os usuários (key = userId)
  const [rulers, setRulers] = useState<Map<string, UserRuler>>(new Map());
  
  // Réguas visíveis (todos veem todas)
  const visibleRulers = useMemo(() => {
    const result: { userId: string; ruler: UserRuler }[] = [];
    rulers.forEach((ruler, userId) => {
      if (ruler.showRuler && ruler.rulerStart && ruler.rulerEnd) {
        result.push({ userId, ruler });
      }
    });
    return result;
  }, [rulers]);

  //interface e Mapa
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
  const [gridDimension, setGridDimension] = useState<string>('5 pes');
  const [campaignLoaded, setCampaignLoaded] = useState(false);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [activeSpellCast, setActiveSpellCast] = useState<SpellExecution | null>(null);
  const [userColorMap, setUserColorMap] = useState<Map<string, string>>(new Map());

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
  const dragMovedRef = useRef(false);
  const isDraggingRulerRef = useRef(false);

  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  
  const gridSize = mapGridPx;
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
      case 'Tiny': return 0.5;
      case 'Small': return 1;
      case 'Medium': return 1;
      case 'Large': return 2;
      case 'Huge': return 3;
      case 'Gargantuan': return 4;
      default: return 1;
    }
  };
  
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
  
  const getRulerDistance = (ruler: UserRuler) => {
    if (!ruler.rulerStart || !ruler.rulerEnd) return null;
    const dx = ruler.rulerEnd.x - ruler.rulerStart.x;
    const dy = ruler.rulerEnd.y - ruler.rulerStart.y;
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
  
  // Função para obter cor do usuário
  const getUserColor = (userId: string): string => {
    if (userColorMap.has(userId)) return userColorMap.get(userId)!;
    const index = Array.from(userColorMap.keys()).length % USER_COLORS.length;
    const color = USER_COLORS[index];
    setUserColorMap(prev => new Map(prev).set(userId, color));
    return color;
  };
  
  const updateMyRuler = (updates: Partial<UserRuler>) => {
    if (!currentUserId) return;
    setRulers(prev => {
      const newMap = new Map(prev);
      const currentRuler = newMap.get(currentUserId) || {
        userId: currentUserId,
        userName: currentUserName,
        showRuler: false,
        rulerStart: null,
        rulerEnd: null,
        rulerLocked: false,
        isRulerDragging: false,
        color: getUserColor(currentUserId),
      };
      const updated = { ...currentRuler, ...updates };
      newMap.set(currentUserId, updated);
      
      // Broadcast para outros usuários
      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'ruler-change',
        payload: updated,
      });
      
      return newMap;
    });
  };
  
  const clearMyRuler = () => {
    updateMyRuler({
      showRuler: false,
      rulerStart: null,
      rulerEnd: null,
      rulerLocked: false,
      isRulerDragging: false,
    });
  };
  
  const toggleMyRuler = () => {
    const current = rulers.get(currentUserId || '');
    if (current?.showRuler) {
      clearMyRuler();
    } else {
      updateMyRuler({ showRuler: true });
    }
  };
  
  // Limpar régua de outro usuário (apenas Mestre)
  const clearUserRuler = (userId: string) => {
    if (!isDM) return;
    setRulers(prev => {
      const newMap = new Map(prev);
      const userRuler = newMap.get(userId);
      if (userRuler) {
        newMap.set(userId, {
          ...userRuler,
          showRuler: false,
          rulerStart: null,
          rulerEnd: null,
          rulerLocked: false,
          isRulerDragging: false,
        });
        realtimeChannelRef.current?.send({
          type: 'broadcast',
          event: 'ruler-change',
          payload: { ...userRuler, showRuler: false, rulerStart: null, rulerEnd: null, rulerLocked: false, isRulerDragging: false },
        });
      }
      return newMap;
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
    const myRuler = rulers.get(currentUserId || '');
    
    if (tokenId) {
      setTokenSelecionado(tokenId);
      setIsDraggingToken(true);
      dragMovedRef.current = false;
      const token = tokensRef.current.find(t => t.id === tokenId);
      if (token) draggingPosRef.current = { x: token.x, y: token.y };
      e.stopPropagation();
    } else if (myRuler?.showRuler && !myRuler.rulerLocked && e.button === 0) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY);
      if (!point) return;
      isDraggingRulerRef.current = true;
      updateMyRuler({
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
    const myRuler = rulers.get(currentUserId || '');
    
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
      const now = Date.now();
      if (now - lastBroadcastRef.current > 33 && realtimeChannelRef.current) {
        lastBroadcastRef.current = now;
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'token-move',
          payload: { tokenId: tokenSelecionado, x, y },
        });
      }
    } else if (myRuler?.showRuler && myRuler.rulerStart && myRuler.isRulerDragging && !myRuler.rulerLocked && isDraggingRulerRef.current) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY);
      if (point) {
        updateMyRuler({ rulerEnd: point });
      }
    }
  };

  const handleMouseUp = () => {
    const myRuler = rulers.get(currentUserId || '');
    
    if (isDraggingToken && tokenSelecionado) {
      if (!dragMovedRef.current) {
        const token = tokensRef.current.find(t => t.id === tokenSelecionado);
        if (token?.characterId) {
          if (isDM) {
            setFichaCharacterIdDM(token.characterId);
            setShowFichaDM(true);
          } else if (String(token.characterId) === String(fichaCharacterId)) {
            setShowFicha(true);
          }
        }
      } else {
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
    
    if (myRuler?.isRulerDragging && myRuler.rulerStart) {
      updateMyRuler({
        rulerLocked: true,
        isRulerDragging: false,
      });
      isDraggingRulerRef.current = false;
    }
    
    setIsDraggingMap(false);
    setIsDraggingToken(false);
  };

  //teclado (WASD + Delete)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField = Boolean(
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      );

      if (isTypingField) return;
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
      const { error } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) {
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
    
    try {
      await supabase.from('campaigns').update({ 
        map_url: mapPreviewUrl, 
        map_grid_px: gridPx,
        map_scale: mapScale,
        map_grid_color: gridColor,
        map_grid_opacity: gridOpacity,
        map_grid_thickness: gridThickness,
        map_grid_dashed: gridDashed,
        map_grid_dash_frequency: gridDashFrequency,
        map_grid_dimension: gridDimension
      }).eq('id', campaignId);
    } catch (err) {
      console.error('[MAPA] Erro ao salvar:', err);
    }
    
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
    await supabase.from('campaign_tokens').insert({
      id: newId,
      campaign_id: campaignId,
      url: t.url,
      name: t.name,
      x: 0,
      y: 0,
      is_monster: true,
      size_category: defaultSize,
    });
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

  // Subscription realtime
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`mesa-${campaignId}`)
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
        const ruler = payload as UserRuler;
        if (ruler.userId !== currentUserId) {
          setRulers(prev => {
            const newMap = new Map(prev);
            newMap.set(ruler.userId, ruler);
            return newMap;
          });
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_tokens', filter: `campaign_id=eq.${campaignId}` },
        ({ new: row }) => {
          const t = row as any;
          setTokens(prev => {
            if (prev.find(tk => tk.id === t.id)) return prev;
            return [...prev, {
              id: t.id,
              url: t.url || '',
              x: t.x,
              y: t.y,
              rotation: t.rotation ?? 0,
              characterId: t.character_id ?? null,
              name: t.name ?? undefined,
              isMonster: t.is_monster ?? false,
              imgOffsetX: 50,
              imgOffsetY: 50,
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
    
    const membersChannel = supabase
      .channel(`mesa-members-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${campaignId}` },
        async () => {
          await fetchPlayerCharacters();
        }
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); supabase.removeChannel(membersChannel); };
  }, [campaignId]);

  // --- Logic de Dados/Ficha ---
  const [showFicha, setShowFicha] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [tokenSheetTokenId, setTokenSheetTokenId] = useState<string | null>(null);
  const [tokenSheetLoading, setTokenSheetLoading] = useState(false);
  const [tokenSheetSaving, setTokenSheetSaving] = useState(false);
  const [tokenSheetAutoFillLoading, setTokenSheetAutoFillLoading] = useState(false);
  const [tokenSheetAutoFillSource, setTokenSheetAutoFillSource] = useState<string | null>(null);
  const [tokenSheetAutoFillError, setTokenSheetAutoFillError] = useState<string | null>(null);
  const [tokenSheet, setTokenSheet] = useState<TokenSheet>(buildEmptySheet());
  const tokenSheetRef = useRef<TokenSheet>(buildEmptySheet());
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showFichaDM, setShowFichaDM] = useState(false);
  const [fichaCharacterIdDM, setFichaCharacterIdDM] = useState<number | string | null>(null);
  const [playerCharacters, setPlayerCharacters] = useState<{ id: number; name: string; img: string | null; imgOffsetX: number; imgOffsetY: number }[]>([]);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [ajudaTab, setAjudaTab] = useState<'condicoes' | 'jogador' | 'mestre'>('jogador');
  const [tutorialExpandido, setTutorialExpandido] = useState<string | null>(null);

  const [buscaCondicao, setBuscaCondicao] = useState("");
  const [itemExpandido, setItemExpandido] = useState<string | null>(null);
  const [rollDiceFunc, setRollDiceFunc] = useState<((formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage') => Promise<any | null>) | null>(null);

  const openCharacterSheet = useCallback(() => {
    if (!fichaCharacterId) {
      alert('Você não vinculou um personagem a esta mesa!');
      return;
    }
    setShowFicha(true);
  }, [fichaCharacterId]);

  const openSpellBook = useCallback(() => {
    if (!fichaCharacterId) {
      alert('Você não vinculou um personagem a esta mesa!');
      return;
    }
    setShowSpellModal(true);
  }, [fichaCharacterId]);

  useEffect(() => {
    return registerMesaCharacterShortcuts({
      enabled: !isDM,
      onOpenCharacterSheet: openCharacterSheet,
      onOpenSpellBook: openSpellBook,
    });
  }, [isDM, openCharacterSheet, openSpellBook]);

  useEffect(() => {
    tokenSheetRef.current = tokenSheet;
  }, [tokenSheet]);

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
      nome: token.name || `Token-${token.id.slice(0, 4)}`,
      pvAtuais: token.hp,
      pvMax: token.maxHp,
      characterId: token.characterId,
      isMonster: token.isMonster,
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

  const selectedToken = useMemo(() => {
    if (!tokenSelecionado) return null;
    return tokens.find((token) => token.id === tokenSelecionado) ?? null;
  }, [tokenSelecionado, tokens]);

  const openTokenSheet = (tokenId: string) => {
    const token = tokens.find((item) => item.id === tokenId) ?? null;
    setTokenSelecionado(tokenId);
    setTokenSheetTokenId(tokenId);
    setTokenSheet(
      normalizeTokenSheet({
        ...buildEmptySheet(token?.name ?? selectedToken?.name ?? ""),
        size_category: token?.sizeCategory ?? selectedToken?.sizeCategory ?? "",
      })
    );
    tokenSheetRef.current = normalizeTokenSheet({
      ...buildEmptySheet(token?.name ?? selectedToken?.name ?? ""),
      size_category: token?.sizeCategory ?? selectedToken?.sizeCategory ?? "",
    });
    setTokenSheetAutoFillSource(null);
    setTokenSheetAutoFillError(null);
    setShowTokenSheet(true);
  };

  useEffect(() => {
    if (!showTokenSheet || !tokenSheetTokenId) return;
    let active = true;
    const loadSheet = async () => {
      setTokenSheetLoading(true);
      const { data, error } = await supabase
        .from('campaign_tokens')
        .select('name, size_category, type, alignment, armor_class, hit_points, speed, abilities, saving_throws, damage_resistances, condition_immunities, senses, languages, challenge_rating, xp, abilities_text, actions_text')
        .eq('id', tokenSheetTokenId)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setTokenSheetLoading(false);
        return;
      }

      const abilities = (data as any).abilities ?? {};
      const saves = (data as any).saving_throws ?? {};
      const normalizeAbility = (obj: any) => ({
        str: obj?.str != null ? String(obj.str) : "",
        dex: obj?.dex != null ? String(obj.dex) : "",
        con: obj?.con != null ? String(obj.con) : "",
        int: obj?.int != null ? String(obj.int) : "",
        wis: obj?.wis != null ? String(obj.wis) : "",
        cha: obj?.cha != null ? String(obj.cha) : "",
      });

      setTokenSheet({
        name: (data as any).name ?? selectedToken?.name ?? "",
        size_category: (data as any).size_category ?? selectedToken?.sizeCategory ?? "",
        type: (data as any).type ?? "",
        alignment: (data as any).alignment ?? "",
        armorClass: (data as any).armor_class != null ? String((data as any).armor_class) : "",
        hitPoints: (data as any).hit_points != null ? String((data as any).hit_points) : "",
        speed: (data as any).speed ?? "",
        abilities: normalizeAbility(abilities),
        saves: normalizeAbility(saves),
        skills: {},
        damageResistances: fromList((data as any).damage_resistances),
        conditionImmunities: fromList((data as any).condition_immunities),
        senses: (data as any).senses ?? "",
        languages: (data as any).languages ?? "",
        challengeRating: (data as any).challenge_rating ?? "",
        xp: (data as any).xp != null ? String((data as any).xp) : "",
        abilitiesText: (data as any).abilities_text ?? "",
        actionsText: (data as any).actions_text ?? "",
      });
      setTokenSheetLoading(false);
    };

    loadSheet();
    return () => { active = false; };
  }, [showTokenSheet, tokenSheetTokenId, selectedToken?.name, supabase]);

  useEffect(() => {
    if (!tokenSheetTokenId) return;
    const stillExists = tokens.some((token) => token.id === tokenSheetTokenId);
    if (!stillExists) {
      setShowTokenSheet(false);
      setTokenSheetTokenId(null);
    }
  }, [tokenSheetTokenId, tokens]);

  const handleSaveTokenSheet = async (sheetToSave: TokenSheet = tokenSheetRef.current) => {
    if (!tokenSheetTokenId) return false;
    setTokenSheetSaving(true);
    try {
      const safeSheet = normalizeTokenSheet(sheetToSave);
      const fallbackSizeCategory = safeSheet.size_category || selectedToken?.sizeCategory || tokenSheet.size_category || 'Medium';
      const payload = {
        name: safeSheet.name || null,
        size_category: fallbackSizeCategory,
        type: safeSheet.type || null,
        alignment: safeSheet.alignment || null,
        armor_class: toLeadingNumberOrNull(safeSheet.armorClass),
        hit_points: toLeadingNumberOrNull(safeSheet.hitPoints),
        speed: safeSheet.speed || null,
        abilities: {
          str: toNumberOrNull(safeSheet.abilities.str),
          dex: toNumberOrNull(safeSheet.abilities.dex),
          con: toNumberOrNull(safeSheet.abilities.con),
          int: toNumberOrNull(safeSheet.abilities.int),
          wis: toNumberOrNull(safeSheet.abilities.wis),
          cha: toNumberOrNull(safeSheet.abilities.cha),
        },
        saving_throws: {
          str: toNumberOrNull(safeSheet.saves.str),
          dex: toNumberOrNull(safeSheet.saves.dex),
          con: toNumberOrNull(safeSheet.saves.con),
          int: toNumberOrNull(safeSheet.saves.int),
          wis: toNumberOrNull(safeSheet.saves.wis),
          cha: toNumberOrNull(safeSheet.saves.cha),
        },
        damage_resistances: toList(safeSheet.damageResistances),
        condition_immunities: toList(safeSheet.conditionImmunities),
        senses: safeSheet.senses || null,
        languages: safeSheet.languages || null,
        challenge_rating: safeSheet.challengeRating || null,
        xp: toLeadingNumberOrNull(safeSheet.xp),
        abilities_text: safeSheet.abilitiesText || null,
        actions_text: safeSheet.actionsText || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('campaign_tokens')
        .update({ ...payload, id: tokenSheetTokenId, campaign_id: campaignId })
        .eq('id', tokenSheetTokenId)
        .eq('campaign_id', campaignId);

      if (error) {
        alert(`Erro ao salvar ficha: ${error.message}`);
        return false;
      }

      if (safeSheet.name) {
        setTokens((prev) => prev.map((token) => token.id === tokenSheetTokenId ? { ...token, name: safeSheet.name } : token));
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao salvar ficha';
      alert(`Erro ao salvar ficha: ${message}`);
      return false;
    } finally {
      setTokenSheetSaving(false);
    }
  };

  const handleTokenSheetChange = (nextSheet: TokenSheet) => {
    tokenSheetRef.current = nextSheet;
    setTokenSheet(nextSheet);
  };

  const applyAutoFillSheet = async (sheetFromSource: Partial<TokenSheet>, sourceLabel?: string | null) => {
    const currentTokenName = tokenSheet.name || selectedToken?.name || '';
    const mergedSheet: TokenSheet = {
      ...buildEmptySheet(currentTokenName),
      ...tokenSheet,
      ...sheetFromSource,
      abilities: {
        ...EMPTY_ABILITIES,
        ...tokenSheet.abilities,
        ...(sheetFromSource?.abilities ?? {}),
      },
      saves: {
        ...EMPTY_ABILITIES,
        ...tokenSheet.saves,
        ...(sheetFromSource?.saves ?? {}),
      },
      skills: {
        ...tokenSheet.skills,
        ...(sheetFromSource?.skills ?? {}),
      },
    };

    tokenSheetRef.current = mergedSheet;
    setTokenSheet(mergedSheet);
    setTokenSheetAutoFillSource(sourceLabel ?? null);
    setTokenSheetAutoFillError(null);
    return true;
  };

  const handleAutoFillTokenSheet = async () => {
    if (!tokenSheetTokenId) return false;
    const currentTokenName = tokenSheet.name || selectedToken?.name || "";
    if (!currentTokenName.trim()) {
      setTokenSheetAutoFillError('Nome do token ausente para auto-preenchimento.');
      return false;
    }

    setTokenSheetAutoFillLoading(true);
    setTokenSheetAutoFillError(null);
    try {
      const response = await fetch('/api/monster-sheet-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, tokenName: currentTokenName }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao ler o PDF');
      }

      const sheetFromPdf = data?.sheet as Partial<TokenSheet> | undefined;
      return await applyAutoFillSheet(sheetFromPdf ?? {}, data?.sourceBook?.title ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao auto-preencher';
      setTokenSheetAutoFillError(`Não foi possível ler o livro PDF. ${message}. Tente a opção copiar e colar.`);
      return false;
    } finally {
      setTokenSheetAutoFillLoading(false);
    }
  };

  const handleAutoFillTokenSheetFromText = async (rawText: string) => {
    if (!tokenSheetTokenId) return false;

    setTokenSheetAutoFillLoading(true);
    setTokenSheetAutoFillError(null);
    try {
      const parsedSheet = parseMonsterSheetFromClipboardText(rawText);

      if (!parsedSheet) {
        throw new Error('Não encontrei um bloco de ficha no texto colado.');
      }

      return await applyAutoFillSheet(parsedSheet, 'Texto colado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao preencher com texto';
      setTokenSheetAutoFillError(`Não foi possível preencher com o texto colado. ${message}`);
      return false;
    } finally {
      setTokenSheetAutoFillLoading(false);
    }
  };

  // Busca role do usuário e personagem vinculado
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) return;

      setCurrentUserId(user.id);
      setCurrentUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro');
      
      // Inicializa régua do usuário
      setRulers(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(user.id)) {
          newMap.set(user.id, {
            userId: user.id,
            userName: user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro',
            showRuler: false,
            rulerStart: null,
            rulerEnd: null,
            rulerLocked: false,
            isRulerDragging: false,
            color: getUserColor(user.id),
          });
        }
        return newMap;
      });

      // Busca campanha
      let campaign: any = null;
      try {
        const result = await supabase
          .from('campaigns')
          .select('dm_id, map_url, map_grid_px, map_scale, map_grid_color, map_grid_opacity, map_grid_thickness, map_grid_dashed, map_grid_dash_frequency, map_grid_dimension')
          .eq('id', campaignId)
          .maybeSingle();
        campaign = result.data;
      } catch (err) {
        console.error('[MAPA] Erro ao carregar campanha:', err);
      }

      if (campaign?.map_url) setMapaUrl(campaign.map_url);
      if (campaign?.map_grid_px) setMapGridPx(campaign.map_grid_px);
      if (campaign?.map_scale) setMapScale(campaign.map_scale);
      if (campaign?.map_grid_color) setGridColor(campaign.map_grid_color);
      if (campaign?.map_grid_opacity) setGridOpacity(campaign.map_grid_opacity);
      if (campaign?.map_grid_thickness) setGridThickness(campaign.map_grid_thickness);
      if (campaign?.map_grid_dashed !== undefined) setGridDashed(campaign.map_grid_dashed);
      if (campaign?.map_grid_dash_frequency) setGridDashFrequency(campaign.map_grid_dash_frequency);
      if (campaign?.map_grid_dimension) setGridDimension(campaign.map_grid_dimension);

      // Verifica se é DM
      let userIsDM = campaign?.dm_id === user.id;
      if (!userIsDM) {
        const { data: ownedCampaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('id', campaignId)
          .eq('dm_id', user.id)
          .maybeSingle();
        if (ownedCampaign) userIsDM = true;
      }

      setIsDM(userIsDM);

      if (!userIsDM) {
        const { data: member } = await supabase
          .from('campaign_members')
          .select('current_character_id')
          .eq('campaign_id', campaignId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (member?.current_character_id) {
          setFichaCharacterId(member.current_character_id);
        }
      } else {
        await fetchPlayerCharacters();
      }

      // Carrega tokens
      const { data: dbTokens } = await supabase
        .from('campaign_tokens')
        .select('id, url, name, x, y, rotation, character_id, is_monster, size_category')
        .eq('campaign_id', campaignId);

      if (dbTokens && dbTokens.length > 0) {
        const charIds = dbTokens.filter((t: any) => t.character_id).map((t: any) => t.character_id);
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
            name: charData?.name ?? t.name,
            imgOffsetX: charData?.imgOffsetX ?? 50,
            imgOffsetY: charData?.imgOffsetY ?? 50,
            isMonster: t.is_monster ?? false,
            sizeCategory: t.size_category ?? 'Medium',
          };
        }));
      }

      setCampaignLoaded(true);
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

          {!isDM && (
            <button
              onClick={openCharacterSheet}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
              title="Ficha"
            >
              <UserRound size={22} />
            </button>
          )}

          {!isDM && (
            <button
              onClick={openSpellBook}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
              title="Magias"
            >
              {showSpellModal ? <GiSpellBook size={28} /> : <FiBook size={22} />}
            </button>
          )}

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

        {isDM && <CampaignBooksWidget campaignId={campaignId} isOpen={showBooks} onToggle={() => setShowBooks(v => !v)} />}
        {isDM && <TokenLibraryWidget isOpen={showTokenLibrary} onToggle={() => setShowTokenLibrary(v => !v)} onAddToken={addTokenToMap} onUpload={handleTokenUpload} />}

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
          {/* Botão da Régua - barra bottom-center */}
          <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-4 py-2.5 backdrop-blur-md shadow-[0_0_32px_rgba(0,0,0,0.7)]">
            <button
              type="button"
              onClick={toggleMyRuler}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${rulers.get(currentUserId || '')?.showRuler ? 'bg-[#00ff66] text-black shadow-[0_0_12px_rgba(0,255,102,0.35)]' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-[#00ff66]'}`}
              title="Ativar/desativar sua régua de medição"
            >
              <Ruler size={12} />
              Régua
            </button>

            {/* Exibe a distância da régua do usuário atual */}
            {(() => {
              const myRuler = rulers.get(currentUserId || '');
              const distance = myRuler ? getRulerDistance(myRuler) : null;
              if (distance && myRuler?.showRuler) {
                return (
                  <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
                    <span className="text-[13px] font-black text-[#00ff66] tabular-nums tracking-tight">
                      {distance.meters.toFixed(1)} m
                    </span>
                    <span className="text-[9px] text-white/20 font-black">·</span>
                    <span className="text-[11px] font-bold text-white/40 tabular-nums">
                      {distance.feet.toFixed(1)} pés
                    </span>
                    <button
                      type="button"
                      onClick={clearMyRuler}
                      className="ml-0.5 flex items-center justify-center w-5 h-5 rounded text-white/25 hover:text-red-400 transition-colors"
                      title="Limpar medição"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              }
              return rulers.get(currentUserId || '')?.showRuler ? (
                <span className="text-[10px] text-white/25 font-bold pl-2.5 border-l border-white/10 uppercase tracking-wider whitespace-nowrap">Clique para medir</span>
              ) : null;
            })()}
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

              {/* Renderiza TODAS as réguas visíveis de TODOS os usuários */}
              {visibleRulers.map(({ userId, ruler }) => {
                if (!ruler.rulerStart || !ruler.rulerEnd) return null;
                const dx = ruler.rulerEnd.x - ruler.rulerStart.x;
                const dy = ruler.rulerEnd.y - ruler.rulerStart.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const distance = getRulerDistance(ruler);
                const midX = (ruler.rulerStart.x + ruler.rulerEnd.x) / 2;
                const midY = (ruler.rulerStart.y + ruler.rulerEnd.y) / 2;
                const isMyRuler = userId === currentUserId;
                const rulerColor = ruler.color || (isMyRuler ? '#00ff66' : USER_COLORS[Array.from(rulers.keys()).indexOf(userId) % USER_COLORS.length]);

                return (
                  <div key={userId}>
                    <div
                      className="absolute left-0 top-0 pointer-events-none"
                      style={{
                        transform: `translate(${ruler.rulerStart.x}px, ${ruler.rulerStart.y}px) rotate(${angle}deg)`,
                        transformOrigin: '0 0',
                      }}
                    >
                      <div 
                        className="h-[2px] rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
                        style={{ width: `${length}px`, backgroundColor: rulerColor, opacity: isMyRuler ? 1 : 0.6 }}
                      />
                    </div>
                    <div
                      className="absolute pointer-events-none rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold shadow-[0_0_16px_rgba(0,0,0,0.5)] whitespace-nowrap"
                      style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)', border: `1px solid ${rulerColor}`, color: rulerColor }}
                    >
                      {distance ? `${distance.meters.toFixed(1)}m (${distance.feet.toFixed(0)}pés)` : ''}
                      {!isMyRuler && isDM && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clearUserRuler(userId); }}
                          className="ml-1.5 text-white/40 hover:text-red-400 transition-colors inline-flex"
                          title="Limpar régua deste jogador"
                        >
                          <Trash2 size={8} />
                        </button>
                      )}
                    </div>
                    {!isMyRuler && isDM && (
                      <div
                        className="absolute pointer-events-none text-[8px] font-black uppercase"
                        style={{ left: ruler.rulerStart.x, top: ruler.rulerStart.y - 15, transform: 'translateX(-50%)', color: rulerColor }}
                      >
                        {ruler.userName}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={getGridBgStyle()}
              />

              {tokens.map(token => {
                const footprint = footprintForCategory(token.sizeCategory);
                const displaySize = gridSize * footprint;
                const labelHeight = token.characterId && token.name ? 18 : 0;
                return (
                  <div
                    key={token.id}
                    onMouseDown={(e) => handleMouseDown(e, token.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (token.characterId) return;
                      if (!isDM) return;
                      openTokenSheet(token.id);
                    }}
                    style={{
                      transform: `translate(${token.x}px, ${token.y}px)`,
                      position: 'absolute',
                      top: mapaUrl ? '0' : '50%',
                      left: mapaUrl ? '0' : '50%',
                      marginTop: mapaUrl ? '0' : `-${(displaySize)/2}px`,
                      marginLeft: mapaUrl ? '0' : `-${(displaySize)/2}px`,
                      width: `${displaySize}px`,
                      height: `${displaySize + labelHeight}px`,
                      zIndex: tokenSelecionado === token.id ? 100 : 10,
                    }}
                    className="flex flex-col items-center cursor-move group overflow-visible"
                  >
                    <div 
                      style={{
                        width: `${displaySize}px`,
                        height: `${displaySize}px`,
                        flex: '0 0 auto',
                        transform: token.isMonster ? `rotate(${token.rotation ?? 0}deg)` : 'none',
                        transformOrigin: '50% 50%',
                      }}
                      className={`relative shrink-0 overflow-hidden transition-all duration-200 ${token.characterId ? 'rounded-full border-2 bg-neutral-900' : ''} ${
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
                      <span className="mt-1 text-[8px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[80px] truncate text-center leading-tight flex-none">
                        {token.name}
                      </span>
                    )}
                  </div>
                );
              })}

              <SpellCaster
                isOpen={Boolean(activeSpellCast) && campaignLoaded}
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
                onRollDice={async (formula, secret, mode) => {
                  if (rollDiceFunc) return rollDiceFunc(formula, secret, mode);
                  return null;
                }}
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
        
        <PlayerStatusWidget
          campaignId={campaignId}
          isDM={isDM}
          currentUserId={currentUserId}
        />

      </div>

      <DiceRoller 
        campaignId={campaignId}
        isDM={isDM}
        currentUserId={currentUserId}
        onReady={(func) => setRollDiceFunc(() => func)} 
      />
      
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
        campaignId={campaignId}
        onLaunchSpell={handleSpellLaunch}
      />

      <TokenSheetPanel
        isOpen={showTokenSheet}
        isDM={isDM}
        loading={tokenSheetLoading}
        saving={tokenSheetSaving}
        autoFillLoading={tokenSheetAutoFillLoading}
        autoFillSource={tokenSheetAutoFillSource}
        autoFillError={tokenSheetAutoFillError}
        tokenLabel={tokenSheet.name || selectedToken?.name}
        sheet={tokenSheet}
        onChange={handleTokenSheetChange}
        onSave={handleSaveTokenSheet}
        onAutoFill={handleAutoFillTokenSheet}
        onAutoFillFromText={handleAutoFillTokenSheetFromText}
        onClose={() => {
          setShowTokenSheet(false);
          setTokenSheetTokenId(null);
          setTokenSheetAutoFillLoading(false);
          setTokenSheetAutoFillSource(null);
          setTokenSheetAutoFillError(null);
        }}
      />

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

      <button 
        onClick={() => setModalAjuda(!modalAjuda)}
        className="fixed bottom-6 left-6 z-[9999] w-12 h-12 bg-[#0a0a0a] border-2 border-[#00ff66] rounded-full flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:scale-110 transition-all"
        title="Manual de Condições"
      >
        <HelpCircle size={24} />
      </button>

      {modalAjuda && (
        <div className="fixed bottom-20 left-6 z-[9998] w-80 sm:w-96 bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col resize overflow-hidden min-h-[300px] max-h-[70vh]">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#00ff66]/5 shrink-0">
            <span className="text-[#00ff66] font-bold text-xs uppercase tracking-tighter">Ajuda Rápida</span>
            <button onClick={() => setModalAjuda(false)} className="text-white/20 hover:text-white"><X size={18}/></button>
          </div>
          <div className="flex bg-[#00ff66]/5 border-b border-white/5 shrink-0">
             <button onClick={() => setAjudaTab('jogador')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${ajudaTab === 'jogador' ? 'text-[#00ff66] border-b-2 border-[#00ff66]' : 'text-white/40 hover:text-white/70'}`}>Jogador</button>
             <button onClick={() => setAjudaTab('mestre')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${ajudaTab === 'mestre' ? 'text-[#00ff66] border-b-2 border-[#00ff66]' : 'text-white/40 hover:text-white/70'}`}>Mestre</button>
             <button onClick={() => setAjudaTab('condicoes')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${ajudaTab === 'condicoes' ? 'text-[#00ff66] border-b-2 border-[#00ff66]' : 'text-white/40 hover:text-white/70'}`}>Condições</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {ajudaTab === 'condicoes' ? (
              <div className="p-3 space-y-2">
                <div className="mb-3 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Buscar condição..." 
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#00ff66]/30"
                    value={buscaCondicao}
                    onChange={(e) => setBuscaCondicao(e.target.value)}
                  />
                </div>
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
                            {c.niveis && (
                              <div className="space-y-1 mt-2">
                                {c.niveis.map((n, idx) => (
                                  <div key={idx} className="flex gap-2 text-white/50">
                                    <span className="text-[#00ff66]">•</span> {n}
                                  </div>
                                ))}
                              </div>
                            )}
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
            ) : (
              <div className="p-3 space-y-2 pb-10">
                {TUTORIAL_VTT[ajudaTab].map((t, i) => {
                  const isExpanded = tutorialExpandido === t.titulo;
                  return (
                    <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
                      <button 
                        onClick={() => setTutorialExpandido(isExpanded ? null : t.titulo)}
                        className="w-full p-4 text-left hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-black uppercase tracking-tight ${isExpanded ? 'text-[#00ff66]' : 'text-white/80'}`}>{t.titulo}</span>
                          <ChevronRight size={14} className={`text-white/20 transition-transform ${isExpanded ? 'rotate-90 text-[#00ff66]' : ''}`} />
                        </div>
                        {!isExpanded && <p className="text-[10px] text-white/40 line-clamp-1">{t.desc}</p>}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
                          <p className="text-[11px] text-white/70 italic leading-relaxed">{t.desc}</p>
                          <div className="space-y-3">
                            {t.detalhes.map((d, idx) => (
                              <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-lg">
                                <span className="text-[#00ff66] text-[10px] font-black uppercase block mb-1 tracking-tighter"># {d.item}</span>
                                <p className="text-[11px] text-white/60">{d.texto}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Atalhos rápidos no final do Tutorial de Jogador */}
                {ajudaTab === 'jogador' && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 text-center">Teclas de Atalho</h5>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                          <span className="text-[10px] text-white/40 font-bold">FICHA</span>
                          <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">F</kbd>
                       </div>
                       <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                          <span className="text-[10px] text-white/40 font-bold">MAGIAS</span>
                          <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">G</kbd>
                       </div>
                       <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                          <span className="text-[10px] text-white/40 font-bold">MOVER</span>
                          <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">WASD</kbd>
                       </div>
                       <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                          <span className="text-[10px] text-white/40 font-bold">ZOOM</span>
                          <span className="text-[10px] text-white/60 font-black">SCROLL</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-white/5 bg-black shrink-0 text-center">
             <p className="text-[9px] text-white/20 uppercase font-medium">Se o mapa bugar ou a alma sair do corpo, aperte <strong className="text-white/40">F5</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}