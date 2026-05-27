"use client";

// /app/agent/page.tsx
// Page /agent — interface de chat avec ton agent personnel.

import { useCallback, useEffect, useRef, useState } from "react";
import { readAppContext, formatContextForAgent } from "@/app/lib/agent-context";
import type { AppContext } from "@/app/lib/agent-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    icon: "📊",
    label: "État du jour",
    text: "Analyse mon contexte de journée et dis-moi comment je progresse.",
  },
  {
    icon: "🎯",
    label: "Priorité maintenant",
    text: "Quelles sont mes tâches non faites les plus importantes? Par quoi commencer?",
  },
  {
    icon: "🆘",
    label: "Journée difficile",
    text: "C'est une journée difficile. Aide-moi à trouver une seule chose faisable maintenant.",
  },
  {
    icon: "✍️",
    label: "Session bio",
    text: "Je veux travailler sur mon manuscrit. Comment aborder cette session selon mon état actuel?",
  },
  {
    icon: "💼",
    label: "Bloc freelance",
    text: "Aide-moi à avancer sur mon bloc freelance aujourd'hui.",
  },
  {
    icon: "🔁",
    label: "Reset mental",
    text: "Je suis dispersée. Aide-moi à me recentrer sur ce qui compte vraiment aujourd'hui.",
  },
];

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appContext, setAppContext] = useState<AppContext | null>(null);
  const [contextText, setContextText] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const context = readAppContext();
    setAppContext(context);
    setContextText(formatContextForAgent(context));
    setContextLoaded(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const userText = (overrideText ?? input).trim();
      if (!userText || loading) return;

      const userMessage: Message = {
        role: "user",
        content: userText,
        timestamp: new Date().toLocaleTimeString("fr-CA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setInput("");
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            appContext: contextText,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Erreur serveur");
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((previousMessages) => [...previousMessages, assistantMessage]);
      } catch (err) {
        const errorMessage: Message = {
          role: "assistant",
          content: `Erreur de connexion : ${
            err instanceof Error ? err.message : "inconnue"
          }. Vérifie que ANTHROPIC_API_KEY est dans ton .env.local.`,
          timestamp: new Date().toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((previousMessages) => [...previousMessages, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [contextText, input, loading, messages],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function refreshContext() {
    const context = readAppContext();
    setAppContext(context);
    setContextText(formatContextForAgent(context));
  }

  const progression = appContext?.progression ?? 0;
  const hardDay = appContext?.hardDayMode ?? false;
  const pendingCount = appContext?.tasks.pending.length ?? 0;
  const doneCount = appContext?.tasks.done.length ?? 0;

  return (
    <div
      className="flex min-h-screen flex-col bg-[#06080f] text-[#e8e8f0]"
      style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
    >
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#06080f]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] tracking-[4px] text-[#00ffb2] opacity-60">
                AGENT PERSONNEL · SYLVIE
              </p>
              <h1 className="text-lg font-bold tracking-wide">⚡ Assistant de Vie</h1>
            </div>

            <div className="flex items-center gap-2">
              {hardDay && (
                <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-1 text-[10px] tracking-widest text-red-300">
                  JOURNÉE DIFFICILE
                </span>
              )}
              <button
                className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/30 transition-all hover:border-[#00ffb2]/40 hover:text-[#00ffb2]"
                type="button"
                onClick={() => setShowContext((visible) => !visible)}
              >
                {showContext ? "MASQUER" : "CONTEXTE"}
              </button>
              <button
                className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/30 transition-all hover:text-white/60"
                title="Recharger le contexte depuis l'app"
                type="button"
                onClick={refreshContext}
              >
                ↺
              </button>
              <a
                className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/30 transition-all hover:text-white/60"
                href="/"
              >
                ← HUB
              </a>
            </div>
          </div>

          {contextLoaded && (
            <div className="flex items-center gap-3 text-[10px] text-white/30">
              <div className="h-1.5 flex-1 rounded-full bg-white/5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${progression}%`,
                    background:
                      progression > 70 ? "#00ffb2" : progression > 40 ? "#ffd93d" : "#ff6b6b",
                  }}
                />
              </div>
              <span>{progression}%</span>
              <span>{doneCount} faites</span>
              <span>{pendingCount} restantes</span>
            </div>
          )}
        </div>

        {showContext && (
          <div className="mx-auto max-w-3xl px-4 pb-4">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-[10px] leading-relaxed text-white/40">
              {contextText || "Aucun contexte chargé — vérifie les clés localStorage de ton app."}
            </pre>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <section className="py-8 text-center">
            <div className="mb-4 text-4xl">⚡</div>
            <p className="mb-2 text-sm tracking-[3px] text-[#00ffb2]">AGENT CONNECTÉ</p>
            <p className="mx-auto mb-8 max-w-sm text-xs leading-relaxed text-white/25">
              {contextLoaded
                ? `Contexte chargé — ${doneCount + pendingCount} tâches, progression ${progression}%`
                : "Chargement du contexte..."}
            </p>

            <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  className="group rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-[#00ffb2]/30 hover:bg-[#00ffb2]/10"
                  key={prompt.label}
                  type="button"
                  onClick={() => sendMessage(prompt.text)}
                >
                  <span className="text-base">{prompt.icon}</span>
                  <p className="mt-1 text-[11px] leading-tight text-white/50 group-hover:text-[#00ffb2]/80">
                    {prompt.label}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((message, index) => (
          <div
            className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            key={`${message.timestamp}-${index}`}
          >
            {message.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#00ffb2]/50 bg-[#00ffb2]/10 text-xs">
                ⚡
              </div>
            )}

            <div className="max-w-[82%]">
              <div
                className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  message.role === "user"
                    ? "rounded-tr-sm border border-[#00ffb2]/25 bg-[#00ffb2]/10 text-[#00ffb2]/90"
                    : "rounded-tl-sm border border-white/10 bg-[#0c0f1c] text-[#dcdcee]"
                }`}
              >
                {message.content}
              </div>
              <p className="mt-1 px-1 text-[9px] text-white/20">{message.timestamp}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#00ffb2]/50 bg-[#00ffb2]/10 text-xs">
              ⚡
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((item) => (
                <div
                  className="h-1.5 w-1.5 rounded-full bg-[#00ffb2]/60"
                  key={item}
                  style={{
                    animation: "pulse 1.2s ease-in-out infinite",
                    animationDelay: `${item * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 border-t border-white/5 bg-[#06080f]">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {messages.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  className="flex-shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/30 transition-all hover:border-[#00ffb2]/30 hover:text-[#00ffb2]/70"
                  key={prompt.label}
                  type="button"
                  onClick={() => sendMessage(prompt.text)}
                >
                  {prompt.icon} {prompt.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none rounded-xl border border-white/10 bg-[#0c0f1c] px-4 py-3 text-[13px] leading-relaxed text-[#e8e8f0] outline-none transition-colors placeholder:text-white/20 focus:border-[#00ffb2]/30"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris comme tu me parles... (Entrée pour envoyer)"
              ref={textareaRef}
              rows={2}
              style={{ fontFamily: "inherit" }}
              value={input}
            />
            <button
              className="min-w-[46px] rounded-xl bg-[#00ffb2] px-4 py-3 text-base font-bold text-[#06080f] transition-all hover:opacity-90 disabled:bg-white/5 disabled:text-white/15"
              disabled={loading || !input.trim()}
              type="button"
              onClick={() => sendMessage()}
            >
              →
            </button>
          </div>

          <p className="mt-2 text-center text-[9px] tracking-widest text-white/15">
            SHIFT+ENTER = nouvelle ligne · CONTEXTE APP : {contextLoaded ? "CHARGÉ" : "..."}
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
