"use client";

import { BackLink } from "@/components/ui/back-link";
import { SystemPageShell } from "@/components/system-ui";
import {
  DEFAULT_BOOK_SETTINGS,
  lireBookSettings,
  sauvegarderBookSettings,
  type BookSettings,
} from "@/lib/book-settings";
import { useEffect, useState } from "react";

type Field = {
  description: string;
  id: keyof BookSettings;
  label: string;
  multiline?: boolean;
};

const fields: Field[] = [
  {
    id: "auteur",
    label: "Nom d’autrice",
    description: "Nom affiché sur la page titre et les mentions éditoriales.",
  },
  {
    id: "titreTome",
    label: "Titre du tome",
    description: "Titre exact utilisé dans l’export du manuscrit.",
  },
  {
    id: "dedicace",
    label: "Dédicace",
    description: "Texte placé dans la section dédiée du livre.",
    multiline: true,
  },
  {
    id: "epigraphe",
    label: "Épigraphe",
    description: "Citation ou phrase d’ouverture.",
    multiline: true,
  },
  {
    id: "noteAutrice",
    label: "Note de l’autrice",
    description: "Note liminaire affichée avant la table des matières.",
    multiline: true,
  },
];

export default function ParametresLivrePage() {
  const [settings, setSettings] = useState<BookSettings>(DEFAULT_BOOK_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(lireBookSettings());
  }, []);

  const updateField = (id: keyof BookSettings, value: string) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [id]: value }));
  };

  const save = () => {
    sauvegarderBookSettings(settings);
    setSaved(true);
  };

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={768} padding="22px 16px 44px">
        <header className="internal-header">
          <BackLink label="Système" />
          <p className="internal-kicker">Livre</p>
          <h1 className="internal-title">Paramètres du livre</h1>
          <p className="internal-subtitle">
            Modifier les pages liminaires et les mentions éditoriales sans toucher au code.
          </p>
        </header>

        <section className="internal-panel grid gap-5">
          {fields.map((field) => (
            <label className="grid gap-2" key={field.id}>
              <span className="editorial-label">{field.label}</span>
              <span className="editorial-body text-sm">{field.description}</span>
              {field.multiline ? (
                <textarea
                  className="internal-control min-h-28 resize-y px-4 py-3 font-serif text-sm leading-7"
                  onChange={(event) => updateField(field.id, event.target.value)}
                  value={settings[field.id]}
                />
              ) : (
                <input
                  className="internal-control px-4 py-3 font-serif text-sm"
                  onChange={(event) => updateField(field.id, event.target.value)}
                  value={settings[field.id]}
                />
              )}
            </label>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d6b25e]/15 pt-4">
            <p className="text-xs text-[#a99b84]">
              Ces informations sont sauvegardées localement dans ton navigateur.
            </p>
            <button className="internal-button-primary" onClick={save} type="button">
              {saved ? "Sauvegardé" : "Enregistrer"}
            </button>
          </div>
        </section>
      </SystemPageShell>
    </main>
  );
}
