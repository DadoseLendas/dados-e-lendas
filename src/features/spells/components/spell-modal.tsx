"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SpellExecution } from '@/domain/spells/spell-executor';
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

type SpellCatalogForm = {
  nome: string;
  escola: string;
  nivel_magia: string;
  tempo_conjuracao: string;
  alcance: string;
  componentes: string;
  duracao: string;
  material: string;
  descricao: string;
  escala_por_nivel: string;
  dano: string;
  area: string;
  formato: string;
  efeito: string;
  rolagem: string;
  tipo_alvo: string;
  salvacao: string;
  classes_disponivel: string;
  categoria_magia: string;
  condicoes_aplicadas: string;
  palavras_chave: string;
  cd_salvacao: string;
  tipo_dano: string;
  tipo_ataque: string;
  eh_concentracao: boolean;
  requisitos_rituais: boolean;
};

const defaultSpellForm = (): SpellCatalogForm => ({
  nome: '',
  escola: 'evocação',
  nivel_magia: '0',
  tempo_conjuracao: '1 ação',
  alcance: 'Alcance pessoal',
  componentes: 'V, S',
  duracao: 'Instantânea',
  material: '',
  descricao: '',
  escala_por_nivel: '',
  dano: '',
  area: '',
  formato: '',
  efeito: '',
  rolagem: '',
  tipo_alvo: '',
  salvacao: '',
  classes_disponivel: '',
  categoria_magia: '',
  condicoes_aplicadas: '',
  palavras_chave: '',
  cd_salvacao: '',
  tipo_dano: '',
  tipo_ataque: '',
  eh_concentracao: false,
  requisitos_rituais: false,
});

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface SpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: number | string | null;
  campaignId?: string | number | null;
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

