import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuditTraceabilityMetadata,
  getEditorialSystemPrompt,
  type AuditTraceabilityMetadata,
} from "@/lib/editorial-governance";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_PROVIDER = "anthropic";
const MODEL_NAME = "claude-sonnet-4-20250514";
const RESULT_SCHEMA_VERSION = "1.0.0";
const PROMPT_ID = "LHS-VOICE-LONGITUDINAL";
const TEXT_VERSION = "primary-chapter-text-v1; references-context-not-hashed";

type ChapitreAudit = {
  id: string;
  titre: string;
  bloc?: number;
  statut?: string;
  ageApprox?: string;
  periode?: string;
  typeChapitre?: string;
  niveauLourdeur?: string;
  intensite?: number;
  imageCentrale?: string;
  fonctionNarrative?: string;
  description?: string;
  contenu?: string;
};

type VoiceLongitudinalResult = {
  overallStatus: string;
  continuity: string[];
  evolution: string[];
  ruptures: string[];
  repetitions: string[];
  overHarmonization: string[];
  recommendations: string[];
  uncertainty: string[];
  traceability: AuditTraceabilityMetadata;
};

const REQUIRED_FIELDS = [
  "overallStatus",
  "continuity",
  "evolution",
  "ruptures",
  "repetitions",
  "overHarmonization",
  "recommendations",
  "uncertainty",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeChapter(value: unknown): ChapitreAudit | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.titre !== "string") return null;

  return {
    id: value.id,
    titre: value.titre,
    bloc: typeof value.bloc === "number" ? value.bloc : undefined,
    statut: typeof value.statut === "string" ? value.statut : undefined,
    ageApprox: typeof value.ageApprox === "string" ? value.ageApprox : undefined,
    periode: typeof value.periode === "string" ? value.periode : undefined,
    typeChapitre: typeof value.typeChapitre === "string" ? value.typeChapitre : undefined,
    niveauLourdeur: typeof value.niveauLourdeur === "string" ? value.niveauLourdeur : undefined,
    intensite: typeof value.intensite === "number" ? value.intensite : undefined,
    imageCentrale: typeof value.imageCentrale === "string" ? value.imageCentrale : undefined,
    fonctionNarrative: typeof value.fonctionNarrative === "string" ? value.fonctionNarrative : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    contenu: typeof value.contenu === "string" ? value.contenu : undefined,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function extractJson(raw: string, traceability: AuditTraceabilityMetadata): VoiceLongitudinalResult {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse Claude sans JSON exploitable.");
  }

  const parsed = JSON.parse(clean.slice(start, end + 1));
  const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));

  if (missing.length > 0) {
    throw new Error(`Champs manquants : ${missing.join(", ")}.`);
  }

  return {
    overallStatus: String(parsed.overallStatus || ""),
    continuity: normalizeStringArray(parsed.continuity),
    evolution: normalizeStringArray(parsed.evolution),
    ruptures: normalizeStringArray(parsed.ruptures),
    repetitions: normalizeStringArray(parsed.repetitions),
    overHarmonization: normalizeStringArray(parsed.overHarmonization),
    recommendations: normalizeStringArray(parsed.recommendations),
    uncertainty: normalizeStringArray(parsed.uncertainty),
    traceability,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY manquante dans .env.local" },
        { status: 500 },
      );
    }

    const body = await req.json() as unknown;
    const payload = isRecord(body) ? body : {};
    const chapitre = normalizeChapter(payload.chapitre);
    const autresChapitres = Array.isArray(payload.chapitres)
      ? payload.chapitres.map(normalizeChapter).filter((item: ChapitreAudit | null): item is ChapitreAudit => Boolean(item))
      : [];

    if (!chapitre) {
      return NextResponse.json({ error: "Chapitre manquant." }, { status: 400 });
    }

    if (!chapitre.contenu || chapitre.contenu.trim().length < 300) {
      return NextResponse.json(
        { error: "Le texte du chapitre est trop court pour analyser la cohérence longitudinale de voix." },
        { status: 400 },
      );
    }

    const systemPrompt = getEditorialSystemPrompt(PROMPT_ID);
    if (!systemPrompt) {
      return NextResponse.json({ error: "Prompt voix longitudinale introuvable." }, { status: 500 });
    }

    const analyzedText = chapitre.contenu.trim();
    const metadata = createAuditTraceabilityMetadata({
      promptId: PROMPT_ID,
      modelProvider: MODEL_PROVIDER,
      modelName: MODEL_NAME,
      resultSchemaVersion: RESULT_SCHEMA_VERSION,
      text: analyzedText,
      textVersion: TEXT_VERSION,
    });

    const metadataChapitre = {
      id: chapitre.id,
      titre: chapitre.titre,
      ageApprox: chapitre.ageApprox,
      periode: chapitre.periode,
      bloc: chapitre.bloc,
      statut: chapitre.statut,
      typeChapitre: chapitre.typeChapitre,
      niveauLourdeur: chapitre.niveauLourdeur,
      intensite: chapitre.intensite,
      imageCentrale: chapitre.imageCentrale,
      fonctionNarrative: chapitre.fonctionNarrative,
      description: chapitre.description,
    };

    const references = autresChapitres
      .filter((item) => item.id !== chapitre.id && item.contenu && item.contenu.trim().length >= 300)
      .map((item) => ({
        id: item.id,
        titre: item.titre,
        ageApprox: item.ageApprox,
        periode: item.periode,
        typeChapitre: item.typeChapitre,
        intensite: item.intensite,
        fonctionNarrative: item.fonctionNarrative,
        extrait: item.contenu?.slice(0, 1800),
      }));

    const claudeCall = client.messages.create({
      model: MODEL_NAME,
      max_tokens: 2200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyse longitudinalement la voix du chapitre selectionne par rapport aux references.

STRATEGIE DE TRACEABILITE :
- textHash porte sur le texte complet du chapitre principal analyse.
- Les chapitres de reference sont un contexte comparatif tronque, non une source a imiter.

SOURCE PRINCIPALE A ANALYSER - TEXTE COMPLET DU CHAPITRE :
${analyzedText}

CONTEXTE SECONDAIRE - METADONNEES DU CHAPITRE :
${JSON.stringify(metadataChapitre, null, 2)}

REFERENCES COMPARATIVES :
${JSON.stringify(references, null, 2)}

Retourne uniquement ce JSON valide :
{
  "overallStatus": "continuite legitime | evolution legitime | rupture a surveiller | rupture incoherente",
  "continuity": [],
  "evolution": [],
  "ruptures": [],
  "repetitions": [],
  "overHarmonization": [],
  "recommendations": [],
  "uncertainty": []
}`,
        },
      ],
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé : Claude n'a pas répondu dans les 30 secondes.")), 30000),
    );

    const message = await Promise.race([claudeCall, timeout]);
    const firstBlock = message.content[0];

    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error("Réponse Claude vide ou inattendue.");
    }

    const result = extractJson(firstBlock.text, metadata);
    return NextResponse.json({ result, metadata });
  } catch (error) {
    console.error("Erreur API audit-voix:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'audit de voix" },
      { status: 500 },
    );
  }
}
