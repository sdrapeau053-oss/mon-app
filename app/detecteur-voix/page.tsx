'use client'

import { useState } from 'react'

type DetecteurVoixResponse = {
  analyse?: unknown
  error?: string
  erreur?: string
}

export default function DetecteurVoix() {
  const [texte, setTexte] = useState('')
  const [analyse, setAnalyse] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const analyser = async () => {
    if (!texte.trim()) return
    setLoading(true)
    setAnalyse('')
    setErreur('')

    try {
      const res = await fetch('/api/detecteur-voix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte })
      })
      const data = (await res.json()) as DetecteurVoixResponse
      const messageErreur = data.error || data.erreur

      if (!res.ok || messageErreur) {
        setErreur(messageErreur || 'Erreur analyse.')
      } else if (typeof data.analyse === 'string' && data.analyse.trim()) {
        setAnalyse(data.analyse)
      } else if (data.analyse) {
        setAnalyse(JSON.stringify(data.analyse, null, 2))
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

      {analyse && (
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
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            fontSize: '0.95rem',
            color: '#d4c5a9'
          }}>
            {analyse}
          </div>
        </div>
      )}
    </div>
  )
}
