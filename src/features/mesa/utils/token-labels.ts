import type { Token } from '@/features/mesa/types';

/**
 * Calcula o rotulo exibido de cada token, de forma DERIVADA (nao persistida):
 *  - Jogador (tem characterId)  -> nome do personagem (token.name), sem numero.
 *  - NPC/monstro com nome        -> "Nome N" (N = indice entre os de mesmo nome).
 *  - NPC/monstro sem nome        -> "Monstro N".
 *
 * Como o indice e recalculado a partir da ordem atual do array `tokens`,
 * ao excluir um monstro do meio (ex.: o 2 de tres), os seguintes renumeram
 * automaticamente (o 3 vira 2). A ordem usada e a do proprio array recebido.
 *
 * Retorna um Map tokenId -> rotulo. Tokens de jogador sem nome nao entram no Map.
 */
export function computeTokenLabels(tokens: Token[]): Map<string, string> {
  const counters = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const t of tokens) {
    // Jogador: usa o nome do personagem, sem numeracao.
    if (t.characterId) {
      if (t.name) labels.set(t.id, t.name);
      continue;
    }
    // NPC/monstro: agrupa por nome (ou "Monstro" quando vazio) e numera sequencialmente.
    const base = t.name && t.name.trim() ? t.name.trim() : 'Monstro';
    const n = (counters.get(base) ?? 0) + 1;
    counters.set(base, n);
    labels.set(t.id, `${base} ${n}`);
  }

  return labels;
}