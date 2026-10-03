# STRATE_TECH_DEBT.md
### Registre de la dette technique
Dernière mise à jour : 2026-10-03

> Chaque fois qu'une amélioration possible est identifiée mais non réalisée immédiatement, elle est inscrite ici — jamais seulement mentionnée dans le chat.

Format par entrée :
```
Priorité : Haute / Moyenne / Basse
Statut : (optionnel — absent tant qu'une entrée reste ouverte) RÉSOLUE — <date>, voir <référence STD-005>
Sujet :
Pourquoi :
Ticket d'origine :
```
Champ `Statut` introduit le 2026-09-08, à l'occasion de la première dette effectivement résolue de ce registre (voir plus bas, Décision 2 §6) : une dette résolue n'est jamais supprimée ni réécrite, elle reçoit seulement ce champ en plus, sa description originale et son ticket d'origine restant inchangés.

---

## Domaine Relation (SR-D-001 / IMP-001) — entrées consignées le 2026-09-07

Consolidation rétroactive à l'issue de l'audit final de conformité SR-D-001 (2026-09-07). Chaque entrée ci-dessous était déjà connue et explicitement acceptée au moment de sa découverte (aucune n'est une omission silencieuse) ; elle n'avait simplement jamais été inscrite dans ce registre avant cet audit.

---

**Priorité :** Haute
**Sujet :** `RapportAnalyse` sans moteur analytique — `observations`, `hypotheses`, `conclusions`, `flags` toujours vides
**Pourquoi :** Aucun pipeline du produit (`ia-parsing.ts`, ni l'heuristique locale d'`analyse-conversation/page.tsx`) ne produit de données structurées correspondant aux types `Observation` / `CompetingHypothesis` / `Conclusion` / `FlagEntry` de SR-D-001 Décision 5. Le rapport canonique généré aujourd'hui reste honnête (tableaux vides plutôt qu'inventés, conforme à l'Extension validée de SR-D-001) mais analytiquement vide : il ne réalise pas encore la Mission officielle (Bloc 0). SR-D-001 définit où vont ces structures, pas comment les produire — la production relève d'un moteur de raisonnement distinct, hors périmètre de SR-D-001 (annexe Backlog Vision : « moteur détaillé de raisonnement, SR-ENGINE-001 »). Ce n'est donc pas un échec d'implémentation de SR-D-001, mais un chantier séparé encore à ouvrir.
**Ticket d'origine :** IMP-001-P9E (gate de gouvernance déclenché avant implémentation) ; confirmé par l'audit final de conformité SR-D-001 du 2026-09-07.

---

**Priorité :** Haute
**Sujet :** Coexistence technique résiduelle legacy / canonique dans les écrans finaux — à distinguer explicitement de la coexistence fonctionnelle voulue
**Pourquoi :** Deux situations différentes portent aujourd'hui un nom proche et doivent être distinguées explicitement pour ne pas induire un futur développeur en erreur :
- **Coexistence fonctionnelle voulue** (pas une dette, voir IMP-001-P4bis dans STD-005) : un dossier non migré continue légitimement d'utiliser le pipeline legacy jusqu'à confirmation humaine explicite de son identité (`relationType`, `status`, `participantIds`, `primaryUserParticipantId`). C'est un comportement voulu par SR-D-001 Décision 4.3 (migration non destructive), pas un défaut.
- **Coexistence technique résiduelle** (une vraie dette, celle documentée dans cette entrée) : `dossier-screen.tsx` continue de lire `LegacyDossierDetailData` comme source principale d'affichage (notes, tags, niveaux plats, journal, analyses) même pour un dossier déjà migré ; `canonicalDossier` n'y est qu'une lecture parallèle secondaire, potentiellement `null`. L'expérience analytique réellement livrée à l'utilisatrice (verdict, red/green flags textuels) passe encore par `LegacyRapportAnalyse`, pas par `RapportAnalyse`. Cible identifiée : Utilisateur → Pipeline canonique → `RelationDossier` → `RapportAnalyse` → UI, sans dépendance au legacy.

Cas concret aggravant, identifié lors de l'audit du contrat réel effectué pour SR-ENGINE-001-D6 (Contrat canonique `FlagEntry`, voir STD-005) : `app/autre-rive/dossiers/[id]/dossier-data.ts` fait aujourd'hui de l'arithmétique directe sur les tableaux legacy `redFlags: string[]` / `greenFlags: string[]` — `getRiskLabel` déclenche « Vigilance active » dès que la somme des `redFlags.length` sur l'ensemble des rapports atteint 3, et deux autres emplacements (`tone` calculé pour l'affichage) fixent `warning` dès que `redFlags.length > greenFlags.length`, sinon `success`. Cette arithmétique et cette symétrie rouge/vert sont exactement ce que SR-ENGINE-001-D6 interdit désormais explicitement au niveau canonique (`FlagEntry`) : pas d'arithmétique de flags (« 3 green - 2 red = sain » proscrit), pas de symétrie artificielle rouge/vert, l'absence de flags ne valant jamais absence de comportement réel. Le legacy n'est pas modifié par cette dette ni par D6 (aucun code touché), mais la dette est désormais explicitement reliée à D6 : une éventuelle migration future de cette logique vers `FlagEntry` ne pourra pas reconduire telle quelle cette heuristique de comptage/ratio, précisément parce qu'elle contredirait le contrat canonique clôturé.
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07 ; point souligné explicitement par l'utilisatrice à la lecture de cet audit comme la prochaine grande étape après la clôture de SR-D-001 ; distinction entre les deux formes de coexistence introduite lors de la vérification croisée du 2026-09-07 (STD-005 IMP-001-P4 / IMP-001-P4bis). Enrichie lors de SR-ENGINE-001-D6 (Contrat canonique `FlagEntry`, voir STD-005) avec le cas concret `redFlags`/`greenFlags` de `dossier-data.ts`, découvert lors de l'audit du contrat réel préalable à cette décision.

---

**Priorité :** Moyenne
**Statut :** RÉSOLUE — 2026-09-08, voir STD-005 entrée `IMP-001-P9F`
**Sujet :** Décision 2 §6 (« Processus de validation des données historiques ») sans interface
**Pourquoi :** `legacyScoreSnapshots` est calculé et stocké par `adaptLegacyRelationDossierPartially` (moteur prêt), mais aucun écran de `app/autre-rive/**` ne permet à l'utilisatrice de voir la valeur originale, confirmer ou corriger l'échelle supposée, et produire ainsi un `ScoreAssessment` validé. Le mécanisme métier existe ; seul l'écran manque.
**Résolution :** `legacy-score-validation-sync.ts` + `legacy-score-validation-panel.tsx` (2026-09-08) : pour chaque `LegacyScoreSnapshot` en attente, l'utilisatrice voit la valeur brute et une suggestion d'échelle informative, puis confirme explicitement 1–10, confirme 0–100, ou exclut. Une confirmation crée un `ScoreAssessment` (`imported` / `user_confirmed`) ; `energieEmotionnelle` reste hors dimension canonique (exclusion seulement) ; un snapshot déjà revu ne peut pas être revalidé. 399/399 tests domaine Relation. Détail complet : STD-005, `IMP-001-P9F`.
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07.

---

**Priorité :** Moyenne
**Sujet :** STD-009 — tableau récapitulatif par catégorie et vérification d'accessibilité jamais produits (Phases 8bis, 9A à 9E)
**Pourquoi :** `STRATE_TEST_STRATEGY.md` (STD-009) exige un tableau récapitulatif (Fonctionnels / Migration / Accessibilité / Régression / Cas limites / Sécurité / Négatifs) à la fin de chaque module, toute case ❌ étant expliquée dans le rapport. Les rapports des Phases 8bis et 9A-9E ont couvert le fond de ces catégories sous une forme narrative (tests ciblés, `npm test`, `tsc`, lint), mais jamais sous ce format formel. Plus concrètement : aucune vérification d'accessibilité (navigation clavier, contraste, lecteur d'écran, conformité WCAG 2.2 AA) n'a jamais été faite sur les panneaux livrés (`CriticalSafetyPanel`, `AssessmentDisagreementPanel`, `CurrentAssessmentPanel`, `NeedsPanel`, `RapportAnalysePanel`).
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07.

---

**Priorité :** Basse
**Sujet :** Critère d'extractibilité n°5 (liste explicite des dépendances externes de `lib/autre-rive`) non rédigé
**Pourquoi :** `lib/autre-rive` n'a aujourd'hui aucune dépendance externe (vérifié : aucun import non relatif hors `vitest`, réservé aux tests). La liste serait donc triviale (« aucune ») mais SR-D-001 Décision 1 exige qu'elle soit explicitement consignée, ce qui n'a jamais été fait formellement.
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07.

---

**Priorité :** Basse
**Sujet :** `EvidenceAvailability` non implémenté
**Pourquoi :** SR-D-001 documente ce type comme « hors du rapport, calculé dynamiquement » — non requis pour produire ou afficher un `RapportAnalyse`. Aucun système de preuves riche (au-delà de simples tableaux `evidenceIds: string[]`) n'existe encore dans le produit pour lui donner un sens opérationnel. Dette explicitement acceptée dès la Phase 9E, pas une omission.
**Ticket d'origine :** IMP-001-P9E (STD-005 : l'entrée IMP-001-P9E mentionne désormais explicitement cette décision de périmètre, ajout fait lors de la vérification croisée du 2026-09-07 pour fermer un renvoi jusque-là incomplet).

