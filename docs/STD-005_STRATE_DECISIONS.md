# STRATE_DECISIONS.md
### Registre des décisions d'architecture (ADR) — STRATE
Dernière mise à jour : 2026-09-08

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

## Décisions historiques (référence)

- ARCH-001 — *(à réintégrer ici depuis le document 10 existant si applicable)*
- ARCH-002 — Source de vérité documentaire de STRATE Relations *(à confirmer statut CLÔTURÉE / Option B)*
