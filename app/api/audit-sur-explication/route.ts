import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un directeur littéraire spécialisé en autobiographie littéraire et en écriture minimaliste traumatique.
Tu appliques le protocole Justesse Nue :
- corps avant idée
- atmosphère avant événement
- aucune pédagogie
- aucune consolation
- aucun diagnostic psychologique lourd
- aucune morale
- aucun commentaire thérapeutique

Tu détectes uniquement les endroits où le texte explique trop au lecteur au lieu de lui faire ressentir.

Tu ne réécris pas le texte.
Tu analyses uniquement.

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

type PassageProbleme = {
  extrait: string;
  probleme: string;
  impact: string;
};

type AuditSurExplicationResult = {
  niveauSurExplication: string;
  scoreJustesseNue: string;
  passagesProblemes: PassageProbleme[];
  diagnosticsAdultes: string[];
  phrasesTherapeutiques: string[];
  abstractionsFaibles: string[];
  zonesQuiCassentLeMystere: string[];
  recommandationsEditoriales: string[];
  decision: string;
};

const REQUIRED_FIELDS = [
  "niveauSurExplication",
  "scoreJustesseNue",
  "passagesProblemes",
  "diagnosticsAdultes",
  "phrasesTherapeutiques",
  "abstractionsFaibles",
  "zonesQuiCassentLeMystere",
  "recommandationsEditoriales",
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

function normalizePassages(value: unknown): PassageProbleme[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      return {
        extrait: String(item.extrait || "").trim(),
        probleme: String(item.probleme || "").trim(),
        impact: String(item.impact || "").trim(),
      };
    })
    .filter((item): item is PassageProbleme => Boolean(item && (item.extrait || item.probleme || item.impact)));
}

function extractJson(raw: string): AuditSurExplicationResult {
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
    niveauSurExplication: String(parsed.niveauSurExplication || ""),
    scoreJustesseNue: String(parsed.scoreJustesseNue || ""),
    passagesProblemes: normalizePassages(parsed.passagesProblemes),
    diagnosticsAdultes: normalizeStringArray(parsed.diagnosticsAdultes),
    phrasesTherapeutiques: normalizeStringArray(parsed.phrasesTherapeutiques),
    abstractionsFaibles: normalizeStringArray(parsed.abstractionsFaibles),
    zonesQuiCassentLeMystere: normalizeStringArray(parsed.zonesQuiCassentLeMystere),
    recommandationsEditoriales: normalizeStringArray(parsed.recommandationsEditoriales),
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
        { error: "Le texte du chapitre est trop court pour analyser la sur-explication." },
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
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyse la sur-explication dans le chapitre sélectionné.

SOURCE PRINCIPALE À ANALYSER — TEXTE COMPLET DU CHAPITRE :
${chapitre.contenu}

CONTEXTE SECONDAIRE — MÉTADONNÉES DU CHAPITRE :
${JSON.stringify(metadataChapitre, null, 2)}

AUTRES CHAPITRES POUR COHÉRENCE DE VOIX :
${JSON.stringify(autres, null, 2)}

Contraintes :
- Le texte complet du chapitre est la source principale. Les métadonnées servent seulement de contexte.
- Ne réécris pas le texte.
- Ne propose pas une version réécrite.
- Détecte seulement les endroits où le texte explique trop au lieu de faire ressentir.
- Repère la psychologie adulte trop visible, l'interprétation explicite, la morale implicite, les phrases pédagogiques, l'analyse émotionnelle excessive, l'abstraction inutile, les diagnostics psychologiques, les formulations thérapeutiques et les conclusions qui retirent le mystère.
- Réponds uniquement avec ce JSON valide :

{
  "niveauSurExplication": "",
  "scoreJustesseNue": "",
  "passagesProblemes": [
    {
      "extrait": "",
      "probleme": "",
      "impact": ""
    }
  ],
  "diagnosticsAdultes": [],
  "phrasesTherapeutiques": [],
  "abstractionsFaibles": [],
  "zonesQuiCassentLeMystere": [],
  "recommandationsEditoriales": [],
  "decision": ""
}

Valeurs autorisées pour niveauSurExplication :
très faible, faible, modéré, élevé, critique.

Valeurs autorisées pour scoreJustesseNue :
très cohérent, cohérent, fragile, incohérent.

Valeurs autorisées pour decision :
préserver tel quel, alléger certaines zones, réduire les explications, réécriture partielle recommandée.`,
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
    console.error("Erreur API audit-sur-explication:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'audit de sur-explication" },
      { status: 500 },
    );
  }
}
