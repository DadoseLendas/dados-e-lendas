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
} from "@/utils/spell-executor";
import { Zap, X } from "lucide-react";

interface Token {
  id: string;
  x: number;
  y: number;
  raio: number;
  nome: string;
  pvAtuais?: number;
  pvMax?: number;
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
  onClose: () => void;
  onSpellCast?: (resultado: EffectResult[]) => void;
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
  onClose,
  onSpellCast,
}: SpellCasterProps) {
  const supabase = createClient();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // defensive defaults shared across functions
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

  const getMousePoint = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [gridSize]);

  const buildPreview = useCallback((point: { x: number; y: number }) => {
    if (!spell || !casterPoint) return null;

    const formatoTexto = ((spell as any).formato || "").toString().toLowerCase();

    const areaUnits =
      parseDistanciaTexto(spell.areaTexto || null, gridUnit) ??
      (spell.areaRaio ? (spell.areaRaio / gs) * gv : null);

    const rangeUnitsParsed = parseDistanciaTexto(spell.alcanceTexto || null, gridUnit);

    const distanceFromCasterPx = Math.sqrt(
      Math.pow(point.x - casterPoint.x, 2) + Math.pow(point.y - casterPoint.y, 2)
    );

    // distance in map units (meters or feet) using grid conversion
    const distanceFromCasterUnits = (distanceFromCasterPx / gs) * gv;

    // Helpers
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

    // Determine shape
    const isAura = formatoTexto.includes("aura");
    const isCube = formatoTexto.includes("cubo") || formatoTexto.includes("quadrado") || formatoTexto.includes("caixa");
    const isLine = formatoTexto.includes("linha") || formatoTexto.includes("line") || formatoTexto.includes("raio");
    const isCircle = formatoTexto.includes("circulo") || formatoTexto.includes("círculo") || formatoTexto === "";

    // Aura: centered on caster
    if (isAura) {
      if (!casterPoint) return null;
      const raioPreview = areaUnits == null ? gridSize * 1.5 : (areaUnits / gridValue) * gridSize;
      const atingidos = tokens.filter((token) => {
        const distancia = Math.sqrt(Math.pow(token.x - casterPoint.x, 2) + Math.pow(token.y - casterPoint.y, 2));
        return distancia <= token.raio + raioPreview;
      });
      return { x: casterPoint.x, y: casterPoint.y, raioPreview, inRange: true, atingidos };
    }

    // For other shapes compute inRange based on distance (in units) from caster to the target point
    const inRange = rangeUnitsParsed == null ? true : distanceFromCasterUnits <= rangeUnitsParsed;

    // Circle (default)
    if (isCircle || areaUnits == null) {
      const raioPreview = areaUnits == null ? gs * 1.5 : (areaUnits / gv) * gs;
      const atingidos = areaUnits == null
        ? tokens.filter((token) => {
            const distancia = Math.sqrt(Math.pow(token.x - point.x, 2) + Math.pow(token.y - point.y, 2));
            return distancia <= token.raio + gs * 0.35;
          })
        : detectarTokensNaArea(tokens.map((t) => ({ id: t.id, x: t.x, y: t.y, raio: t.raio })), point, raioPreview).map((tokenId) => tokens.find((t) => t.id === tokenId)).filter(Boolean) as Token[];

      return { x: point.x, y: point.y, raioPreview, inRange, atingidos };
    }

    // Cube / square
    if (isCube) {
      if (areaUnits == null) return null;
      const sidePx = (areaUnits / gv) * gs; // side in px
      const halfSide = sidePx / 2;
      const atingidos = tokens.filter((token) => isPointInsideSquare(token.x, token.y, point.x, point.y, halfSide + token.raio));
      return { x: point.x, y: point.y, raioPreview: halfSide, inRange, atingidos };
    }

    // Line / ray
    if (isLine) {
      if (!casterPoint) return null;
      const lengthPx = Math.sqrt(Math.pow(point.x - casterPoint.x, 2) + Math.pow(point.y - casterPoint.y, 2));
      const widthPx = gs; // one square thick by default
      const atingidos = tokens.filter((token) => {
        const distToSeg = pointToSegmentDistance(token.x, token.y, casterPoint.x, casterPoint.y, point.x, point.y);
        return distToSeg <= token.raio + widthPx / 2;
      });
      return { x: (casterPoint.x + point.x) / 2, y: (casterPoint.y + point.y) / 2, raioPreview: lengthPx / 2, inRange, atingidos };
    }

    // Fallback to circular
    const raioPreview = areaUnits == null ? gs * 1.5 : (areaUnits / gv) * gs;
    const atingidos = detectarTokensNaArea(tokens.map((t) => ({ id: t.id, x: t.x, y: t.y, raio: t.raio })), point, raioPreview).map((tokenId) => tokens.find((t) => t.id === tokenId)).filter(Boolean) as Token[];
    return { x: point.x, y: point.y, raioPreview, inRange, atingidos };
  }, [casterPoint, gridSize, gridUnit, gridValue, spell, tokens]);

  useEffect(() => {
    if (!isOpen) {
      setHoverPoint(null);
      setPreviewArea(null);
    }
  }, [isOpen]);

  const atualizarPVsToken = async (tokenId: string, deltaPV: number) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const { data, error } = await supabase
      .from("campaign_tokens")
      .select("data")
      .eq("id", tokenId)
      .single();

    if (error) {
      console.error("Erro ao buscar dados do token:", error);
      return;
    }

    const currentData = typeof data?.data === "string"
      ? JSON.parse(data.data || "{}")
      : (data?.data || {});

    const currentPV = Number(token.pvAtuais ?? currentData.pvAtuais ?? token.pvMax ?? currentData.pvMax ?? 0);
    const maxPV = Number(token.pvMax ?? currentData.pvMax ?? currentPV);
    const nextPV = Math.max(0, Math.min(maxPV || 0, currentPV + deltaPV));

    await supabase
      .from("campaign_tokens")
      .update({
        data: JSON.stringify({
          ...currentData,
          pvAtuais: nextPV,
          pvMax: maxPV,
        }),
      })
      .eq("id", tokenId);

  };

  const salvarCastDoChatLog = async (spellToLog: SpellExecution, resultados: EffectResult[], kind: "dano" | "cura" | "efeito") => {
    const linhas = resultados.map((resultado) => {
      if (kind === "cura") {
        return `• **${resultado.tokenId}**: curou ${Math.abs(resultado.danoRecebido)} PV`;
      }
      return `• **${resultado.tokenId}**: ${resultado.danoRecebido} de dano${resultado.salvou ? " (salvação bem-sucedida)" : ""}`;
    });

    const mensagem = `
🔮 **${spellToLog.spellName}** foi lançada!
📍 Posição: (${Math.round(spellToLog.posicao?.x || 0)}, ${Math.round(spellToLog.posicao?.y || 0)})
${spellToLog.alcanceTexto ? `📏 Alcance: ${spellToLog.alcanceTexto}\n` : ""}
${spellToLog.areaTexto ? `🟢 Área: ${spellToLog.areaTexto}\n` : ""}
${kind === "cura" ? "✨ Tipo: cura\n" : spellToLog.danoRolagem ? `💥 Dano: ${spellToLog.danoRolagem}\n` : ""}
🎯 Atingidos: ${resultados.length} alvo(s)

${linhas.join("\n")}
    `.trim();

    await supabase.from("chat_messages").insert({
      campaign_id: campaignId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      message: mensagem,
      is_system: true,
      created_at: new Date().toISOString(),
    });
  };

  const executeSpell = useCallback(async (point: { x: number; y: number }) => {
    if (!spell || !casterPoint) return;

    const preview = buildPreview(point);
    if (!preview || !preview.inRange) return;

    try {
      setLoading(true);

      const areaUnits =
        parseDistanciaTexto(spell.areaTexto || null, gridUnit) ??
        (spell.areaRaio ? (spell.areaRaio / gs) * gv : null);
      const areaRadiusPx = areaUnits == null ? gs * 1.5 : (areaUnits / gv) * gs;
      const spellExecution: SpellExecution = {
        ...spell,
        posicao: point,
        casterLevel,
        areaRaio: areaRadiusPx,
      };

      const tokenPositions = tokens.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        raio: t.raio,
      }));

      const healing = isHealingSpell(spellExecution);
      const resultados: EffectResult[] = [];

      if (healing) {
        const healParsed = parsearDano(spellExecution.danoRolagem || null);
        const healAmount = healParsed ? rolarDano(healParsed) : 0;
        for (const token of preview.atingidos) {
          resultados.push({
            tokenId: token.id,
            danoRecebido: -healAmount,
            salvou: false,
            condicoes: [],
            descricaoEfeito: `Cura de ${healAmount} PV`,
          });
          await atualizarPVsToken(token.id, healAmount);
        }
      } else if (spellExecution.danoRolagem) {
        const damageResults = aplicarEfeitoMagia(spellExecution, tokenPositions, casterModificador);
        resultados.push(...damageResults);

        for (const resultado of damageResults) {
          await atualizarPVsToken(resultado.tokenId, -resultado.danoRecebido);
        }
      } else {
        for (const token of preview.atingidos) {
          resultados.push({
            tokenId: token.id,
            danoRecebido: 0,
            salvou: false,
            condicoes: [],
            descricaoEfeito: spellExecution.efeitoPrincipal || spellExecution.beneficioConcedido || spellExecution.restricaoConcedida || spellExecution.descricao || "Efeito sem dano.",
          });
        }
      }

      const animacao = criarAnimacaoSpell({
        ...spellExecution,
        areaRaio: areaRadiusPx,
      });

      await salvarCastDoChatLog(spellExecution, resultados, healing ? "cura" : spellExecution.danoRolagem ? "dano" : "efeito");

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
      onSpellCast?.(resultados);
      onClose();
    } catch (err) {
      console.error("❌ Erro ao executar magia:", err);
    } finally {
      setLoading(false);
    }
  }, [buildPreview, casterLevel, casterModificador, casterPoint, campaignId, gridSize, gridUnit, gridValue, isHealingSpell, onClose, onSpellCast, spell, supabase, tokens]);

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

  const areaLabel = spell.areaTexto || (spell.areaRaio ? `${spell.areaRaio}px` : "Alvo");
  const rangeLabel = spell.alcanceTexto || "Sem alcance definido";
  const previewColor = previewArea?.inRange ? "border-gray-300 bg-gray-500/20" : "border-red-400 bg-red-500/20";

  return (
    <div className="absolute inset-0 z-[120] bg-black/55 backdrop-blur-[2px]">
      <div className="absolute right-4 top-4 z-[121] flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white/75">
        <Zap className="h-4 w-4 text-[#00ff66]" />
        {spell.spellName}
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-md border border-white/10 px-2 py-1 text-white/50 hover:border-[#00ff66]/40 hover:text-[#00ff66]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

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
          <div className={previewArea?.inRange ? "text-gray-200" : "text-red-300"}>
            {previewArea?.inRange ? "Dentro do alcance" : "Fora do alcance"}
          </div>
        </div>

        {previewArea && (
          (() => {
            const formatoTexto = ((spell as any).formato || "").toString().toLowerCase();
            const isCube = formatoTexto.includes("cubo") || formatoTexto.includes("quadrado") || formatoTexto.includes("caixa");
            const isLine = formatoTexto.includes("linha") || formatoTexto.includes("line") || formatoTexto.includes("raio");
            const isAura = formatoTexto.includes("aura");

            if (isCube) {
              const size = previewArea.raioPreview * 2; // here raioPreview is halfSide
              return (
                <div className="absolute pointer-events-none" style={{ left: previewArea.x - size / 2, top: previewArea.y - size / 2 }}>
                  <div className={`border-2 border-dashed ${previewColor.replace('rounded-full','')}`} style={{ width: size, height: size }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Zap className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
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
                    <Zap className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                  </div>
                  <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                    {previewArea.atingidos.length} alvo(s)
                  </div>
                </div>
              );
            }

            // Circle / Aura / Fallback
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
                  <Zap className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
                </div>

                <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
                  {previewArea.atingidos.length} alvo(s)
                </div>
              </div>
            );
          })()
        )}

        {/* Histórico */}
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
