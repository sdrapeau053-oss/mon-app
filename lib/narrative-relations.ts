import type { Fragment } from "@/lib/fragments";
import { lireFragments } from "@/lib/fragments";
import { lireMemoiresNarratives, type MemoireNarrative } from "@/lib/memoire-narrative";
import {
  CHAPITRES_DEFAUT,
  lireChapitres,
  lireTomes,
  type ManuscriptTome,
} from "@/lib/manuscript-structure";
import type { Scene } from "@/lib/scenes";
import {
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

export const SCENES_STORAGE_KEY = "scenes-lhs";
export const NARRATIVE_RELATIONS_STORAGE_KEY = "narrative-relations";

export type NarrativeRelationEntityType =
  | "fragment"
  | "memoire"
  | "chapitre"
  | "chapter"
  | "scene"
  | "motif"
  | "emotion"
  | "period";

export type NarrativeRelationType =
  | "motif"
  | "emotion"
  | "echo"
  | "continuity"
  | "memory"
  | "body-pattern"
  | "probable-chapter"
  | "motif-compatible"
  | "explicit-link";

export type NarrativeRelation = {
  id: string;
  sourceType?: NarrativeRelationEntityType;
  sourceId: string;
  targetType?: NarrativeRelationEntityType;
  targetId: string;
  relationType: NarrativeRelationType;
  strength: number;
  confidence?: number;
  createdAt: string;
};

export type ChapterNarrativeLinks = {
  sceneIds?: string[];
  fragmentIds?: string[];
  chapitreId?: string;
  tomeId?: number | null;
};

export type ChapterNarrativeStats = {
  sceneCount: number;
  fragmentCount: number;
  memoireCount: number;
  averageIntensity: number;
  hasRespiration: boolean;
  hasPivot: boolean;
  hasTrauma: boolean;
  motifs: string[];
};

export type NarrativeEntityType = "fragment" | "memoire" | "chapter" | "scene" | "motif" | "emotion" | "period";

export type NarrativeEntity = {
  id: string;
  type: NarrativeEntityType;
  label: string;
  text: string;
  tomeId?: number | null;
  chapterIndex?: number | null;
  chapterId?: string;
  motifs: string[];
  emotions: string[];
  period?: string | null;
};

export type RecurringMotif = {
  motif: string;
  count: number;
  entityIds: string[];
};

export type EmotionalChapterLink = {
  chapterId: string;
  chapterLabel: string;
  emotion: string;
  relatedEntityIds: string[];
};

export type NarrativeRelationsSnapshot = {
  entities: NarrativeEntity[];
  relations: NarrativeRelation[];
  recurringMotifs: RecurringMotif[];
  emotionalChapterLinks: EmotionalChapterLink[];
};

const GENERATED_RELATION_DATE = "1970-01-01T00:00:00.000Z";

const MOTIF_VARIANTS: Record<string, string[]> = {
  eau: ["eau", "eaux", "rivière", "ruisseau", "pluie", "lac", "cascade"],
  froid: ["froid", "froide", "froids", "froides", "glace", "gel", "gelé", "gelée"],
  silence: ["silence", "silences", "silencieux", "silencieuse", "muet", "muette", "absence de bruit"],
  corps: ["corps", "corporel", "corporelle", "chair", "peau", "ventre", "main", "souffle"],
  maison: ["maison", "maisons", "chambre", "cuisine", "porte", "fenêtre"],
  peur: ["peur", "craindre", "craint", "terrorisé", "terrorisée", "menace", "danger", "inquiétude"],
  honte: ["honte", "humiliation", "humilié", "humiliée", "honteux", "honteuse", "gêne"],
  voix: ["voix", "dire", "parole", "crier", "cri", "murmure"],
  lumière: ["lumière", "lumières", "clair", "claire", "soleil", "lampe"],
  nuit: ["nuit", "nuits", "noirceur", "sombre", "ombre"],
  mère: ["mère", "maman", "maternel", "maternelle"],
  père: ["père", "papa", "paternel", "paternelle"],
};

const EMOTION_VARIANTS: Record<string, string[]> = {
  peur: ["peur", "angoisse", "anxiété", "terreur", "panique", "inquiétude"],
  honte: ["honte", "gêne", "humiliation", "honteux", "humilié"],
  colère: ["colère", "rage", "fureur", "énervement"],
  tristesse: ["tristesse", "chagrin", "pleurs", "deuil"],
  solitude: ["solitude", "seule", "seul", "isolement", "abandonnée", "abandonné"],
  dissociation: ["dissociation", "absence", "figée", "figé", "engourdie", "engourdi", "loin"],
};

const BODY_PATTERN_VARIANTS: Record<string, string[]> = {
  souffle: ["souffle", "respiration", "respirer", "inspirer", "expirer"],
  tension: ["tension", "tendu", "tendue", "bracé", "bracée", "serré", "serrée"],
  ventre: ["ventre", "estomac", "nausée", "digestion"],
  peau: ["peau", "frisson", "chair", "toucher"],
  voix: ["voix", "gorge", "cri", "murmure", "silence"],
};

function normalizeIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
        .map(String)
        .filter(Boolean)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function createChapitreId(tomeId?: number | null, chapitre?: number | string | null) {
  if (!tomeId || chapitre === undefined || chapitre === null || chapitre === "") return "";
  return `tome-${tomeId}-chapitre-${chapitre}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function textContainsVariant(normalizedText: string, variant: string) {
  const normalizedVariant = normalizeText(variant);
  if (!normalizedVariant) return false;
  if (normalizedVariant.includes(" ")) return normalizedText.includes(normalizedVariant);
  return new RegExp(`(^|\\s)${normalizedVariant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`).test(normalizedText);
}

function detectFromLexicon(text: string, lexicon: Record<string, string[]>) {
  const normalizedText = normalizeText(text);
  return Object.entries(lexicon)
    .filter(([, variants]) => variants.some((variant) => textContainsVariant(normalizedText, variant)))
    .map(([key]) => key);
}

function getWordSet(text: string) {
  const stopWords = new Set([
    "avec",
    "dans",
    "des",
    "elle",
    "est",
    "les",
    "mais",
    "pas",
    "pour",
    "que",
    "qui",
    "sur",
    "une",
    "comme",
    "cette",
    "cela",
    "tout",
    "plus",
    "sans",
  ]);

  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((word) => word.length > 4 && !stopWords.has(word)),
  );
}

function getOverlapScore(sourceText: string, targetText: string) {
  const sourceWords = getWordSet(sourceText);
  const targetWords = getWordSet(targetText);
  if (!sourceWords.size || !targetWords.size) return 0;

  const shared = Array.from(sourceWords).filter((word) => targetWords.has(word));
  return shared.length / Math.min(sourceWords.size, targetWords.size);
}

function relationId(sourceId: string, targetId: string, relationType: NarrativeRelation["relationType"], marker: string) {
  return `rel-${relationType}-${normalizeLabel(sourceId)}-${normalizeLabel(targetId)}-${normalizeLabel(marker)}`;
}

function clampStrength(value: number) {
  return Number(Math.min(1, Math.max(0.1, value)).toFixed(2));
}

function inferRelationEntityType(entityId: string): NarrativeRelationEntityType | undefined {
  if (entityId.startsWith("fragment:")) return "fragment";
  if (entityId.startsWith("memoire:")) return "memoire";
  if (entityId.startsWith("scene:")) return "scene";
  if (entityId.startsWith("motif:")) return "motif";
  if (entityId.startsWith("emotion:")) return "emotion";
  if (entityId.startsWith("period:")) return "period";
  if (/^tome-\d+-chapitre-/.test(entityId)) return "chapitre";
  return undefined;
}

function normalizeRelationEntityType(value: unknown, fallback?: NarrativeRelationEntityType) {
  if (
    value === "fragment" ||
    value === "memoire" ||
    value === "chapitre" ||
    value === "chapter" ||
    value === "scene" ||
    value === "motif" ||
    value === "emotion" ||
    value === "period"
  ) {
    return value;
  }

  return fallback;
}

function isNarrativeRelationType(value: unknown): value is NarrativeRelationType {
  return (
    value === "motif" ||
    value === "emotion" ||
    value === "echo" ||
    value === "continuity" ||
    value === "memory" ||
    value === "body-pattern" ||
    value === "probable-chapter" ||
    value === "motif-compatible" ||
    value === "explicit-link"
  );
}

function getFragmentRelationIds(fragment: Fragment) {
  return new Set([`fragment:${String(fragment.id)}`, String(fragment.id)].filter(Boolean));
}

function getMemoireRelationIds(memoire: MemoireNarrative) {
  return new Set([`memoire:${memoire.id}`, memoire.id].filter(Boolean));
}

function relationTouchesChapter(relation: NarrativeRelation, chapterIds: Set<string>) {
  return chapterIds.has(relation.sourceId) || chapterIds.has(relation.targetId);
}

function relationLinksEntityToChapter(
  relation: NarrativeRelation,
  entityIds: Set<string>,
  chapterIds: Set<string>,
) {
  const sourceIsEntity = entityIds.has(relation.sourceId);
  const targetIsEntity = entityIds.has(relation.targetId);
  const sourceIsChapter = chapterIds.has(relation.sourceId);
  const targetIsChapter = chapterIds.has(relation.targetId);

  return (sourceIsEntity && targetIsChapter) || (targetIsEntity && sourceIsChapter);
}

function createRelation(
  sourceId: string,
  targetId: string,
  relationType: NarrativeRelation["relationType"],
  strength: number,
  marker: string = relationType,
  sourceType?: NarrativeRelationEntityType,
  targetType?: NarrativeRelationEntityType,
): NarrativeRelation | null {
  if (!sourceId || !targetId || sourceId === targetId) return null;
  const normalizedStrength = clampStrength(strength);

  return {
    id: relationId(sourceId, targetId, relationType, marker),
    sourceType: sourceType || inferRelationEntityType(sourceId),
    sourceId,
    targetType: targetType || inferRelationEntityType(targetId),
    targetId,
    relationType,
    strength: normalizedStrength,
    confidence: normalizedStrength,
    createdAt: GENERATED_RELATION_DATE,
  };
}

function uniqueRelations(relations: Array<NarrativeRelation | null>) {
  const byId = new Map<string, NarrativeRelation>();
  relations.filter((relation): relation is NarrativeRelation => Boolean(relation)).forEach((relation) => {
    const current = byId.get(relation.id);
    if (!current || relation.strength > current.strength) byId.set(relation.id, relation);
  });
  return Array.from(byId.values()).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
}

function normalizeNarrativeRelation(value: unknown): NarrativeRelation | null {
  if (!isRecord(value)) return null;
  const relationType = value.relationType;
  if (!isNarrativeRelationType(relationType)) return null;

  const sourceId = typeof value.sourceId === "string" ? value.sourceId : "";
  const targetId = typeof value.targetId === "string" ? value.targetId : "";
  if (!sourceId || !targetId) return null;
  const confidence = clampStrength(Number(value.confidence) || Number(value.strength) || 0.5);

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : relationId(sourceId, targetId, relationType, "manual"),
    sourceType: normalizeRelationEntityType(value.sourceType, inferRelationEntityType(sourceId)),
    sourceId,
    targetType: normalizeRelationEntityType(value.targetType, inferRelationEntityType(targetId)),
    targetId,
    relationType,
    strength: confidence,
    confidence,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

export function lireScenesRelationnelles(): Scene[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(SCENES_STORAGE_KEY);
    const rawScenes = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(rawScenes)) return [];

    return rawScenes
      .filter((scene): scene is Record<string, unknown> => isRecord(scene))
      .map((scene) => {
        const tome = Number(scene.tome) || Number(scene.tomeId) || 1;
        const chapitre = Number(scene.chapitre) || 1;

        return {
          ...scene,
          id: typeof scene.id === "string" ? scene.id : `scene-${Date.now()}`,
          titre: typeof scene.titre === "string" ? scene.titre : "Scène sans titre",
          tome,
          tomeId: Number(scene.tomeId) || tome,
          chapitre,
          chapitreId:
            typeof scene.chapitreId === "string"
              ? scene.chapitreId
              : createChapitreId(tome, chapitre),
          fragmentIds: normalizeIds(scene.fragmentIds),
          liens: Array.isArray(scene.liens) ? scene.liens : [],
        } as Scene;
      });
  } catch {
    return [];
  }
}

export function sauvegarderScenesRelationnelles(scenes: Scene[]) {
  localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
  return scenes;
}

export function lireRelationsNarratives(): NarrativeRelation[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(NARRATIVE_RELATIONS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return uniqueRelations(parsed.map(normalizeNarrativeRelation));
  } catch {
    return [];
  }
}

export function sauvegarderRelationsNarratives(relations: NarrativeRelation[]) {
  const normalized = uniqueRelations(relations.map(normalizeNarrativeRelation));
  localStorage.setItem(NARRATIVE_RELATIONS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function lireNarrativeRelations() {
  return lireRelationsNarratives();
}

export function sauvegarderNarrativeRelations(relations: NarrativeRelation[]) {
  return sauvegarderRelationsNarratives(relations);
}

export function ajouterNarrativeRelation(relation: NarrativeRelation) {
  const normalized = normalizeNarrativeRelation(relation);
  if (!normalized) return lireRelationsNarratives();
  return sauvegarderRelationsNarratives([normalized, ...lireRelationsNarratives()]);
}

export function supprimerNarrativeRelation(id: string) {
  return sauvegarderRelationsNarratives(lireRelationsNarratives().filter((relation) => relation.id !== id));
}

function ecritureKey(tomeId: number, chapterTitle: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(chapterTitle)}`;
}

function chapterEntityFromTome1(chapter: ChapitreTome1): NarrativeEntity {
  const chapterIndex = getNumeroChapitreTome1(chapter.id);
  const text = [chapter.titre, chapter.description, chapter.contenu, chapter.imageCentrale, chapter.fonctionNarrative]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("\n");

  return {
    id: createChapitreId(1, chapterIndex),
    type: "chapter",
    label: `Tome 1 · ${chapter.titre}`,
    text,
    tomeId: 1,
    chapterIndex,
    chapterId: createChapitreId(1, chapterIndex),
    motifs: detectFromLexicon(text, MOTIF_VARIANTS),
    emotions: detectFromLexicon(text, EMOTION_VARIANTS),
    period: chapter.periode || null,
  };
}

function chapterEntityFromStructure(tome: ManuscriptTome, chapterTitle: string, index: number): NarrativeEntity {
  const text = typeof window === "undefined" ? "" : localStorage.getItem(ecritureKey(tome.id, chapterTitle)) || "";
  const combinedText = [chapterTitle, text].join("\n");

  return {
    id: createChapitreId(tome.id, index + 1),
    type: "chapter",
    label: `${tome.titre} · ${chapterTitle}`,
    text: combinedText,
    tomeId: tome.id,
    chapterIndex: index + 1,
    chapterId: createChapitreId(tome.id, index + 1),
    motifs: detectFromLexicon(combinedText, MOTIF_VARIANTS),
    emotions: detectFromLexicon(combinedText, EMOTION_VARIANTS),
    period: null,
  };
}

function fragmentEntity(fragment: Fragment): NarrativeEntity {
  const text = [fragment.titre, fragment.texte, fragment.note, ...(fragment.tags || [])]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("\n");

  return {
    id: `fragment:${String(fragment.id)}`,
    type: "memoire",
    label: fragment.titre || `Fragment ${String(fragment.id)}`,
    text,
    tomeId: fragment.tomeId ?? null,
    chapterIndex: fragment.chapitre ? Number(fragment.chapitre) || null : null,
    chapterId: fragment.chapitreId,
    motifs: Array.from(new Set([...(fragment.tags || []), ...detectFromLexicon(text, MOTIF_VARIANTS)])).filter(Boolean),
    emotions: detectFromLexicon(text, EMOTION_VARIANTS),
    period: fragment.periode,
  };
}

function sceneEntity(scene: Scene): NarrativeEntity {
  const text = [
    scene.titre,
    scene.description,
    scene.notes,
    scene.fonctionNarrative,
    scene.consequences,
    scene.objetSymbolique,
    scene.emotionSousJacente,
    scene.memoireCorporelle,
    ...(scene.motifs || []),
    ...(scene.tagsNarratifs || []),
  ]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("\n");

  return {
    id: `scene:${scene.id}`,
    type: "scene",
    label: scene.titre,
    text,
    tomeId: scene.tomeId ?? scene.tome,
    chapterIndex: scene.chapitre,
    chapterId: scene.chapitreId || createChapitreId(scene.tomeId ?? scene.tome, scene.chapitre),
    motifs: Array.from(new Set([...(scene.motifs || []), ...(scene.tagsNarratifs || []), ...detectFromLexicon(text, MOTIF_VARIANTS)])).filter(Boolean),
    emotions: Array.from(new Set([scene.emotionSousJacente || "", ...detectFromLexicon(text, EMOTION_VARIANTS)])).filter(Boolean),
    period: scene.periode || null,
  };
}

function memoireEntity(memoire: MemoireNarrative): NarrativeEntity {
  const text = [memoire.titre, memoire.texte, ...(memoire.motifs || [])]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("\n");

  return {
    id: `memoire:${memoire.id}`,
    type: "fragment",
    label: memoire.titre,
    text,
    tomeId: memoire.tomeProbable ?? null,
    chapterIndex: memoire.chapitreProbable ?? null,
    chapterId:
      memoire.tomeProbable && memoire.chapitreProbable
        ? createChapitreId(memoire.tomeProbable, memoire.chapitreProbable)
        : undefined,
    motifs: Array.from(new Set([...(memoire.motifs || []), ...detectFromLexicon(text, MOTIF_VARIANTS)])).filter(Boolean),
    emotions: detectFromLexicon(text, EMOTION_VARIANTS),
    period: memoire.periode,
  };
}

export function collectNarrativeEntities(): NarrativeEntity[] {
  if (typeof window === "undefined") return [];

  const fragments = lireFragments().map(fragmentEntity);
  const memoires = lireMemoiresNarratives()
    .filter((memoire) => memoire.statut !== "archive")
    .map(memoireEntity);
  const scenes = lireScenesRelationnelles().map(sceneEntity);
  const tome1Chapters = lireChapitresTome1DepuisStorage()
    .filter((chapter) => chapter.contenu.trim() || chapter.titre.trim())
    .map(chapterEntityFromTome1);
  const tomes = lireTomes();
  const chaptersByTome = lireChapitres();
  const structureChapters = tomes.flatMap((tome) =>
    (chaptersByTome[tome.id] || CHAPITRES_DEFAUT[tome.id] || [])
      .map((chapterTitle, index) => chapterEntityFromStructure(tome, chapterTitle, index))
      .filter((chapter) => chapter.text.trim() && !tome1Chapters.some((item) => item.id === chapter.id)),
  );

  return [...tome1Chapters, ...structureChapters, ...fragments, ...memoires, ...scenes];
}

function connectByList(
  entities: NarrativeEntity[],
  relationType: NarrativeRelation["relationType"],
  values: (entity: NarrativeEntity) => string[],
  baseStrength: number,
) {
  const relations: Array<NarrativeRelation | null> = [];

  entities.forEach((source, sourceIndex) => {
    entities.slice(sourceIndex + 1).forEach((target) => {
      const shared = values(source).filter((value) => values(target).includes(value));
      shared.forEach((value) => {
        relations.push(createRelation(source.id, target.id, relationType, baseStrength + Math.min(shared.length, 3) * 0.08, value));
      });
    });
  });

  return relations;
}

export function genererRelationsNarratives(entities = collectNarrativeEntities()): NarrativeRelation[] {
  const relations: Array<NarrativeRelation | null> = [];

  relations.push(...connectByList(entities, "motif", (entity) => entity.motifs, 0.55));
  relations.push(...connectByList(entities, "emotion", (entity) => entity.emotions, 0.58));
  relations.push(...connectByList(entities, "memory", (entity) => (entity.period ? [entity.period] : []), 0.48));
  relations.push(...connectByList(entities, "body-pattern", (entity) => detectFromLexicon(entity.text, BODY_PATTERN_VARIANTS), 0.62));

  entities.forEach((source, sourceIndex) => {
    entities.slice(sourceIndex + 1).forEach((target) => {
      if (source.chapterId && source.chapterId === target.chapterId) {
        relations.push(createRelation(source.id, target.id, "continuity", 0.82, source.chapterId));
      } else if (source.tomeId && target.tomeId && source.tomeId === target.tomeId && source.chapterIndex && target.chapterIndex) {
        const distance = Math.abs(source.chapterIndex - target.chapterIndex);
        if (distance > 0 && distance <= 1) relations.push(createRelation(source.id, target.id, "continuity", 0.5, `near-${source.tomeId}-${distance}`));
      }

      const overlap = getOverlapScore(source.text, target.text);
      if (overlap >= 0.18) {
        relations.push(createRelation(source.id, target.id, "echo", 0.35 + overlap, `overlap-${Math.round(overlap * 100)}`));
      }
    });
  });

  return uniqueRelations(relations);
}

export function genererRelationsNarrativesDeBase(): NarrativeRelation[] {
  if (typeof window === "undefined") return [];

  const relations: Array<NarrativeRelation | null> = [];
  const chapters = lireChapitresTome1DepuisStorage().map((chapter) => ({
    id: createChapitreId(1, getNumeroChapitreTome1(chapter.id)),
    numero: getNumeroChapitreTome1(chapter.id),
    motifs: detectFromLexicon(
      [chapter.titre, chapter.description, chapter.imageCentrale, chapter.fonctionNarrative, chapter.periode]
        .filter(Boolean)
        .join("\n"),
      MOTIF_VARIANTS,
    ),
  }));

  lireFragments().forEach((fragment) => {
    const fragmentId = `fragment:${String(fragment.id)}`;
    const directChapterId = fragment.chapitreId || createChapitreId(fragment.tomeId, fragment.chapitre || null);

    if (directChapterId) {
      relations.push(
        createRelation(
          fragmentId,
          directChapterId,
          "explicit-link",
          0.68,
          "fragment-chapitre",
          "fragment",
          "chapitre",
        ),
      );
    }

    const fragmentChapter = Number(fragment.chapitre);
    if (fragment.tomeId === 1 && Number.isFinite(fragmentChapter) && fragmentChapter > 0) {
      relations.push(
        createRelation(
          fragmentId,
          createChapitreId(1, fragmentChapter),
          "probable-chapter",
          0.52,
          "fragment-chapitre-probable",
          "fragment",
          "chapitre",
        ),
      );
    }

    const fragmentMotifs = new Set([...(fragment.tags || []), ...detectFromLexicon([fragment.titre, fragment.texte].join("\n"), MOTIF_VARIANTS)]);
    chapters.forEach((chapter) => {
      if (fragment.tomeId && fragment.tomeId !== 1) return;
      const shared = chapter.motifs.filter((motif) => fragmentMotifs.has(motif));
      if (shared.length > 0) {
        relations.push(
          createRelation(
            fragmentId,
            chapter.id,
            "motif-compatible",
            0.32,
            shared.slice(0, 2).join("-"),
            "fragment",
            "chapitre",
          ),
        );
      }
    });
  });

  lireMemoiresNarratives()
    .filter((memoire) => memoire.statut !== "archive")
    .forEach((memoire) => {
      const memoireId = `memoire:${memoire.id}`;
      if (memoire.tomeProbable && memoire.chapitreProbable) {
        relations.push(
          createRelation(
            memoireId,
            createChapitreId(memoire.tomeProbable, memoire.chapitreProbable),
            "probable-chapter",
            0.55,
            "memoire-chapitre-probable",
            "memoire",
            "chapitre",
          ),
        );
      }

      if (memoire.tomeProbable === 1) {
        const memoireMotifs = new Set([...(memoire.motifs || []), ...detectFromLexicon([memoire.titre, memoire.texte].join("\n"), MOTIF_VARIANTS)]);
        chapters.forEach((chapter) => {
          const shared = chapter.motifs.filter((motif) => memoireMotifs.has(motif));
          if (shared.length > 0) {
            relations.push(
              createRelation(
                memoireId,
                chapter.id,
                "motif-compatible",
                0.34,
                shared.slice(0, 2).join("-"),
                "memoire",
                "chapitre",
              ),
            );
          }
        });
      }
    });

  return uniqueRelations(relations);
}

export function lireNarrativeRelationsAvecAutomatiques() {
  return uniqueRelations([...lireRelationsNarratives(), ...genererRelationsNarrativesDeBase()]);
}

export function detecterMotifsRecurrents(entities: NarrativeEntity[]): RecurringMotif[] {
  const motifMap = new Map<string, Set<string>>();

  entities.forEach((entity) => {
    entity.motifs.forEach((motif) => {
      const current = motifMap.get(motif) || new Set<string>();
      current.add(entity.id);
      motifMap.set(motif, current);
    });
  });

  return Array.from(motifMap.entries())
    .map(([motif, ids]) => ({ motif, count: ids.size, entityIds: Array.from(ids) }))
    .filter((motif) => motif.count >= 2)
    .sort((a, b) => b.count - a.count || a.motif.localeCompare(b.motif));
}

export function detecterLiensEmotionnelsEntreChapitres(entities: NarrativeEntity[]): EmotionalChapterLink[] {
  const chapters = entities.filter((entity) => entity.type === "chapter");

  return chapters.flatMap((chapter) =>
    chapter.emotions.map((emotion) => ({
      chapterId: chapter.id,
      chapterLabel: chapter.label,
      emotion,
      relatedEntityIds: entities
        .filter((entity) => entity.id !== chapter.id && entity.emotions.includes(emotion))
        .map((entity) => entity.id)
        .slice(0, 12),
    })),
  ).filter((link) => link.relatedEntityIds.length > 0);
}

export function creerSnapshotRelationsNarratives(): NarrativeRelationsSnapshot {
  const entities = collectNarrativeEntities();
  const automaticRelations = genererRelationsNarratives(entities);
  const manualRelations = lireRelationsNarratives();
  const relations = uniqueRelations([...manualRelations, ...automaticRelations]);

  return {
    entities,
    relations,
    recurringMotifs: detecterMotifsRecurrents(entities),
    emotionalChapterLinks: detecterLiensEmotionnelsEntreChapitres(entities),
  };
}

export function getRelationsForEntity(entityId: string, relations: NarrativeRelation[]) {
  return relations.filter((relation) => relation.sourceId === entityId || relation.targetId === entityId);
}

export function getRelatedEntityIds(entityId: string, relations: NarrativeRelation[]) {
  return Array.from(
    new Set(
      getRelationsForEntity(entityId, relations).map((relation) =>
        relation.sourceId === entityId ? relation.targetId : relation.sourceId,
      ),
    ),
  );
}

export function getFragmentIdsForScene(scene: Scene) {
  return normalizeIds(scene.fragmentIds);
}

export function getSceneIdsForFragment(fragment: Fragment) {
  return normalizeIds(fragment.sceneIds);
}

export function getLinkedFragments(scene: Scene, fragments: Fragment[]) {
  const fragmentIds = new Set(getFragmentIdsForScene(scene));
  return fragments.filter(
    (fragment) =>
      fragmentIds.has(String(fragment.id)) ||
      getSceneIdsForFragment(fragment).includes(scene.id),
  );
}

export function getLinkedScenes(fragment: Fragment, scenes: Scene[]) {
  const sceneIds = new Set(getSceneIdsForFragment(fragment));
  return scenes.filter(
    (scene) => sceneIds.has(scene.id) || getFragmentIdsForScene(scene).includes(String(fragment.id)),
  );
}

export function collectMotifs(scene: Scene, fragments: Fragment[]) {
  return Array.from(
    new Set([
      ...(scene.motifs || []),
      ...(scene.tagsNarratifs || []),
      ...fragments.flatMap((fragment) => fragment.tags || []),
    ]),
  ).filter(Boolean);
}

export function getChapterNarrativeStats(params: {
  tomeId: number;
  chapitre: number | string;
  scenes: Scene[];
  fragments: Fragment[];
}): ChapterNarrativeStats {
  const { tomeId, chapitre, scenes, fragments } = params;
  const chapitreId = createChapitreId(tomeId, chapitre);
  const chapitreText = String(chapitre);
  const chapterIds = new Set([chapitreId]);
  const relations = lireNarrativeRelationsAvecAutomatiques();
  const scenesLiees = scenes.filter(
    (scene) =>
      scene.chapitreId === chapitreId ||
      (Number(scene.tome || scene.tomeId) === tomeId && String(scene.chapitre) === chapitreText),
  );
  const sceneIds = new Set(scenesLiees.map((scene) => scene.id));
  const fragmentsLiees = fragments.filter(
    (fragment) => {
      const fragmentIds = getFragmentRelationIds(fragment);
      return (
        fragment.chapitreId === chapitreId ||
        (fragment.tomeId === tomeId && fragment.chapitre === chapitreText) ||
        getSceneIdsForFragment(fragment).some((sceneId) => sceneIds.has(sceneId)) ||
        relations.some((relation) => relationLinksEntityToChapter(relation, fragmentIds, chapterIds))
      );
    },
  );
  const memoiresLiees = lireMemoiresNarratives().filter((memoire) => {
    if (memoire.statut === "archive") return false;
    const memoireIds = getMemoireRelationIds(memoire);
    return (
      (memoire.tomeProbable === tomeId && String(memoire.chapitreProbable || "") === chapitreText) ||
      relations.some((relation) => relationLinksEntityToChapter(relation, memoireIds, chapterIds))
    );
  });
  const intensites = scenesLiees
    .map((scene) => Number(scene.intensite))
    .filter((intensite) => Number.isFinite(intensite) && intensite > 0);
  const averageIntensity = intensites.length
    ? intensites.reduce((sum, value) => sum + value, 0) / intensites.length
    : 0;

  return {
    sceneCount: scenesLiees.length,
    fragmentCount: fragmentsLiees.length,
    memoireCount: memoiresLiees.length,
    averageIntensity,
    hasRespiration: scenesLiees.some((scene) => scene.typeScene === "respiration"),
    hasPivot: scenesLiees.some((scene) => scene.typeScene === "pivot"),
    hasTrauma: scenesLiees.some((scene) => scene.typeScene === "trauma"),
    motifs: fragmentsLiees
      .flatMap((fragment) => fragment.tags || [])
      .concat(scenesLiees.flatMap((scene) => scene.motifs || []))
      .filter((motif, index, all) => all.indexOf(motif) === index)
      .slice(0, 6),
  };
}
