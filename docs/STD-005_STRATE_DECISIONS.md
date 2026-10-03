# STRATE_DECISIONS.md
### Registre des décisions d'architecture (ADR) — STRATE
Dernière mise à jour : 2026-10-01

> Chaque décision structurante est consignée ici, avec sa justification et son impact.
> Format standard pour chaque entrée :

```
ID :
Titre :
Date :
Statut : EN ATTENTE DE DÉCISION / CLÔTURÉE
Décision :
Justification :
Impact :
```

---

## Décisions actives — Domaine Relation (SR-D-001 / IMP-001)

Note sur les dates et la numérotation : les entrées ci-dessous consignent rétroactivement des décisions déjà validées et déjà exécutées, au fil des Phases 0 à 9E d'IMP-001 (le plan initial ne couvrait que les Phases 0 à 8 ; les sous-phases 4bis et 8bis.x, puis les Phases 9A à 9E, ont étendu ce plan sans jamais introduire de décision de gouvernance non validée par l'utilisatrice). La date « 2026-09-07 » est la date de consolidation dans ce registre, pas la date originale de chaque décision, qui n'a jamais été tracée au moment de son exécution (voir STD-008, dette documentaire). La numérotation IMP-001-Pxx est introduite ici pour donner un identifiant stable à chaque entrée, dans un espace de noms distinct d'ARCH-xxx et des tickets SR-D-00x du Backlog Développement (collision déjà signalée par IMP-001 §1.4) — proposition ouverte à renommage par la gouvernance documentaire.

---

**ID :** IMP-001-P0
**Titre :** Infrastructure de test (vitest)
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** Installation de vitest comme test runner du dépôt (compatible TypeScript strict, ESM, Next.js 16) ; ajout du script `npm test`.
**Justification :** SR-D-001 Décision 6 rend les tests obligatoires dès le premier livrable du domaine Relation ; aucun outil de test n'existait dans le dépôt.
**Impact :** Premier outillage de test de l'ensemble du dépôt mon-app, pas seulement du domaine Relation.

---

**ID :** IMP-001-P1
**Titre :** Frontière publique du module autre-rive
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** Création de `lib/autre-rive/index.ts` comme point d'entrée public unique. Règle ESLint `no-restricted-imports` interdisant tout import direct vers `lib/autre-rive/*` en dehors de `index.ts`.
**Justification :** SR-D-001 Décision 1, Règles 1 et 3.
**Impact :** Tout import externe vers le domaine Relation passe désormais par `@/lib/autre-rive` ; vérifié automatiquement par le lint.

---

**ID :** IMP-001-P2
**Titre :** Type RelationDossier canonique (structure, non branché)
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** Ajout dans `lib/autre-rive/types.ts` des types de la Décision 4 (`NeedStatement`, `ScoreValue`, `ScoreAssessment`, `CurrentAssessmentRef`, `LegacyScoreSnapshot`, `RelationDossier`), à l'identique de la structure recommandée par SR-D-001.
**Justification :** SR-D-001 Décision 4.
**Impact :** Aucun impact runtime à cette étape — les types n'étaient consommés par aucun écran.

---

**ID :** IMP-001-P3
**Titre :** Adaptateur de lecture legacy → canonique
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/legacy-adapter.ts`, strictement en lecture seule, produit un `RelationDossier` partiel à partir de la clé legacy `autre-rive-dossiers`, sans écrire dans le stockage ni convertir automatiquement les anciens scores plats.
**Justification :** SR-D-001 Décision 4 §3 et Décision 2 §4-6.
**Impact :** Aucune modification du stockage réel à cette étape.

---

**ID :** IMP-001-P4
**Titre :** Bascule des écrans vers le stockage canonique et renommage des définitions locales
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** Ajout de `readRelationDossiers` / `addOrUpdateRelationDossier` dans `storage.ts`. Les quatre anciennes définitions locales concurrentes de `RelationDossier` (`dossiers/page.tsx`, `dossiers/[id]/dossier-data.ts`, `analyse-conversation/page.tsx`, `page.tsx`) sont renommées (`LegacyDossierDetailData`, `StoredDossier`, etc. — jamais conservées sous le nom `RelationDossier`), pas supprimées : la donnée legacy elle-même continue d'exister tant qu'un dossier n'a pas été migré explicitement (voir IMP-001-P4bis).
**Justification :** SR-D-001 Décision 4.2 (« les quatre anciennes définitions sont supprimées » — lu comme : les définitions concurrentes du type `RelationDossier`, pas la donnée legacy elle-même, dont la suppression serait destructive et contraire à la Décision 4.3).
**Impact :** *Coexistence fonctionnelle voulue* entre écrans lisant `LegacyDossierDetailData` et le `RelationDossier` canonique tant qu'un dossier n'est pas migré (voir IMP-001-P4bis) — ce n'est pas une dette. Une *coexistence technique résiduelle* distincte existe par ailleurs, y compris pour des dossiers déjà migrés : voir STD-008 pour la dette réelle correspondante (branchement final du pipeline canonique dans les écrans).

---

**ID :** IMP-001-P4bis
**Titre :** Confirmation minimale d'identité — seul chemin de migration
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/participant-identity.ts` + `finalizeLegacyMigration` (`legacy-adapter.ts`) + `DossierMigrationPanel` : un dossier legacy ne devient `RelationDossier` canonique qu'après confirmation humaine explicite de `relationType`, `status`, `participantIds` et `primaryUserParticipantId` — jamais déduits, jamais remplis par défaut.
**Justification :** SR-D-001 Décision 2 §5 (interdiction de migration par déduction silencieuse) et Décision 4.3 (migration explicite et non destructive).
**Impact :** `DossierMigrationPanel` est le seul chemin de migration ; un dossier non confirmé reste legacy indéfiniment — c'est la *coexistence fonctionnelle voulue* (terme introduit rétroactivement en IMP-001-P4 et dans STD-008 pour la distinguer explicitement de la *coexistence technique résiduelle*, qui elle est une dette), pas une dette.

---

**ID :** IMP-001-P5
**Titre :** Scores et réconciliation manuel / IA (moteur + rattachement produit)
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/assessment.ts` : `ScoreAssessment`, `CurrentAssessmentRef`, seuil de désaccord signalé à 20 points (`DEFAULT_DISAGREEMENT_THRESHOLD`, configurable et documenté comme décision de gouvernance). Rattachement produit : scores IA via `ai-score-sync.ts` (sous-phase 8bis.3, `methodologyVersion` et `evidenceIds` tracés, `confidence` jamais renseignée faute de méthode réelle), scores manuels via `manual-score-sync.ts` (sous-phase 8bis.5).
**Justification :** SR-D-001 Décision 3.
**Impact :** Les scores manuels et IA deviennent des évaluations tracées, non destructives, jamais consolidées automatiquement (`DerivedScore` volontairement absent, aucune politique de pondération robuste n'existant — Décision 3 §7-8).

---

**ID :** IMP-001-P6
**Titre :** RapportAnalyse canonique — moteur d'immuabilité
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/rapport-analyse.ts` : stockage append-only, `addCanonicalRapportAnalyse` refuse tout id déjà existant. L'ancien type `RapportAnalyse` est renommé `LegacyRapportAnalyse`, conservé sans conversion forcée ni suppression.
**Justification :** SR-D-001 Décision 5.
**Impact :** Le moteur d'immuabilité est prêt et testé ; la production du contenu analytique réel est traitée séparément en IMP-001-P9E (dette).

---

**ID :** IMP-001-P7
**Titre :** Sécurité critique — moteur
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/critical-safety.ts` : `CriticalSafetyAssessment` historisé (jamais un champ mutable unique), déclenchement d'une nouvelle évaluation et d'une réanalyse sur événement DÉJÀ qualifié critique, sans remplacer automatiquement le rapport ou l'évaluation courante.
**Justification :** SR-D-001 Décision 4 (Exception de sécurité) + Décision 6 item 6.
**Impact :** Moteur prêt, non branché à un écran à cette étape (voir IMP-001-P9A).

---

**ID :** IMP-001-P8
**Titre :** Nettoyage final et vérification d'extractibilité
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE (avec une réserve documentaire mineure)
**Décision :** Suppression des résidus de débogage (`zzdebug.test.ts` renommé `index.test.ts`) ; vérification des 6 critères d'extractibilité de la Décision 1.
**Justification :** SR-D-001 Décision 1 (critère d'extractibilité vérifiable).
**Impact :** 5 des 6 critères vérifiés et satisfaits (point d'entrée unique, types centralisés, zéro import interne externe, zéro dépendance vers `app/`, tests sur les règles métier essentielles). Le 6e critère (liste explicite des dépendances externes) n'a jamais été rédigé formellement — bien que trivial : `lib/autre-rive` n'a aujourd'hui aucune dépendance externe (vérifié). Voir STD-008.

---

**ID :** IMP-001-P8bis.2
**Titre :** Cycle de vie des besoins — moteur
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/needs.ts` : `createExpressedNeed` / `createObservedNeed` / `confirmNeed` / `correctNeed` / `rejectNeed`. Toute confirmation, correction ou rejet crée une nouvelle entrée liée par `supersedesNeedId`, sans jamais muter l'entrée précédente. Clarification de gouvernance : « NeedValidation » (SR-D-001 Décision 6, item Besoins) n'est pas une entité stockée séparément mais le nom du mécanisme confirm/correct/reject ; `supersedesNeedId` est ajouté par stricte analogie avec `ScoreAssessment.supersedesAssessmentId`, déjà défini par SR-D-001 Décision 3 §2.
**Justification :** SR-D-001 Décision 4 §1 + Décision 6 item 2.
**Impact :** Moteur prêt, non branché à un écran à cette étape (voir IMP-001-P9D).

---

