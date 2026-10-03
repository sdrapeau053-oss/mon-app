// LIVRE-P1B — fermeture : états d'affichage D2 de `/vue-double` (écart 2) et
// changement de chapitre avec modifications non persistées (écart 3, option B).
// Les tests EXÉCUTENT la logique (lib/vue-double-sauvegarde.ts) avec les vraies
// primitives P1B, sur IndexedDB simulé.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContenuChapitreConcurrentError,
  ContenuChapitreEcritureError,
  SeanceEditionInvalideError,
  ajouterChapitreCanonique,
  cleContenuChapitre,
  lireChapitresStructureParTome,
  lireContenuChapitre,
  lireTexteChapitre,
  ouvrirSeanceEditionChapitre,
  sauvegarderTexteChapitre,
  type ChapitreStructureLu,
} from "./manuscript-chapters";
import {
  HistoriqueChapitreError,
  __definirDepotHistoriquePourTests,
  depotHistoriqueIndexedDB,
  type DepotHistoriqueChapitres,
} from "./manuscript-chapters-history";
import {
  ETAT_SAUVEGARDE_INITIAL,
  changerChapitreAvecProtection,
  confirmationRequiseAvantChangement,
  etatApresIssue,
  etatApresSaisie,
  executerSauvegarde,
  libelleSauvegarde,
  type EtatSauvegarde,
  type IssueSauvegarde,
} from "./vue-double-sauvegarde";

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

const T0 = Date.parse("2026-10-03T10:00:00.000Z");
const MINUTE = 60 * 1000;

function a(ms: number) {
  vi.setSystemTime(T0 + ms);
}

function depotPilote() {
  const etat = { lectureEnEchec: false, ecritureEnEchec: false };
  const depot: DepotHistoriqueChapitres = {
    listerVersions: async (id) => {
      if (etat.lectureEnEchec) throw new HistoriqueChapitreError("Lecture de l'historique impossible.");
      return depotHistoriqueIndexedDB.listerVersions(id);
    },
    ajouterVersion: async (id, contenu, motif) => {
      if (etat.ecritureEnEchec) throw new HistoriqueChapitreError("Écriture de l'historique impossible.");
      return depotHistoriqueIndexedDB.ajouterVersion(id, contenu, motif);
    },
  };
  __definirDepotHistoriquePourTests(depot);
  return etat;
}

// Reproduit le câblage de `/vue-double` (état de sauvegarde, sauvegarde
// programmée/en cours, changement de chapitre) avec la logique testée.
function editeurSimule(confirmerReponse: boolean) {
  const ed = {
    actif: null as ChapitreStructureLu | null,
    texte: "",
    etat: ETAT_SAUVEGARDE_INITIAL as EtatSauvegarde,
    jeton: null as string | null,
    saisie: 0,
    programmee: null as null | (() => Promise<void>),
    enCours: null as null | Promise<void>,
    confirmations: [] as string[],
    chargements: 0,
  };
  function ouvrir(ch: ChapitreStructureLu) {
    ed.actif = ch;
    ed.jeton = ouvrirSeanceEditionChapitre(ch);
    ed.texte = lireTexteChapitre(ch);
    ed.etat = ETAT_SAUVEGARDE_INITIAL;
    ed.chargements += 1;
  }
  function taper(val: string) {
    ed.texte = val;
    ed.etat = etatApresSaisie(ed.etat);
    ed.saisie += 1;
    const cible = ed.actif as ChapitreStructureLu;
    const jeton = ed.jeton;
    const numero = ed.saisie;
    ed.programmee = () => {
      const p = executerSauvegarde(() => sauvegarderTexteChapitre(cible, val, jeton)).then((issue) => {
        ed.etat = etatApresIssue(ed.etat, issue, ed.saisie === numero);
      });
      ed.enCours = p;
      p.finally(() => {
        if (ed.enCours === p) ed.enCours = null;
      });
      return p;
    };
  }
  // Fin du délai de 600 ms.
  async function minuteur() {
    const lancer = ed.programmee;
    ed.programmee = null;
    await lancer?.();
  }
  async function terminerSauvegardes() {
    for (;;) {
      if (ed.programmee) {
        await minuteur();
        continue;
      }
      if (ed.enCours) {
        await ed.enCours;
        continue;
      }
      return;
    }
  }
  function changer(ch: ChapitreStructureLu) {
    return changerChapitreAvecProtection({
      terminerSauvegardes,
      lireEtat: () => ed.etat,
      titreChapitreActuel: ed.actif?.titre ?? "",
      confirmer: (message) => {
        ed.confirmations.push(message);
        return confirmerReponse;
      },
      changer: () => ouvrir(ch),
    });
  }
  return { ed, ouvrir, taper, minuteur, changer };
}

