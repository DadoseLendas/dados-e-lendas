import { TokenSheet } from '@/features/monsters/components/token-sheet-panel';

export const USER_COLORS = [
  '#00ff66', '#ff4444', '#4488ff', '#ffaa44',
  '#ff44ff', '#44ffaa', '#ffff44', '#aa44ff',
];

export const EMPTY_ABILITIES = { str: "", dex: "", con: "", int: "", wis: "", cha: "" };

export const buildEmptySheet = (name?: string): TokenSheet => ({
  name: name ?? "",
  size_category: "", type: "", alignment: "",
  armorClass: "", hitPoints: "", speed: "",
  abilities: { ...EMPTY_ABILITIES },
  saves: { ...EMPTY_ABILITIES },
  skills: {},
  damageResistances: "", conditionImmunities: "",
  senses: "", languages: "",
  challengeRating: "", xp: "",
  abilitiesText: "", actionsText: "",
});

export const toStringValue = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export const toNumberOrNull = (value: unknown) => {
  const normalized = toStringValue(value).replace(',', '.').trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

export const toLeadingNumberOrNull = (value: unknown) => {
  const normalized = toStringValue(value).replace(',', '.').trim();
  if (!normalized) return null;
  const match = normalized.match(/-?\d[\d.,]*/);
  if (!match?.[0]) return null;
  const numericText = match[0].replace(/[.,]/g, '');
  const num = Number(numericText);
  return Number.isFinite(num) ? num : null;
};

export const toList = (value: unknown) =>
  toStringValue(value).split(',').map(i => i.trim()).filter(Boolean);

export const fromList = (value?: string[] | string | null) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(', ');
  return value;
};

export const normalizeAbilityScores = (value: Partial<typeof EMPTY_ABILITIES> | null | undefined) => ({
  str: toStringValue(value?.str),
  dex: toStringValue(value?.dex),
  con: toStringValue(value?.con),
  int: toStringValue(value?.int),
  wis: toStringValue(value?.wis),
  cha: toStringValue(value?.cha),
});

export const normalizeTokenSheet = (sheet: Partial<TokenSheet> | null | undefined): TokenSheet => ({
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

export const TUTORIAL_VTT: Record<string, { titulo: string; desc: string; detalhes: { item: string; texto: string }[] }[]> = {
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

export const CONDICOES_RPG: {
  nome: string; desc: string;
  tabela?: { dado: string; efeito: string }[];
  niveis?: string[];
  notas?: { titulo: string; texto: string }[];
}[] = [
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
