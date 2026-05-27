"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  SystemActionRow,
  SystemGrid,
  SystemPanel,
  SystemSectionHeader,
  StateTile,
  StatusChip,
} from "@/components/system-ui";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

type BackupPayload = {
  appName: "L’Héritage des Silences";
  backupVersion: 1;
  data: Record<string, string>;
  exportedAt: string;
};

type SecurityState = {
  label: "OK" | "Attention" | "Critique";
  tone: string;
  message: string;
};

type BackupManagerProps = {
  variant?: "floating" | "page";
};

const APP_NAME = "L’Héritage des Silences";
const BACKUP_VERSION = 1;
const LAST_EXPORT_KEY = "backup:lastManualExportAt";
const LAST_IMPORT_KEY = "backup:lastImportAt";
const LAST_KEY_COUNT_KEY = "backup:lastKeyCount";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function collectLocalStorage(): Record<string, string> {
  const data: Record<string, string> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }

  return data;
}

function formatDateTime(value: string | null) {
  if (!value) return "Jamais";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBackupFileDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("-");
}

function getSecurityState(lastExportAt: string | null, keyCount: number): SecurityState {
  if (!lastExportAt) {
    return {
      label: "Critique",
      tone: "border-[#C9943A]/55 bg-[#C9943A]/14 text-[#E8E0D0]",
      message: "backup.noManualExport",
    };
  }

  const exportedAt = new Date(lastExportAt);
  if (Number.isNaN(exportedAt.getTime())) {
    return {
      label: "Critique",
      tone: "border-[#C9943A]/55 bg-[#C9943A]/14 text-[#E8E0D0]",
      message: "La date du dernier export est illisible.",
    };
  }

  if (Date.now() - exportedAt.getTime() > ONE_DAY_MS) {
    return {
      label: "Attention",
      tone: "border-[#C9943A]/48 bg-[#C9943A]/12 text-[#E8E0D0]",
      message: "Le dernier export manuel date de plus de 24h.",
    };
  }

  return {
    label: "OK",
    tone: keyCount === 0 ? "border-[#4A6B8A]/45 bg-[#4A6B8A]/12 text-[#E8E0D0]" : "border-[#6B8F71]/50 bg-[#6B8F71]/14 text-[#E8E0D0]",
    message: keyCount === 0 ? "Sauvegarde récente, aucune clé détectée." : "Sauvegarde récente.",
  };
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<BackupPayload>;
  return (
    candidate.appName === APP_NAME &&
    candidate.backupVersion === BACKUP_VERSION &&
    typeof candidate.exportedAt === "string" &&
    Boolean(candidate.data) &&
    typeof candidate.data === "object" &&
    !Array.isArray(candidate.data) &&
    Object.values(candidate.data).every((item) => typeof item === "string")
  );
}

