"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  aplicarEfeitoMagia,
  criarAnimacaoSpell,
  EffectResult,
  SpellExecution,
} from "@/utils/spell-executor";
import { Zap, Trash2, Eye } from "lucide-react";

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
  campaignId: string;
  mapWidth: number;
  mapHeight: number;
  tokens: Token[];
  casterLevel: number;
  casterModificador: number;
  onSpellCast?: (resultado: EffectResult[]) => void;
}

interface SpellPreview {
  spell: SpellExecution;
  posicao: { x: number; y: number };
  raioPreview: number;
  atingidos: Token[];
}

export default function SpellCaster({
  campaignId,
  mapWidth,
  mapHeight,
  tokens,
  casterLevel,
  casterModificador,
}: SpellCasterProps) {
  const supabase = createClient();

  const [activeDragSpell, setActiveDragSpell] = useState<SpellExecution | null>(null);
  const [previewArea, setPreviewArea] = useState<SpellPreview | null>(null);
  const [recentCasts, setRecentCasts] = useState<Array<{ spell: SpellExecution; time: number }>>([]);
  const [loading, setLoading] = useState(false);

  // Handler para drop da magia na mesa
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    if (!activeDragSpell) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calcular raio da magia
    const raioPreview = Math.sqrt(activeDragSpell.areaRaio || 15);

    // Detectar tokens atingidos
    const atingidos = tokens.filter((token) => {
      const distancia = Math.sqrt(
        Math.pow(token.x - x, 2) + Math.pow(token.y - y, 2)
      );
      return distancia <= raioPreview + token.raio;
    });

    setPreviewArea({
      spell: activeDragSpell,
      posicao: { x, y },
      raioPreview,
      atingidos,
    });
  }, [activeDragSpell, tokens]);

  const handleDragLeave = useCallback(() => {
    setPreviewArea(null);
  }, []);

  // EXECUTA A MAGIA
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!activeDragSpell || !previewArea) return;

      try {
        setLoading(true);

        // Resolver efeitos
        const posicaoFinal = previewArea.posicao;
        const tokensPosicoes = tokens.map((t) => ({
          id: t.id,
          x: t.x,
          y: t.y,
          raio: t.raio,
        }));

        const spell = {
          ...activeDragSpell,
          posicao: posicaoFinal,
          casterLevel,
        };

        const resultados = aplicarEfeitoMagia(spell, tokensPosicoes, casterModificador);

        // Animação de efeito visual
        const animacao = criarAnimacaoSpell(spell);
        console.log("🎨 Animação:", animacao);

        // Salvar no chat/log da campanha
        await salvarCastDoChatLog(spell, resultados);

        // Aplicar dano aos tokens
        for (const resultado of resultados) {
          await aplicarDanoAoToken(resultado.tokenId, resultado.danoRecebido);
        }

        // Atualizar histórico
        setRecentCasts((prev) => [
          ...prev,
          { spell, time: Date.now() },
        ].slice(-10));

        // Broadcast para outros jogadores (realtime)
        await supabase
          .channel(`spell-effects-${campaignId}`)
          .send({
            type: "broadcast",
            event: "spell-cast",
            payload: {
              spell,
              resultados,
              animacao,
              timestamp: Date.now(),
            },
          });

        setActiveDragSpell(null);
        setPreviewArea(null);
      } catch (err) {
        console.error("❌ Erro ao executar magia:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeDragSpell, previewArea, tokens, casterLevel, casterModificador, campaignId, supabase]
  );

  const salvarCastDoChatLog = async (spell: SpellExecution, resultados: EffectResult[]) => {
    const mensagem = `
🔮 **${spell.spellName}** foi lançada!
📍 Posição: (${spell.posicao?.x}, ${spell.posicao?.y})
🎯 Atingidos: ${resultados.length} alvo(s)

${resultados
  .map(
    (r) =>
      `• **${r.tokenId}**: ${r.danoRecebido} de dano${r.salvou ? " (salvação bem-sucedida)" : ""}`
  )
  .join("\n")}
    `.trim();

    await supabase.from("chat_messages").insert({
      campaign_id: campaignId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      message: mensagem,
      is_system: true,
      created_at: new Date().toISOString(),
    });
  };

  const aplicarDanoAoToken = async (tokenId: string, dano: number) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const novosPVs = Math.max(0, (token.pvAtuais || token.pvMax || 0) - dano);
    const tokenData = JSON.parse(
      await supabase
        .from("campaign_tokens")
        .select("data")
        .eq("id", tokenId)
        .single()
        .then((r) => r.data?.data || "{}")
    );

    await supabase
      .from("campaign_tokens")
      .update({
        data: JSON.stringify({ ...tokenData, pvAtuais: novosPVs }),
      })
      .eq("id", tokenId);
  };

  // Visualização de preview da área
  return (
    <div className="relative w-full h-full bg-[#050a05]">
      {/* Canvas de mesa */}
      <div
        className="w-full h-full relative border border-[#00ff66]/20 overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Preview da área de efeito */}
        {previewArea && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: previewArea.posicao.x - previewArea.raioPreview,
              top: previewArea.posicao.y - previewArea.raioPreview,
            }}
          >
            {/* Círculo de preview */}
            <div
              className="border-2 border-dashed border-[#00ff66] rounded-full bg-[#00ff66]/10"
              style={{
                width: previewArea.raioPreview * 2,
                height: previewArea.raioPreview * 2,
              }}
            />

            {/* Ícone da magia no centro */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            >
              <Zap className="w-6 h-6 text-[#00ff66] drop-shadow-glow" />
            </div>

            {/* Label de atingidos */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-[#00ff66] bg-[#050a05] px-2 py-1 rounded">
              {previewArea.atingidos.length} alvo(s)
            </div>
          </div>
        )}

        {/* Histórico de castings (últimas 10) */}
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

      {/* Status */}
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
