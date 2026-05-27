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
const AUDIT_VOIX_RESULTS_KEY = "audit-voix-results";

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

type RuptureDetectee = {
  extrait: string;
  probleme: string;
  impact: string;
};

type AuditVoixResult = {
  niveauCohesionVoix: string;
  scoreJustesseNue: string;
  rythme: string;
  textureCorporelle: string;
  niveauAbstraction: string;
  coherenceLexicale: string;
  coherenceEmotionnelle: string;
  rupturesDetectees: RuptureDetectee[];
  chapitresProches: string[];
  chapitresTresDifferents: string[];
  recommandationsEditoriales: string[];
  decision: string;
};

type StoredAuditVoix = {
  chapterId: string;
  chapterTitle: string;
  analyzedAt: string;
  wordCount: number;
  paragraphCount: number;
  result: AuditVoixResult;
};

type StoredAuditVoixMap = Record<string, StoredAuditVoix>;

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

function sauvegarderAuditVoix(audit: StoredAuditVoix) {
  if (typeof window === "undefined") return {};

  const audits = lireAuditsVoix();
  const updated = {
    ...audits,
    [audit.chapterId]: audit,
  };

  localStorage.setItem(AUDIT_VOIX_RESULTS_KEY, JSON.stringify(updated));
  return updated;
}

function formatChapterLabel(chapter: StoredChapter) {
  const number = getChapterNumber(chapter);
  return number ? `Chapitre ${number}` : chapter.id;
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

function renderList(items: string[], fallback: string) {
  if (items.length === 0) {
    return <p style={bodyTextStyle}>{fallback}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {items.map((item, index) => (
        <p key={`${item}-${index}`} style={bodyTextStyle}>
          {item}
        </p>
      ))}
    </div>
  );
}

export default function AuditVoixPage() {
  const [chapitres, setChapitres] = useState<StoredChapter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditVoixResult | null>(null);
  const [texteChapitre, setTexteChapitre] = useState("");
  const [texteOuvert, setTexteOuvert] = useState(false);
  const [auditsVoix, setAuditsVoix] = useState<StoredAuditVoixMap>({});

  useEffect(() => {
    const loaded = lireChapitresTome1();
    setChapitres(loaded);
    setSelectedId((current) => current || loaded[0]?.id || "");
    setAuditsVoix(lireAuditsVoix());
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
  const chapterStorageId = selectedChapter ? getChapterStorageId(selectedChapter) : "";
  const dernierAudit = chapterStorageId ? auditsVoix[chapterStorageId] : undefined;

  async function analyserVoix() {
    if (!selectedChapter) return;

    if (!texteChapitre.trim()) {
      setResult(null);
      setError("Chapitre vide");
      return;
    }

    if (texteChapitre.trim().length < 300) {
      setResult(null);
      setError("Le texte du chapitre est trop court pour analyser la cohérence de voix.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/audit-voix", {
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
        setError(data.error || "Audit de voix impossible pour le moment.");
        return;
      }

      const auditResult = data.result as AuditVoixResult;
      setResult(auditResult);
      setAuditsVoix(sauvegarderAuditVoix({
        chapterId: getChapterStorageId(selectedChapter),
        chapterTitle: selectedChapter.titre,
        analyzedAt: new Date().toISOString(),
        wordCount: nombreMots,
        paragraphCount: nombreParagraphes,
        result: auditResult,
      }));
    } catch {
      setError("Impossible de contacter le module de cohérence de voix.");
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
            Tome 1
          </p>
            <h1 className="internal-title" style={{ fontStyle: "italic" }}>
            Cohérence de voix
          </h1>
            <p className="internal-subtitle">
            Comparer le chapitre avec la voix globale du Tome 1.
          </p>
        </div>
          <SystemActionRow>
            <Link className="soft-button" href="/pipeline-editorial" style={{ fontSize: 13, textDecoration: "none" }}>
            Pipeline →
          </Link>
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
            onClick={analyserVoix}
            style={{
              marginTop: 12,
              width: "100%",
            }}
          >
            {loading ? "Analyse en cours..." : "Analyser la cohérence de voix"}
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
                    selectedChapter.intensite ? `int. ${selectedChapter.intensite}` : "",
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
            if (error === "Le texte du chapitre est trop court pour analyser la cohérence de voix.") {
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

      {result && (
          <section style={{ display: "grid", gap: 10 }}>
            <SystemGrid gap={10} min={260}>
          {[
            ["1. Niveau de cohésion de voix", result.niveauCohesionVoix],
            ["2. Score Justesse Nue", result.scoreJustesseNue],
            ["3. Rythme", result.rythme],
            ["4. Texture corporelle", result.textureCorporelle],
            ["5. Niveau d’abstraction", result.niveauAbstraction],
            ["6. Cohérence lexicale", result.coherenceLexicale],
            ["7. Cohérence émotionnelle", result.coherenceEmotionnelle],
          ].map(([label, value]) => (
            <div key={label} style={sectionStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={bodyTextStyle}>{value}</p>
            </div>
          ))}
            </SystemGrid>

          <div style={sectionStyle}>
            <p style={labelStyle}>8. Ruptures détectées</p>
            {result.rupturesDetectees.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {result.rupturesDetectees.map((rupture, index) => (
                  <div key={`${rupture.extrait}-${index}`} style={{ borderTop: index === 0 ? "none" : "1px solid rgba(80, 65, 50, 0.14)", paddingTop: index === 0 ? 0 : 12 }}>
                    {rupture.extrait && (
                      <p style={{ ...bodyTextStyle, fontStyle: "italic", marginBottom: 6 }}>
                        “{rupture.extrait}”
                      </p>
                    )}
                    {rupture.probleme && (
                      <p style={{ ...bodyTextStyle, fontSize: 14 }}>
                        Problème : {rupture.probleme}
                      </p>
                    )}
                    {rupture.impact && (
                      <p style={{ ...bodyTextStyle, color: "#b0a28a", fontSize: 14, marginTop: 4 }}>
                        Impact : {rupture.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={bodyTextStyle}>Aucune rupture claire détectée.</p>
            )}
          </div>

          <div style={sectionStyle}>
            <p style={labelStyle}>9. Chapitres proches</p>
            {renderList(result.chapitresProches, "Aucun chapitre proche identifié.")}
          </div>

          <div style={sectionStyle}>
            <p style={labelStyle}>10. Chapitres très différents</p>
            {renderList(result.chapitresTresDifferents, "Aucun chapitre très différent identifié.")}
          </div>

          <div style={sectionStyle}>
            <p style={labelStyle}>11. Recommandations éditoriales</p>
            {renderList(result.recommandationsEditoriales, "Aucune recommandation éditoriale.")}
          </div>

          <div style={sectionStyle}>
            <p style={labelStyle}>12. Décision</p>
            <p style={bodyTextStyle}>{result.decision}</p>
          </div>
        </section>
      )}
      </SystemPageShell>
    </main>
  );
}
