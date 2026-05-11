// utils/spell-executor.ts
// Lógica de auto-execução de magias na mesa D&D

export interface SpellExecution {
  spellName: string;
  danoRolagem?: string | null; // ex: "3d6", "2d8+3"
  areaRaio?: number; // em pixels na mesa
  areaFormato?: string; // esfera, cone, linha
  areaTexto?: string | null;
  tipoAlvo?: string; // criatura, objeto, espaço
  salvacao?: string; // Destreza, Vontade, etc
  alcanceTexto?: string | null;
  categoriaMagia?: string | null;
  efeitoPrincipal?: string | null;
  beneficioConcedido?: string | null;
  restricaoConcedida?: string | null;
  descricao?: string | null;
  cdSalvacao?: number | string | null;
  tipoDano?: string | null;
  tipoAtaque?: string | null;
  tempoExplosao?: number; // ms até explodir
  posicao?: { x: number; y: number }; // na mesa
  casterLevel?: number; // nível do lançador
  ehConcentracao?: boolean;
}

export interface SpellEffect {
  id: string;
  spell: SpellExecution;
  startTime: number;
  atingidosTokens: string[]; // IDs dos tokens atingidos
  danoTotal: number;
  status: "ativa" | "resolvida" | "dispersa";
}

// Calcula o raio de explosão baseado no nível da magia e tipo de efeito
export function calcularRaioExplosao(
  nivelMagia: number,
  formato: string,
  modificadorCaster: number = 0
): number {
  const baseRadius: Record<string, number> = {
    esfera: 15 + nivelMagia * 5,
    cone: 20 + nivelMagia * 5,
    linha: 5 + nivelMagia * 5,
    alvo: 0, // sem raio, alvo único
  };

  return baseRadius[formato] || 15;
}

// Parse de fórmula de dano (ex: "3d6+5" -> { dados: 3, lados: 6, modificador: 5 })
export function parsearDano(danoPorMagia: string | null | undefined): {
  dados: number;
  lados: number;
  modificador: number;
} | null {
  if (!danoPorMagia) return null;

  const match = danoPorMagia.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return null;

  return {
    dados: parseInt(match[1]),
    lados: parseInt(match[2]),
    modificador: parseInt(match[3] || "0"),
  };
}

export function parseDistanciaTexto(
  texto: string | null | undefined,
  unidadeMapa: 'm' | 'pes'
): number | null {
  if (!texto) return null;

  const normalizado = texto.trim().toLowerCase();
  if (!normalizado) return null;

  if (/(^|\s)(toque|touch)(\s|$)/.test(normalizado)) {
    return unidadeMapa === 'm' ? 1.5 : 5;
  }

  if (/(^|\s)(pessoal|self)(\s|$)/.test(normalizado)) {
    return 0;
  }

  const match = normalizado.match(/([\d.,]+)\s*(m|metro|metros|pes|pés|ft|feet)?/i);
  if (!match) return null;

  const valor = Number.parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(valor)) return null;

  const unidade = (match[2] || unidadeMapa).toLowerCase();
  if (unidadeMapa === 'm') {
    if (unidade === 'pes' || unidade === 'pés' || unidade === 'ft' || unidade === 'feet') {
      return valor * 0.3048;
    }
    return valor;
  }

  if (unidade === 'm' || unidade === 'metro' || unidade === 'metros') {
    return valor * 3.28084;
  }

  return valor;
}

// Rola dado de dano
export function rolarDano(danoParsed: {
  dados: number;
  lados: number;
  modificador: number;
}): number {
  let total = 0;
  for (let i = 0; i < danoParsed.dados; i++) {
    total += Math.floor(Math.random() * danoParsed.lados) + 1;
  }
  return total + danoParsed.modificador;
}

// Detecta tokens dentro de uma área de efeito
export function detectarTokensNaArea(
  tokensPosicoes: Array<{ id: string; x: number; y: number; raio: number }>,
  epicentro: { x: number; y: number },
  raioArea: number
): string[] {
  return tokensPosicoes
    .filter((token) => {
      const distancia = Math.sqrt(
        Math.pow(token.x - epicentro.x, 2) + Math.pow(token.y - epicentro.y, 2)
      );
      return distancia <= raioArea + token.raio; // contabiliza raio do token também
    })
    .map((token) => token.id);
}

// Trata salvas contra a magia
export function testarSalvacao(
  salvacaoTipo: string,
  dificuldade: number,
  modificadorAlvo: number
): { sucesso: boolean; rolagem: number } {
  const rolagem = Math.floor(Math.random() * 20) + 1 + modificadorAlvo;
  return {
    sucesso: rolagem >= dificuldade,
    rolagem,
  };
}

// Calcula dificuldade de salvação baseado no nível do caster
export function calcularCD(nivelMagia: number, modificadorCaster: number = 3): number {
  const baseCD = 8;
  return baseCD + nivelMagia + modificadorCaster;
}

// Aplica efeitos de magia (dano, condições, etc)
export interface EffectResult {
  tokenId: string;
  danoRecebido: number;
  salvou: boolean;
  condicoes: string[]; // "queimado", "congelado", "envenenado", etc
  descricaoEfeito: string;
}

