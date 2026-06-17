"use client";

import { useState, useEffect } from "react";
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
  autoFillLoading?: boolean;
  autoFillSource?: string | null;
  autoFillError?: string | null;
  tokenLabel?: string;
  sheet: TokenSheet;
  campaignId?: string;
  onChange: (next: TokenSheet) => void;
  onSave: () => void;
  onAutoFill?: () => Promise<boolean> | boolean;
  onAutoFillFromText?: (text: string) => Promise<boolean> | boolean;
  onClose: () => void;
  onClearAutoFillError?: () => void;
  onRollDice?: (formula: string, isSecret: boolean, mode?: "normal" | "advantage" | "disadvantage") => void;
}

export default function TokenSheetPanel({
  isOpen,
  isDM,
  loading,
  saving,
  autoFillLoading,
  autoFillSource,
  autoFillError,
  tokenLabel,
  sheet,
  campaignId,
  onChange,
  onSave,
  onAutoFill,
  onAutoFillFromText,
  onClose,
  onClearAutoFillError,
  onRollDice,
}: TokenSheetPanelProps) {
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState<"menu" | "manual">("menu");
  const [manualText, setManualText] = useState("");
  const [editingSection, setEditingSection] = useState<"abilities" | "actions" | null>(null);

  const getModifier = (val: string) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : Math.floor((num - 10) / 2);
  };

  const getSaveVal = (val: string) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  };

  const formatMod = (num: number) => (num >= 0 ? `+${num}` : `${num}`);

  // Fecha o stat block ao pressionar Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const abilities = sheet.abilities ?? {
    str: "",
    dex: "",
    con: "",
    int: "",
    wis: "",
    cha: "",
  };

  const saves = sheet.saves ?? {
    str: "",
    dex: "",
    con: "",
    int: "",
    wis: "",
    cha: "",
  };

  const updateField = (key: keyof TokenSheet, value: string) => {
    const nextSheet = { ...sheet, [key]: value };
    onChange(nextSheet);
  };

  const updateAbility = (group: "abilities" | "saves", key: keyof AbilityScores, value: string) => {
    const nextSheet = {
      ...sheet,
      [group]: {
        ...(sheet[group] ?? {
          str: "",
          dex: "",
          con: "",
          int: "",
          wis: "",
          cha: "",
        }),
        [key]: value,
      },
    };
    onChange(nextSheet);
  };

  const updateSkill = (key: string, value: string) => {
    const nextSheet = {
      ...sheet,
      skills: {
        ...sheet.skills,
        [key]: value,
      },
    };
    onChange(nextSheet);
  };

  const closeAutoFillModal = () => {
    setShowAutoFillModal(false);
    setAutoFillMode("menu");
    setManualText("");
  };

  const handleManualAutoFill = async () => {
    if (!onAutoFillFromText) return;

    const text = manualText.trim();
    if (!text) return;

    const success = await onAutoFillFromText(text);
    if (success) {
      closeAutoFillModal();
    }
  };

  const renderRichTextBlock = (text: string, placeholder: string) => {
    const content = text.trim();
    if (!content) {
      return <p className="text-[12px] italic text-[#5f4e3c]">{placeholder}</p>;
    }

    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return (
      <div className="space-y-2 text-[13px] leading-6 text-[#f2e7cf]">
        {lines.map((line, index) => {
          const isHeading = /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'’\-\.]+\./.test(line) || /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'’\-]+$/.test(line);
          return (
            <p key={`${line}-${index}`} className={isHeading ? "font-bold text-[#f5dca1]" : ""}>
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-start bg-black/35 p-4" onMouseDown={onClose}>
      <div className="ml-20 sm:ml-24 md:ml-28 lg:ml-32" />
      <div
        className="flex w-[460px] max-w-[calc(100vw-2rem)] max-h-[80vh] flex-col overflow-hidden rounded-[22px] border border-[#3a2b1b] bg-gradient-to-b from-[#120e09] via-[#0e0c09] to-[#0a0907] shadow-[0_0_40px_rgba(0,0,0,0.85)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#3a2b1b] bg-[#100c08] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c59d5f]">Stat Block</p>
            <p className="truncate text-[11px] uppercase text-[#6d5b46]">{tokenLabel ? tokenLabel : "Token selecionado"}</p>
            {autoFillSource && (
              <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-[#4a5a4a]">Fonte: {autoFillSource}</p>
            )}
          </div>
          <button onClick={onClose} className="text-[#6d5b46] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-white">
          {loading && <p className="text-[11px] uppercase text-[#6d5b46]">Carregando ficha...</p>}

          {!loading && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
                    {/* Tamanhos pré-definidos D&D 5e (Notion: deixar como fixos) */}
                    <select
                      value={sheet.size_category}
                      onChange={(e) => updateField("size_category", e.target.value)}
                      disabled={!isDM}
                      className="mt-1 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                    >
                      <option value="">—</option>
                      <option value="Tiny">Tiny</option>
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                      <option value="Huge">Huge</option>
                      <option value="Gargantuan">Gargantuan</option>
                    </select>
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
                <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#c59d5f]">CA</p>
                  <input
                    value={sheet.armorClass}
                    onChange={(e) => updateField("armorClass", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </div>
                <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#c59d5f]">PV</p>
                  <input
                    value={sheet.hitPoints}
                    onChange={(e) => updateField("hitPoints", e.target.value)}
                    disabled={!isDM}
                    className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                  />
                </div>
                <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-3 text-center">
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
                  {abilityLabels.map((item) => {
                    const mod = getModifier(abilities[item.key]);
                    return (
                      <div key={`attr-${item.key}`} className="relative rounded-xl border border-[#3a2b1b] bg-[#120f0b] p-2 text-center group">
                        <label>
                          <span className="text-[10px] font-black uppercase text-[#c59d5f]">{item.label}</span>
                          <input
                            value={abilities[item.key]}
                            onChange={(e) => updateAbility("abilities", item.key, e.target.value)}
                            disabled={!isDM}
                            className="mt-2 w-full rounded-md border border-[#2f2215] bg-black/40 px-2 py-1.5 text-center text-[13px] font-black text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                          />
                        </label>
                        {/* Botão de Rolar Dado + Exibição do Modificador */}
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <span className="text-[10px] font-bold text-[#6d5b46]">{formatMod(mod)}</span>
                          {onRollDice && (
                            <button
                              type="button"
                              onClick={() => onRollDice(`1d20${formatMod(mod)}`, false)}
                              className="text-[12px] opacity-50 hover:opacity-100 hover:scale-110 transition-all text-[#c59d5f]"
                              title={`Rolar Teste de ${item.label}`}
                            >
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f5dca1]">Traços</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.18em] text-[#6d5b46]">habilidades passivas</span>
                      {isDM && (
                        <button
                          type="button"
                          onClick={() => setEditingSection(editingSection === "abilities" ? null : "abilities")}
                          className="rounded-full border border-[#3a2b1b] bg-black/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f5dca1] hover:border-[#c59d5f]/60 hover:bg-black/50"
                        >
                          {editingSection === "abilities" ? "Fechar" : "Editar"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-[#2f2215] bg-black/30 px-3 py-3 min-h-[160px]">
                    {renderRichTextBlock(sheet.abilitiesText, "Descreva os traços especiais do monstro. Ex.: Regeneração, Faro Aguçado, Resistência...")}
                  </div>
                  {isDM && editingSection === "abilities" && (
                    <textarea
                      value={sheet.abilitiesText}
                      onChange={(e) => updateField("abilitiesText", e.target.value)}
                      rows={7}
                      className="mt-3 w-full rounded-xl border border-[#2f2215] bg-black/40 px-3 py-3 text-[13px] leading-6 text-white outline-none focus:border-[#c59d5f]"
                      placeholder="Faro Aguçado. O troll tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f5dca1]">Ações</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.18em] text-[#6d5b46]">ataques e habilidades</span>
                      {isDM && (
                        <button
                          type="button"
                          onClick={() => setEditingSection(editingSection === "actions" ? null : "actions")}
                          className="rounded-full border border-[#3a2b1b] bg-black/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f5dca1] hover:border-[#c59d5f]/60 hover:bg-black/50"
                        >
                          {editingSection === "actions" ? "Fechar" : "Editar"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-[#2f2215] bg-black/30 px-3 py-3 min-h-[220px]">
                    {renderRichTextBlock(sheet.actionsText, "Descreva as ações do monstro. Ex.: Ataques Múltiplos, Mordida, Garra...")}
                  </div>
                  {isDM && editingSection === "actions" && (
                    <textarea
                      value={sheet.actionsText}
                      onChange={(e) => updateField("actionsText", e.target.value)}
                      rows={10}
                      className="mt-3 w-full rounded-xl border border-[#2f2215] bg-black/40 px-3 py-3 text-[13px] leading-6 text-white outline-none focus:border-[#c59d5f]"
                      placeholder="Ataques Múltiplos. O troll realiza três ataques: um com sua mordida e dois com suas garras."
                    />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c59d5f]">Testes de Resistência</p>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#6d5b46]">salvaguardas</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {abilityLabels.map((item) => {
                    const saveMod = getSaveVal(saves[item.key]);
                    return (
                      <div key={`save-${item.key}`} className="rounded-lg border border-[#2f2215] bg-black/30 px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="block text-[9px] font-black tracking-[0.16em] text-[#c59d5f] uppercase">{item.label}</span>
                          {onRollDice && saves[item.key] && (
                            <button
                              type="button"
                              onClick={() => onRollDice(`1d20${formatMod(saveMod)}`, false)}
                              className="text-[11px] opacity-60 hover:opacity-100 transition-opacity text-[#c59d5f]"
                              title={`Rolar Salvaguarda de ${item.label}`}
                            >
                            </button>
                          )}
                        </div>
                        <input
                          value={saves[item.key]}
                          onChange={(e) => updateAbility("saves", item.key, e.target.value)}
                          disabled={!isDM}
                          className="w-full rounded-md border border-[#2f2215] bg-black/40 px-1.5 py-1 text-center text-[11px] text-white outline-none focus:border-[#c59d5f] disabled:opacity-60"
                        />
                      </div>
                    );
                  })}
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

            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#1a2a1a] bg-[#0a120a] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isDM && <span className="text-[10px] uppercase text-[#4a5a4a]">Somente mestre edita</span>}
            {isDM && onAutoFill && (
              <button
                onClick={() => setShowAutoFillModal(true)}
                disabled={loading || saving || autoFillLoading}
                className="inline-flex items-center gap-2 rounded-md border border-[#c59d5f]/30 bg-[#c59d5f]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#f5e6c1] hover:bg-[#c59d5f]/20 disabled:opacity-60"
              >
                {autoFillLoading ? 'Auto-preenchendo' : 'Auto-preencher'}
              </button>
            )}
          </div>
          {isDM && (
            <button
              type="button"
              onClick={() => onSave()}
              disabled={saving || loading || autoFillLoading}
              className="ml-auto inline-flex items-center gap-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00ff66] hover:bg-[#00ff66]/20 disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Salvando" : "Salvar"}
            </button>
          )}
        </div>
      </div>

      {showAutoFillModal && isDM && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4" onMouseDown={closeAutoFillModal}>
          <div
            className="w-full max-w-[720px] rounded-[22px] border border-[#3a2b1b] bg-[#100c08] shadow-[0_0_40px_rgba(0,0,0,0.85)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#3a2b1b] px-4 py-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c59d5f]">Auto-preencher</p>
                <p className="mt-1 text-[11px] uppercase text-[#6d5b46]">Escolha entre o livro PDF ou colar o texto da ficha</p>
              </div>
              <button onClick={closeAutoFillModal} className="text-[#6d5b46] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 text-white">
              {autoFillError && (
                <div className="rounded-xl border border-[#8f4d4d] bg-[#281111] px-3 py-2 text-[11px] text-[#ffb6b6]">
                  {autoFillError}
                </div>
              )}

              {autoFillMode === "menu" && (
                <div className="grid gap-3">
                  {/* Opção "Livro PDF" removida: não funcional (Notion: "Retirar essa opção já que não funciona") */}
                  <button
                    type="button"
                    onClick={() => setAutoFillMode("manual")}
                    className="rounded-2xl border border-[#3a2b1b] bg-[#120f0b] p-4 text-left transition hover:border-[#00ff66]/40 hover:bg-[#10140f]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00ff66]">Copiar e colar</p>
                    <p className="mt-2 text-sm font-semibold text-[#f5e6c1]">Colar o bloco do monstro</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#6d5b46]">Cole o texto com nome, CA, PV, atributos, sentidos e ações. Eu preencho os campos direto.</p>
                  </button>
                </div>
              )}

              {autoFillMode === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00ff66]">
                      Texto da ficha
                      <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        rows={16}
                        placeholder={"Cole aqui o bloco completo, por exemplo:\nTROLL\nGigante Grande, caótico e mau\nClasse de Armadura 15 (armadura natural)..."}
                        className="mt-2 w-full rounded-2xl border border-[#2f2215] bg-black/40 px-3 py-3 text-[12px] leading-relaxed text-white outline-none focus:border-[#00ff66]/60"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoFillMode("menu")}
                      className="rounded-md border border-[#3a2b1b] bg-[#120f0b] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#f5e6c1] hover:bg-[#1a150f]"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleManualAutoFill}
                      disabled={!manualText.trim() || autoFillLoading}
                      className="rounded-md border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#00ff66] hover:bg-[#00ff66]/20 disabled:opacity-60"
                    >
                      {autoFillLoading ? "Preenchendo..." : "Preencher com texto"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}