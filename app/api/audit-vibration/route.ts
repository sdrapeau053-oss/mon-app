import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un éditeur littéraire spécialisé en récit autobiographique.
Tu analyses la vibration nerveuse d’un chapitre selon le protocole Justesse Nue.
Corps avant idée. Atmosphère avant événement.
Aucune flatterie. Aucune consolation. Aucun diagnostic psychologique lourd.
Réponds uniquement en JSON structuré avec les 7 sections demandées.`;

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

type AuditVibrationResult = {
  loiImplicite: string;
  typeTensionDominant: string;
  mecanismeCorporel: string;
  doublonsPossibles: string[];
  niveauNecessite: string;
  saturationEmotionnelle: string;
  recommandationEditoriale: string;
  questionCorrection: string;
};

const REQUIRED_FIELDS = [
  "loiImplicite",
  "typeTensionDominant",
  "mecanismeCorporel",
  "doublonsPossibles",
  "niveauNecessite",
  "saturationEmotionnelle",
  "recommandationEditoriale",
  "questionCorrection",
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

function extractJson(raw: string): AuditVibrationResult {
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
    loiImplicite: String(parsed.loiImplicite || ""),
    typeTensionDominant: String(parsed.typeTensionDominant || ""),
    mecanismeCorporel: String(parsed.mecanismeCorporel || ""),
    doublonsPossibles: Array.isArray(parsed.doublonsPossibles)
      ? parsed.doublonsPossibles.map(String)
      : [],
    niveauNecessite: String(parsed.niveauNecessite || ""),
    saturationEmotionnelle: String(parsed.saturationEmotionnelle || ""),
    recommandationEditoriale: String(parsed.recommandationEditoriale || ""),
    questionCorrection: String(parsed.questionCorrection || ""),
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
        { error: "Le texte du chapitre est trop court pour une analyse nerveuse fiable." },
        { status: 400 },
      );
    }

    const autres = autresChapitres
      .filter((item) => item.id !== chapitre.id)
      .map((item) => ({
        id: item.id,
        titre: item.titre,
        bloc: item.bloc,
        ageApprox: item.ageApprox,
        typeChapitre: item.typeChapitre,
        intensite: item.intensite,
        fonctionNarrative: item.fonctionNarrative,
        imageCentrale: item.imageCentrale,
        description: item.description,
      }));

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

    const claudeCall = client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyse la vibration nerveuse du chapitre sélectionné et compare-le prudemment aux autres chapitres existants.

SOURCE PRINCIPALE À ANALYSER — TEXTE COMPLET DU CHAPITRE :
${chapitre.contenu}

CONTEXTE SECONDAIRE — MÉTADONNÉES DU CHAPITRE :
${JSON.stringify(metadataChapitre, null, 2)}

AUTRES CHAPITRES POUR COMPARAISON :
${JSON.stringify(autres, null, 2)}

Contraintes :
- N’invente pas de chapitre absent.
- Ne réécris pas le manuscrit.
- Le texte complet du chapitre est la source principale. Les métadonnées servent seulement de contexte.
- Identifie seulement les doublons nerveux possibles, pas des doublons de sujet superficiels.
- Réponds uniquement avec ce JSON valide :

{
  "loiImplicite": "",
  "typeTensionDominant": "",
  "mecanismeCorporel": "",
  "doublonsPossibles": [],
  "niveauNecessite": "",
  "saturationEmotionnelle": "",
  "recommandationEditoriale": "",
  "questionCorrection": "Ce chapitre fait-il apprendre au corps quelque chose que le lecteur ne savait pas encore ?"
}

Valeurs autorisées pour typeTensionDominant :
tension physique, tension silencieuse, tension affective, tension atmosphérique, tension sexuelle, tension familiale, tension sociale, tension de dissociation, tension de faux refuge, tension de perte du langage.

Valeurs autorisées pour mecanismeCorporel :
hypervigilance, effacement, anticipation, dissociation, figement, disponibilité affective, honte, silence, confusion danger/protection, anesthésie émotionnelle, recherche de refuge.

Valeurs autorisées pour niveauNecessite :
irremplaçable, utile mais à préciser, redondant à surveiller, fusion possible, coupe possible plus tard.

Valeurs autorisées pour saturationEmotionnelle :
respiration, tension légère, tension moyenne, tension forte, saturation possible, saturation critique.

Valeurs autorisées pour recommandationEditoriale :
garder tel quel, renforcer sa loi unique, déplacer certains souvenirs, fusionner plus tard, alléger, ajouter respiration, rendre le titre plus concret, éviter le diagnostic adulte.`,
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
    console.error("Erreur API audit-vibration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'audit de vibration" },
      { status: 500 },
    );
  }
}