export function aplicarEfeitoMagia(
  spell: SpellExecution,
  tokenPosicoes: Array<{ id: string; x: number; y: number; raio: number }>,
  casterModificador: number = 3
): EffectResult[] {
  const resultados: EffectResult[] = [];

  // Detectar tokens atingidos
  const tokensPosicao = tokenPosicoes.find(
    (t) => t.x === spell.posicao?.x && t.y === spell.posicao?.y
  );
  if (!tokensPosicao) return resultados;

  const raioExplosao = spell.areaRaio && spell.areaRaio > 0
    ? spell.areaRaio
    : calcularRaioExplosao(
        spell.casterLevel || 0,
        spell.areaFormato || "esfera",
        casterModificador
      );

  const atingidos = detectarTokensNaArea(tokenPosicoes, spell.posicao!, raioExplosao);

  // Calcular dano
  const danoParsed = parsearDano(spell.danoRolagem ?? null);
  if (!danoParsed) return resultados; // sem dano

  const cd = calcularCD(spell.casterLevel || 1, casterModificador);

  // Aplicar a cada token atingido
  for (const tokenId of atingidos) {
    const danoBase = rolarDano(danoParsed);

    // Se há salvação, metade do dano se passar
    let danoFinal = danoBase;
    let salvou = false;

    if (spell.salvacao) {
      const teste = testarSalvacao(spell.salvacao, cd, 0); // TODO: obter mod do alvo
      salvou = teste.sucesso;
      if (salvou) {
        danoFinal = Math.ceil(danoBase / 2);
      }
    }

    resultados.push({
      tokenId,
      danoRecebido: danoFinal,
      salvou,
      condicoes: extrairCondicoes(spell.spellName),
      descricaoEfeito: `${spell.spellName}: ${danoFinal} de dano${salvou ? " (salvação bem-sucedida)" : ""}`,
    });
  }

  return resultados;
}

// Extrai condições especiais da magia (ex: "paralisia", "congelamento")
function extrairCondicoes(spellName: string): string[] {
  const condicoes: Record<string, string[]> = {
    "raio congelante": ["congelado"],
    "bola de fogo": ["queimado"],
    "nuvem venenosa": ["envenenado"],
    "mão espectral": [],
    "explosão brilhante": ["cego"],
    "corrente relâmpago": ["atordoado"],
  };

  for (const [spell, effects] of Object.entries(condicoes)) {
    if (spellName.toLowerCase().includes(spell)) {
      return effects;
    }
  }

  return [];
}

// Animação visual da magia na mesa
export function criarAnimacaoSpell(spell: SpellExecution): {
  particulas: Array<{ x: number; y: number; duracao: number }>;
  ondaChoque?: { raio: number; duracao: number };
  animationType: "explosao" | "raio" | "cone" | "linha" | "alvo";
} {
  const basePos = spell.posicao || { x: 0, y: 0 };

  if (spell.areaFormato === "esfera") {
    return {
      animationType: "explosao",
      particulas: gerarParticulasAleatorias(basePos, 30, 50),
      ondaChoque: { raio: spell.areaRaio || 15, duracao: 500 },
    };
  }

  if (spell.areaFormato === "cone") {
    return {
      animationType: "cone",
      particulas: gerarParticulasEmCone(basePos, 60, 20),
    };
  }

  if (spell.areaFormato === "linha") {
    return {
      animationType: "linha",
      particulas: gerarParticulasEmLinha(basePos, 100, 10),
    };
  }

  return {
    animationType: "alvo",
    particulas: gerarParticulasAleatorias(basePos, 5, 30),
  };
}

function gerarParticulasAleatorias(
  centro: { x: number; y: number },
  quantidade: number,
  raio: number
): Array<{ x: number; y: number; duracao: number }> {
  const particulas = [];
  for (let i = 0; i < quantidade; i++) {
    const angulo = (Math.random() * Math.PI * 2);
    const distancia = Math.random() * raio;
    particulas.push({
      x: centro.x + Math.cos(angulo) * distancia,
      y: centro.y + Math.sin(angulo) * distancia,
      duracao: 200 + Math.random() * 300,
    });
  }
  return particulas;
}

function gerarParticulasEmCone(
  centro: { x: number; y: number },
  profundidade: number,
  largura: number
): Array<{ x: number; y: number; duracao: number }> {
  const particulas = [];
  for (let i = 0; i < 20; i++) {
    const angulo = (Math.random() - 0.5) * (largura * Math.PI / 180);
    const distancia = Math.random() * profundidade;
    particulas.push({
      x: centro.x + Math.cos(angulo) * distancia,
      y: centro.y + Math.sin(angulo) * distancia,
      duracao: 300 + Math.random() * 200,
    });
  }
  return particulas;
}

function gerarParticulasEmLinha(
  centro: { x: number; y: number },
  comprimento: number,
  largura: number
): Array<{ x: number; y: number; duracao: number }> {
  const particulas = [];
  for (let i = 0; i < 15; i++) {
    particulas.push({
      x: centro.x + (Math.random() - 0.5) * largura,
      y: centro.y + Math.random() * comprimento,
      duracao: 250 + Math.random() * 250,
    });
  }
  return particulas;
}