function chapitresDuTome2(): ChapitreStructureLu[] {
  return lireChapitresStructureParTome()[2];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  a(0);
  (globalThis as { indexedDB?: unknown }).indexedDB = new IDBFactory();
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
  __definirDepotHistoriquePourTests(null);
  const memoryLocalStorage = createMemoryLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
  (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  ajouterChapitreCanonique(2, "Chapitre courant");
  ajouterChapitreCanonique(2, "Autre chapitre");
});

afterEach(() => {
  vi.useRealTimers();
  __definirDepotHistoriquePourTests(null);
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
});

function courantEtAutre() {
  const liste = chapitresDuTome2();
  const courant = liste.find((c) => c.titre === "Chapitre courant") as ChapitreStructureLu;
  const autre = liste.find((c) => c.titre === "Autre chapitre") as ChapitreStructureLu;
  localStorage.setItem(cleContenuChapitre(courant.id as string), "texte persisté");
  localStorage.setItem(cleContenuChapitre(autre.id as string), "texte de l'autre chapitre");
  return { courant, autre };
}

describe("Écart 2 — état technique → état affiché (D2)", () => {
  const refus: Array<[string, unknown, string]> = [
    ["historique indisponible", new HistoriqueChapitreError("Lecture de l'historique impossible."), "Non sauvegardé — historique indisponible"],
    [
      "quota IndexedDB",
      new HistoriqueChapitreError("Écriture de l'historique impossible.", new DOMException("plein", "QuotaExceededError")),
      "Non sauvegardé — stockage plein",
    ],
    ["quota localStorage", new ContenuChapitreEcritureError(new DOMException("plein", "QuotaExceededError")), "Non sauvegardé — stockage plein"],
    ["concurrence", new ContenuChapitreConcurrentError(), `Non sauvegardé — ${new ContenuChapitreConcurrentError().message}`],
    ["séance invalide", new SeanceEditionInvalideError(), `Non sauvegardé — ${new SeanceEditionInvalideError().message}`],
  ];

  it.each(refus)("A. refus (%s) → jamais « Sauvegardé »", async (_cas, erreur, attendu) => {
    const issue = await executerSauvegarde(async () => {
      throw erreur;
    });
    const etat = etatApresIssue(etatApresSaisie(ETAT_SAUVEGARDE_INITIAL), issue, true);
    expect(libelleSauvegarde(etat)).toEqual({ texte: attendu, ton: "erreur" });
    expect(etat.sauvegarde).toBe(false);
  });

  it("A. après un refus, une réussite d'une frappe plus ancienne n'affiche pas « Sauvegardé » ; seule la dernière frappe le peut", () => {
    const refusee: IssueSauvegarde = { erreur: "historique indisponible", historiqueIndisponible: true };
    const reussie: IssueSauvegarde = { erreur: null, historiqueIndisponible: false };
    let etat = etatApresIssue(etatApresSaisie(ETAT_SAUVEGARDE_INITIAL), refusee, true);
    etat = etatApresSaisie(etat);
    expect(libelleSauvegarde(etat).texte).toBe("Non sauvegardé — historique indisponible");
    etat = etatApresIssue(etat, reussie, false);
    expect(libelleSauvegarde(etat).texte).toBe("Non sauvegardé — historique indisponible");
    etat = etatApresIssue(etat, reussie, true);
    expect(libelleSauvegarde(etat)).toEqual({ texte: "Sauvegardé", ton: "ok" });
  });

  it("A. une réussite puis un refus plus tardif : l'échec prime", () => {
    let etat = etatApresIssue(etatApresSaisie(ETAT_SAUVEGARDE_INITIAL), { erreur: null, historiqueIndisponible: false }, true);
    etat = etatApresIssue(etat, { erreur: "stockage plein", historiqueIndisponible: false }, false);
    expect(libelleSauvegarde(etat).texte).toBe("Non sauvegardé — stockage plein");
  });

  it("B/C. vraies primitives : repli READ-FAILURE → avertissement ; blocage → « Non sauvegardé — historique indisponible »", async () => {
    const pilote = depotPilote();
    const { courant } = courantEtAutre();
    const { ed, ouvrir, taper, minuteur } = editeurSimule(false);
    ouvrir(courant);
    taper("version 1");
    await minuteur(); // lecture réussie, archive de début de séance : T_confirmé établi
    expect(libelleSauvegarde(ed.etat)).toEqual({ texte: "Sauvegardé", ton: "ok" });

    pilote.lectureEnEchec = true;
    a(1 * MINUTE);
    taper("version 2");
    expect(libelleSauvegarde(ed.etat).texte).toBe("…");
    await minuteur();
    expect(libelleSauvegarde(ed.etat)).toEqual({ texte: "Sauvegardé — historique indisponible", ton: "avertissement" });
    expect(lireContenuChapitre(courant.id as string)).toBe("version 2");

    a(6 * MINUTE);
    taper("version 3");
    await minuteur();
    expect(libelleSauvegarde(ed.etat)).toEqual({ texte: "Non sauvegardé — historique indisponible", ton: "erreur" });
    expect(lireContenuChapitre(courant.id as string)).toBe("version 2");
  });
});

