import {
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

const BIOGRAPHIE_STORAGE_KEY = "biographie-projet";

export type BiographieValidationResult = {
  valid: boolean;
  readable: boolean;
  errors: string[];
  warnings: string[];
};

export type BiographieInventoryChapitre = {
  tomeId: string;
  tomeTitre: string;
  chapitreId: string;
  chapitreTitre: string;
  texteBrut: string;
  versionRedigee: string;
  hasTexteBrut: boolean;
  hasVersionRedigee: boolean;
  texteBrutLength: number;
  versionRedigeeLength: number;
  scoreGlobal?: number;
  date?: string;
  isEmpty: boolean;
  warnings: string[];
};

export type BiographieInventoryTome = {
  tomeId: string;
  tomeTitre: string;
  chapitres: BiographieInventoryChapitre[];
  warnings: string[];
};

export type BiographieInventory = {
  projetId: string;
  projetTitre: string;
  tomes: BiographieInventoryTome[];
  chapitres: BiographieInventoryChapitre[];
  invalidEntries: string[];
  warnings: string[];
};

export type BiographieMigrationMatch = {
  historicalChapitreId: string;
  historicalTitle: string;
  canonicalChapitreId: string;
  canonicalTitle: string;
  confidence: "élevée" | "moyenne" | "faible";
  reasons: string[];
};

export type BiographieMigrationConflict = {
  type: "chapitre_invalide" | "titre_duplique" | "correspondance_ambigue" | "contenu_divergent";
  severity: "critique" | "élevée" | "moyenne" | "faible";
  message: string;
  affectedIds: string[];
};

export type BiographieMigrationComparison = {
  matches: BiographieMigrationMatch[];
  conflicts: BiographieMigrationConflict[];
  orphanHistoricalChapterIds: string[];
  unmatchedCanonicalChapterIds: string[];
  recommendations: string[];
};

export type BiographieMigrationAuditReport = {
  validation: BiographieValidationResult;
  inventory: BiographieInventory;
  comparison: BiographieMigrationComparison;
  backupPayload: string;
  summary: {
    nombreTomesHistoriques: number;
    nombreChapitresHistoriques: number;
    nombreChapitresVides: number;
    nombreConflits: number;
    nombreCorrespondancesProbables: number;
    readyForMigration: boolean;
  };
};

export type BiographieMigrationDecision = "MIGRATION_SAFE" | "PARTIAL_ONLY" | "BLOCKED";

export type BiographieMigrationDecisionReport = {
  decision: BiographieMigrationDecision;
  canMigrate: string[];
  requiresHumanValidation: string[];
  blockedItems: string[];
  reasons: string[];
  recommendedNextAction: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function optionalDate(record: Record<string, unknown>): string | undefined {
  for (const key of ["updatedAt", "updated_at", "derniereModification", "dateModification", "date"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chapterNumber(value: string): number | null {
  const match = value.match(/(?:chapitre|chap)[-_ ]?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function similarity(left: string, right: string): number {
  const tokens = (value: string) => new Set(normalized(value).split(/\s+/).filter((item) => item.length > 2));
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const common = [...leftTokens].filter((item) => rightTokens.has(item)).length;
  return common / new Set([...leftTokens, ...rightTokens]).size;
}

export function readBiographieProjetRaw(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BIOGRAPHIE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function validateBiographieProjet(raw: unknown): BiographieValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(raw)) {
    return { valid: false, readable: raw !== null && raw !== undefined, errors: ["biographie-projet doit être un objet lisible."], warnings };
  }
  if (typeof raw.id !== "string" || !raw.id.trim()) errors.push("Le projet historique n'a pas d'id valide.");
  if (typeof raw.titre !== "string" || !raw.titre.trim()) warnings.push("Le projet historique n'a pas de titre valide.");
  if (!Array.isArray(raw.tomes)) {
    errors.push("Le champ tomes doit être un tableau.");
  } else {
    raw.tomes.forEach((tome, tomeIndex) => {
      const tomePath = `tomes[${tomeIndex}]`;
      if (!isRecord(tome)) {
        errors.push(`${tomePath} doit être un objet.`);
        return;
      }
      if (typeof tome.id !== "string" || !tome.id.trim()) errors.push(`${tomePath}.id est invalide.`);
      if (typeof tome.titre !== "string" || !tome.titre.trim()) warnings.push(`${tomePath}.titre est invalide.`);
      if (!Array.isArray(tome.chapitres)) {
        errors.push(`${tomePath}.chapitres doit être un tableau.`);
        return;
      }
      tome.chapitres.forEach((chapter, chapterIndex) => {
        const path = `${tomePath}.chapitres[${chapterIndex}]`;
        if (!isRecord(chapter)) {
          errors.push(`${path} doit être un objet.`);
          return;
        }
        if (typeof chapter.id !== "string" || !chapter.id.trim()) errors.push(`${path}.id est invalide.`);
        if (typeof chapter.titre !== "string" || !chapter.titre.trim()) errors.push(`${path}.titre est invalide.`);
        if (chapter.contenuBrut !== undefined && typeof chapter.contenuBrut !== "string") errors.push(`${path}.contenuBrut doit être une chaîne.`);
        if (chapter.versionRedigee !== undefined && typeof chapter.versionRedigee !== "string") errors.push(`${path}.versionRedigee doit être une chaîne.`);
        if (chapter.historique !== undefined && !Array.isArray(chapter.historique)) warnings.push(`${path}.historique n'est pas un tableau.`);
        if (chapter.score !== null && chapter.score !== undefined && (!isRecord(chapter.score) || typeof chapter.score.scoreGlobal !== "number")) {
          errors.push(`${path}.score.scoreGlobal doit être un nombre.`);
        }
      });
    });
  }
  return { valid: errors.length === 0, readable: true, errors, warnings };
}

function inventoryChapter(chapter: Record<string, unknown>, tomeId: string, tomeTitre: string, path: string): BiographieInventoryChapitre {
  const warnings: string[] = [];
  const chapitreId = stringField(chapter, "id");
  const chapitreTitre = stringField(chapter, "titre");
  const texteBrut = stringField(chapter, "contenuBrut");
  const versionRedigee = stringField(chapter, "versionRedigee");
  const score = isRecord(chapter.score) ? chapter.score.scoreGlobal : undefined;
  if (!chapitreId) warnings.push(`${path}: identifiant manquant.`);
  if (!chapitreTitre) warnings.push(`${path}: titre manquant.`);
  if (chapter.contenuBrut !== undefined && typeof chapter.contenuBrut !== "string") warnings.push(`${path}: texte brut illisible.`);
  if (chapter.versionRedigee !== undefined && typeof chapter.versionRedigee !== "string") warnings.push(`${path}: version rédigée illisible.`);
  return {
    tomeId,
    tomeTitre,
    chapitreId,
    chapitreTitre,
    texteBrut,
    versionRedigee,
    hasTexteBrut: Boolean(texteBrut.trim()),
    hasVersionRedigee: Boolean(versionRedigee.trim()),
    texteBrutLength: texteBrut.length,
    versionRedigeeLength: versionRedigee.length,
    scoreGlobal: typeof score === "number" && Number.isFinite(score) ? score : undefined,
    date: optionalDate(chapter),
    isEmpty: !texteBrut.trim() && !versionRedigee.trim(),
    warnings,
  };
}

export function createBiographieInventory(raw: unknown): BiographieInventory {
  const inventory: BiographieInventory = { projetId: "", projetTitre: "", tomes: [], chapitres: [], invalidEntries: [], warnings: [] };
  if (!isRecord(raw)) {
    inventory.invalidEntries.push("Racine biographie-projet illisible.");
    return inventory;
  }
  inventory.projetId = stringField(raw, "id");
  inventory.projetTitre = stringField(raw, "titre");
  if (!Array.isArray(raw.tomes)) {
    inventory.invalidEntries.push("Le tableau tomes est absent ou illisible.");
    return inventory;
  }
  raw.tomes.forEach((tome, tomeIndex) => {
    const path = `tomes[${tomeIndex}]`;
    if (!isRecord(tome)) {
      inventory.invalidEntries.push(`${path} est illisible.`);
      return;
    }
    const tomeId = stringField(tome, "id");
    const tomeTitre = stringField(tome, "titre");
    const warnings: string[] = [];
    if (!tomeId) warnings.push(`${path}: identifiant manquant.`);
    if (!tomeTitre) warnings.push(`${path}: titre manquant.`);
    const chapitres: BiographieInventoryChapitre[] = [];
    if (!Array.isArray(tome.chapitres)) {
      inventory.invalidEntries.push(`${path}.chapitres est illisible.`);
    } else {
      tome.chapitres.forEach((chapter, chapterIndex) => {
        const chapterPath = `${path}.chapitres[${chapterIndex}]`;
        if (!isRecord(chapter)) {
          inventory.invalidEntries.push(`${chapterPath} est illisible.`);
          return;
        }
        const item = inventoryChapter(chapter, tomeId, tomeTitre, chapterPath);
        chapitres.push(item);
        inventory.chapitres.push(item);
      });
    }
    inventory.tomes.push({ tomeId, tomeTitre, chapitres, warnings });
  });
  if (!inventory.projetId) inventory.warnings.push("Identifiant du projet absent.");
  if (!inventory.projetTitre) inventory.warnings.push("Titre du projet absent.");
  return inventory;
}

type Candidate = { canonical: ChapitreTome1; confidence: "élevée" | "moyenne" | "faible"; reasons: string[]; score: number };

function candidatesFor(chapter: BiographieInventoryChapitre, canon: ChapitreTome1[]): Candidate[] {
  const historicalNumber = chapterNumber(chapter.chapitreId) ?? chapterNumber(chapter.chapitreTitre);
  return canon.map((canonical): Candidate | null => {
    const reasons: string[] = [];
    let score = 0;
    if (normalized(chapter.chapitreTitre) && normalized(chapter.chapitreTitre) === normalized(canonical.titre)) {
      score += 100;
      reasons.push("Titre normalisé identique.");
    } else {
      const value = similarity(chapter.chapitreTitre, canonical.titre);
      if (value >= 0.75) {
        score += 70;
        reasons.push("Forte similarité lexicale du titre.");
      } else if (value >= 0.45) {
        score += 40;
        reasons.push("Similarité lexicale partielle du titre.");
      }
    }
    if (historicalNumber !== null && chapterNumber(canonical.id) === historicalNumber) {
      score += 55;
      reasons.push("Numéro de chapitre identique.");
    }
    if (!score) return null;
    return { canonical, confidence: score >= 100 ? "élevée" : score >= 55 ? "moyenne" : "faible", reasons, score };
  }).filter((item): item is Candidate => item !== null).sort((left, right) => right.score - left.score);
}

function duplicateConflicts(chapters: BiographieInventoryChapitre[]): BiographieMigrationConflict[] {
  const grouped = new Map<string, BiographieInventoryChapitre[]>();
  chapters.forEach((chapter) => {
    const key = normalized(chapter.chapitreTitre);
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), chapter]);
  });
  return [...grouped.entries()].filter(([, items]) => items.length > 1).map(([title, items]) => ({
    type: "titre_duplique",
    severity: "élevée",
    message: `Le titre historique « ${title} » apparaît ${items.length} fois.`,
    affectedIds: items.map((item) => item.chapitreId),
  }));
}

export function compareBiographieWithCanon(inventory: BiographieInventory): BiographieMigrationComparison {
  const canon = lireChapitresTome1DepuisStorage();
  const matches: BiographieMigrationMatch[] = [];
  const conflicts = duplicateConflicts(inventory.chapitres);
  const orphanHistoricalChapterIds: string[] = [];
  const matchedCanonicalIds = new Set<string>();
  inventory.invalidEntries.forEach((entry, index) => conflicts.push({
    type: "chapitre_invalide",
    severity: "critique",
    message: entry,
    affectedIds: [`invalid-${index + 1}`],
  }));
  inventory.chapitres.forEach((chapter) => {
    const candidates = candidatesFor(chapter, canon);
    const best = candidates[0];
    if (!best) {
      orphanHistoricalChapterIds.push(chapter.chapitreId);
      return;
    }
    if (candidates[1]?.score === best.score) {
      conflicts.push({
        type: "correspondance_ambigue",
        severity: "élevée",
        message: `Plusieurs chapitres canoniques correspondent à « ${chapter.chapitreTitre} ».`,
        affectedIds: [chapter.chapitreId, best.canonical.id, candidates[1].canonical.id],
      });
      return;
    }
    matches.push({
      historicalChapitreId: chapter.chapitreId,
      historicalTitle: chapter.chapitreTitre,
      canonicalChapitreId: best.canonical.id,
      canonicalTitle: best.canonical.titre,
      confidence: best.confidence,
      reasons: best.reasons,
    });
    matchedCanonicalIds.add(best.canonical.id);
    const historicalContent = chapter.texteBrut.trim() || chapter.versionRedigee.trim();
    const canonicalContent = best.canonical.contenu.trim();
    if (historicalContent && canonicalContent && historicalContent !== canonicalContent) {
      conflicts.push({
        type: "contenu_divergent",
        severity: "critique",
        message: `Les contenus historique et canonique de « ${chapter.chapitreTitre} » divergent.`,
        affectedIds: [chapter.chapitreId, best.canonical.id],
      });
    }
  });
  const recommendations = [
    "Exporter et vérifier le backup avant toute migration.",
    "Faire approuver chaque correspondance avant toute écriture canonique.",
  ];
  if (conflicts.length) recommendations.push("Résoudre tous les conflits avant la migration.");
  if (orphanHistoricalChapterIds.length) recommendations.push("Classer manuellement les chapitres historiques orphelins.");
  return {
    matches,
    conflicts,
    orphanHistoricalChapterIds,
    unmatchedCanonicalChapterIds: canon.filter((chapter) => !matchedCanonicalIds.has(chapter.id)).map((chapter) => chapter.id),
    recommendations,
  };
}

export function createBiographieBackupPayload(raw: unknown): string {
  try {
    return JSON.stringify({ dateExport: new Date().toISOString(), source: BIOGRAPHIE_STORAGE_KEY, version: 1, raw: raw ?? null }, null, 2);
  } catch {
    return "";
  }
}

export function createBiographieMigrationAudit(): BiographieMigrationAuditReport {
  const raw = readBiographieProjetRaw();
  const validation = validateBiographieProjet(raw);
  const inventory = createBiographieInventory(raw);
  const comparison = compareBiographieWithCanon(inventory);
  const backupPayload = createBiographieBackupPayload(raw);
  const hasCriticalConflict = comparison.conflicts.some((conflict) => conflict.severity === "critique");
  return {
    validation,
    inventory,
    comparison,
    backupPayload,
    summary: {
      nombreTomesHistoriques: inventory.tomes.length,
      nombreChapitresHistoriques: inventory.chapitres.length,
      nombreChapitresVides: inventory.chapitres.filter((chapter) => chapter.isEmpty).length,
      nombreConflits: comparison.conflicts.length,
      nombreCorrespondancesProbables: comparison.matches.length,
      readyForMigration: validation.valid && validation.readable && !hasCriticalConflict && Boolean(backupPayload),
    },
  };
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function matchLabel(match: BiographieMigrationMatch): string {
  return `« ${match.historicalTitle || match.historicalChapitreId} » → « ${match.canonicalTitle} »`;
}

export function createBiographieMigrationDecisionReport(
  report: BiographieMigrationAuditReport,
): BiographieMigrationDecisionReport {
  const canMigrate: string[] = [];
  const requiresHumanValidation: string[] = [];
  const blockedItems: string[] = [];
  const reasons: string[] = [];

  const chapterMap = new Map(
    report.inventory.chapitres.map((chapter) => [chapter.chapitreId, chapter] as const),
  );
  const criticalConflictIds = new Set<string>();
  const reviewConflictIds = new Set<string>();

  report.comparison.conflicts.forEach((conflict) => {
    if (conflict.severity === "critique") {
      pushUnique(blockedItems, conflict.message);
      conflict.affectedIds.forEach((id) => criticalConflictIds.add(id));
      return;
    }
    pushUnique(requiresHumanValidation, conflict.message);
    conflict.affectedIds.forEach((id) => reviewConflictIds.add(id));
  });

  report.validation.errors.forEach((error) => pushUnique(blockedItems, error));
  report.validation.warnings.forEach((warning) => pushUnique(requiresHumanValidation, warning));
  report.inventory.warnings.forEach((warning) => pushUnique(requiresHumanValidation, warning));

  report.comparison.matches.forEach((match) => {
    const label = matchLabel(match);
    const chapter = chapterMap.get(match.historicalChapitreId);
    const isBlocked =
      criticalConflictIds.has(match.historicalChapitreId) ||
      criticalConflictIds.has(match.canonicalChapitreId);
    const needsReview =
      reviewConflictIds.has(match.historicalChapitreId) ||
      reviewConflictIds.has(match.canonicalChapitreId);

    if (isBlocked) return;
    if (chapter?.isEmpty) {
      pushUnique(requiresHumanValidation, `${label} : chapitre historique vide à confirmer avant migration.`);
      return;
    }
    if (match.confidence === "faible" || needsReview) {
      pushUnique(requiresHumanValidation, `${label} : correspondance à valider manuellement.`);
      return;
    }
    pushUnique(canMigrate, label);
  });

  report.comparison.orphanHistoricalChapterIds.forEach((id) => {
    const chapter = chapterMap.get(id);
    pushUnique(
      requiresHumanValidation,
      `Chapitre historique sans équivalent canonique : ${chapter?.chapitreTitre || id}.`,
    );
  });

  report.comparison.unmatchedCanonicalChapterIds.forEach((id) => {
    pushUnique(
      requiresHumanValidation,
      `Chapitre canonique sans source historique correspondante : ${id}.`,
    );
  });

  if (!report.validation.readable) {
    pushUnique(reasons, "Le stockage historique ne peut pas être lu correctement.");
  }
  if (!report.validation.valid) {
    pushUnique(reasons, "La structure du projet historique contient des erreurs bloquantes.");
  }
  if (!report.inventory.chapitres.length) {
    pushUnique(blockedItems, "Aucun chapitre historique lisible n'a été trouvé.");
    pushUnique(reasons, "Le projet historique est impossible à comparer car aucun chapitre exploitable n'est disponible.");
  }
  if (!report.comparison.matches.length && report.inventory.chapitres.length > 0) {
    pushUnique(blockedItems, "Aucune correspondance fiable avec le canon Tome 1 n'a été trouvée.");
    pushUnique(reasons, "La migration est bloquée car les données historiques ne peuvent pas être alignées avec le canon actuel.");
  }
  if (report.comparison.conflicts.some((conflict) => conflict.severity === "critique")) {
    pushUnique(reasons, "Des conflits critiques empêchent toute migration complète.");
  }
  if (requiresHumanValidation.length) {
    pushUnique(reasons, "Certains éléments restent ambigus et demandent une validation humaine.");
  }
  if (!reasons.length) {
    pushUnique(reasons, "Les données sont cohérentes avec le canon actuel.");
  }

  let decision: BiographieMigrationDecision = "MIGRATION_SAFE";
  if (!report.validation.readable || !report.validation.valid || blockedItems.length > 0 && canMigrate.length === 0) {
    decision = "BLOCKED";
  } else if (blockedItems.length > 0 || requiresHumanValidation.length > 0) {
    decision = "PARTIAL_ONLY";
  }

  let recommendedNextAction = "Préparer une migration contrôlée après backup.";
  if (decision === "PARTIAL_ONLY") {
    recommendedNextAction = "Migrer uniquement les chapitres sûrs et valider manuellement les cas ambigus.";
  }
  if (decision === "BLOCKED") {
    recommendedNextAction = "Résoudre les blocages structurels et éditoriaux avant toute tentative de migration.";
  }

  return {
    decision,
    canMigrate,
    requiresHumanValidation,
    blockedItems,
    reasons,
    recommendedNextAction,
  };
}
