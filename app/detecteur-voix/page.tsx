'use client'

import { BackLink } from '@/components/ui/back-link'
import { useRef, useState } from 'react'

type ProblemeVoix = {
  passage: string
  type: string
  pourquoi: string
  directionsCorrection?: string[]
  exempleMinimal?: string
  suggestions?: string[]
}

type AnalyseVoix = {
  problemes: ProblemeVoix[]
  points_forts: string
}

type DetecteurVoixResponse = {
  analyse?: unknown
  error?: string
  erreur?: string
}

function estAnalyseVoix(analyse: unknown): analyse is AnalyseVoix {
  if (!analyse || typeof analyse !== 'object') return false

  const valeur = analyse as Partial<AnalyseVoix>

  return Array.isArray(valeur.problemes) && typeof valeur.points_forts === 'string'
}

function nettoyerBlocJson(texteBrut: string) {
  const texte = texteBrut.trim()
  const blocMarkdown = texte.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

  return (blocMarkdown?.[1] || texte).trim()
}

function parserAnalyseVoix(analyse: unknown) {
  if (estAnalyseVoix(analyse)) {
    return analyse
  }

  if (typeof analyse !== 'string' || !analyse.trim()) {
    return null
  }

  try {
    const jsonNettoye = nettoyerBlocJson(analyse)
    const analyseParsee: unknown = JSON.parse(jsonNettoye)

    return estAnalyseVoix(analyseParsee) ? analyseParsee : null
  } catch {
    return null
  }
}

