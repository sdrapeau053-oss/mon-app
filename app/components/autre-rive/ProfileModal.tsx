"use client";

import { useEffect, useState } from "react";
import type { Lang, UserProfile } from "@/app/lib/types";
import { getCopy } from "@/app/lib/copy";
import { readLocal, writeLocal } from "@/app/lib/storage";
import { PrimaryButton } from "@/app/components/autre-rive/ui";

const emptyProfile: UserProfile = {
  values: [],
  relationshipGoal: "",
  pastPatterns: [],
  triggers: [],
  nonNegotiables: [],
};

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function ProfileForm({ lang }: { lang: Lang }) {
  const t = getCopy(lang).profile;
  const [values, setValues] = useState("");
  const [relationshipGoal, setRelationshipGoal] = useState("");
  const [pastPatterns, setPastPatterns] = useState("");
  const [triggers, setTriggers] = useState("");
  const [nonNegotiables, setNonNegotiables] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = readLocal<UserProfile>("user_profile", emptyProfile);
    setValues(profile.values.join(", "));
    setRelationshipGoal(profile.relationshipGoal);
    setPastPatterns(profile.pastPatterns.join(", "));
    setTriggers(profile.triggers.join(", "));
    setNonNegotiables(profile.nonNegotiables.join(", "));
  }, []);

  function save() {
    writeLocal<UserProfile>("user_profile", {
      values: splitList(values).slice(0, 2),
      relationshipGoal,
      pastPatterns: splitList(pastPatterns),
      triggers: splitList(triggers),
      nonNegotiables: splitList(nonNegotiables),
    });
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <ProfileInput label={t.fields.values} value={values} onChange={setValues} />
      <ProfileInput label={t.fields.relationshipGoal} value={relationshipGoal} onChange={setRelationshipGoal} />
      <ProfileInput label={t.fields.pastPatterns} value={pastPatterns} onChange={setPastPatterns} />
      <ProfileInput label={t.fields.triggers} value={triggers} onChange={setTriggers} />
      <ProfileInput label={t.fields.nonNegotiables} value={nonNegotiables} onChange={setNonNegotiables} />
      <PrimaryButton onClick={save}>{saved ? "OK" : t.save}</PrimaryButton>
    </div>
  );
}

function ProfileInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#9f8f82]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#3d342e] bg-[#211c18] px-4 py-3 text-sm text-[#f7efe4] outline-none focus:border-[#c6a96b]"
      />
    </label>
  );
}
