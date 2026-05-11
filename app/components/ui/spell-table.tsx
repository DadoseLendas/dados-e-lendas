"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Search,
  Wand2,
  Zap,
  Shield,
  Target,
  Clock,
  RotateCw,
  Eye,
  Trash2,
  Filter,
  ChevronDown,
  Info,
  Copy,
} from "lucide-react";

interface SpellData {
  id?: number;
  slug?: string;
  nome: string;
  escola: string;
  nivel_magia: number;
  tempo_conjuracao: string;
  alcance: string;
  componentes: string;
  duracao: string;
  material?: string | null;
  descricao: string;
  escala_por_nivel?: string | null;
  dano?: string | null;
  area?: string | null;
  formato?: string | null;
  efeito?: string | null;
  rolagem?: string | null;
  tipo_alvo?: string | null;
  salvacao?: string | null;
  eh_concentracao?: boolean;
  requisitos_rituais?: boolean;
  // Campos adicionais do banco
  classes_disponivel?: string | string[] | null;
  categoria_magia?: string | null;
  efeito_principal?: string | null;
  beneficio_concedido?: string | null;
  restricao_concedida?: string | null;
  transforma_em?: string | null;
  movimento_concedido?: string | null;
  protecao_concedida?: string | null;
  condicoes_aplicadas?: string | string[] | null;
  palavras_chave?: string | string[] | null;
  cd_salvacao?: string | number | null;
  tipo_dano?: string | null;
  tipo_ataque?: string | null;
}

interface SpellTableProps {
  characterLevel?: number;
  characterClass?: string;
  isEditable?: boolean;
  selectedSpells?: string[];
  onSpellDrag?: (spell: SpellData) => void;
  onSpellClick?: (spell: SpellData) => void;
}

// Mapeamento de cores por escola de magia
const schoolColors: Record<string, string> = {
  abjuração: "bg-purple-900/30 border-purple-500",
  adivinhação: "bg-blue-900/30 border-blue-500",
  conjuração: "bg-green-900/30 border-green-500",
  encantamento: "bg-red-900/30 border-red-500",
  evocação: "bg-orange-900/30 border-orange-500",
  ilusão: "bg-pink-900/30 border-pink-500",
  necromancia: "bg-gray-900/30 border-gray-500",
  transmutação: "bg-yellow-900/30 border-yellow-500",
};

const schoolIcons: Record<string, string> = {
  abjuração: "🛡️",
  adivinhação: "🔮",
  conjuração: "✨",
  encantamento: "💕",
  evocação: "⚡",
  ilusão: "👁️",
  necromancia: "💀",
  transmutação: "🌀",
};

// Parse simples de dano: extrai expressão de dados (ex: 2d6+3) e tipo (ex: fire)
function parseDamage(dano?: string | null) {
  if (!dano) return null;
  // procura padrão dice como 1d6, 2d8+3, etc.
  const diceMatch = dano.match(/\d+d\d+(?:[+-]\d+)?/i);
  const dice = diceMatch ? diceMatch[0] : null;
  // resto após a expressão de dice: tipo de dano (fire, cold, etc.) ou texto
  let type = dano;
  if (dice) type = dano.replace(dice, "").trim();
  type = type.replace(/^[\-:\(\)\s]+|[\-:\(\)\s]+$/g, "");
  return { dice, type: type || null };
}

