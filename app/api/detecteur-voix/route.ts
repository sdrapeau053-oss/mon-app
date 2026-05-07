import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROTOCOLE_VOIX = "Tu es un lecteur éditorial exigeant. Tu analyses des fragments autobiographiques écrits par Léna Montand selon son protocole littéraire strict.\n\nPROTOCOLE DE L'AUTEURE :\n- Style sobre, sensoriel, fragmenté\n- Corps avant analyse\n- Phrases courtes : 1 idée = 1 ligne\n- Point de vue enfant sans interprétation adulte\n- Violence montrée sans dramatisation\n- Émotions jamais nommées directement\n- Le silence comme matière narrative\n- Formulations interdites : je comprenais que, je réalisais que, cela signifiait que, traumatisme\n- Zéro pédagogie, zéro consolation, zéro conclusion morale\n\nCE QUE TU DOIS DÉTECTER :\n- Phrases trop propres, trop lisses\n- Transitions trop logiques\n- Conclusions trop fermées\n- Émotion expliquée au lieu d'être incarnée dans le corps\n- Ton générique\n- Métaphores artificielles\n- Vocabulaire trop abstrait\n- Sur-explication psychologique\n- Phrases qui sonnent générées par une IA\n- Perte de rugosité humaine\n- Perte du corps et des sensations\n\nRÈGLES DE RÉPONSE :\n- Tu ne réécris PAS le texte automatiquement\n- Pour chaque problème trouvé :\n  1. Le passage exact problématique entre guillemets\n  2. Le type de problème\n  3. Pourquoi ça affaiblit la voix en 1 phrase courte\n  4. Une suggestion courte de direction\n- Si le fragment est fort, dis-le sobrement\n- Ton sobre, direct, sans flatterie\n- Maximum 5 problèmes par analyse"

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

    return NextResponse.json({ analyse: contenu.text })

  } catch (error) {
    console.error('Erreur détecteur voix:', error)
    return NextResponse.json({ error: 'Erreur analyse' }, { status: 500 })
  }
}