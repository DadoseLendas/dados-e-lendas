"use client";

import { X, Save } from "lucide-react";

export type AbilityScores = {
  str: string;
  dex: string;
  con: string;
  int: string;
  wis: string;
  cha: string;
};

export type TokenSheet = {
  name: string;
  size_category: string;
  type: string;
  alignment: string;
  armorClass: string;
  hitPoints: string;
  speed: string;
  abilities: AbilityScores;
  saves: AbilityScores;
  skills: Record<string, string>;
  damageResistances: string;
  conditionImmunities: string;
  senses: string;
  languages: string;
  challengeRating: string;
  xp: string;
  abilitiesText: string;
  actionsText: string;
};

const abilityLabels: { key: keyof AbilityScores; label: string }[] = [
  { key: "str", label: "FOR" },
  { key: "dex", label: "DES" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "SAB" },
  { key: "cha", label: "CAR" },
];

interface TokenSheetPanelProps {
  isOpen: boolean;
  isDM: boolean;
  loading: boolean;
  saving: boolean;
  tokenLabel?: string;
  sheet: TokenSheet;
  onChange: (next: TokenSheet) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function TokenSheetPanel({
  isOpen,
  isDM,
  loading,
  saving,
  tokenLabel,
  sheet,
  onChange,
  onSave,
  onClose,
}: TokenSheetPanelProps) {
  if (!isOpen) return null;

  const updateField = (key: keyof TokenSheet, value: string) => {
    onChange({ ...sheet, [key]: value });
  };

  const updateAbility = (group: "abilities" | "saves", key: keyof AbilityScores, value: string) => {
    onChange({
      ...sheet,
      [group]: {
        ...sheet[group],
        [key]: value,
      },
    });
  };

  const updateSkill = (key: string, value: string) => {
    onChange({
      ...sheet,
      skills: {
        ...sheet.skills,
        [key]: value,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-start bg-black/35 p-4" onMouseDown={onClose}>
      <div className="ml-20 sm:ml-24 md:ml-28 lg:ml-32" />
      <div
        className="flex w-[520px] max-w-[calc(100vw-2rem)] max-h-[86vh] flex-col overflow-hidden rounded-[22px] border border-[#3a2b1b] bg-gradient-to-b from-[#120e09] via-[#0e0c09] to-[#0a0907] shadow-[0_0_40px_rgba(0,0,0,0.85)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#3a2b1b] bg-[#100c08] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c59d5f]">Stat Block</p>
            <p className="truncate text-[11px] uppercase text-[#6d5b46]">{tokenLabel ? tokenLabel : "Token selecionado"}</p>
          </div>
          <button onClick={onClose} className="text-[#6d5b46] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-white">
          {loading && <p className="text-[11px] uppercase text-[#6d5b46]">Carregando ficha...</p>}

          {!loading && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3">
                <label className="block text-[11px] uppercase tracking-[0.25em] text-[#c59d5f]">
                  Nome
                  <input
                    value={sheet.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-lg border border-[#2f2215] bg-black/40 px-3 py-2 text-[15px] font-black uppercase tracking-wide text-[#f5e6c1] outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase text-[#6d5b46]">
                  <label>
                    Tamanho
                    <input
                      value={sheet.size_category}
                      onChange={(e) => updateField("size_category", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                  <label>
                    Tipo
                    <input
                      value={sheet.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                  <label>
                    Tendencia
                    <input
                      value={sheet.alignment}
                      onChange={(e) => updateField("alignment", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#c59d5f]">CA</p>
                  <input
                    value={sheet.armorClass}
                    onChange={(e) => updateField("armorClass", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </div>
                <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#c59d5f]">PV</p>
                  <input
                    value={sheet.hitPoints}
                    onChange={(e) => updateField("hitPoints", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </div>
                <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#c59d5f]">Desloc.</p>
                  <input
                    value={sheet.speed}
                    onChange={(e) => updateField("speed", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Atributos</p>
                  <span className="text-[9px] uppercase text-[#6d5b46]">mod</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {abilityLabels.map((item) => (
                    <label key={`attr-${item.key}`} className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-2 text-center">
                      <span className="text-[10px] font-black uppercase text-[#c59d5f]">{item.label}</span>
                      <input
                        value={sheet.abilities[item.key]}
                        onChange={(e) => updateAbility("abilities", item.key, e.target.value)}
                        disabled={!isDM}
                        className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Testes de Resistencia</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {abilityLabels.map((item) => (
                      <label key={`save-${item.key}`} className="text-[10px] uppercase text-[#6d5b46]">
                        {item.label}
                        <input
                          value={sheet.saves[item.key]}
                          onChange={(e) => updateAbility("saves", item.key, e.target.value)}
                          disabled={!isDM}
                          className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Defesas e Sentidos</p>
                <div className="mt-2 space-y-2">
                  <label className="block text-[10px] uppercase text-[#6d5b46]">
                    Resistencia a dano
                    <input
                      value={sheet.damageResistances}
                      onChange={(e) => updateField("damageResistances", e.target.value)}
                      disabled={!isDM}
                      placeholder="separe por virgula"
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                  <label className="block text-[10px] uppercase text-[#6d5b46]">
                    Imunidade a condicao
                    <input
                      value={sheet.conditionImmunities}
                      onChange={(e) => updateField("conditionImmunities", e.target.value)}
                      disabled={!isDM}
                      placeholder="separe por virgula"
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                  <label className="block text-[10px] uppercase text-[#6d5b46]">
                    Sentidos
                    <input
                      value={sheet.senses}
                      onChange={(e) => updateField("senses", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                  <label className="block text-[10px] uppercase text-[#6d5b46]">
                    Idiomas
                    <input
                      value={sheet.languages}
                      onChange={(e) => updateField("languages", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-[10px] uppercase text-[#6d5b46]">
                  Nivel de desafio
                  <input
                    value={sheet.challengeRating}
                    onChange={(e) => updateField("challengeRating", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </label>
                <label className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-[10px] uppercase text-[#6d5b46]">
                  XP
                  <input
                    value={sheet.xp}
                    onChange={(e) => updateField("xp", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Habilidades</p>
                <textarea
                  value={sheet.abilitiesText}
                  onChange={(e) => updateField("abilitiesText", e.target.value)}
                  disabled={!isDM}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-2 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                />
              </div>

              <div className="rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Acoes</p>
                <textarea
                  value={sheet.actionsText}
                  onChange={(e) => updateField("actionsText", e.target.value)}
                  disabled={!isDM}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-2 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#1a2a1a] bg-[#0a120a] px-4 py-3">
          {!isDM && <span className="text-[10px] uppercase text-[#4a5a4a]">Somente mestre edita</span>}
          {isDM && (
            <button
              onClick={onSave}
              disabled={saving || loading}
              className="ml-auto inline-flex items-center gap-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00ff66] hover:bg-[#00ff66]/20 disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Salvando" : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
