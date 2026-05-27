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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-widest text-zinc-100">
            STRATE
          </h1>
          <p className="text-sm text-zinc-500">
            Écrire. Vivre. Travailler. En profondeur.
          </p>
        </div>

        <form onSubmit={soumettre} className="space-y-4">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-600/60 text-center tracking-widest"
          />

          {erreur && (
            <p className="text-xs text-red-400 text-center">
              Mot de passe incorrect.
            </p>
          )}

          <button
            type="submit"
            disabled={!pwd}
            className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 rounded-lg text-sm transition-colors tracking-wide"
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
