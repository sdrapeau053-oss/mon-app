"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  readImportedConversations,
  readImportedMessages,
  readMessagesByConversation,
  saveImportedMessages,
  updateImportedConversation,
  type AuteurMessage,
  type ConversationImportée,
  type Message,
  type NiveauAnalyse,
  type SourceImport,
  type StatutConversation,
  type StatutValidation,
} from "@/lib/autre-rive";

type FiltreStatut = StatutValidation | "tous";
type EditDraft = {
  auteur: AuteurMessage;
  date: string;
  texte: string;
};

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

const AUTHOR_LABELS: Record<AuteurMessage, string> = {
  autre: "Autre",
  inconnu: "Inconnu",
  moi: "Moi",
};

const FILTERS: Array<{ label: string; value: FiltreStatut }> = [
  { label: "Tous", value: "tous" },
  { label: "Rouge", value: "rouge" },
  { label: "Orange", value: "orange" },
  { label: "Jaune", value: "jaune" },
  { label: "Validé", value: "validé" },
];

function formatDate(date: string): string {
  if (!date.trim()) return "Date inconnue";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function getAuthorLabel(message: Message): string {
  if (message.auteur === "autre") return message.nomAuteur || "Autre";
  return AUTHOR_LABELS[message.auteur];
}

function getStatusBadgeClass(statut: StatutValidation): string {
  if (statut === "rouge") return "border-red-900/40 text-red-400";
  if (statut === "orange") return "border-orange-900/40 text-orange-400";
  if (statut === "jaune") return "border-yellow-900/30 text-yellow-400";
  return "border-green-900/30 text-green-400";
}

function getValidationAfterCorrection(auteur: AuteurMessage): {
  niveauConfiance: Message["niveauConfiance"];
  statutValidation: StatutValidation;
  valide: boolean;
} {
  if (auteur === "inconnu") {
    return {
      niveauConfiance: "faible",
      statutValidation: "rouge",
      valide: false,
    };
  }

  return {
    niveauConfiance: "élevé",
    statutValidation: "validé",
    valide: true,
  };
}

function getNomAuteurFromAuteur(auteur: AuteurMessage, currentNomAuteur: string): string {
  if (auteur === "moi") return "Moi";
  if (auteur === "inconnu") return "Inconnu";
  return currentNomAuteur || "Autre";
}

function buildUpdatedConversation(conversation: ConversationImportée, nextMessages: Message[]): ConversationImportée {
  const nombreMessages = nextMessages.length;
  const nombreMessagesValidés = nextMessages.filter((message) => message.valide).length;
  const nombreMessagesRouge = nextMessages.filter((message) => message.statutValidation === "rouge").length;
  const nombreMessagesOrange = nextMessages.filter((message) => message.statutValidation === "orange").length;
  const nombreMessagesJaune = nextMessages.filter((message) => message.statutValidation === "jaune").length;
  const statut: StatutConversation =
    nombreMessagesRouge > 0
      ? "en_validation"
      : nombreMessages > 0 && nombreMessagesValidés === nombreMessages
        ? "validé"
        : "importé";

  return {
    ...conversation,
    dateModification: new Date().toISOString(),
    messages: nextMessages,
    nombreMessages,
    nombreMessagesJaune,
    nombreMessagesOrange,
    nombreMessagesRouge,
    nombreMessagesValidés,
    prêtPourAnalyse: statut === "validé" && nombreMessages >= 10,
    statut,
  };
}

export default function AutreRiveImportDetailPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const [conversation, setConversation] = useState<ConversationImportée | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("tous");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErreur(null);

    const foundConversation =
      readImportedConversations().find((item) => item.id === conversationId) ?? null;

    if (!foundConversation) {
      setConversation(null);
      setMessages([]);
      setErreur("Conversation introuvable.");
      setIsLoading(false);
      return;
    }

    setConversation(foundConversation);
    setMessages(readMessagesByConversation(conversationId));
    setIsLoading(false);
  }, [conversationId]);

  const filteredMessages = useMemo(() => {
    if (filtreStatut === "tous") return messages;
    return messages.filter((message) => message.statutValidation === filtreStatut);
  }, [filtreStatut, messages]);

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditDraft({
      auteur: message.auteur,
      date: message.dateOriginale || message.date,
      texte: message.texte,
    });
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditDraft(null);
  };

  const saveCorrection = (message: Message) => {
    if (!conversation || !editDraft) return;

    setIsSaving(true);
    setErreur(null);

    const validation = getValidationAfterCorrection(editDraft.auteur);
    const updatedMessage: Message = {
      ...message,
      auteur: editDraft.auteur,
      corrigéManuellement: true,
      date: editDraft.date,
      dateOriginale: editDraft.date,
      niveauConfiance: validation.niveauConfiance,
      nomAuteur: getNomAuteurFromAuteur(editDraft.auteur, message.nomAuteur),
      statutValidation: validation.statutValidation,
      texte: editDraft.texte,
      textOriginal: message.textOriginal || message.texte,
      valide: validation.valide,
    };
    const allMessages = readImportedMessages();
    const nextAllMessages = allMessages.map((item) => (item.id === message.id ? updatedMessage : item));
    const nextConversationMessages = messages.map((item) => (item.id === message.id ? updatedMessage : item));
    const nextConversation = buildUpdatedConversation(conversation, nextConversationMessages);
    const messagesSaved = saveImportedMessages(nextAllMessages);
    const conversationSaved = updateImportedConversation(conversation.id, () => nextConversation);

    if (!messagesSaved || !conversationSaved) {
      setErreur("Impossible d'enregistrer la correction.");
      setIsSaving(false);
      return;
    }

    setMessages(nextConversationMessages);
    setConversation(nextConversation);
    setEditingMessageId(null);
    setEditDraft(null);
    setToast("Correction enregistrée");
    setIsSaving(false);
    window.setTimeout(() => setToast(""), 1500);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
          Chargement...
        </section>
      </main>
    );
  }

  if (erreur || !conversation) {
    return (
      <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
          <h1 className="font-serif text-2xl text-[#f5efe3]">Conversation introuvable.</h1>
          <Link
            className="mt-4 inline-flex rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-[#b8aa91] transition hover:text-[#f5efe3]"
            href="/autre-rive/imports"
          >
            Retour aux imports
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="border-b border-[#d6b25e]/14 pb-5">
          <Link className="text-sm text-[#b8aa91] transition hover:text-[#f5efe3]" href="/autre-rive/imports">
            Retour aux imports
          </Link>
          <h1 className="mt-3 font-serif text-3xl text-[#f5efe3]">
            {conversation.nomFichier || "Conversation sans nom"}
          </h1>
          <p className="mt-1 text-sm text-[#b8aa91]">
            {SOURCE_LABELS[conversation.source]} · {STATUS_LABELS[conversation.statut]} ·{" "}
            {ANALYSIS_LEVEL_LABELS[conversation.niveauAnalyse]}
          </p>
          <p className="mt-1 text-xs text-[#9c8d73]">Importée le {formatDate(conversation.dateImport)}</p>
        </header>

        <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
          <div className="flex flex-wrap gap-2 text-sm text-[#d7cab0]">
            <span className="rounded-full border border-[#d6b25e]/14 px-3 py-1">
              Total messages : {conversation.nombreMessages}
            </span>
            <span className="rounded-full border border-green-900/30 px-3 py-1 text-green-400">
              Validés : {conversation.nombreMessagesValidés}
            </span>
            {conversation.nombreMessagesRouge > 0 && (
              <span className="rounded-full border border-red-900/40 px-3 py-1 text-red-400">
                Rouges : {conversation.nombreMessagesRouge}
              </span>
            )}
            {conversation.nombreMessagesOrange > 0 && (
              <span className="rounded-full border border-orange-900/40 px-3 py-1 text-orange-400">
                Orange : {conversation.nombreMessagesOrange}
              </span>
            )}
            {conversation.nombreMessagesJaune > 0 && (
              <span className="rounded-full border border-yellow-900/30 px-3 py-1 text-yellow-400">
                Jaunes : {conversation.nombreMessagesJaune}
              </span>
            )}
            <span className="rounded-full border border-[#d6b25e]/14 px-3 py-1">
              {conversation.prêtPourAnalyse ? "Prêt pour analyse" : "Validation requise"}
            </span>
          </div>
        </section>

        {toast && (
          <section className="rounded-[14px] border border-green-900/30 bg-green-950/20 p-3 text-sm text-green-300">
            {toast}
          </section>
        )}

        <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]">Filtrer par statut</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                className={[
                  "rounded-full border px-4 py-1.5 text-sm transition",
                  filtreStatut === filter.value
                    ? "border-[#d6b25e]/48 bg-[#d6b25e]/12 text-[#f5efe3]"
                    : "border-[#d6b25e]/18 text-[#b8aa91] hover:text-[#f5efe3]",
                ].join(" ")}
                key={filter.value}
                onClick={() => setFiltreStatut(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {filteredMessages.length === 0 ? (
          <section className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4 text-sm text-[#d7cab0]">
            Aucun message dans cette conversation.
          </section>
        ) : (
          <section className="grid gap-3">
            {filteredMessages.map((message, index) => (
              <article
                className="rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4"
                key={message.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9c8d73]">
                      Message {index + 1} · {getAuthorLabel(message)}
                    </p>
                    <p className="mt-1 text-xs text-[#b8aa91]">
                      {formatDate(message.dateOriginale || message.dateImport)} · {SOURCE_LABELS[message.source]} ·{" "}
                      Confiance {message.niveauConfiance}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs",
                        getStatusBadgeClass(message.statutValidation),
                      ].join(" ")}
                    >
                      {message.statutValidation}
                    </span>
                    {message.corrigéManuellement && (
                      <span className="rounded-full border border-[#d6b25e]/14 px-3 py-1 text-xs text-[#d7cab0]">
                        Corrigé
                      </span>
                    )}
                    <button
                      className="rounded-full border border-[#d6b25e]/18 px-3 py-1 text-xs text-[#b8aa91] transition hover:text-[#f5efe3]"
                      onClick={() => startEditing(message)}
                      type="button"
                    >
                      Corriger
                    </button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#f5efe3]">{message.texte}</p>
                {editingMessageId === message.id && editDraft && (
                  <div className="mt-4 grid gap-3 rounded-[12px] border border-[#d6b25e]/14 bg-[#0d0c0a]/42 p-3">
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#9c8d73]">
                        Auteur
                        <select
                          className="rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-sm normal-case tracking-normal text-[#d7cab0] outline-none"
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, auteur: event.target.value as AuteurMessage })
                          }
                          value={editDraft.auteur}
                        >
                          <option value="moi">Moi</option>
                          <option value="autre">Autre</option>
                          <option value="inconnu">Inconnu</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#9c8d73]">
                        Date
                        <input
                          className="rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-sm normal-case tracking-normal text-[#d7cab0] outline-none"
                          onChange={(event) => setEditDraft({ ...editDraft, date: event.target.value })}
                          type="text"
                          value={editDraft.date}
                        />
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#9c8d73]">
                      Texte
                      <textarea
                        className="min-h-28 rounded-[10px] border border-[#d6b25e]/14 bg-[#14110e] px-3 py-2 text-sm normal-case leading-6 tracking-normal text-[#d7cab0] outline-none"
                        onChange={(event) => setEditDraft({ ...editDraft, texte: event.target.value })}
                        value={editDraft.texte}
                      />
                    </label>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="rounded-full border border-[#d6b25e]/18 px-4 py-1.5 text-sm text-[#b8aa91] transition hover:text-[#f5efe3]"
                        disabled={isSaving}
                        onClick={cancelEditing}
                        type="button"
                      >
                        Annuler
                      </button>
                      <button
                        className="rounded-full bg-[#d6b25e] px-5 py-2 text-sm font-semibold text-[#15110d] transition hover:bg-[#efd17a] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={isSaving || !editDraft.texte.trim()}
                        onClick={() => saveCorrection(message)}
                        type="button"
                      >
                        {isSaving ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
