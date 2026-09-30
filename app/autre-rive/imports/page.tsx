"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readImportedConversations,
  supprimerImport,
  type ConversationImportée,
  type NiveauAnalyse,
  type SourceImport,
  type StatutConversation,
} from "@/lib/autre-rive";

const STATUS_LABELS: Record<StatutConversation, string> = {
  analysé: "Analysé",
  en_validation: "En validation",
  importé: "Importé",
  validé: "Validé",
};

const ANALYSIS_LEVEL_LABELS: Record<NiveauAnalyse, string> = {
  complète: "Complète",
  données_insuffisantes: "Données insuffisantes",
  exploratoire: "Exploratoire",
  partielle: "Partielle",
};

const SOURCE_LABELS: Record<SourceImport, string> = {
  "copier-coller": "Copier-coller",
  json: "JSON",
  txt: "TXT",
};

function formatDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

export default function AutreRiveImportsPage() {
  const [conversations, setConversations] = useState<ConversationImportée[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ConversationImportée | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadConversations = () => {
    const loadedConversations = readImportedConversations().sort(
      (first, second) => new Date(second.dateImport).getTime() - new Date(first.dateImport).getTime(),
    );
    setConversations(loadedConversations);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError("");

    const success = supprimerImport(deleteTarget.id);

    if (success) {
      setDeleteTarget(null);
      loadConversations();
    } else {
      setDeleteError("Impossible de supprimer cette conversation pour le moment.");
    }

    setIsDeleting(false);
  };

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[#d6b25e]/14 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm text-[#b8aa91] transition hover:text-[#f5efe3]" href="/autre-rive/dossiers">
              Retour aux dossiers
            </Link>
            <h1 className="mt-3 font-serif text-3xl text-[#f5efe3]">Conversations importées</h1>
            <p className="mt-1 text-sm text-[#b8aa91]">L&apos;Autre Rive</p>
          </div>
          <Link
            className="w-max rounded-full bg-[#d6b25e] px-5 py-2 font-semibold text-[#15110d] transition hover:bg-[#efd17a]"
            href="/autre-rive/import"
          >
            Nouvel import
          </Link>
        </header>

        {deleteError && (
          <section className="rounded-[14px] border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {deleteError}
          </section>
        )}

        {conversations.length === 0 ? (
          <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
            <p className="text-sm text-[#d7cab0]">Aucune conversation importée.</p>
            <Link
              className="mt-4 inline-flex rounded-full bg-[#d6b25e] px-5 py-2 font-semibold text-[#15110d] transition hover:bg-[#efd17a]"
              href="/autre-rive/import"
            >
              Importer une conversation
            </Link>
          </section>
        ) : (
          <section className="grid gap-3">
            {conversations.map((conversation) => (
              <article
                className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4"
                key={conversation.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-xl text-[#f5efe3]">
                      {conversation.nomFichier || "Conversation sans nom"}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9c8d73]">
                      {SOURCE_LABELS[conversation.source]} · {STATUS_LABELS[conversation.statut]} ·{" "}
                      {ANALYSIS_LEVEL_LABELS[conversation.niveauAnalyse]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#d7cab0]">
                      <span>{conversation.nombreMessages} message(s)</span>
                      <span>{conversation.nombreMessagesValidés} validé(s)</span>
                      {conversation.nombreMessagesRouge > 0 && (
                        <span className="text-red-300">{conversation.nombreMessagesRouge} rouge(s)</span>
                      )}
                      <span>Importé le {formatDate(conversation.dateImport)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      className="rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-[#b8aa91] transition hover:text-[#f5efe3]"
                      href={`/autre-rive/imports/${conversation.id}`}
                    >
                      Ouvrir
                    </Link>
                    <button
                      className="rounded-full border border-red-900/40 px-4 py-1.5 text-red-400/80 transition hover:text-red-300"
                      onClick={() => setDeleteTarget(conversation)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <section className="w-full max-w-md rounded-[14px] border border-[#d6b25e]/14 bg-[#15120f] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
              <h2 className="font-serif text-xl text-[#f5efe3]">Supprimer cette conversation ?</h2>
              <p className="mt-2 text-sm text-[#d7cab0]">
                {deleteTarget.nomFichier || "Conversation sans nom"}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-[#b8aa91] transition hover:text-[#f5efe3]"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="rounded-full border border-red-900/40 px-4 py-1.5 text-red-400/80 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  type="button"
                >
                  {isDeleting ? "Suppression..." : "Confirmer"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
