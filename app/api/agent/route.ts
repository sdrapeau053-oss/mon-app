// /app/api/agent/route.ts
// Route API Next.js — reçoit le contexte + messages, appelle Anthropic, retourne la réponse.

import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `Tu es l'agent personnel de Sylvie — autrice, créatrice d'app, et freelance basée à Drummondville, Québec.

TON RÔLE : lire le contexte de sa journée (tâches, progression, notes, blocs) et l'aider à avancer concrètement.

CONTEXTE PERMANENT DE SYLVIE :
- Pseudonyme : Léna Montand
- Projet littéraire : "L'Héritage des Silences" — 4 tomes autobiographiques français
- Protocole d'écriture : Justesse Nue
- Freelance : copywriting, révision narrative, contenu

RÈGLES DE RÉPONSE :
- Lire d'abord le contexte de la journée fourni
- Répondre de façon directe, concrète, sans remplissage
- Proposer des actions précises adaptées à l'état réel de la journée
- En mode journée difficile : réduire à UNE seule action possible, douce mais réelle
- Ne jamais juger, moraliser, ou donner des discours motivationnels vides
- Toujours en français`;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  message?: string;
  messages: Message[];
  appContext?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AgentRequest>;
    const { appContext, message, messages } = body;

    if ((!messages || messages.length === 0) && !message?.trim()) {
      return NextResponse.json({ error: "Messages requis" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (!apiKey || apiKey === "REMPLACE_PAR_TA_CLE") {
      return NextResponse.json(
        {
          error:
            "Clé Anthropic absente ou non configurée. Ajoute ANTHROPIC_API_KEY dans le fichier .env.local à la racine du projet, puis redémarre npm run dev.",
        },
        { status: 500 },
      );
    }

    const isSimpleMessage = Boolean(message?.trim());
    const systemWithContext = appContext ? `${SYSTEM_PROMPT}\n\n${appContext}` : SYSTEM_PROMPT;
    const anthropicMessages = isSimpleMessage
      ? [
          {
            role: "user",
            content: message,
          },
        ]
      : messages?.map((item) => ({
          role: item.role,
          content: item.content,
        })) || [];

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: isSimpleMessage ? "claude-3-haiku-20240307" : "claude-sonnet-4-20250514",
        max_tokens: isSimpleMessage ? 800 : 1024,
        ...(!isSimpleMessage ? { system: systemWithContext } : {}),
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return NextResponse.json(
        { error: "Erreur API Anthropic", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text ?? "Pas de réponse.";

    return NextResponse.json({ reply, result: reply });
  } catch (err) {
    console.error("Agent route error:", err);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
