import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un correcteur linguistique professionnel québécois spécialisé en littérature autobiographique.
Tu fais un contrôle linguistique final avant scellement.
Tu ne réécris pas le chapitre automatiquement.
Tu détectes les fautes, maladresses, répétitions, problèmes de ponctuation, syntaxe, cohérence FR-CA, rupture de ton et traces d’IA.
Tu respectes la voix Justesse Nue : sobre, corporelle, humaine, non explicative.
Aucune flatterie. Aucun commentaire générique.
Réponds uniquement en JSON structuré.`;

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

type AuditLinguistiqueResult = {
  statut: string;
  niveauCorrection: string;
  fautesCritiques: string[];
  correctionsSuggerees: string[];
  repetitions: string[];
  ponctuation: string;
  syntaxe: string;
  coherenceFRCA: string;
  tracesIA: string;
  recommandationsFinales: string[];
  decision: string;
};

const REQUIRED_FIELDS = [
  "statut",
  "niveauCorrection",
  "fautesCritiques",
  "correctionsSuggerees",
  "repetitions",
  "ponctuation",
  "syntaxe",
  "coherenceFRCA",
  "tracesIA",
  "recommandationsFinales",
  "decision",
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

function extractJson(raw: string): AuditLinguistiqueResult {
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
    statut: String(parsed.statut || ""),
    niveauCorrection: String(parsed.niveauCorrection || ""),
    fautesCritiques: normalizeStringArray(parsed.fautesCritiques),
    correctionsSuggerees: normalizeStringArray(parsed.correctionsSuggerees),
    repetitions: normalizeStringArray(parsed.repetitions),
    ponctuation: String(parsed.ponctuation || ""),
    syntaxe: String(parsed.syntaxe || ""),
    coherenceFRCA: String(parsed.coherenceFRCA || ""),
    tracesIA: String(parsed.tracesIA || ""),
    recommandationsFinales: normalizeStringArray(parsed.recommandationsFinales),
    decision: String(parsed.decision || ""),
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
        { error: "Le texte du chapitre est trop court pour un contrôle linguistique fiable." },
        { status: 400 },
      );
    }

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

    const autres = autresChapitres
      .filter((item) => item.id !== chapitre.id)
      .map((item) => ({
        id: item.id,
        titre: item.titre,
        ageApprox: item.ageApprox,
        typeChapitre: item.typeChapitre,
        intensite: item.intensite,
        fonctionNarrative: item.fonctionNarrative,
      }));

    const claudeCall = client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Fais le contrôle linguistique final du chapitre sélectionné.

SOURCE PRINCIPALE À ANALYSER — TEXTE COMPLET DU CHAPITRE :
${chapitre.contenu}

CONTEXTE SECONDAIRE — MÉTADONNÉES DU CHAPITRE :
${JSON.stringify(metadataChapitre, null, 2)}

AUTRES CHAPITRES POUR COHÉRENCE DE VOIX :
${JSON.stringify(autres, null, 2)}

Contraintes :
- Le texte complet du chapitre est la source principale. Les métadonnées servent seulement de contexte.
- Ne réécris pas automatiquement le chapitre.
- Donne des corrections suggérées, pas une version réécrite.
- Signale les formulations trop explicatives, abstraites, génériques ou artificielles.
- Reste précis, sobre, québécois, littéraire.
- Réponds uniquement avec ce JSON valide :

{
  "statut": "",
  "niveauCorrection": "",
  "fautesCritiques": [],
  "correctionsSuggerees": [],
  "repetitions": [],
  "ponctuation": "",
  "syntaxe": "",
  "coherenceFRCA": "",
  "tracesIA": "",
  "recommandationsFinales": [],
  "decision": ""
}

Valeurs autorisées pour statut :
propre, corrections mineures, corrections importantes, non prêt.

Valeurs autorisées pour niveauCorrection :
léger, moyen, élevé.

Valeurs autorisées pour decision :
validé linguistiquement, à corriger avant scellement, révision humaine recommandée.`,
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

    return NextResponse.json({ result: extractJson(firstBlock.text) });
  } catch (error) {
    console.error("Erreur API audit-linguistique:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors du contrôle linguistique" },
      { status: 500 },
    );
  }
}