export default function SpellTable({
  characterLevel = 1,
  characterClass = "Mago",
  isEditable = false,
  selectedSpells = [],
  onSpellDrag,
  onSpellClick,
}: SpellTableProps) {
  const supabase = createClient();

  const [spells, setSpells] = useState<SpellData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
  const [draggingSpell, setDraggingSpell] = useState<SpellData | null>(null);

  // Carregar magias do Supabase
  const loadSpells = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("spell_catalog")
        .select(
          `id, slug, nome, escola, nivel_magia, tempo_conjuracao, alcance, 
           componentes, duracao, material, descricao, escala_por_nivel, 
           dano, area, formato, efeito, rolagem, tipo_alvo, salvacao, 
           eh_concentracao, requisitos_rituais,
           classes_disponivel, categoria_magia, efeito_principal,
           beneficio_concedido, restricao_concedida, transforma_em,
           movimento_concedido, protecao_concedida, condicoes_aplicadas,
           palavras_chave, cd_salvacao, tipo_dano, tipo_ataque`
        )
        .order("nivel_magia", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;
      setSpells(data || []);
    } catch (err) {
      console.error("Erro ao carregar magias:", err);
      setSpells([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Carregar magias ao montar
  useEffect(() => {
    loadSpells();
  }, [loadSpells]);

  // Filtrar magias baseado em busca, escola e nível
  const filteredSpells = useMemo(() => {
    return spells.filter((spell) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        spell.nome.toLowerCase().includes(q) ||
        (spell.descricao || "").toLowerCase().includes(q) ||
        (spell.dano || "").toLowerCase().includes(q) ||
        (spell.area || "").toLowerCase().includes(q) ||
        (spell.alcance || "").toLowerCase().includes(q) ||
        (spell.duracao || "").toLowerCase().includes(q) ||
        (spell.salvacao || "").toLowerCase().includes(q);
      const matchesSchool = selectedSchool === null || spell.escola === selectedSchool;
      const matchesLevel = selectedLevel === null || spell.nivel_magia === selectedLevel;
      return matchesSearch && matchesSchool && matchesLevel;
    });
  }, [spells, search, selectedSchool, selectedLevel]);

  // Escolas únicas
  const schools = useMemo(() => [...new Set(spells.map((s) => s.escola))].sort(), [spells]);

  // Níveis únicos
  const levels = useMemo(
    () =>
      [...new Set(spells.map((s) => s.nivel_magia))]
        .sort((a, b) => a - b)
        .filter((l) => l <= characterLevel + 1),
    [spells, characterLevel]
  );

  const handleDragStart = (spell: SpellData) => {
    setDraggingSpell(spell);
    // Preparar dados para drag-drop em JSON
    const spellData = {
      spellName: spell.nome,
      danoRolagem: spell.dano || null,
      areaRaio: spell.area ? 20 : null, // Aproximado: 20 pés por padrão
      areaFormato: spell.formato || null,
      tipoAlvo: spell.tipo_alvo || "criatura",
      salvacao: spell.salvacao || null,
      casterLevel: 3,
      ehConcentracao: spell.eh_concentracao || false,
    };
    // Enviar via dataTransfer para que qualquer elemento possa receber
    const event = new DragEvent('dummy', { bubbles: true });
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify(spellData));
    }
    if (onSpellDrag) onSpellDrag(spell);
  };

  const handleDragEnd = () => {
    setDraggingSpell(null);
  };

  const toggleSpellDetails = (spellName: string) => {
    setExpandedSpell(expandedSpell === spellName ? null : spellName);
  };

  const copySpellToClipboard = (spell: SpellData) => {
    const text = `
**${spell.nome}** (${spell.escola.toUpperCase()})
Nível: ${spell.nivel_magia}
Tempo: ${spell.tempo_conjuracao} | Alcance: ${spell.alcance}
Duração: ${spell.duracao}
${spell.eh_concentracao ? "⚡ Requer Concentração" : ""}
${spell.salvacao ? `💾 Salvação: ${spell.salvacao}` : ""}
${spell.dano ? `🔥 Dano: ${spell.dano}` : ""}
${spell.area ? `📐 Área: ${spell.area}` : ""}
${spell.formato ? `🎯 Formato: ${spell.formato}` : ""}

${spell.descricao}
${spell.efeito ? `\n**Efeito Mecânico**: ${spell.efeito}` : ""}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Wand2 className="w-12 h-12 mx-auto mb-2 animate-spin text-[#00ff66]" />
          <p className="text-gray-400">Carregando Grimório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#050a05] border border-[#00ff66]/30 rounded-lg p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-6 h-6 text-[#00ff66]" />
          <h2 className="text-2xl font-bold text-[#00ff66]">Grimório de Magias</h2>
          <span className="text-xs bg-[#00ff66]/20 text-[#00ff66] px-2 py-1 rounded">
            {filteredSpells.length} magias
          </span>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar magia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#050a05] border border-[#00ff66]/30 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff66]"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Escola</label>
            <select
              value={selectedSchool || ""}
              onChange={(e) => setSelectedSchool(e.target.value || null)}
              className="px-3 py-1 bg-[#0a1a0a] border border-[#00ff66]/30 rounded text-sm text-white focus:outline-none focus:border-[#00ff66]"
            >
              <option value="">Todas</option>
              {schools.map((school) => (
                <option key={school} value={school}>
                  {schoolIcons[school] || ""} {school}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Nível</label>
            <select
              value={selectedLevel ?? ""}
              onChange={(e) => setSelectedLevel(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1 bg-[#0a1a0a] border border-[#00ff66]/30 rounded text-sm text-white focus:outline-none focus:border-[#00ff66]"
            >
              <option value="">Todos</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  Nível {level}
                </option>
              ))}
            </select>
          </div>

          {selectedSchool && (
            <button
              onClick={() => setSelectedSchool(null)}
              className="px-3 py-1 text-xs bg-red-900/30 border border-red-500 rounded text-red-300 hover:bg-red-900/50"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Magias */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSpells.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma magia encontrada com os filtros selecionados.
          </div>
        ) : (
          filteredSpells.map((spell) => (
            <div
              key={spell.slug || spell.nome}
              draggable
              onDragStart={(e) => {
                handleDragStart(spell);
                const spellData = {
                  spellName: spell.nome,
                  danoRolagem: spell.dano || null,
                  areaRaio: spell.area ? 20 : null,
                  areaFormato: spell.formato || null,
                  tipoAlvo: spell.tipo_alvo || "criatura",
                  salvacao: spell.salvacao || null,
                  casterLevel: 3,
                  ehConcentracao: spell.eh_concentracao || false,
                };
                e.dataTransfer?.setData('application/json', JSON.stringify(spellData));
              }}
              onDragEnd={handleDragEnd}
              className={`p-3 border rounded cursor-move transition-all ${
                schoolColors[spell.escola] || "bg-gray-900/30 border-gray-500"
              } ${draggingSpell?.nome === spell.nome ? "opacity-50 scale-95" : ""}`}
            >
              {/* Linha da magia */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Ícone da Escola */}
                  <span className="text-xl">{schoolIcons[spell.escola] || "✨"}</span>

                  {/* Nome e Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#00ff66] text-sm truncate">{spell.nome}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      {spell.nivel_magia === 0 ? (
                        <span className="bg-blue-500/20 px-1 rounded">Truque</span>
                      ) : (
                        <span className="bg-purple-500/20 px-1 rounded">Nível {spell.nivel_magia}</span>
                      )}
                        <span>{spell.tempo_conjuracao}</span>
                        <span>{spell.alcance}</span>
                        <span>{spell.duracao}</span>
                        {spell.salvacao && <span className="px-1 rounded bg-[#002233]/20">Salv: {spell.salvacao}</span>}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {spell.dano && (() => {
                    const parsed = parseDamage(spell.dano);
                    return (
                      <span className="text-xs bg-red-500/20 px-2 py-1 rounded text-red-300 flex items-center gap-2" title={spell.dano}>
                        <strong className="text-sm">{parsed?.dice || spell.dano}</strong>
                        {parsed?.type && <span className="text-[10px] text-red-200">{parsed.type}</span>}
                      </span>
                    );
                  })()}
                  {spell.eh_concentracao && (
                    <span title="Requer Concentração">
                      <RotateCw className="w-4 h-4 text-yellow-400" />
                    </span>
                  )}
                  {spell.salvacao && (
                    <span title={`Salvação: ${spell.salvacao}`}>
                      <Shield className="w-4 h-4 text-blue-400" />
                    </span>
                  )}

                  <button
                    onClick={() => toggleSpellDetails(spell.nome)}
                    className="p-1 hover:bg-[#00ff66]/10 rounded"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-[#00ff66] transition-transform ${
                        expandedSpell === spell.nome ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => copySpellToClipboard(spell)}
                    className="p-1 hover:bg-[#00ff66]/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-[#00ff66]" />
                  </button>

                  {onSpellClick && (
                    <button
                      onClick={() => onSpellClick(spell)}
                      className="p-1 hover:bg-[#00ff66]/10 rounded"
                    >
                      <Zap className="w-4 h-4 text-[#00ff66]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {expandedSpell === spell.nome && (
                <div className="mt-3 pt-3 border-t border-[#00ff66]/30 space-y-2 text-xs text-gray-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Componentes:</span> {spell.componentes}
                    </div>
                    <div>
                      <span className="text-gray-500">Duração:</span> {spell.duracao}
                    </div>
                  </div>

                  {spell.dano && (
                    <div>
                      <span className="text-gray-500">🔥 Dano:</span> {spell.dano}
                    </div>
                  )}

                  {spell.area && (
                    <div>
                      <span className="text-gray-500">📐 Área:</span> {spell.area}
                    </div>
                  )}

                  {spell.alcance && (
                    <div>
                      <span className="text-gray-500">📏 Alcance:</span> {spell.alcance}
                    </div>
                  )}

                  {spell.escala_por_nivel && (
                    <div>
                      <span className="text-gray-500">⬆️ Escala por nível:</span> {spell.escala_por_nivel}
                    </div>
                  )}

                  {spell.material && (
                    <div>
                      <span className="text-gray-500">🔧 Material:</span> {spell.material}
                    </div>
                  )}

                  {spell.tipo_alvo && (
                    <div>
                      <span className="text-gray-500">🎯 Tipo de alvo:</span> {spell.tipo_alvo}
                    </div>
                  )}

                  {typeof spell.requisitos_rituais === 'boolean' && (
                    <div>
                      <span className="text-gray-500">🕯️ Ritual:</span> {spell.requisitos_rituais ? 'Sim' : 'Não'}
                    </div>
                  )}

                  {spell.formato && (
                    <div>
                      <span className="text-gray-500">🎯 Formato:</span> {spell.formato}
                    </div>
                  )}

                  {spell.rolagem && (
                    <div>
                      <span className="text-gray-500">🎲 Rolagem:</span> {spell.rolagem}
                    </div>
                  )}

                  {spell.salvacao && (
                    <div>
                      <span className="text-gray-500">💾 Salvação:</span> {spell.salvacao}
                    </div>
                  )}

                  {spell.categoria_magia && (
                    <div>
                      <span className="text-gray-500">📂 Categoria:</span> {spell.categoria_magia}
                    </div>
                  )}

                  {spell.classes_disponivel && (
                    <div>
                      <span className="text-gray-500">🎭 Classes:</span> {typeof spell.classes_disponivel === 'string' ? spell.classes_disponivel : Array.isArray(spell.classes_disponivel) ? spell.classes_disponivel.join(', ') : String(spell.classes_disponivel)}
                    </div>
                  )}

                  {spell.cd_salvacao && (
                    <div>
                      <span className="text-gray-500">🛡️ CD Salvação:</span> {spell.cd_salvacao}
                    </div>
                  )}

                  {spell.tipo_dano && (
                    <div>
                      <span className="text-gray-500">⚔️ Tipo de Dano:</span> {spell.tipo_dano}
                    </div>
                  )}

                  {spell.condicoes_aplicadas && (
                    <div>
                      <span className="text-gray-500">🔗 Condições:</span> {typeof spell.condicoes_aplicadas === 'string' ? spell.condicoes_aplicadas : Array.isArray(spell.condicoes_aplicadas) ? spell.condicoes_aplicadas.join(', ') : String(spell.condicoes_aplicadas)}
                    </div>
                  )}

                  <div>
                    <span className="text-gray-500">Descrição:</span> {spell.descricao}
                  </div>

                  {spell.efeito && (
                    <div className="bg-[#00ff66]/10 p-2 rounded border border-[#00ff66]/30">
                      <span className="text-[#00ff66]">⚡ Efeito Mecânico:</span> {spell.efeito}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rodapé com Info */}
      <div className="text-xs text-gray-500 border-t border-[#00ff66]/30 pt-3">
        💡 Arraste e solte magias na mesa para usar. Clique em ⚡ para auto-executar.
      </div>
    </div>
  );
}
