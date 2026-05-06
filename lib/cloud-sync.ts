import { supabase } from "@/lib/supabase";

export type CloudSyncResult<T> = {
  data: T | null;
  error: string | null;
};

export type CloudChapterTome1 = {
  id: string;
  titre: string;
  bloc: number;
  type: string;
  statut: string;
  contenu: string;
};

export type CloudDailySystemState = {
  hardDay: boolean;
  note: string;
  tasks: unknown[];
};

type FragmentRecord = Record<string, unknown> & {
  id: string | number;
  titre?: string;
  tomeId?: number;
  tome?: string;
  chapitre?: string;
  texte?: string;
  type?: string;
  statut?: string;
};

function noSupabase<T>(): CloudSyncResult<T> {
  return {
    data: null,
    error: "Supabase non configuré.",
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Erreur Supabase inconnue.";
}

export async function loadCloudChapitresTome1(): Promise<CloudSyncResult<CloudChapterTome1[]>> {
  if (!supabase) return noSupabase();

  try {
    const { data, error } = await supabase
      .from("chapitres_tome1")
      .select("id,titre,bloc,type,statut,contenu")
      .order("id", { ascending: true });

    if (error) return { data: null, error: error.message };

    return {
      data: (data || []).map((chapitre) => ({
        id: String(chapitre.id),
        titre: String(chapitre.titre || ""),
        bloc: Number(chapitre.bloc || 1),
        type: String(chapitre.type || ""),
        statut: String(chapitre.statut || ""),
        contenu: String(chapitre.contenu || ""),
      })),
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function saveCloudChapitresTome1(
  chapitres: CloudChapterTome1[],
): Promise<CloudSyncResult<null>> {
  if (!supabase) return noSupabase();

  try {
    const { error } = await supabase
      .from("chapitres_tome1")
      .upsert(
        chapitres.map((chapitre) => ({
          ...chapitre,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "id" },
      );

    return { data: null, error: error?.message || null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function loadCloudFragments(): Promise<CloudSyncResult<FragmentRecord[]>> {
  if (!supabase) return noSupabase();

  try {
    const { data, error } = await supabase
      .from("fragments")
      .select("data")
      .order("updated_at", { ascending: false });

    if (error) return { data: null, error: error.message };

    return {
      data: (data || [])
        .map((item) => item.data)
        .filter((item): item is FragmentRecord => Boolean(item && typeof item === "object")),
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function saveCloudFragments(
  fragments: FragmentRecord[],
): Promise<CloudSyncResult<null>> {
  if (!supabase) return noSupabase();

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("fragments")
      .upsert(
        fragments.map((fragment) => ({
          id: String(fragment.id),
          titre: fragment.titre ? String(fragment.titre) : null,
          tome: typeof fragment.tomeId === "number" ? fragment.tomeId : null,
          chapitre: fragment.chapitre ? String(fragment.chapitre) : null,
          contenu: fragment.texte ? String(fragment.texte) : "",
          type: fragment.type ? String(fragment.type) : null,
          statut: fragment.statut ? String(fragment.statut) : null,
          data: fragment,
          updated_at: now,
        })),
        { onConflict: "id" },
      );

    return { data: null, error: error?.message || null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function loadCloudDailySystemEntry(
  date: string,
): Promise<CloudSyncResult<CloudDailySystemState>> {
  if (!supabase) return noSupabase();

  try {
    const { data, error } = await supabase
      .from("daily_system_entries")
      .select("hard_day,note,tasks")
      .eq("id", date)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };

    return {
      data: {
        hardDay: Boolean(data.hard_day),
        note: String(data.note || ""),
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function saveCloudDailySystemEntry(
  date: string,
  state: CloudDailySystemState,
): Promise<CloudSyncResult<null>> {
  if (!supabase) return noSupabase();

  try {
    const { error } = await supabase
      .from("daily_system_entries")
      .upsert(
        {
          id: date,
          date,
          hard_day: state.hardDay,
          note: state.note,
          tasks: state.tasks,
          data: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    return { data: null, error: error?.message || null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
