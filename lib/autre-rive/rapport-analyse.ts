import { readCanonicalRapportsAnalyse, saveCanonicalRapportsAnalyse } from "./storage";
import type { RapportAnalyse } from "./types";

// Phase 6 d'IMP-001 (SR-D-001, Décision 5) — garantit la règle métier que la
// structure de types seule ne peut pas imposer : un rapport déjà stocké
// n'est jamais modifié ni remplacé. storage.ts reste un CRUD brut (comme pour
// RelationDossier/ScoreAssessment) ; ce module porte la règle d'immuabilité.

// Ajoute un rapport canonique au stockage append-only. Refuse explicitement
// tout id déjà présent — un rapport ne peut jamais être remplacé, seulement
// ajouté (Décision 5 : « chaque nouvelle analyse complète crée un nouveau
// rapport ; les anciens ne sont jamais recalculés ni réécrits »).
export function addCanonicalRapportAnalyse(rapport: RapportAnalyse): boolean {
  const existing = readCanonicalRapportsAnalyse();

  if (existing.some((current) => current.id === rapport.id)) {
    throw new Error(
      `Un rapport avec l'id "${rapport.id}" existe déjà : un RapportAnalyse ne peut jamais être remplacé, seulement ajouté (SR-D-001, Décision 5).`,
    );
  }

  return saveCanonicalRapportsAnalyse([rapport, ...existing]);
}
