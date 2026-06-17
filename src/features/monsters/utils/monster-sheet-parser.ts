export type MonsterSheetDraft = {
  name: string;
  size_category: string;
  type: string;
  alignment: string;
  armorClass: string;
  hitPoints: string;
  speed: string;
  abilities: {
    str: string;
    dex: string;
    con: string;
    int: string;
    wis: string;
    cha: string;
  };
  saves: {
    str: string;
    dex: string;
    con: string;
    int: string;
    wis: string;
    cha: string;
  };
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

const EMPTY_ABILITIES = {
  str: "",
  dex: "",
  con: "",
  int: "",
  wis: "",
  cha: "",
};

const RAW_SIZE_TO_CATEGORY: Record<string, string> = {
  MINUSCULO: "Tiny",
  PEQUENO: "Small",
  MEDIO: "Medium",
  GRANDE: "Large",
  ENORME: "Huge",
  COLOSSAL: "Gargantuan",
  TINY: "Tiny",
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  HUGE: "Huge",
  GARGANTUAN: "Gargantuan",
};

const normalizeForMatch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const makeSearchAliases = (tokenName: string) => {
  const raw = tokenName.trim();
  const base = raw.split(/[_-]/)[0] || raw;
  const aliases = [raw, base, raw.replace(/[_-]+/g, " ")]
    .map(normalizeForMatch)
    .filter(Boolean);

  return Array.from(new Set(aliases));
};

const findBestStartLine = (lines: string[], tokenName: string) => {
  const aliases = makeSearchAliases(tokenName);
  let fallbackIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeForMatch(lines[index]);
    if (!normalizedLine) continue;

    if (!aliases.some((alias) => normalizedLine.includes(alias))) {
      continue;
    }

    if (fallbackIndex === -1) fallbackIndex = index;

    const window = normalizeForMatch(lines.slice(index, index + 8).join(" "));
    if (/(CLASSE DE ARMADURA|PONTOS DE VIDA|DESLOCAMENTO|FOR \d|DES \d|CON \d)/.test(window)) {
      return index;
    }
  }

  return fallbackIndex;
};

const pickField = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

