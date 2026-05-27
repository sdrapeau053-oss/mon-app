"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

const STORAGE_KEY = "strate-usage-feedback";

type FeedbackPriority = "mineur" | "moyen" | "important";
type FeedbackClicks = "1-2" | "3-4" | "5+";
type FoundQuickly = "oui" | "non";

type UsageFeedback = {
  clicks: FeedbackClicks;
  confusing: string;
  createdAt: string;
  helped: string;
  id: string;
  priority: FeedbackPriority;
  foundQuickly: FoundQuickly;
  tryingToDo: string;
};

type FeedbackForm = Omit<UsageFeedback, "createdAt" | "id">;

const emptyForm: FeedbackForm = {
  clicks: "1-2",
  confusing: "",
  foundQuickly: "oui",
  helped: "",
  priority: "mineur",
  tryingToDo: "",
};

function safeReadFeedback(): UsageFeedback[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is UsageFeedback => Boolean(item?.id && item?.createdAt)) : [];
  } catch {
    return [];
  }
}

function saveFeedback(items: UsageFeedback[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function summarizeFeedback(feedback: UsageFeedback) {
  return feedback.tryingToDo.trim() || feedback.confusing.trim() || "Retour sans résumé";
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="label-meta" style={{ marginBottom: 6 }}>
      {children}
    </span>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label style={{ display: "grid" }}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          background: "rgba(13, 12, 10, 0.72)",
          border: "1px solid rgba(201, 168, 92, 0.18)",
          borderRadius: 10,
          color: "var(--text-main)",
          fontSize: 14,
          lineHeight: 1.5,
          minHeight: 92,
          outline: "none",
          padding: "10px 12px",
          resize: "vertical",
          width: "100%",
        }}
        value={value}
      />
    </label>
  );
}

function ChoiceGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              style={{
                background: active ? "#C9A84C" : "rgba(13, 12, 10, 0.72)",
                border: `1px solid ${active ? "rgba(201, 168, 92, 0.78)" : "rgba(201, 168, 92, 0.18)"}`,
                borderRadius: 999,
                color: active ? "#15110d" : "var(--text-soft)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 12px",
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RetourUtilisationPage() {
  const [feedbacks, setFeedbacks] = useState<UsageFeedback[]>([]);
  const [form, setForm] = useState<FeedbackForm>(emptyForm);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setFeedbacks(safeReadFeedback());
  }, []);

  const latestFeedbacks = useMemo(() => feedbacks.slice(0, 20), [feedbacks]);

  function updateForm<Key extends keyof FeedbackForm>(key: Key, value: FeedbackForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function handleSave() {
    const hasContent = [form.tryingToDo, form.confusing, form.helped].some((value) => value.trim());
    if (!hasContent) {
      setSavedMessage("Ajoute au moins une note avant d’enregistrer.");
      return;
    }

    const nextFeedback: UsageFeedback = {
      ...form,
      createdAt: new Date().toISOString(),
      id: `usage-${Date.now()}`,
    };
    const nextFeedbacks = [nextFeedback, ...feedbacks].slice(0, 100);
    setFeedbacks(nextFeedbacks);
    saveFeedback(nextFeedbacks);
    setForm(emptyForm);
    setSavedMessage("Retour enregistré.");
  }

  function handleDelete(id: string) {
    const nextFeedbacks = feedbacks.filter((feedback) => feedback.id !== id);
    setFeedbacks(nextFeedbacks);
    saveFeedback(nextFeedbacks);
  }

  return (
    <main className="min-h-screen bg-[#1A1A16] text-[#E8E0D0]">
      <SystemPageShell maxWidth={980} padding="28px 18px 56px">
        <div style={{ marginBottom: 18 }}>
          <BackLink label="Guide STRATE" href="/guide-strate" />
        </div>

        <SystemPanel compact>
          <SystemSectionHeader eyebrow="Retour terrain" title="Retour d’utilisation STRATE" />
          <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 720 }}>
            Note rapidement ce qui bloque, ce qui aide, et ce qui mérite d’être simplifié après une vraie utilisation.
          </p>
        </SystemPanel>

        <SystemPanel ariaLabel="Formulaire de retour d’utilisation" compact>
          <SystemGrid gap={12} min={260}>
            <TextAreaField
              label="Qu’essayais-tu de faire ?"
              onChange={(value) => updateForm("tryingToDo", value)}
              placeholder="Ex. retrouver un chapitre, corriger un passage, publier une idée..."
              value={form.tryingToDo}
            />
            <TextAreaField
              label="Ce qui était confus ou difficile ?"
              onChange={(value) => updateForm("confusing", value)}
              placeholder="Ex. trop de choix, mauvais nom de page, bouton difficile à trouver..."
              value={form.confusing}
            />
            <TextAreaField
              label="Ce qui t’a aidée ?"
              onChange={(value) => updateForm("helped", value)}
              placeholder="Ex. un lien clair, une carte, un raccourci..."
              value={form.helped}
            />
          </SystemGrid>

          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            <ChoiceGroup<FoundQuickly>
              label="As-tu trouvé rapidement où aller ?"
              onChange={(value) => updateForm("foundQuickly", value)}
              options={[
                { label: "Oui", value: "oui" },
                { label: "Non", value: "non" },
              ]}
              value={form.foundQuickly}
            />
            <ChoiceGroup<FeedbackClicks>
              label="Combien de clics environ avant d’arriver au bon endroit ?"
              onChange={(value) => updateForm("clicks", value)}
              options={[
                { label: "1-2", value: "1-2" },
                { label: "3-4", value: "3-4" },
                { label: "5+", value: "5+" },
              ]}
              value={form.clicks}
            />
            <ChoiceGroup<FeedbackPriority>
              label="Priorité du problème"
              onChange={(value) => updateForm("priority", value)}
              options={[
                { label: "mineur", value: "mineur" },
                { label: "moyen", value: "moyen" },
                { label: "important", value: "important" },
              ]}
              value={form.priority}
            />
          </div>

          <SystemActionRow>
            <button className="soft-button" onClick={handleSave} type="button">
              Enregistrer le retour
            </button>
            {savedMessage && <StatusChip tone={savedMessage.includes("enregistré") ? "success" : "warning"}>{savedMessage}</StatusChip>}
          </SystemActionRow>
        </SystemPanel>

        <SystemPanel ariaLabel="Derniers retours" compact>
          <SystemSectionHeader
            actions={<StatusChip>{latestFeedbacks.length}/20</StatusChip>}
            eyebrow="Journal local"
            title="Derniers retours"
          />

          {latestFeedbacks.length === 0 ? (
            <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Aucun retour enregistré pour le moment.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {latestFeedbacks.map((feedback) => (
                <article
                  key={feedback.id}
                  style={{
                    background: "rgba(255, 250, 238, 0.035)",
                    border: "1px solid rgba(201, 168, 92, 0.12)",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "var(--text-main)", fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
                        {summarizeFeedback(feedback)}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, margin: "5px 0 0" }}>
                        {formatDate(feedback.createdAt)} · trouvé rapidement : {feedback.foundQuickly} · clics : {feedback.clicks}
                      </p>
                    </div>
                    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <StatusChip tone={feedback.priority === "important" ? "warning" : "neutral"}>{feedback.priority}</StatusChip>
                      <button className="soft-button" onClick={() => handleDelete(feedback.id)} type="button">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {(feedback.confusing || feedback.helped) && (
                    <div style={{ color: "var(--text-soft)", display: "grid", fontSize: 13, gap: 4, lineHeight: 1.5, marginTop: 10 }}>
                      {feedback.confusing && <p style={{ margin: 0 }}>Confus : {feedback.confusing}</p>}
                      {feedback.helped && <p style={{ margin: 0 }}>Aidé : {feedback.helped}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