---

**Priorité :** Basse (opérationnel — signalé pour transparence, hors périmètre strict de SR-D-001)
**Statut :** RÉSOLUE — 2026-09-09, voir commit `3e294945e9c6d384c148555066626b238ab848f5` (« Domaine Relation (SR-D-001) : Phases 0-9F complètes »)
**Sujet :** L'ensemble du travail des Phases 0 à 9E n'a jamais été committé en contrôle de version
**Pourquoi :** Constaté par `git status` pendant l'audit du 2026-09-07 : `lib/autre-rive/**`, `app/autre-rive/dossiers/[id]/**` et l'ensemble des fichiers de test associés existent uniquement comme modifications non indexées du répertoire de travail — aucun commit git ne les couvre. Aucune perte de donnée à ce jour, mais aucun historique de revue, aucune granularité de diff, aucune sauvegarde au-delà du répertoire de travail local tant qu'aucun commit n'est réalisé. Ce constat était exact au moment de sa rédaction (2026-09-07).
**Résolution :** Vérifié directement dans Git (`git show`, `git log`, `git diff --stat`) le 2026-09-16 : le commit `3e29494` (auteur Sylvie Drapeau, 2026-09-09 02:49:55 +0000, 60 fichiers, +14436/-4650) contient réellement l'intégralité du code du domaine Relation — `lib/autre-rive/**` (types, storage, assessment, needs, critical-safety, rapport-analyse, etc.) et `app/autre-rive/**` (écrans et fichiers de synchronisation des dossiers) — ainsi que `docs/STD-005_STRATE_DECISIONS.md` et `docs/STD-008_STRATE_TECH_DEBT.md` tels qu'ils existaient à cette date. Le message de commit annonce « Phases 0-9F complètes » ; vérification faite au-delà du seul message : `git diff --stat -- lib/autre-rive app/autre-rive` entre ce commit et l'arbre de travail actuel ne retourne aucune différence, confirmant que le périmètre couvert va bien jusqu'à P9F et reste identique à l'état actuel du code. La condition à l'origine de cette dette (travail du domaine Relation non committé) ne s'applique donc plus depuis le 2026-09-09.

