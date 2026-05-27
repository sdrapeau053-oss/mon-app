"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { getCompleteChapter } from "@/lib/manuscript-source";

const CHAPITRES_TOME_1_KEY = "chapitres-tome-1";
const AUDIT_VIBRATION_RESULTS_KEY = "audit-vibration-results";
const AUDIT_LINGUISTIQUE_RESULTS_KEY = "audit-linguistique-results";
const AUDIT_SUR_EXPLICATION_RESULTS_KEY = "audit-sur-explication-results";
const AUDIT_VOIX_RESULTS_KEY = "audit-voix-results";
const AUDIT_ANTI_IA_RESULTS_KEY = "audit-anti-ia-results";
const PIPELINE_EDITORIAL_NOTES_KEY = "pipeline-editorial-notes";

type StoredChapterStatus = "à écrire" | "écrit" | "scellé";
type PipelineStatus = "À faire" | "En cours" | "Attention" | "Validé" | "Prêt à sceller" | "Scellé";

type StoredChapter = {
  id: string;
  titre: string;
  description?: string;
  bloc: number;
  type: string;
  statut: StoredChapterStatus;
  contenu: string;
  ageApprox?: string;
  periode?: string;
  typeChapitre?: string;
  niveauLourdeur?: string;
  intensite?: number;
  potentielSerie?: string;
  typeEpisode?: string;
  imageCentrale?: string;
  fonctionNarrative?: string;
  statutStructure?: string;
};

type PipelineStep = {
  label: string;
  status: PipelineStatus;
  href?: string;
  meta?: string;
};

type StoredAuditVibration = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: unknown;
};

type StoredAuditVibrationMap = Record<string, StoredAuditVibration>;

type StoredAuditLinguistique = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: unknown;
};

type StoredAuditLinguistiqueMap = Record<string, StoredAuditLinguistique>;

type StoredAuditSurExplication = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: unknown;
};

type StoredAuditSurExplicationMap = Record<string, StoredAuditSurExplication>;

type StoredAuditVoix = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: unknown;
};

type StoredAuditVoixMap = Record<string, StoredAuditVoix>;

type StoredAuditAntiIa = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: unknown;
};

type StoredAuditAntiIaMap = Record<string, StoredAuditAntiIa>;
type EditorialNotesMap = Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeChapter(value: unknown): StoredChapter | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;

  return {
    id: value.id,
    titre: typeof value.titre === "string" && value.titre.trim() ? value.titre : value.id,
    description: typeof value.description === "string" ? value.description : undefined,
    bloc: typeof value.bloc === "number" ? value.bloc : 1,
    type: typeof value.type === "string" ? value.type : "",
    statut:
      value.statut === "à écrire" || value.statut === "écrit" || value.statut === "scellé"
        ? value.statut
        : "à écrire",
    contenu: typeof value.contenu === "string" ? value.contenu : "",
    ageApprox: typeof value.ageApprox === "string" ? value.ageApprox : undefined,
    periode: typeof value.periode === "string" ? value.periode : undefined,
    typeChapitre: typeof value.typeChapitre === "string" ? value.typeChapitre : undefined,
    niveauLourdeur: typeof value.niveauLourdeur === "string" ? value.niveauLourdeur : undefined,
    intensite: typeof value.intensite === "number" ? value.intensite : undefined,
    potentielSerie: typeof value.potentielSerie === "string" ? value.potentielSerie : undefined,
    typeEpisode: typeof value.typeEpisode === "string" ? value.typeEpisode : undefined,
    imageCentrale: typeof value.imageCentrale === "string" ? value.imageCentrale : undefined,
    fonctionNarrative: typeof value.fonctionNarrative === "string" ? value.fonctionNarrative : undefined,
    statutStructure: typeof value.statutStructure === "string" ? value.statutStructure : undefined,
  };
}

function getChapterNumber(chapter: StoredChapter) {
  const match = chapter.id.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getChapterStorageId(chapter: StoredChapter) {
  const number = getChapterNumber(chapter);
  return number ? String(number) : chapter.id;
}

function lireChapitresTome1() {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeChapter)
      .filter((chapter): chapter is StoredChapter => Boolean(chapter))
      .sort((a, b) => getChapterNumber(a) - getChapterNumber(b));
  } catch {
    return [];
  }
}

