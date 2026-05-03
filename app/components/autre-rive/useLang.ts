"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/app/lib/types";
import { readLocal, writeLocal } from "@/app/lib/storage";

export function useLang() {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    setLangState(readLocal<Lang>("lr_lang", "fr"));
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    writeLocal("lr_lang", next);
  }

  return { lang, setLang };
}
