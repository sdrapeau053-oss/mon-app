'use client'

import {
  SystemActionRow,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from '@/components/system-ui'
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
    <main className="internal-page">
      <SystemPageShell maxWidth={980} padding="22px 16px 44px">

      <header className="internal-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
        <p className="internal-kicker">Voix du manuscrit</p>
      <h1 className="internal-title">
        Détecteur de voix
      </h1>
      <p className="internal-subtitle">
        Repère les traces IA, la perte de corps, le ton trop lisse.
      </p>
        </div>
        <SystemActionRow>
          <BackLink label="Système" />
        </SystemActionRow>
      </header>

      <SystemPanel ariaLabel="Texte à analyser">
        <SystemSectionHeader eyebrow="Analyse isolée" title="Passage à vérifier" />
      <textarea
        value={texte}
        onChange={e => setTexte(e.target.value)}
        placeholder="Colle un fragment ou un passage ici..."
        style={{
          width: '100%',
          minHeight: '200px',
          backgroundColor: '#141311',
          color: '#efe5d4',
          border: '1px solid rgba(201,168,92,0.12)',
          borderRadius: '14px',
          padding: '16px',
          fontFamily: 'Georgia, serif',
          fontSize: '0.95rem',
          lineHeight: '1.7',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      <SystemActionRow>
      <button
        onClick={analyser}
        disabled={loading || !texte.trim()}
        className="soft-button"
        style={{
          backgroundColor: loading ? '#333' : '#c9a84c',
          color: loading ? '#666' : '#0f0f0f',
          border: '1px solid rgba(201,168,92,0.45)',
          padding: '10px 28px',
          fontFamily: 'Georgia, serif',
          fontSize: '0.9rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          borderRadius: 999
        }}
      >
        {loading ? 'Analyse en cours...' : 'Analyser'}
      </button>
      </SystemActionRow>

      {erreur && (
        <p style={{ color: '#c0392b', marginTop: '20px', fontSize: '0.9rem' }}>
          {erreur}
        </p>
      )}
      </SystemPanel>

      {(analyse || analyseBrute) && (
        <SystemPanel ariaLabel="Diagnostic">
          <SystemSectionHeader eyebrow="Résultat" title="Diagnostic" />
          {analyse ? (
            <div style={{ display: 'grid', gap: '18px' }}>
              <SystemPanel compact style={{
                border: '1px solid rgba(201,168,92,0.1)',
                backgroundColor: '#10100f',
                borderRadius: '14px',
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
                  color: '#d8c9ad'
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
              </SystemPanel>

              <SystemPanel compact style={{
                border: '1px solid rgba(201,168,92,0.1)',
                backgroundColor: '#10100f',
                borderRadius: '14px',
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
                <p style={{ margin: 0, lineHeight: '1.72', color: '#d8c9ad' }}>
                  {analyse.points_forts}
                </p>
              </SystemPanel>

              <SystemPanel compact style={{
                border: '1px solid rgba(201,168,92,0.1)',
                backgroundColor: '#10100f',
                borderRadius: '14px',
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
              </SystemPanel>
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
        </SystemPanel>
      )}
      </SystemPageShell>
    </main>
  )
}
