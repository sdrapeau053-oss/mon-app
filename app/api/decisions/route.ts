import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEME = `Tu es directeur littéraire pour le projet autobiographique "L'Héritage des Silences".
Tu reçois l'ensemble des fragments d'un chapitre.
Tu analyses ce chapitre avec exigence, précision et sans ménagement.

INTERDICTIONS ABSOLUES
- Ne résume pas les fragments
- Ne reformule pas ce qui est écrit
- Ne sois pas encourageant par défaut
- N'utilise pas de formulations vagues ("manque de profondeur", "pourrait être amélioré")
- N'invente pas de contenu absent
- Ne produis pas de conseil générique applicable à n'importe quel texte

TON
- Éditorial. Chirurgical. Direct.
- Chaque observation doit être ancrée dans le contenu réel des fragments fournis.
- Si un élément est fort, dis-le sans gonflement. Si un élément est faible, nomme-le exactement.

CADRE LITTÉRAIRE
Le projet suit une écriture autobiographique exigeante :
corps avant idée, sensation avant explication, montrer sans nommer, point de vue incarné,
aucune dramatisation, aucune psychologie explicite, aucune belle écriture décorative.

FORMAT DE SORTIE
JSON valide uniquement. Aucun texte avant, aucun texte après.`;

export type DecisionChapitre = {
  loi: string;
  fonctionne: string[];
  faiblesses: string[];
  exces: string[];
  manque: string[];
  tension: "faible" | "moyen" | "fort";
  tension_note: string;
  repetition_risque: string;
  direction: string[];
};

function extractJson(raw: string): DecisionChapitre {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse Claude sans JSON exploitable.");
  }
  const parsed = JSON.parse(clean.slice(start, end + 1));
  const required = ["loi", "fonctionne", "faiblesses", "exces", "manque", "tension", "tension_note", "repetition_risque", "direction"] as const;
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
    const { tome, chapitre, fragments } = body;

    if (!tome || !chapitre || !Array.isArray(fragments) || fragments.length === 0) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const fragmentsJoints = fragments
      .map((f: string, i: number) => `Fragment ${i + 1} :\n${f}`)
      .join("\n---\n");

    const claudeCall = client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEME,
      messages: [
        {
          role: "user",
          content: `Analyse ce chapitre comme directeur littéraire.

TOME : ${tome}
CHAPITRE : ${chapitre}
NOMBRE DE FRAGMENTS : ${fragments.length}

FRAGMENTS :
${fragmentsJoints}

Retourne UNIQUEMENT ce JSON :
{
  "loi": "la règle que le corps apprend dans ce chapitre — 1 phrase précise, pas une idée abstraite",
  "fonctionne": ["max 3 éléments réellement forts, nommés précisément depuis les fragments"],
  "faiblesses": ["abstractions, répétitions, pertes de tension, scènes trop résumées — nommées précisément"],
  "exces": ["fragments ou motifs à couper ou alléger — avec raison courte"],
  "manque": ["sensations absentes, scènes manquantes, contrastes non exploités, progression non construite"],
  "tension": "faible | moyen | fort",
  "tension_note": "justification courte ancrée dans le contenu — pas une formule générique",
  "repetition_risque": "risque identifié de redondance avec d'autres parties du livre — basé sur motifs, dynamique ou structure",
  "direction": ["instruction directe 1 — action immédiate sur le texte", "instruction directe 2 — action immédiate sur le texte"]
}`,
        },
      ],
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé : Claude n'a pas répondu dans les 30 secondes.")), 30000)
    );

    const message = await Promise.race([claudeCall, timeout]);
    const firstBlock = message.content[0];

    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error("Réponse Claude vide ou inattendue.");
    }

    const result = extractJson(firstBlock.text);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Erreur API decisions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}
