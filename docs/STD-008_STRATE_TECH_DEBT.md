# STRATE_TECH_DEBT.md
### Registre de la dette technique
Dernière mise à jour : 2026-09-08

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
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07 ; point souligné explicitement par l'utilisatrice à la lecture de cet audit comme la prochaine grande étape après la clôture de SR-D-001 ; distinction entre les deux formes de coexistence introduite lors de la vérification croisée du 2026-09-07 (STD-005 IMP-001-P4 / IMP-001-P4bis).

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
**Sujet :** L'ensemble du travail des Phases 0 à 9E n'a jamais été committé en contrôle de version
**Pourquoi :** Constaté par `git status` pendant l'audit du 2026-09-07 : `lib/autre-rive/**`, `app/autre-rive/dossiers/[id]/**` et l'ensemble des fichiers de test associés existent uniquement comme modifications non indexées du répertoire de travail — aucun commit git ne les couvre. Aucune perte de donnée à ce jour, mais aucun historique de revue, aucune granularité de diff, aucune sauvegarde au-delà du répertoire de travail local tant qu'aucun commit n'est réalisé.
**Ticket d'origine :** Audit final de conformité SR-D-001 du 2026-09-07.

---

*(à compléter au fil des modules)*
