"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { getCompleteChapter, getCompleteChapters } from "@/lib/manuscript-source";

const CHAPITRES_TOME_1_KEY = "chapitres-tome-1";
const AUDIT_VIBRATION_RESULTS_KEY = "audit-vibration-results";

type StoredChapterStatus = "à écrire" | "écrit" | "scellé";

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

type AuditVibrationResult = {
  loiImplicite: string;
  typeTensionDominant: string;
  mecanismeCorporel: string;
  doublonsPossibles: unknown[];
  niveauNecessite: string;
  saturationEmotionnelle: string;
  recommandationEditoriale: string;
  questionCorrection: string;
};

type StoredAuditVibration = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: AuditVibrationResult;
};

type StoredAuditVibrationMap = Record<string, StoredAuditVibration>;

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

function sauvegarderAuditVibration(audit: StoredAuditVibration) {
  if (typeof window === "undefined") return {};

  const audits = lireAuditsVibration();
  const updated = {
    ...audits,
    [audit.chapterId]: audit,
  };

  localStorage.setItem(AUDIT_VIBRATION_RESULTS_KEY, JSON.stringify(updated));
  return updated;
}

function formatChapterLabel(chapter: StoredChapter) {
  const number = getChapterNumber(chapter);
  return number ? `Chapitre ${number}` : chapter.id;
}