const lineMatchesAlias = (normalizedLine: string, alias: string) => {
  const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s|[:=])${escapedAlias}(\\s|[:=]|$)`);
  return pattern.test(normalizedLine);
};

const findFieldByAliases = (lines: string[], aliases: string[], patterns: RegExp[]) => {
  const normalizedAliases = aliases.map(normalizeForMatch);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim() ?? "";
    if (!rawLine) continue;

    const normalizedLine = normalizeForMatch(rawLine);

    for (const alias of normalizedAliases) {
      if (!lineMatchesAlias(normalizedLine, alias)) continue;

      const normalizedRemainder = normalizedLine.replace(new RegExp(`^.*?(?:^|\\s|[:=])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|[:=]|$)\\s*`, "i"), "").trim();
      if (normalizedRemainder) {
        return normalizedRemainder;
      }

      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex].trim();
        if (!nextLine) continue;
        const nextNormalized = normalizeForMatch(nextLine);
        if (normalizedAliases.some((candidate) => nextNormalized.startsWith(candidate))) continue;
        return nextLine;
      }
    }
  }

  return pickField(lines.join("\n"), patterns);
};

const findStatLineValue = (lines: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeForMatch);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim() ?? "";
    if (!rawLine) continue;

    const normalizedLine = normalizeForMatch(rawLine);
    const matchedAlias = normalizedAliases.find((alias) => lineMatchesAlias(normalizedLine, alias));
    if (!matchedAlias) continue;

    const suffix = normalizedLine.replace(new RegExp(`^.*?(?:^|\\s|[:=])${matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|[:=]|$)\\s*`, "i"), "").trim();
    if (suffix) {
      return suffix;
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim();
      if (!nextLine) continue;
      const nextNormalized = normalizeForMatch(nextLine);
      if (normalizedAliases.some((candidate) => nextNormalized.startsWith(candidate))) continue;
      return nextLine;
    }
  }

  return "";
};

const parseAbilityScoreFromLines = (lines: string[], label: string) => findStatLineValue(lines, [label]).match(/\d+/)?.[0] ?? "";

const parseSizeAndType = (headerLine: string) => {
  const normalizedHeader = normalizeForMatch(headerLine);
  const headerParts = headerLine.split(",").map((part) => part.trim()).filter(Boolean);
  const firstPart = headerParts[0] ?? headerLine.trim();

  let detectedSize = "";
  let sizeWord = "";
  for (const rawSize of Object.keys(RAW_SIZE_TO_CATEGORY)) {
    if (normalizedHeader.includes(rawSize)) {
      detectedSize = RAW_SIZE_TO_CATEGORY[rawSize];
      sizeWord = rawSize;
      break;
    }
  }

  let type = firstPart;
  if (sizeWord) {
    const typeWithoutSize = firstPart.replace(new RegExp(`\\b${sizeWord}\\b`, "i"), "").trim();
    type = typeWithoutSize || firstPart;
  }

  const alignment = headerParts.slice(1).join(", ");

  return {
    size_category: detectedSize,
    type,
    alignment,
  };
};

const parseXp = (challengeRatingLine: string) => {
  const xpMatch = challengeRatingLine.match(/(\d[\d\., ]*)\s*XP/i);
  if (!xpMatch?.[1]) return "";
  return xpMatch[1].replace(/[\.\s]/g, "").replace(",", ".");
};

export const buildEmptyMonsterSheet = (name = ""): MonsterSheetDraft => ({
  name,
  size_category: "",
  type: "",
  alignment: "",
  armorClass: "",
  hitPoints: "",
  speed: "",
  abilities: { ...EMPTY_ABILITIES },
  saves: { ...EMPTY_ABILITIES },
  skills: {},
  damageResistances: "",
  conditionImmunities: "",
  senses: "",
  languages: "",
  challengeRating: "",
  xp: "",
  abilitiesText: "",
  actionsText: "",
});

export const parseMonsterSheetFromText = (text: string, tokenName: string): MonsterSheetDraft | null => {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const startLine = findBestStartLine(lines, tokenName);

  if (startLine < 0) return null;

  const blockLines = lines.slice(startLine, Math.min(lines.length, startLine + 180));
  const blockText = blockLines.join("\n");
  const blockTextUpper = normalizeForMatch(blockText);

  const nameLine = blockLines.find((line) => normalizeForMatch(line).includes(normalizeForMatch(tokenName))) ?? blockLines[0] ?? tokenName;
  const headerLine = blockLines.slice(1).find((line) => line.trim()) ?? "";
  const { size_category, type, alignment } = parseSizeAndType(headerLine);

  const challengeRatingLine = findStatLineValue(blockLines, ["Nível de Desafio", "Nivel de Desafio", "CR"])
    || pickField(blockText, [
      /N[íi]vel de Desafio\s+([^\n]+)/i,
      /Nivel de Desafio\s+([^\n]+)/i,
      /CR\s+([^\n]+)/i,
    ]);

  const actionsIndex = blockText.indexOf("AÇÕES") >= 0 ? blockText.indexOf("AÇÕES") : blockText.indexOf("ACOES");
  const challengeIndex = blockText.search(/N[ÍI]VEL DE DESAFIO|NIVEL DE DESAFIO|\bCR\b/i);

  const challengeSnippet = challengeIndex >= 0 ? blockText.slice(challengeIndex) : blockText;
  const abilitiesTextStartMatch = challengeSnippet.match(/N[íi]vel de Desafio[^\n]*\n?/i) ?? challengeSnippet.match(/Nivel de Desafio[^\n]*\n?/i) ?? challengeSnippet.match(/\bCR\b[^\n]*\n?/i);
  const abilitiesTextStart = abilitiesTextStartMatch ? (challengeIndex >= 0 ? challengeIndex + abilitiesTextStartMatch[0].length : abilitiesTextStartMatch[0].length) : -1;

  const abilitiesText = abilitiesTextStart >= 0 && actionsIndex > abilitiesTextStart
    ? blockText.slice(abilitiesTextStart, actionsIndex).trim()
    : "";

  const actionsText = actionsIndex >= 0
    ? blockText.slice(actionsIndex + (blockTextUpper.includes("AÇÕES") ? "AÇÕES".length : "ACOES".length)).trim()
    : "";

  const sheet: MonsterSheetDraft = {
    name: nameLine.trim(),
    size_category,
    type,
    alignment,
    armorClass: findStatLineValue(blockLines, ["Classe de Armadura", "CA", "Armor Class"]) || findFieldByAliases(blockLines, ["Classe de Armadura", "CA", "Armor Class"], [
      /Classe de Armadura\s*[:=]?\s*([^\n]+)/i,
      /\bCA\b\s*[:=]?\s*([^\n]+)/i,
      /Armor Class\s*[:=]?\s*([^\n]+)/i,
    ]),
    hitPoints: findStatLineValue(blockLines, ["Pontos de Vida", "PV", "Hit Points"]) || findFieldByAliases(blockLines, ["Pontos de Vida", "PV", "Hit Points"], [
      /Pontos de Vida\s*[:=]?\s*([^\n]+)/i,
      /\bPV\b\s*[:=]?\s*([^\n]+)/i,
      /Hit Points\s*[:=]?\s*([^\n]+)/i,
    ]),
    speed: pickField(blockText, [
      /Deslocamento\s+([^\n]+)/i,
      /Speed\s+([^\n]+)/i,
    ]),
    abilities: {
      str: parseAbilityScoreFromLines(blockLines, "FOR"),
      dex: parseAbilityScoreFromLines(blockLines, "DES"),
      con: parseAbilityScoreFromLines(blockLines, "CON"),
      int: parseAbilityScoreFromLines(blockLines, "INT"),
      wis: parseAbilityScoreFromLines(blockLines, "SAB"),
      cha: parseAbilityScoreFromLines(blockLines, "CAR"),
    },
    saves: { ...EMPTY_ABILITIES },
    skills: {},
    damageResistances: pickField(blockText, [
      /Resist(?:e|ê)ncia a dano\s+([^\n]+)/i,
      /Damage Resistances\s+([^\n]+)/i,
    ]),
    conditionImmunities: pickField(blockText, [
      /Imunidade a condicao\s+([^\n]+)/i,
      /Imunidade a condição\s+([^\n]+)/i,
      /Condition Immunities\s+([^\n]+)/i,
    ]),
    senses: pickField(blockText, [
      /Sentidos\s+([^\n]+)/i,
      /Senses\s+([^\n]+)/i,
    ]),
    languages: pickField(blockText, [
      /Idiomas\s+([^\n]+)/i,
      /Languages\s+([^\n]+)/i,
    ]),
    challengeRating: challengeRatingLine,
    xp: parseXp(challengeRatingLine),
    abilitiesText,
    actionsText,
  };

  return sheet;
};

const findLineByAliases = (lines: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeForMatch);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim() ?? "";
    if (!rawLine) continue;

    const normalizedLine = normalizeForMatch(rawLine);
    const matchedAlias = normalizedAliases.find((alias) => lineMatchesAlias(normalizedLine, alias));
    if (!matchedAlias) continue;

    const suffix = normalizedLine.replace(new RegExp(`^.*?(?:^|\\s|[:=])${matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|[:=]|$)\\s*`, "i"), "").trim();
    if (suffix) {
      return { index, value: suffix };
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim();
      if (!nextLine) continue;
      const nextNormalized = normalizeForMatch(nextLine);
      if (normalizedAliases.some((candidate) => nextNormalized.startsWith(candidate))) continue;
      return { index, value: nextLine };
    }

    return { index, value: "" };
  }

  return null;
};

const extractClipboardField = (lines: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeForMatch);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim() ?? "";
    if (!rawLine) continue;

    const normalizedLine = normalizeForMatch(rawLine);
    const matchedAlias = normalizedAliases.find((alias) => lineMatchesAlias(normalizedLine, alias));
    if (!matchedAlias) continue;

    for (const alias of aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const directMatch = rawLine.match(new RegExp(`(?:^|\\s|[:=])${escapedAlias}(?:\\s|[:=]|$)\\s*[:=]?\\s*(.+)$`, "i"));
      if (directMatch?.[1]?.trim()) {
        return directMatch[1].trim();
      }
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim();
      if (!nextLine) continue;
      const nextNormalized = normalizeForMatch(nextLine);
      if (normalizedAliases.some((candidate) => lineMatchesAlias(nextNormalized, candidate))) continue;
      return nextLine;
    }
  }

  return "";
};

const extractClipboardScore = (lines: string[], aliases: string[]) => {
  const value = extractClipboardField(lines, aliases);
  const match = value.match(/(\d+)/);
  return match?.[1] ?? "";
};

const extractBlockAfterSection = (lines: string[], startAliases: string[], endAliases: string[]) => {
  const startMatch = findLineByAliases(lines, startAliases);
  if (!startMatch) return "";

  let endIndex = lines.length;
  for (let index = startMatch.index + 1; index < lines.length; index += 1) {
    const normalizedLine = normalizeForMatch(lines[index]);
    if (!normalizedLine) continue;
    if (endAliases.some((alias) => lineMatchesAlias(normalizedLine, normalizeForMatch(alias)))) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startMatch.index + 1, endIndex).join("\n").trim();
};

const parseScoreByAlias = (lines: string[], aliases: string[]) => {
  const found = findLineByAliases(lines, aliases);
  if (!found) return "";
  const match = found.value.match(/(\d+)/);
  return match?.[1] ? match[1] : "";
};

const parseTextBlockLoose = (text: string): MonsterSheetDraft => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");

  const name = lines[0] ?? "";
  const headerLine = lines[1] ?? "";
  const { size_category, type, alignment } = parseSizeAndType(headerLine);

  const acLine = extractClipboardField(lines, ["Classe de Armadura", "CA", "Armor Class"]);
  const hpLine = extractClipboardField(lines, ["Pontos de Vida", "PV", "Hit Points"]);
  const speedLine = extractClipboardField(lines, ["Deslocamento", "Speed"]);
  const challengeLine = extractClipboardField(lines, ["Nível de Desafio", "Nivel de Desafio", "CR"]);
  const sensesLine = extractClipboardField(lines, ["Sentidos", "Senses"]);
  const languagesLine = extractClipboardField(lines, ["Idiomas", "Languages"]);
  const damageResistancesLine = extractClipboardField(lines, ["Resistência a dano", "Resistencia a dano", "Damage Resistances"]);
  const conditionImmunitiesLine = extractClipboardField(lines, ["Imunidade a condição", "Imunidade a condicao", "Condition Immunities"]);

  const actionsStart = findLineByAliases(lines, ["AÇÕES", "ACOES", "ACTIONS"]);
  const challengeStart = findLineByAliases(lines, ["Nível de Desafio", "Nivel de Desafio", "CR"]);
  const abilitiesText = challengeStart && actionsStart
    ? lines.slice(challengeStart.index + 1, actionsStart.index).join("\n").trim()
    : "";
  const actionsText = actionsStart ? lines.slice(actionsStart.index + 1).join("\n").trim() : "";

  const challengeRating = challengeLine;

  return {
    name,
    size_category,
    type,
    alignment,
    armorClass: acLine,
    hitPoints: hpLine,
    speed: speedLine,
    abilities: {
      str: extractClipboardScore(lines, ["FOR"]),
      dex: extractClipboardScore(lines, ["DES"]),
      con: extractClipboardScore(lines, ["CON"]),
      int: extractClipboardScore(lines, ["INT"]),
      wis: extractClipboardScore(lines, ["SAB"]),
      cha: extractClipboardScore(lines, ["CAR"]),
    },
    saves: { ...EMPTY_ABILITIES },
    skills: {},
    damageResistances: damageResistancesLine ?? pickField(fullText, [
      /Resist(?:e|ê)ncia a dano\s+([^\n]+)/i,
      /Damage Resistances\s+([^\n]+)/i,
    ]),
    conditionImmunities: conditionImmunitiesLine ?? pickField(fullText, [
      /Imunidade a condicao\s+([^\n]+)/i,
      /Imunidade a condição\s+([^\n]+)/i,
      /Condition Immunities\s+([^\n]+)/i,
    ]),
    senses: sensesLine ?? pickField(fullText, [
      /Sentidos\s+([^\n]+)/i,
      /Senses\s+([^\n]+)/i,
    ]),
    languages: languagesLine ?? pickField(fullText, [
      /Idiomas\s+([^\n]+)/i,
      /Languages\s+([^\n]+)/i,
    ]),
    challengeRating,
    xp: parseXp(challengeRating),
    abilitiesText,
    actionsText,
  };
};

export const parseMonsterSheetFromClipboardText = (text: string): MonsterSheetDraft | null => {
  const cleanedText = text.trim();
  if (!cleanedText) return null;

  const parsed = parseTextBlockLoose(cleanedText);
  if (!parsed.name) return null;
  return parsed;
};

const normalizePdfUrl = (url: string) => {
  try {
    // Google Docs (/document/d/)
    const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch?.[1]) {
      return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
    }

    // Google Drive files (/file/d/)
    if (url.includes("drive.google.com")) {
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileMatch?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
      }
    }

    if (url.includes("dropbox.com")) {
      return url.replace("dl=0", "raw=1");
    }

    return url;
  } catch {
    return url;
  }
};

export const extractMonsterSheetFromPdf = async (pdfUrl: string, tokenName: string) => {
  const pdfModule = await import("pdf-parse");
  const { PDFParse } = pdfModule as any;

  if (!PDFParse) {
    throw new Error("Biblioteca de PDF indisponivel no servidor");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(normalizePdfUrl(pdfUrl), {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot)" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar PDF (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer } as any);
    await parser.load();
    const text: string = await parser.getText();

    if (!text?.trim()) {
      throw new Error("O PDF nao retornou texto pesquisavel");
    }

    return parseMonsterSheetFromText(text, tokenName);
  } finally {
    clearTimeout(timeoutId);
  }
};