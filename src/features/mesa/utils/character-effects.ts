// Sistema de Efeitos Ativos (item 7b).
// Registra na ficha do alvo os efeitos de uma magia: condicoes (ex.: "envenenado")
// e textos de beneficio/restricao (ex.: "vantagem em ataques", "-2 em testes de FOR").
// Sao TEXTUAIS: o catalogo nao fornece modificador numerico estruturado, entao o
// efeito e exibido para o jogador/mestre aplicar. Persistido em jsonb e sincronizado
// em tempo real (characters.active_effects / campaign_tokens.active_effects).

export type EffectKind = 'condicao' | 'beneficio' | 'restricao';

export interface ActiveEffect {
  id: string;
  tipo: EffectKind;
  rotulo: string;
  origem?: string; // nome da magia
}

function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `ef_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Constroi a lista de efeitos a partir do que a magia oferece. */
export function efeitosDaMagia(
  spell: { spellName: string; beneficioConcedido?: string | null; restricaoConcedida?: string | null },
  condicoes: string[] = [],
): ActiveEffect[] {
  const out: ActiveEffect[] = [];
  for (const c of condicoes) {
    if (c && c.trim()) out.push({ id: uid(), tipo: 'condicao', rotulo: c.trim(), origem: spell.spellName });
  }
  if (spell.beneficioConcedido && spell.beneficioConcedido.trim())
    out.push({ id: uid(), tipo: 'beneficio', rotulo: spell.beneficioConcedido.trim(), origem: spell.spellName });
  if (spell.restricaoConcedida && spell.restricaoConcedida.trim())
    out.push({ id: uid(), tipo: 'restricao', rotulo: spell.restricaoConcedida.trim(), origem: spell.spellName });
  return out;
}

/** Mescla efeitos novos aos existentes, evitando duplicar o mesmo rotulo+origem. */
export function mesclarEfeitos(atuais: ActiveEffect[], novos: ActiveEffect[]): ActiveEffect[] {
  const chave = (e: ActiveEffect) => `${e.tipo}|${e.rotulo}|${e.origem ?? ''}`;
  const vistos = new Set(atuais.map(chave));
  const merged = [...atuais];
  for (const e of novos) {
    if (!vistos.has(chave(e))) { vistos.add(chave(e)); merged.push(e); }
  }
  return merged;
}