function nettoyerPassage(passage: string) {
  return passage.trim().replace(/^["“”']|["“”']$/g, '')
}

function creerTexteAnnote(texteOriginal: string, problemes: ProblemeVoix[]) {
  const passagesTrouves = problemes
    .map((probleme, index) => {
      const passage = nettoyerPassage(probleme.passage)
      const debut = passage ? texteOriginal.indexOf(passage) : -1

      return {
        index,
        passage,
        debut,
        fin: debut >= 0 ? debut + passage.length : -1
      }
    })
    .filter((passage) => passage.debut >= 0)
    .sort((a, b) => a.debut - b.debut)

  const passagesNonLocalises = problemes
    .map((_, index) => index)
    .filter((index) => !passagesTrouves.some((passage) => passage.index === index))

  const segments: Array<{ texte: string; problemeIndex?: number }> = []
  let position = 0

  passagesTrouves.forEach((passage) => {
    if (passage.debut < position) {
      passagesNonLocalises.push(passage.index)
      return
    }

    if (passage.debut > position) {
      segments.push({ texte: texteOriginal.slice(position, passage.debut) })
    }

    segments.push({
      texte: texteOriginal.slice(passage.debut, passage.fin),
      problemeIndex: passage.index
    })
    position = passage.fin
  })

  if (position < texteOriginal.length) {
    segments.push({ texte: texteOriginal.slice(position) })
  }

  return {
    segments,
    passagesNonLocalises: Array.from(new Set(passagesNonLocalises)).sort((a, b) => a - b)
  }
}

function obtenirDirectionsCorrection(probleme: ProblemeVoix) {
  return probleme.directionsCorrection?.length
    ? probleme.directionsCorrection
    : probleme.suggestions || []
}

export default function DetecteurVoix() {
  const [texte, setTexte] = useState('')
  const [analyse, setAnalyse] = useState<AnalyseVoix | null>(null)
  const [analyseBrute, setAnalyseBrute] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [problemeActif, setProblemeActif] = useState<number | null>(null)
  const [passageActif, setPassageActif] = useState<number | null>(null)
  const passageRefs = useRef<Record<number, HTMLElement | null>>({})
  const problemeRefs = useRef<Record<number, HTMLElement | null>>({})
  const texteAnnote = analyse ? creerTexteAnnote(texte, analyse.problemes) : null

  const activerDepuisPassage = (index: number) => {
    setProblemeActif(index)
    setPassageActif(index)
    problemeRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const activerDepuisProbleme = (index: number) => {
    setProblemeActif(index)
    setPassageActif(index)
    passageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      setPassageActif((actif) => (actif === index ? null : actif))
    }, 1400)
  }

  const analyser = async () => {
    if (!texte.trim()) return
    setLoading(true)
    setAnalyse(null)
    setAnalyseBrute('')
    setErreur('')
    setProblemeActif(null)
    setPassageActif(null)

    try {
      const res = await fetch('/api/detecteur-voix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte })
      })
      const data = (await res.json()) as DetecteurVoixResponse
      const messageErreur = data.error || data.erreur

      const analyseStructuree = parserAnalyseVoix(data.analyse)

      if (!res.ok || messageErreur) {
        setErreur(messageErreur || 'Erreur analyse.')
      } else if (analyseStructuree) {
        setAnalyse(analyseStructuree)
      } else if (typeof data.analyse === 'string' && data.analyse.trim()) {
        setAnalyseBrute(data.analyse)
      } else if (data.analyse) {
        setAnalyseBrute(JSON.stringify(data.analyse, null, 2))
      } else {
        setErreur('Aucune analyse reçue.')
      }
    } catch {
      setErreur('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#d4c5a9',
      fontFamily: 'Georgia, serif',
      padding: '40px'
    }}>
      <BackLink className="mb-8" label="Système" />

      <h1 style={{
        fontSize: '1.4rem',
        fontWeight: 'normal',
        color: '#c9a84c',
        marginBottom: '8px',
        letterSpacing: '0.05em'
      }}>
        Détecteur de voix
      </h1>
      <p style={{
        fontSize: '0.85rem',
        color: '#666',
        marginBottom: '40px'
      }}>
        Repère les traces IA, la perte de corps, le ton trop lisse.
      </p>

      <textarea
        value={texte}
        onChange={e => setTexte(e.target.value)}
        placeholder="Colle un fragment ou un passage ici..."
        style={{
          width: '100%',
          minHeight: '200px',
          backgroundColor: '#1a1a1a',
          color: '#d4c5a9',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '16px',
          fontFamily: 'Georgia, serif',
          fontSize: '0.95rem',
          lineHeight: '1.7',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      <button
        onClick={analyser}
        disabled={loading || !texte.trim()}
        style={{
          marginTop: '16px',
          backgroundColor: loading ? '#333' : '#c9a84c',
          color: loading ? '#666' : '#0f0f0f',
          border: 'none',
          padding: '10px 28px',
          fontFamily: 'Georgia, serif',
          fontSize: '0.9rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          borderRadius: '3px'
        }}
      >
        {loading ? 'Analyse en cours...' : 'Analyser'}
      </button>

      {erreur && (
        <p style={{ color: '#c0392b', marginTop: '20px', fontSize: '0.9rem' }}>
          {erreur}
        </p>
      )}

      {(analyse || analyseBrute) && (
        <div style={{
          marginTop: '40px',
          borderTop: '1px solid #2a2a2a',
          paddingTop: '32px'
        }}>
          <h2 style={{
            fontSize: '0.85rem',
            color: '#666',
            fontWeight: 'normal',
            marginBottom: '20px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            Diagnostic
          </h2>
          {analyse ? (
            <div style={{ display: 'grid', gap: '18px' }}>
              <section style={{
                border: '1px solid #2f2a1f',
                backgroundColor: '#151515',
                borderRadius: '6px',
                padding: '18px'
              }}>
                <h3 style={{
                  color: '#c9a84c',
                  fontSize: '0.9rem',
                  fontWeight: 'normal',
                  marginBottom: '12px'
                }}>
                  Texte annoté
                </h3>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.9',
                  fontSize: '0.98rem',
                  color: '#d4c5a9'
                }}>
                  {texteAnnote?.segments.map((segment, index) =>
                    typeof segment.problemeIndex === 'number' ? (
                      <mark
                        key={`${segment.texte}-${segment.problemeIndex}-${index}`}
                        ref={(element) => {
                          passageRefs.current[segment.problemeIndex as number] = element
                        }}
                        title={analyse.problemes[segment.problemeIndex]?.type}
                        style={{
                          backgroundColor:
                            passageActif === segment.problemeIndex
                              ? 'rgba(201, 168, 76, 0.3)'
                              : 'rgba(201, 168, 76, 0.18)',
                          border:
                            passageActif === segment.problemeIndex
                              ? '1px solid rgba(201, 168, 76, 0.75)'
                              : '1px solid rgba(201, 168, 76, 0.42)',
                          borderRadius: '4px',
                          color: '#f5e6bd',
                          padding: '3px 5px',
                          cursor: 'default'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => activerDepuisPassage(segment.problemeIndex as number)}
                          aria-label={`Voir le problème ${(segment.problemeIndex as number) + 1}`}
                          style={{
                            appearance: 'none',
                            backgroundColor: 'rgba(15, 15, 15, 0.72)',
                            border: '1px solid rgba(201, 168, 76, 0.5)',
                            borderRadius: '999px',
                            color: '#c9a84c',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'Georgia, serif',
                            fontSize: '0.68rem',
                            lineHeight: 1,
                            minWidth: '1.35rem',
                            height: '1.35rem',
                            marginRight: '7px',
                            padding: 0,
                            verticalAlign: '0.08em'
                          }}
                        >
                          {segment.problemeIndex + 1}
                        </button>
                        {segment.texte}
                      </mark>
                    ) : (
                      <span key={`${segment.texte}-${index}`}>{segment.texte}</span>
                    )
                  )}
                </div>
                {texteAnnote && texteAnnote.passagesNonLocalises.length > 0 && (
                  <p style={{
                    color: '#8f826c',
                    fontSize: '0.8rem',
                    lineHeight: '1.6',
                    margin: '14px 0 0'
                  }}>
                    Passage non localisé exactement : problème{' '}
                    {texteAnnote.passagesNonLocalises.map((index) => index + 1).join(', ')}.
                  </p>
                )}
              </section>

              <section style={{
                border: '1px solid #2f2a1f',
                backgroundColor: '#151515',
                borderRadius: '6px',
                padding: '18px'
              }}>
                <h3 style={{
                  color: '#c9a84c',
                  fontSize: '0.9rem',
                  fontWeight: 'normal',
                  marginBottom: '10px'
                }}>
                  Points forts
                </h3>
                <p style={{ margin: 0, lineHeight: '1.7', color: '#d4c5a9' }}>
                  {analyse.points_forts}
                </p>
              </section>

              <section style={{
                border: '1px solid #2f2a1f',
                backgroundColor: '#151515',
                borderRadius: '6px',
                padding: '18px'
              }}>
                <h3 style={{
                  color: '#c9a84c',
                  fontSize: '0.9rem',
                  fontWeight: 'normal',
                  marginBottom: '14px'
                }}>
                  Problèmes détectés
                </h3>
                {analyse.problemes.length > 0 ? (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {analyse.problemes.map((probleme, index) => (
                      <article
                        key={`${probleme.passage}-${index}`}
                        ref={(element) => {
                          problemeRefs.current[index] = element
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => activerDepuisProbleme(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            activerDepuisProbleme(index)
                          }
                        }}
                        style={{
                          backgroundColor:
                            problemeActif === index
                              ? 'rgba(201, 168, 76, 0.1)'
                              : 'transparent',
                          border:
                            problemeActif === index
                              ? '1px solid rgba(201, 168, 76, 0.45)'
                              : '1px solid transparent',
                          borderTop:
                            problemeActif === index
                              ? '1px solid rgba(201, 168, 76, 0.45)'
                              : index === 0
                                ? '1px solid transparent'
                                : '1px solid #2a2a2a',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          padding: problemeActif === index ? '14px' : index === 0 ? '0' : '16px 0 0',
                          transition: 'background-color 0.2s ease, border-color 0.2s ease, padding 0.2s ease'
                        }}
                      >
                        <p style={{
                          color: '#8f826c',
                          fontSize: '0.78rem',
                          letterSpacing: '0.08em',
                          margin: '0 0 8px',
                          textTransform: 'uppercase'
                        }}>
                          Problème {index + 1}
                        </p>
                        <p style={{
                          color: '#c9a84c',
                          backgroundColor: 'rgba(201, 168, 76, 0.12)',
                          border: '1px solid rgba(201, 168, 76, 0.28)',
                          borderRadius: '4px',
                          display: 'inline-block',
                          padding: '4px 8px',
                          margin: '0 0 8px'
                        }}>
                          “{probleme.passage}”
                        </p>
                        <p style={{ margin: '0 0 6px', color: '#c9a84c' }}>
                          {probleme.type}
                        </p>
                        <p style={{ margin: '0 0 12px', lineHeight: '1.7' }}>
                          {probleme.pourquoi}
                        </p>
                        <div style={{
                          marginTop: '14px',
                          borderTop: '1px solid rgba(201, 168, 76, 0.18)',
                          paddingTop: '12px'
                        }}>
                          <p style={{
                            color: '#8f826c',
                            fontSize: '0.78rem',
                            letterSpacing: '0.08em',
                            margin: '0 0 8px',
                            textTransform: 'uppercase'
                          }}>
                            Directions possibles
                          </p>
                          <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.7' }}>
                            {obtenirDirectionsCorrection(probleme).map((direction) => (
                              <li key={direction}>{direction}</li>
                            ))}
                          </ol>
                        </div>
                        {probleme.exempleMinimal && (
                          <div style={{
                            marginTop: '14px',
                            borderLeft: '2px solid rgba(201, 168, 76, 0.42)',
                            paddingLeft: '12px'
                          }}>
                            <p style={{
                              color: '#8f826c',
                              fontSize: '0.78rem',
                              letterSpacing: '0.08em',
                              margin: '0 0 6px',
                              textTransform: 'uppercase'
                            }}>
                              Exemple minimal
                            </p>
                            <p style={{
                              color: '#d4c5a9',
                              fontStyle: 'italic',
                              lineHeight: '1.7',
                              margin: 0
                            }}>
                              {probleme.exempleMinimal}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>Aucun problème majeur détecté.</p>
                )}
              </section>
            </div>
          ) : (
            <div style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              fontSize: '0.95rem',
              color: '#d4c5a9'
            }}>
              {analyseBrute}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