function lireAuditsVibration(): StoredAuditVibrationMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(AUDIT_VIBRATION_RESULTS_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed as StoredAuditVibrationMap : {};
  } catch {
    return {};
  }
}

function lireAuditsLinguistiques(): StoredAuditLinguistiqueMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(AUDIT_LINGUISTIQUE_RESULTS_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed as StoredAuditLinguistiqueMap : {};
  } catch {
    return {};
  }
}

function lireAuditsSurExplication(): StoredAuditSurExplicationMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(AUDIT_SUR_EXPLICATION_RESULTS_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed as StoredAuditSurExplicationMap : {};
  } catch {
    return {};
  }
}

function lireAuditsVoix(): StoredAuditVoixMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(AUDIT_VOIX_RESULTS_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed as StoredAuditVoixMap : {};
  } catch {
    return {};
  }
}

function lireAuditsAntiIa(): StoredAuditAntiIaMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(AUDIT_ANTI_IA_RESULTS_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed as StoredAuditAntiIaMap : {};
  } catch {
    return {};
  }
}

function lireNotesEditoriales(): EditorialNotesMap {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(PIPELINE_EDITORIAL_NOTES_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

function sauvegarderNotesEditoriales(notes: EditorialNotesMap) {
  if (typeof window === "undefined") return notes;
  localStorage.setItem(PIPELINE_EDITORIAL_NOTES_KEY, JSON.stringify(notes));
  return notes;
}

function formatChapterLabel(chapter: StoredChapter) {
  const number = getChapterNumber(chapter);
  return number ? `Chapitre ${number}` : chapter.id;
}

function formatDateAudit(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getGlobalStatus(chapter: StoredChapter | null, chapterText = ""): PipelineStatus {
  if (!chapter) return "À faire";
  if (chapter.statut === "scellé") return "Scellé";
  if (!chapterText.trim()) return "À faire";
  return "En cours";
}

function getDecisionFinale(status: PipelineStatus) {
  if (status === "Scellé") return "Scellé";
  if (status === "Prêt à sceller") return "Prêt à sceller";
  if (status === "Attention") return "À corriger";
  return "Non prêt";
}

function getPipelineSteps(
  chapter: StoredChapter | null,
  chapterText: string,
  audit?: StoredAuditVibration,
  controleLinguistique?: StoredAuditLinguistique,
  auditSurExplication?: StoredAuditSurExplication,
  auditVoix?: StoredAuditVoix,
  auditAntiIa?: StoredAuditAntiIa,
): PipelineStep[] {
  const globalStatus = getGlobalStatus(chapter, chapterText);
  const defaultStatus: PipelineStatus = globalStatus === "Scellé" ? "Scellé" : "À faire";
  const auditStatus: PipelineStatus = audit ? "Validé" : "À faire";
  const controleStatus: PipelineStatus = controleLinguistique ? "Validé" : "À faire";
  const surExplicationStatus: PipelineStatus = auditSurExplication ? "Validé" : "À faire";
  const voixStatus: PipelineStatus = auditVoix ? "Validé" : "À faire";
  const antiIaStatus: PipelineStatus = auditAntiIa ? "Validé" : "À faire";

  return [
    {
      label: "Audit de vibration nerveuse",
      status: auditStatus,
      href: "/audit-vibration",
      meta: audit ? `Dernier audit : ${formatDateAudit(audit.analyzedAt)}` : undefined,
    },
    {
      label: "Contrôle linguistique final",
      status: controleStatus,
      href: "/audit-linguistique",
      meta: controleLinguistique ? `Dernier contrôle : ${formatDateAudit(controleLinguistique.analyzedAt)}` : undefined,
    },
    {
      label: "Détection de sur-explication",
      status: surExplicationStatus,
      href: "/audit-sur-explication",
      meta: auditSurExplication ? `Dernier audit : ${formatDateAudit(auditSurExplication.analyzedAt)}` : undefined,
    },
    {
      label: "Cohérence de voix avec le Tome 1",
      status: voixStatus,
      href: "/audit-voix",
      meta: auditVoix ? `Dernier audit : ${formatDateAudit(auditVoix.analyzedAt)}` : undefined,
    },
    {
      label: "Contrôle anti-IA / humanisation",
      status: antiIaStatus,
      href: "/audit-anti-ia",
      meta: auditAntiIa ? `Dernier audit : ${formatDateAudit(auditAntiIa.analyzedAt)}` : undefined,
    },
    { label: "Validation de scellement", status: globalStatus === "Scellé" ? "Scellé" : "À faire" },
  ];
}

function getStatusStyle(status: PipelineStatus) {
  const styles: Record<PipelineStatus, { background: string; border: string; color: string }> = {
    "À faire": {
      background: "rgba(80, 65, 50, 0.08)",
      border: "rgba(80, 65, 50, 0.16)",
      color: "rgba(80, 65, 50, 0.68)",
    },
    "En cours": {
      background: "rgba(198, 169, 126, 0.18)",
      border: "rgba(198, 169, 126, 0.36)",
      color: "#6f5b3f",
    },
    Attention: {
      background: "rgba(192, 57, 43, 0.12)",
      border: "rgba(192, 57, 43, 0.26)",
      color: "#8b2f24",
    },
    Validé: {
      background: "rgba(107, 143, 113, 0.14)",
      border: "rgba(107, 143, 113, 0.28)",
      color: "#49694f",
    },
    "Prêt à sceller": {
      background: "rgba(201, 168, 76, 0.18)",
      border: "rgba(201, 168, 76, 0.34)",
      color: "#725f25",
    },
    Scellé: {
      background: "rgba(239, 229, 212, 0.16)",
      border: "rgba(239, 229, 212, 0.32)",
      color: "#efe5d4",
    },
  };

  return styles[status];
}

const warmCardStyle = {
  background: "#f5f0e8",
  border: "1px solid rgba(198, 169, 126, 0.3)",
  borderRadius: 10,
  color: "#1a1612",
} as const;

const labelStyle = {
  color: "rgba(80, 65, 50, 0.66)",
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  letterSpacing: "0.08em",
  margin: "0 0 6px",
  textTransform: "uppercase",
} as const;

export default function PipelineEditorialPage() {
  const [chapitres, setChapitres] = useState<StoredChapter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [auditsVibration, setAuditsVibration] = useState<StoredAuditVibrationMap>({});
  const [auditsLinguistiques, setAuditsLinguistiques] = useState<StoredAuditLinguistiqueMap>({});
  const [auditsSurExplication, setAuditsSurExplication] = useState<StoredAuditSurExplicationMap>({});
  const [auditsVoix, setAuditsVoix] = useState<StoredAuditVoixMap>({});
  const [auditsAntiIa, setAuditsAntiIa] = useState<StoredAuditAntiIaMap>({});
  const [notesEditoriales, setNotesEditoriales] = useState<EditorialNotesMap>({});

  useEffect(() => {
    const loaded = lireChapitresTome1();
    setChapitres(loaded);
    setSelectedId((current) => current || loaded[0]?.id || "");
    setAuditsVibration(lireAuditsVibration());
    setAuditsLinguistiques(lireAuditsLinguistiques());
    setAuditsSurExplication(lireAuditsSurExplication());
    setAuditsVoix(lireAuditsVoix());
    setAuditsAntiIa(lireAuditsAntiIa());
    setNotesEditoriales(lireNotesEditoriales());
  }, []);

  const selectedChapter = useMemo(
    () => chapitres.find((chapter) => chapter.id === selectedId) || null,
    [chapitres, selectedId],
  );
  const completeChapter = selectedChapter ? getCompleteChapter(selectedChapter.id) : null;
  const chapterText = completeChapter?.texte || "";
  const globalStatus = getGlobalStatus(selectedChapter, chapterText);
  const decisionFinale = getDecisionFinale(globalStatus);
  const auditVibration = selectedChapter ? auditsVibration[selectedChapter.id] : undefined;
  const auditLinguistique = selectedChapter ? auditsLinguistiques[getChapterStorageId(selectedChapter)] : undefined;
  const auditSurExplication = selectedChapter ? auditsSurExplication[getChapterStorageId(selectedChapter)] : undefined;
  const auditVoix = selectedChapter ? auditsVoix[getChapterStorageId(selectedChapter)] : undefined;
  const auditAntiIa = selectedChapter ? auditsAntiIa[getChapterStorageId(selectedChapter)] : undefined;
  const pipelineSteps = getPipelineSteps(selectedChapter, chapterText, auditVibration, auditLinguistique, auditSurExplication, auditVoix, auditAntiIa);
  const wordCount = completeChapter?.wordCount || 0;
  const selectedNoteKey = selectedChapter ? getChapterStorageId(selectedChapter) : "";
  const selectedNote = selectedNoteKey ? notesEditoriales[selectedNoteKey] || "" : "";

  function updateEditorialNote(value: string) {
    if (!selectedNoteKey) return;
    const nextNotes = { ...notesEditoriales, [selectedNoteKey]: value };
    setNotesEditoriales(nextNotes);
    sauvegarderNotesEditoriales(nextNotes);
  }

  return (
    <main
      style={{
        background: "#2a2118",
        boxShadow: "0 0 0 100vmax #2a2118",
        clipPath: "inset(0 -100vmax)",
        color: "#efe5d4",
        margin: "0 auto",
        maxWidth: 1040,
        minHeight: "100vh",
        padding: 28,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px 20px", marginBottom: 16 }}>
          <div>
            <p style={{ color: "#c6a97e", fontFamily: "system-ui, sans-serif", fontSize: 11, letterSpacing: "0.16em", margin: "0 0 8px", textTransform: "uppercase" }}>
              Scellement
            </p>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontStyle: "italic", fontWeight: 400, lineHeight: 1.12, margin: 0 }}>
              Pipeline éditorial
            </h1>
            <p style={{ color: "rgba(239, 229, 212, 0.68)", fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.6, margin: "10px 0 0" }}>
              Contrôler chaque chapitre avant scellement.
            </p>
          </div>
          <BackLink label="Système" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
          <Link href="/audit-vibration" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Audit vibration →
          </Link>
          <Link href="/audit-linguistique" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Contrôle langue →
          </Link>
          <Link href="/audit-sur-explication" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Sur-explication →
          </Link>
          <Link href="/audit-voix" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Voix →
          </Link>
          <Link href="/audit-anti-ia" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Anti-IA →
          </Link>
          <Link href="/structure-tome-1" style={{ color: "#c6a97e", fontFamily: "Georgia, serif", fontSize: 13, textDecoration: "none" }}>
            Carte Tome 1 →
          </Link>
        </div>
      </header>

      <section
        style={{
          background: "rgba(40, 32, 24, 0.85)",
          border: "1px solid rgba(198, 169, 126, 0.28)",
          borderLeft: "3px solid #c6a97e",
          borderRadius: 10,
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          padding: 18,
        }}
      >
        <div>
          <label style={{ color: "rgba(239, 229, 212, 0.72)", display: "block", fontFamily: "system-ui, sans-serif", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            Chapitre
          </label>
          <select
            disabled={chapitres.length === 0}
            onChange={(event) => setSelectedId(event.target.value)}
            style={{
              background: "#f5f0e8",
              border: "1px solid rgba(198, 169, 126, 0.42)",
              borderRadius: 8,
              color: "#1a1612",
              fontFamily: "Georgia, serif",
              fontSize: 14,
              padding: "10px 12px",
              width: "100%",
            }}
            value={selectedId}
          >
            {chapitres.length === 0 ? (
              <option value="">Aucun chapitre Tome 1 trouvé</option>
            ) : (
              chapitres.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {formatChapterLabel(chapter)} — {chapter.titre}
                </option>
              ))
            )}
          </select>
        </div>

        <div style={{ ...warmCardStyle, padding: 16 }}>
          {selectedChapter ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 10 }}>
                <div>
                  <p style={labelStyle}>{formatChapterLabel(selectedChapter)}</p>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 500, lineHeight: 1.2, margin: 0 }}>
                    {selectedChapter.titre}
                  </h2>
                </div>
                <span
                  style={{
                    ...getStatusStyle(globalStatus),
                    alignSelf: "flex-start",
                    border: `1px solid ${getStatusStyle(globalStatus).border}`,
                    borderRadius: 999,
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 11,
                    padding: "3px 9px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {globalStatus}
                </span>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                {[
                  ["Âge", selectedChapter.ageApprox || "—"],
                  ["Fonction", selectedChapter.fonctionNarrative || selectedChapter.typeChapitre || "—"],
                  ["Intensité", selectedChapter.intensite ? `int. ${selectedChapter.intensite}` : "—"],
                  ["Mots", wordCount > 0 ? String(wordCount) : "—"],
                  ["Fragments", completeChapter?.fragmentCount ? String(completeChapter.fragmentCount) : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={labelStyle}>{label}</p>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.45, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Ouvre d’abord la carte Tome 1 pour initialiser les chapitres locaux.
            </p>
          )}
        </div>
      </section>

      <section style={{ display: "grid", gap: 8, marginTop: 18 }}>
        {pipelineSteps.map((step, index) => {
          const statusStyle = getStatusStyle(step.status);

          return (
            <div
              key={step.label}
              style={{
                ...warmCardStyle,
                alignItems: "center",
                display: "grid",
                gap: 14,
                gridTemplateColumns: "34px minmax(0, 1fr) auto",
                padding: "12px 16px",
              }}
            >
              <span style={{ color: "rgba(80, 65, 50, 0.42)", fontFamily: "Georgia, serif", fontSize: 20 }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p style={{ color: "#1a1612", fontFamily: "Georgia, serif", fontSize: 16, margin: 0 }}>{step.label}</p>
                {step.meta && (
                  <p style={{ color: "rgba(80, 65, 50, 0.62)", fontFamily: "system-ui, sans-serif", fontSize: 11, margin: "3px 0 0" }}>
                    {step.meta}
                  </p>
                )}
                {step.href && (
                  <Link href={step.href} style={{ color: "#8B7355", fontFamily: "system-ui, sans-serif", fontSize: 11, textDecoration: "none" }}>
                    Ouvrir le module associé →
                  </Link>
                )}
              </div>
              <span
                style={{
                  background: statusStyle.background,
                  border: `1px solid ${statusStyle.border}`,
                  borderRadius: 999,
                  color: statusStyle.color,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 11,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {step.status}
              </span>
            </div>
          );
        })}
      </section>

      <section style={{ ...warmCardStyle, marginTop: 18, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 10 }}>
          <div>
            <p style={labelStyle}>Notes éditoriales</p>
            <h2 style={{ color: "#1a1612", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, lineHeight: 1.25, margin: 0 }}>
              Observations séparées du manuscrit
            </h2>
          </div>
          <span style={{ color: "rgba(80, 65, 50, 0.52)", fontFamily: "system-ui, sans-serif", fontSize: 11, whiteSpace: "nowrap" }}>
            {selectedNote.length} caractère{selectedNote.length > 1 ? "s" : ""}
          </span>
        </div>
        {!selectedNote && (
          <p style={{ color: "rgba(80, 65, 50, 0.58)", fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", lineHeight: 1.55, margin: "0 0 10px" }}>
            Aucune note éditoriale pour ce chapitre.
          </p>
        )}
        <textarea
          disabled={!selectedChapter}
          onChange={(event) => updateEditorialNote(event.target.value)}
          placeholder="Consigner ici les observations longues, audits éditoriaux, décisions de correction ou points à revoir..."
          style={{
            background: "rgba(255, 253, 248, 0.52)",
            border: "1px solid rgba(198, 169, 126, 0.34)",
            borderRadius: 9,
            color: "#1a1612",
            fontFamily: "Georgia, serif",
            fontSize: 14,
            lineHeight: 1.65,
            minHeight: 280,
            outline: "none",
            padding: "13px 14px",
            resize: "vertical",
            width: "100%",
          }}
          value={selectedNote}
        />
        <p style={{ color: "rgba(80, 65, 50, 0.48)", fontFamily: "system-ui, sans-serif", fontSize: 11, lineHeight: 1.5, margin: "8px 0 0" }}>
          Sauvegarde locale automatique dans un espace séparé du texte du chapitre.
        </p>
      </section>

      <section style={{ ...warmCardStyle, marginTop: 18, padding: 18 }}>
        <p style={labelStyle}>Décision finale</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["Non prêt", "À corriger", "Prêt à sceller", "Scellé"] as const).map((decision) => {
            const active = decision === decisionFinale;
            return (
              <span
                key={decision}
                style={{
                  background: active ? "rgba(198, 169, 126, 0.24)" : "rgba(80, 65, 50, 0.06)",
                  border: `1px solid ${active ? "rgba(198, 169, 126, 0.48)" : "rgba(80, 65, 50, 0.12)"}`,
                  borderRadius: 999,
                  color: active ? "#1a1612" : "rgba(80, 65, 50, 0.58)",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 12,
                  padding: "6px 11px",
                }}
              >
                {decision}
              </span>
            );
          })}
        </div>
      </section>
    </main>
  );
}
