import type {
  CriticalSafetyAssessment,
  CurrentAssessmentRef,
  LegacyScoreSnapshot,
  NeedStatement,
  RelationDossier,
  RelationStatus,
  RelationType,
  ScoreAssessment,
} from "./types";
import { isPrimaryParticipantValid } from "./types";

// Phase 3 d'IMP-001 (SR-D-001, Décision 4 §3 et §6 « Migration des valeurs
// existantes ») — adaptateur EN LECTURE SEULE des dossiers relationnels
// stockés sous l'ancienne structure vers une représentation canonique en
// mémoire. Aucune fonction de ce fichier n'écrit dans localStorage, ne
// modifie une donnée source, ne supprime une ancienne définition locale, ni
// ne branche un écran. Aucune migration n'est lancée.

// Clé historique — NE JAMAIS MODIFIER (déjà documentée dans types.ts).
// Ce fichier ne fait que la LIRE, jamais l'écrire.
export const LEGACY_DOSSIER_STORAGE_KEY = "autre-rive-dossiers";

// -----------------------------------------------
// Forme brute observée dans localStorage["autre-rive-dossiers"]
// -----------------------------------------------
//
// Quatre définitions locales distinctes (app/autre-rive/dossiers/page.tsx,
// app/autre-rive/dossiers/[id]/dossier-data.ts, app/autre-rive/analyse-
// conversation/page.tsx, app/autre-rive/page.tsx) lisent et écrivent la même
// clé, avec des sous-ensembles de champs différents (voir l'audit IMP-001).
// Ce type décrit fidèlement l'union de ce qui peut exister dans la donnée
// réelle, sans en garantir la présence : tout est optionnel et non validé
// (`unknown`), lu défensivement champ par champ ci-dessous.
export interface LegacyRelationDossierRecord {
  id?: unknown;
  nom?: unknown;
  statut?: unknown;
  typeRelation?: unknown;
  dateCreation?: unknown;
  derniereInteraction?: unknown;
  notes?: unknown;
  tags?: unknown;
  conversations?: unknown;
  journal?: unknown;
  energieEmotionnelle?: unknown;
  niveauClarte?: unknown;
  niveauReciprocite?: unknown;
  niveauSecurite?: unknown;
  [key: string]: unknown;
}

// -----------------------------------------------
// Résultat de l'adaptation
// -----------------------------------------------

export interface LegacyAdaptationBlocker {
  field: "participantIds" | "primaryUserParticipantId" | "relationType" | "status";
  reason: string;
}

// Ce que l'adaptateur PEUT reconstruire fidèlement. relationType, status,
// participantIds et primaryUserParticipantId sont volontairement absents de
// ce type : SR-D-001 et la clarification de gouvernance ne définissent
// aucune correspondance entre les valeurs libres du legacy (ex. typeRelation:
// "Coparentalite", statut: "Rupture") et les unions canoniques fermées, et
// aucune structure de participants n'existe dans le legacy. Les inventer
// serait fabriquer une donnée absente — voir `blockers`. Un RelationDossier
// complet ne peut donc pas être produit par cette phase (Phase 4 statuera).
export type AdaptedCanonicalFields = Omit<
  RelationDossier,
  "participantIds" | "primaryUserParticipantId" | "relationType" | "status"
>;

export interface LegacyDossierAdaptation {
  // Vide lorsque le dossier source n'a pas d'identifiant string exploitable
  // (voir `readPartiallyAdaptedLegacyRelationDossiers`, qui filtre ce cas plutôt que
  // d'inventer un identifiant).
  sourceId: string;
  canonicalFields: AdaptedCanonicalFields;
  blockers: LegacyAdaptationBlocker[];
}

const BLOCKERS: LegacyAdaptationBlocker[] = [
  {
    field: "relationType",
    reason:
      'Le legacy stocke "typeRelation" en texte libre (ex. "Romantique", "Coparentalite", parfois absent), sans correspondance définie vers les cinq valeurs canoniques (romantic | family | friendship | professional | other). Certains libellés existants (ex. "Coparentalite") ne correspondent à aucune valeur canonique de façon non ambiguë.',
  },
  {
    field: "status",
    reason:
      'Le legacy stocke "statut" en texte libre (ex. "Rencontre", "Dating", "Rupture"), sans correspondance définie vers les trois valeurs canoniques (active | paused | ended). Plusieurs libellés existants ne correspondent à aucune valeur canonique de façon non ambiguë (ex. "Dating" et "Relation" pourraient tous deux être "active", ce qui effacerait une distinction que l\'utilisatrice maintient aujourd\'hui).',
  },
  {
    field: "participantIds",
    reason:
      "Aucune structure de participants (personnes, rôles, identifiants) n'existe dans les dossiers legacy. Le domaine Relation ne modélise pas encore les personnes comme entités séparées : il n'y a rien à lire, et en inventer un serait fabriquer une donnée absente.",
  },
  {
    field: "primaryUserParticipantId",
    reason: "Dépend de participantIds (voir ci-dessus), lui-même absent du legacy.",
  },
];

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readIdsFromRecordArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  for (const entry of value) {
    if (entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string") {
      ids.push((entry as { id: string }).id);
    }
  }
  return ids;
}

