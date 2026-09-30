import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuditTraceabilityMetadata,
  getEditorialSystemPrompt,
  type AuditTraceabilityMetadata,
} from "@/lib/editorial-governance";

const client = new Anthropic();
const MODEL_PROVIDER = "anthropic";
const MODEL_NAME = "claude-opus-4-5";
const RESULT_SCHEMA_VERSION = "1.0.0";
const PROMPT_ID = "LHS-VOICE-LOCAL";
const TEXT_VERSION = "local-text-v1";

type VoiceLocalIssue = {
  passage: string;
  type: string;
  why: string;
  recommendation: "CONSERVER" | "REVOIR" | "SUPPRIMER";
  directions: string[];
};

type VoiceLocalResult = {
  overallStatus: string;
  strengths: string[];
  issues: VoiceLocalIssue[];
  recommendations: string[];
  preserve: string[];
  revise: string[];
  remove: string[];
  uncertainty: string[];
  traceability: AuditTraceabilityMetadata;
};

const REQUIRED_FIELDS = [
  "overallStatus",
  "strengths",
  "issues",
  "recommendations",
  "preserve",
  "revise",
  "remove",
  "uncertainty",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeRecommendation(value: unknown): "CONSERVER" | "REVOIR" | "SUPPRIMER" {
  return value === "CONSERVER" || value === "SUPPRIMER" ? value : "REVOIR";
}

function normalizeIssues(value: unknown): VoiceLocalIssue[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      return {
        passage: String(item.passage || "").trim(),
        type: String(item.type || "").trim(),
        why: String(item.why || item.pourquoi || "").trim(),
        recommendation: normalizeRecommendation(item.recommendation),
        directions: normalizeStringArray(item.directions),
      };
    })
    .filter((item): item is VoiceLocalIssue => Boolean(item && (item.passage || item.type || item.why)));
}

function extractJson(raw: string, traceability: AuditTraceabilityMetadata): VoiceLocalResult {
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
    strengths: normalizeStringArray(parsed.strengths),
    issues: normalizeIssues(parsed.issues),
    recommendations: normalizeStringArray(parsed.recommendations),
    preserve: normalizeStringArray(parsed.preserve),
    revise: normalizeStringArray(parsed.revise),
    remove: normalizeStringArray(parsed.remove),
    uncertainty: normalizeStringArray(parsed.uncertainty),
    traceability,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { texte } = await request.json();

    if (!texte || typeof texte !== "string" || texte.trim().length === 0) {
      return NextResponse.json({ error: "Texte vide" }, { status: 400 });
    }

    const systemPrompt = getEditorialSystemPrompt(PROMPT_ID);
    if (!systemPrompt) {
      return NextResponse.json({ error: "Prompt voix locale introuvable." }, { status: 500 });
    }

    const analyzedText = texte.trim();
    const metadata = createAuditTraceabilityMetadata({
      promptId: PROMPT_ID,
      modelProvider: MODEL_PROVIDER,
      modelName: MODEL_NAME,
      resultSchemaVersion: RESULT_SCHEMA_VERSION,
      text: analyzedText,
      textVersion: TEXT_VERSION,
    });

    const message = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 1800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyse localement ce texte selon LHS-VOICE-LOCAL.

TEXTE FOURNI :
${analyzedText}

Retourne uniquement ce JSON valide :
{
  "overallStatus": "CONSERVER | REVOIR | SUPPRIMER",
  "strengths": [],
  "issues": [
    {
      "passage": "passage exact copié du texte si disponible",
      "type": "nature du problème local",
      "why": "raison précise, fondée sur le texte",
      "recommendation": "CONSERVER | REVOIR | SUPPRIMER",
      "directions": []
    }
  ],
  "recommendations": [],
  "preserve": [],
  "revise": [],
  "remove": [],
  "uncertainty": []
}`,
        },
      ],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error("Réponse inattendue.");
    }

    const result = extractJson(firstBlock.text, metadata);
    return NextResponse.json({ result, analyse: result, metadata });
  } catch (error) {
    console.error("Erreur détecteur voix:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur analyse" },
      { status: 500 },
    );
  }
}