**ID :** IMP-001-P8bis.3
**Titre :** Rattachement des scores IA au dossier canonique
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `app/autre-rive/analyse-conversation/ai-score-sync.ts` : les scores `clarteScore` / `reciprociteScore` / `securiteScore` de l'analyse IA deviennent des `ScoreAssessment` de source `"ai"`.
**Justification :** SR-D-001 Décision 3 §2 et §9 (traçabilité de l'IA).
**Impact :** Les scores IA ne restent plus isolés dans `AnalyseConversation.analyseIA`.

---

**ID :** IMP-001-P8bis.3b
**Titre :** `parseScore` ne devine jamais une valeur
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `app/autre-rive/analyse-conversation/ia-parsing.ts` : `parseScore` retourne `null` (jamais `0` ni `50`) quand la balise de score est absente ou non numérique dans la sortie IA.
**Justification :** SR-D-001, Extension validée (« Si les informations sont insuffisantes, STRATE l'indique clairement plutôt que de produire une conclusion artificielle ») + Décision 2 (aucune conversion silencieuse).
**Impact :** Un score manquant reste structurellement absent (`null`) plutôt que remplacé par une valeur médiane inventée.

---

**ID :** IMP-001-P8bis.4b
**Titre :** Renommage du type local de détail de dossier
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `app/autre-rive/dossiers/[id]/dossier-data.ts` : l'ancien type local `RelationDossier` est renommé `LegacyDossierDetailData` (aucun champ ajouté, retiré ou modifié).
**Justification :** SR-D-001 Décision 1 (propriété stricte des types métier) et Décision 4.2.
**Impact :** Zéro définition locale nommée `RelationDossier` ne subsiste dans `app/` (vérifié par test statique dans `dossier-data.test.ts`).

---

**ID :** IMP-001-P8bis.5
**Titre :** Rattachement des scores manuels au dossier canonique
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `app/autre-rive/dossiers/[id]/manual-score-sync.ts` : les curseurs de score manuels de l'écran dossier deviennent des `ScoreAssessment` de source `"manual"`.
**Justification :** SR-D-001 Décision 3 §2.
**Impact :** Les scores manuels rejoignent le même modèle d'évaluation tracée que les scores IA.

---

**ID :** IMP-001-P9A
**Titre :** Intégration produit de la sécurité critique
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `critical-safety-sync.ts` + `critical-safety-panel.tsx` : signalement explicite d'un événement critique (participants sélectionnés explicitement à l'écran, jamais déduits automatiquement de `dossier.participantIds`), désignation explicite de l'évaluation de sécurité courante.
**Justification :** SR-D-001 Décision 4 (Exception de sécurité) + Décision 3 (pointeur explicite, par analogie).
**Impact :** Premier écran canonique branché sur le moteur de sécurité.

---

**ID :** IMP-001-P9B
**Titre :** Intégration produit du désaccord manuel/IA + correction du critère de départage
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `assessment-disagreement-view.ts` + panel : affichage du désaccord ≥ 20 points, jamais de résolution automatique. Correction de gouvernance apportée après revue : en cas d'égalité exacte de `createdAt` entre deux évaluations de même source, le départage utilise l'ordre lexical de `id` (jamais l'ordre d'insertion dans le tableau en mémoire), pour garantir un résultat reproductible et indépendant de l'ordre.
**Justification :** SR-D-001 Décision 3 §6 ; la correction était nécessaire parce que le critère initial (« premier rencontré ») dépendait de l'ordre du tableau, ce qui contredisait la propriété d'indépendance d'ordre revendiquée. `id` est le seul critère déjà disponible et stable sur `ScoreAssessment` en l'absence de tout critère métier supérieur prévu par SR-D-001.
**Impact :** Le signalement de désaccord est affiché à l'écran sans jamais suggérer qu'une évaluation est « plus vraie » qu'une autre ; ne crée, ne modifie et ne supprime jamais un `CurrentAssessmentRef`.

---

**ID :** IMP-001-P9C
**Titre :** Intégration produit des évaluations courantes
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `current-assessment-sync.ts` + panel : `CurrentAssessmentRef` n'est jamais déduit automatiquement (ni de la date, ni de la source, ni de la récence) — uniquement désigné par un clic explicite sur « Désigner comme courante ».
**Justification :** SR-D-001 Décision 3 §11.
**Impact :** Vérifié explicitement, par inspection directe du code (pas par supposition), que le badge « ★ courante » se met à jour immédiatement à l'écran sans reload, via une relecture synchrone après écriture.

---

**ID :** IMP-001-P9D
**Titre :** Intégration produit du cycle de vie des besoins
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** `needs-sync.ts` + panel : ajout d'un besoin exprimé (texte libre saisi par l'utilisatrice, jamais pré-rempli par l'IA), confirmation d'un besoin observé, correction et rejet — toujours par une nouvelle version historisée, jamais par mutation en place. Aucune donnée existante (notes, journal, red/green flags legacy) n'est convertie automatiquement en besoin canonique : inventaire préalable montrant qu'aucune ne le justifie structurellement.
**Justification :** SR-D-001 Décision 4 §1 + Décision 6 item 2.
**Impact :** Premier écran canonique de gestion des besoins ; aucune migration implicite du legacy vers un `NeedStatement`.

---

**ID :** IMP-001-P9E
**Titre :** Intégration produit du rapport d'analyse canonique + méthodologie de gouvernance (coverage / confidence / label)
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE (contrat de type et immuabilité) — contenu analytique en attente, voir STD-008
**Décision :** `rapport-analyse-sync.ts` + panel : génération d'un `RapportAnalyse` exclusivement par geste explicite (« Générer un rapport d'analyse »), jamais automatique (ni sur changement de score, de besoin, de sécurité, ni sur désaccord détecté). Trois méthodes de gouvernance validées, faute de règle de calcul explicite dans SR-D-001 pour ces trois champs pourtant obligatoires :
  - `CoverageSummary` : comptage brut (jamais un ratio ni un pourcentage) des identifiants réellement présents dans le dossier, avec seuils documentés dans le code (`0→insuffisante`, `1-2→faible`, `3-9→partielle`, `10-29→bonne`, `30+→tres_bonne`) ;
  - `overallConfidence` : minimum des `confidence` si des conclusions structurées existent (jamais une moyenne), sinon sentinelle documentée (`0`, `NO_CONCLUSION_CONFIDENCE_SENTINEL`) tant qu'aucune conclusion n'existe ;
  - `overallConclusionLabel` : `"donnees_insuffisantes"` tant qu'aucune conclusion structurée n'existe (sens officiel : « aucune conclusion n'a encore été produite », jamais un jugement négatif sur la relation — règle d'affichage obligatoire ajoutée en écran), sinon le pire cas parmi les conclusions présentes, sans hiérarchie entre dimensions (Clarté/Réciprocité/Sécurité), sans moyenne, sans pondération.
**Justification :** SR-D-001 Décision 5 rend ces trois champs obligatoires sans en définir la méthode de calcul. Aucune des méthodes retenues n'a été présentée comme « la seule possible » — un document de préparation de gouvernance présentant plusieurs méthodes défendables par champ, avec leurs compromis, a précédé la validation explicite de l'utilisatrice.
**Impact :** `observations`, `hypotheses`, `conclusions` et `flags` restent des tableaux vides dans tout rapport généré aujourd'hui, faute de source honnête (aucun pipeline du produit ne produit ces structures) — voir STD-008 pour la dette correspondante (moteur analytique, périmètre distinct : SR-ENGINE-001). Décision de périmètre prise pendant cette même phase : `EvidenceAvailability` (SR-D-001 Décision 5, type documenté comme hors du rapport, calculé dynamiquement) n'est pas implémenté à cette étape — voir STD-008.

---

