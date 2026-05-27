"use client";

import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/ui/back-link";
import { lireFragments, type Fragment, sauvegarderFragments } from "@/lib/fragments";
import {
  collectMotifs,
  createChapitreId,
  getLinkedFragments,
  SCENES_STORAGE_KEY,
} from "@/lib/narrative-relations";
import { COULEURS_SCENE, LienScene, Scene, StatutScene } from "@/lib/scenes";

const STORAGE_KEY = SCENES_STORAGE_KEY;

const TYPES_SCENE: Scene["typeScene"][] = [
  "douce",
  "tension",
  "pivot",
  "respiration",
  "trauma",
  "transition",
  "iconique",
];

const IMPORTANCES: NonNullable<Scene["importanceSerie"]>[] = [
  "faible",
  "moyenne",
  "forte",
  "iconique",
];

const STATUTS: StatutScene[] = ["brouillon", "confirmée", "gelée"];

const ROLES_TOME: NonNullable<Scene["roleDansTome"]>[] = [
  "installation",
  "montée",
  "rupture",
  "respiration",
  "bascule",
  "clôture",
];

const NIVEAUX_DIALOGUE: NonNullable<Scene["niveauDialogue"]>[] = [
  "aucun",
  "minimal",
  "present",
  "fort",
];

const TYPES_LIEN: LienScene["typeLien"][] = [
  "prepare",
  "repond",
  "miroir",
  "consequence",
  "meme_motif",
];

const LIBELLES_LIEN: Record<LienScene["typeLien"], string> = {
  prepare: "prépare",
  repond: "répond à",
  miroir: "miroir de",
  consequence: "conséquence de",
  meme_motif: "même motif que",
};

const TYPES_TENSION: Scene["typeScene"][] = ["tension", "trauma", "pivot", "iconique"];
const TYPES_RESPIRATION: Scene["typeScene"][] = ["douce", "respiration", "transition"];

const NOTES_SERIE = [1, 2, 3, 4, 5] as const;

function nouvelleScene(): Scene {
  return {
    id: `scene-${Date.now()}`,
    titre: "",
    tome: 1,
    chapitre: 1,
    typeScene: "douce",
    intensite: 2,
    importanceSerie: "moyenne",
    motifs: [],
    personnages: [],
    fragmentIds: [],
    chapitreId: createChapitreId(1, 1),
    tomeId: 1,
    liens: [],
    potentielSerie: {},
    tagsNarratifs: [],
    statut: "brouillon",
  };
}

function noteSerie(value: unknown): Scene["intensite"] {
  const nombre = Number(value);
  return NOTES_SERIE.includes(nombre as (typeof NOTES_SERIE)[number])
    ? (nombre as Scene["intensite"])
    : undefined;
}

function ageNumerique(age?: string) {
  const nombre = age?.match(/\d+/)?.[0];
  return nombre ? Number(nombre) : 0;
}

function moyenneIntensite(liste: Scene[]) {
  const intensites = liste
    .map((scene) => Number(scene.intensite))
    .filter((intensite) => Number.isFinite(intensite) && intensite > 0);

  if (intensites.length === 0) return 0;
  return intensites.reduce((total, intensite) => total + intensite, 0) / intensites.length;
}

function formaterMoyenne(value: number) {
  return value ? value.toFixed(1).replace(".", ",") : "—";
}

function normaliserScenes(value: unknown): Scene[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((scene): scene is Partial<Scene> => Boolean(scene && typeof scene === "object"))
    .map((scene, index) => ({
      id: typeof scene.id === "string" ? scene.id : `scene-${index}-${Date.now()}`,
      titre: typeof scene.titre === "string" ? scene.titre : "Scène sans titre",
      description: scene.description || "",
      tome: Number(scene.tome) || 1,
      chapitre: Number(scene.chapitre) || 1,
      tomeId: Number(scene.tomeId) || Number(scene.tome) || 1,
      chapitreId:
        typeof scene.chapitreId === "string"
          ? scene.chapitreId
          : createChapitreId(Number(scene.tome) || 1, Number(scene.chapitre) || 1),
      ageApprox: scene.ageApprox || "",
      periode: scene.periode || "",
      lieu: scene.lieu || "",
      typeScene: TYPES_SCENE.includes(scene.typeScene as Scene["typeScene"])
        ? (scene.typeScene as Scene["typeScene"])
        : "douce",
      intensite: [1, 2, 3, 4, 5].includes(Number(scene.intensite))
        ? (Number(scene.intensite) as Scene["intensite"])
        : undefined,
      importanceSerie: IMPORTANCES.includes(scene.importanceSerie as NonNullable<Scene["importanceSerie"]>)
        ? scene.importanceSerie
        : undefined,
      motifs: Array.isArray(scene.motifs) ? scene.motifs : [],
      personnages: Array.isArray(scene.personnages) ? scene.personnages : [],
      fragmentIds: Array.isArray(scene.fragmentIds) ? scene.fragmentIds.map(String) : [],
      fonctionNarrative: scene.fonctionNarrative || "",
      consequences: scene.consequences || "",
      notes: scene.notes || "",
      statut: STATUTS.includes(scene.statut as StatutScene) ? scene.statut : "brouillon",
      liens: Array.isArray(scene.liens)
        ? scene.liens.filter(
            (lien): lien is LienScene =>
              Boolean(
                lien &&
                  typeof lien.sceneId === "string" &&
                  TYPES_LIEN.includes(lien.typeLien as LienScene["typeLien"]),
              ),
          )
        : [],
      potentielSerie:
        scene.potentielSerie && typeof scene.potentielSerie === "object"
          ? {
              visuel: noteSerie(scene.potentielSerie.visuel),
              dialogue: noteSerie(scene.potentielSerie.dialogue),
              episode: noteSerie(scene.potentielSerie.episode),
              ouvertureEpisode: Boolean(scene.potentielSerie.ouvertureEpisode),
              finaleEpisode: Boolean(scene.potentielSerie.finaleEpisode),
            }
          : {},
      tagsNarratifs: Array.isArray(scene.tagsNarratifs) ? scene.tagsNarratifs : [],
      objetSymbolique: scene.objetSymbolique || "",
      emotionSousJacente: scene.emotionSousJacente || "",
      memoireCorporelle: scene.memoireCorporelle || "",
      niveauDialogue: NIVEAUX_DIALOGUE.includes(scene.niveauDialogue as NonNullable<Scene["niveauDialogue"]>)
        ? scene.niveauDialogue
        : undefined,
      roleDansTome: ROLES_TOME.includes(scene.roleDansTome as NonNullable<Scene["roleDansTome"]>)
        ? scene.roleDansTome
        : undefined,
    }));
}

