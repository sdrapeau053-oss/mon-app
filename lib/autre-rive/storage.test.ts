import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addImportedConversation,
  deleteImportBundle,
  getAutreRiveStorageSummary,
  readImportedConversations,
} from "./storage";
import type { ConversationImportée } from "./types";

// Phase 1 d'IMP-001 (SR-D-001, Décision 6) : tests de non-régression sur des
// fonctions déjà existantes de storage.ts, avant toute modification de
// structure métier. Ces tests ne couvrent ni RelationDossier (Décision 4),
// ni les scores (Décisions 2 et 3), ni RapportAnalyse (Décision 5) : ce
// travail relève des phases suivantes d'IMP-001, pas de la Phase 1.
//
// storage.ts lit/écrit via window.localStorage et se protège explicitement
// de son absence (rendu serveur). Ces tests utilisent donc un remplacement
// minimal de window.localStorage en mémoire, sans dépendance supplémentaire
// (pas de jsdom), pour rester dans la portée strictement nécessaire.

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function buildConversation(id: string): ConversationImportée {
  return {
    dateImport: "2026-08-01T00:00:00.000Z",
    dateModification: "2026-08-01T00:00:00.000Z",
    dossierId: "dossier-1",
    hash: `hash-${id}`,
    id,
    langue: "fr",
    messages: [],
    niveauAnalyse: "données_insuffisantes",
    nombreMessages: 0,
    nombreMessagesJaune: 0,
    nombreMessagesOrange: 0,
    nombreMessagesRouge: 0,
    nombreMessagesValidés: 0,
    nomFichier: `conversation-${id}.txt`,
    prêtPourAnalyse: false,
    source: "txt",
    statut: "importé",
    version: "1",
  };
}

describe("lib/autre-rive/storage (non-régression, Phase 1 IMP-001)", () => {
  beforeEach(() => {
    // storage.ts vérifie la disponibilité via `window.localStorage`, mais lit
    // et écrit ensuite via l'identifiant global `localStorage` (comme dans un
    // vrai navigateur, où les deux pointent vers le même objet). Node ne fait
    // pas cette liaison automatiquement : les deux globals doivent donc être
    // posés explicitement pour reproduire fidèlement le comportement réel.
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("addImportedConversation enregistre une conversation et la rend lisible", () => {
    const conversation = buildConversation("conv-1");

    const stored = addImportedConversation(conversation);

    expect(stored).toBe(true);
    expect(readImportedConversations()).toEqual([conversation]);
  });

  it("addImportedConversation ajoute les nouvelles conversations sans perdre les existantes", () => {
    addImportedConversation(buildConversation("conv-1"));
    addImportedConversation(buildConversation("conv-2"));

    const ids = readImportedConversations().map((conversation) => conversation.id);

    expect(ids).toEqual(["conv-2", "conv-1"]);
  });

  it("deleteImportBundle retire une conversation et met à jour le résumé de stockage", () => {
    addImportedConversation(buildConversation("conv-1"));
    addImportedConversation(buildConversation("conv-2"));

    const deleted = deleteImportBundle("conv-1");

    expect(deleted).toBe(true);
    expect(readImportedConversations().map((conversation) => conversation.id)).toEqual(["conv-2"]);
    expect(getAutreRiveStorageSummary().conversations).toBe(1);
  });

  it("readImportedConversations reste sûr côté serveur (pas de window disponible)", () => {
    delete (globalThis as { window?: unknown }).window;

    expect(readImportedConversations()).toEqual([]);
  });
});