describe("Écart 3 — changement de chapitre avec modifications non persistées (option B)", () => {
  async function scenarioRefus(confirmer: boolean) {
    const pilote = depotPilote();
    const { courant, autre } = courantEtAutre();
    const sim = editeurSimule(confirmer);
    sim.ouvrir(courant);
    pilote.lectureEnEchec = true; // aucun T_confirmé : la sauvegarde sera refusée
    sim.taper("modifications non persistées");
    await sim.minuteur();
    expect(lireContenuChapitre(courant.id as string)).toBe("texte persisté");
    return { ...sim, courant, autre, pilote };
  }

  it("1. sauvegarde refusée puis tentative de changement → confirmation demandée, explicite", async () => {
    const { ed, changer, autre } = await scenarioRefus(false);
    await changer(autre);
    expect(ed.confirmations).toHaveLength(1);
    expect(ed.confirmations[0]).toContain("« Chapitre courant » ne sont pas sauvegardées");
    expect(ed.confirmations[0]).toContain("historique indisponible");
    expect(ed.confirmations[0]).toContain("abandonnera ces modifications non sauvegardées");
  });

  it("2/3/4. confirmation refusée → chapitre, texte et état « Non sauvegardé » conservés, rien n'est chargé", async () => {
    const { ed, changer, autre, courant } = await scenarioRefus(false);
    const chargementsAvant = ed.chargements;
    expect(await changer(autre)).toBe("annule");
    expect(ed.actif?.id).toBe(courant.id);
    expect(ed.texte).toBe("modifications non persistées");
    expect(libelleSauvegarde(ed.etat).texte).toBe("Non sauvegardé — historique indisponible");
    expect(ed.chargements).toBe(chargementsAvant);
  });

  it("5/6. confirmation acceptée → changement explicite, nouveau chapitre chargé", async () => {
    const { ed, changer, autre } = await scenarioRefus(true);
    expect(await changer(autre)).toBe("change");
    expect(ed.confirmations).toHaveLength(1);
    expect(ed.actif?.id).toBe(autre.id);
    expect(ed.texte).toBe("texte de l'autre chapitre");
    expect(libelleSauvegarde(ed.etat).texte).toBe("Sauvegardé");
  });

  it("7. sauvegarde réussie avant le changement (IndexedDB revenu) → aucune confirmation", async () => {
    const { ed, changer, autre, taper, minuteur, pilote, courant } = await scenarioRefus(false);
    pilote.lectureEnEchec = false;
    taper("modifications enfin sauvegardées");
    await minuteur();
    expect(lireContenuChapitre(courant.id as string)).toBe("modifications enfin sauvegardées");
    expect(await changer(autre)).toBe("change");
    expect(ed.confirmations).toHaveLength(0);
  });

  it("7. sauvegarde programmée réussie lancée au changement → aucune confirmation, texte persisté", async () => {
    depotPilote();
    const { courant, autre } = courantEtAutre();
    const { ed, ouvrir, taper, changer } = editeurSimule(false);
    ouvrir(courant);
    taper("texte encore en attente");
    expect(await changer(autre)).toBe("change");
    expect(ed.confirmations).toHaveLength(0);
    expect(lireContenuChapitre(courant.id as string)).toBe("texte encore en attente");
  });

  it("8. aucune modification → changement normal, sans confirmation", async () => {
    depotPilote();
    const { courant, autre } = courantEtAutre();
    const { ed, ouvrir, changer } = editeurSimule(false);
    ouvrir(courant);
    expect(await changer(autre)).toBe("change");
    expect(ed.confirmations).toHaveLength(0);
    expect(ed.texte).toBe("texte de l'autre chapitre");
  });

  it("9. sauvegarde encore programmée qui échoue au changement → pas d'abandon silencieux", async () => {
    const pilote = depotPilote();
    const { courant, autre } = courantEtAutre();
    const { ed, ouvrir, taper, changer } = editeurSimule(false);
    ouvrir(courant);
    pilote.lectureEnEchec = true;
    taper("frappe juste avant le clic"); // le délai de 600 ms n'est pas écoulé
    expect(await changer(autre)).toBe("annule");
    expect(ed.confirmations).toHaveLength(1);
    expect(ed.actif?.id).toBe(courant.id);
    expect(ed.texte).toBe("frappe juste avant le clic");
    expect(libelleSauvegarde(ed.etat).texte).toBe("Non sauvegardé — historique indisponible");
  });

  it("9. sauvegarde déjà en cours au moment du clic → attendue avant toute décision", async () => {
    const ordre: string[] = [];
    let terminer: () => void = () => undefined;
    const enCours = new Promise<void>((resolve) => {
      terminer = resolve;
    });
    const resultat = changerChapitreAvecProtection({
      terminerSauvegardes: async () => {
        ordre.push("attente");
        await enCours;
        ordre.push("issue");
      },
      lireEtat: () => {
        ordre.push("lecture");
        return { sauvegarde: false, erreur: "historique indisponible", historiqueIndisponible: true };
      },
      titreChapitreActuel: "X",
      confirmer: () => {
        ordre.push("confirmation");
        return false;
      },
      changer: () => ordre.push("changement"),
    });
    await Promise.resolve();
    expect(ordre).toEqual(["attente"]);
    terminer();
    expect(await resultat).toBe("annule");
    expect(ordre).toEqual(["attente", "issue", "lecture", "confirmation"]);
  });

  it("10. aucun impact sur T_confirmé ni sur l'historique : après refus, le repli reste disponible", async () => {
    const pilote = depotPilote();
    const { courant, autre } = courantEtAutre();
    const { ed, ouvrir, taper, minuteur, changer } = editeurSimule(false);
    ouvrir(courant);
    taper("version 1");
    await minuteur(); // T_confirmé établi
    const historiqueAvant = await depotHistoriqueIndexedDB.listerVersions(courant.id as string);
    pilote.lectureEnEchec = true;
    a(1 * MINUTE);
    taper("version 2");
    await minuteur();
    expect(libelleSauvegarde(ed.etat).texte).toBe("Sauvegardé — historique indisponible");
    // Pas de confirmation : le texte est persisté (repli autorisé).
    pilote.lectureEnEchec = false;
    await changer(autre);
    expect(ed.confirmations).toHaveLength(0);
    expect(await depotHistoriqueIndexedDB.listerVersions(courant.id as string)).toEqual(historiqueAvant);
  });

  it("10. refus de changer : même séance, T_confirmé intact, repli toujours autorisé", async () => {
    const pilote = depotPilote();
    const { courant, autre } = courantEtAutre();
    const { ed, ouvrir, taper, minuteur, changer } = editeurSimule(false);
    ouvrir(courant);
    taper("version 1");
    await minuteur();
    const jeton = ed.jeton;
    // Échec ponctuel (autre cause) puis refus de changer de chapitre.
    const setItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k: string, v: string) => {
      if (k === cleContenuChapitre(courant.id as string)) throw new DOMException("plein", "QuotaExceededError");
      setItem(k, v);
    };
    taper("version 2");
    await minuteur();
    expect(libelleSauvegarde(ed.etat).texte).toBe("Non sauvegardé — stockage plein");
    expect(await changer(autre)).toBe("annule");
    expect(ed.jeton).toBe(jeton);
    localStorage.setItem = setItem;
    pilote.lectureEnEchec = true;
    a(1 * MINUTE);
    taper("version 3");
    await minuteur();
    expect(libelleSauvegarde(ed.etat).texte).toBe("Sauvegardé — historique indisponible");
    expect(lireContenuChapitre(courant.id as string)).toBe("version 3");
  });

  it("règle de décision : confirmation requise si et seulement si le texte n'est pas confirmé persisté", () => {
    expect(confirmationRequiseAvantChangement(ETAT_SAUVEGARDE_INITIAL)).toBe(false);
    expect(confirmationRequiseAvantChangement({ sauvegarde: true, erreur: null, historiqueIndisponible: true })).toBe(false);
    expect(confirmationRequiseAvantChangement({ sauvegarde: false, erreur: "stockage plein", historiqueIndisponible: false })).toBe(true);
    expect(confirmationRequiseAvantChangement({ sauvegarde: false, erreur: null, historiqueIndisponible: false })).toBe(true);
  });
});

describe("Branchement de /vue-double sur la logique testée (complément)", () => {
  it("la page délègue l'état, le libellé et le changement de chapitre au module testé", () => {
    const vue = readFileSync(fileURLToPath(new URL("../app/vue-double/page.tsx", import.meta.url)), "utf8");
    expect(vue).toContain('from "@/lib/vue-double-sauvegarde"');
    expect(vue).toContain("const libelle = libelleSauvegarde(etatSauvegarde);");
    expect(vue).toContain("{libelle.texte}");
    expect(vue).toContain("executerSauvegarde(() => sauvegarderTexteChapitre(cible, val, jeton))");
    expect(vue).toContain("etatApresIssue(etat, issue, saisie.current === numeroSaisie)");
    expect(vue).toContain("await changerChapitreAvecProtection({");
    expect(vue).toContain("confirmer: (message) => window.confirm(message)");
    expect(vue).toContain("onClick={() => changerChapitre(ch)}");
    expect(vue.match(/setChapitreActifLu\(/g)?.length).toBe(2); // chargement initial + changement protégé
  });
});