const LEGACY_SCORE_FIELDS = [
  "niveauClarte",
  "niveauReciprocite",
  "niveauSecurite",
  "energieEmotionnelle",
] as const;

function buildLegacyScoreSnapshots(
  record: LegacyRelationDossierRecord,
  sourceId: string,
  importedAt: string,
): LegacyScoreSnapshot[] {
  const snapshots: LegacyScoreSnapshot[] = [];

  for (const metricKey of LEGACY_SCORE_FIELDS) {
    const rawValue = record[metricKey];
    if (typeof rawValue !== "number" || Number.isNaN(rawValue)) continue;

    snapshots.push({
      // Identifiant déterministe (pas de hasard/horodatage dans l'id) :
      // reproductible pour un même dossier et un même champ, sans inventer
      // d'identité indépendante de la donnée source.
      id: `legacy-score-${sourceId}-${metricKey}`,
      metricKey,
      rawValue,
      // rawScale volontairement omis : SR-D-001 interdit toute déduction
      // silencieuse de l'échelle (§5). L'échelle réelle (1-10 ou 0-100) de
      // cette valeur historique n'est pas connue.
      originalField: metricKey,
      importedAt,
      provenance: "legacy_unknown",
      migrationStatus: "pending_review",
    });
  }

  return snapshots;
}

export interface AdaptLegacyRelationDossierOptions {
  // Horodatage du traitement d'adaptation lui-même (métadonnée technique,
  // pas une donnée métier reconstruite). Paramétrable pour des tests
  // déterministes ; par défaut, l'heure réelle.
  now?: () => string;
}

// Adapte UN enregistrement legacy. Fonction pure, lecture seule : ne touche
// à aucun stockage. Exportée séparément de la lecture de localStorage pour
// rester testable sans dépendance à window/localStorage.
export function adaptLegacyRelationDossierPartially(
  record: LegacyRelationDossierRecord,
  options: AdaptLegacyRelationDossierOptions = {},
): LegacyDossierAdaptation {
  const now = options.now ?? (() => new Date().toISOString());
  const nowValue = now();

  const id = readString(record.id) ?? "";
  const name = readString(record.nom) ?? "";
  const dateCreation = readString(record.dateCreation) ?? "";
  const derniereInteraction = readString(record.derniereInteraction);

  const legacyScoreSnapshots = buildLegacyScoreSnapshots(record, id, nowValue);

  const canonicalFields: AdaptedCanonicalFields = {
    id,
    name,

    // Besoins évolutifs : aucune donnée historique de besoins n'existe dans
    // le legacy (SR-D-001 ne définit ce concept qu'à partir de la Décision 4
    // elle-même). Reste vide, comme prévu explicitement pour ce cas.
    needs: [] as NeedStatement[],

    // Aucune promotion automatique d'un ancien score en évaluation : reste
    // vide, uniquement les LegacyScoreSnapshot sont produits ci-dessous.
    assessments: [] as ScoreAssessment[],
    currentAssessmentRefs: [] as CurrentAssessmentRef[],

    // Un nombre brut (niveauSecurite) ne permet pas de construire un
    // CriticalSafetyAssessment valide (niveau qualitatif, preuves, motif) :
    // reste vide. niveauSecurite est préservé fidèlement via
    // legacyScoreSnapshots ci-dessous, jamais perdu.
    safetyAssessments: [] as CriticalSafetyAssessment[],

    contestationIds: [],

    conversationIds: readIdsFromRecordArray(record.conversations),
    eventIds: [],
    evidenceIds: [],
    journalEntryIds: readIdsFromRecordArray(record.journal),

    notes: readString(record.notes) ?? "",
    tags: readStringArray(record.tags),

    legacyScoreSnapshots,

    // Convention technique de versionnage (pas une donnée métier
    // reconstruite) : 0 désigne un enregistrement issu du legacy, jamais
    // versionné. Documenté ici pour validation, pas choisi silencieusement.
    schemaVersion: 0,

    createdAt: dateCreation,
    // derniereInteraction est la meilleure approximation directe de
    // "dernière modification" déjà présente dans le legacy ; à défaut, un
    // dossier jamais ré-interagi n'a pas d'autre date de mise à jour connue
    // que sa création — ce n'est pas une valeur inventée, c'est la seule
    // valeur véridique disponible dans les deux cas.
    updatedAt: derniereInteraction ?? dateCreation,
  };

  return {
    sourceId: id,
    canonicalFields,
    blockers: BLOCKERS,
  };
}