export default function BackupManager({ variant = "floating" }: BackupManagerProps) {
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(variant === "page");
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [lastImportAt, setLastImportAt] = useState<string | null>(null);
  const [lastKeyCount, setLastKeyCount] = useState(0);
  const [currentKeyCount, setCurrentKeyCount] = useState(0);
  const [message, setMessage] = useState("");

  const refreshState = () => {
    const storedKeyCount = Number(localStorage.getItem(LAST_KEY_COUNT_KEY));

    setLastExportAt(localStorage.getItem(LAST_EXPORT_KEY));
    setLastImportAt(localStorage.getItem(LAST_IMPORT_KEY));
    setLastKeyCount(Number.isFinite(storedKeyCount) ? storedKeyCount : 0);
    setCurrentKeyCount(localStorage.length);
  };

  useEffect(() => {
    refreshState();

    const onStorage = () => refreshState();
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const securityState = useMemo(
    () => getSecurityState(lastExportAt, lastKeyCount),
    [lastExportAt, lastKeyCount],
  );
  const statusLabel = t(
    securityState.label === "Critique"
      ? "backup.status.critical"
      : securityState.label === "Attention"
        ? "backup.status.warning"
        : "backup.status.ok",
    lang,
  );
  const securityMessage = securityState.message.startsWith("backup.")
    ? t(securityState.message, lang)
    : securityState.message;

  const exportBackup = () => {
    const now = new Date();
    const exportedAt = now.toISOString();

    localStorage.setItem(LAST_EXPORT_KEY, exportedAt);

    const data = collectLocalStorage();
    const payload: BackupPayload = {
      appName: APP_NAME,
      backupVersion: BACKUP_VERSION,
      data,
      exportedAt,
    };

    localStorage.setItem(LAST_KEY_COUNT_KEY, String(Object.keys(data).length));

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `heritage-silences-backup-${formatBackupFileDate(now)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    refreshState();
    setMessage("Export manuel créé avec succès.");
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;

      if (!isBackupPayload(parsed)) {
        setMessage("Import refusé : le fichier ne correspond pas au format attendu.");
        return;
      }

      const keyCount = Object.keys(parsed.data).length;
      const confirmed = window.confirm(
        `Cette restauration va remplacer tout le localStorage actuel par les ${keyCount} clés du fichier importé. Cette action peut écraser les données présentes dans le navigateur. Continuer ?`,
      );

      if (!confirmed) {
        setMessage("Restauration annulée.");
        return;
      }

      localStorage.clear();
      Object.entries(parsed.data).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      const importedAt = new Date().toISOString();
      localStorage.setItem(LAST_IMPORT_KEY, importedAt);
      localStorage.setItem(LAST_KEY_COUNT_KEY, String(keyCount));

      refreshState();
      setMessage("Sauvegarde restaurée avec succès. Vous pouvez recharger la page.");
    } catch {
      setMessage("Import impossible : le fichier JSON est invalide.");
    } finally {
      event.target.value = "";
    }
  };

  const stats = (
    <div className="grid gap-2 text-[11px] text-[#E8E0D0] sm:grid-cols-2">
      <p>
        <span className="block text-[9px] uppercase tracking-[0.16em] text-[#a99b84]">{t("backup.lastExport", lang)}</span>
        {formatDateTime(lastExportAt)}
      </p>
      <p>
        <span className="block text-[9px] uppercase tracking-[0.16em] text-[#a99b84]">{t("backup.lastImport", lang)}</span>
        {formatDateTime(lastImportAt)}
      </p>
      <p>
        <span className="block text-[9px] uppercase tracking-[0.16em] text-[#a99b84]">{t("backup.keysSaved", lang)}</span>
        {lastKeyCount}
      </p>
      <p>
        <span className="block text-[9px] uppercase tracking-[0.16em] text-[#a99b84]">{t("backup.keysCurrent", lang)}</span>
        {currentKeyCount}
      </p>
    </div>
  );

  const controls = (
    <>
      <SystemActionRow>
        <button
          className="rounded-full border border-[#d6b25e]/45 bg-[#d6b25e] px-3 py-2 text-[12px] font-semibold text-[#16110a] shadow-sm"
          onClick={exportBackup}
          type="button"
        >
          {t("backup.export.full", lang)}
        </button>
        <button
          className="rounded-full border border-[#d6b25e]/30 bg-[#1c1915] px-3 py-2 text-[12px] font-semibold text-[#efe5d4]"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {t("backup.import.json", lang)}
        </button>
        {message.includes("recharger") ? (
          <button
            className="soft-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Recharger la page
          </button>
        ) : null}
      </SystemActionRow>
      <input
        accept="application/json,.json"
        className="hidden"
        onChange={restoreBackup}
        ref={fileInputRef}
        type="file"
      />
    </>
  );

  if (variant === "page") {
    const chipTone =
      securityState.label === "OK"
        ? "success"
        : securityState.label === "Attention"
          ? "warning"
          : "danger";

    return (
      <SystemPanel ariaLabel={t("backup.local", lang)}>
        <SystemSectionHeader
          actions={<StatusChip tone={chipTone}>{statusLabel}</StatusChip>}
          eyebrow={t("backup.local", lang)}
          title="Backup localStorage"
        />
        <p className="internal-subtitle" style={{ marginBottom: 14 }}>
          Exportez un fichier JSON complet ou restaurez une sauvegarde existante.
        </p>

        <div className={`rounded-xl border px-3 py-2 text-sm ${securityState.tone}`}>
          {securityMessage}
        </div>

        <SystemGrid gap={10} min={170}>
          <StateTile label={t("backup.lastExport", lang)} value={formatDateTime(lastExportAt)} />
          <StateTile label={t("backup.lastImport", lang)} value={formatDateTime(lastImportAt)} />
          <StateTile label={t("backup.keysSaved", lang)} value={String(lastKeyCount)} />
          <StateTile label={t("backup.keysCurrent", lang)} value={String(currentKeyCount)} />
        </SystemGrid>
        {controls}
        {message ? <p className="mt-3 text-sm text-[#E8E0D0]">{message}</p> : null}
      </SystemPanel>
    );
  }

  return (
    <aside
      className={`fixed bottom-3 right-2 z-50 text-[#E8E0D0] sm:bottom-4 sm:right-4 ${
        isOpen ? "w-[min(300px,calc(100vw-16px))]" : "w-auto max-w-[calc(100vw-16px)]"
      }`}
    >
      <div
        className={`rounded-full border border-[#d6b25e]/18 bg-[#13110f]/92 shadow-[0_8px_22px_rgba(26,26,22,0.22)] backdrop-blur ${
          isOpen ? "px-2 py-1 sm:px-2.5" : "p-2"
        }`}
      >
        <button
          aria-expanded={isOpen}
          aria-label={`${t("backup.title", lang)} ${statusLabel}`}
          className={`group relative flex min-w-0 items-center text-left ${isOpen ? "gap-1.5" : "h-4 w-4 justify-center"}`}
          onClick={() => setIsOpen((value) => !value)}
          title={`${t("backup.title", lang)} ${statusLabel}`}
          type="button"
        >
          <span
            className={`shrink-0 rounded-full ${isOpen ? "h-1.5 w-1.5" : "h-2.5 w-2.5"} ${
              securityState.label === "OK" ? "bg-[#6B8F71]" : securityState.label === "Attention" ? "bg-[#C9943A]" : "bg-[#C9943A]"
            }`}
          />
          {isOpen ? (
            <>
              <span className="text-[10px] font-semibold text-[#C9A84C] sm:text-[11px]">{t("backup.title", lang)}</span>
              <span className="rounded-full bg-[#1A1A16]/70 px-1.5 py-0.5 text-[9px] font-bold text-[#E8E0D0] sm:text-[10px]">
                {statusLabel}
              </span>
              <span className="text-[9px] text-[#a99b84]" aria-hidden="true">
                {t("backup.close", lang)}
              </span>
            </>
          ) : (
            <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full border border-[#2A2A24] bg-[#1E1E1A] px-2 py-1 text-[10px] font-semibold text-[#E8E0D0] opacity-0 shadow-[0_8px_22px_rgba(26,26,22,0.24)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {statusLabel}
            </span>
          )}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-2 rounded-2xl border border-[#d6b25e]/18 bg-[#13110f]/96 p-3 shadow-[0_14px_34px_rgba(26,26,22,0.26)] backdrop-blur">
          <p className={`mb-3 rounded-xl border px-3 py-2 text-[12px] ${securityState.tone}`}>
            {securityMessage}
          </p>
          {stats}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              className="rounded-full border border-[#d6b25e]/24 px-3 py-1.5 text-[11px] font-semibold text-[#eadcc3]"
              href="/backup"
            >
              {t("backup.page", lang)}
            </Link>
            <button
              className="rounded-full border border-[#d6b25e]/45 bg-[#d6b25e] px-3 py-1.5 text-[11px] font-semibold text-[#16110a]"
              onClick={exportBackup}
              type="button"
            >
              {t("backup.export", lang)}
            </button>
            <button
              className="rounded-full border border-[#d6b25e]/24 bg-[#1c1915] px-3 py-1.5 text-[11px] font-semibold text-[#efe5d4]"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {t("backup.import", lang)}
            </button>
          </div>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={restoreBackup}
            ref={fileInputRef}
            type="file"
          />
          {message ? <p className="mt-3 text-[12px] text-[#efe5d4]">{message}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}