**ID :** IMP-001-CONV1
**Titre :** Convention d'attribution d'acteur par défaut — littéral `"utilisatrice"`
**Date :** 2026-09-07 (consolidation rétroactive)
**Statut :** CLÔTURÉE
**Décision :** En l'absence de tout système d'identité utilisateur global dans le produit, les champs d'attribution d'acteur (`createdBy` dans `manual-score-sync.ts`, Phase 8bis.5, et `critical-safety-sync.ts`, Phase 9A ; `selectedBy` dans `current-assessment-sync.ts`, Phase 9C) prennent par défaut le littéral `"utilisatrice"`, jamais une identité fictive plus détaillée (pas de nom, pas d'identifiant inventé).
**Justification :** SR-D-001 n'impose pas de système d'identité utilisateur pour le domaine Relation et STRATE n'en possède pas aujourd'hui. Inventer un identifiant plus précis (nom, email, ID de session) constituerait une donnée fabriquée, contraire au principe de traçabilité honnête de SR-D-001 (Bloc 0, Principe Traçabilité ; Extension validée sur l'absence de conclusion artificielle). Le littéral `"utilisatrice"` documente explicitement cette absence plutôt que de la masquer.
**Impact :** Convention transversale, réutilisée à l'identique dans trois modules distincts (8bis.5, 9A, 9C) sans jamais être redéfinie indépendamment — cohérence vérifiée par grep. Ce n'est pas un simple détail d'implémentation : elle deviendra visible dans l'UI (auteur affiché d'une évaluation ou d'un signalement) et devra être révisée le jour où un système d'identité réel sera introduit dans STRATE (hors périmètre de SR-D-001). Numérotation `IMP-001-CONV1` introduite ici, dans un espace de noms distinct des phases `IMP-001-Pxx` puisqu'il ne s'agit pas d'une phase mais d'une convention transversale — proposition ouverte à renommage par la gouvernance documentaire, comme pour la numérotation `IMP-001-Pxx` elle-même.

---

**ID :** IMP-001-P9F
**Titre :** Écran de validation des données historiques — fermeture de la Décision 2 §6
**Date :** 2026-09-08
**Statut :** CLÔTURÉE
**Décision :** `lib/autre-rive/assessment.ts` (`suggestLikelyScale`, `createImportedScoreAssessment`, `confirmLegacyScoreSnapshot`, `excludeLegacyScoreSnapshot`) + `app/autre-rive/dossiers/[id]/legacy-score-validation-sync.ts` + `legacy-score-validation-panel.tsx` : implémente intégralement le processus de validation humaine décrit par SR-D-001 Décision 2 §6 pour chaque `LegacyScoreSnapshot`. Pour une valeur en attente (`migrationStatus: "pending_review"`) rattachée à une dimension canonique (`clarte`, `reciprocite`, `securite` — nomenclature et exclusion d'`energieEmotionnelle` reprises à l'identique de `manual-score-sync.ts`, Phase 8bis.5), l'écran affiche la valeur brute et une suggestion d'échelle purement informative (Décision 2 §5 : « valeur ≤ 10 → 1-10, valeur > 10 → 0-100 »), jamais appliquée automatiquement. L'utilisatrice choisit explicitement l'une de trois actions : confirmer comme 1–10, confirmer comme 0–100, ou exclure. Une confirmation crée un `ScoreAssessment` (source `imported`/`user_confirmed` — valeurs d'énumération définies dès l'origine dans `types.ts`, jamais utilisées avant cette phase) et fait passer `migrationStatus` à `"confirmed"`, en un seul mouvement atomique. Une exclusion fait passer `migrationStatus` à `"excluded"` sans jamais produire d'évaluation. Un snapshot déjà `confirmed` ou `excluded` ne peut pas être revalidé (garde ajoutée pour empêcher un double geste de produire une seconde évaluation à partir de la même valeur brute — non explicitement prévue par SR-D-001, mais nécessaire pour que « conserver une trace de cette validation » reste une trace unique et fiable).
**Justification :** SR-D-001 Décision 2 §6 définissait déjà intégralement ce processus (« voir la valeur originale ; voir l'échelle supposée ; confirmer ou corriger l'échelle ; identifier la source si connue ; produire la valeur normalisée ; conserver une trace de cette validation ») sans qu'aucun écran ne l'implémente avant cette phase — dette de priorité moyenne consignée dans STD-008 depuis l'audit du 2026-09-07, désormais résolue. Aucune décision de gouvernance nouvelle n'a été nécessaire : les valeurs d'énumération utilisées (`imported`, `user_confirmed`, `confirmed`, `excluded`) existaient déjà dans `types.ts` sans avoir jamais été consommées par du code.
**Impact :** La Décision 2 §6 de SR-D-001 est désormais intégralement implémentée. 20 nouveaux tests (suite domaine Relation : 399/399, contre 379 avant cette phase), `tsc --noEmit` clean, lint ciblé sans nouvelle erreur, lint global inchangé (184 problèmes / 144 erreurs / 40 avertissements). Voir STD-008 pour la mise à jour du statut de la dette correspondante.

---

## Décisions actives — Moteur canonique d'analyse et de raisonnement relationnel (SR-ENGINE-001)

Note d'ouverture de chantier (2026-09-11) : SR-ENGINE-001 nomme le chantier gouverné du moteur canonique d'analyse et de raisonnement relationnel de STRATE, déjà désigné sous ce nom dans l'Annexe Backlog Vision de SR-D-001 (« moteur détaillé de raisonnement (SR-ENGINE-001) », mécanisme explicitement reporté à une phase ultérieure) et dans STD-008 (dette de priorité haute : « RapportAnalyse sans moteur analytique »). SR-ENGINE-001 dépend du socle canonique défini par SR-D-001 (notamment `EvidenceReference`, `Observation`, `CompetingHypothesis`, `Conclusion`, `RapportAnalyse` — Décision 5, et `confidence` — Décision 3 §12) ; SR-D-001 ne dépend pas de SR-ENGINE-001 et reste fermé — aucune entrée ci-dessous ne réécrit son texte normatif. Chaque décision est une extension ou clarification de gouvernance additive, gouvernée sous SR-ENGINE-001, référençant explicitement le contrat SR-D-001 dont elle dépend — même principe que `NeedStatement.supersedesNeedId` (IMP-001-P8bis.2 ci-dessus) et qu'IMP-001-CONV1. Numérotation `SR-ENGINE-001-Dx`, dans un espace de noms distinct des `IMP-001-Pxx` (phases d'implémentation du domaine Relation) et des tickets `SR-D-0xx` du Backlog Développement.

---

**ID :** SR-ENGINE-001-D1
**Titre :** Chaîne de provenance des preuves (`EvidenceReference`)
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Extension conceptuelle figée de `EvidenceReference` (SR-D-001 Décision 5) par trois champs nouveaux : `declarant` (`participantId | "tiers" | "unknown"`), `reportedBy` (`participantId | "tiers" | "unknown" | "not_applicable"`), `acquisitionMode` (`"artefact_direct" | "temoignage_direct" | "rapporte" | "unknown"`).

`declarant` = source humaine originale de l'énoncé, du témoignage ou de l'observation. `reportedBy` = source humaine par laquelle l'information atteint STRATE lorsqu'une médiation humaine existe — jamais qui clique, qui importe, ou le propriétaire technique du compte. `acquisitionMode` = forme de transmission de l'information jusqu'à STRATE.

Invariants : `artefact_direct` ⇒ `reportedBy = "not_applicable"` ; `temoignage_direct` ⇒ `declarant == reportedBy` (source humaine identifiée) ; `rapporte` ⇒ médiation humaine explicite, aucune identité déduite automatiquement ; `unknown` ≠ `not_applicable` ; `declarant` et `reportedBy` ne valent jamais `"STRATE"` ; une sortie analytique STRATE (`Observation` / `CompetingHypothesis` / `Conclusion`) n'est jamais une `EvidenceReference` primaire, et aucune inférence STRATE ne peut devenir une preuve indépendante servant à se confirmer elle-même ; `sourceType` reste inchangé (`message | event | manual_entry | document`) sans valeur `unknown` ajoutée — l'incertitude de provenance se porte sur `declarant`/`reportedBy`/`acquisitionMode`, jamais sur `sourceType`. Explicitement hors périmètre de cette décision : sélection du corpus / caractère single-informant (hors `EvidenceReference`, à traiter au niveau rapport/couverture si besoin) ; frontière fait/interprétation (relève de `Observation`) ; transformations techniques des preuves (OCR, parsing, transcription, normalisation, résumé).
**Justification :** SR-D-001 Décision 5 définit `EvidenceReference` comme transcription littérale d'une structure de preuve sans jamais spécifier sa provenance ni son degré de médiation — lacune bloquante pour tout moteur devant distinguer un fait directement observé d'un fait rapporté de seconde main. Décision issue d'une revue de conception itérative ayant notamment corrigé une confusion initiale entre « qui saisit la donnée » (non pertinent, par analogie avec IMP-001-CONV1) et « qui est à l'origine de l'énoncé » (pertinent, variable), puis entre « origine » et « rapporteur ».
**Impact :** Aucun code modifié à ce stade. `EvidenceReference` (`lib/autre-rive/types.ts`) n'a aujourd'hui aucun consommateur dans le dépôt (vérifié), donc aucun impact runtime immédiat. Un futur changement du type TypeScript (ajout de `declarant`, `reportedBy`, `acquisitionMode` à `EvidenceReference`) sera nécessaire lors d'une future phase d'implémentation de SR-ENGINE-001 — non réalisé par cette entrée, qui ne fige que le contrat conceptuel.

---

**ID :** SR-ENGINE-001-D2
**Titre :** Confiance analytique (`Conclusion.confidence`)
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée du champ `confidence` défini par SR-D-001 Décision 3 §12 (`confidence?: number`, « jamais une probabilité objective », sans sémantique positive spécifiée) et présent sur `FlagEntry`.

`confidence` = degré de soutien méthodologique disponible pour une affirmation donnée. Peuvent contribuer à son appréciation : pertinence des preuves, provenance, degré de médiation (SR-ENGINE-001-D1), corroboration lorsqu'elle est nécessaire (une preuve directe unique peut suffire pour une affirmation étroite), contradictions pertinentes, temporalité, couverture pertinente pour la question, limites épistémiques propres au type d'affirmation. Aucune formule de calcul n'est définie par cette décision.

Échelle retenue : `1 = faible`, `2 = modérée`, `3 = élevée` — échelle ORDINALE (rang méthodologique), jamais un pourcentage, jamais une probabilité, écarts non présumés quantitativement égaux.

Quatre états distincts documentés : non calculée (`Conclusion` existe, `confidence = undefined` — état technique/transitoire, ne devrait pas subsister dans un `RapportAnalyse` finalisé) ; faible/modérée/élevée (`Conclusion` existe, `confidence = 1|2|3`) ; indéterminable (question examinée, aucune conclusion défendable — nécessite une trace positive distincte de `0`, de `undefined` ou d'une simple absence de `Conclusion` ; type exact non conçu par cette décision) ; données insuffisantes (analyse non tentée/impossible faute de couverture — `CoverageSummary` — distinct d'« indéterminable »).

Invariants : `confidence` ≠ probabilité (de vérité, de comportement futur, ou d'état mental) et toujours attachée à une affirmation précise, jamais un agrégat global de la relation ; quantité de preuves ≠ confidence ; couverture ≠ confidence ; gravité ≠ confidence ; niveau d'affirmation ≠ niveau de confiance ; une hypothèse sur un état mental peut recevoir un soutien analytique sans devenir un fait psychologique établi, et une déclaration d'état mental établit potentiellement la déclaration elle-même, jamais automatiquement la réalité, la sincérité ou la persistance de l'état ; `Conclusion.confidence` n'est jamais une probabilité prédictive, toute projection/forecast éventuelle nécessitant un contrat séparé non conçu ici ; toute contradiction pertinente doit être détectée et considérée, son effet sur `confidence` n'étant jamais mécaniquement prédéfini ; `CompetingHypothesis.compatibilityScore` ≠ `confidence` (contrats distincts ; une future décision pourra doter `CompetingHypothesis` de sa propre confiance, non créée ici) ; `overallConfidence` (`RapportAnalyse`) ne remplace ni ne masque jamais les niveaux de confiance des conclusions individuelles, son sort exact restant différé.
**Justification :** SR-D-001 §12 interdit la lecture en probabilité sans définir positivement ce que représente le nombre, laissant place à une dérive vers un faux pourcentage — risque signalé (sans force normative actuelle, jamais adopté dans SR-D-001) par l'ancien design ARCH-005 (Comité d'experts). Décision issue d'une revue itérative ayant notamment corrigé une définition initiale trop étroite (« convergence méthodologique » seule, alors qu'une preuve directe unique peut suffire), une règle excessive interdisant toute confiance sur un état mental, une règle excessive interdisant toute analyse prospective, et une règle mécanique de contradiction.
**Impact :** Aucun code modifié à ce stade. Le champ `number` existant (`Conclusion.confidence`, `FlagEntry.confidence`) n'est pas réécrit ; cette décision précise sa sémantique future (granularité `1/2/3`, quatre états) sans modifier le type TypeScript. Contrainte de l'échelle, distinction des quatre états et non-affichage du nombre brut à l'utilisatrice restent à réaliser lors d'une future phase d'implémentation de SR-ENGINE-001.

---

**ID :** SR-ENGINE-001-D3
**Titre :** Contrat canonique `Observation`
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée de la frontière `EvidenceReference` → `Observation` (SR-D-001 Décision 5). `Observation` = une affirmation factuelle atomique, vérifiable en principe, portant sur le contenu d'un artefact, sur le fait qu'une déclaration a été faite — quel qu'en soit le contenu, sans transformer le contenu déclaré en fait indépendant —, ou sur un fait comportemental mono-participant directement observable ou dérivé de façon reproductible à partir d'`EvidenceReference` identifiées. Une Observation n'affirme jamais comme fait : la réalité d'un état mental interne, une intention, une motivation, une causalité psychologique, une interprétation relationnelle, ou une affirmation intrinsèquement dyadique/relationnelle que le contrat actuel ne peut pas représenter fidèlement. `isFactual: true` (SR-D-001, inchangé) se lit comme une porte structurelle vers la couche factuelle du raisonnement, jamais comme une garantie de vérité absolue sur le monde.

Invariants : toute Observation référence au moins une `EvidenceReference` (`evidenceIds.length >= 1`, conceptuel) ; `evidenceIds` référence exclusivement des `EvidenceReference` — jamais une autre `Observation`, une `CompetingHypothesis`, une `Conclusion` ou un `FlagEntry`, préservant la chaîne `EvidenceReference → Observation → CompetingHypothesis → Conclusion` sans boucle de self-confirmation ; `participantId` = le participant auquel une Observation mono-participant est explicitement rattachée, jamais `declarant`/`reportedBy`/l'auteur technique/le participant principal du dossier par défaut (source ≠ sujet) ; chaque proposition d'une Observation est formulée au niveau épistémique réellement supporté par les `EvidenceReference` pertinentes pour cette proposition précise, sans nivellement mécanique par la preuve la plus faible citée ; distinction `derivation` conceptuelle `"directe"` / `"derivee"` (une Observation dérivée référence directement toutes les preuves nécessaires et porte une méthode identifiable/versionnée — comptage, médiane, fréquence, agrégation reproductible — sans qu'un calcul rende jamais factuelle une interprétation comme « il se désengage ») ; une qualification évaluative (insulte, menace, coercition) reste admissible dans `Observation` seulement si elle est déterminable selon des critères descriptifs explicites, sans inférence substantielle sur intention/motivation/personnalité/causalité, et vérifiable par les preuves citées — une citation exacte n'est pas un invariant universel, seulement requise et traçable quand la qualification est langagière et le texte original disponible ; atomicité analytique sans fragmentation de la preuve source (plusieurs Observations atomiques peuvent référencer la même `EvidenceReference` intacte) ; le nombre d'`EvidenceReference` ne représente jamais le nombre de sources indépendantes (duplication ≠ corroboration) ; une absence observée dans le corpus disponible n'équivaut jamais à une absence réelle absolue ; une Observation ayant participé à un `RapportAnalyse` immuable n'est jamais réécrite silencieusement ; la prudence épistémique d'une Observation ne réduit jamais mécaniquement la gravité d'un signal de sécurité qui en dérive.

`Observation.confidence` n'est pas ajouté par cette décision : D2 reste conceptuellement applicable à toute affirmation, y compris factuelle, mais D3 n'a pas besoin aujourd'hui d'un score propre à `Observation` — `EvidenceReference`, la traçabilité et la méthode de dérivation fournissent les métadonnées nécessaires à une future appréciation méthodologique sans créer un second mécanisme de scoring maintenant (parcimonie architecturale, jamais une exclusion conceptuelle de D2 : D1 ne porte qu'une partie des facteurs méthodologiques pertinents, jamais l'intégralité de la fiabilité d'une Observation).

**Limitation explicitement reconnue, non résolue par cette décision :** `Observation.participantId: string` (SR-D-001, inchangé) ne permet pas de représenter fidèlement une affirmation factuelle intrinsèquement dyadique/relationnelle (ex. « 96 heures séparent le message de Sylvie et la réponse de Serge » ; « la fréquence des échanges entre Sylvie et Serge a diminué de 40 % »). Ces affirmations peuvent rester factuelles et dérivées ; elles ne deviennent pour autant ni une `CompetingHypothesis`, ni une `Conclusion`, ni une interprétation, et ne doivent jamais être forcées dans un `participantId` arbitraire. Une future décision additive sous SR-ENGINE-001 devra gouverner la représentation des faits participant-level / dyadiques / relationnels, sans jamais modifier silencieusement SR-D-001.
**Justification :** SR-D-001 Décision 5 fixe `Observation` (`isFactual: true`) sans jamais définir la frontière entre un fait directement vérifiable et une interprétation implicite — lacune bloquante pour empêcher qu'une preuve devienne, à travers une Observation mal formée, une hypothèse puis une conclusion s'auto-confirmant. Décision issue d'une revue de conception itérative (audit du contrat réel — zéro consommateur actuel de `Observation` dans le dépôt — puis trois passes correctives : interdiction de citer une autre Observation comme preuve primaire ; diagnostic honnête de la limite dyadique de `participantId` plutôt qu'une convention silencieuse ; remplacement d'un nivellement mécanique par la preuve la plus faible par une règle formulée proposition par proposition).
**Impact :** Aucun code modifié à ce stade. `Observation` (`lib/autre-rive/types.ts`) n'a aujourd'hui aucun consommateur dans le dépôt (vérifié — le tableau `observations` de tout `RapportAnalyse` généré reste vide, IMP-001-P9E), donc aucun impact runtime immédiat. Un futur changement du type TypeScript (ajout d'un champ `derivation` à `Observation`, structure exacte de sa méthode versionnée, et éventuelle représentation des faits dyadiques/relationnels) sera nécessaire lors d'une future phase d'implémentation de SR-ENGINE-001 — non réalisé par cette entrée, qui ne fige que le contrat conceptuel.

---

**ID :** SR-ENGINE-001-D4
**Titre :** Contrat canonique `CompetingHypothesis`
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée de la frontière `Observation` → `CompetingHypothesis` (SR-D-001 Décision 5). `CompetingHypothesis` = une proposition interprétative explicite, suffisamment atomique, offrant une explication candidate d'un ensemble d'Observations, présentée comme une lecture possible parmi d'autres, jamais comme un fait établi, une preuve, une conclusion retenue, un diagnostic clinique, une probabilité de vérité, une probabilité d'événement futur, ou une réponse aux besoins de l'utilisatrice.

Seuil d'admission : une possibilité ne devient une `CompetingHypothesis` canonique que si elle cite au moins une `Observation` qui la soutient réellement (au-delà de la simple compatibilité) et présente un ancrage contextuel, une capacité explicative et une possibilité raisonnable d'identifier ce qui l'affaiblirait. Une donnée seulement compatible avec plusieurs explications sans en soutenir spécifiquement aucune ne fait naître aucune hypothèse canonique ; le résultat correct est une limitation documentée au niveau du rapport, jamais une hypothèse fabriquée pour remplir la liste.

Sémantique figée : compatible (n'exclut pas H, également attendue sous d'autres explications — n'entre jamais dans `supportingObservationIds`) ≠ soutient (élément positif propre à H — seule catégorie admissible dans `supportingObservationIds`) ≠ discrimine (soutient H et aide en outre à départager H d'une alternative — nuance conceptuelle portée par `methodologyNote`, aucun bucket structuré créé) ≠ contredit (`contradictingObservationIds`).

`compatibilityLevel` (obligatoire, `"faible"|"moderee"|"elevee"`) = degré qualitatif selon lequel l'hypothèse demeure cohérente avec l'ensemble des Observations pertinentes actuellement considérées, après prise en compte explicite des soutiens, des contradictions et des limites de couverture/temporalité pertinentes. Il ne représente jamais confidence, probabilité, severity, force causale, comptage de preuves, ou classement relatif automatique entre hypothèses ; `"elevee"` ne signifie jamais que l'hypothèse est vraie.

Atomicité : une `CompetingHypothesis` porte une seule proposition interprétative principale, suffisamment atomique pour que soutien, contradiction et `compatibilityLevel` restent interprétables sans ambiguïté ; des affirmations indépendamment évaluables (sentiment, peur, motivation, comportement, causalité) sont séparées en hypothèses distinctes pouvant citer les mêmes Observations, sans fragmenter artificiellement un mécanisme causal unique dont le sens dépend de l'ensemble.

Concurrence : une alternative doit être activement recherchée lorsque l'hypothèse porte sur intention, motivation, état mental ou causalité (catégories à haut risque de confirmation) ; « concurrentes » ne signifie pas mutuellement exclusives — plusieurs hypothèses non exclusives peuvent coexister ; deux formulations synonymiques du même contenu explicatif restent un doublon, jamais deux hypothèses.

États mentaux/intentions/causalité : admissibles explicitement comme hypothèses hypothétiques (jamais comme fait) ; une hypothèse causale exige antériorité temporelle, mécanisme plausible, alternatives et contradictions pertinentes considérées — une séquence temporelle seule n'est jamais une causalité.

Anti-pathologisation : STRATE ne produit jamais de diagnostic clinique ou psychiatrique d'un participant à partir du dossier relationnel ; un diagnostic externe explicitement fourni peut être traité comme donnée avec provenance (D1), jamais inféré par le moteur ; les termes analytiques non cliniques restent possibles uniquement comme labels de patterns comportementaux hypothétiques, jamais comme statut identitaire.

`analyticTermUsed` expose le terme analytique employé quand `label` implique un construit interprétatif ; il ne transforme jamais ce terme en diagnostic, fait ou catégorie clinique.

Forecast : `CompetingHypothesis` porte uniquement sur l'explication d'un motif passé ou présent, jamais sur la réalisation d'un événement futur ; tout usage prédictif reste hors périmètre, un contrat séparé non conçu ici.

Sécurité : une hypothèse interprétative sur l'intention ou la motivation ne peut jamais, à elle seule, neutraliser, annuler ou diminuer automatiquement la gravité d'un comportement de sécurité observé ; toute réévaluation légitime passe par un processus safety gouverné avec des données appropriées, non gouverné par cette décision.

Historique : une `CompetingHypothesis` contenue dans un `RapportAnalyse` est un instantané immuable, jamais réécrite silencieusement ; l'absence d'une hypothèse dans un rapport ultérieur ne permet, à elle seule, aucune inférence automatique sur son statut, faute de mécanisme de filiation inter-rapports.

Anti-complaisance : STRATE ne pondère jamais une hypothèse selon la préférence narrative de l'utilisatrice, dans un sens comme dans l'autre.

`CompetingHypothesis.confidence` n'est pas ajoutée par cette décision : différée, comme D2 l'avait déjà elle-même anticipé, jusqu'à ce qu'une méthode d'attribution suffisamment définie la justifie. La sémantique de `compatibilityScore?: number` n'est pas non plus définie par cette décision (aucune formule) ; le champ reste un emplacement non renseigné en pratique, `compatibilityScore ≠ confidence` restant l'invariant déjà acquis (D2).

Falsification/indéterminabilité : `compatibilityLevel` ne porte que la compatibilité qualitative actuelle — jamais la falsification, ni l'indéterminabilité, ni un état caché. Une contradiction locale n'est jamais une falsification automatique. Une falsification éventuelle doit être explicitement tracée dans un raisonnement ultérieur et ne peut jamais être déduite du seul `compatibilityLevel`, d'une contradiction locale, ou de la simple absence de l'hypothèse dans un rapport ultérieur ; son mécanisme structuré reste différé.
**Justification :** SR-D-001 Décision 5 fixe `CompetingHypothesis` (`supportingObservationIds`, `contradictingObservationIds`, `compatibilityLevel` obligatoire, `compatibilityScore` facultatif) sans jamais définir positivement ce que mesure `compatibilityLevel`, ni la différence entre compatibilité et soutien — lacune bloquante pour empêcher qu'une simple compatibilité multi-explicative ne produise un faux pluralisme d'hypothèses, ou qu'une hypothèse interprétative n'atténue silencieusement un fait de sécurité. Décision issue d'un audit du contrat réel (zéro consommateur actuel, `compatibilityScore` jamais exercé par un test avec une valeur numérique réelle) suivi d'une revue de conception en deux passes : un premier rapport ayant laissé `compatibilityLevel` insuffisamment défini malgré son caractère obligatoire, admis une contradiction entre le seuil de soutien exigé et un cas adversarial permissif, confondu falsification/indéterminabilité avec les valeurs de `compatibilityLevel`, autorisé une hypothèse à portée prédictive (« il pourrait reprendre contact »), et formulé l'asymétrie de sécurité de façon trop absolue ; corrigée en sept points dans une seconde passe.
**Impact :** Aucun code modifié à ce stade. `CompetingHypothesis` (`lib/autre-rive/types.ts`) n'a aujourd'hui aucun consommateur dans le dépôt (vérifié — le tableau `hypotheses` de tout `RapportAnalyse` généré reste vide, IMP-001-P9E). Un futur changement du type TypeScript (sémantique définitive de `compatibilityScore`, éventuel champ `confidence` propre, mécanisme structuré de falsification/filiation inter-rapports) sera nécessaire lors d'une future phase d'implémentation de SR-ENGINE-001 — non réalisé par cette entrée, qui ne fige que le contrat conceptuel.

---

**ID :** SR-ENGINE-001-D5
**Titre :** Contrat canonique `Conclusion`
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée de la frontière `CompetingHypothesis` → `Conclusion` (SR-D-001 Décision 5). `Conclusion` = jugement analytique gouverné portant sur une dimension analytique déterminée, exprimant ce que l'ensemble des éléments pertinents disponibles permet raisonnablement de conclure à cet instant. Une Conclusion peut synthétiser des faits observés, intégrer des hypothèses pertinentes, retenir éventuellement une hypothèse explicative, porter un jugement évaluatif sur une dimension, constater une situation préoccupante, constater des données insuffisantes, ou expliciter des limitations méthodologiques pertinentes. Elle n'est jamais une `Observation`, une `EvidenceReference`, une `CompetingHypothesis` simplement promue, une vérité définitive, un diagnostic clinique, une prédiction d'événement futur, une probabilité de vérité, ni un mini-rapport mélangeant plusieurs dimensions.

`Hypothesis → Conclusion` est une voie possible du raisonnement, jamais la seule : `Conclusion ≠ Hypothesis promue`. `retainedHypothesisId` reste optionnel ; lorsqu'il est renseigné, il désigne l'hypothèse retenue comme interprétation explicative la mieux soutenue pour la dimension traitée, compte tenu des Observations pertinentes, contradictions, alternatives réellement soutenues, couverture, temporalité et invariants D1-D4 — jamais une fonction automatique de `max(compatibilityLevel)`. Une hypothèse dont le `compatibilityLevel` n'est pas maximal parmi les alternatives pertinentes peut être retenue si l'écart est explicitement justifié dans le raisonnement du rapport ; même au niveau maximal, la sélection reste méthodologiquement justifiable. Une hypothèse retenue conserve dans la Conclusion son caractère hypothétique. Les alternatives pertinentes non retenues restent traçables lorsqu'elles affectent matériellement la portée de la Conclusion, via `narrativeSummary`, `confidenceExplanation`, `limitations`, ou les `CompetingHypothesis` conservées dans le rapport selon le cas — sans faire de `confidenceExplanation` un conteneur générique obligatoire ; aucune structure dédiée n'est créée aujourd'hui pour cette traçabilité (différé).

`supportingEvidenceIds`/`contradictingEvidenceIds` référencent directement des `EvidenceReference`. Deux cas : (A) Conclusion avec `retainedHypothesisId` — les preuves citées restent cohérentes avec le raisonnement de l'hypothèse retenue, sans contourner silencieusement D3/D4 ; (B) Conclusion sans hypothèse retenue — les preuves peuvent soutenir directement un jugement évaluatif gouverné sur la dimension (ex. menace documentée → `risque_critique`), mais cet accès direct aux preuves ne donne jamais à `Conclusion` le droit de devenir une couche d'interprétation libre : toute affirmation explicative sur intention, motivation ou causalité reste soumise aux invariants de D4.

`confidence` suit intégralement D2 (ordinal `1|2|3` conceptuel, jamais probabilité, quatre états) ; D5 ne redéfinit rien. Le type réel reste aujourd'hui un `number` non contraint, exercé avec des échelles incompatibles dans les tests réels — divergence désormais inscrite comme dette technique distincte (STD-008).

`deriveOverallConfidence` (minimum, jamais moyenne) et `deriveOverallConclusionLabel` (pire cas selon `CONCLUSION_SEVERITY_ORDER`) restent des conventions produit/technique réelles et testées de la Phase 9E, préservées par D5 sans modification — mais non érigées en conséquence normative de D2 ni en loi universelle du futur moteur ; le sort définitif d'`overallConfidence` et d'`overallConclusionLabel` reste différé au-delà de ces conventions.

`label` ≠ `confidence` (gravité de la dimension ≠ soutien méthodologique de l'affirmation) : un `label: "risque_critique"` peut coexister avec une confidence limitée. `label: "donnees_insuffisantes"` signifie que la dimension ne dispose pas d'une base analytique suffisante pour recevoir honnêtement un jugement évaluatif — jamais une faible gravité, une relation probablement saine, une confidence faible, ou une absence de risque démontrée ; un fait critique de sécurité déjà documenté pour la dimension n'est jamais requalifié en `donnees_insuffisantes` du seul fait d'une insuffisance de données sur d'autres aspects.

`dimension: string` désigne une question analytique suffisamment déterminée pour que `label`, `narrativeSummary`, `confidence`, `supportingEvidenceIds`, `contradictingEvidenceIds`, `limitations` et `retainedHypothesisId` éventuel restent cohérents ensemble — jamais une dimension omnibus mélangeant sécurité, communication, compatibilité, etc. sous un seul label ; plusieurs dimensions produisent plusieurs `Conclusion`, jamais un mini-rapport unique. Une Conclusion d'une dimension donnée n'est pas tenue de répéter un fait de sécurité critique documenté ailleurs (indépendance dimensionnelle) ; le `RapportAnalyse` global, lui, ne masque jamais un canal safety critique documenté (sécurité globale) — cette frontière est posée sans modifier le contrat global du `RapportAnalyse`.

`limitations: []` reste un résultat légitime en l'absence de limitation matériellement pertinente — jamais un boilerplate automatique ; toute limitation qui affecte réellement la portée de la Conclusion (single-informant, corpus incomplet, provenance médiée, alternatives non discriminées, fenêtre temporelle limitée) doit être exposée. Une `Conclusion` n'ajuste jamais `label`/`confidence`/`narrativeSummary`/`retainedHypothesisId` selon la préférence narrative de l'utilisatrice ; ne produit jamais de prédiction d'événement futur ni de diagnostic clinique inféré ; contenue dans un `RapportAnalyse` immuable, elle n'est jamais réécrite silencieusement — toute réévaluation appartient à un nouveau rapport.
**Justification :** SR-D-001 Décision 5 fixe `Conclusion` (`retainedHypothesisId` facultatif, `confidence: number`, `label: OverallConclusionLabel`) sans jamais définir positivement la frontière avec `CompetingHypothesis`, ni la sémantique de sélection de `retainedHypothesisId` — lacune bloquante pour empêcher qu'une future implémentation transforme mécaniquement l'hypothèse la plus compatible en vérité retenue. Décision issue d'un audit du contrat réel, révélant notamment deux fonctions réelles et testées déjà en production (`deriveOverallConfidence`, `deriveOverallConclusionLabel`, Phase 9E) et une divergence d'échelle démontrée pour `confidence` entre deux suites de tests réelles et la cible ordinale de D2, suivi d'une revue de conception en deux passes : un premier rapport ayant défini `Conclusion` de façon trop centrée sur la sélection d'une hypothèse, laissé le critère de sélection de `retainedHypothesisId` trop vague (« utile »), et normativisé à tort les conventions Phase 9E comme conséquence de D2 ; corrigé en six points dans une seconde passe, incluant la reconnaissance explicite de la divergence d'échelle de `confidence` comme dette technique.
**Impact :** Aucun code modifié à ce stade. `Conclusion` (`lib/autre-rive/types.ts`) possède de réels consommateurs testés (`deriveOverallConfidence`, `deriveOverallConclusionLabel`, `app/autre-rive/dossiers/[id]/rapport-analyse-sync.ts`), mais le tableau `conclusions` de tout `RapportAnalyse` généré en production reste aujourd'hui toujours vide (IMP-001-P9E, aucune source canonique ne produit de `Conclusion` réelle). Un futur changement du type TypeScript (contrainte de l'échelle de `confidence`, structure éventuelle pour la traçabilité des alternatives non retenues) sera nécessaire lors d'une future phase d'implémentation de SR-ENGINE-001 — non réalisé par cette entrée. La divergence d'échelle de `Conclusion.confidence` est inscrite séparément comme dette technique (STD-008, priorité Haute, section SR-ENGINE-001).

---

**ID :** SR-ENGINE-001-D6
**Titre :** Contrat canonique `FlagEntry`
**Date :** 2026-09-11
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée de la frontière `CompetingHypothesis`/`Conclusion` → `FlagEntry` (SR-D-001 Décision 5). `FlagEntry` = signal analytique gouverné, favorable (`green`) ou défavorable (`red`), qu'un `RapportAnalyse` juge suffisamment pertinent pour être explicitement porté à l'attention de l'utilisatrice, à partir de preuves identifiées et d'un raisonnement traçable. Il peut représenter un événement significatif isolé, une caractéristique comportementale observable, ou un pattern réellement supporté par les preuves — mais `FlagEntry ≠ pattern par définition` : son existence ne permet jamais à elle seule d'inférer répétition, fréquence, tendance, aggravation ou amélioration.

`red` = signal défavorable ou préoccupant pour la dimension/situation concernée ; `green` = signal favorable ou protecteur. `red ≠ SafetyLevel` ; `green ≠ sécurité acquise` : un `green` n'est jamais une preuve d'absence de risque, une compensation d'un `red`, une annulation d'un canal safety, ni un crédit arithmétique neutralisant un autre signal — aucune arithmétique des flags n'est admise (« 3 green - 2 red = relation saine » notamment interdit).

Anti-symétrie : STRATE ne cherche jamais à équilibrer artificiellement red/green, participant A/participant B, ou une responsabilité identifiée d'un côté par une responsabilité inventée de l'autre. Les `FlagEntry` suivent uniquement les preuves disponibles ; un rapport honnête peut ne contenir que des `red`, que des `green`, une majorité très forte d'une polarité, ou aucun flag — l'absence de `FlagEntry` n'équivaut jamais à l'absence réelle du comportement.

`participantId` désigne, pour un `FlagEntry` mono-participant, le sujet analytique du signal — jamais déduit du déclarant, du `reportedBy`, de l'auteur technique, de l'utilisatrice principale ou de « l'autre participant » (source ≠ sujet, D3). **Limitation explicitement reconnue, non résolue par cette décision** : le type actuel (`participantId: string`, obligatoire) ne représente pas fidèlement un signal intrinsèquement dyadique/relationnel (réciprocité, cycle demande-retrait, escalade mutuelle, coordination parentale, capacité dyadique de réparation). Invariant : non-représentable avec fidélité aujourd'hui ≠ attribuable arbitrairement à un participant. Une future décision additive sous SR-ENGINE-001 devra gouverner la représentation participant-level/dyadique/relationnelle des `FlagEntry`, par analogie directe avec la limitation déjà reconnue par D3 pour `Observation.participantId`.

Frontière avec `CriticalSafetyAssessment` : deux niveaux distincts. (A) La détection analytique d'un signal potentiellement pertinent pour la sécurité reste autorisée — STRATE peut produire un `FlagEntry` rouge signalant qu'une situation (menace, intimidation, contrôle coercitif potentiel, comportement inquiétant) mérite une attention ou une revue safety humaine, avec provenance et prudence épistémique. (B) La création ou la qualification canonique d'un `CriticalSafetyAssessment` n'est jamais automatique depuis un `FlagEntry` : aucun `FlagEntry` ne crée silencieusement un `CriticalSafetyAssessment`, ne choisit son `level`, ne modifie `currentSafetyAssessmentRef`, ni ne remplace l'évaluation humaine du mécanisme Phase 9A (seule origine réelle, geste explicite de l'utilisatrice) ; `severity: 5` n'équivaut jamais à `SafetyLevel: "critical"`. Un `FlagEntry` vert ne peut jamais neutraliser ou masquer un `CriticalSafetyAssessment` critique existant.

`severity?: 1|2|3|4|5` (champ réel, inchangé) = degré d'intensité/saillance analytique du `FlagEntry` dans sa propre polarité (plus élevé = signal défavorable plus préoccupant pour `red`, signal favorable plus substantiel pour `green`) — jamais `SafetyLevel`, `confidence`, fréquence, nombre de preuves, probabilité, ni poids automatique dans `overallConclusionLabel`. Le nom technique reste sémantiquement imparfait pour les `green` flags ; le champ n'est pas renommé, aucune dette distincte n'est créée pour ce seul point.

`confidence` suit intégralement D2 (ordinal `1|2|3`, jamais probabilité, quatre états). Gap réel démontré : un `FlagEntry` de test existant porte `confidence: 0.6`, incompatible avec la cible ordinale — divergence désormais rattachée à la dette technique déjà ouverte pour `Conclusion.confidence` (STD-008, élargie par cette décision, voir Impact).

`supportingEvidenceIds` exige conceptuellement ≥1 `EvidenceReference` pertinente ; plusieurs identifiants ne signifient jamais automatiquement une confidence plus forte (duplication ≠ corroboration, D1/D3). Une affirmation ponctuelle peut se suffire d'une preuve directe ; une affirmation de répétition exige des preuves soutenant la répétition elle-même ; toute interprétation d'intention/motivation/causalité reste soumise à D4. Une traçabilité structurée vers l'`Observation`/`CompetingHypothesis` ayant conduit au `FlagEntry` serait souhaitable à terme mais n'est pas ajoutée par cette décision (structure différée) ; `FlagEntry` ne devient jamais une voie de contournement de D3/D4.

Répétition/trajectoire : un `FlagEntry` peut légitimement décrire une répétition survenue dans la fenêtre temporelle couverte par le rapport si des preuves suffisantes la soutiennent réellement, mais ne permet jamais de déduire automatiquement une trajectoire (aggravation, amélioration, fréquence croissante) du seul nombre de flags ou de l'existence de plusieurs rapports sans comparaison temporelle méthodologiquement supportée (`ReportComparison`, différé).

Legacy : aucune conversion automatique de `LegacyRapportAnalyse.redFlags`/`greenFlags` (chaînes brutes) vers `FlagEntry` canonique (précédent IMP-001-P9D) ; les heuristiques legacy actuellement affichées (comptage, seuils, ratio pour la tonalité) ne constituent jamais un modèle valide pour `FlagEntry` — comptage ≠ gravité, ratio ≠ verdict.

`analyticTermUsed` : même principe que D4 — jamais un diagnostic, une identité psychologique ou une pathologie inférée. Un `FlagEntry` contenu dans un `RapportAnalyse` est un instantané immuable, jamais réécrit silencieusement.
**Justification :** SR-D-001 Décision 5 fixe `FlagEntry` (`type`, `severity` facultatif, `confidence: number`, `participantId` obligatoire) sans jamais définir sa frontière avec `CriticalSafetyAssessment` (Décision 4) ni la représentation des phénomènes dyadiques — lacune bloquante pour empêcher qu'une future implémentation confonde un signal analytique avec une qualification de sécurité canonique, ou force artificiellement un phénomène relationnel sur un seul participant. Décision issue d'un audit du contrat réel révélant deux objets réels distincts déjà implémentés (`CriticalSafetyAssessment`, geste humain exclusif, Phase 7/9A) et un mécanisme legacy actif (`redFlags`/`greenFlags` bruts, heuristiques de comptage, `dossier-data.ts`), suivi d'une revue de conception en deux passes : un premier rapport ayant formulé la frontière safety de façon trop absolue (interdisant implicitement toute détection analytique de signal safety-relevant), défini `FlagEntry` comme nécessairement un « motif », et sous-estimé la limitation dyadique de `participantId` ; corrigé en six points dans une seconde passe.
**Impact :** Aucun code modifié à ce stade. `FlagEntry` (`lib/autre-rive/types.ts`) n'a aujourd'hui aucun consommateur réel dans le dépôt (tableau `flags` toujours vide, IMP-001-P9E). La dette technique HIGH précédemment inscrite pour `Conclusion.confidence` est élargie par cette décision pour couvrir également `FlagEntry.confidence` (STD-008). La dette existante « coexistence technique résiduelle legacy/canonique » (STD-008) est enrichie pour documenter explicitement l'heuristique de comptage `redFlags`/`greenFlags` comme manifestation concrète de cette même dette. Un futur changement du type TypeScript (contrainte de l'échelle de `confidence`, éventuelle filiation vers Observation/Hypothesis, représentation dyadique) sera nécessaire lors d'une future phase d'implémentation de SR-ENGINE-001 — non réalisé par cette entrée.

---

**ID :** SR-ENGINE-001-D7
**Titre :** Corpus, coverage et portée épistémique de l'analyse
**Date :** 2026-09-19
**Statut :** CLÔTURÉE (décision conceptuelle — implémentation non commencée, voir Impact)
**Décision :** Clarification conceptuelle figée de la notion de corpus mobilisée par une génération analytique et de sa relation avec `CoverageSummary` (SR-D-001 Décision 5) et avec `confidence` (SR-ENGINE-001-D2). Cinq niveaux de corpus sont distingués, structurellement indépendants — aucun ne se déduit ou ne se reconstruit silencieusement d'un autre :

A. Corpus du dossier — tout ce qui existe dans le dossier.
B. Corpus disponible (*available corpus*) — sous-ensemble du corpus du dossier qui pouvait effectivement être utilisé par une génération analytique précise, compte tenu de l'accessibilité, du périmètre de l'analyse et des contraintes connues au moment T ; exister dans le dossier n'implique pas d'être disponible pour cette exécution (preuve inaccessible, hors périmètre, non chargée, corrompue).
C. Corpus considéré (*considered corpus*) — sous-ensemble du corpus disponible effectivement examiné pendant cette génération ; ne peut jamais être reconstruit à partir de ce qui est finalement cité (un moteur peut examiner un grand nombre d'éléments, n'en juger qu'une partie pertinente, et n'en citer explicitement qu'une fraction, sans que les éléments écartés cessent d'avoir été considérés).
D. Matériau pertinent pour une affirmation/question (*claim-relevant / question-relevant material*) — sous-ensemble du corpus considéré ayant effectivement contribué à l'analyse d'une affirmation ou question donnée.
E. Support/contradiction cité (*cited support/contradiction*) — ce qui apparaît explicitement dans la chaîne de justification d'un résultat (`Observation.evidenceIds`, `CompetingHypothesis.supportingObservationIds`/`contradictingObservationIds`, `Conclusion.supportingEvidenceIds`/`contradictingEvidenceIds`, `FlagEntry.supportingEvidenceIds`).

Coverage = adéquation du corpus considéré (C), le cas échéant filtré au matériau pertinent pour la question (D), pour répondre honnêtement à une question ou affirmation déterminée — jamais le volume du corpus du dossier (A), du corpus disponible (B), ni le nombre d'éléments finalement cités (E). Coverage est spécifique à la question/dimension traitée, jamais un indicateur global unique de la relation.

Single-informant : limitation épistémique claim-specific, jamais un seuil, un ratio global, ou un booléen déduit du volume de preuves. Une perspective unique peut suffire à établir solidement certains faits directs tout en restant insuffisante pour établir intention, état mental, comportement hors corpus, version complète de l'autre participant, ou généralisation relationnelle.

Complétude : trois états conceptuels — complet connu, explicitement partiel, inconnu — l'état par défaut étant inconnu, jamais présumé. Toute affirmation de complétude est relative à un périmètre explicitement défini : une conversation intégralement exportée n'établit jamais, à elle seule, un corpus complet de la relation.

Absence documentaire : préserve et étend l'invariant déjà posé par D3 — une absence dans le corpus considéré n'équivaut jamais à une absence dans la réalité.

Temporalité : la portée temporelle effectivement considérée doit rester traçable (première preuve considérée, dernière preuve considérée, trous significatifs connus, concentration disproportionnée sur une période, adéquation de la période à la question posée). Cette décision ne définit aucun algorithme de sélection automatique d'une fenêtre temporelle — seule l'exigence de traçabilité déclarative est fixée ici.

Données insuffisantes : `donnees_insuffisantes` (D5) peut être local à une question ou dimension particulière, sans jamais impliquer automatiquement l'absence de risque, l'absence du comportement en cause, une hypothèse réfutée, ou l'insuffisance des autres dimensions du même rapport.

Limitations : la portée du corpus (B/C/D) se relie conceptuellement à `Conclusion.limitations` (D5) — toute limitation affectant matériellement ce que STRATE peut honnêtement affirmer doit y être exposée, sans qu'une taxonomie technique exhaustive soit créée par cette décision.

`EvidenceAvailability` (SR-D-001, non implémenté) : son état courant, mutable et calculé à la demande, ne suffit pas à lui seul à reconstruire le corpus disponible (B) historique d'un rapport passé. Une preuve aujourd'hui `deleted` pouvait appartenir au corpus disponible au moment d'une génération historique ; inversement, une preuve `available` aujourd'hui pouvait ne pas y avoir appartenu (hors périmètre à l'époque, par exemple). Le snapshot épistémique historique (B/C au moment T) et l'état technique courant restent deux axes indépendants, qui ne se déduisent jamais l'un de l'autre.

`confidence` (D2) : cette décision n'y ajoute ni formule, ni pondération, ni score — D2 reste fermée et inchangée. Elle lui fournit seulement la notion, jusqu'ici manquante, de couverture question-specific et de portée épistémique du corpus sur laquelle une appréciation de confidence peut légitimement s'appuyer.

Safety : une couverture globale ou locale insuffisante ne peut jamais neutraliser, moyenner, masquer ou diminuer artificiellement un fait de sécurité directement établi par une preuve directe. Mais cela ne signifie pas que toute affirmation touchant à la sécurité échappe aux règles de portée épistémique : une preuve directe peut établir fortement qu'un événement précis s'est produit sans établir automatiquement sa fréquence, un contexte complet, une trajectoire, ou le niveau de risque global de la relation — ces généralisations restent soumises aux mêmes limites de corpus disponible/considéré que toute autre affirmation. `CriticalSafetyAssessment` (D4) n'est pas modifié par cette décision.

Invariants normatifs :
I1. Corpus du dossier ≠ corpus disponible ≠ corpus considéré ≠ matériau pertinent pour une affirmation ≠ support/contradiction cité. Les références de preuve actuellement conservées dans les sorties analytiques permettent de tracer le niveau E (support/contradiction cité), mais ne permettent pas de reconstruire les niveaux B (corpus disponible), C (corpus considéré), ni l'intégralité du niveau D (matériau pertinent pour l'affirmation).
I2. Les éléments cités dans une sortie analytique ne constituent pas nécessairement l'intégralité du corpus considéré.
I3. Coverage ≠ volume brut.
I4. Coverage est spécifique à la question/dimension.
I5. Single-informant est une limitation claim-specific, jamais un ratio global.
I6. Absence documentaire ≠ absence réelle.
I7. La complétude ne peut être présumée ; inconnue par défaut.
I8. Toute affirmation de complétude est relative à un périmètre explicitement défini.
I9. Duplication ≠ corroboration.
I10. La portée temporelle effectivement considérée doit être traçable.
I11. Données insuffisantes peut être local à une question/dimension.
I12. Un rapport immuable conserve la portée épistémique propre à sa génération.
I13. `EvidenceAvailability` courant ≠ disponibilité historique au moment du rapport.
I14. Coverage limite ce que STRATE peut honnêtement affirmer ; il ne définit pas la réalité sous-jacente.
I15. Une couverture insuffisante ne neutralise pas un fait de sécurité directement établi, mais les généralisations au-delà de ce fait précis (fréquence, contexte, trajectoire, sécurité globale) restent soumises aux limites épistémiques.

Explicitement hors périmètre de cette décision : représentation TypeScript des niveaux B, C et D ; algorithme de sélection automatique d'une fenêtre temporelle ; formule de calcul de `confidence` ; sort définitif de `overallConfidence` ; `ReportComparison` ; taxonomie et versioning complet des dimensions analytiques ; représentation des faits dyadiques/relationnels ; mécanismes de correction/versionnement d'une Observation historique ; architecture Multi-Experts ; fournisseurs IA ; registre scientifique ; Relationship GPS.
**Justification :** `CoverageSummary` (SR-D-001 Décision 5) fixe un mécanisme de couverture (`overallCoverage`, `coverageLevel`, `documentedPeriodStart`/`End`, `missingDataNotes`) sans jamais définir positivement ce que « couvrir » signifie ni sur quel corpus la couverture porte — lacune bloquante devenue concrètement visible dans l'implémentation réelle : `computeCoverageSummary` (`app/autre-rive/dossiers/[id]/rapport-analyse-sync.ts`) calcule `overallCoverage` comme la somme brute de tous les éléments du dossier entier (`evidenceIds.length + conversationIds.length + eventIds.length + journalEntryIds.length`), sans distinction d'accessibilité, d'examen effectif ou de citation. Parallèlement, la chaîne de provenance fixée par D1-D6 (`EvidenceReference` → `Observation` → `CompetingHypothesis`/`Conclusion`/`FlagEntry`) ne trace que les éléments explicitement cités dans une sortie analytique — laissant sans aucune base conceptuelle la déclaration de ce qui était disponible ou effectivement considéré lors d'une génération. Décision issue de l'audit de priorisation SR-ENGINE-001 (dépendance la plus élevée identifiée parmi les points non décidés de D1-D6) suivi d'une revue de conception en deux passes : un premier projet de contrat ayant assimilé à tort le corpus considéré aux `evidenceIds` déjà cités, assimilé le corpus disponible à ce qui existait dans le dossier au moment de la génération plutôt qu'à ce qui était effectivement utilisable pour cette exécution précise, formulé l'exemption de sécurité de façon trop absolue, et attribué par erreur des `evidenceIds` directs à `CompetingHypothesis` ; corrigé en quatre points (dont la correction structurelle de I1) dans une seconde passe.
**Impact :** Aucun code modifié à ce stade. `computeCoverageSummary` (`app/autre-rive/dossiers/[id]/rapport-analyse-sync.ts`, `COVERAGE_CALCULATION_VERSION = "coverage-count-v1"`) n'est pas modifié par cette décision et continue de calculer un volume brut global (corpus du dossier, niveau A) : il n'implémente pas le contrat conceptuel ici fixé, et cet écart est désormais explicitement connu — il ne doit jamais être lu comme une implémentation partielle correcte du nouveau contrat. Seul le niveau E (support/contradiction cité) est aujourd'hui structurellement représentable par la chaîne D1-D6 ; rien dans le contrat actuel (`lib/autre-rive/types.ts`) ne permet à un `RapportAnalyse` de déclarer honnêtement son corpus disponible (B) ou son corpus considéré (C) au moment de sa génération. Une future décision d'implémentation devra déterminer la représentation technique appropriée de B/C/D, sans être préjugée ici. Une éventuelle dette technique documentant l'écart entre `computeCoverageSummary` et ce contrat conceptuel n'est pas inscrite dans STD-008 par cette entrée (voir rapport de la passe d'inscription) — signalée pour décision séparée.

---

Points explicitement non décidés à ce stade (SR-ENGINE-001, hors périmètre de D1 à D7, non inscrits comme dette technique — ce sont des décisions de conception futures) : formule de calcul de `confidence` ; type exact portant l'état « indéterminable » ; sort définitif de `overallConfidence` ; sort définitif de `overallConclusionLabel` au-delà de la convention Phase 9E existante ; contrat de projection/forecast ; confiance propre éventuelle de `CompetingHypothesis` ; sémantique numérique définitive de `compatibilityScore` (absolue, relative, ou méthode versionnée future) ; mécanisme structuré de falsification et de filiation inter-rapports d'une hypothèse ; mécanisme de comparaison/filiation inter-rapports (`ReportComparison`) ; bucket structuré distinguant qu'une Observation discrimine entre alternatives ; structure dédiée pour la traçabilité des alternatives d'hypothèses non retenues dans une `Conclusion` ; taxonomie et versioning complet des dimensions analytiques (`Conclusion.dimension`) ; validation référentielle technique des identifiants cités (Observation par une `CompetingHypothesis`, `EvidenceReference` par une `Conclusion`, `EvidenceReference` par un `FlagEntry`) ; représentation des transformations techniques des preuves ; représentation technique (TypeScript) des niveaux corpus disponible / corpus considéré / matériau pertinent pour une affirmation (B/C/D, SR-ENGINE-001-D7) ; algorithme de sélection automatique d'une fenêtre temporelle (SR-ENGINE-001-D7) ; représentation des faits dyadiques/relationnels (`Observation.participantId`, `FlagEntry.participantId`) ; structure TypeScript exacte de `derivation` et de sa méthodologie versionnée ; statut provisoire/canonique éventuel des Observations produites automatiquement ; mécanisme concret de correction/versionnement d'une Observation historique ; filiation technique `FlagEntry` → `Observation`/`CompetingHypothesis` ; migration/dépréciation définitive du legacy `redFlags`/`greenFlags` ; automatisation (NLP) des règles de formulation épistémique ; architecture Multi-Experts ; fournisseurs IA ; registre scientifique ; Relationship GPS.

---

## Décisions actives — Livre / Manuscrit (LIVRE)

Note de périmètre : cette section est ouverte le 2026-10-01 à l'occasion de LIVRE-P1A (identité stable des chapitres des Tomes 2–4). Les entrées ci-dessous sont des décisions prises avant toute implémentation de P1A, à la suite de l'audit complémentaire du 2026-10-01 (commit de base `4125981`). Aucune n'est une consolidation rétroactive. Leur cohérence a été vérifiée uniquement contre les documents STD présents dans le dépôt (STD-001 à STD-008, STRATE_TEST_STRATEGY) ; le Document Fondateur, la Cartographie fonctionnelle et les Backlogs n'étaient pas accessibles lors de cette vérification.

Les travaux LIVRE-P0.1/P0.1B (commit `56cbb1be8a18a873e72be2d8daba64ae52504b46`) et LIVRE-P0.2 (commit `4125981cf21192efd183325febe7637fd199bc0f`) précèdent l'ouverture formelle de la gouvernance LIVRE dans STD-005. Leur absence de la section Décisions ne signifie pas qu'ils ne sont pas implémentés. Toute régularisation documentaire rétrospective devra distinguer faits d'implémentation vérifiés et décisions de gouvernance historiquement documentées.

---

**ID :** LIVRE-P1A-D1
**Titre :** Suppression de la passe 3 automatique de `/fragments`
**Date :** 2026-10-01
**Statut :** CLÔTURÉE (décision — implémentation P1A terminée au commit `d8cd4a54821a951143fe66082510ee164943a009`, voir Impact)
**Décision :** La passe 3 de `app/fragments/page.tsx` (retrait automatique de la structure, au chargement de la page, de tout chapitre absent de la liste par défaut et sans fragment manuscrit rattaché) est supprimée. Ouvrir `/fragments` ne retire aucun chapitre existant. L'absence de fragment manuscrit ne constitue jamais une instruction de suppression. Un chapitre créé manuellement reste dans la structure jusqu'à une action explicite de l'utilisatrice. La suppression explicite depuis l'interface Structure reste un comportement distinct, non modifié par cette décision.
**Justification :** L'audit du 2026-10-01 a établi que cette passe retire déjà aujourd'hui des chapitres créés à la main, au simple affichage d'une page. Avec une identité persistante, conserver ce comportement ferait disparaître l'identifiant du chapitre ; une recréation produirait un nouvel identifiant et rendrait le texte rattaché à l'ancien inaccessible par les chemins normaux. Le comportement ne peut donc pas être adapté mécaniquement sans violer l'invariant d'identité de LIVRE-P1A.
**Impact :** Modification fonctionnelle de `/fragments` réalisée par l'implémentation de LIVRE-P1A (commit `d8cd4a54821a951143fe66082510ee164943a009`) : la passe 3 a été supprimée de `app/fragments/page.tsx`. Les chapitres auparavant retirés par cette passe ne sont pas restaurés automatiquement par cette décision.

---

**ID :** LIVRE-P1A-D2
**Titre :** Passe 2 de `/fragments` conservée, sans rattachement heuristique
**Date :** 2026-10-01
**Statut :** CLÔTURÉE (décision — implémentation P1A terminée au commit `d8cd4a54821a951143fe66082510ee164943a009`, voir Impact)
**Décision :** La passe 2 de `/fragments` (ajout à la structure d'un chapitre référencé par un fragment manuscrit) est conservée et adaptée au modèle canonique. Elle passe par les primitives centrales, n'écrit jamais la structure canonique au format legacy, ne modifie jamais l'identifiant d'un chapitre existant et ne recrée jamais un chapitre existant. Le même contrat s'applique à `envoyerAuManuscrit`. Lorsque plusieurs chapitres d'un même tome portent exactement le titre référencé par un fragment, la cible est classée `LEGACY — IDENTITÉ INDÉTERMINABLE` : aucun chapitre n'est choisi arbitrairement.
**Justification :** La passe 2 n'est pas destructive en elle-même ; son seul risque sous P1A est la création d'identités en double et le choix arbitraire entre homonymes, que cette décision interdit.
**Impact :** La référence par titre de `fragment.chapitre` est conservée (dette inscrite dans STD-008).

---

**ID :** LIVRE-P1A-D3
**Titre :** Tome 1 hors migration LIVRE-P1A
**Date :** 2026-10-01
**Statut :** CLÔTURÉE (décision — implémentation P1A terminée au commit `d8cd4a54821a951143fe66082510ee164943a009`, voir Impact)
**Décision :** LIVRE-P1A concerne uniquement les Tomes 2–4. Ne sont ni migrés, ni réconciliés, ni supprimés : `ChapitreTome1`, `chapitres-tome-1` et son historique LIVRE-P0.1/P0.1B, les entrées Tome 1 de `structure-chapitres`, les clés `ecriture_1_*`. P1A ne détermine pas lequel des deux systèmes Tome 1 est correct et préserve leur état actuel.
**Justification :** L'audit du 2026-10-01 a révélé deux représentations parallèles du Tome 1. Leur réconciliation est un chantier distinct, qui ne doit pas être réalisé implicitement dans un chantier d'identité.
**Impact :** Dette inscrite dans STD-008.

---

**ID :** LIVRE-P1A-D4
**Titre :** Stockage canonique additif des chapitres des Tomes 2–4 (Option B)
**Date :** 2026-10-01
**Statut :** CLÔTURÉE (décision — implémentation P1A terminée au commit `d8cd4a54821a951143fe66082510ee164943a009`, voir Impact)
**Décision :** La structure des chapitres à identité stable des Tomes 2–4 est stockée sous une nouvelle représentation canonique, distincte de la clé legacy `structure-chapitres`. Migration additive : la clé legacy est conservée, jamais supprimée automatiquement. Après migration, la représentation canonique est la seule source de vérité active des Tomes 2–4 ; les anciens chemins d'écriture ne sont plus utilisés pour les Tomes 2–4 ; tous les écrivains et lecteurs concernés passent par les primitives centrales. Aucune double écriture permanente entre legacy et canonique. La clé legacy sert uniquement à la compatibilité et à la récupération.
**Justification :** L'Option A (nouveau format sous la même clé) a été écartée : `normaliserChapitres` ne conserve que des chaînes de caractères, `/lecture` et `/tableau` lisent le JSON brut, et `/fragments` écrit la clé directement. Tout chemin non migré aurait réécrit la structure au format legacy, effaçant les identifiants. L'Option B ne présente qu'un risque de divergence si un écrivain est oublié, couvert par un test obligatoire de P1A.
**Impact :** Migration réalisée par LIVRE-P1A (commit `d8cd4a54821a951143fe66082510ee164943a009`) : les écrivains (`/structure`, passe 2 et `envoyerAuManuscrit` de `/fragments`) passent par les primitives centrales (`lib/manuscript-chapters.ts`), et les lecteurs de la structure des Tomes 2–4 migrés par ce commit lisent la représentation canonique.

---

**ID :** LIVRE-P1A-D5
**Titre :** Frontière entre le modèle de chapitre Manuscrit/Livre et le modèle `Chapitre` de la Biographie
**Date :** 2026-10-01
**Statut :** CLÔTURÉE (décision — aucune implémentation propre requise, voir Impact)
**Décision :** Le modèle de chapitre canonique du Manuscrit/Livre et le modèle `Chapitre` de la Biographie (`app/lib/biographie.ts`) sont des modèles métier distincts. Le chantier LIVRE-P1A ne fusionne, ne remplace ni ne synchronise automatiquement ces modèles. Une homonymie de type ne constitue pas une identité de domaine. Toute éventuelle convergence future exige une décision d'architecture distincte.
**Justification :** Règle introduite le 2026-10-01. Elle n'existait auparavant dans aucun document STD (vérifié dans STD-001 à STD-008 au commit `4125981`). Elle s'inspire du principe de propriété stricte des types métier (SR-D-001 Décision 1), jusqu'ici appliqué au seul domaine Relation, sans l'étendre formellement aux autres domaines. Elle n'est pas présentée comme une règle historique de STRATE et n'est pas généralisée aux autres domaines : elle est volontairement limitée au chantier LIVRE-P1A. Elle empêche une fusion inter-domaines implicite, sans décider que deux modèles doivent coexister définitivement ; une convergence future reste possible, uniquement par une décision d'architecture distincte. Tension reconnue avec l'objectif de STD-003 (réutiliser les mêmes concepts entre modules) : elle est consignée comme dette dans STD-008 plutôt que résolue ici.
**Impact :** Aucune modification de `app/lib/biographie.ts`. Les pages Biographie qui lisent le manuscrit (`/biographie/inventaire`, `/biographie/strategie`) peuvent voir leur lecture adaptée par P1A, sans modification de leur propre modèle.

---

## Décisions historiques (référence)

- ARCH-001 — *(à réintégrer ici depuis le document 10 existant si applicable)*
- ARCH-002 — Source de vérité documentaire de STRATE Relations *(à confirmer statut CLÔTURÉE / Option B)*
