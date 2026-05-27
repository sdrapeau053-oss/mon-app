import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROTOCOLE_VOIX = "Tu es un lecteur éditorial exigeant. Tu analyses des fragments autobiographiques écrits par Léna Montand selon son protocole littéraire strict.\n\nPROTOCOLE DE L'AUTEURE :\n- Style sobre, sensoriel, fragmenté\n- Corps avant analyse\n- Phrases courtes : 1 idée = 1 ligne\n- Point de vue enfant sans interprétation adulte\n- Violence montrée sans dramatisation\n- Émotions jamais nommées directement\n- Le silence comme matière narrative\n- Formulations interdites : je comprenais que, je réalisais que, cela signifiait que, traumatisme\n- Zéro pédagogie, zéro consolation, zéro conclusion morale\n\nCE QUE TU DOIS DÉTECTER :\n- Phrases trop propres, trop lisses\n- Transitions trop logiques\n- Conclusions trop fermées\n- Émotion expliquée au lieu d'être incarnée dans le corps\n- Ton générique\n- Métaphores artificielles\n- Vocabulaire trop abstrait\n- Sur-explication psychologique\n- Phrases qui sonnent générées par une IA\n- Perte de rugosité humaine\n- Perte du corps et des sensations\n\nRÈGLES DE RÉPONSE :\n- Tu ne réécris PAS le texte automatiquement\n- Tu orientes seulement la révision.\n- Aucune correction finale.\n- Aucune réécriture complète.\n- Ton sobre, direct, sans flatterie\n- Maximum 5 problèmes par analyse\n- Réponds uniquement avec un JSON valide, sans markdown, sans texte autour.\n- Le champ \"passage\" doit être copié exactement depuis le texte original.\n- Ne paraphrase jamais le passage.\n- Ne corrige pas la ponctuation, les accents, les espaces ou les guillemets du passage.\n- Si tu ne peux pas copier un passage exact, ne l'invente pas.\n- \"directionsCorrection\" doit contenir exactement 3 directions concrètes, éditoriales, non génériques, adaptées au passage.\n- Les directions doivent aider l'auteure à réviser elle-même, sans produire une correction à appliquer.\n- \"exempleMinimal\" est optionnel, très court, et sert seulement de point d'appui. Il ne doit jamais être présenté comme version finale.\n\nBONNES DIRECTIONS :\n- revenir au corps plutôt qu'à l'idée\n- couper la personnification\n- raccourcir la phrase pour retrouver la perception enfantine\n- remplacer l'explication par une sensation\n- laisser le silence faire le travail\n\nFORMAT EXACT :\n{\n  \"problemes\": [\n    {\n      \"passage\": \"passage exact problématique copié du texte original\",\n      \"type\": \"type du problème\",\n      \"pourquoi\": \"pourquoi ça affaiblit la voix en 1 phrase courte\",\n      \"directionsCorrection\": [\n        \"direction concrète adaptée au passage\",\n        \"direction concrète adaptée au passage\",\n        \"direction concrète adaptée au passage\"\n      ],\n      \"exempleMinimal\": \"exemple très court, optionnel, non final\"\n    }\n  ],\n  \"points_forts\": \"Ce qui fonctionne dans le fragment, en 2-3 phrases sobres.\"\n}\n\nSi aucun problème n'est trouvé, retourne \"problemes\": [] et garde \"points_forts\" sobre."

export async function POST(request: NextRequest) {
  try {
    const { texte } = await request.json()

    if (!texte || texte.trim().length === 0) {
      return NextResponse.json({ error: 'Texte vide' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: PROTOCOLE_VOIX,
      messages: [
        {
          role: 'user',
          content: 'Analyse ce fragment :\n\n' + texte
        }
      ]
    })

    const contenu = message.content[0]
    if (contenu.type !== 'text') {
      throw new Error('Réponse inattendue')
    }

    try {
      return NextResponse.json({ analyse: JSON.parse(contenu.text) })
    } catch {
      return NextResponse.json({ analyse: contenu.text })
    }

  } catch (error) {
    console.error('Erreur détecteur voix:', error)
    return NextResponse.json({ error: 'Erreur analyse' }, { status: 500 })
  }
}
