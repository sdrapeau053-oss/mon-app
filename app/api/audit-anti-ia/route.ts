import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un directeur littéraire spécialisé dans la détection de prose artificielle et la préservation de la voix humaine organique.

Tu appliques le protocole Justesse Nue :
- corps avant idée
- atmosphère avant événement
- fragmentation organique
- rugosité humaine contrôlée
- aucune prose démonstrative
- aucune élégance artificielle
- aucune symétrie parfaite
- aucune surcohérence
- aucune optimisation visible

Tu détectes :
- les rythmes GPT typiques
- les répétitions syntaxiques
- les formulations génératives
- les abstractions propres
- les structures trop régulières
- les phrases mortes malgré leur qualité technique
- les zones qui sonnent “écrites par une IA”

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

type RegulariteDetectee = {
  extrait: string;
  probleme: string;
  impact: string;
};

type AuditAntiIaResult = {
  niveauHumanite: string;
  risqueDetectionIA: string;
  textureOrganique: string;
  rythmeNarratif: string;
  regularitesDetectees: RegulariteDetectee[];
  structuresRepetitives: string[];
  formulationsArtificiales: string[];
  zonesTropLisses: string[];
  passagesPseudoLitteraires: string[];
  recommandationsHumanisation: string[];
  decision: string;
};

const REQUIRED_FIELDS = [
  "niveauHumanite",
  "risqueDetectionIA",
  "textureOrganique",
  "rythmeNarratif",
  "regularitesDetectees",
  "structuresRepetitives",
  "formulationsArtificiales",
  "zonesTropLisses",
  "passagesPseudoLitteraires",
  "recommandationsHumanisation",
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

function normalizeRegularites(value: unknown): RegulariteDetectee[] {
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
    .filter((item): item is RegulariteDetectee => Boolean(item && (item.extrait || item.probleme || item.impact)));
}

function extractJson(raw: string): AuditAntiIaResult {
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
    niveauHumanite: String(parsed.niveauHumanite || ""),
    risqueDetectionIA: String(parsed.risqueDetectionIA || ""),
    textureOrganique: String(parsed.textureOrganique || ""),
    rythmeNarratif: String(parsed.rythmeNarratif || ""),
    regularitesDetectees: normalizeRegularites(parsed.regularitesDetectees),
    structuresRepetitives: normalizeStringArray(parsed.structuresRepetitives),
    formulationsArtificiales: normalizeStringArray(parsed.formulationsArtificiales),
    zonesTropLisses: normalizeStringArray(parsed.zonesTropLisses),
    passagesPseudoLitteraires: normalizeStringArray(parsed.passagesPseudoLitteraires),
    recommandationsHumanisation: normalizeStringArray(parsed.recommandationsHumanisation),
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
        { error: "Le texte du chapitre est trop court pour analyser la texture humaine." },
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

    const references = autresChapitres
      .filter((item) => item.id !== chapitre.id && item.contenu && item.contenu.trim().length >= 300)
      .map((item) => ({
        id: item.id,
        titre: item.titre,
        ageApprox: item.ageApprox,
        typeChapitre: item.typeChapitre,
        intensite: item.intensite,
        fonctionNarrative: item.fonctionNarrative,
        extrait: item.contenu?.slice(0, 1400),
      }));

    const claudeCall = client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyse la texture humaine du chapitre sélectionné et détecte les traces d'écriture artificielle ou générative.

SOURCE PRINCIPALE À ANALYSER — TEXTE COMPLET DU CHAPITRE :
${chapitre.contenu}

CONTEXTE SECONDAIRE — MÉTADONNÉES DU CHAPITRE :
${JSON.stringify(metadataChapitre, null, 2)}

CHAPITRES ÉCRITS DE RÉFÉRENCE :
${JSON.stringify(references, null, 2)}

Contraintes :
- Le texte complet du chapitre est la source principale.
- Ne réécris pas le texte.
- Ne propose pas une version réécrite.
- Détecte les zones qui sonnent artificielles, générées, trop lisses, trop optimisées ou pseudo-littéraires.
- Repère les rythmes trop réguliers, répétitions syntaxiques, transitions artificielles, phrases mortes malgré leur qualité technique, surcohérence et manque de rugosité organique.
- Réponds uniquement avec ce JSON valide :

{
  "niveauHumanite": "",
  "risqueDetectionIA": "",
  "textureOrganique": "",
  "rythmeNarratif": "",
  "regularitesDetectees": [
    {
      "extrait": "",
      "probleme": "",
      "impact": ""
    }
  ],
  "structuresRepetitives": [],
  "formulationsArtificiales": [],
  "zonesTropLisses": [],
  "passagesPseudoLitteraires": [],
  "recommandationsHumanisation": [],
  "decision": ""
}

Valeurs autorisées pour niveauHumanite :
très organique, organique, légèrement artificiel, artificiel, fortement artificiel.

Valeurs autorisées pour risqueDetectionIA :
très faible, faible, modéré, élevé, critique.

Valeurs autorisées pour decision :
préserver tel quel, micro-ajustements recommandés, humanisation recommandée, révision profonde nécessaire.`,
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
    console.error("Erreur API audit-anti-ia:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'audit anti-IA" },
      { status: 500 },
    );
  }
}