function getTextField(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function formatDoublonPossible(doublon: unknown) {
  if (typeof doublon === "string") return doublon;
  if (!isRecord(doublon)) return String(doublon || "");

  const chapitre = getTextField(doublon.chapitre) || getTextField(doublon.numero);
  const titre = getTextField(doublon.titre);
  const raison =
    getTextField(doublon.raison) ||
    getTextField(doublon.justification) ||
    getTextField(doublon.similarite);

  const chapitreLabel = chapitre ? `Chapitre ${chapitre}` : "Chapitre non précisé";
  const titreLabel = titre ? ` — ${titre}` : "";
  const raisonLabel = raison ? ` : ${raison}` : "";

  return `${chapitreLabel}${titreLabel}${raisonLabel}`;
}

function formatDoublonsPossibles(doublons: unknown) {
  if (!Array.isArray(doublons)) return [];
  return doublons.map(formatDoublonPossible).filter(Boolean);
}

function compterMots(texte: string) {
  return texte.trim().split(/\s+/).filter(Boolean).length;
}

function compterParagraphes(texte: string) {
  return texte.split(/\n\s*\n/).map((paragraphe) => paragraphe.trim()).filter(Boolean).length;
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

const sectionStyle = {
  background: "rgba(255, 250, 238, 0.035)",
  border: "1px solid rgba(201, 168, 92, 0.14)",
  borderRadius: 10,
  padding: "14px 16px",
} as const;

const labelStyle = {
  color: "#a99b84",
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  letterSpacing: "0.14em",
  margin: "0 0 7px",
  textTransform: "uppercase",
} as const;

const bodyTextStyle = {
  color: "#efe5d4",
  fontFamily: "Georgia, serif",
  fontSize: 15,
  lineHeight: 1.6,
  margin: 0,
} as const;

export default function AuditVibrationPage() {
  const [chapitres, setChapitres] = useState<StoredChapter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditVibrationResult | null>(null);
  const [texteChapitre, setTexteChapitre] = useState("");
  const [texteOuvert, setTexteOuvert] = useState(false);
  const [auditsVibration, setAuditsVibration] = useState<StoredAuditVibrationMap>({});

  useEffect(() => {
    const loaded = lireChapitresTome1();
    setChapitres(loaded);
    setSelectedId((current) => current || loaded[0]?.id || "");
    setAuditsVibration(lireAuditsVibration());
  }, []);

  const selectedChapter = useMemo(
    () => chapitres.find((chapter) => chapter.id === selectedId) || null,
    [chapitres, selectedId],
  );

  useEffect(() => {
    setTexteChapitre(selectedChapter ? getCompleteChapter(selectedChapter.id)?.texte || "" : "");
    setTexteOuvert(false);
  }, [selectedChapter]);

  const nombreMots = compterMots(texteChapitre);
  const nombreParagraphes = compterParagraphes(texteChapitre);
  const dernierAudit = selectedChapter ? auditsVibration[selectedChapter.id] : undefined;

  async function analyserVibration() {
    if (!selectedChapter) return;

    if (!texteChapitre.trim()) {
      setResult(null);
      setError("Chapitre vide");
      return;
    }

    if (texteChapitre.trim().length < 300) {
      setResult(null);
      setError("Le texte du chapitre est trop court pour une analyse nerveuse fiable.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/audit-vibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapitre: {
            ...selectedChapter,
            titre: selectedChapter.titre,
            ageApprox: selectedChapter.ageApprox,
            fonctionNarrative: selectedChapter.fonctionNarrative,
            intensite: selectedChapter.intensite,
            contenu: texteChapitre,
          },
          chapitres: getCompleteChapters().map((completeChapter) => ({
            ...completeChapter.chapter,
            contenu: completeChapter.texte,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Audit impossible pour le moment.");
        return;
      }

      const auditResult = data.result as AuditVibrationResult;
      setResult(auditResult);
      setAuditsVibration(sauvegarderAuditVibration({
        chapterId: selectedChapter.id,
        chapterTitle: selectedChapter.titre,
        analyzedAt: new Date().toISOString(),
        wordCount: nombreMots,
        paragraphCount: nombreParagraphes,
        result: auditResult,
      }));
    } catch {
      setError("Impossible de contacter le module d'audit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={980} padding="22px 16px 44px">
      <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p className="internal-kicker">
            Audit éditorial
          </p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>
            Audit de vibration nerveuse
          </h1>
          <p className="internal-subtitle">
            Détecter les répétitions de fonction émotionnelle ou corporelle entre les chapitres du Tome 1.
          </p>
        </div>
        <SystemActionRow>
        <Link className="soft-button" href="/structure-tome-1" style={{ fontSize: 13, textDecoration: "none" }}>
          Carte Tome 1 →
        </Link>
        </SystemActionRow>
      </header>

      <SystemPanel
        ariaLabel="Sélection du chapitre"
        style={{
          borderLeft: "3px solid #c6a97e",
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        }}
      >
        <div>
          <label className="label-meta" style={{ display: "block", marginBottom: 8 }}>
            Chapitre
          </label>
          <select
            className="filter-select"
            disabled={chapitres.length === 0 || loading}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setResult(null);
              setError("");
            }}
            style={{ fontSize: 14, padding: "10px 12px", width: "100%" }}
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

          <button
            className="btn-primary"
            disabled={!selectedChapter || loading}
            onClick={analyserVibration}
            style={{
              marginTop: 12,
              width: "100%",
            }}
          >
            {loading ? "Analyse en cours..." : "Analyser la vibration nerveuse"}
          </button>
          {dernierAudit && (
            <p style={{ color: "rgba(239, 229, 212, 0.62)", fontFamily: "system-ui, sans-serif", fontSize: 11, lineHeight: 1.45, margin: "10px 0 0" }}>
              Dernier audit : {formatDateAudit(dernierAudit.analyzedAt)}
            </p>
          )}
        </div>

        <div style={{ ...sectionStyle, alignSelf: "stretch" }}>
          {selectedChapter ? (
            <>
              <p style={labelStyle}>{formatChapterLabel(selectedChapter)}</p>
              <h2 style={{ color: "#f1e7d5", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, lineHeight: 1.25, margin: "0 0 10px" }}>
                {selectedChapter.titre}
              </h2>
              <SystemActionRow>
                {[
                  selectedChapter.ageApprox,
                  selectedChapter.typeChapitre,
                  selectedChapter.fonctionNarrative,
                  `${nombreMots} mot${nombreMots > 1 ? "s" : ""}`,
                  `${nombreParagraphes} paragraphe${nombreParagraphes > 1 ? "s" : ""}`,
                ].filter((item): item is string => Boolean(item)).map((item) => (
                  <StatusChip key={item}>{item}</StatusChip>
                ))}
              </SystemActionRow>
            </>
          ) : (
            <p style={bodyTextStyle}>Ouvre d’abord la carte Tome 1 pour initialiser les chapitres locaux.</p>
          )}
        </div>
      </SystemPanel>

      <SystemPanel ariaLabel="Texte complet du chapitre" compact>
        <SystemSectionHeader
          eyebrow="Zone éditable"
          title="Texte complet du chapitre"
          actions={
            <span className="word-count">
              {nombreMots} mot{nombreMots > 1 ? "s" : ""} · {nombreParagraphes} paragraphe{nombreParagraphes > 1 ? "s" : ""}
            </span>
          }
        />
        <textarea
          className="textarea-atelier"
          disabled={loading}
          onChange={(event) => {
            setTexteChapitre(event.target.value);
            setResult(null);
            if (error === "Le texte du chapitre est trop court pour une analyse nerveuse fiable.") {
              setError("");
            }
          }}
          placeholder="Colle ici le texte complet du chapitre…"
          style={{
            height: texteOuvert ? 350 : 96,
            minHeight: texteOuvert ? 350 : 96,
            overflowY: texteOuvert ? "auto" : "hidden",
            resize: texteOuvert ? "vertical" : "none",
          }}
          value={texteChapitre}
        />
        <button
          className="soft-button"
          onClick={() => setTexteOuvert((current) => !current)}
          style={{ fontSize: 12, marginTop: 8, padding: 0 }}
          type="button"
        >
          {texteOuvert ? "Réduire le texte ▲" : "Voir le texte complet ▼"}
        </button>
      </SystemPanel>

      {error && (
        <SystemPanel compact style={{ borderColor: "rgba(181, 107, 95, 0.45)" }}>
          <p style={{ ...bodyTextStyle, color: "#d79a8f" }}>{error}</p>
        </SystemPanel>
      )}

      {result && (() => {
        const doublonsPossibles = formatDoublonsPossibles(result.doublonsPossibles);

        return (
          <section style={{ display: "grid", gap: 10 }}>
            <SystemGrid gap={10} min={260}>
              {[
                ["1. Loi implicite", result.loiImplicite],
                ["2. Type de tension", result.typeTensionDominant],
                ["3. Mécanisme corporel", result.mecanismeCorporel],
              ].map(([label, value]) => (
                <div key={label} style={sectionStyle}>
                  <p style={labelStyle}>{label}</p>
                  <p style={bodyTextStyle}>{value}</p>
                </div>
              ))}
            </SystemGrid>

            <div style={sectionStyle}>
              <p style={labelStyle}>4. Doublons possibles</p>
              {doublonsPossibles.length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {doublonsPossibles.map((doublon, index) => (
                    <p key={`${doublon}-${index}`} style={bodyTextStyle}>
                      {doublon}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={bodyTextStyle}>Aucun doublon nerveux clair.</p>
              )}
            </div>

            {[
              ["5. Niveau de nécessité", result.niveauNecessite],
              ["6. Saturation", result.saturationEmotionnelle],
              ["7. Recommandation", result.recommandationEditoriale],
              ["8. Question de correction", result.questionCorrection],
            ].map(([label, value]) => (
              <div key={label} style={sectionStyle}>
                <p style={labelStyle}>{label}</p>
                <p style={bodyTextStyle}>{value}</p>
              </div>
            ))}
          </section>
        );
      })()}
      </SystemPageShell>
    </main>
  );
}
