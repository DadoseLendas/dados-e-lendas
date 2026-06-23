"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  aplicarEfeitoMagia,
  criarAnimacaoSpell,
  EffectResult,
  SpellExecution,
  detectarTokensNaArea,
  parsearDano,
  parseDistanciaTexto,
  rolarDano,
} from "@/domain/spells/spell-executor";
import { Zap, X, Crosshair, Circle, Square, ArrowRight, Shield, Check } from "lucide-react";
import { efeitosDaMagia } from "@/features/mesa/utils/character-effects";
import { addEffectsToCharacter, addEffectsToMonsterToken } from "@/features/mesa/services/mesa-service";

interface Token {
  id: string;
  x: number;
  y: number;
  raio: number;
  nome: string;
  pvAtuais?: number;
  pvMax?: number;
  characterId?: number | null;
  isMonster?: boolean;
}

interface SpellCasterProps {
  isOpen: boolean;
  spell: SpellExecution | null;
  campaignId: string;
  tokens: Token[];
  casterPoint: { x: number; y: number } | null;
  gridSize: number;
  gridValue: number;
  gridUnit: 'm' | 'pes';
  casterLevel: number;
  casterModificador: number;
  resolvePoint?: (clientX: number, clientY: number) => { x: number; y: number } | null;
  onClose: () => void;
  onSpellCast?: (resultado: EffectResult[]) => void;
  onRollDice?: (formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage') => Promise<any | null>;
}

export default function SpellCaster({
  isOpen,
  spell,
  campaignId,
  tokens,
  casterPoint,
  gridSize,
  gridValue,
  gridUnit,
  casterLevel,
  casterModificador,
  resolvePoint,
  onClose,
  onSpellCast,
  onRollDice,
}: SpellCasterProps) {
  const supabase = createClient();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const gs = (gridSize && gridSize > 0) ? gridSize : 50;
  const gv = (gridValue && gridValue > 0) ? gridValue : 1;

  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [previewArea, setPreviewArea] = useState<{
    x: number;
    y: number;
    raioPreview: number;
    inRange: boolean;
    atingidos: Token[];
  } | null>(null);
  const [recentCasts, setRecentCasts] = useState<Array<{ spell: SpellExecution; time: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const isHealingSpell = useCallback((currentSpell: SpellExecution) => {
    const corpus = [
      currentSpell.categoriaMagia,
      currentSpell.efeitoPrincipal,
      currentSpell.beneficioConcedido,
      currentSpell.descricao,
      currentSpell.spellName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return /(cura|curar|curou|recuper|restaura|restaurar|healing|heal)/.test(corpus);
  }, []);

  const getMousePoint = useCallback((e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
    if (resolvePoint) return resolvePoint(e.clientX, e.clientY);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [resolvePoint]);

  const buildPreview = useCallback((point: { x: number; y: number }) => {
    if (!spell || !casterPoint) return null;

    const formatoTexto = ((spell as any).formato || "").toString().toLowerCase();
    const areaTextoStr = (spell.areaTexto || "").toLowerCase();
    const alcanceTextoStr = (spell.alcanceTexto || "").toLowerCase();

    const shapeText = formatoTexto || areaTextoStr;

    const areaUnits =
      parseDistanciaTexto(spell.areaTexto || null, gridUnit) ??
      (spell.areaRaio ? (spell.areaRaio / gs) * gv : null);

    const rangeUnitsParsed = parseDistanciaTexto(spell.alcanceTexto || null, gridUnit);

    const distanceFromCasterPx = Math.sqrt(
      Math.pow(point.x - casterPoint.x, 2) + Math.pow(point.y - casterPoint.y, 2)
    );

    const distanceFromCasterUnits = (distanceFromCasterPx / gs) * gv;

    const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0) param = dot / len_sq;
      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      const dx = px - xx;
      const dy = py - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const isPointInsideSquare = (px: number, py: number, cx: number, cy: number, halfSide: number) => {
      return Math.abs(px - cx) <= halfSide && Math.abs(py - cy) <= halfSide;
    };

    const isPessoal = alcanceTextoStr.includes("pessoal") || alcanceTextoStr.includes("self");
    const isToque = alcanceTextoStr.includes("toque") || alcanceTextoStr.includes("touch");
    const isAura = shapeText.includes("aura");
    const isCube = shapeText.includes("cubo") || shapeText.includes("quadrado") || shapeText.includes("caixa");
    const isLine = shapeText.includes("linha") || shapeText.includes("line");
    const isCircle = shapeText.includes("circulo") || shapeText.includes("círculo") || shapeText.includes("esfera");
    const isAlvo = !isAura && !isCube && !isLine && !isCircle && (formatoTexto === "" || shapeText.includes("alvo") || shapeText.includes("único") || shapeText.includes("unico"));

    if (isPessoal) {
      const selfToken = tokens.find((t) => {
        const dx = t.x - casterPoint.x;
        const dy = t.y - casterPoint.y;
        return Math.sqrt(dx * dx + dy * dy) < gs * 0.5;
      });
      if (isAura || isCircle) {
        const raioPreview = areaUnits == null ? gs * 1.5 : (areaUnits / gv) * gs;
        const atingidos = tokens.filter((token) => {
          const distancia = Math.sqrt(Math.pow(token.x - casterPoint.x, 2) + Math.pow(token.y - casterPoint.y, 2));
          return distancia <= token.raio + raioPreview;
        });
        return { x: casterPoint.x, y: casterPoint.y, raioPreview, inRange: true, atingidos };
      }
      const atingidos = selfToken ? [selfToken] : [];
      return { x: casterPoint.x, y: casterPoint.y, raioPreview: gs * 0.5, inRange: true, atingidos };
    }

    if (isToque) {
      const raioPreview = gs * 1.5;
      const atingidos = tokens.filter((token) => {
        const distancia = Math.sqrt(Math.pow(token.x - casterPoint.x, 2) + Math.pow(token.y - casterPoint.y, 2));
        return distancia <= token.raio + raioPreview;
      });
      return { x: casterPoint.x, y: casterPoint.y, raioPreview, inRange: true, atingidos };
    }

    if (isAura) {
      const raioPreview = areaUnits == null ? gridSize * 1.5 : (areaUnits / gridValue) * gridSize;
      const atingidos = tokens.filter((token) => {
        const distancia = Math.sqrt(Math.pow(token.x - casterPoint.x, 2) + Math.pow(token.y - casterPoint.y, 2));
        return distancia <= token.raio + raioPreview;
      });
      return { x: casterPoint.x, y: casterPoint.y, raioPreview, inRange: true, atingidos };
    }

    if (isAlvo) {
      const inRange = rangeUnitsParsed == null ? true : distanceFromCasterUnits <= rangeUnitsParsed;
      let closest: Token | null = null;
      let closestDist = Infinity;
      for (const token of tokens) {
        const dist = Math.sqrt(Math.pow(token.x - point.x, 2) + Math.pow(token.y - point.y, 2));
        if (dist < closestDist) {
          closestDist = dist;
          closest = token;
        }
      }
      const atingidos = closest ? [closest] : [];
      return { x: point.x, y: point.y, raioPreview: gs * 0.5, inRange, atingidos };
    }

    const inRange = rangeUnitsParsed == null ? true : distanceFromCasterUnits <= rangeUnitsParsed;

    if (isCircle) {
      if (areaUnits == null) return null;
      const raioPreview = (areaUnits / gv) * gs;
      const atingidos = detectarTokensNaArea(tokens.map((t) => ({ id: t.id, x: t.x, y: t.y, raio: t.raio })), point, raioPreview).map((tokenId: string) => tokens.find((t) => t.id === tokenId)).filter(Boolean) as Token[];
      return { x: point.x, y: point.y, raioPreview, inRange, atingidos };
    }

    if (isCube) {
      if (areaUnits == null) return null;
      const sidePx = (areaUnits / gv) * gs;
      const halfSide = sidePx / 2;
      const atingidos = tokens.filter((token) => isPointInsideSquare(token.x, token.y, point.x, point.y, halfSide + token.raio));
      return { x: point.x, y: point.y, raioPreview: halfSide, inRange, atingidos };
    }

    if (isLine) {
      if (!casterPoint) return null;
      const lengthPx = Math.sqrt(Math.pow(point.x - casterPoint.x, 2) + Math.pow(point.y - casterPoint.y, 2));
      const widthPx = gs;
      const atingidos = tokens.filter((token) => {
        const distToSeg = pointToSegmentDistance(token.x, token.y, casterPoint.x, casterPoint.y, point.x, point.y);
        return distToSeg <= token.raio + widthPx / 2;
      });
      return { x: (casterPoint.x + point.x) / 2, y: (casterPoint.y + point.y) / 2, raioPreview: lengthPx / 2, inRange, atingidos };
    }

    return null;
  }, [casterPoint, gridSize, gridUnit, gridValue, spell, tokens]);

  useEffect(() => {
    if (!isOpen) {
      setHoverPoint(null);
      setPreviewArea(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setExcludedIds(new Set());
  }, [spell, isOpen]);

  const resolverNomesAlvos = (resultados: EffectResult[], resolvedTokens?: Map<string, { nome: string | null; bonusPorAtributo: Record<string, number> }>) => {
    const nomes = resultados
      .map((resultado) => {
        const rt = resolvedTokens?.get(resultado.tokenId);
        return rt?.nome || tokens.find((token) => token.id === resultado.tokenId)?.nome || `Token-${resultado.tokenId.slice(0, 4)}`;
      })
      .filter(Boolean);

    const unicos = Array.from(new Set(nomes));
    if (unicos.length === 0) return 'Nenhum alvo na área';
    if (unicos.length === 1) return unicos[0];
    if (unicos.length === 2) return `${unicos[0]} e ${unicos[1]}`;
    return `${unicos[0]}, ${unicos[1]} e mais ${unicos.length - 2}`;
  };

  const salvarCastDoChatLog = async (
    spellToLog: SpellExecution, 
    resultados: EffectResult[], 
    kind: "dano" | "cura" | "efeito", 
    resolvedTokens?: Map<string, { nome: string | null; bonusPorAtributo: Record<string, number> }>,
    danoTotal?: number,
    danoRolls?: number[]
  ) => {
    if (resultados.length === 0) {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      const { data: profileData } = userId
        ? await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle()
        : { data: null };
      await supabase.from("chat_messages").insert({
        campaign_id: campaignId,
        user_name: profileData?.display_name || authData.user?.user_metadata?.full_name || authData.user?.email?.split('@')[0] || 'Mestre',
        sender_id: userId,
        receiver_id: null,
        text: [
          `🎯 Magia lancada: ${spellToLog.spellName}`,
          `Nenhum alvo estava na área de efeito.`,
        ].join('\n'),
        is_roll: false,
        is_secret: false,
        channel: 'campanha',
      });
      return;
    }

    const linhas = resultados.map((resultado) => {
      const rt = resolvedTokens?.get(resultado.tokenId);
      const nome = rt?.nome || tokens.find((t) => t.id === resultado.tokenId)?.nome || `Token-${resultado.tokenId.slice(0, 4)}`;
      if (kind === "cura") {
        return `- ${nome}: curou ${Math.abs(resultado.danoRecebido)} PV`;
      }
      if (resultado.salvou && resultado.danoRecebido === 0) {
        return `- ${nome}: 🛡️ sucesso crítico — nenhum dano`;
      }
      if (!resultado.salvou && resultado.danoRecebido > 0 && resultado.descricaoEfeito.includes("CRÍTICA")) {
        return `- ${nome}: 💥 falha crítica — ${resultado.danoRecebido} de dano`;
      }
      if (kind === "efeito") {
        const desc = spellToLog.beneficioConcedido || spellToLog.efeitoPrincipal || spellToLog.restricaoConcedida || spellToLog.descricao || "Efeito aplicado";
        return `- ${nome}: ${desc}`;
      }
      return `- ${nome}: ${resultado.danoRecebido} de dano${resultado.salvou ? " (salvou, metade)" : ""}`;
    });

    const mensagem = [
      `🎯 Magia lancada: ${spellToLog.spellName}`,
      `Alvo(s): ${resolverNomesAlvos(resultados, resolvedTokens)}`,
      spellToLog.alcanceTexto ? `Alcance: ${spellToLog.alcanceTexto}` : null,
      spellToLog.areaTexto ? `Area: ${spellToLog.areaTexto}` : null,
      kind === "cura"
        ? "Tipo: cura"
        : spellToLog.danoRolagem
          ? `Tipo: dano` 
          : "Tipo: efeito",
      spellToLog.danoRolagem && (danoTotal !== undefined)
        ? `Rolagem: ${danoRolls && danoRolls.length > 0 ? `[${danoRolls.join(', ')}] = ` : ''}${danoTotal}` 
        : null,
      `Atingidos: ${resultados.length} alvo(s)`,
      '',
      ...linhas,
    ].filter(Boolean).join('\n');

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    const { data: profileData } = userId
      ? await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle()
      : { data: null };

    await supabase.from("chat_messages").insert({
      campaign_id: campaignId,
      user_name: profileData?.display_name || authData.user?.user_metadata?.full_name || authData.user?.email?.split('@')[0] || 'Mestre',
      sender_id: userId,
      receiver_id: null,
      text: mensagem,
      is_roll: false,
      is_secret: false,
      channel: 'campanha',
    });
  };

  const mapSalvacaoParaAtributo = useCallback((tipo: string): string => {
    const map: Record<string, string> = {
      "força": "str", "for": "str", "strength": "str", "str": "str",
      "destreza": "dex", "dex": "dex", "dexterity": "dex",
      "constituição": "con", "constituicao": "con", "con": "con", "constitution": "con",
      "inteligência": "int", "inteligencia": "int", "int": "int", "intelligence": "int",
      "sabedoria": "wis", "sab": "wis", "wis": "wis", "wisdom": "wis",
      "carisma": "cha", "car": "cha", "cha": "cha", "charisma": "cha",
    };
    return map[tipo.trim().toLowerCase()] || "dex";
  }, []);

  const safeJson = (v: any): Record<string, any> => {
    if (typeof v === 'object' && v !== null) return v;
    if (typeof v === 'string') try { return JSON.parse(v); } catch { return {}; }
    return {};
  };

  const buscaDadosToken = useCallback(async (tokenId: string, characterId?: number | null): Promise<{ nome: string | null; bonusPorAtributo: Record<string, number> }> => {
    const abbrs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const zeroBonus = () => {
      const b: Record<string, number> = {};
      for (const a of abbrs) b[a] = 0;
      return b;
    };
    try {
      if (characterId) {
        const { data: char } = await supabase
          .from('characters')
          .select('*')
          .eq('id', characterId)
          .maybeSingle();
        if (char) {
          const c = char as any;
          const stats = safeJson(c.stats);
          const st = safeJson(c.savingThrows);
          const pb = Number(c.proficiencyBonus ?? 2);
          const bonusPorAtributo: Record<string, number> = {};
          for (const a of abbrs) {
            const statVal = Number(stats[a]) || 10;
            const mod = Math.floor((statVal - 10) / 2);
            const proficient = st[a] === true;
            bonusPorAtributo[a] = mod + (proficient ? pb : 0);
          }
          return { nome: c.name || null, bonusPorAtributo };
        }
      }
      const { data: tok } = await supabase
        .from('campaign_tokens')
        .select('name, saving_throws')
        .eq('id', tokenId)
        .maybeSingle();
      if (tok) {
        const t = tok as any;
        const saves = safeJson(t.saving_throws);
        const bonusPorAtributo: Record<string, number> = {};
        for (const a of abbrs) {
          bonusPorAtributo[a] = Number(saves[a]) || 0;
        }
        return { nome: t.name || null, bonusPorAtributo };
      }
    } catch (e) {
      console.error('[dadosToken] erro:', e);
    }
    return { nome: null, bonusPorAtributo: zeroBonus() };
  }, [supabase]);

  const executeSpell = useCallback(async (point: { x: number; y: number }) => {
    if (!spell || !casterPoint) return;

    const preview = buildPreview(point);
    if (!preview || !preview.inRange) return;

    preview.atingidos = preview.atingidos.filter((t) => !excludedIds.has(t.id));
    if (preview.atingidos.length === 0) { onClose(); return; }

    try {
      setLoading(true);

      const formatoTexto = ((spell as any).formato || "").toString().toLowerCase();
      const areaTextoStr = (spell.areaTexto || "").toLowerCase();
      const alcanceTextoStr = (spell.alcanceTexto || "").toLowerCase();
      const shapeText = formatoTexto || areaTextoStr;
      const isPessoal = alcanceTextoStr.includes("pessoal") || alcanceTextoStr.includes("self");
      const isToque = alcanceTextoStr.includes("toque") || alcanceTextoStr.includes("touch");
      const isAura = shapeText.includes("aura");
      const isCube = shapeText.includes("cubo") || shapeText.includes("quadrado") || shapeText.includes("caixa");
      const isLine = shapeText.includes("linha") || shapeText.includes("line");
      const isCircle = shapeText.includes("circulo") || shapeText.includes("círculo") || shapeText.includes("esfera");
      const isSingleTarget = !isAura && !isCube && !isLine && !isCircle && (formatoTexto === "" || shapeText.includes("alvo") || shapeText.includes("único") || shapeText.includes("unico"));

      const areaUnits =
        isSingleTarget ? null :
        (parseDistanciaTexto(spell.areaTexto || null, gridUnit) ??
        (spell.areaRaio ? (spell.areaRaio / gs) * gv : null));
      const areaRadiusPx = areaUnits == null ? undefined : (areaUnits / gv) * gs;
      const spellExecution: SpellExecution = {
        ...spell,
        posicao: point,
        casterLevel,
        areaRaio: areaRadiusPx,
      };

      const resolvedTokens = new Map<string, { nome: string | null; bonusPorAtributo: Record<string, number> }>();
      const resolvePromises = preview.atingidos.map(async (t) => {
        const tokenData = await buscaDadosToken(t.id, t.characterId);
        resolvedTokens.set(t.id, tokenData);
      });
      await Promise.all(resolvePromises);

      const healing = isHealingSpell(spellExecution);
      const resultados: EffectResult[] = [];
      let sentPerTargetMessages = false;
      let danoRolls: number[] = [];
      let rollTotalCache = 0;

      if (healing) {
        const healParsed = parsearDano(spellExecution.danoRolagem || null);
        let healAmount = 0;
        
        if (healParsed && onRollDice) {
           const rollResult = await onRollDice(spellExecution.danoRolagem!, false, 'normal');
           healAmount = rollResult?.finalValue ?? rolarDano(healParsed);
           danoRolls = rollResult?.values || [];
        } else if (healParsed) {
           healAmount = rolarDano(healParsed);
        }
        rollTotalCache = healAmount;

        for (const token of preview.atingidos) {
          const realNome = resolvedTokens.get(token.id)?.nome || token.nome;
          resultados.push({
            tokenId: token.id,
            danoRecebido: -healAmount,
            salvou: false,
            condicoes: [],
            descricaoEfeito: `${realNome} curou ${healAmount} PV`,
          });
        }
      } else if (spellExecution.danoRolagem) {
        let danoTotal = 0;
        const danoParsed = parsearDano(spellExecution.danoRolagem);
        if (danoParsed) {
          if (onRollDice) {
            const rollResult = await onRollDice(spellExecution.danoRolagem!, false, 'normal');
            danoTotal = rollResult?.finalValue ?? rolarDano(danoParsed);
            danoRolls = rollResult?.values || [];
          } else {
            danoTotal = rolarDano(danoParsed);
          }
        }
        rollTotalCache = danoTotal;

        if (spellExecution.salvacao && onRollDice) {
          const saveAbil = mapSalvacaoParaAtributo(spellExecution.salvacao);
          
          const rawCD = spellExecution.cdSalvacao;
          const cd = (typeof rawCD === 'number' && rawCD > 0)
            ? rawCD
            : (typeof rawCD === 'string' && !isNaN(parseInt(rawCD, 10)))
              ? parseInt(rawCD, 10)
              : 8 + (spellExecution.casterLevel || 1) + casterModificador;

          for (const token of preview.atingidos) {
            const td = resolvedTokens.get(token.id);
            const realNome = td?.nome || token.nome;
            const saveBonus = td?.bonusPorAtributo[saveAbil] ?? 0;

            let rollTotal = 0;
            let naturalRoll = 0;
            const diceResult = await onRollDice('d20', false, 'normal');
            if (diceResult) {
              naturalRoll = diceResult.values[0] ?? diceResult.finalValue;
              rollTotal = diceResult.finalValue;
            } else {
              naturalRoll = Math.floor(Math.random() * 20) + 1;
              rollTotal = naturalRoll;
            }
            const totalWithBonus = rollTotal + saveBonus;

            const isNat1 = naturalRoll === 1;
            const isNat20 = naturalRoll === 20;
            const salvou = isNat20 || (totalWithBonus >= cd && !isNat1);

            let danoFinal = danoTotal;
            if (isNat20) danoFinal = 0;
            else if (isNat1) danoFinal = danoTotal * 2;
            else if (salvou) danoFinal = Math.ceil(danoTotal / 2);

            resultados.push({
              tokenId: token.id,
              danoRecebido: danoFinal,
              salvou,
              condicoes: [],
              descricaoEfeito: isNat1
                ? `${realNome}: 💥 FALHA CRÍTICA! Dano dobrado (${danoFinal})`
                : isNat20
                  ? `${realNome}: 🛡️ SUCESSO CRÍTICO! Nenhum dano`
                  : salvou
                    ? `${realNome}: Salvou! Metade do dano (${danoFinal})`
                    : `${realNome}: Falhou! Dano total (${danoFinal})`,
            });

            sentPerTargetMessages = true;
            const { data: authData } = await supabase.auth.getUser();
            const profileName = authData.user?.user_metadata?.full_name || authData.user?.email?.split('@')[0] || 'Mestre';
            const saveLabel = spellExecution.salvacao.charAt(0).toUpperCase() + spellExecution.salvacao.slice(1).toLowerCase();
            const saveSign = saveBonus >= 0 ? '+' : '';
            const resultLabel = isNat1 ? '💥 FALHA CRÍTICA' : isNat20 ? '🛡️ SUCESSO CRÍTICO' : totalWithBonus >= cd ? '✅ Sucesso' : '❌ Falha';
            await supabase.from('chat_messages').insert({
              campaign_id: campaignId,
              user_name: profileName,
              sender_id: authData.user?.id ?? null,
              receiver_id: null,
              text: [
                `🎲 Teste de Resistência — ${spellExecution.spellName}`,
                `**Alvo:** ${realNome}`,
                `**${saveLabel}:** d20 **${naturalRoll}** ${saveSign}${saveBonus} = **${totalWithBonus}** vs CD **${cd}** — ${resultLabel}`,
                `**Dano recebido:** ${danoFinal} PV`,
              ].join('\n'),
              is_roll: true,
              is_secret: false,
              channel: 'campanha',
              dice_type: 'd20',
              roll_values: [naturalRoll],
              final_value: totalWithBonus,
            });
          }
        } else {
          for (const token of preview.atingidos) {
            const realNome = resolvedTokens.get(token.id)?.nome || token.nome;
            resultados.push({
              tokenId: token.id,
              danoRecebido: danoTotal,
              salvou: false,
              condicoes: [],
              descricaoEfeito: `${realNome} recebeu ${danoTotal} de dano`,
            });
          }
        }
      } else {
        for (const token of preview.atingidos) {
          const realNome = resolvedTokens.get(token.id)?.nome || token.nome;
          resultados.push({
            tokenId: token.id,
            danoRecebido: 0,
            salvou: false,
            condicoes: [],
            descricaoEfeito: `${realNome}: ${spellExecution.efeitoPrincipal || spellExecution.beneficioConcedido || spellExecution.restricaoConcedida || spellExecution.descricao || "Efeito sem dano."}`,
          });
        }
      }

      const animacao = criarAnimacaoSpell({
        ...spellExecution,
        areaRaio: areaRadiusPx,
      });

      if (!sentPerTargetMessages) {
        await salvarCastDoChatLog(
          spellExecution, 
          resultados, 
          healing ? "cura" : spellExecution.danoRolagem ? "dano" : "efeito", 
          resolvedTokens,
          rollTotalCache,
          danoRolls
        );
      }

      setRecentCasts((prev) => [...prev, { spell: spellExecution, time: Date.now() }].slice(-10));

      await supabase
        .channel(`spell-effects-${campaignId}`)
        .send({
          type: "broadcast",
          event: "spell-cast",
          payload: {
            spell: spellExecution,
            resultados,
            animacao,
            timestamp: Date.now(),
          },
        });

      setPreviewArea(null);
      setHoverPoint(null);

      for (const alvo of preview.atingidos) {
        const cond = resultados.find((r) => r.tokenId === alvo.id)?.condicoes ?? [];
        const efeitos = efeitosDaMagia(spell, cond);
        if (efeitos.length === 0) continue;
        const tk = tokens.find((t) => t.id === alvo.id);
        if (!tk) continue;
        if (tk.characterId) void addEffectsToCharacter(tk.characterId, efeitos).catch(() => {});
        else void addEffectsToMonsterToken(tk.id, efeitos).catch(() => {});
      }

      onSpellCast?.(resultados);
      onClose();
    } catch (err) {
      console.error("❌ Erro ao executar magia:", err);
    } finally {
      setLoading(false);
    }
  }, [buildPreview, casterLevel, casterModificador, casterPoint, campaignId, excludedIds, gridSize, gridUnit, gridValue, isHealingSpell, onClose, onSpellCast, spell, supabase, tokens]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!spell || !isOpen) return;
    const point = getMousePoint(e);
    setHoverPoint(point);
    setPreviewArea(point ? buildPreview(point) : null);
  }, [buildPreview, getMousePoint, isOpen, spell]);

  const handleClick = useCallback(() => {
    if (!hoverPoint) return;
    void executeSpell(hoverPoint);
  }, [executeSpell, hoverPoint]);

  if (!isOpen || !spell) return null;

  const formatoLabel = ((spell as any).formato || "").toString().toLowerCase();
  const areaLabel = formatoLabel
    ? `${formatoLabel}${spell.areaTexto ? ` (${spell.areaTexto})` : ""}`
    : (spell.areaTexto || "Alvo único");
  const rangeLabel = spell.alcanceTexto || "Sem alcance definido";
  const previewColor = previewArea?.inRange ? "border-gray-300 bg-gray-500/20" : "border-red-400 bg-red-500/20";

  return (
    <div className="absolute inset-0 z-[120] bg-black/55 backdrop-blur-[2px]">
      <div className="absolute right-4 top-4 z-[121] flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white/75">
        {formatoLabel.includes("aura") ? (
          <Shield className="h-4 w-4 text-[#00ff66]" />
        ) : formatoLabel.includes("linha") || formatoLabel.includes("line") ? (
          <ArrowRight className="h-4 w-4 text-[#00ff66]" />
        ) : formatoLabel.includes("cubo") || formatoLabel.includes("quadrado") ? (
          <Square className="h-4 w-4 text-[#00ff66]" />
        ) : formatoLabel.includes("alvo") || formatoLabel === "" ? (
          <Crosshair className="h-4 w-4 text-[#00ff66]" />
        ) : (
          <Circle className="h-4 w-4 text-[#00ff66]" />
        )}
        {spell.spellName}
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-md border border-white/10 px-2 py-1 text-white/50 hover:border-[#00ff66]/40 hover:text-[#00ff66]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {previewArea && previewArea.inRange && previewArea.atingidos.length > 0 && (
        <div className="absolute right-4 top-16 z-[121] w-64 rounded-2xl border border-white/10 bg-black/85 p-3 shadow-[0_0_24px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-[#00ff66]">
            <span>No alcance</span>
            <span>{previewArea.atingidos.filter((t) => !excludedIds.has(t.id)).length}/{previewArea.atingidos.length}</span>
          </div>
          
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => setExcludedIds(new Set())}
              className="flex-1 rounded border border-white/20 bg-white/5 py-1 text-[9px] uppercase text-white hover:bg-white/10 transition-colors"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setExcludedIds(new Set(previewArea.atingidos.map(t => t.id)))}
              className="flex-1 rounded border border-white/20 bg-white/5 py-1 text-[9px] uppercase text-white hover:bg-white/10 transition-colors"
            >
              Nenhum
            </button>
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {previewArea.atingidos.map((t) => {
              const sel = !excludedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExcludedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    return next;
                  })}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${sel ? "border-[#00ff66]/40 bg-[#00ff66]/10 text-white" : "border-white/10 text-white/40"}`}
                >
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${sel ? "border-[#00ff66] bg-[#00ff66] text-black" : "border-white/30"}`}>
                    {sel && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="truncate">{t.nome}</span>
                  <span className="ml-auto opacity-60 text-[10px]">
                    {t.pvAtuais !== undefined ? `${t.pvAtuais}/${t.pvMax}` : '?'} PV
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[9px] leading-tight text-white/40">
            Clique nos nomes para incluir/excluir • clique no mapa para lançar
          </div>
        </div>
      )}

      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        <div className="absolute left-4 top-4 z-[121] rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] font-bold text-white/75 shadow-[0_0_24px_rgba(0,0,0,0.5)]">
          <div>Alcance: {rangeLabel}</div>
          <div>Área: {areaLabel}</div>
          {spell.salvacao && (
             <div className="text-yellow-300">
               CD {spell.cdSalvacao || "Calc"} ({spell.salvacao})
             </div>
          )}
          <div className={previewArea?.inRange ? "text-gray-200 mt-1" : "text-red-300 mt-1"}>
            {previewArea?.inRange ? "Dentro do alcance" : "Fora do alcance"}
          </div>
        </div>

        {previewArea && (
          (() => {
            const formatoTexto = ((spell as any).formato || "").toString().toLowerCase();
            const areaTextoStr = (spell.areaTexto || "").toLowerCase();
            const alcanceTextoStr = (spell.alcanceTexto || "").toLowerCase();
            const shapeText = formatoTexto || areaTextoStr;

            const isPessoal = alcanceTextoStr.includes("pessoal") || alcanceTextoStr.includes("self");
            const isToque = alcanceTextoStr.includes("toque") || alcanceTextoStr.includes("touch");
            const isAura = shapeText.includes("aura");
            const isCube = shapeText.includes("cubo") || shapeText.includes("quadrado") || shapeText.includes("caixa");
            const isLine = shapeText.includes("linha") || shapeText.includes("line");
            const isCircle = shapeText.includes("circulo") || shapeText.includes("círculo") || shapeText.includes("esfera");
            const isAlvo = !isAura && !isCube && !isLine && !isCircle && (formatoTexto === "" || shapeText.includes("alvo") || shapeText.includes("único") || shapeText.includes("unico"));

            if (isPessoal && !isAura && !isCircle) {
              return (
                <div className="absolute pointer-events-none" style={{ left: previewArea.x - 12, top: previewArea.y - 12 }}>
                  <Shield className={`h-6 w-6 ${previewArea.inRange ? "text-[#00ff66]" : "text-red-400"}`} />
                  {previewArea.atingidos.length > 0 && (
                    <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                      {previewArea.atingidos[0].nome} (você)
                    </div>
                  )}
                </div>
              );
            }

            if (isCube) {
              const size = previewArea.raioPreview * 2;
              return (
                <div className="absolute pointer-events-none" style={{ left: previewArea.x - size / 2, top: previewArea.y - size / 2 }}>
                  <div className={`border-2 border-dashed ${previewColor.replace('rounded-full','')}`} style={{ width: size, height: size }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Square className={`h-6 w-6 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                  </div>
                  <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                    {previewArea.atingidos.length} alvo(s)
                  </div>
                </div>
              );
            }

            if (isLine && casterPoint && hoverPoint) {
              const dx = hoverPoint.x - casterPoint.x;
              const dy = hoverPoint.y - casterPoint.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const thickness = gridSize;
              return (
                <div className="absolute pointer-events-none" style={{ left: casterPoint.x, top: casterPoint.y }}>
                  <div
                    className={`border-2 border-dashed ${previewColor} origin-left`}
                    style={{
                      width: length,
                      height: thickness,
                      transform: `translateY(${ -thickness/2 }px) rotate(${angle}deg)`,
                    }}
                  />
                  <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className={`h-6 w-6 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                  </div>
                  <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                    {previewArea.atingidos.length} alvo(s)
                  </div>
                </div>
              );
            }

            if (isAlvo) {
              return (
                <div className="absolute pointer-events-none" style={{ left: previewArea.x - 12, top: previewArea.y - 12 }}>
                  <Crosshair className={`h-6 w-6 ${previewArea.inRange ? "text-[#00ff66]" : "text-red-400"}`} />
                  {previewArea.atingidos.length > 0 && (
                    <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                      {previewArea.atingidos[0].nome}
                    </div>
                  )}
                </div>
              );
            }

            const size = previewArea.raioPreview * 2;
            const left = previewArea.x - previewArea.raioPreview;
            const top = previewArea.y - previewArea.raioPreview;
            return (
              <div className="absolute pointer-events-none" style={{ left, top }}>
                <div
                  className={`border-2 border-dashed rounded-full ${previewColor}`}
                  style={{
                    width: size,
                    height: size,
                  }}
                />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  {isAura ? (
                    <Shield className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                  ) : (
                    <Circle className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                  )}
                </div>

                <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                  {previewArea.atingidos.length} alvo(s)
                </div>
              </div>
            );
          })()
        )}

        {recentCasts.length > 0 && (
          <div className="absolute bottom-4 right-4 space-y-1 text-xs text-gray-400">
            {recentCasts.slice(-3).map((cast, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#0a1a0a] px-2 py-1 rounded border border-gray-700">
                <Zap className="w-3 h-3 text-[#00ff66]" />
                <span>{cast.spell.spellName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto animate-spin text-[#00ff66] mb-2" />
            <p className="text-[#00ff66]">Executando magia...</p>
          </div>
        </div>
      )}
    </div>
  );
}