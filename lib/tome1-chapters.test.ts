import { describe, expect, it } from "vitest";

import {
  appliquerEcritureChapitresTome1,
  creerChapitreTome1Vide,
  fusionnerHistoriqueChapitreTome1,
  normaliserChapitresTome1,
  normaliserHistoriqueChapitreTome1,
  restaurerVersionChapitreTome1,
  type ChapitreTome1,
  type ChapitreTome1Version,
} from "./tome1-chapters";

function chapitre(overrides: Partial<ChapitreTome1> = {}): ChapitreTome1 {
  return { ...creerChapitreTome1Vide(1), ...overrides };
}

describe("LIVRE-P0.1 — historique non destructif des chapitres Tome 1 (ChapitreTome1)", () => {
  it("1. chapitre legacy sans historique reste lisible", () => {
    const legacy = { id: "chapitre-1", titre: "X", bloc: 1, type: "trauma", statut: "écrit", contenu: "Texte legacy" };
    const [normalise] = normaliserChapitresTome1([legacy]);
    expect(normalise.contenu).toBe("Texte legacy");
    expect(normalise.historique).toBeUndefined();
  });

  it("2. aucun historique artificiel inventé au chargement legacy", () => {
    const legacy = { id: "chapitre-3", titre: "Y", bloc: 1, type: "trauma", statut: "écrit", contenu: "Ancien" };
    const normalise = normaliserChapitresTome1([legacy]).find((c) => c.id === "chapitre-3")!;
    expect(normalise.historique).toBeUndefined();
  });

  it("3. première modification archive l'ancien contenu", () => {
    const precedent = chapitre({ contenu: "A" });
    const prochain = chapitre({ contenu: "B" });
    const resultat = fusionnerHistoriqueChapitreTome1(precedent, prochain);
    expect(resultat.contenu).toBe("B");
    expect(resultat.historique?.map((v) => v.contenu)).toEqual(["A"]);
  });

  it("4. deuxième modification conserve toutes les versions précédentes", () => {
    const etatA = chapitre({ contenu: "A" });
    const etatB = fusionnerHistoriqueChapitreTome1(etatA, chapitre({ contenu: "B" }));
    const etatC = fusionnerHistoriqueChapitreTome1(etatB, chapitre({ contenu: "C" }));
    expect(etatC.contenu).toBe("C");
    expect(etatC.historique?.map((v) => v.contenu)).toEqual(["A", "B"]);
  });

  it("5. texte inchangé ne crée aucune version", () => {
    const precedent = fusionnerHistoriqueChapitreTome1(chapitre({ contenu: "A" }), chapitre({ contenu: "B" }));
    const resultat = fusionnerHistoriqueChapitreTome1(precedent, { ...precedent, statut: "écrit" });
    expect(resultat.historique?.map((v) => v.contenu)).toEqual(["A"]);
  });

  it("6. historique existant survit à la normalisation", () => {
    const dejaVersionne = {
      id: "chapitre-4",
      titre: "Z",
      bloc: 1,
      type: "tension",
      statut: "écrit",
      contenu: "C",
      historique: [{ id: "v1", contenu: "A", createdAt: "t1" }],
    };
    const normalise = normaliserChapitresTome1([dejaVersionne]).find((c) => c.id === "chapitre-4")!;
    expect(normalise.historique).toEqual(dejaVersionne.historique);
  });

  it("14. la restauration d'une ancienne version est elle-même non destructive", () => {
    const etatA = chapitre({ contenu: "A" });
    const etatB = fusionnerHistoriqueChapitreTome1(etatA, chapitre({ id: etatA.id, contenu: "B" }));
    const versionAId = etatB.historique?.[0]?.id as string;

    const propose = restaurerVersionChapitreTome1([etatB], etatB.id, versionAId);
    const etatRestaure = appliquerEcritureChapitresTome1([etatB], propose)[0];

    expect(etatRestaure.contenu).toBe("A");
    expect(etatRestaure.historique?.map((v) => v.contenu)).toEqual(["A", "B"]);
  });

  it("appliquerEcritureChapitresTome1 : chapitre neuf, rien à archiver", () => {
    const resultat = appliquerEcritureChapitresTome1([], [chapitre({ contenu: "Premier texte" })]);
    expect(resultat[0].contenu).toBe("Premier texte");
    expect(resultat[0].historique).toBeUndefined();
  });
});

// LIVRE-P0.1B — app/structure-tome-1/page.tsx utilise une interface locale
// StoredChapter, structurellement compatible mais distincte de
// ChapitreTome1. Ces tests reproduisent cette forme minimale.
type StoredChapterMinimal = {
  id: string;
  contenu: string;
  statut: string;
  historique?: ChapitreTome1Version[];
};

function storedChapter(overrides: Partial<StoredChapterMinimal> = {}): StoredChapterMinimal {
  return { id: "chapitre-1", contenu: "", statut: "à écrire", ...overrides };
}

