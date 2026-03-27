import type { Hint, MicrobleCase } from "./types";

export const GENERIC_E_COLI_ID = "escherichia-coli";
export const EHEC_ID = "enterohemorrhagic-escherichia-coli";
export const ETEC_ID = "enterotoxigenic-escherichia-coli";
export const GENERIC_SHIGELLA_ID = "shigella-species";
export const SHIGELLA_SONNEI_ID = "shigella-sonnei";
export const SHIGELLA_DYSENTERIAE_ID = "shigella-dysenteriae";
export const GENERIC_NTS_ID = "nontyphoidal-salmonella";
export const SALMONELLA_ENTERITIDIS_ID = "salmonella-enteritidis";

const RELATED_ORGANISM_IDS: Record<string, string[]> = {
  [GENERIC_E_COLI_ID]: [EHEC_ID, ETEC_ID],
  [EHEC_ID]: [GENERIC_E_COLI_ID],
  [ETEC_ID]: [GENERIC_E_COLI_ID],
  [GENERIC_SHIGELLA_ID]: [SHIGELLA_SONNEI_ID, SHIGELLA_DYSENTERIAE_ID],
  [SHIGELLA_SONNEI_ID]: [GENERIC_SHIGELLA_ID],
  [SHIGELLA_DYSENTERIAE_ID]: [GENERIC_SHIGELLA_ID],
  [GENERIC_NTS_ID]: [SALMONELLA_ENTERITIDIS_ID],
  [SALMONELLA_ENTERITIDIS_ID]: [GENERIC_NTS_ID],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

type CaseTextSource = {
  hints: Array<Pick<Hint, "text">>;
  explanation: string;
};

function buildCaseText(caseData: CaseTextSource): string {
  return normalizeText(
    [...caseData.hints.map((hint) => hint.text), caseData.explanation].join(" ")
  );
}

export function inferSpecificOrganismId(
  caseData: { organismId: string } & CaseTextSource
): string {
  const text = buildCaseText(caseData);

  if (caseData.organismId === GENERIC_E_COLI_ID) {
    const looksLikeEhec =
      /\b(shiga|vero)\b/.test(text) ||
      /\bhemolytic uremic\b/.test(text) ||
      /\bhus\b/.test(text) ||
      (/\bbloody diarrh/.test(text) &&
        /\bhamburger|ground beef|undercooked beef|local fair\b/.test(text));

    if (looksLikeEhec) {
      return EHEC_ID;
    }

    const looksLikeEtec =
      /\bheat-labile\b/.test(text) ||
      /\bheat-stable\b/.test(text) ||
      /\benterotoxin\b/.test(text) ||
      /\btraveler'?s diarrh/.test(text) ||
      (/\bwatery diarrh/.test(text) &&
        /\bno blood\b/.test(text) &&
        /\bfestival|contaminated water|village\b/.test(text));

    if (looksLikeEtec) {
      return ETEC_ID;
    }
  }

  if (caseData.organismId === GENERIC_SHIGELLA_ID) {
    const looksLikeDysenteriae =
      /\b(shiga|hus|hemolytic uremic)\b/.test(text) ||
      (/\bbloody diarrh|dysentery\b/.test(text) &&
        /\bseizure|toxin\b/.test(text));

    if (looksLikeDysenteriae) {
      return SHIGELLA_DYSENTERIAE_ID;
    }
  }

  return caseData.organismId;
}

export function getAcceptedOrganismIdsForCase(
  caseData: {
    organismId: string;
    acceptedOrganismIds?: string[];
  } & CaseTextSource
): string[] {
  const specificOrganismId = inferSpecificOrganismId(caseData);
  const accepted = new Set(caseData.acceptedOrganismIds ?? []);

  accepted.add(specificOrganismId);
  for (const relatedId of RELATED_ORGANISM_IDS[specificOrganismId] ?? []) {
    accepted.add(relatedId);
  }

  return Array.from(accepted);
}

export function normalizeCaseAnswers(
  caseData: {
    organismId: string;
    acceptedOrganismIds?: string[];
  } & CaseTextSource
): Pick<MicrobleCase, "organismId" | "acceptedOrganismIds"> {
  const organismId = inferSpecificOrganismId(caseData);
  const acceptedOrganismIds = getAcceptedOrganismIdsForCase({
    ...caseData,
    organismId,
  });

  return {
    organismId,
    acceptedOrganismIds:
      acceptedOrganismIds.length > 1 ? acceptedOrganismIds : undefined,
  };
}

export function detectSubtypeMismatchForTarget(
  targetOrganismId: string,
  caseData: CaseTextSource
): string | null {
  const inferred = inferSpecificOrganismId({
    organismId: targetOrganismId,
    hints: caseData.hints,
    explanation: caseData.explanation,
  });

  if (targetOrganismId === GENERIC_E_COLI_ID && inferred === EHEC_ID) {
    return "Generic Escherichia coli target uses enterohemorrhagic E. coli-specific clues";
  }

  if (targetOrganismId === GENERIC_E_COLI_ID && inferred === ETEC_ID) {
    return "Generic Escherichia coli target uses enterotoxigenic E. coli-specific clues";
  }

  if (targetOrganismId === GENERIC_SHIGELLA_ID && inferred === SHIGELLA_DYSENTERIAE_ID) {
    return "Generic Shigella target uses Shigella dysenteriae-specific clues";
  }

  return null;
}
