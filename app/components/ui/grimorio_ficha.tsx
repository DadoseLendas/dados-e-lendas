'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Save } from 'lucide-react';

type CharacterSpell = {
  id: number;
  name: string;
  level?: string;
};

type SpellCatalogItem = {
  id: number;
  nome: string;
  nivel_magia: number;
  escola: string;
  tempo_conjuracao: string;
  alcance: string;
};

type CharacterRow = {
  id: number | string;
  name: string;
  level: number;
  spells: CharacterSpell[] | null;
};

function getMaxSpellLevelForCharacter(characterLevel: number) {
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
}

interface CharacterGrimorioPanelProps {
  characterId: string | number;
  onSaved?: (spells: CharacterSpell[]) => void;
}

export default function CharacterGrimorioPanel({ characterId, onSaved }: CharacterGrimorioPanelProps) {
  const supabase = createClient();

  const [characterName, setCharacterName] = useState('');
  const [characterLevel, setCharacterLevel] = useState(1);
  const [knownSpells, setKnownSpells] = useState<CharacterSpell[]>([]);
  const [catalog, setCatalog] = useState<SpellCatalogItem[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const [{ data: charData, error: charError }, { data: catalogData, error: catalogError }] = await Promise.all([
        supabase.from('characters').select('id, name, level, spells').eq('id', characterId).single(),
        supabase
          .from('spell_catalog')
          .select('id, nome, nivel_magia, escola, tempo_conjuracao, alcance')
          .order('nivel_magia', { ascending: true })
          .order('nome', { ascending: true }),
      ]);

      if (!active) return;

      if (!charError && charData) {
        const row = charData as CharacterRow;
        setCharacterName(row.name);
        setCharacterLevel(row.level ?? 1);
        setKnownSpells(Array.isArray(row.spells) ? row.spells : []);
      } else {
        setCharacterName('');
        setCharacterLevel(1);
        setKnownSpells([]);
      }

      if (!catalogError && catalogData) {
        setCatalog(catalogData as SpellCatalogItem[]);
      } else {
        setCatalog([]);
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [characterId, supabase]);

  const maxSpellLevel = useMemo(() => getMaxSpellLevelForCharacter(characterLevel), [characterLevel]);

  const learnedNames = useMemo(() => new Set(knownSpells.map((s) => s.name.toLowerCase())), [knownSpells]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;

    return catalog.filter((spell) =>
      spell.nome.toLowerCase().includes(q) ||
      spell.escola.toLowerCase().includes(q) ||
      `${spell.nivel_magia}` === q
    );
  }, [catalog, search]);

  const groupedKnown = useMemo(() => {
    const grouped = new Map<number, CharacterSpell[]>();
    knownSpells.forEach((spell) => {
      const parsed = Number(spell.level ?? 0);
      const level = Number.isFinite(parsed) ? parsed : 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level)!.push(spell);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [knownSpells]);

  const groupedCatalog = useMemo(() => {
    const grouped = new Map<number, SpellCatalogItem[]>();
    filteredCatalog.forEach((spell) => {
      if (!grouped.has(spell.nivel_magia)) grouped.set(spell.nivel_magia, []);
      grouped.get(spell.nivel_magia)!.push(spell);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [filteredCatalog]);

  const addSpell = (spell: SpellCatalogItem) => {
    const alreadyLearned = learnedNames.has(spell.nome.toLowerCase());
    const allowedByLevel = spell.nivel_magia === 0 || spell.nivel_magia <= maxSpellLevel;

    if (alreadyLearned || !allowedByLevel) return;

    setKnownSpells((prev) => [
      ...prev,
      { id: Date.now() + Math.floor(Math.random() * 1000), name: spell.nome, level: `${spell.nivel_magia}` },
    ]);
  };

  const removeSpell = (id: number) => {
    setKnownSpells((prev) => prev.filter((spell) => spell.id !== id));
  };

  const saveSpells = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('characters')
      .update({ spells: knownSpells })
      .eq('id', characterId);

    setSaving(false);

    if (error) {
      alert(`Erro ao salvar magias: ${error.message}`);
      return;
    }

    onSaved?.(knownSpells);
  };

  if (loading) {
    return (
      <div className="bg-[#050a05] border border-[#1a2a1a] rounded-xl p-5 text-[12px] uppercase text-[#4a5a4a]">
        Carregando grimório...
      </div>
    );
  }

  return (
    <div className="bg-[#050a05] border border-[#1a2a1a] rounded-xl p-4 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-[#f1e5ac] text-[14px] font-black uppercase">Grimório</h3>
          <p className="text-[11px] text-[#4a5a4a] uppercase">{characterName || 'Personagem'} • Nível {characterLevel} • Círculo máx. {maxSpellLevel}</p>
        </div>
        <button
          type="button"
          onClick={saveSpells}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[12px] font-black uppercase tracking-widest disabled:opacity-60"
        >
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Magias'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-black/35 border border-[#1a2a1a] rounded-xl p-3">
          <h4 className="text-[#f1e5ac] text-[12px] font-black uppercase mb-3">Magias Conhecidas</h4>
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {groupedKnown.length === 0 ? (
              <p className="text-[12px] uppercase text-[#4a5a4a]">Nenhuma magia adicionada.</p>
            ) : (
              groupedKnown.map(([level, spells]) => (
                <div key={level} className="border border-[#1a2a1a] rounded-lg bg-black/30">
                  <div className="px-2 py-1.5 border-b border-[#1a2a1a] text-[11px] font-black uppercase text-[#00ff66]">
                    {level === 0 ? 'Truques' : `Círculo ${level}`}
                  </div>
                  <div className="p-2 space-y-1.5">
                    {spells.map((spell) => (
                      <div key={spell.id} className="flex items-center justify-between bg-black/40 border border-[#1a2a1a] rounded px-2 py-1.5">
                        <span className="text-[12px] uppercase text-gray-200 font-black">{spell.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSpell(spell.id)}
                          className="text-red-500/70 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-black/35 border border-[#1a2a1a] rounded-xl p-3">
          <h4 className="text-[#f1e5ac] text-[12px] font-black uppercase mb-3">Catálogo</h4>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar magia..."
            className="w-full bg-black/50 border border-[#1a2a1a] rounded px-2 py-2 text-[12px] text-white mb-3 outline-none focus:border-[#00ff66]/40"
          />

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {groupedCatalog.length === 0 ? (
              <p className="text-[12px] uppercase text-[#4a5a4a]">Nenhuma magia encontrada.</p>
            ) : (
              groupedCatalog.map(([level, spells]) => (
                <div key={level} className="border border-[#1a2a1a] rounded-lg bg-black/30">
                  <div className="px-2 py-1.5 border-b border-[#1a2a1a] text-[11px] font-black uppercase text-[#00ff66]">
                    {level === 0 ? 'Truques' : `Círculo ${level}`}
                  </div>
                  <div className="p-2 space-y-1.5">
                    {spells.map((spell) => {
                      const already = learnedNames.has(spell.nome.toLowerCase());
                      const allowed = spell.nivel_magia === 0 || spell.nivel_magia <= maxSpellLevel;

                      return (
                        <div key={spell.id} className="flex items-center justify-between gap-2 bg-black/40 border border-[#1a2a1a] rounded px-2 py-1.5">
                          <div className="min-w-0">
                            <p className="text-[12px] uppercase text-gray-200 font-black truncate">{spell.nome}</p>
                            <p className="text-[10px] uppercase text-[#4a5a4a] truncate">{spell.escola} • {spell.tempo_conjuracao} • {spell.alcance}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSpell(spell)}
                            disabled={already || !allowed}
                            className={`shrink-0 rounded border px-2 py-1 text-[10px] font-black uppercase ${already || !allowed
                              ? 'border-[#1a2a1a] text-[#4a5a4a]'
                              : 'border-[#00ff66]/40 text-[#00ff66] hover:bg-[#00ff66]/10'}`}
                          >
                            {already ? 'ok' : !allowed ? 'lvl' : <Plus size={12} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