describe("LIVRE-P0.1B — même mécanisme appliqué à une forme StoredChapter", () => {
  it("1/2. StoredChapter legacy sans historique : lisible, aucune fausse version", () => {
    expect(normaliserHistoriqueChapitreTome1(undefined)).toBeUndefined();
    const c = storedChapter({ contenu: "Texte legacy Structure Tome 1" });
    expect(c.historique).toBeUndefined();
  });

  it("7. modification depuis Ecrire maintenant préserve l'ancien contenu (forme ChapitreTome1)", () => {
    const precedent = chapitre({ contenu: "Brouillon initial" });
    const prochain = chapitre({ contenu: "Brouillon révisé" });
    const resultat = fusionnerHistoriqueChapitreTome1(precedent, prochain);
    expect(resultat.historique?.map((v) => v.contenu)).toEqual(["Brouillon initial"]);
  });

  it("8. modification depuis Structure préserve l'ancien contenu (forme StoredChapter)", () => {
    const precedent = storedChapter({ contenu: "Brouillon initial" });
    const prochain = storedChapter({ contenu: "Brouillon révisé" });
    const resultat = fusionnerHistoriqueChapitreTome1(precedent, prochain);
    expect(resultat.contenu).toBe("Brouillon révisé");
    expect(resultat.historique?.map((v) => v.contenu)).toEqual(["Brouillon initial"]);
  });

  it("9. metadata-only save (statut) ne crée pas de version texte", () => {
    const precedent = storedChapter({ contenu: "Texte stable", statut: "brouillon" });
    const prochain = storedChapter({ contenu: "Texte stable", statut: "écrit" });
    const resultat = fusionnerHistoriqueChapitreTome1(precedent, prochain);
    expect(resultat.historique).toBeUndefined();
    expect(resultat.statut).toBe("écrit");
  });

  it("10. réconciliation modifiant un chapitre conserve son ancien contenu", () => {
    const precedents = [
      storedChapter({ id: "chapitre-1", contenu: "Ceci appartient au chapitre 2" }),
      storedChapter({ id: "chapitre-2", contenu: "" }),
    ];
    const prochains = [
      storedChapter({ id: "chapitre-1", contenu: "" }),
      storedChapter({ id: "chapitre-2", contenu: "Ceci appartient au chapitre 2" }),
    ];
    const resultat = appliquerEcritureChapitresTome1(precedents, prochains);
    const ch1 = resultat.find((c) => c.id === "chapitre-1")!;
    expect(ch1.contenu).toBe("");
    expect(ch1.historique?.map((v) => v.contenu)).toEqual(["Ceci appartient au chapitre 2"]);
  });

  it("11. réconciliation multi-chapitres : bons historiques sur les bonnes identités", () => {
    const precedents = [
      storedChapter({ id: "chapitre-1", contenu: "A1", historique: [{ id: "v0", contenu: "A0", createdAt: "t0" }] }),
      storedChapter({ id: "chapitre-2", contenu: "B1", historique: [{ id: "w0", contenu: "B0", createdAt: "t0" }] }),
    ];
    const prochains = [
      storedChapter({ id: "chapitre-1", contenu: "A2", historique: precedents[0].historique }),
      storedChapter({ id: "chapitre-2", contenu: "B2", historique: precedents[1].historique }),
    ];
    const resultat = appliquerEcritureChapitresTome1(precedents, prochains);
    expect(resultat.find((c) => c.id === "chapitre-1")!.historique?.map((v) => v.contenu)).toEqual(["A0", "A1"]);
    expect(resultat.find((c) => c.id === "chapitre-2")!.historique?.map((v) => v.contenu)).toEqual(["B0", "B1"]);
  });

  it("12. scellé → déverrouillé → modification depuis Structure : ancienne version récupérable", () => {
    const scelle = storedChapter({ contenu: "Version scellée", statut: "scellé" });
    const deverrouille = storedChapter({ contenu: "Version scellée", statut: "écrit" });
    const modifie = storedChapter({ contenu: "Version modifiée", statut: "écrit" });
    const apresDeverrouillage = fusionnerHistoriqueChapitreTome1(scelle, deverrouille);
    expect(apresDeverrouillage.historique).toBeUndefined();
    const apresModification = fusionnerHistoriqueChapitreTome1(apresDeverrouillage, modifie);
    expect(apresModification.historique?.map((v) => v.contenu)).toEqual(["Version scellée"]);
  });

  it("13. rechargement localStorage : contenu courant + historique intacts", () => {
    const precedent = storedChapter({ contenu: "A" });
    const modifie = fusionnerHistoriqueChapitreTome1(precedent, storedChapter({ contenu: "B" }));
    const rechargeBrut = JSON.parse(JSON.stringify(modifie));
    expect(rechargeBrut.contenu).toBe("B");
    expect(
      normaliserHistoriqueChapitreTome1(rechargeBrut.historique)?.map((v: ChapitreTome1Version) => v.contenu),
    ).toEqual(["A"]);
  });

  it("15. un historique multi-versions P0.1 survit aux chemins Structure", () => {
    const avecHistoriqueP01 = storedChapter({
      contenu: "C",
      historique: [
        { id: "v1", contenu: "A", createdAt: "t1" },
        { id: "v2", contenu: "B", createdAt: "t2" },
      ],
    });
    const prochain = { ...avecHistoriqueP01, statut: "scellé" };
    const resultat = fusionnerHistoriqueChapitreTome1(avecHistoriqueP01, prochain);
    expect(resultat.historique?.map((v) => v.contenu)).toEqual(["A", "B"]);
  });

  it("16. réconciliation/normalisation répétée sur données stabilisées : idempotente", () => {
    const etat = storedChapter({ contenu: "Stable", historique: [{ id: "v1", contenu: "Ancien", createdAt: "t1" }] });
    const premierPassage = appliquerEcritureChapitresTome1([etat], [etat]);
    const deuxiemePassage = appliquerEcritureChapitresTome1(premierPassage, premierPassage);
    expect(deuxiemePassage[0].historique?.length).toBe(1);
    expect(deuxiemePassage[0].historique).toEqual(etat.historique);
  });
});