// Lit tous les dossiers stockés sous l'ancienne clé et produit leur
// adaptation. Lecture seule stricte (getItem uniquement, jamais setItem/
// removeItem). Les enregistrements sans identifiant ou sans nom exploitables
// sont exclus plutôt que traités avec une identité inventée.
export function readPartiallyAdaptedLegacyRelationDossiers(
  options: AdaptLegacyRelationDossierOptions = {},
): LegacyDossierAdaptation[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];

    const adaptations: LegacyDossierAdaptation[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;

      const record = entry as LegacyRelationDossierRecord;
      if (typeof record.id !== "string" || typeof record.nom !== "string") continue;

      adaptations.push(adaptLegacyRelationDossierPartially(record, options));
    }

    return adaptations;
  } catch {
    return [];
  }
}

// -----------------------------------------------
// Finalisation — confirmation humaine explicite (Phase 4 d'IMP-001)
// -----------------------------------------------
//
// Règle de gouvernance validée avant la Phase 4 : relationType, status,
// participantIds et primaryUserParticipantId ne sont jamais déduits,
// inventés ni remplis par défaut. Ils doivent être confirmés ou saisis
// explicitement par l'utilisatrice avant qu'un dossier legacy puisse
// devenir un RelationDossier canonique.
//
// Ce module ne fournit AUCUN mécanisme pour construire ConfirmedLegacyIdentity
// automatiquement à partir de la donnée legacy — c'est le rôle de l'écran
// (Phase 4, bascule des écrans), qui doit recueillir ces quatre valeurs
// auprès de l'utilisatrice avant d'appeler finalizeLegacyMigration.
export interface ConfirmedLegacyIdentity {
  relationType: RelationType;
  status: RelationStatus;
  participantIds: string[];
  primaryUserParticipantId: string;
}

// Assemble un RelationDossier canonique complet à partir d'une adaptation
// partielle (Phase 3) et d'une identité confirmée explicitement par
// l'utilisatrice. C'est la SEULE fonction du module qui produit un
// RelationDossier valide à partir d'une donnée legacy : son paramètre
// `confirmed` est obligatoire et non déductible, ce qui rend impossible
// d'appeler saveRelationDossiers()/addOrUpdateRelationDossier() (voir
// storage.ts) avec un dossier issu du legacy sans être passé par cette
// confirmation. N'écrit rien : l'appelant (l'écran) reste responsable de
// l'appel à addOrUpdateRelationDossier() après finalisation.
export function finalizeLegacyMigration(
  adaptation: LegacyDossierAdaptation,
  confirmed: ConfirmedLegacyIdentity,
): RelationDossier {
  // Phase 4bis : le système de types garantit déjà que relationType et status
  // sont des valeurs canoniques non vides (unions littérales — une chaîne
  // vide n'y est structurellement pas assignable). participantIds et
  // primaryUserParticipantId sont typés string / string[], donc une valeur
  // vide y est techniquement assignable : ces deux cas sont donc vérifiés
  // explicitement ici, en plus du contrôle d'appartenance déjà en place.
  if (confirmed.participantIds.length === 0) {
    throw new Error(
      "participantIds ne peut pas être vide : au moins un participant doit être confirmé (SR-D-001, Décision 4).",
    );
  }

  if (!confirmed.primaryUserParticipantId.trim()) {
    throw new Error("primaryUserParticipantId est obligatoire (SR-D-001, Décision 4).");
  }

  const dossier: RelationDossier = {
    ...adaptation.canonicalFields,
    ...confirmed,
    // Un dossier finalisé n'est plus une adaptation partielle : schemaVersion
    // passe à 1 (première version réellement canonique). schemaVersion: 0
    // reste réservé aux fragments non finalisés (voir readPartiallyAdaptedLegacyRelationDossiers)
    // et ne doit jamais être écrit par cette fonction ni persisté tel quel.
    schemaVersion: 1,
  };

  if (!isPrimaryParticipantValid(dossier)) {
    throw new Error(
      "primaryUserParticipantId doit appartenir à participantIds (SR-D-001, Décision 4) — confirmation invalide.",
    );
  }

  return dossier;
}