export default function SpellModal({
 isOpen, onClose, characterId, campaignId = null, onLaunchSpell }: SpellModalProps) {
  // UUID guard: previne SQL injection em .or() com campaignId
  const safeCampaignId = (() => {
    if (campaignId == null) return null;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return UUID_RE.test(String(campaignId)) ? campaignId : null;
  })();
  const supabase = createClient();

  const [character, setCharacter] = useState<CharacterLite | null>(null);
  const [catalog, setCatalog] = useState<SpellCatalogItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Aventureiro');

  const [loadingCharacter, setLoadingCharacter] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [saving, setSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);
  const [hoverCatalogSpell, setHoverCatalogSpell] = useState<SpellCatalogItem | null>(null);
  const [expandedCatalogLevels, setExpandedCatalogLevels] = useState<Set<number>>(new Set([0, 1]));
  const [showCreateSpellModal, setShowCreateSpellModal] = useState(false);
  const [savingNewSpell, setSavingNewSpell] = useState(false);
  const [newSpell, setNewSpell] = useState<SpellCatalogForm>(() => defaultSpellForm());

  useEffect(() => {
    if (!isOpen || !characterId) return;

    let active = true;
    const loadData = async () => {
      setLoadingCharacter(true);
      setLoadingCatalog(true);
      setCatalogError("");
      setSearch("");
      setIsAdding(false);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);

      if (userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle();

        setCurrentUserName(
          profileData?.display_name ||
          authData.user?.user_metadata?.full_name ||
          authData.user?.email?.split('@')[0] ||
          'Aventureiro'
        );
      } else {
        setCurrentUserName('Aventureiro');
      }

      const spellQuery = supabase
        .from("spell_catalog")
        .select("id, slug, nome, escola, nivel_magia, tempo_conjuracao, alcance, componentes, duracao, material, descricao, escala_por_nivel, dano, area, formato, efeito, rolagem, tipo_alvo, salvacao, eh_concentracao, requisitos_rituais, classes_disponivel, categoria_magia, efeito_principal, beneficio_concedido, restricao_concedida, transforma_em, movimento_concedido, protecao_concedida, condicoes_aplicadas, palavras_chave, cd_salvacao, tipo_dano, tipo_ataque, campaign_id, num_projeteis, upgrade_dano, upgrade_projeteis, upgrade_alvos")
        .order("nivel_magia", { ascending: true })
        .order("nome", { ascending: true });

      const scopedSpellQuery = safeCampaignId != null
        ? spellQuery.or(`campaign_id.is.null,campaign_id.eq.${String(safeCampaignId)}`)
        : spellQuery.is("campaign_id", null);

      const [{ data: charData, error: charError }, { data: spellData, error: spellError }] = await Promise.all([
        supabase.from("characters").select("id, name, level, spells").eq("id", characterId).single(),
        scopedSpellQuery,
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

  const resetCreateSpell = () => {
    setNewSpell(defaultSpellForm());
    setShowCreateSpellModal(false);
  };

  const logFichaMessage = async (text: string) => {
    if (!currentUserId) return;

    await supabase.from('chat_messages').insert({
      campaign_id: campaignId,
      user_name: currentUserName,
      sender_id: currentUserId,
      receiver_id: null,
      text,
      is_roll: false,
      is_secret: false,
      channel: 'fichas',
    });
  };

  const handleCreateSpell = async () => {
    const spellName = newSpell.nome.trim();
    if (!spellName) {
      alert('Informe o nome da magia.');
      return;
    }

    if (!currentUserId && campaignId == null) {
      alert('Não foi possível identificar o contexto para salvar esta magia.');
      return;
    }

    const nivelMagia = Number.parseInt(newSpell.nivel_magia, 10);
    const slug = `${normalizeSlug(spellName) || 'magia'}-${Date.now()}`;

    setSavingNewSpell(true);
    try {
      const payload = {
        slug,
        nome: spellName,
        escola: newSpell.escola.trim() || 'evocação',
        nivel_magia: Number.isFinite(nivelMagia) ? nivelMagia : 0,
        tempo_conjuracao: newSpell.tempo_conjuracao.trim(),
        alcance: newSpell.alcance.trim(),
        componentes: newSpell.componentes.trim(),
        duracao: newSpell.duracao.trim(),
        material: newSpell.material.trim() || null,
        descricao: newSpell.descricao.trim(),
        escala_por_nivel: newSpell.escala_por_nivel.trim() || null,
        dano: newSpell.dano.trim() || null,
        area: newSpell.area.trim() || null,
        formato: newSpell.formato.trim() || null,
        efeito: newSpell.efeito.trim() || null,
        rolagem: newSpell.rolagem.trim() || null,
        tipo_alvo: newSpell.tipo_alvo.trim() || null,
        salvacao: newSpell.salvacao.trim() || null,
        classes_disponivel: newSpell.classes_disponivel.trim() || null,
        categoria_magia: newSpell.categoria_magia.trim() || null,
        condicoes_aplicadas: newSpell.condicoes_aplicadas.trim() || null,
        palavras_chave: newSpell.palavras_chave.trim() || null,
        cd_salvacao: newSpell.cd_salvacao.trim() || null,
        tipo_dano: newSpell.tipo_dano.trim() || null,
        tipo_ataque: newSpell.tipo_ataque.trim() || null,
        eh_concentracao: newSpell.eh_concentracao,
        requisitos_rituais: newSpell.requisitos_rituais,
        campaign_id: campaignId,
        created_by: currentUserId,
        visibility: campaignId != null ? 'campaign' : 'custom',
        source: campaignId != null ? 'campaign' : 'custom',
      };

      const { error } = await supabase.from('spell_catalog').insert(payload);
      if (error) throw error;

      void logFichaMessage(`${currentUserName} criou a magia ${spellName} no catálogo.`);

      const reloadQuery = supabase
        .from("spell_catalog")
        .select("id, slug, nome, escola, nivel_magia, tempo_conjuracao, alcance, componentes, duracao, material, descricao, escala_por_nivel, dano, area, formato, efeito, rolagem, tipo_alvo, salvacao, eh_concentracao, requisitos_rituais, classes_disponivel, categoria_magia, efeito_principal, beneficio_concedido, restricao_concedida, transforma_em, movimento_concedido, protecao_concedida, condicoes_aplicadas, palavras_chave, cd_salvacao, tipo_dano, tipo_ataque, campaign_id, num_projeteis, upgrade_dano, upgrade_projeteis, upgrade_alvos")
        .order("nivel_magia", { ascending: true })
        .order("nome", { ascending: true });

      const scopedReloadQuery = safeCampaignId != null
        ? reloadQuery.or(`campaign_id.is.null,campaign_id.eq.${String(safeCampaignId)}`)
        : reloadQuery.is("campaign_id", null);

      const { data: spellData, error: reloadError } = await scopedReloadQuery;
      if (!reloadError && spellData) {
        setCatalog(spellData as SpellCatalogItem[]);
      }

      resetCreateSpell();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao criar magia';
      alert(message);
    } finally {
      setSavingNewSpell(false);
    }
  };

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

    void logFichaMessage(`${currentUserName} adicionou ${spell.nome} ao livro de magias.`);
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
  const createSpellTitle = newSpell.nome.trim() || 'Nova magia';
  const createSpellSchool = newSpell.escola.trim() || 'Evocação';
  const createSpellLevel = newSpell.nivel_magia.trim() || '0';
  const createSpellSummary = [newSpell.tempo_conjuracao.trim(), newSpell.alcance.trim(), newSpell.duracao.trim()].filter(Boolean).join(' • ');

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
                type="button"
                onClick={() => setShowCreateSpellModal(true)}
                className="inline-flex items-center gap-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[12px] font-black uppercase text-[#00ff66] hover:bg-[#00ff66]/20"
              >
                <Plus size={14} /> Criar magia
              </button>
            ) : null}

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
                    <span className="text-[#00ff66] font-black">Área:</span> {descriptionSpell.area}
                  </p>
                )}

                {descriptionSpell.salvacao && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">Salvação:</span> {descriptionSpell.salvacao}
                  </p>
                )}

                {descriptionSpell.eh_concentracao && (
                  <p className="mt-2 text-[12px] uppercase text-[#ffd700] font-black">
                    ⚡ Requer Concentração
                  </p>
                )}

                {descriptionSpell.categoria_magia && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">Categoria:</span> {descriptionSpell.categoria_magia}
                  </p>
                )}

                {descriptionSpell.classes_disponivel && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">Classes:</span> {typeof descriptionSpell.classes_disponivel === 'string' ? descriptionSpell.classes_disponivel : Array.isArray(descriptionSpell.classes_disponivel) ? descriptionSpell.classes_disponivel.join(', ') : String(descriptionSpell.classes_disponivel)}
                  </p>
                )}

                {descriptionSpell.cd_salvacao && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">CD Salvação:</span> {descriptionSpell.cd_salvacao}
                  </p>
                )}

                {descriptionSpell.condicoes_aplicadas && (
                  <p className="mt-2 text-[12px] uppercase text-[#9ea8a0]">
                    <span className="text-[#00ff66] font-black">Condições:</span> {typeof descriptionSpell.condicoes_aplicadas === 'string' ? descriptionSpell.condicoes_aplicadas : Array.isArray(descriptionSpell.condicoes_aplicadas) ? descriptionSpell.condicoes_aplicadas.join(', ') : String(descriptionSpell.condicoes_aplicadas)}
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

        {showCreateSpellModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm" onMouseDown={resetCreateSpell}>
            <div
              className="relative flex h-[92vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-[28px] border border-[#1a2a1a] bg-[radial-gradient(circle_at_top_left,_rgba(0,255,102,0.12),_transparent_32%),linear-gradient(180deg,_rgba(6,12,6,0.98),_rgba(3,6,3,0.98))] shadow-[0_0_80px_rgba(0,255,102,0.14)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#1a2a1a] px-5 py-4 sm:px-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#00ff66]">
                      Criar magia
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[20px] font-black uppercase tracking-[0.18em] text-[#f1e5ac] sm:text-[24px]">
                      Novo registro no catálogo
                    </h3>
                    <p className="mt-1 max-w-3xl text-[12px] uppercase leading-5 text-[#6d7a6d]">
                      Organize os dados principais primeiro. O resumo ao lado te mostra como a magia vai ficar antes de salvar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetCreateSpell}
                  className="rounded-full border border-[#1a2a1a] bg-black/35 p-2 text-[#8a9a8a] transition hover:border-[#00ff66]/40 hover:text-[#00ff66]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 rounded-2xl border border-[#1a2a1a] bg-black/25 p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#00ff66]">Identidade</h4>
                        <span className="text-[10px] uppercase text-[#6d7a6d]">obrigatório</span>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="lg:col-span-2">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Nome da magia</label>
                          <input
                            value={newSpell.nome}
                            onChange={(e) => setNewSpell((prev) => ({ ...prev, nome: e.target.value }))}
                            placeholder="Ex.: Lâmina Sombria"
                            className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[14px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Escola</label>
                          <input
                            value={newSpell.escola}
                            onChange={(e) => setNewSpell((prev) => ({ ...prev, escola: e.target.value }))}
                            placeholder="Evocação"
                            className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Nível</label>
                          <input
                            value={newSpell.nivel_magia}
                            onChange={(e) => setNewSpell((prev) => ({ ...prev, nivel_magia: e.target.value }))}
                            placeholder="0"
                            className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-[#1a2a1a] bg-black/25 p-4 sm:p-5">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#00ff66]">Conjuração</h4>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Tempo</label>
                          <input value={newSpell.tempo_conjuracao} onChange={(e) => setNewSpell((prev) => ({ ...prev, tempo_conjuracao: e.target.value }))} placeholder="1 ação" className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Alcance</label>
                          <input value={newSpell.alcance} onChange={(e) => setNewSpell((prev) => ({ ...prev, alcance: e.target.value }))} placeholder="18 m" className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Duração</label>
                          <input value={newSpell.duracao} onChange={(e) => setNewSpell((prev) => ({ ...prev, duracao: e.target.value }))} placeholder="Instantânea" className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Componentes</label>
                          <input value={newSpell.componentes} onChange={(e) => setNewSpell((prev) => ({ ...prev, componentes: e.target.value }))} placeholder="V, S, M" className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Material</label>
                          <input value={newSpell.material} onChange={(e) => setNewSpell((prev) => ({ ...prev, material: e.target.value }))} placeholder="Opcional" className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-[#1a2a1a] bg-black/25 p-4 sm:p-5">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#00ff66]">Descrição e efeitos</h4>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="lg:col-span-2">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Descrição</label>
                          <textarea value={newSpell.descricao} onChange={(e) => setNewSpell((prev) => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva o efeito completo da magia..." rows={6} className="w-full rounded-2xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] leading-6 text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Escala por nível</label>
                          <textarea value={newSpell.escala_por_nivel} onChange={(e) => setNewSpell((prev) => ({ ...prev, escala_por_nivel: e.target.value }))} placeholder="Como a magia melhora em círculos maiores..." rows={3} className="w-full rounded-2xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] leading-6 text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Tipo de dano</label>
                          <input value={newSpell.dano} onChange={(e) => setNewSpell((prev) => ({ ...prev, dano: e.target.value }))} placeholder="Fogo, necrótico..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Salvação</label>
                          <input value={newSpell.salvacao} onChange={(e) => setNewSpell((prev) => ({ ...prev, salvacao: e.target.value }))} placeholder="DEX, CON..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Tipo de ataque</label>
                          <input value={newSpell.tipo_ataque} onChange={(e) => setNewSpell((prev) => ({ ...prev, tipo_ataque: e.target.value }))} placeholder="Corpo a corpo, distância..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Área</label>
                          <input value={newSpell.area} onChange={(e) => setNewSpell((prev) => ({ ...prev, area: e.target.value }))} placeholder="Cubo, cone, esfera..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Formato</label>
                          <input value={newSpell.formato} onChange={(e) => setNewSpell((prev) => ({ ...prev, formato: e.target.value }))} placeholder="Linha, área, alvo..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Efeito</label>
                          <textarea value={newSpell.efeito} onChange={(e) => setNewSpell((prev) => ({ ...prev, efeito: e.target.value }))} placeholder="Resultado extra além do dano/efeito principal" rows={3} className="w-full rounded-2xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] leading-6 text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-[#1a2a1a] bg-black/25 p-4 sm:p-5">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#00ff66]">Características</h4>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Categorias</label>
                          <input value={newSpell.categoria_magia} onChange={(e) => setNewSpell((prev) => ({ ...prev, categoria_magia: e.target.value }))} placeholder="Ataque, suporte..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Classes disponíveis</label>
                          <input value={newSpell.classes_disponivel} onChange={(e) => setNewSpell((prev) => ({ ...prev, classes_disponivel: e.target.value }))} placeholder="Mago, bruxo..." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9a8a]">Rolagem</label>
                          <input value={newSpell.rolagem} onChange={(e) => setNewSpell((prev) => ({ ...prev, rolagem: e.target.value }))} placeholder="2d8, teste, etc." className="w-full rounded-xl border border-[#1a2a1a] bg-black/45 px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#4a5a4a] focus:border-[#00ff66]/50 focus:bg-black/55" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 border-t border-[#1a2a1a] pt-4">
                        <label className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-black/35 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#9ea8a0]">
                          <input type="checkbox" checked={newSpell.eh_concentracao} onChange={(e) => setNewSpell((prev) => ({ ...prev, eh_concentracao: e.target.checked }))} />
                          Concentração
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-black/35 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#9ea8a0]">
                          <input type="checkbox" checked={newSpell.requisitos_rituais} onChange={(e) => setNewSpell((prev) => ({ ...prev, requisitos_rituais: e.target.checked }))} />
                          Ritual
                        </label>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-2xl border border-[#00ff66]/20 bg-[#00ff66]/5 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00ff66]">Pré-visualização</p>
                          <h4 className="mt-1 text-[18px] font-black uppercase tracking-[0.14em] text-[#f1e5ac]">{createSpellTitle}</h4>
                        </div>
                        <span className="rounded-full border border-[#00ff66]/30 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#00ff66]">Círculo {createSpellLevel}</span>
                      </div>

                      <div className="mt-4 space-y-3 text-[12px] uppercase text-[#9ea8a0]">
                        <p><span className="font-black text-[#00ff66]">Escola:</span> {createSpellSchool}</p>
                        <p><span className="font-black text-[#00ff66]">Resumo:</span> {createSpellSummary || 'Ainda sem tempo, alcance e duração definidos.'}</p>
                        <p><span className="font-black text-[#00ff66]">Componentes:</span> {newSpell.componentes.trim() || '-'}</p>
                        <p><span className="font-black text-[#00ff66]">Alvo:</span> {newSpell.tipo_alvo.trim() || '-'}</p>
                        <p><span className="font-black text-[#00ff66]">Salvacao:</span> {newSpell.salvacao.trim() || '-'}</p>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#1a2a1a] bg-black/35 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a9a8a]">Descrição</p>
                        <p className="mt-2 max-h-[240px] overflow-y-auto whitespace-pre-line text-[13px] leading-6 text-[#d5ead8]">
                          {newSpell.descricao.trim() || 'A descrição aparecerá aqui enquanto você digita.'}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] uppercase text-[#8a9a8a]">
                        <div className="rounded-xl border border-[#1a2a1a] bg-black/30 px-3 py-2">
                          <p className="text-[#00ff66] font-black">Dano</p>
                          <p className="mt-1 line-clamp-2">{newSpell.dano.trim() || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-[#1a2a1a] bg-black/30 px-3 py-2">
                          <p className="text-[#00ff66] font-black">Área</p>
                          <p className="mt-1 line-clamp-2">{newSpell.area.trim() || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-[#1a2a1a] bg-black/30 px-3 py-2">
                          <p className="text-[#00ff66] font-black">Categoria</p>
                          <p className="mt-1 line-clamp-2">{newSpell.categoria_magia.trim() || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-[#1a2a1a] bg-black/30 px-3 py-2">
                          <p className="text-[#00ff66] font-black">CD</p>
                          <p className="mt-1 line-clamp-2">{newSpell.cd_salvacao.trim() || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#1a2a1a] bg-black/25 p-4 sm:p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00ff66]">Dica prática</p>
                      <p className="mt-2 text-[12px] leading-6 text-[#9ea8a0]">
                        Use a seção de identidade para nome, nível e escola. Depois preencha descrição e metadados sem pressa. Assim a magia fica fácil de encontrar depois na biblioteca.
                      </p>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="border-t border-[#1a2a1a] bg-black/45 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[11px] uppercase text-[#6d7a6d]">
                    {savingNewSpell ? 'Salvando no catálogo...' : 'Você pode fechar sem salvar a qualquer momento.'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetCreateSpell}
                      className="rounded-xl border border-[#1a2a1a] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a9a8a] transition hover:border-[#00ff66]/35 hover:text-[#00ff66]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSpell}
                      disabled={savingNewSpell}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00ff66]/30 bg-[#00ff66]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00ff66] transition hover:bg-[#00ff66]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={14} /> {savingNewSpell ? 'Criando...' : 'Salvar magia'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}