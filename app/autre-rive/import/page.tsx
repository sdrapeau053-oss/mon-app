"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import {
  importerContenu,
  type ImportOrchestratorResult,
  type SourceImport,
} from "@/lib/autre-rive";

type DossierOption = {
  id: string;
  nom: string;
};

const DOSSIERS_STORAGE_KEY = "autre-rive-dossiers";
const SOURCES: Array<{ label: string; value: SourceImport }> = [
  { label: "Copier-coller", value: "copier-coller" },
  { label: "Fichier TXT", value: "txt" },
  { label: "Fichier JSON", value: "json" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDossiers(): DossierOption[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(DOSSIERS_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(data)) return [];

    return data
      .filter(isRecord)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        nom: typeof item.nom === "string" ? item.nom : "",
      }))
      .filter((item) => item.id && item.nom);
  } catch {
    return [];
  }
}

export default function AutreRiveImportPage() {
  const [dossierId, setDossierId] = useState("");
  const [source, setSource] = useState<SourceImport>("copier-coller");
  const [contenu, setContenu] = useState("");
  const [nomFichier, setNomFichier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [résultat, setRésultat] = useState<ImportOrchestratorResult | null>(null);
  const [dossiers, setDossiers] = useState<DossierOption[]>([]);

  useEffect(() => {
    const loadedDossiers = readDossiers();
    setDossiers(loadedDossiers);
    setDossierId(loadedDossiers[0]?.id ?? "");
  }, []);

  const selectedDossier = useMemo(
    () => dossiers.find((dossier) => dossier.id === dossierId) ?? null,
    [dossierId, dossiers],
  );
  const canImport = Boolean(dossierId && contenu.trim() && !isLoading);

  const resetForm = () => {
    setContenu("");
    setNomFichier("");
    setRésultat(null);
    setIsLoading(false);
  };

  const handleSourceChange = (nextSource: SourceImport) => {
    setSource(nextSource);
    setContenu("");
    setNomFichier("");
    setRésultat(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNomFichier(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setContenu(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      setContenu("");
      setRésultat({
        avertissements: [],
        conversationId: null,
        erreurs: ["Impossible de lire le fichier sélectionné."],
        nombreMessages: 0,
        nombreRouge: 0,
        nombreValides: 0,
        succès: false,
      });
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!canImport) return;

    setIsLoading(true);
    const importResult = importerContenu(
      contenu,
      source,
      nomFichier || (source === "copier-coller" ? "copier-coller" : "conversation"),
      dossierId,
    );

    setRésultat(importResult);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-[#d6b25e]/14 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm text-[#b8aa91] transition hover:text-[#f5efe3]" href="/autre-rive/dossiers">
              Retour aux dossiers
            </Link>
            <h1 className="mt-3 font-serif text-3xl text-[#f5efe3]">Importer une conversation</h1>
            <p className="mt-1 text-sm text-[#b8aa91]">L&apos;Autre Rive</p>
          </div>
        </header>

        {dossiers.length === 0 ? (
          <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
            <p className="text-sm leading-6 text-[#d7cab0]">
              Aucun dossier disponible.
              <br />
              Créez d&apos;abord un dossier dans L&apos;Autre Rive.
            </p>
            <Link
              className="mt-4 inline-flex rounded-full bg-[#d6b25e] px-5 py-2 font-semibold text-[#15110d] transition hover:bg-[#efd17a]"
              href="/autre-rive/dossiers"
            >
              Aller aux dossiers
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
              <label className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]" htmlFor="dossier">
                Dossier relationnel
              </label>
              <select
                className="mt-2 w-full rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-[#d7cab0] outline-none transition focus:border-[#d6b25e]/45"
                id="dossier"
                onChange={(event) => setDossierId(event.target.value)}
                value={dossierId}
              >
                {dossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>
                    {dossier.nom}
                  </option>
                ))}
              </select>
              {selectedDossier && (
                <p className="mt-2 text-xs text-[#b8aa91]">Import dans : {selectedDossier.nom}</p>
              )}
            </section>

            <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]">Source</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {SOURCES.map((item) => (
                  <button
                    className={[
                      "rounded-[12px] border px-4 py-3 text-left text-sm transition",
                      source === item.value
                        ? "border-[#d6b25e]/48 bg-[#d6b25e]/12 text-[#f5efe3]"
                        : "border-[#d6b25e]/14 bg-[#14110e] text-[#b8aa91] hover:text-[#f5efe3]",
                    ].join(" ")}
                    key={item.value}
                    onClick={() => handleSourceChange(item.value)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
              {source === "copier-coller" ? (
                <>
                  <label className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]" htmlFor="conversation">
                    Conversation
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-[#d7cab0] outline-none transition placeholder:text-[#766d5d] focus:border-[#d6b25e]/45"
                    id="conversation"
                    onChange={(event) => setContenu(event.target.value)}
                    placeholder="Collez votre conversation ici..."
                    rows={10}
                    value={contenu}
                  />
                </>
              ) : (
                <>
                  <label className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]" htmlFor="conversation-file">
                    {source === "txt" ? "Fichier TXT" : "Fichier JSON"}
                  </label>
                  <input
                    accept={source === "txt" ? ".txt" : ".json"}
                    className="mt-2 w-full rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-[#d7cab0] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#d6b25e] file:px-4 file:py-1.5 file:font-semibold file:text-[#15110d] hover:file:bg-[#efd17a]"
                    id="conversation-file"
                    onChange={handleFileChange}
                    type="file"
                  />
                  <p className="mt-2 text-xs text-[#b8aa91]">
                    {nomFichier ? `Fichier sélectionné : ${nomFichier}` : "Aucun fichier sélectionné."}
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-[#d6b25e] px-5 py-2 font-semibold text-[#15110d] transition hover:bg-[#efd17a] disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canImport}
                  onClick={handleImport}
                  type="button"
                >
                  {isLoading ? "Importation en cours..." : "Importer"}
                </button>
                {contenu && (
                  <button
                    className="rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-[#b8aa91] transition hover:text-[#f5efe3]"
                    onClick={resetForm}
                    type="button"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </section>

            {résultat && (
              <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
                <h2 className="font-serif text-xl text-[#f5efe3]">
                  {résultat.succès ? "Import réussi" : "Import échoué"}
                </h2>
                {résultat.succès ? (
                  <div className="mt-3 grid gap-2 text-sm text-[#d7cab0] sm:grid-cols-3">
                    <p>Messages importés : {résultat.nombreMessages}</p>
                    <p>Messages validés : {résultat.nombreValides}</p>
                    <p>Messages à valider : {résultat.nombreRouge}</p>
                  </div>
                ) : null}

                {résultat.erreurs.length > 0 && (
                  <div className="mt-4 rounded-[10px] border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-100">
                    <p className="font-semibold">Erreurs</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {résultat.erreurs.map((erreur) => (
                        <li key={erreur}>{erreur}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {résultat.avertissements.length > 0 && (
                  <div className="mt-4 rounded-[10px] border border-[#d6b25e]/18 bg-[#d6b25e]/8 p-3 text-sm text-[#d7cab0]">
                    <p className="font-semibold">Avertissements</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {résultat.avertissements.map((avertissement) => (
                        <li key={avertissement}>{avertissement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {résultat.succès ? (
                    <Link
                      className="rounded-full bg-[#d6b25e] px-5 py-2 font-semibold text-[#15110d] transition hover:bg-[#efd17a]"
                      href={résultat.conversationId ? `/autre-rive/imports/${résultat.conversationId}` : "/autre-rive/imports"}
                    >
                      Voir la conversation
                    </Link>
                  ) : null}
                  <button
                    className="rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-[#b8aa91] transition hover:text-[#f5efe3]"
                    onClick={resetForm}
                    type="button"
                  >
                    {résultat.succès ? "Nouvel import" : "Réessayer"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
