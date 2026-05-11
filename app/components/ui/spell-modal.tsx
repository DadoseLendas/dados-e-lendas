"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SpellExecution } from "@/utils/spell-executor";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Save, Trash2, X, Zap } from "lucide-react";

type CharacterSpell = {
  id: number;
  name: string;
  level?: string;
};

type CharacterLite = {
  id: number | string;
  name: string;
  level: number;
  spells: CharacterSpell[];
};

type SpellCatalogItem = {
  id: number;
  slug: string;
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
};

interface SpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: number | string | null;
  onLaunchSpell?: (spell: SpellExecution) => void;
}

const getMaxSpellLevelForCharacter = (characterLevel: number) => {
  if (characterLevel >= 17) return 9;
  if (characterLevel >= 15) return 8;
  if (characterLevel >= 13) return 7;
  if (characterLevel >= 11) return 6;
  if (characterLevel >= 9) return 5;
  if (characterLevel >= 7) return 4;
  if (characterLevel >= 5) return 3;
  if (characterLevel >= 3) return 2;
  if (characterLevel >= 1) return 1;
  return 0;
};

const buildSpellExecution = (spell: SpellCatalogItem, casterLevel = 1): SpellExecution => ({
  spellName: spell.nome,
  danoRolagem: spell.dano || null,
  areaRaio: undefined,
  areaFormato: spell.formato || undefined,
  areaTexto: spell.area || null,
  tipoAlvo: spell.tipo_alvo || undefined,
  salvacao: spell.salvacao || undefined,
  alcanceTexto: spell.alcance || null,
  categoriaMagia: spell.categoria_magia || null,
  efeitoPrincipal: spell.efeito_principal || null,
  beneficioConcedido: spell.beneficio_concedido || null,
  restricaoConcedida: spell.restricao_concedida || null,
  descricao: spell.descricao,
  cdSalvacao: spell.cd_salvacao ?? null,
  tipoDano: spell.tipo_dano || null,
  tipoAtaque: spell.tipo_ataque || null,
  ehConcentracao: spell.eh_concentracao ?? false,
  casterLevel,
});