Distinction explicite à conserver : (A) le socle Relation / IMP-001 (Phases 0 à 9F, y compris leur documentation STD-005/STD-008 de l'époque) est bien couvert par ce commit ; (B) la gouvernance SR-ENGINE-001-D1 à D6 (STD-005/STD-008, travail du 2026-09-11 au 2026-09-13) est apparue après ce commit et n'y figure pas — elle reste aujourd'hui présente uniquement dans l'arbre de travail, non committée. Cette situation distincte n'est pas résolue par la présente entrée et n'est pas transformée ici en nouvelle dette.
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07.

---

## Moteur canonique d'analyse et de raisonnement relationnel (SR-ENGINE-001) — entrée consignée le 2026-09-11

---

**Priorité :** Haute
**Sujet :** `Conclusion.confidence` et `FlagEntry.confidence` — champs `number` non contraints portant au moins trois échelles incompatibles (0-1, 0-100, cible ordinale D2 1|2|3)
**Pourquoi :** Le contrat réel de `Conclusion.confidence` (`lib/autre-rive/types.ts`) reste `number` sans contrainte. Le dépôt contient simultanément trois sémantiques incompatibles : fraction 0-1 (`lib/autre-rive/rapport-analyse.test.ts`, `confidence: 0.6`) ; valeurs de type 0-100 (`app/autre-rive/dossiers/[id]/rapport-analyse-sync.test.ts`, `confidence: 80/65/30/20`) ; et la cible normative ordinale `1|2|3` fixée par SR-ENGINE-001-D2 (STD-005), reprise sans modification par SR-ENGINE-001-D5 (`Conclusion`). Ces trois échelles restent toutes valides comme `number` sans qu'aucune erreur TypeScript ne le signale. `deriveOverallConfidence` (`app/autre-rive/dossiers/[id]/rapport-analyse-sync.ts`, convention Phase 9E réelle et testée : minimum, jamais moyenne) applique `Math.min()` sur ces valeurs : une comparaison ou une agrégation entre `Conclusion` de provenances différentes reste techniquement valide mais peut devenir sémantiquement fausse. Un futur producteur alimentant le moteur avec la mauvaise échelle ne produirait aucune erreur de type. Risque concret : comparaison ou agrégation silencieusement incorrecte entre rapports, affichage ambigu à l'utilisatrice, incohérence entre dimensions ou entre rapports successifs.

L'audit du contrat réel effectué lors de SR-ENGINE-001-D6 (Contrat canonique `FlagEntry`, voir STD-005) démontre la même divergence structurelle sur un second type canonique : `FlagEntry.confidence` (`lib/autre-rive/types.ts`), lui aussi `number` sans contrainte, porte dans le seul fixture réel actuellement disponible (`lib/autre-rive/rapport-analyse.test.ts`, `flag-1`, `confidence: 0.6`) la même échelle fraction 0-1 déjà observée sur `Conclusion`, alors que SR-ENGINE-001-D2 fixe la même cible ordinale `1|2|3` pour l'ensemble des champs `confidence` du domaine (aucune exception pour `FlagEntry`). Un seul point de donnée suffit à démontrer la divergence code/gouvernance ; il n'est pas nécessaire d'observer trois échelles distinctes sur `FlagEntry` pour que le défaut structurel soit réel. Cette dette est donc élargie à `FlagEntry.confidence` plutôt que dupliquée, les deux champs partageant la même cause racine (absence de contrainte de type reflétant la cible ordinale D2) et le même risque (agrégation ou comparaison silencieusement incorrecte).
**Ticket d'origine :** Audit du contrat réel effectué lors de SR-ENGINE-001-D5 (Contrat canonique `Conclusion`, voir STD-005) — divergence démontrée entre la gouvernance (SR-ENGINE-001-D2) et le code/tests réels, explicitement reconnue mais non résolue par cette décision conceptuelle (aucun code modifié). Élargie lors de SR-ENGINE-001-D6 (Contrat canonique `FlagEntry`, voir STD-005) à l'occasion de l'audit du contrat réel de `FlagEntry.confidence`, qui a révélé la même divergence structurelle — également non résolue par cette décision conceptuelle (aucun code modifié).

---

## Livre / Manuscrit (LIVRE-P1A) — entrées consignées le 2026-10-01

Dettes identifiées lors de l'audit complémentaire de LIVRE-P1A (commit de base `4125981`). Elles sont explicitement hors périmètre de LIVRE-P1A et ne sont pas résolues par ce chantier.

---

**Priorité :** Moyenne
**Sujet :** `fragment.chapitre` référence les chapitres par titre, et non par identifiant stable
**Pourquoi :** Après LIVRE-P1A, les chapitres des Tomes 2–4 auront un identifiant stable, mais les fragments continueront de désigner leur chapitre par son titre. Conséquences : ambiguïté dès que deux chapitres d'un même tome portent le même titre (classée `LEGACY — IDENTITÉ INDÉTERMINABLE` par LIVRE-P1A-D2, jamais devinée) ; dépendance au renommage, qui doit continuer à mettre à jour les fragments par titre ; rattachement impossible à vérifier par identifiant. Un chantier de migration de cette référence vers l'identifiant stable sera nécessaire.
**Ticket d'origine :** Audit complémentaire LIVRE-P1A du 2026-10-01 ; STD-005 LIVRE-P1A-D2.

---

**Priorité :** Haute
**Sujet :** Le Tome 1 possède deux systèmes de chapitres et de texte parallèles
**Pourquoi :** Fait : un second système Tome 1 existe, à côté de `chapitres-tome-1` (`ChapitreTome1`, protégé par l'historique LIVRE-P0.1/P0.1B) : les entrées Tome 1 de `structure-chapitres` et les clés potentielles `ecriture_1_*`, que `app/vue-double/page.tsx` peut écrire. Ce second système n'est pas couvert par les garanties LIVRE-P0.1/P0.1B. Risque : du texte peut y être stocké sans protection P0.1, sans réconciliation avec `chapitres-tome-1`. Inconnu : la présence et la quantité réelles de contenu utilisateur dans ce second système ; son état dans l'environnement de l'utilisatrice n'a pas encore été inventorié. Priorité haute en raison de ce risque sur le texte du manuscrit, et non d'une perte constatée. Aucune réconciliation n'est réalisée par LIVRE-P1A (STD-005 LIVRE-P1A-D3) ; un inventaire réel devra précéder toute décision.
**Ticket d'origine :** Audit complémentaire LIVRE-P1A du 2026-10-01 ; STD-005 LIVRE-P1A-D3.

---

**Priorité :** Basse
**Sujet :** `normaliserChapitres` limité aux tomes 1 à 4
**Pourquoi :** `normaliserChapitres` (`lib/manuscript-structure.ts`) ne conserve que les tomes présents dans `TOMES_DEFAUT` (1 à 4). Un tome supplémentaire créé depuis `/structure` est éliminé de la structure normalisée à la lecture ou à la sauvegarde suivante. Non corrigé par LIVRE-P1A.
**Ticket d'origine :** Audit complémentaire LIVRE-P1A du 2026-10-01.

---

**Priorité :** Basse
**Sujet :** Deux modèles `Chapitre` distincts (Manuscrit/Livre et Biographie)
**Pourquoi :** Le modèle de chapitre canonique du Manuscrit/Livre et le type `Chapitre` de `app/lib/biographie.ts` coexistent sous le même nom. Cette duplication est intentionnelle pour LIVRE-P1A (frontière de domaine, STD-005 LIVRE-P1A-D5), mais elle est en tension avec l'objectif de STD-003 (réutiliser les mêmes concepts entre modules). Elle doit rester visible comme question d'architecture future (convergence, séparation définitive ou renommage) plutôt qu'être oubliée.
**Ticket d'origine :** Audit complémentaire LIVRE-P1A du 2026-10-01 ; STD-005 LIVRE-P1A-D5.

---

## Livre / Manuscrit (LIVRE-P1B) — entrées consignées le 2026-10-03

Dettes et risques résiduels confirmés après l'adoption de LIVRE-P1B-D1 et LIVRE-P1B-D2 (STD-005), avant toute implémentation de LIVRE-P1B (commit de base `cb4ceb35215cf64409ff826c058f26f9977c8375`). Aucune n'est résolue par LIVRE-P1B.

---

**Priorité :** Moyenne
**Sujet :** Aucune politique de rétention, de purge ou d'export de l'historique LIVRE-P1B ; historique absent des sauvegardes BackupManager
**Pourquoi :** LIVRE-P1B-D2 interdit toute purge automatique : l'historique IndexedDB croît sans plafond (environ 37 versions par séance de 3 heures selon l'hypothèse de l'audit). Sa capacité est sans commune mesure avec celle de `localStorage`, mais elle reste finie ; à saturation, les écritures qui exigent un archivage sont refusées de façon visible, sans aucune suppression. Par ailleurs, BackupManager n'exporte que `localStorage` : l'historique n'est pas inclus dans les fichiers de sauvegarde et ne protège donc pas contre la perte de l'appareil ou l'effacement des données du site. Une politique de rétention, de purge ou d'export de l'historique reste à décider séparément. Aucune purge n'est implémentée en attendant.
**Ticket d'origine :** Audits LIVRE-P1B-D1 et LIVRE-P1B-D2 du 2026-10-03 ; STD-005 LIVRE-P1B-D2.

---

**Priorité :** Moyenne
**Sujet :** `/vue-double` ne force pas l'écriture de la sauvegarde en attente lorsque l'on quitte la page
**Pourquoi :** Fait vérifié dans `app/vue-double/page.tsx` : la sauvegarde automatique est déclenchée par un minuteur d'environ 600 ms après la dernière frappe, et aucun mécanisme ne force l'écriture en attente lors d'un démontage, d'une navigation ou d'une fermeture de la page. Risque résiduel : perte de la frappe non encore sauvegardée, de l'ordre du délai de la sauvegarde automatique. Lorsque LIVRE-P1B rendra l'écriture asynchrone, il faudra y ajouter la durée d'une écriture historique en cours. Ce défaut existait avant LIVRE-P1B et ne relève pas des checkpoints de LIVRE-P1B-D1 : il concerne le contenu courant, pas l'historique.
**Ticket d'origine :** Audit LIVRE-P1B du 2026-10-03.

---

**Priorité :** Basse
**Sujet :** Limites résiduelles de l'architecture d'historique IndexedDB (LIVRE-P1B-D2)
**Pourquoi :** Risques reconnus de l'architecture retenue, sans seuil universel établi :
- le stockage du navigateur reste « au mieux » : il peut être évincé sous forte pression disque, pour toute l'origine (`localStorage` compris), et la demande de stockage persistant (`navigator.storage.persist()`) n'est pas décidée ;
- la capacité d'IndexedDB varie selon le navigateur, sa version et le disque ;
- IndexedDB et `localStorage` ne partagent pas de transaction : entre deux onglets, l'intervalle entre la relecture du contenu courant et son écriture est réduit, sans être atomique ;
- une fermeture de page pendant une écriture historique en cours fait perdre la sauvegarde concernée ;
- l'effacement des données du site par l'utilisatrice supprime à la fois le contenu courant et l'historique.
**Ticket d'origine :** Audit LIVRE-P1B-D2 du 2026-10-03 ; STD-005 LIVRE-P1B-D2.

---

*(à compléter au fil des modules)*
