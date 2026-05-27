import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEME = `Tu es un directeur littéraire extrêmement exigeant.
Tu analyses un texte autobiographique ligne par ligne.
Tu ne cherches QUE les endroits faibles.

INTERDICTIONS ABSOLUES
- Ne résume pas
- Ne reformule pas le texte
- Ne sois pas bienveillant
- Ne donne pas de conseil général
- N'invente rien si le texte est bon
- Ne corrige pas le texte
- Ne parle jamais de "style" de manière abstraite

CADRE LITTÉRAIRE
Le texte doit privilégier :
corps avant idée, sensation avant explication, concret avant abstraction,
tension implicite, sobriété, absence de psychologie explicite,
absence de sur-explication, pas de belle phrase décorative.

FORMAT DE SORTIE
JSON valide uniquement. Aucun texte avant, aucun texte après.`;

export type Faiblesse = {
  extrait: string;
  type: string;
  probleme: string;
  action: string;
};

export type FaiblesseResult = {
  faiblesses: Faiblesse[];
  verdict_global: "faible" | "moyen" | "fort";
  priorite: string;
};

function extractJson(raw: string): FaiblesseResult {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse Claude sans JSON exploitable.");
  }
  const parsed = JSON.parse(clean.slice(start, end + 1));
  const required = ["faiblesses", "verdict_global", "priorite"] as const;
  const missing = required.filter((k) => !(k in parsed));
  if (missing.length > 0) {
    throw new Error(`Champs manquants : ${missing.join(", ")}.`);
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante dans .env.local" }, { status: 500 });
    }

    const body = await req.json();
    const texte = typeof body?.texte === "string" ? body.texte.trim() : "";

    if (!texte) {
      return NextResponse.json({ error: "Texte manquant." }, { status: 400 });
    }

    const claudeCall = client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: SYSTEME,
      messages: [
        {
          role: "user",
          content: `Analyse ce texte. Repère uniquement les phrases ou micro-passages faibles.
Chaque faiblesse doit être précise, localisée et utile.

TEXTE :
${texte}

Retourne UNIQUEMENT ce JSON :
{
  "faiblesses": [
    {
      "extrait": "extrait exact (5 à 15 mots max)",
      "type": "abstraction | sur-explication | phrase molle | perte de tension | redondance | image faible | résumé au lieu de scène",
      "probleme": "explication concrète et spécifique",
      "action": "instruction directe et immédiate (verbe d'action obligatoire)"
    }
  ],
  "verdict_global": "faible | moyen | fort",
  "priorite": "quelle faiblesse corriger en premier (formulé comme action)"
}

RÈGLES :
- maximum 6 faiblesses
- uniquement les plus critiques
- chaque extrait doit être exact (copié mot pour mot depuis le texte)
- chaque action doit commencer par un verbe (Supprimer, Remplacer, Couper, Ajouter…)
- aucune phrase vague
- aucune analyse globale inutile
- si le texte est bon, retourner faiblesses: []`,
        },
      ],
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé : Claude n'a pas répondu dans les 20 secondes.")), 20000)
    );

    const message = await Promise.race([claudeCall, timeout]);
    const firstBlock = message.content[0];

    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error("Réponse Claude vide ou inattendue.");
    }

    const result = extractJson(firstBlock.text);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Erreur API faiblesses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}