export default function SpellModal({ isOpen, onClose, characterId, onLaunchSpell }: SpellModalProps) {
  const supabase = createClient();

  const [character, setCharacter] = useState<CharacterLite | null>(null);
  const [catalog, setCatalog] = useState<SpellCatalogItem[]>([]);

  const [loadingCharacter, setLoadingCharacter] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [saving, setSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);
  const [hoverCatalogSpell, setHoverCatalogSpell] = useState<SpellCatalogItem | null>(null);
  const [expandedCatalogLevels, setExpandedCatalogLevels] = useState<Set<number>>(new Set([0, 1]));

  useEffect(() => {
    if (!isOpen || !characterId) return;

    let active = true;
    const loadData = async () => {
      setLoadingCharacter(true);
      setLoadingCatalog(true);
      setCatalogError("");
      setSearch("");
      setIsAdding(false);

      const [{ data: charData, error: charError }, { data: spellData, error: spellError }] = await Promise.all([
        supabase.from("characters").select("id, name, level, spells").eq("id", characterId).single(),
        supabase
          .from("spell_catalog")
          .select("id, slug, nome, escola, nivel_magia, tempo_conjuracao, alcance, componentes, duracao, material, descricao, escala_por_nivel, dano, area, formato, efeito, rolagem, tipo_alvo, salvacao, eh_concentracao, requisitos_rituais, classes_disponivel, categoria_magia, efeito_principal, beneficio_concedido, restricao_concedida, transforma_em, movimento_concedido, protecao_concedida, condicoes_aplicadas, palavras_chave, cd_salvacao, tipo_dano, tipo_ataque")
          .order("nivel_magia", { ascending: true })
          .order("nome", { ascending: true }),
      ]);

      if (!active) return;

      if (!charError && charData) {
        const spells = Array.isArray(charData.spells) ? (charData.spells as CharacterSpell[]) : [];
        setCharacter({
          id: charData.id,
          name: charData.name,
          level: charData.level ?? 1,
          spells,
        });
        setSelectedSpellName(spells[0]?.name ?? null);
      } else {
        setCharacter(null);
        setSelectedSpellName(null);
      }

      if (!spellError && spellData) {
        setCatalog((spellData as SpellCatalogItem[]) ?? []);
      } else {
        setCatalog([]);
        setCatalogError("Nao foi possivel carregar a biblioteca de magias.");
      }

      setLoadingCharacter(false);
      setLoadingCatalog(false);
    };

    loadData();

    return () => {
      active = false;
      setHoverCatalogSpell(null);
    };
  }, [isOpen, characterId, supabase]);

  const maxSpellLevel = useMemo(() => getMaxSpellLevelForCharacter(character?.level ?? 1), [character?.level]);

  const catalogByName = useMemo(() => {
    const map = new Map<string, SpellCatalogItem>();
    catalog.forEach((s) => map.set(s.nome.toLowerCase(), s));
    return map;
  }, [catalog]);

  const learnedNames = useMemo(() => new Set((character?.spells ?? []).map((s) => s.name.toLowerCase())), [character?.spells]);

  const selectedKnownSpell = useMemo(() => {
    if (!selectedSpellName) return null;
    const fromCatalog = catalogByName.get(selectedSpellName.toLowerCase());
    if (fromCatalog) return fromCatalog;

    const fallbackKnown = (character?.spells ?? []).find((s) => s.name.toLowerCase() === selectedSpellName.toLowerCase());
    if (!fallbackKnown) return null;

    const parsedLevel = Number(fallbackKnown.level ?? 0);
    const normalizedLevel = Number.isFinite(parsedLevel) ? parsedLevel : 0;

    return {
      id: -1,
      slug: "",
      nome: fallbackKnown.name,
      escola: "desconhecida",
      nivel_magia: normalizedLevel,
      tempo_conjuracao: "-",
      alcance: "-",
      componentes: "-",
      duracao: "-",
      material: null,
      descricao: "Descricao detalhada nao encontrada no catalogo de magias.",
      escala_por_nivel: null,
      dano: null,
      area: null,
      formato: null,
      efeito: null,
      rolagem: null,
      tipo_alvo: null,
      salvacao: null,
      eh_concentracao: false,
      requisitos_rituais: false,
    } as SpellCatalogItem;
  }, [selectedSpellName, catalogByName, character?.spells]);

  const groupedKnown = useMemo(() => {
    const grouped = new Map<number, CharacterSpell[]>();
    (character?.spells ?? []).forEach((spell) => {
      const parsed = Number(spell.level ?? 0);
      const level = Number.isFinite(parsed) ? parsed : 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level)!.push(spell);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [character?.spells]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((spell) =>
      spell.nome.toLowerCase().includes(query) ||
      spell.escola.toLowerCase().includes(query) ||
      `${spell.nivel_magia}` === query
    );
  }, [catalog, search]);

  const groupedCatalog = useMemo(() => {
    const grouped = new Map<number, SpellCatalogItem[]>();
    filteredCatalog.forEach((spell) => {
      if (!grouped.has(spell.nivel_magia)) grouped.set(spell.nivel_magia, []);
      grouped.get(spell.nivel_magia)!.push(spell);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [filteredCatalog]);

  useEffect(() => {
    if (!isAdding) return;

    setExpandedCatalogLevels((prev) => {
      const available = new Set(groupedCatalog.map(([level]) => level));
      const next = new Set<number>();

      prev.forEach((level) => {
        if (available.has(level)) next.add(level);
      });

      if (next.size === 0 && groupedCatalog.length > 0) {
        next.add(groupedCatalog[0][0]);
      }

      return next;
    });
  }, [isAdding, groupedCatalog]);

  const canLearnSpell = (spell: SpellCatalogItem) => spell.nivel_magia === 0 || spell.nivel_magia <= maxSpellLevel;

  const toggleCatalogLevel = (level: number) => {
    setExpandedCatalogLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const addSpell = (spell: SpellCatalogItem) => {
    if (!character) return;
    if (learnedNames.has(spell.nome.toLowerCase()) || !canLearnSpell(spell)) return;

    setCharacter((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        spells: [
          ...prev.spells,
          { id: Date.now() + Math.floor(Math.random() * 1000), name: spell.nome, level: `${spell.nivel_magia}` },
        ],
      };
      return next;
    });
  };

  const removeSpell = (id: number) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const removed = prev.spells.find((s) => s.id === id);
      const nextSpells = prev.spells.filter((s) => s.id !== id);

      if (removed && removed.name === selectedSpellName) {
        setSelectedSpellName(nextSpells[0]?.name ?? null);
      }

      return { ...prev, spells: nextSpells };
    });
  };

  const saveSpells = async () => {
    if (!character) return;
    setSaving(true);

    const { error } = await supabase.from("characters").update({ spells: character.spells }).eq("id", character.id);
    setSaving(false);

    if (error) {
      alert(`Erro ao salvar magias: ${error.message}`);
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  const descriptionSpell = isAdding ? hoverCatalogSpell : selectedKnownSpell;

  // ===== MODO GRANDE: isAdding = true =====
  // Lista todas as magias da biblioteca para adicionar
  // - Modal expandido (95vh, 1450px)
  // - Centralizado na tela com blur no fundo
  // - Grid: 70% listagem de magias + 30% descrição
  // - Mostra catálogo com search e círculos colapsáveis
  //
  // ===== MODO PEQUENO: isAdding = false =====
  // Lista as magias do personagem
  // - Modal compacto (82vh, 780px)
  // - Posicionado na esquerda (lg:ml-20)
  // - Grid: listagem flex + 360px de descrição
  // - Sem blur, sem search, mostra magias aprendidas

  const modalHeightClass = isAdding ? "h-[95vh]" : "h-[82vh]";
  const modalMaxWidthClass = isAdding ? "max-w-[1450px]" : "max-w-[780px]";
  const gridHeightClass = isAdding ? "h-[calc(95vh-54px)]" : "h-[calc(82vh-54px)]";
  const gridColsClass = isAdding ? "lg:grid-cols-[1fr_0.55fr]" : "lg:grid-cols-[minmax(0,1fr)_360px]";
  const listingMaxHeightClass = isAdding ? "max-h-[80vh]" : "max-h-[68vh]";
  const catalogMaxHeightClass = isAdding ? "max-h-[82vh]" : "max-h-[64vh]";
  const descriptionMaxHeightClass = isAdding ? "max-h-[80vh]" : "max-h-[70vh]";
  const overlayBlur = isAdding ? "backdrop-blur-sm" : "";
  const modalCenter = isAdding ? "mx-auto" : "mx-auto lg:mx-0 lg:ml-20";
  const containerAlign = isAdding ? "flex items-center justify-center" : "flex items-center";

  return (
    <div className={`fixed inset-0 z-[95] bg-black/50 ${overlayBlur} p-2 md:p-3 ${containerAlign}`} onClick={onClose}>
      <div
        className={`${modalHeightClass} ${modalMaxWidthClass} w-full rounded-xl border border-[#1a2a1a] bg-[#050a05] shadow-[0_0_80px_rgba(0,255,102,0.12)] overflow-hidden ${modalCenter}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1a2a1a] px-3 py-2 md:px-4">
          <div>
            <h2 className="text-[14px] md:text-[16px] font-black uppercase tracking-widest text-[#f1e5ac]">Livro de Magias</h2>
            <p className="text-[11px] md:text-[12px] uppercase text-[#4a5a4a]">
              {character ? `${character.name} • Nivel ${character.level} • Circulo maximo ${maxSpellLevel}` : "Carregando personagem..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdding ? (
              <button
                onClick={() => {
                  setIsAdding(false);
                  setHoverCatalogSpell(null);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[#1a2a1a] px-3 py-2 text-[12px] font-black uppercase text-[#4a5a4a] hover:border-[#00ff66]/40 hover:text-[#00ff66]"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 rounded-md border border-[#f1e5ac]/30 bg-[#f1e5ac]/10 px-3 py-2 text-[12px] font-black uppercase text-[#f1e5ac] hover:bg-[#f1e5ac]/20"
              >
                <Plus size={14} /> Adicionar Magias
              </button>
            )}

            <button
              onClick={saveSpells}
              disabled={saving || !character}
              className="inline-flex items-center gap-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[12px] font-black uppercase text-[#00ff66] hover:bg-[#00ff66]/20 disabled:opacity-50"
            >
              <Save size={14} /> {saving ? "Salvando" : "Salvar"}
            </button>

            <button
              onClick={onClose}
              className="rounded-md border border-[#1a2a1a] px-2.5 py-1.5 text-[#4a5a4a] hover:border-[#00ff66]/40 hover:text-[#00ff66]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={`grid ${gridHeightClass} grid-cols-1 ${gridColsClass}`}>
          <section className="border-b border-[#1a2a1a] p-3 lg:border-b-0 lg:border-r">
            {!isAdding && (
              <>
                <h3 className="mb-2 text-[12px] font-black uppercase tracking-widest text-[#f1e5ac]">Magias do Personagem</h3>
                <div className={`${listingMaxHeightClass} overflow-y-auto space-y-2 pr-1 pb-2`}>
                  {loadingCharacter && <p className="text-[12px] uppercase text-[#4a5a4a]">Carregando...</p>}
                  {!loadingCharacter && groupedKnown.length === 0 && (
                    <p className="text-[12px] uppercase text-[#4a5a4a]">Nenhuma magia selecionada.</p>
                  )}

                  {groupedKnown.map(([level, spells]) => (
                    <div key={`known-${level}`} className="rounded-lg border border-[#1a2a1a] bg-black/20">
                      <div className="border-b border-[#1a2a1a] bg-[#070d07] px-3 py-2">
                        <span className="text-[12px] font-black uppercase text-[#00ff66]">{level === 0 ? "Truques" : `Circulo ${level}`}</span>
                        <span className="ml-2 text-[11px] uppercase text-[#4a5a4a]">({spells.length})</span>
                      </div>
                      <div className="space-y-1.5 p-2">
                        {spells.map((spell) => {
                          const selected = selectedSpellName === spell.name;
                          return (
                            <button
                              key={spell.id}
                              onClick={() => setSelectedSpellName(spell.name)}
                              className={`w-full flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-left transition-colors ${selected ? "border-[#00ff66]/40 bg-[#00ff66]/10" : "border-[#1a2a1a] bg-black/35 hover:border-[#00ff66]/25"}`}
                            >
                              <span className="truncate text-[13px] font-black uppercase text-gray-200">{spell.name}</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSpell(spell.id);
                                }}
                                className="text-red-400/70 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isAdding && (
              <>
                <h3 className="mb-2 text-[12px] font-black uppercase tracking-widest text-[#f1e5ac]">Biblioteca de Magias</h3>
                <div className="mb-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, escola ou circulo..."
                    className="w-full rounded-md border border-[#1a2a1a] bg-black/40 px-2.5 py-2 text-[13px] text-white outline-none focus:border-[#00ff66]/50"
                  />
                </div>
                <div className={`${catalogMaxHeightClass} overflow-y-auto pr-1`}>
                  {loadingCatalog && <p className="text-[12px] uppercase text-[#4a5a4a]">Carregando biblioteca...</p>}
                  {!loadingCatalog && catalogError && <p className="text-[12px] uppercase text-red-400">{catalogError}</p>}
                  {!loadingCatalog && !catalogError && groupedCatalog.length === 0 && (
                    <p className="text-[12px] uppercase text-[#4a5a4a]">Nenhuma magia encontrada.</p>
                  )}

                  {groupedCatalog.map(([level, spells]) => {
                    const isExpanded = expandedCatalogLevels.has(level);

                    return (
                      <div key={`catalog-${level}`} className="mb-4 rounded-lg border border-[#1a2a1a] bg-black/20">
                        <button
                          type="button"
                          onClick={() => toggleCatalogLevel(level)}
                          className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-[#1a2a1a] bg-[#070d07] px-3 py-2 text-left hover:bg-[#0a1a0a]"
                        >
                          <div>
                            <span className="text-[12px] font-black uppercase text-[#00ff66]">{level === 0 ? "Truques" : `Circulo ${level}`}</span>
                            <span className="ml-2 text-[11px] uppercase text-[#4a5a4a]">({spells.length})</span>
                          </div>
                          {isExpanded ? <ChevronDown size={14} className="text-[#8a9a8a]" /> : <ChevronRight size={14} className="text-[#8a9a8a]" />}
                        </button>

                        {isExpanded && (
                          <div className="space-y-1.5 p-2">
                            {spells.map((spell) => {
                              const already = learnedNames.has(spell.nome.toLowerCase());
                              const allowed = canLearnSpell(spell);
                              const canAdd = !already && allowed;

                              return (
                                <div
                                  key={spell.id}
                                  onMouseEnter={() => setHoverCatalogSpell(spell)}
                                  className="flex items-start justify-between gap-2 rounded-md border border-[#1a2a1a] bg-black/40 p-2 hover:border-[#00ff66]/35"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-black uppercase text-gray-200">{spell.nome}</p>
                                    <p className="text-[11px] uppercase text-[#8a9a8a]">{spell.escola} • {spell.tempo_conjuracao} • {spell.alcance}</p>
                                  </div>
                                  <button
                                    onClick={() => addSpell(spell)}
                                    disabled={!canAdd}
                                    className={`shrink-0 rounded border px-3 py-2 text-[12px] font-black uppercase ${canAdd ? "border-[#00ff66]/30 text-[#00ff66] hover:bg-[#00ff66]/10" : "border-[#1a2a1a] text-[#4a5a4a]"}`}
                                  >
                                    {already ? "ok" : allowed ? <Plus size={14} /> : "lvl"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="p-3">
            <h3 className="mb-2 text-[12px] font-black uppercase tracking-widest text-[#f1e5ac]">Descricao</h3>

            {!descriptionSpell && (
              <p className="text-[12px] uppercase text-[#4a5a4a]">
                {isAdding ? "Passe o mouse em uma magia para visualizar." : "Selecione uma magia para ver a descricao."}
              </p>
            )}

            {descriptionSpell && (
              <div className={`${descriptionMaxHeightClass} overflow-y-auto rounded-lg border border-[#1a2a1a] bg-black/30 p-3`}>
                <p className="text-[15px] font-black uppercase tracking-wider text-[#f1e5ac]">{descriptionSpell.nome}</p>
                <p className="mt-1 text-[12px] uppercase text-[#8a9a8a]">Circulo {descriptionSpell.nivel_magia} • {descriptionSpell.escola}</p>

                {onLaunchSpell && !isAdding && (
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchSpell(buildSpellExecution(descriptionSpell, character?.level ?? 1));
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00ff66] hover:bg-[#00ff66]/20"
                  >
                    <Zap className="h-3.5 w-3.5" /> Lançar magia
                  </button>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] uppercase text-[#9ea8a0]">
                  <p><span className="text-[#00ff66] font-black">Tempo:</span> {descriptionSpell.tempo_conjuracao}</p>
                  <p><span className="text-[#00ff66] font-black">Alcance:</span> {descriptionSpell.alcance}</p>
                  <p><span className="text-[#00ff66] font-black">Comp:</span> {descriptionSpell.componentes}</p>
                  <p><span className="text-[#00ff66] font-black">Duracao:</span> {descriptionSpell.duracao}</p>
                </div>

                {descriptionSpell.material && (
                  <p className="mt-3 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">Material:</span> {descriptionSpell.material}
                  </p>
                )}

                <div className="mt-3 rounded-lg border border-[#1a2a1a] bg-black/35 p-2.5">
                  <p className="text-[14px] leading-6 text-gray-200 whitespace-pre-line">{descriptionSpell.descricao}</p>
                </div>

                {descriptionSpell.dano && (
                  <p className="mt-3 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#ff6b6b] font-black">🔥 Dano:</span> {descriptionSpell.dano}
                  </p>
                )}

                {descriptionSpell.area && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">📐 Área:</span> {descriptionSpell.area}
                  </p>
                )}

                {descriptionSpell.salvacao && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">💾 Salvação:</span> {descriptionSpell.salvacao}
                  </p>
                )}

                {descriptionSpell.eh_concentracao && (
                  <p className="mt-2 text-[12px] uppercase text-[#ffd700] font-black">
                    ⚡ Requer Concentração
                  </p>
                )}

                {descriptionSpell.categoria_magia && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">📂 Categoria:</span> {descriptionSpell.categoria_magia}
                  </p>
                )}

                {descriptionSpell.classes_disponivel && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">🎭 Classes:</span> {typeof descriptionSpell.classes_disponivel === 'string' ? descriptionSpell.classes_disponivel : Array.isArray(descriptionSpell.classes_disponivel) ? descriptionSpell.classes_disponivel.join(', ') : String(descriptionSpell.classes_disponivel)}
                  </p>
                )}

                {descriptionSpell.cd_salvacao && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">🛡️ CD Salvação:</span> {descriptionSpell.cd_salvacao}
                  </p>
                )}

                {descriptionSpell.condicoes_aplicadas && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">🔗 Condições:</span> {typeof descriptionSpell.condicoes_aplicadas === 'string' ? descriptionSpell.condicoes_aplicadas : Array.isArray(descriptionSpell.condicoes_aplicadas) ? descriptionSpell.condicoes_aplicadas.join(', ') : String(descriptionSpell.condicoes_aplicadas)}
                  </p>
                )}

                {descriptionSpell.escala_por_nivel && (
                  <div className="mt-4 rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/5 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#00ff66]">Escala</p>
                    <p className="mt-1 text-[14px] leading-7 text-[#d5ead8] whitespace-pre-line">{descriptionSpell.escala_por_nivel}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
