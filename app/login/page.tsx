'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [pwd, setPwd] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const erreur = params.get('erreur');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/api/login?pwd=${encodeURIComponent(pwd)}`);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Halo large */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -58%)',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(201,168,92,0.08) 0%, rgba(201,168,92,0.03) 45%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Halo concentré */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -65%)',
        width: '360px',
        height: '360px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(201,168,92,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Contenu */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '48px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h1 style={{
            fontSize: 'clamp(56px, 10vw, 88px)',
            fontWeight: 300,
            letterSpacing: '0.25em',
            color: '#f4f4f5',
            margin: 0,
            lineHeight: 1,
            textShadow: '0 0 80px rgba(201,168,92,0.22), 0 0 160px rgba(201,168,92,0.08)',
          }}>
            STRATE
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'rgba(161,161,170,0.65)',
            margin: 0,
            letterSpacing: '0.08em',
            fontWeight: 300,
          }}>
            Écrire. Vivre. Travailler. En profondeur.
          </p>
        </div>

        {/* Séparateur */}
        <div style={{
          width: '1px',
          height: '36px',
          background: 'linear-gradient(to bottom, transparent, rgba(201,168,92,0.25), transparent)',
        }} />

        {/* Formulaire */}
        <form onSubmit={soumettre} style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: 'rgba(24,24,27,0.80)',
              border: '1px solid rgba(63,63,70,0.80)',
              borderRadius: '12px',
              padding: '18px 24px',
              fontSize: '16px',
              color: '#f4f4f5',
              textAlign: 'center',
              letterSpacing: '0.15em',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201,168,92,0.50)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,92,0.07), 0 0 24px rgba(201,168,92,0.05)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(63,63,70,0.80)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {erreur && (
            <p style={{
              fontSize: '13px',
              color: 'rgba(248,113,113,0.80)',
              textAlign: 'center',
              margin: 0,
              letterSpacing: '0.03em',
            }}>
              Mot de passe incorrect.
            </p>
          )}

          <button
            type="submit"
            disabled={!pwd}
            style={{
              width: '100%',
              padding: '18px 24px',
              backgroundColor: pwd ? 'rgba(180,140,60,0.88)' : 'rgba(39,39,42,0.60)',
              color: pwd ? '#f4f4f5' : 'rgba(113,113,122,0.60)',
              border: pwd ? '1px solid rgba(201,168,92,0.28)' : '1px solid rgba(63,63,70,0.40)',
              borderRadius: '12px',
              fontSize: '15px',
              letterSpacing: '0.12em',
              fontWeight: 400,
              cursor: pwd ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (pwd) {
                e.currentTarget.style.backgroundColor = 'rgba(201,168,92,0.95)';
                e.currentTarget.style.boxShadow = '0 0 28px rgba(201,168,92,0.14)';
              }
            }}
            onMouseLeave={(e) => {
              if (pwd) {
                e.currentTarget.style.backgroundColor = 'rgba(180,140,60,0.88)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
