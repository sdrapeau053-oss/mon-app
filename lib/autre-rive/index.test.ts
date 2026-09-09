import { describe, expect, it } from "vitest";

// Historique (Phase 1 → Phase 8 d'IMP-001) : ce fichier s'est d'abord appelé
// zzdebug.test.ts, créé comme test de diagnostic temporaire pendant la
// Phase 1 pour comprendre un échec de storage.test.ts. Sa suppression avait
// échoué (permission refusée sur le dépôt monté) ; plutôt que de laisser un
// fichier de débogage sans valeur, son contenu avait été remplacé par un
// test minimal légitime. Renommé en index.test.ts en Phase 8, une fois
// l'environnement redevenu capable d'un renommage sûr (mv a réussi là où rm
// échouait encore) — dette consignée dans les Phases 1 à 7 maintenant
// résolue.
//
// Vérifie que la frontière publique du module (lib/autre-rive/index.ts,
// SR-D-001 Décision 1) réexporte bien les éléments que les écrans migrés
// consomment désormais via "@/lib/autre-rive".
import {
  addImportedConversation,
  importerContenu,
  readImportedConversations,
} from "./index";

describe("lib/autre-rive/index (frontière publique, Phase 1 IMP-001)", () => {
  it("réexporte les fonctions de storage.ts consommées par les écrans migrés", () => {
    expect(typeof readImportedConversations).toBe("function");
    expect(typeof addImportedConversation).toBe("function");
  });

  it("réexporte les fonctions d'import-orchestrator.ts consommées par les écrans migrés", () => {
    expect(typeof importerContenu).toBe("function");
  });
});
