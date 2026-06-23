export interface SpellExecution {
  spellName: string;
  danoRolagem?: string | null;
  areaRaio?: number;
  areaFormato?: string;
  areaTexto?: string | null;
  tipoAlvo?: string;
  salvacao?: string;
  alcanceTexto?: string | null;
  categoriaMagia?: string | null;
  efeitoPrincipal?: string | null;
  beneficioConcedido?: string | null;
  restricaoConcedida?: string | null;
  descricao?: string | null;
  cdSalvacao?: number | string | null;
  tipoDano?: string | null;
  tipoAtaque?: string | null;
  tempoExplosao?: number;
  posicao?: { x: number; y: number };
  numProjeteis?: number;
  casterLevel?: number;
  ehConcentracao?: boolean;
}

export interface SpellEffect {
  id: string;
  spell: SpellExecution;
  startTime: number;
  atingidosTokens: string[];
  danoTotal: number;
  status: "ativa" | "resolvida" | "dispersa";
}

export function calcularRaioExplosao(
  nivelMagia: number,
  formato: string,
  modificadorCaster: number = 0
): number {
  const baseRadius: Record<string, number> = {
    esfera: 15 + nivelMagia * 5,
    cone: 20 + nivelMagia * 5,
    linha: 5 + nivelMagia * 5,
    alvo: 0,
  };

  return baseRadius[formato] || 15;
}

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
      return distancia <= raioArea + token.raio;
    })
    .map((token) => token.id);
}

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

export function calcularCD(
  nivelMagia: number, 
  modificadorCaster: number = 3, 
  cdExplicita?: number | string | null
): number {
  if (cdExplicita) {
    const parsed = parseInt(String(cdExplicita), 10);
    if (!isNaN(parsed)) return parsed;
  }
  const baseCD = 8;
  return baseCD + nivelMagia + modificadorCaster;
}

export interface EffectResult {
  tokenId: string;
  danoRecebido: number;
  salvou: boolean;
  condicoes: string[];
  descricaoEfeito: string;
}

export function aplicarEfeitoMagia(
  spell: SpellExecution,
  tokenPosicoes: Array<{ id: string; x: number; y: number; raio: number }>,
  casterModificador: number = 3,
  tokenIdsAlvos?: string[]
): EffectResult[] {
  const resultados: EffectResult[] = [];

  const atingidos = tokenIdsAlvos ?? (() => {
    const raioExplosao = spell.areaRaio && spell.areaRaio > 0
      ? spell.areaRaio
      : calcularRaioExplosao(
          spell.casterLevel || 0,
          spell.areaFormato || "esfera",
          casterModificador
        );
    return detectarTokensNaArea(tokenPosicoes, spell.posicao!, raioExplosao);
  })();

  const danoParsed = parsearDano(spell.danoRolagem ?? null);
  if (!danoParsed) return resultados;

  const cd = calcularCD(spell.casterLevel || 1, casterModificador, spell.cdSalvacao);

  for (const tokenId of atingidos) {
    const danoBase = rolarDano(danoParsed);
    let danoFinal = danoBase;
    let salvou = false;

    if (spell.salvacao) {
      const teste = testarSalvacao(spell.salvacao, cd, 0); 
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

export function combinarDados(expr: string, qtd: number): string {
  if (!expr || qtd <= 0) return expr;
  return expr.replace(/(\d+)(d\d+)/i, (_, n, d) => `${parseInt(n) + qtd}${d}`);
}