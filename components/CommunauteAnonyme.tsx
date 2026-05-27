"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SharedFragment = {
  id: string;
  text: string;
};

const CRISIS_PATTERNS = [/suicide/i, /mourir/i, /me tuer/i, /plus envie de vivre/i];
const MAX_FRAGMENT_LENGTH = 280;

function todayKey() {
  return new Date().toLocaleDateString("fr-CA");
}

function recognitionIndex(date: string) {
  return date.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
}

function hasCrisisSignal(value: string) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(value));
}

export default function CommunauteAnonyme() {
  const { lang } = useLanguage();
  const [presenceCount, setPresenceCount] = useState<number | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const [fragment, setFragment] = useState("");
  const [fragments, setFragments] = useState<SharedFragment[]>([]);
  const [messageKey, setMessageKey] = useState("");
  const [crisisVisible, setCrisisVisible] = useState(false);
  const date = useMemo(() => todayKey(), []);
  const localPresenceKey = `communaute-presence-${date}`;
  const recognitionKey = `community.recognition.${recognitionIndex(date)}`;

  useEffect(() => {
    try {
      localStorage.setItem(localPresenceKey, new Date().toISOString());
    } catch {
      // localStorage can be unavailable in restricted browser modes.
    }
  }, [localPresenceKey]);

  useEffect(() => {
    let cancelled = false;

    async function syncPresence() {
      if (!isSupabaseConfigured || !supabase) {
        setSupabaseAvailable(false);
        return;
      }

      const anonymousKey = localPresenceKey;
      const { error: insertError } = await supabase
        .from("communaute_presence")
        .upsert({ presence_date: date, anonymous_key: anonymousKey }, { onConflict: "presence_date,anonymous_key" });

      if (insertError) {
        if (!cancelled) setSupabaseAvailable(false);
        return;
      }

      const { count, error: countError } = await supabase
        .from("communaute_presence")
        .select("anonymous_key", { count: "exact", head: true })
        .eq("presence_date", date);

      if (!cancelled && !countError && typeof count === "number") {
        setPresenceCount(count);
        setSupabaseAvailable(true);
      } else if (!cancelled) {
        setSupabaseAvailable(false);
      }
    }

    syncPresence().catch(() => {
      if (!cancelled) setSupabaseAvailable(false);
    });

    return () => {
      cancelled = true;
    };
  }, [date, localPresenceKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadFragments() {
      if (!isSupabaseConfigured || !supabase) return;

      const { data, error } = await supabase
        .from("communaute_fragments")
        .select("id,fragment")
        .eq("fragment_date", date)
        .order("created_at", { ascending: false })
        .limit(12);

      if (cancelled || error || !Array.isArray(data)) return;

      setFragments(
        data
          .filter((item): item is { id: string; fragment: string } => typeof item.id === "string" && typeof item.fragment === "string")
          .map((item) => ({ id: item.id, text: item.fragment.slice(0, MAX_FRAGMENT_LENGTH) })),
      );
    }

    loadFragments().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [date]);

  async function shareFragment() {
    const cleanFragment = fragment.trim().slice(0, MAX_FRAGMENT_LENGTH);
    setMessageKey("");
    setCrisisVisible(false);

    if (!cleanFragment) return;

    if (hasCrisisSignal(cleanFragment)) {
      setCrisisVisible(true);
      setFragment("");
      return;
    }

    if (!supabaseAvailable || !supabase) {
      setMessageKey("community.localMode");
      return;
    }

    const { data, error } = await supabase
      .from("communaute_fragments")
      .insert({ fragment: cleanFragment, fragment_date: date })
      .select("id,fragment")
      .single();

    if (error || !data || typeof data.id !== "string" || typeof data.fragment !== "string") {
      setMessageKey("community.shareUnavailable");
      return;
    }

    setFragments((current) => [{ id: data.id, text: data.fragment.slice(0, MAX_FRAGMENT_LENGTH) }, ...current].slice(0, 12));
    setFragment("");
    setMessageKey("community.shared");
  }

  return (
    <main className="min-h-screen bg-[#1A1A16] px-4 py-8 text-[#E8E0D0]">
      <div className="mx-auto max-w-3xl">
        <Link className="text-xs font-semibold text-[#9A9080] transition hover:text-[#E8E0D0]" href="/life-operating-system">
          {t("community.back", lang)}
        </Link>

        <header className="mt-6 border-l-2 border-[#6B8F71] pl-4">
          <h1 className="font-serif text-[18px] font-normal leading-tight text-[#E8E0D0]">{t("community.title", lang)}</h1>
          <p className="mt-2 text-[12px] leading-tight text-[#9A9080]">{t("community.subtitle", lang)}</p>
        </header>

        <section className="mt-8 rounded-xl border-l-2 border-[#6B8F71] bg-[#1E1E1A] p-6 text-center">
          {supabaseAvailable && presenceCount !== null ? (
            <>
              <p className="text-[12px] uppercase tracking-[0.16em] text-[#9A9080]">{t("community.presenceCollective", lang)}</p>
              <p className="mt-3 text-3xl font-semibold text-[#6B8F71]">{presenceCount}</p>
              <p className="mt-2 text-sm text-[#9A9080]">{t("community.presenceToday", lang)}</p>
            </>
          ) : (
            <p className="text-sm leading-6 text-[#E8E0D0]">{t("community.localPresence", lang)}</p>
          )}
        </section>

        <section className="mt-8 rounded-xl border-l-2 border-[#6B8F71] bg-[#1E1E1A] p-6">
          <div>
            <h2 className="font-serif text-[16px] font-normal text-[#E8E0D0]">{t("community.shareTitle", lang)}</h2>
            <p className="mt-2 text-xs leading-5 text-[#9A9080]">{t("community.shareWarning", lang)}</p>
          </div>

          {!supabaseAvailable ? (
            <p className="mt-4 rounded-xl border border-[#2A2A24] bg-[#1A1A16] px-3 py-2 text-xs leading-5 text-[#9A9080]">
              {t("community.localMode", lang)}
            </p>
          ) : null}

          <textarea
            className="mt-4 min-h-24 w-full resize-none rounded-xl border border-[#2A2A24] bg-[#1A1A16] p-3 text-sm leading-6 text-[#E8E0D0] outline-none transition placeholder:text-[#9A9080] focus:border-[#6B8F71]"
            maxLength={MAX_FRAGMENT_LENGTH}
            onChange={(event) => setFragment(event.target.value.slice(0, MAX_FRAGMENT_LENGTH))}
            placeholder={t("community.placeholder", lang)}
            value={fragment}
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] text-[#9A9080]">{fragment.length}/{MAX_FRAGMENT_LENGTH}</span>
            <button
              className="w-fit rounded-full border border-[#6B8F71] bg-[#6B8F71] px-4 py-2 text-xs font-semibold text-[#1A1A16] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!fragment.trim() || !supabaseAvailable}
              onClick={shareFragment}
              type="button"
            >
              {t("community.shareButton", lang)}
            </button>
          </div>

          {crisisVisible ? (
            <p className="mt-4 rounded-xl border border-[#C9943A]/40 bg-[#C9943A]/10 px-3 py-2 text-xs leading-5 text-[#E8E0D0]">
              {t("community.crisis", lang)}
            </p>
          ) : null}

          {messageKey ? <p className="mt-4 text-xs leading-5 text-[#9A9080]">{t(messageKey, lang)}</p> : null}

          <div className="mt-6 border-t border-[#2A2A24] pt-4">
            {fragments.length ? (
              <ul className="grid gap-2">
                {fragments.map((item) => (
                  <li className="rounded-xl bg-[#1A1A16] px-3 py-2 text-sm leading-6 text-[#E8E0D0]" key={item.id}>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-[#9A9080]">{t("community.emptyFragments", lang)}</p>
            )}
          </div>
        </section>

        <p className="mt-10 text-center text-[13px] italic leading-6 text-[#9A9080]">{t(recognitionKey, lang)}</p>
        <p className="mt-8 text-center text-[11px] leading-5 text-[#9A9080]">{t("community.notAlone", lang)}</p>
      </div>
    </main>
  );
}
