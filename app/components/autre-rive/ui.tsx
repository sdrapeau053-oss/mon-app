"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/app/lib/types";
import { getCopy } from "@/app/lib/copy";

export function AppShell({
  children,
  lang,
  onLangChange,
}: {
  children: ReactNode;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}) {
  const t = getCopy(lang);

  return (
    <main className="min-h-screen bg-[#14110f] px-4 py-5 text-[#f7efe4]">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-md flex-col">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-[#f7efe4]">
            L’autre rive
          </Link>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-3 text-[11px] text-[#c8b898] sm:flex">
              <Link href="/analyze">{t.nav.analyze}</Link>
              <Link href="/candidate">{t.nav.candidate}</Link>
              <Link href="/patterns">{t.nav.patterns}</Link>
              <Link href="/profile">{t.nav.profile}</Link>
            </nav>
            <LanguageToggle lang={lang} onChange={onLangChange} />
          </div>
        </header>
        <section className="flex-1">{children}</section>
        <Disclaimer text={t.disclaimer} />
      </div>
    </main>
  );
}

export function LanguageToggle({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div className="rounded-full border border-[#3d342e] bg-[#211c18] p-1">
      {(["fr", "en"] as Lang[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            lang === item ? "bg-[#c6a96b] text-[#14110f]" : "text-[#b8a888]"
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({ children, href, onClick, disabled }: ButtonProps) {
  const classes = "block w-full rounded-2xl bg-[#c6a96b] px-5 py-4 text-center text-sm font-bold text-[#14110f] shadow-lg shadow-black/20 disabled:opacity-50";

  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button type="button" disabled={disabled} onClick={onClick} className={classes}>{children}</button>;
}

export function SecondaryButton({ children, href, onClick }: ButtonProps) {
  const classes = "block w-full rounded-2xl border border-[#4a4038] bg-[#211c18] px-5 py-4 text-center text-sm font-semibold text-[#f7efe4]";

  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button type="button" onClick={onClick} className={classes}>{children}</button>;
}

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function TextAreaInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-52 w-full resize-none rounded-3xl border border-[#3d342e] bg-[#211c18] px-5 py-5 text-base leading-7 text-[#f7efe4] outline-none placeholder:text-[#82746a] focus:border-[#c6a96b]"
    />
  );
}

export function ResultCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-3xl border border-[#3d342e] bg-[#211c18] p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9f8f82]">{label}</p>
      <p className="text-lg font-semibold text-[#f7efe4]">{value}</p>
    </article>
  );
}

export function ChoiceCard({ title, subtitle, href, recommended }: {
  title: string;
  subtitle: string;
  href: string;
  recommended?: string;
}) {
  return (
    <Link href={href} className="block rounded-3xl border border-[#3d342e] bg-[#211c18] p-5 text-left">
      {recommended && <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6a96b]">{recommended}</p>}
      <h2 className="mb-2 text-xl font-semibold text-[#f7efe4]">{title}</h2>
      <p className="text-sm leading-6 text-[#c8b898]">{subtitle}</p>
    </Link>
  );
}

export function ModuleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-3xl border border-[#3d342e] bg-[#211c18] p-5">
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#c6a96b]">{title}</h2>
      <ul className="space-y-2 text-sm leading-6 text-[#f7efe4]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

export function PatternCard({ text }: { text: string }) {
  return (
    <article className="rounded-2xl border border-[#3d342e] bg-[#211c18] p-4 text-sm font-semibold text-[#f7efe4]">
      {text}
    </article>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return (
    <footer className="mt-10 border-t border-[#2c2520] pt-5 text-[11px] leading-5 text-[#82746a]">
      {text}
    </footer>
  );
}
