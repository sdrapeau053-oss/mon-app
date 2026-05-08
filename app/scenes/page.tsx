"use client";

import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/ui/back-link";
import { COULEURS_SCENE, Scene, StatutScene } from "@/lib/scenes";

const STORAGE_KEY = "scenes-lhs";

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
    statut: "brouillon",
  };
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
      fonctionNarrative: scene.fonctionNarrative || "",
      consequences: scene.consequences || "",
      notes: scene.notes || "",
      statut: STATUTS.includes(scene.statut as StatutScene) ? scene.statut : "brouillon",
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

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneActive, setSceneActive] = useState<Scene | null>(null);
  const [filtreTome, setFiltreTome] = useState("tous");
  const [filtreType, setFiltreType] = useState("tous");
  const [filtreImportance, setFiltreImportance] = useState("tous");

  useEffect(() => {
    setScenes(lireScenes());
  }, []);

  function sauvegarderListe(nextScenes: Scene[]) {
    setScenes(nextScenes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextScenes));
  }

  function ouvrirNouvelleScene() {
    setSceneActive(nouvelleScene());
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
    };

    const existe = scenes.some((scene) => scene.id === sceneNettoyee.id);
    const prochaineListe = existe
      ? scenes.map((scene) => (scene.id === sceneNettoyee.id ? sceneNettoyee : scene))
      : [sceneNettoyee, ...scenes];

    sauvegarderListe(prochaineListe);
    setSceneActive(null);
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

  const indicateurs = useMemo(() => {
    const tension = scenesFiltrees.filter((scene) => scene.typeScene === "tension").length;
    const respiration = scenesFiltrees.filter((scene) => scene.typeScene === "respiration").length;
    const iconiques = scenesFiltrees.filter(
      (scene) => scene.typeScene === "iconique" || scene.importanceSerie === "iconique",
    ).length;
    const tomesAvecScenes = [1, 2, 3, 4].filter((tome) =>
      scenesFiltrees.some((scene) => scene.tome === tome),
    );
    const tomesSansRespiration = tomesAvecScenes.filter(
      (tome) =>
        !scenesFiltrees.some(
          (scene) => scene.tome === tome && scene.typeScene === "respiration",
        ),
    );

    return {
      ratio: `${tension}:${respiration}`,
      iconiques,
      tomesSansRespiration,
    };
  }, [scenesFiltrees]);

  const sceneGelee = sceneActive?.statut === "gelée";

  return (
    <main className="min-h-screen bg-[#0b0b0a] px-4 py-4 text-[#eee4d2] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <BackLink />

        <header className="mt-4 flex flex-col gap-3 border-b border-[#c9a84c]/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#7f745f]">
              Architecture narrative
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.03em] text-[#f1e7d5] sm:text-3xl">
              Scènes
            </h1>
            <p className="mt-0.5 text-xs text-[#9e927d]">
              Architecture narrative — L&apos;Héritage des Silences
            </p>
          </div>

          <button
            className="w-full rounded-full border border-[#c9a84c]/22 bg-[#14110e] px-3.5 py-1.5 text-xs font-medium text-[#dfd0b5] transition hover:border-[#c9a84c]/45 hover:bg-[#1a1611] sm:w-auto"
            onClick={ouvrirNouvelleScene}
            type="button"
          >
            Nouvelle scène
          </button>
        </header>

        <section className="mt-3 grid gap-1.5 text-[11px] text-[#9e927d] sm:grid-cols-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-[#c9a84c]/8 bg-[#10100f] px-2.5 py-1.5">
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

          <label className="flex items-center justify-between gap-3 rounded-lg border border-[#c9a84c]/8 bg-[#10100f] px-2.5 py-1.5">
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

          <label className="flex items-center justify-between gap-3 rounded-lg border border-[#c9a84c]/8 bg-[#10100f] px-2.5 py-1.5">
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

        {scenes.length === 0 ? (
          <section className="mt-4 rounded-xl border border-dashed border-[#c9a84c]/14 bg-[#0f0e0d] px-5 py-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f745f]">
              Atelier des scènes
            </p>
            <h2 className="mt-2 font-serif text-lg text-[#efe4d2]">Aucune scène déposée.</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-[#968a76]">
              Le fil narratif commence ici : une scène, un lieu, une tension.
            </p>
            <button
              className="mt-4 rounded-full border border-[#c9a84c]/22 px-3.5 py-1.5 text-xs text-[#dfd0b5] transition hover:border-[#c9a84c]/45 hover:bg-[#1a1611]"
              onClick={ouvrirNouvelleScene}
              type="button"
            >
              Ajouter une scène
            </button>
          </section>
        ) : (
          <section className="mt-3 grid gap-1.5">
            {scenesFiltrees.map((scene) => {
              const gelee = scene.statut === "gelée";

              return (
                <button
                  className={`group rounded-lg border border-[#c9a84c]/8 bg-[#10100f] p-0 text-left transition duration-200 hover:border-[#c9a84c]/22 hover:bg-[#14120f] ${
                    gelee ? "opacity-65 hover:bg-[#141414]" : ""
                  }`}
                  key={scene.id}
                  onClick={() => setSceneActive(scene)}
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
        )}

        {scenes.length > 0 && (
          <section className="mt-4 grid gap-1.5 border-t border-[#c9a84c]/10 pt-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-[#10100f] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8f826c]">
                Tension / respiration
              </p>
              <p className="mt-0.5 font-serif text-lg text-[#efe4d2]">{indicateurs.ratio}</p>
            </div>
            <div className="rounded-lg bg-[#10100f] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8f826c]">
                Scènes iconiques
              </p>
              <p className="mt-0.5 font-serif text-lg text-[#efe4d2]">{indicateurs.iconiques}</p>
            </div>
            <div className="rounded-lg bg-[#10100f] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8f826c]">
                Respiration
              </p>
              <p className="mt-0.5 text-[11px] leading-5 text-[#d7c7a7]">
                {indicateurs.tomesSansRespiration.length
                  ? `Tomes sans respiration : ${indicateurs.tomesSansRespiration.join(", ")}`
                  : "Alerte respiration stable."}
              </p>
            </div>
          </section>
        )}
      </div>

      {sceneActive && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55">
          <div className="h-full w-full overflow-y-auto border-l border-[#c9a84c]/20 bg-[#111] px-4 py-5 text-[#f5efe3] shadow-none sm:max-w-xl sm:px-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#c9a84c]/12 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8f826c]">
                  {scenes.some((scene) => scene.id === sceneActive.id)
                    ? "Éditer scène"
                    : "Nouvelle scène"}
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#f5efe3]">
                  {sceneActive.titre || "Scène sans titre"}
                </h2>
              </div>
              <button
                className="text-sm text-[#a99b84] transition hover:text-[#f5efe3]"
                onClick={() => setSceneActive(null)}
                type="button"
              >
                Fermer
              </button>
            </div>

            {sceneGelee && (
              <p className="mt-4 rounded-xl border border-[#c9a84c]/18 bg-[#1a1712] px-3 py-2 text-xs text-[#d9c9a9]">
                Cette scène est gelée. Les champs sont verrouillés.
              </p>
            )}

            <form className="mt-4 grid gap-3" onSubmit={(event) => event.preventDefault()}>
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
                    disabled={sceneGelee}
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

              <div className="sticky bottom-0 mt-2 flex flex-col gap-2 border-t border-[#c9a84c]/12 bg-[#111] py-4 sm:flex-row sm:justify-between">
                <div>
                  {!sceneGelee && scenes.some((scene) => scene.id === sceneActive.id) && (
                    <button
                      className="rounded-full px-3 py-2 text-sm text-[#c58f7b] transition hover:bg-[#2a1713]"
                      onClick={() => supprimerScene(sceneActive.id)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full px-3 py-2 text-sm text-[#a99b84] transition hover:bg-[#1c1a16]"
                    onClick={() => setSceneActive(null)}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="rounded-full border border-[#c9a84c]/40 bg-[#1a1712] px-4 py-2 text-sm text-[#f5efe3] transition hover:border-[#c9a84c]/80 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={sceneGelee || !sceneActive.titre.trim()}
                    onClick={enregistrerScene}
                    type="button"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