function lireScenes(): Scene[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normaliserScenes(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

function listeDepuisTexte(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function intensitePoints(intensite?: Scene["intensite"]) {
  return "•".repeat(intensite || 0) || "—";
}

function trierScenesNarratives(liste: Scene[]) {
  return [...liste].sort(
    (a, b) =>
      a.tome - b.tome ||
      a.chapitre - b.chapitre ||
      ageNumerique(a.ageApprox) - ageNumerique(b.ageApprox) ||
      a.titre.localeCompare(b.titre),
  );
}

function analyserEquilibreNarratif(liste: Scene[]) {
  const scenesOrdonnees = trierScenesNarratives(liste);
  const intensiteMoyenne = moyenneIntensite(liste);
  const tension = liste.filter((scene) => TYPES_TENSION.includes(scene.typeScene)).length;
  const respiration = liste.filter((scene) => TYPES_RESPIRATION.includes(scene.typeScene)).length;
  const iconiques = liste.filter(
    (scene) => scene.typeScene === "iconique" || scene.importanceSerie === "iconique",
  ).length;
  const visuellesFortes = liste.filter((scene) => Number(scene.potentielSerie?.visuel) >= 4).length;
  const ouverturesEpisode = liste.filter((scene) => scene.potentielSerie?.ouvertureEpisode).length;
  const finalesEpisode = liste.filter((scene) => scene.potentielSerie?.finaleEpisode).length;
  const alertes: string[] = [];

  for (let index = 0; index <= scenesOrdonnees.length - 3; index += 1) {
    const suite = scenesOrdonnees.slice(index, index + 3);
    if (suite.every((scene) => ["trauma", "tension"].includes(scene.typeScene))) {
      alertes.push("Trop de tension consécutive : prévoir une respiration.");
      break;
    }
  }

  for (let index = 0; index <= scenesOrdonnees.length - 2; index += 1) {
    const suite = scenesOrdonnees.slice(index, index + 2);
    if (
      suite.every(
        (scene) => scene.typeScene === "iconique" || scene.importanceSerie === "iconique",
      )
    ) {
      alertes.push("Scènes iconiques rapprochées : vérifier la montée avant l’impact.");
      break;
    }
  }

  [1, 2, 3, 4].forEach((tome) => {
    const scenesDuTome = liste.filter((scene) => scene.tome === tome);
    if (scenesDuTome.length === 0) return;

    if (!scenesDuTome.some((scene) => scene.typeScene === "respiration")) {
      alertes.push(`Tome ${tome} : aucun moment de respiration.`);
    }

    if (!scenesDuTome.some((scene) => scene.typeScene === "pivot")) {
      alertes.push(`Tome ${tome} : aucun pivot identifié.`);
    }

    if (
      !scenesDuTome.some(
        (scene) => scene.typeScene === "iconique" || scene.importanceSerie === "iconique",
      )
    ) {
      alertes.push(`Tome ${tome} : aucune scène iconique.`);
    }
  });

  if (intensiteMoyenne >= 4 && respiration === 0) {
    alertes.push("Intensité moyenne élevée sans respiration visible.");
  }

  return {
    intensiteMoyenne,
    ratio: `${tension}:${respiration}`,
    alertes,
    potentielSerie: {
      visuellesFortes,
      ouverturesEpisode,
      finalesEpisode,
      iconiques,
    },
  };
}

function analyserTome(liste: Scene[], tome: number) {
  const scenesDuTome = liste.filter((scene) => scene.tome === tome);
  const alertes = analyserEquilibreNarratif(scenesDuTome).alertes;

  return {
    nombre: scenesDuTome.length,
    intensiteMoyenne: moyenneIntensite(scenesDuTome),
    respirations: scenesDuTome.filter((scene) => scene.typeScene === "respiration").length,
    pivots: scenesDuTome.filter((scene) => scene.typeScene === "pivot").length,
    iconiques: scenesDuTome.filter(
      (scene) => scene.typeScene === "iconique" || scene.importanceSerie === "iconique",
    ).length,
    alertes,
  };
}

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [sceneActive, setSceneActive] = useState<Scene | null>(null);
  const [filtreTome, setFiltreTome] = useState("tous");
  const [filtreType, setFiltreType] = useState("tous");
  const [filtreImportance, setFiltreImportance] = useState("tous");
  const [vue, setVue] = useState<"liste" | "chronologie">("liste");
  const [nouveauLienSceneId, setNouveauLienSceneId] = useState("");
  const [nouveauLienType, setNouveauLienType] = useState<LienScene["typeLien"]>("prepare");
  const [nouveauFragmentId, setNouveauFragmentId] = useState("");

  useEffect(() => {
    setScenes(lireScenes());
    setFragments(lireFragments());
  }, []);

  function sauvegarderListe(nextScenes: Scene[]) {
    setScenes(nextScenes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextScenes));
  }

  function ouvrirNouvelleScene() {
    setNouveauLienSceneId("");
    setNouveauLienType("prepare");
    setNouveauFragmentId("");
    setSceneActive(nouvelleScene());
  }

  function ouvrirScene(scene: Scene) {
    setNouveauLienSceneId("");
    setNouveauLienType("prepare");
    setNouveauFragmentId("");
    setSceneActive(scene);
  }

  function changerScene(champs: Partial<Scene>) {
    setSceneActive((scene) => (scene ? { ...scene, ...champs } : scene));
  }

  function enregistrerScene() {
    if (!sceneActive || !sceneActive.titre.trim()) return;

    const sceneNettoyee: Scene = {
      ...sceneActive,
      titre: sceneActive.titre.trim(),
      motifs: sceneActive.motifs || [],
      personnages: sceneActive.personnages || [],
      tomeId: sceneActive.tome,
      chapitreId: createChapitreId(sceneActive.tome, sceneActive.chapitre),
      fragmentIds: sceneActive.fragmentIds || [],
      liens: sceneActive.liens || [],
      tagsNarratifs: sceneActive.tagsNarratifs || [],
      potentielSerie: sceneActive.potentielSerie || {},
    };

    const existe = scenes.some((scene) => scene.id === sceneNettoyee.id);
    const prochaineListe = existe
      ? scenes.map((scene) => (scene.id === sceneNettoyee.id ? sceneNettoyee : scene))
      : [sceneNettoyee, ...scenes];

    sauvegarderListe(prochaineListe);
    setSceneActive(null);
  }

  function ajouterFragmentLie() {
    if (!sceneActive || !nouveauFragmentId || !scenes.some((scene) => scene.id === sceneActive.id)) return;

    const fragmentIds = sceneActive.fragmentIds || [];
    if (fragmentIds.includes(nouveauFragmentId)) return;

    const prochaineScene = {
      ...sceneActive,
      fragmentIds: [...fragmentIds, nouveauFragmentId],
    };

    changerScene({ fragmentIds: prochaineScene.fragmentIds });
    const fragmentsMisAJour = fragments.map((fragment) =>
      String(fragment.id) === nouveauFragmentId
        ? {
            ...fragment,
            sceneIds: Array.from(new Set([...(fragment.sceneIds || []), sceneActive.id])),
          }
        : fragment,
    );
    setFragments(sauvegarderFragments(fragmentsMisAJour));
    setNouveauFragmentId("");
  }

  function retirerFragmentLie(fragmentId: Fragment["id"]) {
    if (!sceneActive) return;

    const id = String(fragmentId);
    changerScene({ fragmentIds: (sceneActive.fragmentIds || []).filter((value) => value !== id) });
    const fragmentsMisAJour = fragments.map((fragment) =>
      String(fragment.id) === id
        ? {
            ...fragment,
            sceneIds: (fragment.sceneIds || []).filter((sceneId) => sceneId !== sceneActive.id),
          }
        : fragment,
    );
    setFragments(sauvegarderFragments(fragmentsMisAJour));
  }

  function ajouterLien() {
    if (!sceneActive || !nouveauLienSceneId || nouveauLienSceneId === sceneActive.id) return;

    const liens = sceneActive.liens || [];
    const existe = liens.some(
      (lien) => lien.sceneId === nouveauLienSceneId && lien.typeLien === nouveauLienType,
    );

    if (existe) return;

    changerScene({
      liens: [...liens, { sceneId: nouveauLienSceneId, typeLien: nouveauLienType }],
    });
    setNouveauLienSceneId("");
    setNouveauLienType("prepare");
  }

  function retirerLien(lienARetirer: LienScene) {
    if (!sceneActive) return;

    changerScene({
      liens: (sceneActive.liens || []).filter(
        (lien) =>
          lien.sceneId !== lienARetirer.sceneId || lien.typeLien !== lienARetirer.typeLien,
      ),
    });
  }

  function supprimerScene(id: string) {
    sauvegarderListe(scenes.filter((scene) => scene.id !== id));
    setSceneActive(null);
  }

  const scenesFiltrees = useMemo(
    () =>
      scenes.filter((scene) => {
        const tomeOk = filtreTome === "tous" || scene.tome === Number(filtreTome);
        const typeOk = filtreType === "tous" || scene.typeScene === filtreType;
        const importanceOk =
          filtreImportance === "tous" || scene.importanceSerie === filtreImportance;

        return tomeOk && typeOk && importanceOk;
      }),
    [filtreImportance, filtreTome, filtreType, scenes],
  );

  const scenesChronologiques = useMemo(
    () => trierScenesNarratives(scenesFiltrees),
    [scenesFiltrees],
  );

  const lectureNarrative = useMemo(
    () => analyserEquilibreNarratif(scenesFiltrees),
    [scenesFiltrees],
  );

  const resumeTome = useMemo(
    () => (filtreTome === "tous" ? null : analyserTome(scenesFiltrees, Number(filtreTome))),
    [filtreTome, scenesFiltrees],
  );

  function titreScene(sceneId: string) {
    return scenes.find((scene) => scene.id === sceneId)?.titre || "Scène non retrouvée";
  }

  const sceneGelee = sceneActive?.statut === "gelée";
  const sceneActiveExiste = sceneActive ? scenes.some((scene) => scene.id === sceneActive.id) : false;
  const fragmentsLies = sceneActive ? getLinkedFragments(sceneActive, fragments) : [];
  const motifsAssocies = sceneActive ? collectMotifs(sceneActive, fragmentsLies).slice(0, 8) : [];

  return (
    <main className="internal-page">
      <div className="internal-shell max-w-6xl">
        <BackLink />

        <header className="internal-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="internal-kicker">
              Architecture narrative
            </p>
            <h1 className="internal-title">
              Scènes
            </h1>
            <p className="internal-subtitle">
              Architecture narrative — L&apos;Héritage des Silences
            </p>
          </div>

          <button
            className="internal-button w-full text-xs sm:w-auto"
            onClick={ouvrirNouvelleScene}
            type="button"
          >
            Nouvelle scène
          </button>
        </header>

        <section className="mt-3 grid gap-1.5 text-[11px] text-[#9e927d] sm:grid-cols-3">
          <label className="internal-card flex items-center justify-between gap-3 px-2.5 py-1.5">
            Tome
            <select
              className="bg-transparent text-[11px] text-[#e8ddc9] outline-none"
              onChange={(event) => setFiltreTome(event.target.value)}
              value={filtreTome}
            >
              <option value="tous">Tous</option>
              {[1, 2, 3, 4].map((tome) => (
                <option key={tome} value={tome}>
                  {tome}
                </option>
              ))}
            </select>
          </label>

          <label className="internal-card flex items-center justify-between gap-3 px-2.5 py-1.5">
            Type
            <select
              className="bg-transparent text-[11px] text-[#e8ddc9] outline-none"
              onChange={(event) => setFiltreType(event.target.value)}
              value={filtreType}
            >
              <option value="tous">Tous</option>
              {TYPES_SCENE.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="internal-card flex items-center justify-between gap-3 px-2.5 py-1.5">
            Importance
            <select
              className="bg-transparent text-[11px] text-[#e8ddc9] outline-none"
              onChange={(event) => setFiltreImportance(event.target.value)}
              value={filtreImportance}
            >
              <option value="tous">Toutes</option>
              {IMPORTANCES.map((importance) => (
                <option key={importance} value={importance}>
                  {importance}
                </option>
              ))}
            </select>
          </label>
        </section>

        {scenes.length > 0 && (
          <section className="mt-2 grid gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#9e927d]">
              <div className="inline-flex rounded-full border border-[#c9a84c]/10 bg-[#151412] p-0.5">
                {(["liste", "chronologie"] as const).map((mode) => (
                  <button
                    className={`rounded-full px-2.5 py-1 transition ${
                      vue === mode
                        ? "bg-[#c9a84c]/12 text-[#efe4d2]"
                        : "text-[#8f826c] hover:text-[#efe4d2]"
                    }`}
                    key={mode}
                    onClick={() => setVue(mode)}
                    type="button"
                  >
                    {mode === "liste" ? "Liste" : "Chronologie"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#746b5c]">
                {scenesFiltrees.length} scène{scenesFiltrees.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="internal-card grid gap-2 px-3 py-2.5 text-[11px] text-[#a99d88] sm:grid-cols-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#766d5d]">
                  Intensité moyenne
                </p>
                <p className="mt-0.5 font-serif text-base text-[#efe4d2]">
                  {formaterMoyenne(lectureNarrative.intensiteMoyenne)}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#766d5d]">
                  Tension / respiration
                </p>
                <p className="mt-0.5 font-serif text-base text-[#efe4d2]">
                  {lectureNarrative.ratio}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#766d5d]">
                  Télésérie
                </p>
                <p className="mt-0.5 leading-5 text-[#d7c7a7]">
                  V≥4 {lectureNarrative.potentielSerie.visuellesFortes} · O{" "}
                  {lectureNarrative.potentielSerie.ouverturesEpisode} · F{" "}
                  {lectureNarrative.potentielSerie.finalesEpisode} · I{" "}
                  {lectureNarrative.potentielSerie.iconiques}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#766d5d]">
                  Alertes
                </p>
                <p className="mt-0.5 leading-5 text-[#d7c7a7]">
                  {lectureNarrative.alertes.length
                    ? lectureNarrative.alertes.slice(0, 2).join(" · ")
                    : "Équilibre stable."}
                </p>
              </div>
            </div>

            {resumeTome && (
              <div className="internal-card flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-[#a99d88]">
                <span className="font-serif text-sm text-[#efe4d2]">Tome {filtreTome}</span>
                <span>{resumeTome.nombre} scènes</span>
                <span>int. {formaterMoyenne(resumeTome.intensiteMoyenne)}</span>
                <span>{resumeTome.respirations} respirations</span>
                <span>{resumeTome.pivots} pivots</span>
                <span>{resumeTome.iconiques} iconiques</span>
                {resumeTome.alertes.slice(0, 2).map((alerte) => (
                  <span className="text-[#d4b36b]" key={alerte}>
                    {alerte}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {scenes.length === 0 ? (
          <section className="internal-panel mt-4 border-dashed px-5 py-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f745f]">
              Atelier des scènes
            </p>
            <h2 className="mt-2 font-serif text-lg text-[#efe4d2]">Aucune scène déposée.</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-[#968a76]">
              Le fil narratif commence ici : une scène, un lieu, une tension.
            </p>
            <button
              className="internal-button mt-4 text-xs"
              onClick={ouvrirNouvelleScene}
              type="button"
            >
              Ajouter une scène
            </button>
          </section>
        ) : vue === "liste" ? (
          <section className="mt-3 grid gap-1.5">
            {scenesFiltrees.map((scene) => {
              const gelee = scene.statut === "gelée";

              return (
                <button
                  className={`group internal-card p-0 text-left ${
                    gelee ? "opacity-65 hover:bg-[#141414]" : ""
                  }`}
                  key={scene.id}
                  onClick={() => ouvrirScene(scene)}
                  style={{ borderLeft: `2px solid ${COULEURS_SCENE[scene.typeScene]}` }}
                  type="button"
                >
                  <article className="px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-base text-[#efe4d2]">
                          {scene.titre}
                        </h2>
                        <p className="mt-0.5 text-[11px] text-[#918674]">
                          Tome {scene.tome} · Ch. {scene.chapitre} · Âge :{" "}
                          {scene.ageApprox || "—"} · {scene.lieu || "Lieu non défini"}
                        </p>
                      </div>
                      {gelee && <span className="text-sm text-[#c9a84c]">🔒</span>}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[#d7c7a7]">
                        {scene.typeScene}
                      </span>
                      <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5 text-[9px] text-[#a99d88]">
                        série : {scene.importanceSerie || "—"}
                      </span>
                      <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5 text-[9px] text-[#c3a867]">
                        intensité {intensitePoints(scene.intensite)}
                      </span>
                      {(scene.motifs || []).slice(0, 4).map((motif) => (
                        <span
                          className="rounded-full bg-[#24221f] px-2 py-0.5 text-[9px] text-[#8e8372]"
                          key={motif}
                        >
                          {motif}
                        </span>
                      ))}
                    </div>
                  </article>
                </button>
              );
            })}
          </section>
        ) : (
          <section className="mt-3 grid gap-1">
            {scenesChronologiques.map((scene) => (
              <button
                className="internal-card flex items-center justify-between gap-3 px-3 py-2 text-left"
                key={scene.id}
                onClick={() => ouvrirScene(scene)}
                type="button"
              >
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm text-[#efe4d2]">{scene.titre}</p>
                  <p className="mt-0.5 text-[10px] text-[#8f826c]">
                    Âge {scene.ageApprox || "—"} · Tome {scene.tome} · Ch. {scene.chapitre}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1 text-[9px] text-[#a99d88]">
                  <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5">
                    {scene.typeScene}
                  </span>
                  <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5">
                    {intensitePoints(scene.intensite)}
                  </span>
                  <span className="rounded-full bg-[#f5efe3]/6 px-2 py-0.5">
                    {scene.importanceSerie || "—"}
                  </span>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>

      {sceneActive && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55">
          <div className="scenes-drawer flex h-screen w-full flex-col overflow-hidden border-l border-[#c9a84c]/24 bg-[#181715] text-[#f5efe3] shadow-none sm:max-w-xl">
            <style>{`
              .scenes-drawer label {
                color: #c1b49b;
              }

              .scenes-drawer input,
              .scenes-drawer textarea,
              .scenes-drawer select {
                background-color: #23211d !important;
                border-color: rgba(201, 168, 92, 0.28) !important;
                color: #f5efe3 !important;
                box-shadow: inset 0 1px 0 rgba(255, 250, 238, 0.035);
              }

              .scenes-drawer input::placeholder,
              .scenes-drawer textarea::placeholder {
                color: #aa9b83;
                opacity: 1;
              }

              .scenes-drawer input:focus,
              .scenes-drawer textarea:focus,
              .scenes-drawer select:focus {
                border-color: rgba(214, 178, 94, 0.68) !important;
                box-shadow:
                  0 0 0 3px rgba(214, 178, 94, 0.14),
                  inset 0 1px 0 rgba(255, 250, 238, 0.04);
              }

              .scenes-drawer section {
                background-color: #1d1b18;
                border-color: rgba(201, 168, 92, 0.18);
              }
            `}</style>
            <div className="shrink-0 border-b border-[#c9a84c]/16 bg-[#181715] px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#9d9079]">
                    {scenes.some((scene) => scene.id === sceneActive.id)
                      ? "Éditer scène"
                      : "Nouvelle scène"}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-[#f5efe3]">
                    {sceneActive.titre || "Scène sans titre"}
                  </h2>
                </div>
                <button
                  className="text-sm text-[#c0b39a] transition hover:text-[#f5efe3]"
                  onClick={() => setSceneActive(null)}
                  type="button"
                >
                  Fermer
                </button>
              </div>
            </div>

            <form className="grid flex-1 gap-3 overflow-y-auto px-4 py-4 sm:px-6" onSubmit={(event) => event.preventDefault()}>
              {sceneGelee && (
                <p className="rounded-xl border border-[#c9a84c]/22 bg-[#211f1a] px-3 py-2 text-xs text-[#e2d3b5]">
                  Cette scène est gelée. Les champs sont verrouillés.
                </p>
              )}

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Titre
                <input
                  className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none focus:border-[#c9a84c]/55 disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) => changerScene({ titre: event.target.value })}
                  value={sceneActive.titre}
                />
              </label>

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Description
                <textarea
                  className="min-h-20 rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none focus:border-[#c9a84c]/55 disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) => changerScene({ description: event.target.value })}
                  value={sceneActive.description || ""}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Tome
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee || !sceneActiveExiste}
                    onChange={(event) => changerScene({ tome: Number(event.target.value) })}
                    value={sceneActive.tome}
                  >
                    {[1, 2, 3, 4].map((tome) => (
                      <option key={tome} value={tome}>
                        Tome {tome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Chapitre
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    min={1}
                    onChange={(event) => changerScene({ chapitre: Number(event.target.value) })}
                    type="number"
                    value={sceneActive.chapitre}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Âge
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => changerScene({ ageApprox: event.target.value })}
                    value={sceneActive.ageApprox || ""}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Période
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => changerScene({ periode: event.target.value })}
                    value={sceneActive.periode || ""}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Lieu
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => changerScene({ lieu: event.target.value })}
                    value={sceneActive.lieu || ""}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Type
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      changerScene({ typeScene: event.target.value as Scene["typeScene"] })
                    }
                    value={sceneActive.typeScene}
                  >
                    {TYPES_SCENE.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Intensité
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      changerScene({
                        intensite: event.target.value
                          ? (Number(event.target.value) as Scene["intensite"])
                          : undefined,
                      })
                    }
                    value={sceneActive.intensite || ""}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Importance série
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      changerScene({
                        importanceSerie: event.target.value
                          ? (event.target.value as Scene["importanceSerie"])
                          : undefined,
                      })
                    }
                    value={sceneActive.importanceSerie || ""}
                  >
                    <option value="">—</option>
                    {IMPORTANCES.map((importance) => (
                      <option key={importance} value={importance}>
                        {importance}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Motifs
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      changerScene({ motifs: listeDepuisTexte(event.target.value) })
                    }
                    placeholder="séparés par virgules"
                    value={(sceneActive.motifs || []).join(", ")}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Personnages
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      changerScene({ personnages: listeDepuisTexte(event.target.value) })
                    }
                    placeholder="séparés par virgules"
                    value={(sceneActive.personnages || []).join(", ")}
                  />
                </label>
              </div>

              <section className="grid gap-3 rounded-2xl border border-[#c9a84c]/10 bg-[#151412] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#827661]">
                  Architecture
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs text-[#a99b84]">
                    Rôle dans le tome
                    <select
                      className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({
                          roleDansTome: event.target.value
                            ? (event.target.value as Scene["roleDansTome"])
                            : undefined,
                        })
                      }
                      value={sceneActive.roleDansTome || ""}
                    >
                      <option value="">—</option>
                      {ROLES_TOME.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[#a99b84] sm:col-span-2">
                    Tags narratifs
                    <input
                      className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({ tagsNarratifs: listeDepuisTexte(event.target.value) })
                      }
                      placeholder="séparés par virgules"
                      value={(sceneActive.tagsNarratifs || []).join(", ")}
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Objet symbolique
                  <input
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => changerScene({ objetSymbolique: event.target.value })}
                    value={sceneActive.objetSymbolique || ""}
                  />
                </label>
              </section>

              <section className="grid gap-3 rounded-2xl border border-[#c9a84c]/10 bg-[#151412] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#827661]">
                  Corps / émotion
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs text-[#a99b84]">
                    Émotion sous-jacente
                    <input
                      className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({ emotionSousJacente: event.target.value })
                      }
                      value={sceneActive.emotionSousJacente || ""}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-[#a99b84]">
                    Niveau de dialogue
                    <select
                      className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({
                          niveauDialogue: event.target.value
                            ? (event.target.value as Scene["niveauDialogue"])
                            : undefined,
                        })
                      }
                      value={sceneActive.niveauDialogue || ""}
                    >
                      <option value="">—</option>
                      {NIVEAUX_DIALOGUE.map((niveau) => (
                        <option key={niveau} value={niveau}>
                          {niveau}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1 text-xs text-[#a99b84]">
                  Mémoire corporelle
                  <textarea
                    className="min-h-16 rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => changerScene({ memoireCorporelle: event.target.value })}
                    value={sceneActive.memoireCorporelle || ""}
                  />
                </label>
              </section>

              <section className="grid gap-3 rounded-2xl border border-[#c9a84c]/10 bg-[#151412] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#827661]">
                  Potentiel télésérie
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["visuel", "dialogue", "episode"] as const).map((champ) => (
                    <label className="grid gap-1 text-xs text-[#a99b84]" key={champ}>
                      {champ === "episode" ? "Épisode" : champ}
                      <select
                        className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                        disabled={sceneGelee}
                        onChange={(event) =>
                          changerScene({
                            potentielSerie: {
                              ...(sceneActive.potentielSerie || {}),
                              [champ]: event.target.value
                                ? (Number(event.target.value) as Scene["intensite"])
                                : undefined,
                            },
                          })
                        }
                        value={sceneActive.potentielSerie?.[champ] || ""}
                      >
                        <option value="">—</option>
                        {NOTES_SERIE.map((note) => (
                          <option key={note} value={note}>
                            {note}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 text-xs text-[#a99b84] sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[#c9a84c]/10 px-3 py-2">
                    <input
                      checked={Boolean(sceneActive.potentielSerie?.ouvertureEpisode)}
                      className="accent-[#c9a84c]"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({
                          potentielSerie: {
                            ...(sceneActive.potentielSerie || {}),
                            ouvertureEpisode: event.target.checked,
                          },
                        })
                      }
                      type="checkbox"
                    />
                    Ouverture épisode
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[#c9a84c]/10 px-3 py-2">
                    <input
                      checked={Boolean(sceneActive.potentielSerie?.finaleEpisode)}
                      className="accent-[#c9a84c]"
                      disabled={sceneGelee}
                      onChange={(event) =>
                        changerScene({
                          potentielSerie: {
                            ...(sceneActive.potentielSerie || {}),
                            finaleEpisode: event.target.checked,
                          },
                        })
                      }
                      type="checkbox"
                    />
                    Finale épisode
                  </label>
                </div>
              </section>

              <section className="grid gap-3 rounded-2xl border border-[#c9a84c]/10 bg-[#151412] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#827661]">
                  Liens entre scènes
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => setNouveauLienSceneId(event.target.value)}
                    value={nouveauLienSceneId}
                  >
                    <option value="">Choisir une scène</option>
                    {scenes
                      .filter((scene) => scene.id !== sceneActive.id)
                      .map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          T{scene.tome} Ch.{scene.chapitre} — {scene.titre}
                        </option>
                      ))}
                  </select>
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) =>
                      setNouveauLienType(event.target.value as LienScene["typeLien"])
                    }
                    value={nouveauLienType}
                  >
                    {TYPES_LIEN.map((typeLien) => (
                      <option key={typeLien} value={typeLien}>
                        {LIBELLES_LIEN[typeLien]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-full border border-[#c9a84c]/20 px-3 py-2 text-xs text-[#efe4d2] transition hover:border-[#c9a84c]/45 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={sceneGelee || !nouveauLienSceneId}
                    onClick={ajouterLien}
                    type="button"
                  >
                    Ajouter
                  </button>
                </div>
                {(sceneActive.liens || []).length > 0 ? (
                  <div className="grid gap-1.5">
                    {(sceneActive.liens || []).map((lien) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-xl bg-[#f5efe3]/5 px-3 py-2 text-xs text-[#cfc2a8]"
                        key={`${lien.typeLien}-${lien.sceneId}`}
                      >
                        <span>
                          {LIBELLES_LIEN[lien.typeLien]} · {titreScene(lien.sceneId)}
                        </span>
                        {!sceneGelee && (
                          <button
                            className="text-[#9b8f7a] transition hover:text-[#f5efe3]"
                            onClick={() => retirerLien(lien)}
                            type="button"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#827661]">Aucun lien défini.</p>
                )}
              </section>

              <section className="grid gap-3 rounded-2xl border border-[#c9a84c]/10 bg-[#151412] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#827661]">
                    Relations
                  </p>
                  <span className="text-[10px] text-[#9f927d]">
                    Tome {sceneActive.tome} · Chapitre {sceneActive.chapitre}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                    disabled={sceneGelee}
                    onChange={(event) => setNouveauFragmentId(event.target.value)}
                    value={nouveauFragmentId}
                  >
                    <option value="">Lier un fragment existant</option>
                    {fragments
                      .filter(
                        (fragment) =>
                          !fragmentsLies.some((lie) => String(lie.id) === String(fragment.id)),
                      )
                      .map((fragment) => (
                        <option key={fragment.id} value={String(fragment.id)}>
                          {fragment.titre || fragment.texte.slice(0, 64) || `Fragment ${fragment.id}`}
                        </option>
                      ))}
                  </select>
                  <button
                    className="rounded-full border border-[#c9a84c]/20 px-3 py-2 text-xs text-[#efe4d2] transition hover:border-[#c9a84c]/45 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={sceneGelee || !sceneActiveExiste || !nouveauFragmentId}
                    onClick={ajouterFragmentLie}
                    type="button"
                  >
                    Lier
                  </button>
                </div>

                <div className="grid gap-2 text-xs text-[#cfc2a8]">
                  {!sceneActiveExiste && (
                    <p className="rounded-xl border border-[#c9a84c]/10 bg-[#f5efe3]/5 px-3 py-2 text-[#9f927d]">
                      Enregistre la scène une première fois pour connecter des fragments.
                    </p>
                  )}
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#827661]">
                      Fragments connectés
                    </p>
                    {fragmentsLies.length > 0 ? (
                      <div className="grid gap-1.5">
                        {fragmentsLies.map((fragment) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#f5efe3]/5 px-3 py-2"
                            key={fragment.id}
                          >
                            <span className="line-clamp-1">
                              {fragment.titre || fragment.texte.slice(0, 92) || `Fragment ${fragment.id}`}
                            </span>
                            {!sceneGelee && (
                              <button
                                className="text-[#9b8f7a] transition hover:text-[#f5efe3]"
                                onClick={() => retirerFragmentLie(fragment.id)}
                                type="button"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#827661]">Aucun fragment connecté.</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#827661]">
                      Motifs associés
                    </p>
                    {motifsAssocies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {motifsAssocies.map((motif) => (
                          <span
                            className="rounded-full bg-[#24221f] px-2 py-0.5 text-[10px] text-[#a99d88]"
                            key={motif}
                          >
                            {motif}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#827661]">Aucun motif associé.</p>
                    )}
                  </div>
                </div>
              </section>

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Fonction narrative
                <textarea
                  className="min-h-20 rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) => changerScene({ fonctionNarrative: event.target.value })}
                  value={sceneActive.fonctionNarrative || ""}
                />
              </label>

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Conséquences
                <textarea
                  className="min-h-20 rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) => changerScene({ consequences: event.target.value })}
                  value={sceneActive.consequences || ""}
                />
              </label>

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Notes
                <textarea
                  className="min-h-20 rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) => changerScene({ notes: event.target.value })}
                  value={sceneActive.notes || ""}
                />
              </label>

              <label className="grid gap-1 text-xs text-[#a99b84]">
                Statut
                <select
                  className="rounded-xl border border-[#c9a84c]/12 bg-[#171717] px-3 py-2 text-sm text-[#f5efe3] outline-none disabled:opacity-60"
                  disabled={sceneGelee}
                  onChange={(event) =>
                    changerScene({ statut: event.target.value as StatutScene })
                  }
                  value={sceneActive.statut || "brouillon"}
                >
                  {STATUTS.map((statut) => (
                    <option key={statut} value={statut}>
                      {statut}
                    </option>
                  ))}
                </select>
              </label>
            </form>

            <div className="shrink-0 border-t border-[#c9a84c]/18 bg-[#191816]/94 px-4 py-2.5 backdrop-blur-xl sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {!sceneGelee && scenes.some((scene) => scene.id === sceneActive.id) && (
                    <button
                      className="rounded-full px-2.5 py-1.5 text-xs text-[#d89b85] transition hover:bg-[#2b1b17]"
                      onClick={() => supprimerScene(sceneActive.id)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-full px-2.5 py-1.5 text-xs text-[#c4b79d] transition hover:bg-[#24211c] hover:text-[#f5efe3]"
                    onClick={() => setSceneActive(null)}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="rounded-full border border-[#c9a84c]/45 bg-[#221f1a]/90 px-3.5 py-1.5 text-xs text-[#f5efe3] transition hover:border-[#d6b25e]/75 hover:bg-[#2a251d] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={sceneGelee || !sceneActive.titre.trim()}
                    onClick={enregistrerScene}
                    type="button"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
